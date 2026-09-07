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
const songNameStatic = props.songName || filenameName(songUrl) || 'Untitled'

// metadata resolver — server reads the ID3/Vorbis tags (music-metadata runs
// on the SERVER; app scripts cannot dynamically import packages —
// SES_IMPORT_REJECTED). This calls the /api/audio-meta endpoint with the
// injected fetch.
// Priority: explicit prop > embedded tags (title/artist) > filename > generic.
const metaCache = new Map()
// env access is defensive: on engines without the `env` endowment, reading it
// throws (undefined global). Until the env endowment ships in a deploy, fall
// back to relative API paths (works on same-origin deploys). Keys are
// PUBLIC_*-prefixed (env.js whitelist) — PUBLIC_API_URL / ASSETS_BASE_URL.
function getEnv(key) {
  try {
    return env?.[key]
  } catch {
    return undefined
  }
}
const apiBase = getEnv('PUBLIC_API_URL') || ''
async function resolveMetadata(url) {
  if (!url || metaCache.has(url)) return metaCache.get(url) || null
  try {
    const target = `${apiBase}/api/audio-meta?url=${encodeURIComponent(url)}`
    const resp = await fetch(target)
    if (!resp.ok) throw new Error(`http ${resp.status}`)
    const out = await resp.json()
    metaCache.set(url, out?.title ? out : null)
    debugLog('metadata:', out?.title, '/', out?.artist)
    return out?.title ? out : null
  } catch (err) {
    debugLog('metadata read failed:', err.message)
    metaCache.set(url, null)
    return null
  }
}

// filename fallback (decoded, extension stripped, -/_ spaced)
function filenameName(url) {
  if (!url) return null
  let name = url.split('?')[0].split('#')[0]
  name = decodeURIComponent(name.slice(name.lastIndexOf('/') + 1))
  name = name.replace(/\.[a-z0-9]{2,5}$/i, '')
  name = name.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  return name || null
}

// resolved display name (updated async once tags arrive; sync fallback first)
let resolvedMeta = null
function resolveDisplay() {
  if (resolvedMeta?.title) return { name: resolvedMeta.title, artist: resolvedMeta.artist || '' }
  return { name: props.songName || songNameStatic, artist: props.songArtist || '' }
}

const vinyl = app.get('NoobVinyl')

// ---------- server: offer the crate + track rig state ----------
if (world.isServer) {
  // display name resolves in stages: filename now, ID3 tags when the async
  // metadata read lands (offer is re-emit on change so the booth/panels
  // refresh without a rebuild)
  const display = () => resolveDisplay()
  console.warn(`[boltVinyl] server booted — "${display().name}" ${songUrl ? 'ready' : 'NO SONG'}`)

  // playlist shaping lives in the booth; we just announce what we have.
  // id = the audio URL only (stable across prop edits/moves/rebuilds):
  // re-offers with the SAME url update the existing entry (e.g. renamed
  // crate) instead of duplicating it as a new song.
  function offer() {
    if (!songUrl) return
    const d = display()
    app.emit(CRATE_EVENT, {
      id: songUrl,
      url: songUrl,
      name: d.name,
      artist: d.artist,
    })
    console.warn(`[boltVinyl] offered crate: "${d.name}" (${songUrl.slice(0, 48)}...)`)
  }

  // crates ask the booth to identify itself when it (re)builds
  world.on(CRATE_WHOIS, () => offer())
  // booth rescan: same event, crates just re-offer. Booth-driven heartbeat
  // (see djbooth) discovers crates placed after the booth booted.
  world.on(`${CHANNEL}:rescan`, () => offer())

  offer()
  // discovery retries: the booth may build after us, miss the heartbeat, or
  // be stale — keep re-offering on a slow decay until the booth confirms by
  // playing/broadcasting state with our url in it. Cheap: booth dedupes by id.
  ;[4, 8, 15, 30, 60].forEach(s => setTimeout(offer, s * 1000))

  // ID3 tags: async read, then re-offer with the resolved title/artist
  if (songUrl) {
    resolveMetadata(songUrl).then(meta => {
      if (!meta?.title) return
      resolvedMeta = meta
      const d = display()
      console.warn(`[boltVinyl] metadata resolved — "${d.name}" by ${d.artist || '?'}; re-offering crate`)
      offer()
    })
  }

  // mirror rig state down to our client (spin + now-playing display),
  // plus this crate's resolved display name for the world label
  world.on(STATE_EVENT, state => {
    if (!state) return
    app.send(RENDER_EVENT, { ...state, crateName: display().name, crateArtist: display().artist })
  })
}

// ---------- client: spin + label + status ----------
if (world.isClient) {
  console.warn(`[boltVinyl] client booted — "title pending"`)

  let isLiveTrack = false
  let npName = null
  let crateName = 'Untitled'

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
    value: crateName,
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

  app.on(RENDER_EVENT, data => {
    if (!data) return
    if (data.crateName) {
      crateName = data.crateName
    }
    const state = data
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
      labelText.value = crateName
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
