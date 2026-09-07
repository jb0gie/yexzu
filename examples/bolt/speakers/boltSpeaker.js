// boltSpeaker — one voice in the bolt surround rig
//
// Drop this on each speaker app in the world (stage L/R, subs, booth monitors...).
// All speakers play the SAME audio file, each from its own position, so the
// engine's HRTF panning turns N apps into a spatial surround field.
//
// The djbooth (examples/bolt/djbooth/djbooth.js) is the control center: it
// broadcasts 'bolt:audio:command' on the server world bus. This script's
// server context relays that to its own app on every client; each client
// seeks its local Audio node to (world.getTime() - cmd.t0). world.getTime()
// is server-synced (ClientNetwork), so every speaker on every client lands
// on the same spot in the track.
//
// Standalone mode: set the `file` prop and it plays on load without a booth.

app.configure([
  {
    key: 'speakerSection',
    type: 'section',
    label: 'Speaker',
  },
  {
    key: 'role',
    type: 'text',
    label: 'Role',
    initial: 'center',
    hint: 'label only (front-L, front-R, sub, booth-mon...) — shows in debug',
  },
  {
    key: 'channel',
    type: 'text',
    label: 'Channel',
    initial: 'bolt',
    hint: 'command channel to listen on (must match the booth)',
  },
  {
    key: 'standaloneSection',
    type: 'section',
    label: 'Standalone (no booth)',
  },
  {
    key: 'file',
    type: 'file',
    kind: 'audio',
    label: 'Audio File',
    hint: 'set to play on load without a booth controlling this speaker',
  },
  {
    key: 'autoPlay',
    type: 'switch',
    label: 'Auto Play (standalone)',
    options: [
      { label: 'Yes', value: 'enabled' },
      { label: 'No', value: 'disabled' },
    ],
    initial: 'enabled',
  },
  {
    key: 'audioSection',
    type: 'section',
    label: 'Audio',
  },
  {
    key: 'volume',
    type: 'range',
    label: 'Volume',
    initial: 1,
    min: 0,
    max: 2,
    step: 0.1,
  },
  {
    key: 'spatial',
    type: 'switch',
    label: 'Spatial',
    options: [
      { label: 'Spatial (3D)', value: true },
      { label: 'Global', value: false },
    ],
    initial: true,
  },
  {
    key: 'minDistance',
    type: 'number',
    label: 'Min Distance',
    initial: 3,
    min: 0.1,
    max: 100,
    description: 'distance where audio starts to fade (meters)',
  },
  {
    key: 'maxDistance',
    type: 'number',
    label: 'Max Distance',
    initial: 40,
    min: 1,
    max: 500,
    description: 'distance where audio becomes inaudible (meters)',
  },
  {
    key: 'rolloffFactor',
    type: 'switch',
    label: 'Falloff Rate',
    options: [
      { label: 'Gradual', value: 1 },
      { label: 'Medium', value: 2 },
      { label: 'Steep', value: 4 },
    ],
    initial: 2,
  },
  {
    key: 'loop',
    type: 'switch',
    label: 'Loop',
    options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
    initial: true,
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
const CMD_EVENT = `${CHANNEL}:audio:command`
const QUERY_EVENT = `${CHANNEL}:audio:query`
const TRACKEND_EVENT = `${CHANNEL}:trackend`
const RENDER_EVENT = `${CHANNEL}:speaker:render`
const AUDIO_EVENT = `${CHANNEL}:speaker:audio`
const WHOIS_EVENT = `${CHANNEL}:reactive:whois`

function debugLog(...args) {
  if (props.debug === 'enabled') {
    console.log(`[boltSpeaker:${props.role || '?'}]`, ...args)
  }
}

// ---------- server: relay booth commands to this app on every client ----------
if (world.isServer) {
  console.warn(`[boltSpeaker] server booted — role=${props.role || '?'} channel=${CHANNEL}`)

  let lastRenderedToken = null

  const relay = cmd => {
    if (!cmd || cmd.token === lastRenderedToken) return
    lastRenderedToken = cmd.token
    console.warn(`[boltSpeaker:${props.role || '?'}] server relay:`, cmd.action, 'url:', cmd.url || '-')
    app.send(RENDER_EVENT, cmd)
    debugLog('relayed command', cmd.action, 'token', cmd.token)
  }

  world.on(CMD_EVENT, relay)

  // late-joiner catch-up: ask the booth for rig state until it answers.
  // This also heals MOVE-REBUILDS: grabbing/releasing the app sets `mover`,
  // which rebuilds the app and wipes listeners (there is no keepActive API).
  // Fast retry keeps the dropout under ~2s instead of the old 4s+.
  // NOTE: setInterval/clearInterval are NOT endowed in the SES script
  // compartment (Scripts.js) — recursive engine setTimeout is the pattern.
  let attempts = 0
  const queryBooth = () => {
    if (lastRenderedToken || attempts >= 8) return
    attempts++
    app.emit(QUERY_EVENT, { channel: CHANNEL })
    debugLog('querying booth for rig state (attempt', attempts + ')')
    setTimeout(queryBooth, attempts === 1 ? 800 : 2000)
  }
  setTimeout(queryBooth, 800)
}

// ---------- client: render ----------
if (world.isClient) {
  console.warn(`[boltSpeaker] client booted — role=${props.role || '?'} channel=${CHANNEL}`)

  let audio = null
  let appliedToken = null
  let isPlaying = false
  let currentUrl = null

  function destroyAudio() {
    if (audio) {
      audio.stop()
      // tell visual apps this reactive source is gone
      app.emit(AUDIO_EVENT, { role: props.role || '?', audioId: audio.id, url: currentUrl, playing: false })
      app.remove(audio)
      audio = null
    }
    isPlaying = false
  }

  function ensureAudio(url) {
    if (audio && currentUrl === url) return audio
    destroyAudio()
    audio = app.create('audio', {
      src: url,
      loop: props.loop !== false,
      volume: props.volume ?? 1,
      spatial: props.spatial !== false,
      distanceModel: 'inverse',
      refDistance: props.minDistance ?? 3,
      maxDistance: props.maxDistance ?? 40,
      rolloffFactor: props.rolloffFactor ?? 2,
    })
    app.add(audio)
    currentUrl = url
    return audio
  }

  // seek to the shared-clock position and play
  function playFrom(cmd) {
    if (!cmd.url) {
      console.warn(`[boltSpeaker:${props.role || '?'}] play cmd has no url — booth Track prop empty?`)
      return
    }
    const node = ensureAudio(cmd.url)
    // rig tracks must END naturally so the booth can advance the playlist —
    // loop only applies to standalone mode
    node.loop = !!cmd.standalone && props.loop !== false
    const elapsed = Math.max(0, world.getTime() - cmd.t0)
    node.volume = cmd.volume ?? props.volume ?? 1
    node.currentTime = elapsed
    node.play()
    isPlaying = true
    // announce our audio node id on the client bus — visual apps
    // (boltBaseReactive) link their material reactivity to this node
    app.emit(AUDIO_EVENT, { role: props.role || '?', audioId: node.id, url: cmd.url, playing: true })
    // natural-end watch: when the engine stops this source on its own
    // (onended) WITHOUT a booth stop command, report track end once.
    // Poll cheaply in the update loop; 1s grace so seeks don't false-trip.
    if (endWatch) endWatch.dead = true
    endWatch = { dead: false, startedAt: world.getTime(), url: cmd.url, role: props.role || '?' }
    const myWatch = endWatch
    console.warn(`[boltSpeaker:${props.role || '?'}] PLAY from ${elapsed.toFixed(2)}s — url: ${cmd.url}`)
  }

  function applyCommand(cmd) {
    if (!cmd || cmd.token === appliedToken) return
    appliedToken = cmd.token
    console.warn(`[boltSpeaker:${props.role || '?'}] client render:`, cmd.action, 'url:', cmd.url || '-')
    if (cmd.action === 'play') {
      playFrom(cmd)
    } else if (cmd.action === 'stop') {
      destroyAudio()
      console.warn(`[boltSpeaker:${props.role || '?'}] stopped`)
    } else if (cmd.action === 'volume') {
      if (audio) audio.volume = cmd.value ?? props.volume ?? 1
    } else if (cmd.action === 'seek' && audio && isPlaying) {
      audio.currentTime = Math.max(0, cmd.pos)
      debugLog('seek', cmd.pos)
    }
  }

  // relay from our own server context
  app.on(RENDER_EVENT, cmd => applyCommand(cmd))

  // natural-end detection loop (client)
  let endWatch = null
  app.on('update', () => {
    if (!endWatch || endWatch.dead) return
    if (isPlaying) return // still going
    // source stopped on its own (engine onended) and no newer play started
    if (world.getTime() - endWatch.startedAt > 2) {
      endWatch.dead = true
      console.warn(`[boltSpeaker:${endWatch.role}] track ended naturally -> booth`)
      app.emit(TRACKEND_EVENT, { role: endWatch.role, url: endWatch.url })
    }
  })

  // visual apps ask who is playing (in-process, same client) — answer if live
  world.on(WHOIS_EVENT, () => {
    if (isPlaying && audio) {
      app.emit(AUDIO_EVENT, { role: props.role || '?', audioId: audio.id, url: currentUrl, playing: true })
    }
  })

  // standalone: play own file on load
  if (props.file?.url && props.autoPlay === 'enabled') {
    setTimeout(() => {
      playFrom({
        action: 'play',
        url: props.file.url,
        t0: world.getTime(),
        token: 'standalone-' + props.file.url,
      })
    }, 300)
  }

  app.on('destroy', () => destroyAudio())
}
