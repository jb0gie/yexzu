app.configure([
	{
		key: 'restricted',
		type: 'toggle',
		label: 'Permission',
		trueLabel: 'Admin',
		falseLabel: 'Everyone',
		initial: false,
	},
	{
		key: 'channel',
		type: 'text',
		label: 'Rig Channel',
		initial: 'bolt',
		hint: 'the rig bus — must match the djbooth',
	},
	{
		key: 'streamSection',
		type: 'section',
		label: 'Livestream / Embed',
	},
	{
		key: 'embedWidth',
		type: 'range',
		label: 'Embed Width (m)',
		initial: 6,
		min: 0.5,
		max: 30,
		step: 0.1,
		hint: 'physical size of THIS screen for twitch/youtube webviews — match the screen mesh you placed',
	},
	{
		key: 'embedHeight',
		type: 'range',
		label: 'Embed Height (m)',
		initial: 3.375,
		min: 0.5,
		max: 20,
		step: 0.1,
	},
	{
		key: 'embedFactor',
		type: 'range',
		label: 'Embed Sharpness',
		initial: 150,
		min: 50,
		max: 300,
		step: 10,
		hint: 'iframe pixels per meter — higher is sharper and heavier',
	},
	{
		key: 'embedAudio',
		type: 'switch',
		label: 'Embed Audio',
		options: [
			{ label: 'Auto (one screen wins)', value: 'auto' },
			{ label: 'Always On (this screen)', value: 'on' },
			{ label: 'Always Off', value: 'off' },
		],
		initial: 'auto',
		hint: 'iframe audio is not spatial — when several screens show the same embed they elect ONE unmuted player',
	},
	{
		key: 'embedParents',
		type: 'text',
		label: 'Twitch Parents',
		initial: 'boltevm.com,localhost,127.0.0.1,255242621.xyz',
		hint: 'comma list of domains allowed to iframe twitch players',
	},
	{
		key: 'flipX',
		type: 'switch',
		label: 'Flip Image Horizontally',
		options: [
			{ label: 'Off', value: 'off' },
			{ label: 'On (fixes mirroring)', value: 'on' },
		],
		initial: 'off',
		hint: 'if the stream/embed reads mirrored on this screen, flip this — applies to both the video and the embed',
	},
	{
		key: 'flipY',
		type: 'switch',
		label: 'Flip Image Vertically',
		options: [
			{ label: 'Off', value: 'off' },
			{ label: 'On (fixes upside-down)', value: 'on' },
		],
		initial: 'off',
		hint: 'if the picture is upside down, flip this',
	},
	{
		key: 'streamAudio',
		type: 'switch',
		label: 'Stream Audio',
		options: [
			{ label: 'Global (audible everywhere)', value: 'global' },
			{ label: 'Spatial (positional 3D)', value: 'spatial' },
		],
		initial: 'global',
		hint: 'audio for the stream/screenshare on THIS screen — global is one loud fader; spatial fades with distance',
	},
])

const screenId = app.instanceId
const restricted = props.restricted
const CHANNEL = props.channel || 'bolt'
const VIDEO_EVENT = `${CHANNEL}:video:command`
const VIDEO_WHOIS = `${CHANNEL}:video:whois`
const EMBED_EVENT = `${CHANNEL}:embed:audio`
const AUDIO_EVENT = `${CHANNEL}:speaker:audio`
const DEFAULT_PARENTS = 'boltevm.com,localhost,127.0.0.1,255242621.xyz'

// ---------- link helpers ----------
// The booth classifies + normalizes before it emits (`kind` on the command);
// these only run as the fallback for commands from an older booth build.

// hls.js resolves the urls inside a playlist against the PLAYLIST's own url,
// so a stream that got re-served from our own origin (the audio proxy) would
// send every segment fetch to boltevm.com and 404. Unwrap it and let hls.js
// see the original origin again.
function unwrapStreamUrl(url) {
	if (typeof url !== 'string') return url
	if (!isStreamUrl(url)) return url
	const at = url.indexOf('/api/audio-proxy?url=')
	if (at === -1) return url
	try {
		return decodeURIComponent(url.slice(at + '/api/audio-proxy?url='.length))
	} catch (err) {
		return url
	}
}

