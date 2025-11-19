app.configure([
  {
    type: 'section',
    label: 'Universal Mobile Controls'
  },
  {
    type: 'toggle',
    key: 'enabled',
    label: 'Enable Universal Mobile Controls',
    initial: true
  },
  {
    type: 'section',
    label: 'Signal Configuration'
  },
  {
    key: 'mobileSignalName',
    type: 'text',
    label: 'Mobile Signal Name',
    initial: 'mobileButton',
    hint: 'Signal to emit when mobile button pressed'
  },
  {
    type: 'section',
    label: 'Joystick Bridge'
  },
  {
    type: 'toggle',
    key: 'bridgeJoystick',
    label: 'Bridge Touch Joystick to Control Keys',
    initial: true,
    hint: 'Allows vehicles and games to work with touch'
  },
  {
    type: 'number',
    key: 'deadZone',
    label: 'Joystick Dead Zone',
    initial: 20,
    min: 0,
    max: 50,
    hint: 'Prevents drift, higher = less sensitive'
  },
  {
    type: 'section',
    label: 'Action Button Mappings'
  },
  {
    key: 'xButton',
    type: 'switch',
    label: 'X Button Action',
    initial: 'mouseLeft',
    options: [
      { value: 'mouseLeft', label: 'Fire/Attack (Left Click)' },
      { value: 'mouseRight', label: 'Aim (Right Click)' },
      { value: 'space', label: 'Jump/Handbrake (Space)' },
      { value: 'keyE', label: 'Interact (E)' },
      { value: 'keyR', label: 'Reload (R)' },
      { value: 'keyF', label: 'Use/Action (F)' },
      { value: 'shiftLeft', label: 'Boost/Sprint (Shift)' },
      { value: 'keyQ', label: 'Drop/Secondary (Q)' }
    ]
  },
  {
    key: 'yButton',
    type: 'switch',
    label: 'Y Button Action',
    initial: 'keyR',
    options: [
      { value: 'mouseLeft', label: 'Fire/Attack (Left Click)' },
      { value: 'mouseRight', label: 'Aim (Right Click)' },
      { value: 'space', label: 'Jump/Handbrake (Space)' },
      { value: 'keyE', label: 'Interact (E)' },
      { value: 'keyR', label: 'Reload (R)' },
      { value: 'keyF', label: 'Use/Action (F)' },
      { value: 'shiftLeft', label: 'Boost/Sprint (Shift)' },
      { value: 'keyQ', label: 'Drop/Secondary (Q)' }
    ]
  },
  {
    type: 'section',
    label: 'Mobile UI'
  },
  {
    type: 'number',
    key: 'buttonSize',
    label: 'Button Size',
    initial: 60,
    min: 40,
    max: 100
  },
  {
    type: 'number',
    key: 'buttonSpacing',
    label: 'Button Spacing',
    initial: 10,
    min: 0,
    max: 50
  },
  {
    type: 'toggle',
    key: 'showLabels',
    label: 'Show Action Labels',
    initial: true,
    hint: 'Show what each button does'
  },
  {
    type: 'toggle',
    key: 'showButtons',
    label: 'Show Action Buttons',
    initial: true,
    hint: 'Show X/Y action buttons on screen'
  }
])

console.log('[UniversalMobileControls] Initializing')

let lastStick = null
let joyControl = null
let btnX = null
let btnY = null

function createButton(label, actionKey, offsetX, offsetY) {
  const btn = app.create('ui', {
    space: 'screen',
    width: 50,
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 25,
    pivot: 'bottom-right',
    position: [1, 1],
    offset: [offsetX, offsetY],
    cursor: 'pointer',
    onPointerDown: () => triggerAction(actionKey),
    alignItems: 'center',
    justifyContent: 'center',
  })

  const text = app.create('uitext', {
    value: config.showLabels ? getActionLabel(actionKey) : label,
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold'
  })
  btn.add(text)
  app.add(btn)

  return btn
}

function getActionLabel(actionKey) {
  const labels = {
    mouseLeft: 'FIRE',
    mouseRight: 'AIM',
    space: 'JUMP',
    keyE: 'INTERACT',
    keyR: 'RELOAD',
    keyF: 'USE',
    shiftLeft: 'BOOST',
    keyQ: 'DROP'
  }
  return labels[actionKey] || 'ACTION'
}

function triggerAction(actionKey) {
  const player = world.getPlayer()
  const timestamp = Date.now()
  const signalName = config.mobileSignalName || 'mobileButton'

  console.log(`[UniversalMobileControls] Emitting signal '${signalName}': ${actionKey}`)

  world.emit(signalName, {
    button: actionKey,
    player: player,
    timestamp: timestamp
  })
}

function bridgeTouchJoystick() {
  if (!config.bridgeJoystick || !joyControl) {
    return
  }

  if (lastStick && lastStick.active) {
    const touchX = lastStick.touch.position.x
    const touchY = lastStick.touch.position.y
    const centerX = lastStick.center.x
    const centerY = lastStick.center.y

    const dx = touchX - centerX
    const dy = touchY - centerY
    const deadZone = config.deadZone || 20

    joyControl.keyW.down = dy < -deadZone
    joyControl.keyS.down = dy > deadZone
    joyControl.keyA.down = dx < -deadZone
    joyControl.keyD.down = dx > deadZone
  } else {
    if (joyControl.keyW) joyControl.keyW.down = false
    if (joyControl.keyS) joyControl.keyS.down = false
    if (joyControl.keyA) joyControl.keyA.down = false
    if (joyControl.keyD) joyControl.keyD.down = false
  }
}

function setupMobileControls() {
  if (!config.showButtons) {
    console.log('[UniversalMobileControls] Action buttons disabled')
    return
  }

  console.log('[UniversalMobileControls] Creating action buttons')

  const size = 50
  const spacing = 10
  const baseOffset = 100  // Distance from right edge
  const offsetX = -(size + spacing + baseOffset)
  const offsetY = -120

  btnX = createButton('X', config.xButton, offsetX, offsetY)
  btnY = createButton('Y', config.yButton, offsetX - (size + spacing), offsetY)

  console.log('[UniversalMobileControls] Action buttons created')
}

if (world.isClient) {
  joyControl = app.control()
}

app.on('update', (delta) => {
  if (!config.enabled) return

  if (joyControl) {
    bridgeTouchJoystick()
  }
})

let initDelay = 0
app.on('update', (delta) => {
  initDelay++
  if (initDelay === 30 && config.enabled && world.isClient) {
    setupMobileControls()
  }
})

world.on('stick', (stick) => {
  lastStick = stick
})

console.log('[UniversalMobileControls] Ready - Touch joystick bridge and action buttons configured')