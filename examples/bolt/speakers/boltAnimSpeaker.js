// boltAnimSpeaker — boltSpeaker + rig animation (SpeakersOn/SpeakersOff)
//
// Drop-in replacement for boltSpeaker.js on speaker apps whose GLB carries
// the speaker animation rig (the one split out of the bolt base GLB).
// Identical surround behavior — same channel, same relay, same clock sync —
// plus: on rig play -> SpeakersOn (looping), on stop -> SpeakersOff (once).
//
// The djbooth (examples/bolt/djbooth/djbooth.js) is still the control center.
// Late joiners get the catch-up query, so their speakers animate too.
//
// Standalone mode: set the `file` prop and it plays (and animates) on load.

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
    key: 'animSection',
    type: 'section',
    label: 'Rig Animation',
  },
  {
    key: 'rig',
    type: 'text',
    label: 'Rig Node Name',
    initial: 'SpeakerRig',
    hint: 'node in this GLB that carries the animations',
  },
  {
    key: 'animOn',
    type: 'text',
    label: 'Playing Animation',
    initial: 'SpeakersOn',
  },
  {
    key: 'animOff',
    type: 'text',
    label: 'Idle Animation',
    initial: 'SpeakersOff',
  },
  {
    key: 'animFade',
    type: 'range',
    label: 'Animation Fade',
    initial: 0.5,
    min: 0,
    max: 2,
    step: 0.1,
    description: 'crossfade seconds between states',
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
const RENDER_EVENT = `${CHANNEL}:speaker:render`

function debugLog(...args) {
  if (props.debug === 'enabled') {
    console.log(`[boltAnimSpeaker:${props.role || '?'}]`, ...args)
  }
}

// ---------- server: relay booth commands to this app on every client ----------
if (world.isServer) {
  console.warn(`[boltAnimSpeaker] server booted — role=${props.role || '?'} channel=${CHANNEL}`)

  let lastRenderedToken = null

  const relay = cmd => {
    if (!cmd || cmd.token === lastRenderedToken) return
    lastRenderedToken = cmd.token
    console.warn(`[boltAnimSpeaker:${props.role || '?'}] server relay:`, cmd.action, 'url:', cmd.url || '-')
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
  console.warn(`[boltAnimSpeaker] client booted — role=${props.role || '?'} channel=${CHANNEL}`)

  // ----- rig animation layer (same pattern as boltBaseReactive) -----
  const speakerRig = props.rig ? app.get(props.rig) : null
  if (!speakerRig) {
    console.warn(`[boltAnimSpeaker:${props.role || '?'}] rig node "${props.rig || 'SpeakerRig'}" not found in GLB — animation disabled, audio still works`)
  }

  function setSpeakerAnim(playing) {
    if (!speakerRig?.play) return
    const animName = playing ? props.animOn || 'SpeakersOn' : props.animOff || 'SpeakersOff'
    try {
      speakerRig.play({ name: animName, loop: playing, fade: props.animFade ?? 0.5 })
      debugLog('anim:', animName, playing ? '(looping)' : '(once)')
    } catch (err) {
      console.warn(`[boltAnimSpeaker:${props.role || '?'}] anim "${animName}" failed:`, err.message)
    }
  }

  let audio = null
  let appliedToken = null
  let isPlaying = false
  let currentUrl = null

  function destroyAudio() {
    if (audio) {
      audio.stop()
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
      console.warn(`[boltAnimSpeaker:${props.role || '?'}] play cmd has no url — booth Track prop empty?`)
      return
    }
    const node = ensureAudio(cmd.url)
    const elapsed = Math.max(0, world.getTime() - cmd.t0)
    node.volume = cmd.volume ?? props.volume ?? 1
    node.currentTime = elapsed
    node.play()
    isPlaying = true
    setSpeakerAnim(true)
    console.warn(`[boltAnimSpeaker:${props.role || '?'}] PLAY from ${elapsed.toFixed(2)}s — url: ${cmd.url}`)
  }

  function applyCommand(cmd) {
    if (!cmd || cmd.token === appliedToken) return
    appliedToken = cmd.token
    console.warn(`[boltAnimSpeaker:${props.role || '?'}] client render:`, cmd.action, 'url:', cmd.url || '-')
    if (cmd.action === 'play') {
      playFrom(cmd)
    } else if (cmd.action === 'stop') {
      destroyAudio()
      setSpeakerAnim(false)
      console.warn(`[boltAnimSpeaker:${props.role || '?'}] stopped`)
    } else if (cmd.action === 'volume') {
      if (audio) audio.volume = cmd.value ?? props.volume ?? 1
    } else if (cmd.action === 'seek' && audio && isPlaying) {
      audio.currentTime = Math.max(0, cmd.pos)
      debugLog('seek', cmd.pos)
    }
  }

  // relay from our own server context
  app.on(RENDER_EVENT, cmd => applyCommand(cmd))

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
