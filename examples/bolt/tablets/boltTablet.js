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
// CONTROLS
//   B key (or tablet action) — put the tablet away / bring it up.
//   Tablet up = PHONE emote (walk variant while moving, GTA-style) and the
//   control panel appears. Tablet down = emote clears, panel hides.
//   Emote-hold pattern ported from HowieDuhzit's CoolPhone/hyperfone via the
//   PlayerLocal PHONE/PHONE_WALK emotes (feat/phone-emote).

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
    key: 'interactSection',
    type: 'section',
    label: 'Interaction',
  },
  {
    key: 'toggleKey',
    type: 'text',
    label: 'Toggle Key',
    initial: 'B',
    hint: 'keyboard key that raises/lowers the tablet (key name without "key" prefix)',
  },
  {
    key: 'emoteWhileUp',
    type: 'switch',
    label: 'Phone Emote While Up',
    options: [
      { label: 'Yes', value: 'enabled' },
      { label: 'No', value: 'disabled' },
    ],
    initial: 'enabled',
    hint: 'play the PHONE/PHONE_WALK emote while the tablet is up',
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

const PHONE_EMOTE = 'asset://emote-phone.glb'
const PHONE_WALK_EMOTE = 'asset://emote-phoneWalk.glb?s=1.5'

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

// ---------- client: input, emote-hold, actions + status screen ----------
if (world.isClient) {
  console.warn(`[boltTablet] client booted — channel=${CHANNEL}`)

  let lastState = { playing: false, volume: 1, hasTrack: false }
  let tabletUp = false
  let appliedEmote = false

  // ----- UI panel (hidden until tablet is up) -----
  const anchor = props.screenMesh ? app.get(props.screenMesh) : null
  if (props.screenMesh && !anchor) {
    console.warn(`[boltTablet] screen anchor "${props.screenMesh}" not found — panel sits above origin`)
  }

  const panelPos = anchor
    ? [anchor.position.x, anchor.position.y + 0.25, anchor.position.z]
    : [0, 0.35, 0]

  const ui = app.create('ui', {
    width: 260,
    height: 140,
    size: props.panelSize ?? 0.004,
    position: panelPos,
    pivot: 'center',
    space: 'world',
    backgroundColor: 'rgba(8, 10, 16, 0.85)',
    borderRadius: 10,
    active: false, // tablet starts stowed
  })

  const title = app.create('uitext', {
    value: `📱 ${props.label || 'BOLT REMOTE'}`,
    fontSize: 16,
    color: '#ff66ff',
    textAlign: 'center',
    position: [0, 52, 0],
  })
  ui.add(title)

  const stateText = app.create('uitext', {
    value: '— syncing —',
    fontSize: 13,
    color: '#aaaacc',
    textAlign: 'center',
    position: [0, 16, 0],
  })
  ui.add(stateText)

  const volText = app.create('uitext', {
    value: 'VOL --',
    fontSize: 12,
    color: '#66ffcc',
    textAlign: 'center',
    position: [0, -14, 0],
  })
  ui.add(volText)

  const hintText = app.create('uitext', {
    value: `[${(props.toggleKey || 'B').toUpperCase()}] stow`,
    fontSize: 10,
    color: '#666688',
    textAlign: 'center',
    position: [0, -44, 0],
  })
  ui.add(hintText)

  app.add(ui)

  function renderState() {
    stateText.value = lastState.playing
      ? '▶ RIG LIVE'
      : lastState.hasTrack
        ? '■ ready'
        : 'no track on booth'
    volText.value = `VOL ${Number(lastState.volume ?? 1).toFixed(2)}`
  }

  // ----- tablet up/down (emote-hold pattern) -----
  function setTablet(up) {
    if (up === tabletUp) return
    tabletUp = up
    ui.active = up
    debugLog('tablet', up ? 'UP' : 'down')

    // apply/clear the phone emote on OUR player, GTA-style
    if (props.emoteWhileUp !== 'disabled') {
      const me = world.getPlayer()
      if (me?.applyEffect) {
        try {
          if (up) {
            // engine picks PHONE vs PHONE_WALK by movement in PlayerLocal;
            // from a script we play the static one and let the player's own
            // movement emote override while walking (cancellable)
            me.applyEffect({ emote: PHONE_EMOTE, cancellable: true })
            appliedEmote = true
          } else if (appliedEmote) {
            me.cancelEffect()
            appliedEmote = false
          }
        } catch (err) {
          console.warn('[boltTablet] emote failed:', err.message)
        }
      }
    }
  }

  // keyboard toggle — control key names are `key` + <props.toggleKey>
  const control = app.control()
  const keyName = `key${(props.toggleKey || 'B').toUpperCase()}`
  let lastKeyState = false

  app.on('update', () => {
    if (!control) return
    const key = control[keyName]
    const pressedNow = !!key && (key.pressed || key.down === true)
    // edge-detect (pressed fires once; down is held — accept either)
    if (pressedNow && !lastKeyState) {
      setTablet(!tabletUp)
    }
    lastKeyState = pressedNow
  })

  // ----- rig controls (actions only fire when the tablet is up) -----
  const playAction = app.create('action', {
    label: 'Play Rig',
    distance: 4,
    duration: 1,
    onTrigger: () => {
      if (!tabletUp) return // tablet stowed — actions sleep
      app.send('tablet:toggle', true)
    },
  })
  app.add(playAction)

  const volUpAction = app.create('action', {
    label: 'Vol Up',
    distance: 4,
    duration: 1,
    onTrigger: () => {
      if (!tabletUp) return
      app.send('tablet:volume', Math.min(2, (lastState.volume ?? 1) + 0.25))
    },
  })
  app.add(volUpAction)

  const volDownAction = app.create('action', {
    label: 'Vol Down',
    distance: 4,
    duration: 1,
    onTrigger: () => {
      if (!tabletUp) return
      app.send('tablet:volume', Math.max(0, (lastState.volume ?? 1) - 0.25))
    },
  })
  app.add(volDownAction)

  function refreshActionLabels() {
    playAction.label = lastState.playing ? 'Stop Rig' : 'Play Rig'
  }

  // state arrives entity-targeted from our own server context
  app.on(RENDER_EVENT, state => {
    if (!state) return
    lastState = state
    renderState()
    refreshActionLabels()
  })

  // put the emote away if the app is destroyed while the tablet is up
  app.on('destroy', () => {
    if (appliedEmote) {
      try {
        world.getPlayer()?.cancelEffect()
      } catch (err) {
        // player may already be gone — nothing to do
      }
    }
  })

  renderState()
  refreshActionLabels()
}
