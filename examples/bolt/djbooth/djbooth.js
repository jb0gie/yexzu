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
// re-evaluated on app rebuild (prop edits rebuild the app), so both server
// and client contexts always see the current track
const trackUrl = props.track?.url || props.trackLink || null
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
  let tokenCounter = 0
  let isPlaying = false
  let rigT0 = null // world.getTime() anchor of the live track
  let rigToken = null // token of the live play command (reused for query answers)

  function emitCommand(cmd) {
    if (!cmd.token) cmd.token = `${Date.now()}-${++tokenCounter}`
    app.emit(CMD_EVENT, cmd)
    debugLog('emit', cmd.action, 'token', cmd.token)
  }

  function startRig() {
    if (!trackUrl) {
      console.warn('[djbooth] NO TRACK — set the Track prop on the booth app')
      return
    }
    console.warn('[djbooth] starting rig with', trackUrl)
    rigToken = `play-${Date.now()}-${++tokenCounter}`
    emitCommand({
      action: 'play',
      token: rigToken,
      url: trackUrl,
      t0: world.getTime(),
      volume: props.volume ?? 1,
    })
    rigT0 = world.getTime()
    isPlaying = true
    app.send('booth:status', { playing: true, url: trackUrl })
    broadcastState()
    debugLog('rig started')
  }

  // auto play: server-side start shortly after boot/rebuild. Fires on world
  // load AND on every prop edit/rebuild (heals itself); if the rig is already
  // playing a stop came first, so re-anchoring the track is correct, and if
  // the user stopped it manually the last stop is newer than this timer and
  // wins. Delay lets speaker apps build + join the bus first.
  if (props.autoPlay === 'enabled' && trackUrl) {
    setTimeout(() => {
      if (!isPlaying) {
        console.warn('[djbooth] auto play — starting rig')
        startRig()
      }
    }, 1500)
  }

  function stopRig() {
    emitCommand({ action: 'stop' })
    isPlaying = false
    app.send('booth:status', { playing: false })
    broadcastState()
    debugLog('rig stopped')
  }

  // rig state broadcast for control surfaces (tablets). State-only — no
  // command payload, speakers ignore it.
  function broadcastState() {
    app.emit(STATE_EVENT, {
      playing: isPlaying,
      volume: props.volume ?? 1,
      hasTrack: !!trackUrl,
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
    if (isPlaying && trackUrl) {
      emitCommand({
        action: 'play',
        token: rigToken,
        url: trackUrl,
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
  console.warn(`[djbooth] booted — channel=${CHANNEL}, track=${trackUrl ? 'set' : 'NOT SET (add a Track in props)'}`)

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

  const ui = app.create('ui', {
    width: 300,
    height: 190,
    size: 0.005,
    position: [0, 2.1, 0],
    pivot: 'center',
    space: 'world',
    backgroundColor: 'rgba(10, 10, 18, 0.82)',
    borderRadius: 12,
  })

  const title = app.create('uitext', {
    value: `🎧 BOLT RIG — ${CHANNEL}`,
    fontSize: 18,
    color: '#ff66ff',
    textAlign: 'center',
    position: [0, 70, 0],
  })
  ui.add(title)

  const statusText = app.create('uitext', {
    value: embedUrl
      ? 'embed mode — play on the screen'
      : trackUrl
        ? 'ready — action to start'
        : 'no track configured',
    fontSize: 12,
    color: '#aaaacc',
    textAlign: 'center',
    position: [0, 42, 0],
  })
  ui.add(statusText)

  // mount the panel (was missing — that's why nothing rendered)
  app.add(ui)

  app.on('booth:status', status => {
    console.warn('[djbooth] status:', status.playing ? 'playing' : 'stopped')
    playAction.label = status.playing ? 'Stop the Rig' : 'Drop the Beat'
    statusText.value = status.playing
      ? '▶ rig live — all speakers synced'
      : trackUrl
        ? 'ready — action to start'
        : 'no track configured'
  })
}
