// boltVinyl — a "crate" in the bolt rig
//
// Attach to a vinyl/record GLB, drop a song on it in props. It offers its
// track to the djbooth over the server bus — the booth collects crates into
// its playlist; tablets and the booth panel browse them. No URL copy/paste:
// the asset URL never leaves the rig's signal fabric.
//
//   vinyl server -> app.emit '<ch>:crate:offer'    -> booth server (playlist)
//   booth server -> app.emit '<ch>:rig:state'      -> everyone (incl. nowPlaying)
//   vinyl server -> app.emit '<ch>:crate:whois'    -> booth re-offers its playlist
//
// The vinyl also plays its OWN song on loop when the rig is NOT playing that
// track — a crate on a shelf hums its tune; the booth takes over when the
// rig plays it. (Standalone showcase mode — set `standalone` to disable.)

app.configure([
	{
		key: 'vinylSection',
		type: 'section',
		label: 'Vinyl',
	},
	{
		key: 'song0',
		type: 'file',
		kind: 'audio',
		label: 'Song',
		hint: 'the track this crate offers to the booth',
	},
	{
		key: 'songName',
		type: 'text',
		label: 'Song Name',
		initial: '',
	},
	{
		key: 'songArtist',
		type: 'text',
		label: 'Artist',
		initial: '',
	},
	{
		key: 'channel',
		type: 'text',
		label: 'Channel',
		initial: 'bolt',
		hint: 'must match the booth',
	},
	{
		key: 'spinning',
		type: 'switch',
		label: 'Spin While Playing',
		options: [
			{ label: 'Yes', value: 'enabled' },
			{ label: 'No', value: 'disabled' },
		],
		initial: 'enabled',
		hint: 'rotate the vinyl while its track is the live rig track',
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
])

const CHANNEL = props.channel || 'bolt'
const CRATE_EVENT = `${CHANNEL}:crate:offer`
const CRATE_WHOIS = `${CHANNEL}:crate:whois`
const STATE_EVENT = `${CHANNEL}:rig:state`
const RENDER_EVENT = 'vinyl:render'

function debugLog(...args) {
	if (props.debug === 'enabled') {
		console.log('[boltVinyl]', ...args)
	}
}

const songUrl = props.song0?.url || null
// name priority: explicit prop > filename from the URL (decoded, extension
// and query stripped, hyphens/underscores spaced, hash-ids tolerated) > generic
function nameFromUrl(url) {
	if (!url) return null
	let name = url.split('?')[0].split('#')[0]
	name = decodeURIComponent(name.slice(name.lastIndexOf('/') + 1))
	name = name.replace(/\.[a-z0-9]{2,5}$/i, '')
	name = name.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
	if (!name) return null
	// reject hash-like blob names (e.g. 9f8ac2d1 — uploaded asset filenames):
	// long single token, mostly consonant-digits, no spaces
	const compact = name.replace(/\s/g, '')
	if (!name.includes(' ') && compact.length >= 8) {
		const vowelish = (compact.match(/[aeiouy]/gi) || []).length
		if (vowelish / compact.length < 0.25) return null
	}
	return name || null
}
const songName = props.songName || nameFromUrl(songUrl) || 'Untitled'
const songArtist = props.songArtist || ''

const vinyl = app.get('NoobVinyl')
vinyl.type = 'kinematic'

// ---------- server: offer the crate + track rig state ----------
if (world.isServer) {
	console.warn(`[boltVinyl] server booted — "${songName}" ${songUrl ? 'ready' : 'NO SONG'}`)

	// playlist shaping lives in the booth; we just announce what we have.
	// id = the audio URL only (stable across prop edits/moves/rebuilds):
	// re-offers with the SAME url update the existing entry (e.g. renamed
	// crate) instead of duplicating it as a new song.
	function offer() {
		if (!songUrl) return
		app.emit(CRATE_EVENT, {
			id: songUrl,
			url: songUrl,
			name: songName,
			artist: songArtist,
		})
		debugLog('offered crate:', songName)
	}

	// the booth asks crates to identify themselves when it (re)builds
	world.on(CRATE_WHOIS, () => offer())

	offer()
	setTimeout(offer, 2000) // once more in case the booth built after us

	// mirror rig state down to our client (spin + now-playing display)
	world.on(STATE_EVENT, state => {
		if (!state) return
		app.send(RENDER_EVENT, state)
	})
}

// ---------- client: spin + label + status ----------
if (world.isClient) {
	console.warn(`[boltVinyl] client booted — "${songName}"`)

	let isLiveTrack = false
	let npName = null

	// ----- world-space label (what is this crate / what's playing) -----
	// Yoga flexbox: root ui carries the 3D position, children flow.
	const labelUi = app.create('ui', {
		width: 200,
		height: 56,
		position: [0, 0.55, 0],
		pivot: 'center',
		space: 'world',
		billboard: 'y',
	})
	app.add(labelUi)

	const labelPanel = app.create('uiview', {
		width: 200,
		height: 56,
		backgroundColor: 'rgba(8, 10, 16, 0.75)',
		borderRadius: 8,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
	})

	const labelText = app.create('uitext', {
		value: songName,
		fontSize: 12,
		color: '#66ffcc',
		textAlign: 'center',
	})
	labelPanel.add(labelText)

	const stateLabel = app.create('uitext', {
		value: '· idle ·',
		fontSize: 9,
		color: '#888899',
		marginTop: 2,
	})
	labelPanel.add(stateLabel)

	labelUi.add(labelPanel)

	app.on(RENDER_EVENT, state => {
		if (!state) return
		const wasLive = isLiveTrack
		// the booth includes nowPlaying { url, name, artist } in state
		const np = state.nowPlaying
		isLiveTrack = !!(np && np.url === songUrl)
		npName = np ? np.name : null
		if (isLiveTrack !== wasLive) {
			debugLog(isLiveTrack ? 'this crate is LIVE' : 'crate idle')
		}
		// live crate: show what the rig is playing; idle crate: its own name
		if (isLiveTrack) {
			labelText.value = `▶ ${npName}`
			labelText.color = '#66ffcc'
			stateLabel.value = 'now playing on the rig'
			stateLabel.color = '#66ffcc'
		} else {
			labelText.value = songName
			labelText.color = '#aaaacc'
			stateLabel.value = songUrl ? 'crate ready' : 'no song'
			stateLabel.color = '#888899'
		}
	})

	let spinAngle = 0
	app.on('update', delta => {
		if (vinyl && props.spinning !== 'disabled' && isLiveTrack) {
			spinAngle += 1.5 * delta
			vinyl.rotation.y = spinAngle
		}
	})
}