function isStreamUrl(url) {
	return /\.m3u8/i.test(url || '')
}

function youtubeId(url) {
	// youtu\.?be covers both youtube.com and youtu.be — a bare /youtube/ guard
	// silently skips every youtu.be share link (it has no 'youtube')
	if (!/youtu\.?be/.test(url || '')) return null
	let m = url.match(/[?&]v=([\w-]{6,})/)
	if (!m) m = url.match(/\/(?:embed|live|shorts)\/([\w-]{6,})/)
	if (!m) m = url.match(/youtu\.be\/([\w-]{6,})/)
	return m ? m[1] : null
}

function twitchEmbed(url, parents) {
	if (!/twitch\.tv/.test(url || '')) return null
	let q = null
	let m = url.match(/twitch\.tv\/videos?\/(\d+)/)
	if (m) q = 'video=' + m[1]
	if (!q) {
		m = url.match(/[?&]channel=([\w-]+)/)
		if (m) q = 'channel=' + m[1]
	}
	if (!q) {
		m = url.match(/twitch\.tv\/(?!videos?\/|directory|downloads|clips|settings|subscriptions|jobs|turbo|inventory|wallet|p\/)([\w-]+)/)
		if (m) q = 'channel=' + m[1]
	}
	if (!q) return null
	// autoplay=true: ask the twitch player to start on load. Browsers may still
	// hold it behind a click until this page has seen a gesture, and
	// mature-flagged channels ALWAYS gate behind a Start Watching click — that
	// one is twitch policy, not something an embed param can bypass.
	let out = 'https://player.twitch.tv/?' + q + '&autoplay=true'
	const list = (parents || DEFAULT_PARENTS).split(',')
	for (let i = 0; i < list.length; i++) {
		const p = list[i].trim()
		if (p) out += '&parent=' + p
	}
	return out
}

// twitch/youtube pages become their embeddable player urls; anything else is
// handed back untouched
function normalizeEmbed(url, parents) {
	const yt = youtubeId(url)
	if (yt) return 'https://www.youtube-nocookie.com/embed/' + yt + '?autoplay=1&playsinline=1'
	return twitchEmbed(url, parents)
}

// an iframe's audio cannot be scripted from outside — the embed's own
// start-muted parameter is the only lever
function withEmbedMute(url, muted) {
	if (/youtube(-nocookie)?\.com\/embed/.test(url)) return url + (muted ? '&mute=1' : '&mute=0')
	if (/player\.twitch\.tv/.test(url)) return url + (muted ? '&muted=true' : '&muted=false')
	return url
}

function sniffKind(url) {
	if (normalizeEmbed(url, props.embedParents || DEFAULT_PARENTS)) return 'embed'
	return 'video'
}

