// djbooth — control center for the bolt surround rig
//
// The booth is the brain: it owns the track selection and broadcasts play/stop
// commands on the server world bus. Every boltSpeaker app (examples/bolt/base/
// boltSpeaker.js) relays commands to all clients; each client seeks to the
// shared server clock — one file, many spatial voices.
//
// Event contract:
//   '<channel>:audio:command' { token, action, url?, t0?, volume? }
//     play   -> url + t0 (world.getTime() when the track "started")
//     stop   -> kills every speaker
//     volume -> global volume trim { value }
//
// Setup: place booth app near the decks. Place N speaker apps around the
// space, leave their `file` prop empty, and match their `channel` prop.

app.configure([
	{
		key: 'channelSection',
		type: 'section',
		label: 'Rig Settings',
	},
	{
		key: 'channel',
		type: 'text',
		label: 'Channel',
		initial: 'bolt',
		hint: 'command channel — must match the speakers',
	},
	{
		key: 'track',
		type: 'file',
		kind: 'audio',
		label: 'Track',
		hint: 'the one audio file the whole rig plays',
	},
	{
		key: 'volume',
		type: 'range',
		label: 'Rig Volume',
		initial: 1,
		min: 0,
		max: 2,
		step: 0.1,
		hint: 'global volume sent with every play command',
	},
	{
		key: 'debug',
		type: 'switch',
		label: 'Debug Logging',
		options: [
			{ label: 'Enabled', value: 'enabled' },
			{ label: 'Disabled', value: 'disabled' },
		],
		initial: 'disabled',
	},
	{
		key: 'boothReactiveSection',
		type: 'section',
		label: 'Booth Body Reactivity',
	},
	{
		key: 'reactiveMesh',
		type: 'text',
		label: 'Reactive Mesh Name',
		initial: 'djBooth001MeshLOD0_1',
		hint: 'mesh in the booth GLB that pulses with the rig track',
	},
	{
		key: 'boothBand',
		type: 'switch',
		label: 'Booth Audio Band',
		options: [
			{ label: 'Volume', value: 'volume' },
			{ label: 'Bass', value: 'bass' },
			{ label: 'Mid', value: 'mid' },
			{ label: 'Treble', value: 'treble' },
		],
		initial: 'bass',
	},
	{
		key: 'boothColor',
		type: 'color',
		label: 'Booth Reactive Color',
		initial: '#ff00ff',
	},
	{
		key: 'boothScale',
		type: 'range',
		label: 'Booth Scale',
		initial: 1.5,
		min: 0.1,
		max: 10,
		step: 0.1,
	},
	{
		key: 'boothIntensity',
		type: 'range',
		label: 'Booth Intensity',
		initial: 1.5,
		min: 0.1,
		max: 10,
		step: 0.1,
	},
	{
		key: 'autoPlay',
		type: 'switch',
		label: 'Auto Play on Load',
		options: [
			{ label: 'Yes', value: 'enabled' },
			{ label: 'No', value: 'disabled' },
		],
		initial: 'disabled',
		hint: 'starts the rig when the booth loads/rebuilds AND when a player enters an already-running world (server-side, synced clock)',
	},
	{
		key: 'sourcesSection',
		type: 'section',
		label: 'Music Sources',
	},
	{
		key: 'trackLink',
		type: 'text',
		label: 'Direct Audio URL',
		initial: '',
		hint: 'direct stream URL (mp3/ogg/wav with CORS) — full rig mode: spatial, synced, reactive. Overrides the Track file prop.',
	},
	{
		key: 'embedLink',
		type: 'text',
		label: 'Music Service Link',
		initial: '',
		hint: 'SoundCloud / YouTube / YT Music / Spotify link — embed mode: renders on the booth screen, plays per-client (no rig sync). Used when Direct Audio URL is empty.',
	},
	{
		key: 'embedWidth',
		type: 'range',
		label: 'Embed Screen Width',
		initial: 2.4,
		min: 1,
		max: 6,
		step: 0.1,
	},
	{
		key: 'panelSize',
		type: 'range',
		label: 'Panel Size',
		initial: 0.004,
		min: 0.001,
		max: 0.02,
		step: 0.001,
		hint: 'world meters-per-pixel for the booth control panel (tablet default is 0.004)',
	},
	{
		key: 'screenSection',
		type: 'section',
		label: 'Rig Screen',
	},
	{
		key: 'screenVideo',
		type: 'file',
		kind: 'video',
		label: 'Screen Video',
		hint: 'the one video the whole rig shows — every screen app seeks it off the same t0 as the audio',
	},
	{
		key: 'screenLink',
		type: 'text',
		label: 'Direct Video URL',
		initial: '',
		hint: 'mp4/m3u8 stream or a twitch/youtube link — streams and embeds are sent RAW (hls.js resolves playlist segments against the original origin; the screens draw twitch/youtube with a webview), files route through the same-origin proxy',
	},
	{
		key: 'screenVolume',
		type: 'range',
		label: 'Screen Volume',
		initial: 0,
		min: 0,
		max: 1,
		step: 0.1,
		hint: '0 = silent screen (the rig track IS the music). Raise only if the video has its own mix',
	},
	{
		key: 'audioSource',
		type: 'switch',
		label: 'Audio Source',
		options: [
			{ label: 'Music Library (crates / track)', value: 'library' },
			{ label: 'Live Stream (the screen video)', value: 'stream' },
		],
		initial: 'library',
		hint: 'what the ROOM hears: the crate/track playlist, or the screen video’s own audio. Stream mode stops the speakers, makes the stream the room mix (master volume drives it) and points the lights at its audio node. The panel flips this live.',
	},
	{
		key: 'streamFetch',
		type: 'switch',
		label: 'Stream Fetch',
		options: [
			{ label: 'Direct (CDN — needs CORS)', value: 'direct' },
			{ label: 'Proxy (via this server — plays any host)', value: 'proxy' },
		],
		initial: 'direct',
		hint: 'm3u8 only. Direct plays straight from the CDN (free bandwidth; some hosts answer without the CORS headers hls.js needs → black screen). Proxy re-serves the playlist + every segment through this server so ANY stream plays — flip it when a stream shows black',
	},
	{
		key: 'embedParents',
		type: 'text',
		label: 'Embed Parents',
		initial: 'boltevm.com,localhost,127.0.0.1,255242621.xyz',
		hint: 'comma list of domains allowed to iframe twitch players (the live domain, local dev, etc.)',
	},
])

