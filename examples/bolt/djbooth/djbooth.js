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
    description: 'global volume sent with every play command',
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
    description: 'start the rig automatically when the booth loads/rebuilds (server-side, synced clock)',
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
])

const CHANNEL = props.channel || 'bolt'
const CMD_EVENT = `${CHANNEL}:audio:command`
const QUERY_EVENT = `${CHANNEL}:audio:query`
const REQ_EVENT = `${CHANNEL}:audio:request`
const STATE_EVENT = `${CHANNEL}:rig:state`
const QUERYSTATE_EVENT = `${CHANNEL}:rig:querystate`
const CRATE_EVENT = `${CHANNEL}:crate:offer`
const CRATE_WHOIS = `${CHANNEL}:crate:whois`
const RENDER_EVENT = `${CHANNEL}:rig:render`
// re-evaluated on app rebuild (prop edits rebuild the app), so both server
// and client contexts always see the current track
const trackUrl = props.track?.url || props.trackLink || null
// route direct audio through our server proxy so it becomes same-origin —
// CORS is granted by the serving origin, and our proxy grants OURS. That
// unlocks WebAudio (-> Audio node -> rig: spatial, synced, reactive) for any
// direct stream URL, which cross-origin fetch could never do client-side.
const proxiedTrackUrl =
  trackUrl && /^https?:\/\//.test(trackUrl) && !trackUrl.startsWith(env.assetsUrl || '~')
    ? `${env.apiUrl || ''}/api/audio-proxy?url=${encodeURIComponent(trackUrl)}`
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

  // rig state relay: state bus -> our clients (panel display)
  world.on(STATE_EVENT, state => {
    if (!state) return
    app.send(RENDER_EVENT, state)
  })

  let tokenCounter = 0
  let isPlaying = false
  let rigT0 = null // world.getTime() anchor of the live track
  let rigToken = null // token of the live play command (reused for query answers)
  let selectedCrateId = null // which crate (or null = static props track)

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
      debugLog('crate added:', crate.name, `(${crateOrder.length} in playlist)`)
      // if nothing is playing, surface the new crate as selected
      if (!isPlaying && selectedCrateId === null) selectedCrateId = crate.id
      broadcastState()
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
    return url && /^https?:\/\//.test(url) && !(env.assetsUrl && url.startsWith(env.assetsUrl))
      ? `${env.apiUrl || ''}/api/audio-proxy?url=${encodeURIComponent(url)}`
      : url
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

  function emitCommand(cmd) {
    if (!cmd.token) cmd.token = `${Date.now()}-${++tokenCounter}`
    app.emit(CMD_EVENT, cmd)
    debugLog('emit', cmd.action, 'token', cmd.token)
  }

  function startRig() {
    const track = getSelectedTrack()
    if (!track) {
      console.warn('[djbooth] NO TRACK — drop a boltVinyl crate in the world or set the Track prop')
      return
    }
    console.warn('[djbooth] starting rig with', track.name, proxied(track.url))
    rigToken = `play-${Date.now()}-${++tokenCounter}`
    emitCommand({
      action: 'play',
      token: rigToken,
      url: proxied(track.url),
      t0: world.getTime(),
      volume: props.volume ?? 1,
    })
    rigT0 = world.getTime()
    isPlaying = true
    app.send('booth:status', { playing: true, url: track.url })
    broadcastState()
    debugLog('rig started')
  }

  // auto play: server-side start shortly after boot/rebuild. Fires on world
  // load AND on every prop edit/rebuild (heals itself); if the rig is already
  // playing a stop came first, so re-anchoring the track is correct, and if
  // the user stopped it manually the last stop is newer than this timer and
  // wins. Delay lets speaker apps build + join the bus first. A second late
  // window covers crates that offer after the first attempt.
  if (props.autoPlay === 'enabled') {
    const tryAutoStart = delay => {
      setTimeout(() => {
        if (!isPlaying && getSelectedTrack()) {
          console.warn('[djbooth] auto play — starting rig')
          startRig()
        }
      }, delay)
    }
    tryAutoStart(1500)
    tryAutoStart(5000)
  }

  function stopRig() {
    emitCommand({ action: 'stop' })
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
      hasTrack: !!track,
      playlist: crateOrder.map(c => ({ id: c.id, name: c.name, artist: c.artist })),
      selectedCrateId,
      nowPlaying: track
        ? { url: track.url, name: track.name, artist: track.artist }
        : null,
    })
  }

  app.on('booth:toggle', () => {
    if (isPlaying) stopRig()
    else startRig()
  })

  app.on('booth:volume', value => {
    if (isPlaying) emitCommand({ action: 'volume', value })
  })

  // control-plane requests from tablets/remotes (examples/bolt/tablets/).
  // NOTE: cross-app listeners MUST be world.on — app.on only hears events
  // entity-targeted at THIS app (app.send). Requests arrive via app.emit on
  // the server world bus from other apps' server contexts.
  world.on(REQ_EVENT, req => {
    if (!req) return
    debugLog('request:', req.action, req.value ?? '')
    if (req.action === 'toggle') {
      if (isPlaying) stopRig()
      else startRig()
    } else if (req.action === 'play' && !isPlaying) {
      startRig()
    } else if (req.action === 'stop' && isPlaying) {
      stopRig()
    } else if (req.action === 'volume') {
      const v = Math.min(2, Math.max(0, Number(req.value ?? props.volume ?? 1)))
      props.volume = v // authoritative volume, reused by startRig
      if (isPlaying) emitCommand({ action: 'volume', value: v })
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

  // speaker apps ask for rig state when they build mid-track (late join OR
  // move-rebuild). Re-emit with the ORIGINAL token: already-playing speakers
  // dedupe-skip it, only the rebuilt speaker applies and re-syncs. No global
  // glitch on every query.
  world.on(QUERY_EVENT, () => {
    debugLog('speaker queried rig state')
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

// ---------- client: control panel + action ----------
if (world.isClient) {
  console.warn(`[djbooth] booted — channel=${CHANNEL}, track=${trackUrl ? 'set' : 'via crates'}`)

  // mirror of rig state (arrives via server relay from the state bus)
  let view = { playing: false, volume: 1, hasTrack: false, playlist: [], selectedCrateId: null, nowPlaying: null }

  const playAction = app.create('action', {
    label: 'Drop the Beat',
    distance: 5,
    duration: 1,
    onTrigger: () => {
      console.warn('[djbooth] action triggered -> booth:toggle')
      app.send('booth:toggle', true)
    },
  })
  app.add(playAction)

  // Yoga flexbox layout (children are NOT positioned with 3D vectors —
  // only the root ui node gets a position; everything inside flows)
  const ui = app.create('ui', {
    width: 320,
    height: 300,
    position: [0, 2.2, 0],
    pivot: 'center',
    space: 'world',
    billboard: 'y',
    pointerEvents: true,
  })
  app.add(ui)

  const panel = app.create('uiview', {
    width: 320,
    height: 300,
    backgroundColor: 'rgba(10, 10, 18, 0.85)',
    borderRadius: 12,
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 14,
  })

  const title = app.create('uitext', {
    value: `🎧 BOLT RIG — ${CHANNEL}`,
    fontSize: 17,
    color: '#ff66ff',
    fontWeight: 'bold',
    marginBottom: 8,
  })
  panel.add(title)

  const nowText = app.create('uitext', {
    value: '· · ·',
    fontSize: 13,
    color: '#66ffcc',
    marginBottom: 2,
  })
  panel.add(nowText)

  const statusText = app.create('uitext', {
    value: embedUrl ? 'embed mode — play on the screen' : 'ready',
    fontSize: 11,
    color: '#aaaacc',
    marginBottom: 12,
  })
  panel.add(statusText)

  // ----- transport row -----
  function makeButton(label, color, marginRight) {
    const btn = app.create('uiview', {
      width: 86,
      height: 36,
      backgroundColor: color,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer',
      marginRight: marginRight ?? 0,
    })
    btn.add(app.create('uitext', { value: label, fontSize: 13, color: '#ffffff' }))
    return btn
  }

  const transportRow = app.create('uiview', { flexDirection: 'row' })
  const prevBtn = makeButton('◀ prev', 'rgba(60, 60, 90, 0.95)', 10)
  const playBtn = makeButton('▶ play', 'rgba(40, 160, 90, 0.95)', 10)
  const nextBtn = makeButton('next ▶', 'rgba(60, 60, 90, 0.95)')
  transportRow.add(prevBtn)
  transportRow.add(playBtn)
  transportRow.add(nextBtn)
  panel.add(transportRow)

  // ----- playlist (top 5 rows, rebuilt on state change) -----
  let listRoot = null
  function rebuildList() {
    if (listRoot) {
      panel.remove(listRoot)
      listRoot = null
    }
    const items = (view.playlist || []).slice(0, 5)
    if (items.length === 0) return
    listRoot = app.create('uiview', {
      width: 292,
      marginTop: 12,
      flexDirection: 'column',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: 8,
      paddingTop: 4,
      paddingBottom: 4,
    })
    items.forEach(item => {
      const isSelected = item.id === view.selectedCrateId
      const row = app.create('uiview', {
        width: 284,
        height: 24,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
        backgroundColor: isSelected ? 'rgba(102, 255, 204, 0.16)' : 'transparent',
        cursor: 'pointer',
      })
      row.add(app.create('uitext', {
        value: `${isSelected ? '▶ ' : '   '}${item.name}${item.artist ? ' — ' + item.artist : ''}`,
        fontSize: 11,
        color: isSelected ? '#66ffcc' : '#aaaacc',
      }))
      row.onPointerDown = () => {
        console.warn('[djbooth] playlist select:', item.name)
        app.send('booth:request', { action: 'selectCrate', crateId: item.id })
      }
      listRoot.add(row)
    })
    panel.add(listRoot)
  }

  const hint = app.create('uitext', {
    value: 'click rows / press esc to free cursor',
    fontSize: 9,
    color: '#55556c',
    marginTop: 10,
  })
  panel.add(hint)

  ui.add(panel)

  // ----- interactions -----
  prevBtn.onPointerDown = () => {
    console.warn('[djbooth] prev crate')
    app.send('booth:request', { action: 'prevCrate' })
  }
  nextBtn.onPointerDown = () => {
    console.warn('[djbooth] next crate')
    app.send('booth:request', { action: 'nextCrate' })
  }
  playBtn.onPointerDown = () => {
    app.send('booth:toggle', true)
  }

  // server relay delivers rig state (state bus -> our server -> app.send)
  app.on(RENDER_EVENT, state => {
    if (!state) return
    view = state
    const np = state.nowPlaying
    nowText.value = state.playing && np
      ? `▶ ${np.name}${np.artist ? ' — ' + np.artist : ''}`
      : np
        ? `■ ${np.name}`
        : '· · ·'
    statusText.value = state.playing ? 'rig live — all speakers synced' : embedUrl ? 'embed mode — play on the screen' : 'ready'
    playAction.label = state.playing ? 'Stop the Rig' : 'Drop the Beat'
    playBtn.children?.[0] && (playBtn.children[0].value = state.playing ? '■ stop' : '▶ play')
    rebuildList()
  })
}
