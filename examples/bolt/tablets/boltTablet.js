// boltTablet — portable control surface for the bolt rig
//
// Attach to the tablet.glb app. Controls the rig THROUGH the djbooth (the
// state authority). Event flows (all relays: server world.on, then app.send
// to this app's clients — app.emit broadcasts never cross processes):
//
//   tablet client  -> app.send 'tablet:toggle'        -> tablet server
//   tablet server  -> app.emit '<ch>:audio:request'   -> booth server (world.on)
//   booth server   -> app.emit '<ch>:rig:state'       -> tablet server (world.on)
//   tablet server  -> app.send 'tablet:render'        -> tablet client (UI update)
//
// N tablets can control the same rig; all of them mirror rig state. A tablet
// that rebuilds (moved, prop-edited) re-queries state and heals itself.
//
// Controls are proximity actions (this engine build has no uibutton node):
//   "Play/Stop Rig" -> toggle playback, "Vol Up"/"Vol Down" -> +/- 0.25
// The tablet's world-space screen mirrors rig state live.

app.configure([
  {
    key: 'tabletSection',
    type: 'section',
    label: 'Tablet',
  },
  {
    key: 'channel',
    type: 'text',
    label: 'Channel',
    initial: 'bolt',
    hint: 'command channel — must match the booth and speakers',
  },
  {
    key: 'label',
    type: 'text',
    label: 'Tablet Label',
    initial: 'BOLT REMOTE',
    hint: 'shown on the tablet screen',
  },
  {
    key: 'screenSection',
    type: 'section',
    label: 'Screen',
  },
  {
    key: 'screenMesh',
    type: 'text',
    label: 'Screen Anchor Mesh',
    initial: '',
    hint: 'mesh in the tablet GLB whose position anchors the panel (empty = above origin)',
  },
  {
    key: 'panelSize',
    type: 'range',
    label: 'Panel Size',
    initial: 0.004,
    min: 0.001,
    max: 0.02,
    step: 0.001,
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
const REQ_EVENT = `${CHANNEL}:audio:request`
const STATE_EVENT = `${CHANNEL}:rig:state`
const QUERYSTATE_EVENT = `${CHANNEL}:rig:querystate`
const RENDER_EVENT = 'tablet:render'

function debugLog(...args) {
  if (props.debug === 'enabled') {
    console.log('[boltTablet]', ...args)
  }
}

// ---------- server: request sender + state relay ----------
if (world.isServer) {
  console.warn(`[boltTablet] server booted — channel=${CHANNEL}`)

  // outbound requests: fired from our own client via app.send
  app.on('tablet:toggle', () => {
    app.emit(REQ_EVENT, { action: 'toggle' })
    debugLog('request: toggle')
  })

  app.on('tablet:volume', value => {
    app.emit(REQ_EVENT, { action: 'volume', value })
    debugLog('request: volume', value)
  })

  // inbound rig state (from booth's server-context app.emit) — relay to our
  // clients. This is the ONLY path state reaches client contexts.
  world.on(STATE_EVENT, state => {
    if (!state) return
    debugLog('rig state:', state.playing ? 'playing' : 'stopped', 'vol', state.volume)
    app.send(RENDER_EVENT, state)
  })

  // rebuild healing: query the booth until it answers (server-side — app.emit
  // here lands on the SERVER world bus where the booth listens)
  let gotState = false
  let attempts = 0
  const queryState = () => {
    if (gotState || attempts >= 8) return
    attempts++
    app.emit(QUERYSTATE_EVENT, { channel: CHANNEL })
    debugLog('querying rig state (attempt', attempts + ')')
    setTimeout(queryState, attempts === 1 ? 1000 : 3000)
  }
  setTimeout(queryState, 1000)
}

// ---------- client: actions + status screen ----------
if (world.isClient) {
  console.warn(`[boltTablet] client booted — channel=${CHANNEL}`)

  const playAction = app.create('action', {
    label: 'Play Rig',
    distance: 4,
    duration: 1,
    onTrigger: () => {
      console.warn('[boltTablet] toggle -> booth')
      app.send('tablet:toggle', true)
    },
  })
  app.add(playAction)

  let lastState = { playing: false, volume: 1, hasTrack: false }

  const volUpAction = app.create('action', {
    label: 'Vol Up',
    distance: 4,
    duration: 1,
    onTrigger: () => {
      app.send('tablet:volume', Math.min(2, (lastState.volume ?? 1) + 0.25))
    },
  })
  app.add(volUpAction)

  const volDownAction = app.create('action', {
    label: 'Vol Down',
    distance: 4,
    duration: 1,
    onTrigger: () => {
      app.send('tablet:volume', Math.max(0, (lastState.volume ?? 1) - 0.25))
    },
  })
  app.add(volDownAction)

  // ----- world-space status panel -----
  const anchor = props.screenMesh ? app.get(props.screenMesh) : null
  if (props.screenMesh && !anchor) {
    console.warn(`[boltTablet] screen anchor "${props.screenMesh}" not found — panel sits above origin`)
  }

  const panelPos = anchor
    ? [anchor.position.x, anchor.position.y + 0.25, anchor.position.z]
    : [0, 0.35, 0]

  const ui = app.create('ui', {
    width: 260,
    height: 120,
    size: props.panelSize ?? 0.004,
    position: panelPos,
    pivot: 'center',
    space: 'world',
    backgroundColor: 'rgba(8, 10, 16, 0.85)',
    borderRadius: 10,
  })

  const title = app.create('uitext', {
    value: `📱 ${props.label || 'BOLT REMOTE'}`,
    fontSize: 16,
    color: '#ff66ff',
    textAlign: 'center',
    position: [0, 42, 0],
  })
  ui.add(title)

  const stateText = app.create('uitext', {
    value: '— syncing —',
    fontSize: 13,
    color: '#aaaacc',
    textAlign: 'center',
    position: [0, 8, 0],
  })
  ui.add(stateText)

  const volText = app.create('uitext', {
    value: 'VOL --',
    fontSize: 12,
    color: '#66ffcc',
    textAlign: 'center',
    position: [0, -22, 0],
  })
  ui.add(volText)

  app.add(ui)

  function renderState() {
    stateText.value = lastState.playing
      ? '▶ RIG LIVE'
      : lastState.hasTrack
        ? '■ ready'
        : 'no track on booth'
    volText.value = `VOL ${Number(lastState.volume ?? 1).toFixed(2)}`
    playAction.label = lastState.playing ? 'Stop Rig' : 'Play Rig'
  }

  // state arrives entity-targeted from our own server context
  app.on(RENDER_EVENT, state => {
    if (!state) return
    lastState = state
    renderState()
  })

  renderState()
}