const CHANNEL = props.channel || 'bolt'
const CMD_EVENT = `${CHANNEL}:audio:command`
const QUERY_EVENT = `${CHANNEL}:audio:query`
const REQ_EVENT = `${CHANNEL}:audio:request`
const STATE_EVENT = `${CHANNEL}:rig:state`
const QUERYSTATE_EVENT = `${CHANNEL}:rig:querystate`
const CRATE_EVENT = `${CHANNEL}:crate:offer`
const CRATE_WHOIS = `${CHANNEL}:crate:whois`
const TRACKEND_EVENT = `${CHANNEL}:trackend`
const RENDER_EVENT = `${CHANNEL}:rig:render`
const VIDEO_EVENT = `${CHANNEL}:video:command`
const VIDEO_RENDER_EVENT = `${CHANNEL}:rig:vrender`
const VIDEO_WHOIS = `${CHANNEL}:video:whois`
// env access is defensive: on engines without the `env` endowment, reading
// it throws (undefined global). Until the env endowment ships in a deploy,
// fall back to relative API paths (works on same-origin deploys).
function getEnv(key) {
  try {
    return env?.[key]
  } catch {
    return undefined
  }
}
const apiBase = getEnv('PUBLIC_API_URL') || ''
const assetsBase = getEnv('ASSETS_BASE_URL') || '~'
// re-evaluated on app rebuild (prop edits rebuild the app), so both server
// and client contexts always see the current track
const trackUrl = props.track?.url || props.trackLink || null
// route direct audio through our server proxy so it becomes same-origin —
// CORS is granted by the serving origin, and our proxy grants OURS. That
// unlocks WebAudio (-> Audio node -> rig: spatial, synced, reactive) for any
// direct stream URL, which cross-origin fetch could never do client-side.
const proxiedTrackUrl =
  trackUrl && /^https?:\/\//.test(trackUrl) && !trackUrl.startsWith(assetsBase)
    ? `${apiBase}/api/audio-proxy?url=${encodeURIComponent(trackUrl)}`
    : trackUrl
// embed mode: music-service links (SoundCloud/YT/YTM/Spotify) can't feed the
// rig's WebAudio graph (DRM/CORS), so they render as a booth-screen embed and
// play per-client. Full rig (spatial/synced/reactive) requires a direct URL.
const embedUrl = !trackUrl && props.embedLink ? normalizeEmbed(props.embedLink) : null

