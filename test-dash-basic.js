// Test script to verify romDash works without stamina system
// This tests the basic dash functionality

app.configure([
  {
    key: 'rName',
    type: 'text',
    label: 'Rom Name',
  },
  {
    key: 'color',
    type: 'dropdown',
    label: 'Color',
    options: [
      { label: 'Red', value: 'red' },
      { label: 'Orange', value: 'orange' },
      { label: 'Yellow', value: 'yellow' },
      { label: 'Green', value: 'green' },
      { label: 'Blue', value: 'blue' },
    ],
    initial: 'red',
  },
  {
    key: 'chargeEmote',
    type: 'file',
    kind: 'emote',
    label: 'Charge Emote',
  },
  {
    key: 'dashKey',
    type: 'switch',
    label: 'Dash Key',
    initial: 'keyF',
    options: [
      { label: 'F', value: 'keyF' },
      { label: 'E', value: 'keyE' },
      { label: 'Q', value: 'keyQ' },
      { label: 'R', value: 'keyR' },
      { label: 'Space', value: 'space' },
    ],
  },
  {
    key: 'showMobileButton',
    type: 'toggle',
    label: 'Show Mobile Dash Button',
    initial: true,
  },
  {
    key: 'staminaCost',
    type: 'number',
    label: 'Stamina Cost',
    hint: 'Amount of stamina consumed per dash',
    initial: 30,
    min: 0,
    max: 100,
  },
  {
    key: 'debugMode',
    type: 'toggle',
    label: 'Debug Mode',
    initial: true,
    hint: 'Enable console debugging'
  },
])

const FORWARD = new Vector3(0, 0, -1)
const chargeEmote = props.chargeEmote?.url ? props.chargeEmote.url + '?l=0' : ''
const v1 = new Vector3()
const q1 = new Quaternion()
const e1 = new Euler(0, 0, 0, 'YXZ')

// Debug logging utility
function debugLog(...args) {
  if (config.debugMode) {
    console.log('[Dash ROM TEST]', ...args)
  }
}

debugLog('=== DASH ROM TEST (No Stamina) ===')
debugLog('Initializing with dash key:', config.dashKey || 'keyF')

if (world.isClient) {
  const player = world.getPlayer()
  const control = app.control()
  let canDash = true
  let lastPressed = false
  const dashKey = config.dashKey || 'keyF'

  debugLog('Player:', player)
  debugLog('Control:', control)
  debugLog('Dash key config:', dashKey)

  if (control?.[dashKey]) {
    control[dashKey].capture = true
    debugLog('✓ Captured', dashKey, 'for dash')
  } else {
    debugLog('✗ WARNING: Could not capture', dashKey)
    debugLog('Available control keys:', Object.keys(control || {}))
  }

  function getDirection() {
    e1.setFromQuaternion(control.camera.quaternion)
    e1.x = 0
    e1.z = 0
    q1.setFromEuler(e1)
    const dir = v1.copy(FORWARD).applyQuaternion(q1)
    return dir
  }

  function charge() {
    debugLog('charge() called - canDash:', canDash, 'hasEffect:', player.hasEffect())

    if (player.hasEffect()) {
      debugLog('✗ Cannot dash - player has effect')
      return
    }
    if (!canDash) {
      debugLog('✗ Cannot dash - already dashing')
      return
    }

    const staminaCost = config.staminaCost || 30
    debugLog('Attempting dash with cost:', staminaCost)

    canDash = false

    debugLog('✓ Dash activated!')
    const dir = getDirection()
    const force = dir.multiplyScalar(30)
    debugLog('Applying force:', force)
    player.push(force)

    if (chargeEmote) {
      player.applyEffect({
        emote: chargeEmote,
        turn: true,
        duration: 0.4,
        onEnd: () => {
          debugLog('Dash effect ended')
          canDash = true
        },
      })
    } else {
      debugLog('No emote configured')
      setTimeout(() => {
        canDash = true
      }, 400)
    }
  }

  app.on('update', delta => {
    const isPressed = control?.[dashKey]?.pressed || false

    if (isPressed && !lastPressed) {
      debugLog('Key pressed - triggering dash')
      charge()
    }

    lastPressed = isPressed
  })

  if (config.showMobileButton) {
    debugLog('Creating mobile button')
    const dashBtn = app.create('ui', {
      space: 'screen',
      width: 50,
      height: 50,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: 25,
      pivot: 'top-right',
      position: [1, 1],
      offset: [-120, -110],
      cursor: 'pointer',
      onPointerDown: () => {
        debugLog('Mobile button pressed')
        charge()
      },
      alignItems: 'center',
      justifyContent: 'center',
    })
    const label = app.create('uitext', {
      value: 'DASH',
      color: 'white',
      fontSize: 10,
      fontWeight: 'bold',
    })
    dashBtn.add(label)
    app.add(dashBtn)
    debugLog('✓ Mobile button created')
  }
}

// ROM visual
const ui = app.create('ui')
ui.rotation.y = 180 * DEG2RAD
ui.position.z = -0.12
ui.position.y = -0.46
ui.width = 20
const romName = app.create('uitext')
romName.fontSize = 4
romName.textAlign = 'center'
romName.color = '#000000'
romName.value = props.rName || 'Test Dash'
romName.backgroundColor = '#ffffff'
romName.fontFamily = 'Arial Black'
const mesh = app.get('RomColor')
if (mesh) {
  mesh.linked = false
  app.on('update', () => {
    if (mesh.material) {
      mesh.material.color = props.color || 'red'
    }
  })
}
ui.add(romName)
app.add(ui)

// Add kinematic rigidbody
debugLog('Adding rigidbody for collision detection')
const romBody = app.create('rigidbody', {
  type: 'kinematic',
  trigger: true,
})
app.add(romBody)

debugLog('=== TEST SCRIPT LOADED ===')