if (world.isClient) {
	const screen = app.get('Screen')
	if (!screen) {
		// GLB edits can drop/rename the Screen node — never crash the whole script
		console.error('[bolt-screen] "Screen" mesh not found in GLB — rig video disabled')
	} else {
		// Some screen builds render content mirrored (authored UVs / transform).
		// This engine's Video node flips its own TEXTURE sampling (flipX/flipY)
		// — a shader-space flip nothing about the mesh can fight. Old engines
		// lack the props, so fall back to mirroring the plane (three
		// compensates the winding; doubleside keeps it visible).
		function flipFix(node) {
			const wantX = props.flipX === 'on'
			const wantY = props.flipY === 'on'
			if (!wantX && !wantY) return
			const nativeFlip = typeof node.flipX === 'boolean'
			if (nativeFlip) {
				node.flipX = wantX
				node.flipY = wantY
			} else {
				if (wantX) node.scale.x *= -1
				if (wantY) node.scale.y *= -1
				node.doubleside = true
			}
			console.warn(
				`[bolt-screen] flips — X=${wantX} Y=${wantY} via ${nativeFlip ? 'engine texture flip' : 'plane scale fallback'} | raw props flipX=${String(props.flipX)} flipY=${String(props.flipY)}`,
			)
		}
		// diagnostics: a negative scale axis on the mesh itself is the classic
		// cause of a mirrored picture — name it in the log instead of leaving
		// it to guesswork between the prop and the GLB
		if (screen.scale && (screen.scale.x < 0 || screen.scale.y < 0 || screen.scale.z < 0)) {
			console.warn(
				`[bolt-screen] screen mesh has a negative scale axis (${screen.scale.x}, ${screen.scale.y}, ${screen.scale.z}) — if streams read mirrored, use the Flip props`,
			)
		}
		// ONE video node does both jobs: the rig video (src) and a live
		// screenshare (screenId). Video.mount prefers a matching screenshare and
		// falls back to the rig src when it ends, so the Share Screen action
		// below keeps working exactly as before.
		// `linked: true` keys the player per url, so every screen in the world
		// showing the rig video shares ONE element — one decode, frame-locked by
		// construction no matter how many screens. A .m3u8 rig video rides the
		// same element through hls.js: one live download feeds every screen.
		const video = app.create('video', {
			screenId: app.instanceId,
			linked: true,
			aspect: 16 / 9, // geometry is 16:9
			geometry: screen.geometry,
			fit: 'contain',
			color: 'black',
			// stream/screenshare audio for THIS screen — Global (default) is
			// one loud fader everywhere; Spatial fades with distance (HRTF) and
			// made the booth's Screen Volume behave nothing like its label
			spatial: props.streamAudio === 'spatial',
		})
		// move video to same place as screen
		video.position.copy(screen.position)
		video.quaternion.copy(screen.quaternion)
		video.scale.copy(screen.scale)
		flipFix(video)
		screen.parent?.remove(screen)
		app.add(video)

		let t0 = 0 // world.getTime() the rig video started at (0 = not rig-driven)
		let lastPlayAsk = 0
		let streamSrc = false // current rig video is a livestream (m3u8) — never clock-seek it
		let lastStreamUrl = null
		// reactivity id of this screen's video element audio node once announced
		// LIVE (null = silent / not announced)
		let screenAudioId = null
		// a screen drifts (tab throttle, a cold load, a long frame). Correct past
		// DRIFT — small enough to read as locked, large enough not to fight the
		// element every frame.
		const DRIFT = 0.25

		// While somebody screenshares onto this screen, the engine shows THEIR
		// live stream on this very node (Video.mount prefers a matching
		// screenshare over `src`). A live stream's clock starts at 0 and never
		// seeks, so the rig clock must leave it alone — it would otherwise
		// re-seek the stream every frame. The rig video resumes by itself when
		// the share ends: the node remounts onto `src` and the loop below
		// re-anchors it.
		const isShared = () => (world.livekit?.screens || []).some(s => s.targetId === screenId)

		// ---------- embed screen (twitch / youtube webviews) ----------
		// Twitch/YouTube pages can never feed a video texture (their players are
		// locked to their own origins), so those urls are drawn as an in-world
		// webview: a CSS3D iframe pinned to this screen's transform. The rig
		// video node is paused underneath while an embed owns the screen.
		let embedView = null
		let embedSrc = null // the normalized embed url currently shown (null = none)

		// ---------- embed audio election ----------
		// Every screen loads its OWN iframe for an embed, and iframe audio is
		// browser-tab audio — not spatial, not touchable via the engine. Without
		// a rule, N screens = N copies of the same stream playing on top of each
		// other. One screen per (channel, url) wins the audio; everyone else
		// loads the start-muted variant. The winner is the lowest instanceId
		// among announced screens: every screen computes the same answer from
		// the same in-process bus (app.emit IS world.events.emit), and a screen
		// that rebuilds mid-stream re-announces — the sitting winner re-emits on
		// first sight of a new id — so late arrivals converge instead of
		// double-playing.
		const embedKnown = {} // url -> { ids: { id: true } }

		function recordEmbedId(url, id) {
			const rec = embedKnown[url] || (embedKnown[url] = { ids: {} })
			if (rec.ids[id]) return false
			rec.ids[id] = true
			return true
		}

		function embedWinner(url) {
			const rec = embedKnown[url]
			if (!rec) return null
			let best = null
			for (const id in rec.ids) {
				if (best === null || id < best) best = id
			}
			return best
		}

		function announceEmbed(url) {
			recordEmbedId(url, screenId)
			app.emit(EMBED_EVENT, { url, id: screenId })
		}

		function applyEmbedAudio(url) {
			const mode = props.embedAudio || 'auto'
			let live = false
			if (mode === 'on') live = true
			else if (mode === 'auto') live = embedWinner(url) === screenId
			const next = withEmbedMute(url, !live)
			if (embedView.src !== next) embedView.src = next
			console.warn(`[bolt-screen] embed audio ${live ? 'LIVE' : 'MUTED'} — ${url.slice(0, 64)} (${mode})`)
		}

		world.on(EMBED_EVENT, ann => {
			if (!ann || !ann.url || !ann.id) return
			if (!recordEmbedId(ann.url, ann.id)) return
			// a rebuilt screen just announced: the sitting winner answers so the
			// newcomer's idea of the set is complete (and cannot double-play)
			if (embedWinner(ann.url) === screenId) app.emit(EMBED_EVENT, { url: ann.url, id: screenId })
			if (embedSrc === ann.url) applyEmbedAudio(ann.url)
		})

		function ensureEmbedView() {
			if (embedView) return embedView
			// `screen` is the boot-time mesh reference. Do NOT re-fetch it with
			// app.get: the engine's Node.get walks the CURRENT children tree and
			// the mesh was detached at boot (the video node replaced it), so a
			// lookup here returns null in-world.
			embedView = app.create('webview', {
				src: null,
				width: props.embedWidth || 6,
				height: props.embedHeight || 3.375,
				factor: props.embedFactor || 150,
				space: 'world',
			})
			embedView.position.copy(screen.position)
			embedView.quaternion.copy(screen.quaternion)
			embedView.scale.copy(screen.scale)
			embedView.position.z += 0.02
			flipFix(embedView)
			app.add(embedView)
			console.warn(`[bolt-screen] embed webview armed — ${props.embedWidth || 6}x${props.embedHeight || 3.375}m @ ${props.embedFactor || 150}px/m (tune to the screen mesh if it does not line up)`)
			return embedView
		}

		function setEmbed(raw) {
			const normalized = normalizeEmbed(raw, props.embedParents || DEFAULT_PARENTS)
			const url = normalized || raw // unknown host: show the page as-is
			if (!ensureEmbedView()) return
			embedSrc = url
			video.pause() // the iframe owns the screen now — silence the rig video
			t0 = 0
			if (screenAudioId) {
				// the video just went silent — release the reactive meshes; the
				// embed's own audio election owns sound from here
				app.emit(AUDIO_EVENT, { role: 'screen', audioId: screenAudioId, url: lastStreamUrl, playing: false })
				screenAudioId = null
			}
			if ((props.embedAudio || 'auto') !== 'off') announceEmbed(url)
			applyEmbedAudio(url)
			console.warn(`[bolt-screen] embed on screen: ${url.slice(0, 80)}`)
		}

		function clearEmbed() {
			if (!embedSrc) return
			embedSrc = null
			if (embedView) embedView.src = null
			console.warn('[bolt-screen] embed cleared')
		}

		app.on('update', () => {
			// ---------- stream audio → the rig's reactive bus ----------
			// The engine registers each video element's audio node
			// (Video.audioId). When this screen's stream is AUDIBLE, announce
			// that id on the speaker bus so every reactive mesh follows the
			// livestream instead of the library track. Reconciled here because
			// the element mounts async and every src change makes a new one.
			if (!video.loading && !embedSrc) {
				const id = video.audioId
				const audible = video.playing && video.volume > 0 && !!id
				if (audible) {
					if (id !== screenAudioId) {
						screenAudioId = id
						app.emit(AUDIO_EVENT, { role: 'screen', audioId: id, url: lastStreamUrl, playing: true })
						console.warn(`[bolt-screen] screen audio LIVE — ${String(lastStreamUrl).slice(0, 56)}`)
					}
				} else if (screenAudioId) {
					app.emit(AUDIO_EVENT, { role: 'screen', audioId: screenAudioId, url: lastStreamUrl, playing: false })
					screenAudioId = null
				}
			}
			if (!t0 || video.loading || isShared() || embedSrc) return
			const want = world.getTime() - t0
			if (!video.playing) {
				// not started yet, or a pause to recover from — one ask every 2s,
				// so a slow load never stacks play() calls
				if (world.getTime() - lastPlayAsk < 2) return
				lastPlayAsk = world.getTime()
				video.play()
				return
			}
			const duration = video.duration
			// a livestream (and a vod that has not loaded its duration yet) has
			// no finite duration: the live edge moves and any seek lands on a
			// stale segment, so the rig clock must never seek it — just keep it
			// playing (above) and leave it at the edge
			if (!(isFinite(duration) && duration > 0)) return
			// past one cycle the element's own loop carries it; re-anchoring here
			// would fight the loop (and every screen loops on the same beat anyway)
			if (want > duration - 0.5) return
			if (Math.abs(video.time - want) > DRIFT) video.time = want
		})

		// the booth's client fans its video command onto this client's bus (the
		// booth holds the server context that hears the rig; a screen only needs
		// to follow). Same bus, same shape as the speaker audio announcement the
		// reactive meshes listen for.
		world.on(VIDEO_EVENT, cmd => {
			if (!cmd) return
			if (cmd.action === 'stop') {
				t0 = 0
				clearEmbed()
				video.pause()
				// a livestream waits at its edge; rewinding it to 0 would resume
				// into a window that has already scrolled past
				if (!streamSrc) video.time = 0
				streamSrc = false
				if (screenAudioId) {
					app.emit(AUDIO_EVENT, { role: 'screen', audioId: screenAudioId, url: lastStreamUrl, playing: false })
					screenAudioId = null
				}
				return
			}
			if (cmd.action === 'volume') {
				if (embedSrc) {
					// iframe audio is tab audio; the embed player carries its own
					// volume control
					console.warn('[bolt-screen] rig volume ignored while an embed is on screen')
					return
				}
				video.volume = cmd.value ?? 0
				return
			}
			if (cmd.action !== 'play' || !cmd.url) return
			const url = unwrapStreamUrl(cmd.url)
			const kind = cmd.kind === 'embed' || cmd.kind === 'video' ? cmd.kind : sniffKind(url)
			if (kind === 'embed') {
				setEmbed(url)
				return
			}
			clearEmbed()
			streamSrc = isStreamUrl(url)
			lastStreamUrl = url
			if (video.src !== url) video.src = url
			video.loop = true // the booth re-anchors this on every track change
			video.volume = cmd.volume ?? 0 // 0 by default — the rig track IS the music
			t0 = cmd.t0 ?? world.getTime()
			// a livestream lives at its edge — only file/vod playback joins the
			// shared clock mid-track
			if (!streamSrc) video.time = Math.max(0, world.getTime() - t0)
			video.play()
			console.warn(
				`[bolt-screen] rig video: ${url.slice(0, 64)}${streamSrc ? ' (live stream)' : ''} vol=${video.volume}` +
					(video.volume === 0 ? ' — silent; raise Screen Volume on the booth to hear it' : ''),
			)
		})

		// move-rebuild healing: grabbing/releasing the app rebuilds it and wipes
		// the listener above. Ask whoever holds the live command (the booth's
		// client answers on this same bus) until one does.
		let attempts = 0
		const whois = () => {
			if (t0 || attempts >= 8) return
			attempts++
			app.emit(VIDEO_WHOIS, { channel: CHANNEL })
			setTimeout(whois, attempts === 1 ? 800 : 2000)
		}
		setTimeout(whois, 800)
	}

	const player = world.getPlayer()
	const canUse = restricted ? player.admin : true
	if (canUse) {
		const action = app.create('action', {
			label: 'Share Screen',
			distance: 5,
			position: [0, 1, 0],
			onTrigger: () => player.screenshare(screenId),
		})
		app.add(action)
	}
}