// normalize music-service share URLs to their embeddable forms.
// NOTE: regex-only — the SES compartment endows URL as { createObjectURL }
// only, `new URL()` is not a constructor in there (and it throws silently
// inside any try/catch, so embeds would get raw un-embeddable links).
function normalizeEmbed(url) {
	if (!url) return null
	let m
	// YouTube watch / shorts / youtu.be / YT Music -> nocookie embed
	if ((m = url.match(/(?:youtube\.com\/(?:watch\?.*?v=|shorts\/)|youtu\.be\/|music\.youtube\.com\/watch\?.*?v=)([\w-]{6,})/))) {
		return `https://www.youtube-nocookie.com/embed/${m[1]}`
	}
	// Spotify track/album/playlist/episode -> open.spotify.com/embed
	if ((m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode)\/([\w]+)/))) {
		return `https://open.spotify.com/embed/${m[1]}/${m[2]}`
	}
	// SoundCloud (incl. on.soundcloud.com share links) -> widget player
	if (/soundcloud\.com/.test(url)) {
		return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&visual=false`
	}
	// Bandcamp / Mixcloud / anything else: pass through as-is
	return url
}

function debugLog(...args) {
	if (props.debug === 'enabled') {
		console.log('[djbooth]', ...args)
	}
}

// ---------- visuals: truss spin (kept from v1) ----------
const djTruss = app.get('djBoothTruss')

app.on('update', delta => {
	if (djTruss) {
		djTruss.rotation.y += 0.1 * delta
	}
})

// ---------- client: booth body reacts to the rig track ----------
// The booth sits on the same client bus as the speakers, so it hears the
// '<ch>:speaker:audio' announcements (world-global AudioReactivity registry
// keyed by audio node id — the node lives in the speaker app, the mesh here).
if (world.isClient) {
	const AUDIO_EVENT = `${CHANNEL}:speaker:audio`
	const WHOIS_EVENT = `${CHANNEL}:reactive:whois`

	const reactiveMesh = props.reactiveMesh ? app.get(props.reactiveMesh) : null
	if (!reactiveMesh && props.reactiveMesh) {
		console.warn(`[djbooth] reactive mesh "${props.reactiveMesh}" not found in booth GLB`)
	}

	let linkedAudioId = null

	function unlinkBoothAudio() {
		if (!linkedAudioId || !reactiveMesh) return
		try {
			reactiveMesh.unlinkAudioReactivity()
			debugLog('booth unlinked rig audio', linkedAudioId)
		} catch (err) {
			debugLog('booth unlink failed:', err.message)
		}
		linkedAudioId = null
	}

	function linkBoothAudio(audioId) {
		if (!reactiveMesh || linkedAudioId === audioId) return
		unlinkBoothAudio()
		try {
			reactiveMesh.linkAudioReactivity(audioId, {
				band: props.boothBand || 'bass',
				scale: props.boothScale ?? 1.5,
				intensity: props.boothIntensity ?? 1.5,
				property: 'color',
				color: props.boothColor || '#ff00ff',
			})
			linkedAudioId = audioId
			debugLog('booth body linked to speaker audio node', audioId)
		} catch (err) {
			console.warn('[djbooth] booth reactivity link failed:', err.message)
		}
	}

	world.on(AUDIO_EVENT, ann => {
		if (!ann) return
		if (ann.playing && ann.audioId) linkBoothAudio(ann.audioId)
		else unlinkBoothAudio()
	})

	// ----- rig video fan-out -----
	// The booth's client holds the one video command that came down from its
	// server, and it is the only place that can put it on THIS client's bus
	// where every screen (and the base panel) hears it. app.emit here is
	// in-process and client-wide — that IS the fan-out. Re-emitted with the
	// original token, so a screen already showing the video dedupes.
	let rigVideo = null

	app.on(VIDEO_RENDER_EVENT, cmd => {
		if (!cmd) return
		rigVideo = cmd
		app.emit(VIDEO_EVENT, cmd)
		debugLog('rig video -> bus:', cmd.action, cmd.url || '-')
	})

	// a screen that built late (or rebuilt after a move) asks on this bus; the
	// booth's client is the only holder of the live command
	world.on(VIDEO_WHOIS, () => {
		if (rigVideo) app.emit(VIDEO_EVENT, rigVideo)
	})

	// rebuild/move healing: whois the speakers until one answers
	let attempts = 0
	const whois = () => {
		if (linkedAudioId || attempts >= 8) return
		attempts++
		app.emit(WHOIS_EVENT, { channel: CHANNEL })
		debugLog('booth whois (attempt', attempts + ')')
		setTimeout(whois, attempts === 1 ? 800 : 2000)
	}
	setTimeout(whois, 800)

	app.on('destroy', () => unlinkBoothAudio())
}

// ---------- server: single source of truth for rig commands ----------
if (world.isServer) {
	// panel requests: the booth's own client panel (uiview buttons) fires
	// app.send('booth:request') -> we forward to the rig request bus
	app.on('booth:request', req => {
		if (!req) return
		debugLog('panel request:', req.action, req.crateId || '')
		if (req.action === 'nextCrate' && req.dir === -1) {
			app.emit(REQ_EVENT, { action: 'prevCrate' })
		} else {
			app.emit(REQ_EVENT, req)
		}
	})
	app.on('booth:hello', () => {
		broadcastState()
		// a client that just booted (or rebuilt) has no video command in hand —
		// hand it the live one so its screens seek straight into the track
		if (isPlaying && rigVideo) app.send(VIDEO_RENDER_EVENT, rigVideo)
	})

	// rig state relay: state bus -> our clients (panel display)
	world.on(STATE_EVENT, state => {
		if (!state) return
		app.send(RENDER_EVENT, state)
	})

	let tokenCounter = 0
	let isPlaying = false
	let rigT0 = null // world.getTime() anchor of the live track
	let rigToken = null // token of the live play command (reused for query answers)
	let rigVideo = null // the live video command, replayed to (re)building screens
	let autoStopped = false // a human pressed stop — auto play must never restart behind them
	let selectedCrateId = null // which crate (or null = static props track)
	// what the room HEARS: the crate/track library, or the screen video's own
	// audio (a livestream's mix). Runtime-flippable from the panel.
	let audioSource = props.audioSource === 'stream' ? 'stream' : 'library'

	// rig video relay, server leg: the booth decides the video (its clock and
	// track selection live here), then hands the ONE command to its own client
	// on every client. app.send only reaches this app's own client — the
	// client-side fan-out to the screens is the client block further down.
	world.on(VIDEO_EVENT, cmd => {
		if (!cmd) return
		rigVideo = cmd
		app.send(VIDEO_RENDER_EVENT, cmd)
	})

	// ----- crate playlist (collected from boltVinyl apps over the bus) -----
	// crates: Map<id, { id, url, name, artist }>. Selection by index is what
	// tablets/panels send; the array order = arrival order (stable enough for
	// a rig; ids keep dedupe honest across re-offers).
	const crates = new Map()
	let crateOrder = []

	function rebuildCrateOrder() {
		crateOrder = Array.from(crates.values())
	}

	world.on(CRATE_EVENT, crate => {
		if (!crate || !crate.url) return
		const existed = crates.has(crate.id)
		crates.set(crate.id, crate)
		if (!existed) {
			rebuildCrateOrder()
			console.warn(`[djbooth] crate added: "${crate.name}" (${crateOrder.length} in playlist)`)
			// if nothing is playing, surface the new crate as selected
			if (!isPlaying && selectedCrateId === null) selectedCrateId = crate.id
			broadcastState()
			autoStart('crate arrived')
		} else {
			// same url, possibly updated metadata — refresh the order array and
			// push new names to panels, but never duplicate or reselect
			rebuildCrateOrder()
			broadcastState()
		}
	})

	// crates ask the booth to identify itself when THEY (re)build — the booth
	// re-broadcasts state so a rebuilt vinyl re-learns nowPlaying
	world.on(CRATE_WHOIS, () => {
		broadcastState()
	})

	function proxied(url) {
		return url && /^https?:\/\//.test(url) && !(assetsBase !== '~' && url.startsWith(assetsBase))
			? `${apiBase}/api/audio-proxy?url=${encodeURIComponent(url)}`
			: url
	}

	// ---- screen link routing ----
	// A twitch/youtube page becomes its embeddable player url (the screens draw
	// those with a webview — those sites can never feed a video texture). A
	// direct file/stream is a video: mp4 through the same-origin proxy (a
	// cross-origin element cannot feed the audio graph), m3u8 RAW — hls.js
	// resolves the urls inside a playlist against the playlist's own url, so a
	// proxy round-trip would 404 every segment (and the engine only takes its
	// HLS path while the url still looks like a stream).
	function youtubeId(url) {
		// youtu\.?be covers both youtube.com and youtu.be — a bare /youtube/
		// guard silently skips every youtu.be share link (it has no 'youtube')
		if (!/youtu\.?be/.test(url || '')) return null
		let m = url.match(/[?&]v=([\w-]{6,})/)
		if (!m) m = url.match(/\/(?:embed|live|shorts)\/([\w-]{6,})/)
		if (!m) m = url.match(/youtu\.be\/([\w-]{6,})/)
		return m ? m[1] : null
	}

	function twitchEmbed(url) {
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
		// autoplay=true: ask the twitch player to start on load (the screens
		// re-normalize this url and keep the param; mature-flagged channels
		// still gate behind a Start Watching click — twitch policy)
		let out = 'https://player.twitch.tv/?' + q + '&autoplay=true'
		const list = String(props.embedParents || 'boltevm.com,localhost,127.0.0.1,255242621.xyz').split(',')
		for (let i = 0; i < list.length; i++) {
			const p = list[i].trim()
			if (p) out += '&parent=' + p
		}
		return out
	}

	function normalizeScreenEmbed(url) {
		const yt = youtubeId(url)
		if (yt) return 'https://www.youtube-nocookie.com/embed/' + yt + '?autoplay=1&playsinline=1'
		return twitchEmbed(url)
	}

	function screenCommandUrl(raw) {
		const embed = normalizeScreenEmbed(raw)
		if (embed) return { kind: 'embed', url: embed }
		if (/\.m3u8/i.test(raw)) {
			// Direct: hls.js fetches from the CDN (no bandwidth here) but a host
			// without CORS leaves it with an unreadable playlist — a black
			// screen, clean console. Proxy: the playlist AND every url inside
			// it get re-served from this origin, which hls.js always accepts
			// (the inner '.m3u8' survives encoding, so the engine still takes
			// its HLS path). Segments then flow through this server — opt-in.
			const url =
				props.streamFetch === 'proxy'
					? `${apiBase}/api/hls-proxy?url=${encodeURIComponent(raw)}`
					: raw
			return { kind: 'video', url }
		}
		return { kind: 'video', url: proxied(raw) }
	}

	// the rig screen shows ONE video; its url is whatever the Screen props
	// resolve to. Same proxy rule as the audio track — the engine's video
	// element sets crossOrigin=anonymous (ClientLoader:createVideoFactory), so
	// a plain cross-origin url would not even load, let alone feed the graph.
	// `asset://` urls fall through unchanged, exactly like the rig's audio.
	function screenUrl() {
		return props.screenVideo?.url || props.screenLink || null
	}

	function getSelectedTrack() {
		// priority: explicit crate selection > static Track/trackLink props
		if (selectedCrateId && crates.has(selectedCrateId)) {
			const c = crates.get(selectedCrateId)
			return { url: c.url, name: c.name, artist: c.artist, crateId: c.id }
		}
		if (trackUrl) {
			return { url: trackUrl, name: props.trackName || 'Deck Track', artist: '', crateId: null }
		}
		return null
	}

	function emitCommand(cmd, event = CMD_EVENT) {
		if (!cmd.token) cmd.token = `${Date.now()}-${++tokenCounter}`
		app.emit(event, cmd)
		debugLog('emit', event, cmd.action, 'token', cmd.token)
	}

	// STREAM source: the screen video's own audio IS the room's music. Speakers
	// stop FIRST (they announce playing:false, which unlinks the reactive
	// meshes), then the video plays with real volume — the screens announce the
	// stream's audio node on the same bus, so last-announcement-wins lands the
	// lights on the livestream. Ordering is the whole trick; do not reorder.
	function startStream() {
		const screen = screenUrl()
		if (!screen) {
			console.warn('[djbooth] STREAM source is selected but no Screen Video / Direct Video URL is set — nothing to play')
			broadcastState()
			return
		}
		emitCommand({ action: 'stop' }) // speakers + their reactive announcement go down first
		const t0 = world.getTime()
		rigToken = `stream-${Date.now()}-${++tokenCounter}`
		rigT0 = t0
		const sv = screenCommandUrl(screen)
		emitCommand(
			{
				action: 'play',
				token: rigToken,
				kind: sv.kind,
				url: sv.url,
				t0,
				// the master fader drives the stream: one volume control whether
				// the room is on the library or the livestream
				volume: props.volume ?? 1,
			},
			VIDEO_EVENT,
		)
		isPlaying = true
		autoStopped = false
		app.send('booth:status', { playing: true, url: screen, source: 'stream' })
		broadcastState()
		console.warn(`[djbooth] STREAM source live — ${sv.kind}: ${sv.url.slice(0, 96)}`)
	}

	function startRig() {
		if (audioSource === 'stream') return startStream()
		const track = getSelectedTrack()
		if (!track) {
			console.warn('[djbooth] NO TRACK — drop a boltVinyl crate in the world or set the Track prop')
			return
		}
		console.warn('[djbooth] starting rig with', track.name, proxied(track.url))
		// one clock for the whole rig: the screens anchor to the SAME t0 as the
		// speakers, so the video and the music start on the same beat.
		const t0 = world.getTime()
		rigToken = `play-${Date.now()}-${++tokenCounter}`
		emitCommand({
			action: 'play',
			token: rigToken,
			url: proxied(track.url),
			t0,
			volume: props.volume ?? 1,
		})
		const screen = screenUrl()
		if (screen) {
			const sv = screenCommandUrl(screen)
			emitCommand(
				{
					action: 'play',
					token: rigToken,
					kind: sv.kind,
					url: sv.url,
					t0,
					volume: props.screenVolume ?? 0,
				},
				VIDEO_EVENT,
			)
		}
		rigT0 = t0
		isPlaying = true
		autoStopped = false
		app.send('booth:status', { playing: true, url: track.url })
		broadcastState()
		debugLog('rig started')
	}

	// ---- autoplay: "music whenever someone is here" ----
	// One guard for every trigger, and every trigger is the same question: is
	// there music, and is there someone to hear it? Boot timers cover a world
	// that restarts with people already in it; the enter signal covers a world
	// that has been up for hours; the crate hook covers crates that offer late.
	const autoStart = why => {
		if (props.autoPlay !== 'enabled' || isPlaying || autoStopped) return
		// never start on an empty world — a server holding a silent rig is
		// cheaper than one streaming audio into an empty room.
		// NOTE: the server adds the player to entities.players BEFORE emitting
		// 'enter' (ServerNetwork.js onConnection), so the joining player is
		// already counted here — the first person in does start the rig.
		if (world.getPlayers().length === 0) {
			debugLog('auto play skipped — nobody in the world', `(${why})`)
			return
		}
		// stream source: the room resumes whatever source it was left on
		if (audioSource === 'stream') {
			console.warn(`[djbooth] auto play (${why}) — starting the STREAM source`)
			startStream()
			return
		}
		if (!getSelectedTrack()) return // crates still offering — a later trigger catches up
		console.warn(`[djbooth] auto play (${why}) — starting rig`)
		startRig()
	}
	if (props.autoPlay === 'enabled') {
		// world may still have players from before a rebuild — delays let the
		// speaker apps build and join the bus first
		setTimeout(() => autoStart('boot'), 1500)
		setTimeout(() => autoStart('boot'), 5000)
	}
	// A player entering is the trigger for an already-running world, and the
	// ONLY trigger that matters for "the first person in starts the music".
	// autoStart is idempotent, so a burst of enters (or enters for a rig that is
	// already live) is a no-op — the rig token is not re-minted, so no speaker
	// re-seeks and no song is skipped.
	world.on('enter', () => {
		autoStopped = false // a new session re-arms autoplay
		autoStart('player entered')
	})
	// Everyone left: drop the rig so the server isn't decoding audio for nobody.
	// Cheap, and it means the next arrival gets a fresh start rather than
	// walking into a track that has been running for an hour.
	// NOTE: PlayerRemote.destroy() emits 'leave' BEFORE entities.remove(), so at
	// this moment the leaver is STILL in getPlayers() — exclude them by id or the
	// last player out never registers as "nobody left".
	world.on('leave', data => {
		const others = world.getPlayers().filter(p => p.id !== data?.playerId)
		if (others.length > 0) return
		if (!isPlaying) return
		console.warn('[djbooth] last player left — stopping rig')
		stopRig()
	})

	function stopRig() {
		emitCommand({ action: 'stop' })
		emitCommand({ action: 'stop' }, VIDEO_EVENT)
		isPlaying = false
		app.send('booth:status', { playing: false })
		broadcastState()
		debugLog('rig stopped')
	}

	// rig state broadcast for control surfaces (tablets) + crates. State-only —
	// no command payload, speakers ignore it. nowPlaying lets crates/panels
	// display what's live without parsing command traffic.
	function broadcastState() {
		const track = getSelectedTrack()
		app.emit(STATE_EVENT, {
			playing: isPlaying,
			volume: props.volume ?? 1,
			autoPlay: props.autoPlay === 'enabled',
			audioSource,
			hasScreen: !!screenUrl(),
			// short label for the panel — the sandbox has no URL constructor, so
			// strip the scheme and keep the host
			screenHost: (function () {
				const s = screenUrl()
				if (!s) return null
				const noProto = String(s).replace(/^https?:\/\//, '')
				return noProto.split('/')[0].slice(0, 40)
			})(),
			hasTrack: !!track,
			playlist: crateOrder.map(c => ({ id: c.id, name: c.name, artist: c.artist })),
			selectedCrateId,
			nowPlaying: track
				? { url: track.url, name: track.name, artist: track.artist }
				: null,
		})
	}

	// autoplay is a runtime toggle, not a build-time-only prop: the panel
	// flips it in-world. Same guard rails as the boot timers — if nothing is
	// selected yet it stays armed and the next player-entered / boot retry wins.
	app.on('booth:autoplay', on => {
		props.autoPlay = on ? 'enabled' : 'disabled'
		debugLog('panel autoplay ->', props.autoPlay)
		if (on) {
			// turning autoplay ON is explicit "keep it playing" intent — it must
			// clear the manual-stop latch, or the button could never work after
			// anyone had pressed stop once
			autoStopped = false
			autoStart('panel toggle')
		}
		broadcastState()
	})

	app.on('booth:toggle', () => {
		if (isPlaying) {
			autoStopped = true
			stopRig()
		} else {
			startRig()
		}
	})

	app.on('booth:volume', value => {
		if (!isPlaying) return
		if (audioSource === 'stream') {
			// the stream is the room mix — the master fader IS its volume
			emitCommand({ action: 'volume', value: value ?? 1 }, VIDEO_EVENT)
			return
		}
		emitCommand({ action: 'volume', value })
		emitCommand({ action: 'volume', value: (props.screenVolume ?? 0) * (value ?? 1) }, VIDEO_EVENT)
	})

	// the panel (or a tablet) flips which source the room hears. Deliberate
	// switch = intent to play: clear both buses, then start the new source.
	app.on('booth:source', mode => {
		const next = mode === 'stream' ? 'stream' : 'library'
		if (next === audioSource) {
			broadcastState()
			return
		}
		audioSource = next
		props.audioSource = next
		stopRig() // both buses go down (video stop announces the screen silent)
		autoStopped = false
		if (next === 'stream') startStream()
		else if (props.autoPlay === 'enabled' || getSelectedTrack()) startRig()
		broadcastState()
		console.warn('[djbooth] audio source ->', next)
	})

	// control-plane requests from tablets/remotes (examples/bolt/tablets/).
	// NOTE: cross-app listeners MUST be world.on — app.on only hears events
	// entity-targeted at THIS app (app.send). Requests arrive via app.emit on
	// the server world bus from other apps' server contexts.
	world.on(REQ_EVENT, req => {
		if (!req) return
		debugLog('request:', req.action, req.value ?? '')
		if (req.action === 'toggle') {
			if (isPlaying) {
				autoStopped = true
				stopRig()
			} else {
				startRig()
			}
		} else if (req.action === 'play' && !isPlaying) {
			startRig()
		} else if (req.action === 'stop' && isPlaying) {
			autoStopped = true
			stopRig()
		} else if (req.action === 'volume') {
			const v = Math.min(2, Math.max(0, Number(req.value ?? props.volume ?? 1)))
			props.volume = v // authoritative volume, reused by startRig
			if (isPlaying) {
				if (audioSource === 'stream') {
					// the stream owns the room — the fader drives the video
					emitCommand({ action: 'volume', value: v }, VIDEO_EVENT)
				} else {
					emitCommand({ action: 'volume', value: v })
					// the screen rides the same fader (its own prop is the trim, so a
					// silent screen stays silent)
					emitCommand({ action: 'volume', value: (props.screenVolume ?? 0) * v }, VIDEO_EVENT)
				}
			}
			broadcastState()
		} else if (req.action === 'selectCrate') {
			// tablets/panels pick a crate by id; playing rigs restart on the new
			// track (fresh token -> all speakers re-seek to 0)
			if (req.crateId && crates.has(req.crateId)) {
				selectedCrateId = req.crateId
				debugLog('crate selected:', crates.get(req.crateId).name)
				if (isPlaying) startRig()
				else broadcastState()
			}
		} else if (req.action === 'prevCrate' && crateOrder.length > 0) {
			const idx = crateOrder.findIndex(c => c.id === selectedCrateId)
			const prev = crateOrder[(idx - 1 + crateOrder.length) % crateOrder.length]
			selectedCrateId = prev.id
			debugLog('crate prev ->', prev.name)
			if (isPlaying) startRig()
			else broadcastState()
		} else if (req.action === 'nextCrate' && crateOrder.length > 0) {
			const idx = crateOrder.findIndex(c => c.id === selectedCrateId)
			const next = crateOrder[(idx + 1) % crateOrder.length]
			selectedCrateId = next.id
			debugLog('crate next ->', next.name)
			if (isPlaying) startRig()
			else broadcastState()
		}
	})

	// tablets ask for current rig state when they (re)build
	world.on(QUERYSTATE_EVENT, () => {
		broadcastState()
	})

	// crates ask the booth to identify themselves when they build — but ALSO:
	// periodic rescan heartbeat. Crates placed AFTER the booth booted (or apps
	// that rebuilt silently) get discovered on the next tick without any
	// manual action. Cheap: existing crates dedupe by url.
	let rescanCount = 0
	const rescan = () => {
		rescanCount++
		app.emit(CRATE_WHOIS, { channel: CHANNEL })
		debugLog('rescan: asking crates to identify themselves (#' + rescanCount + ')')
		// slow heartbeat: frequent at first (crates still building), then gentle
		setTimeout(rescan, rescanCount <= 5 ? 4000 : 30000)
	}
	setTimeout(rescan, 3000)

	// manual rescan (tablet/panel request) — discover crates on demand
		world.on(`${CHANNEL}:rescan`, () => {
			app.emit(CRATE_WHOIS, { channel: CHANNEL })
			broadcastState()
		})

		// track advancement: the LIVE speaker reports natural end (Audio node
		// onended; rig plays loop=false). Booth advances to the next crate, or
		// restarts/stops per the On Track End prop.
		world.on(TRACKEND_EVENT, data => {
			if (!isPlaying) return
			// no tracks exist in stream mode — a late speaker report must never
			// advance a playlist nobody is playing
			if (audioSource === 'stream') return
			// Only the track the rig is ACTUALLY live on may advance the playlist.
			// Three speakers report the same end, so this must be a per-playback
			// dedupe, not a "did something end" flag.
			// The playback token is the exact key: speakers echo the token of the
			// play command they applied, and the rig re-mints it on every advance.
			// Reporter One's token matches and advances; the others still hold the
			// OLD token and are rejected. (URL alone can't do this — a 1-track
			// playlist, or a wrap-around, makes the old and new track the same url.)
			// Speakers from an older build send no token; fall back to url for them.
			// This replaces `endedToken === rigToken`, which could never dedupe:
			// rigToken is re-minted by the very advance it was meant to guard.
			if (data?.token) {
				if (data.token !== rigToken) return
			} else {
				const live = getSelectedTrack()
				if (!data?.url || !live || data.url !== proxied(live.url)) return
				// url alone can't tell a stale echo from a real end when the
				// playlist replays the same url (single crate). A track cannot
				// legitimately finish two seconds after it started, and echoes
				// of a just-advanced track arrive within milliseconds — so age
				// separates them. Speakers from a current build skip this: their
				// token above is exact.
				if (world.getTime() - rigT0 < 2) return
			}
			debugLog('track ended naturally')
			if (props.loopPlaylist === 'stop') {
				stopRig()
				return
			}
			if (props.loopPlaylist === 'restart') {
				startRig() // fresh token, same track, from 0
				return
			}
			if (crateOrder.length > 1) {
				const idx = crateOrder.findIndex(c => c.id === selectedCrateId)
				const next = crateOrder[(idx + 1) % crateOrder.length]
				selectedCrateId = next.id
				console.warn('[djbooth] auto-advance ->', next.name)
			}
			startRig() // advance (or replay single track) — continuity
		})

	// speaker apps ask for rig state when they build mid-track (late join OR
	// move-rebuild). Re-emit with the ORIGINAL token: already-playing speakers
	// dedupe-skip it, only the rebuilt speaker applies and re-syncs. No global
	// glitch on every query.
	world.on(QUERY_EVENT, () => {
		debugLog('speaker queried rig state')
		// stream mode: speakers must stay silent — replaying an audio play here
		// would put the library track back under the livestream
		if (audioSource === 'stream') return
		const track = getSelectedTrack()
		if (isPlaying && track) {
			emitCommand({
				action: 'play',
				token: rigToken,
				url: proxied(track.url),
				t0: rigT0,
				volume: props.volume ?? 1,
			})
		}
	})

	// screen apps whois the live video on this SAME client bus (see the client
	// block below) — only a client-side holder can answer, so there is nothing
	// to do here on the server.
}

// ---------- client: embed screen for music-service links ----------
if (world.isClient && embedUrl) {
	console.warn(`[djbooth] embed mode — ${embedUrl.slice(0, 80)}`)

	const webview = app.create('webview', {
		src: embedUrl,
		width: props.embedWidth ?? 2.4,
		height: (props.embedWidth ?? 2.4) * (9 / 16),
		space: 'world',
	})
	webview.position.set(0, 1.6, 0.05)
	app.add(webview)
}

// ---------- client: control panel ----------
// BOLT rig console. Brand rules: near-black glass, magenta signature, electric
// cyan for values — the panel should read like hardware, not a form.
if (world.isClient) {
	console.warn(`[djbooth] booted — channel=${CHANNEL}, track=${trackUrl ? 'set' : 'via crates'}, source=${props.audioSource || 'library'}`)

	// mirror of rig state (arrives via server relay from the state bus)
	let view = {
		playing: false,
		volume: 1,
		autoPlay: false,
		audioSource: 'library',
		hasScreen: false,
		screenHost: null,
		hasTrack: false,
		playlist: [],
		selectedCrateId: null,
		nowPlaying: null,
	}

	// palette — BOLT brand
	const INK = '#05060f'
	const CARD = '#0b0d1c'
	const MAGENTA = '#ff2bd6'
	const CYAN = '#29e7ff'
	const TEXT = '#eef0ff'
	const MUTED = '#6a6a8a'
	const DIM = '#8a8aa8'
	const GHOST = 'rgba(255, 255, 255, 0.05)'

	// Yoga flexbox layout (children are NOT positioned with 3D vectors — only
	// the root ui node gets a position; everything inside flows)
	const ui = app.create('ui', {
		width: 340,
		height: 560,
		size: props.panelSize ?? 0.004,
		position: [0, 1.4, -1],
		pivot: 'center',
		space: 'world',
		billboard: 'y',
		pointerEvents: true,
	})
	app.add(ui)

	const panel = app.create('uiview', {
		width: 340,
		height: 560,
		backgroundColor: INK,
		borderRadius: 18,
		borderWidth: 2,
		borderColor: 'rgba(255, 43, 214, 0.55)',
		flexDirection: 'column',
		alignItems: 'center',
		paddingTop: 14,
	})

	const mkText = (value, size, color, opts) => app.create('uitext', Object.assign({ value, fontSize: size, color }, opts || {}))
	const mkBtn = (label, w, h, bg, color, size) => {
		const btn = app.create('uiview', {
			width: w,
			height: h,
			borderRadius: Math.max(8, Math.round(h / 4)),
			backgroundColor: bg,
			justifyContent: 'center',
			alignItems: 'center',
			cursor: 'pointer',
		})
		const t = mkText(label, size || 11, color || TEXT, { fontWeight: 'bold' })
		btn.add(t)
		btn.onPointerOver = () => {
			btn.borderWidth = 1
			btn.borderColor = 'rgba(255, 255, 255, 0.7)'
		}
		btn.onPointerOut = () => {
			btn.borderWidth = 0
			btn.borderColor = null
		}
		return { btn, t }
	}
	const label = (text, topMargin) => {
		const row = app.create('uiview', { width: 312, flexDirection: 'row', alignItems: 'center' })
		if (topMargin) row.marginTop = topMargin
		row.add(mkText(text, 8, MUTED))
		return row
	}

	// ----- header: brand block + channel + live pill -----
	const header = app.create('uiview', {
		width: 312,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	})
	const brandCol = app.create('uiview', { flexDirection: 'column', alignItems: 'flex-start' })
	brandCol.add(mkText('⚡ BOLT', 26, MAGENTA, { fontWeight: 'bold' }))
	brandCol.add(mkText('RIG CONSOLE', 9, CYAN))
	header.add(brandCol)

	const headRight = app.create('uiview', { flexDirection: 'column', alignItems: 'flex-end' })
	const chanChip = app.create('uiview', {
		height: 20,
		paddingLeft: 9,
		paddingRight: 9,
		borderRadius: 10,
		backgroundColor: 'rgba(41, 231, 255, 0.12)',
		justifyContent: 'center',
		alignItems: 'center',
	})
	chanChip.add(mkText('#' + CHANNEL, 9, CYAN))
	headRight.add(chanChip)
	const livePill = app.create('uiview', {
		width: 78,
		height: 20,
		borderRadius: 10,
		marginTop: 6,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.06)',
	})
	const liveTxt = mkText('IDLE', 9, DIM, { fontWeight: 'bold' })
	livePill.add(liveTxt)
	headRight.add(livePill)
	header.add(headRight)
	panel.add(header)

	// ----- now playing card -----
	const npCard = app.create('uiview', {
		width: 312,
		marginTop: 14,
		backgroundColor: CARD,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: 'rgba(255, 43, 214, 0.25)',
		flexDirection: 'column',
		alignItems: 'flex-start',
		paddingLeft: 14,
		paddingRight: 14,
		paddingTop: 10,
		paddingBottom: 12,
	})
	npCard.add(mkText('NOW PLAYING', 8, MUTED))
	const npTitle = mkText('· · ·', 17, TEXT, { fontWeight: 'bold', marginTop: 3 })
	npCard.add(npTitle)
	const npArtist = mkText('waiting for the rig', 10, CYAN, { marginTop: 2 })
	npCard.add(npArtist)
	const npSource = app.create('uiview', {
		height: 18,
		paddingLeft: 9,
		paddingRight: 9,
		borderRadius: 9,
		marginTop: 9,
		backgroundColor: 'rgba(255, 43, 214, 0.16)',
		justifyContent: 'center',
		alignItems: 'center',
	})
	const npSourceTxt = mkText('▦ LIBRARY', 8, MAGENTA, { fontWeight: 'bold' })
	npSource.add(npSourceTxt)
	npCard.add(npSource)
	panel.add(npCard)

	// ----- audio source switch (library music vs the stream) -----
	panel.add(label('AUDIO SOURCE', 14))
	const srcRow = app.create('uiview', { width: 312, flexDirection: 'row', marginTop: 6 })
	const libSeg = mkBtn('▦  LIBRARY', 152, 34, GHOST, DIM, 11)
	libSeg.btn.marginRight = 8
	const streamSeg = mkBtn('◉  LIVE STREAM', 152, 34, GHOST, DIM, 11)
	srcRow.add(libSeg.btn)
	srcRow.add(streamSeg.btn)
	panel.add(srcRow)

	function styleSource(active) {
		const seg = (o, isOn) => {
			o.btn.backgroundColor = isOn ? 'rgba(255, 43, 214, 0.2)' : GHOST
			o.btn.borderWidth = isOn ? 1 : 0
			o.btn.borderColor = isOn ? MAGENTA : null
			o.t.color = isOn ? TEXT : DIM
		}
		seg(libSeg, active === 'library')
		seg(streamSeg, active === 'stream')
	}
	styleSource('library')
	libSeg.btn.onPointerDown = () => app.send('booth:source', 'library')
	streamSeg.btn.onPointerDown = () => app.send('booth:source', 'stream')

	// ----- transport -----
	const transport = app.create('uiview', {
		width: 312,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 16,
	})
	const prevB = mkBtn('⏮', 56, 44, GHOST, TEXT, 16)
	const playB = mkBtn('▶ PLAY', 168, 44, MAGENTA, INK, 15)
	const nextB = mkBtn('⏭', 56, 44, GHOST, TEXT, 16)
	transport.add(prevB.btn)
	transport.add(playB.btn)
	transport.add(nextB.btn)
	panel.add(transport)

	// ----- master volume (stream mode: this fader IS the stream's volume) -----
	panel.add(label('MASTER', 14))
	const volRow = app.create('uiview', { width: 312, flexDirection: 'row', alignItems: 'center', marginTop: 6 })
	const volDown = mkBtn('−', 28, 28, GHOST, TEXT, 16)
	const volBar = app.create('uiview', { flexDirection: 'row', alignItems: 'center', marginLeft: 8, marginRight: 8 })
	const volSegs = []
	for (let i = 0; i < 10; i++) {
		const seg = app.create('uiview', {
			width: 12,
			height: 10,
			borderRadius: 3,
			marginRight: i === 9 ? 0 : 3,
			backgroundColor: 'rgba(255, 255, 255, 0.08)',
		})
		volSegs.push(seg)
		volBar.add(seg)
	}
	const volUp = mkBtn('+', 28, 28, GHOST, TEXT, 16)
	volRow.add(volDown.btn)
	volRow.add(volBar)
	volRow.add(volUp.btn)
	panel.add(volRow)

	function renderVolume(v) {
		// props.volume runs 0..2; the bar spans the whole range
		const filled = Math.round((Math.min(2, Math.max(0, v)) / 2) * 10)
		for (let i = 0; i < volSegs.length; i++) {
			volSegs[i].backgroundColor = i < filled ? CYAN : 'rgba(255, 255, 255, 0.08)'
		}
	}
	const nudgeVolume = delta => {
		const next = Math.round(Math.min(2, Math.max(0, (view.volume ?? 1) + delta)) * 10) / 10
		app.send('booth:request', { action: 'volume', value: next })
	}
	volDown.btn.onPointerDown = () => nudgeVolume(-0.1)
	volUp.btn.onPointerDown = () => nudgeVolume(0.1)

	// ----- crates -----
	const crateHead = app.create('uiview', {
		width: 312,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 16,
	})
	crateHead.add(mkText('CRATES', 8, MUTED))
	const crateCount = mkText('0', 8, MUTED)
	crateHead.add(crateCount)
	panel.add(crateHead)

	let listRoot = null
	function rebuildList() {
		if (listRoot) {
			panel.remove(listRoot)
			listRoot = null
		}
		const all = view.playlist || []
		let start = 0
		if (all.length > 5) {
			const sel = Math.max(0, all.findIndex(c => c.id === view.selectedCrateId))
			start = Math.max(0, Math.min(sel - 2, all.length - 5))
		}
		const items = all.slice(start, start + 5)
		crateCount.value = all.length ? `${start + 1}–${start + items.length} of ${all.length}` : 'empty'
		if (items.length === 0) {
			listRoot = app.create('uiview', {
				width: 312,
				marginTop: 8,
				alignItems: 'center',
				backgroundColor: 'rgba(0, 0, 0, 0.35)',
				borderRadius: 10,
				paddingTop: 10,
				paddingBottom: 10,
			})
			listRoot.add(mkText('no crates yet — drop a boltVinyl in the world', 10, MUTED))
			panel.add(listRoot)
			return
		}
		listRoot = app.create('uiview', {
			width: 312,
			marginTop: 8,
			flexDirection: 'column',
			backgroundColor: 'rgba(0, 0, 0, 0.35)',
			borderRadius: 10,
			paddingTop: 5,
			paddingBottom: 5,
		})
		items.forEach((item, n) => {
			const isSelected = item.id === view.selectedCrateId
			const base = isSelected ? 'rgba(255, 43, 214, 0.16)' : 'transparent'
			const row = app.create('uiview', {
				width: 302,
				height: 26,
				flexDirection: 'row',
				alignItems: 'center',
				paddingLeft: 8,
				borderRadius: 8,
				backgroundColor: base,
				cursor: 'pointer',
			})
			const idx = mkText(String(start + n + 1).padStart(2, '0'), 9, MUTED, { width: 24 })
			row.add(idx)
			const nameT = mkText(`${isSelected ? '▶ ' : ''}${item.name}${item.artist ? ' — ' + item.artist : ''}`, 11, isSelected ? TEXT : DIM)
			row.add(nameT)
			row.onPointerOver = () => {
				row.backgroundColor = isSelected ? 'rgba(255, 43, 214, 0.28)' : 'rgba(255, 255, 255, 0.06)'
			}
			row.onPointerOut = () => {
				row.backgroundColor = base
			}
			row.onPointerDown = () => {
				console.warn('[djbooth] playlist select:', item.name)
				app.send('booth:request', { action: 'selectCrate', crateId: item.id })
			}
			listRoot.add(row)
		})
		panel.add(listRoot)
	}

	// ----- footer: autoplay + status -----
	const footer = app.create('uiview', {
		width: 312,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 12,
	})
	const autoB = mkBtn('AUTOPLAY OFF', 124, 28, GHOST, DIM, 9)
	const statusText = mkText('ready', 8, '#55556c')
	footer.add(autoB.btn)
	footer.add(statusText)
	panel.add(footer)

	ui.add(panel)

	// ----- interactions -----
	prevB.btn.onPointerDown = () => {
		console.warn('[djbooth] prev crate')
		app.send('booth:request', { action: 'prevCrate' })
	}
	nextB.btn.onPointerDown = () => {
		console.warn('[djbooth] next crate')
		app.send('booth:request', { action: 'nextCrate' })
	}
	playB.btn.onPointerDown = () => {
		app.send('booth:toggle', true)
	}
	autoB.btn.onPointerDown = () => {
		app.send('booth:autoplay', view.autoPlay !== 'enabled')
	}

	// live pulse — one restyle every half second, not per frame
	let pulseAt = 0
	let pulseOn = false
	app.on('update', () => {
		const now = world.getTime()
		if (now - pulseAt < 0.5) return
		pulseAt = now
		if (!view.playing) return
		pulseOn = !pulseOn
		livePill.backgroundColor = pulseOn ? 'rgba(255, 43, 85, 0.95)' : 'rgba(255, 43, 85, 0.45)'
	})

	// server relay delivers rig state (state bus -> our server -> app.send)
	app.send('booth:hello', true)

	app.on(RENDER_EVENT, state => {
		if (!state) return
		view = Object.assign({}, state)
		const np = state.nowPlaying
		const isStream = state.audioSource === 'stream'
		if (isStream) {
			npTitle.value = 'LIVE STREAM'
			npArtist.value = state.hasScreen ? state.screenHost || 'screen video' : 'set a Screen Video / Direct Video URL'
		} else {
			npTitle.value = np ? np.name : '· · ·'
			npArtist.value = np ? np.artist || 'from the crates' : 'waiting for a crate'
		}
		npSourceTxt.value = isStream ? '◉ LIVE STREAM' : '▦ LIBRARY'
		npSource.backgroundColor = isStream ? 'rgba(255, 43, 85, 0.2)' : 'rgba(255, 43, 214, 0.16)'
		npSourceTxt.color = isStream ? '#ff5c7a' : MAGENTA
		styleSource(state.audioSource || 'library')
		liveTxt.value = state.playing ? 'LIVE' : 'IDLE'
		liveTxt.color = state.playing ? '#ffffff' : DIM
		if (!state.playing) livePill.backgroundColor = 'rgba(255, 255, 255, 0.06)'
		playB.t.value = state.playing ? '⏸ STOP' : '▶ PLAY'
		autoB.t.value = state.autoPlay ? 'AUTOPLAY ON' : 'AUTOPLAY OFF'
		autoB.t.color = state.autoPlay ? CYAN : DIM
		autoB.btn.backgroundColor = state.autoPlay ? 'rgba(41, 231, 255, 0.12)' : GHOST
		statusText.value = state.playing
			? isStream
				? 'stream owns the room'
				: 'rig live — speakers synced'
			: embedUrl
				? 'embed mode'
				: 'ready'
		renderVolume(state.volume ?? 1)
		rebuildList()
	})
}
