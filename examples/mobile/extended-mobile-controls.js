app.configure([
  { type: 'section', label: 'Extended Mobile Controls' },
  {
    type: 'toggle',
    key: 'enabled',
    label: 'Enable Extended Controls',
    initial: true
  },
  {
    type: 'section',
    label: 'Button Mappings'
  },
  {
    type: 'text',
    key: 'keyA',
    label: 'A Button Key',
    initial: 'keySpace'
  },
  {
    type: 'text',
    key: 'keyB',
    label: 'B Button Key',
    initial: 'keyE'
  },
  {
    type: 'text',
    key: 'keyX',
    label: 'X Button Key',
    initial: 'keyR'
  },
  {
    type: 'text',
    key: 'keyY',
    label: 'Y Button Key',
    initial: 'keyF'
  }
])

console.log('[ExtendedMobileControls] INITIALIZING - NEW VERSION')

let buttons = {}

// Touch detection using available browser APIs in HyperScript sandbox
function isTouchDevice() {
  try {
    return (
      typeof ontouchstart !== 'undefined' &&
      navigator && navigator.maxTouchPoints > 0 &&
      window.matchMedia('(pointer: coarse)').matches
    )
  } catch (e) {
    return false
  }
}

// Initialize after a brief delay to ensure world is ready
let initWaitTime = 0
app.on('update', (delta) => {
  initWaitTime++

  if (initWaitTime === 30) { // Wait ~0.5 seconds
    console.log('[ExtendedMobileControls] Creating extended mobile UI')
    createExtendedControls()
  }
})

function createExtendedControls() {
  if (!app.props.enabled) return

  console.log('[ExtendedMobileControls] Creating 4-button mappable controls - FORCED')

  try {
    // Create 4 gamepad-style buttons (A, B, X, Y layout)

    // A button (bottom right - green)
    buttons.a = app.create('ui', {
      space: 'screen',
      position: [0.85, 0.45, 0],
      width: 60,
      height: 60,
      backgroundColor: 'rgba(0, 255, 0, 0.6)',
      borderColor: 'rgba(0, 255, 0, 0.8)',
      borderRadius: 50,
      transparent: true,
      pointerEvents: true,
      text: 'A',
      fontSize: 20,
      fontWeight: 'bold'
    })

    buttons.a.on('pointerDown', () => {
      try {
        if (world.controls && world.controls.simulateButton) {
          world.controls.simulateButton(app.props.keyA || 'keySpace', true)
          setTimeout(() => world.controls.simulateButton(app.props.keyA || 'keySpace', false), 100)
        }
      } catch (err) {
        console.warn('[ExtendedMobileControls] Failed to trigger A button:', err)
      }
    })

    // B button (bottom right - red)
    buttons.b = app.create('ui', {
      space: 'screen',
      position: [0.78, 0.38, 0],
      width: 60,
      height: 60,
      backgroundColor: 'rgba(255, 0, 0, 0.6)',
      borderColor: 'rgba(255, 0, 0, 0.8)',
      borderRadius: 50,
      transparent: true,
      pointerEvents: true,
      text: 'B',
      fontSize: 20,
      fontWeight: 'bold'
    })

    buttons.b.on('pointerDown', () => {
      try {
        if (world.controls && world.controls.simulateButton) {
          world.controls.simulateButton(app.props.keyB || 'keyE', true)
          setTimeout(() => world.controls.simulateButton(app.props.keyB || 'keyE', false), 100)
        }
      } catch (err) {
        console.warn('[ExtendedMobileControls] Failed to trigger B button:', err)
      }
    })

    // X button (top left - blue)
    buttons.x = app.create('ui', {
      space: 'screen',
      position: [0.78, 0.52, 0],
      width: 60,
      height: 60,
      backgroundColor: 'rgba(0, 100, 255, 0.6)',
      borderColor: 'rgba(0, 100, 255, 0.8)',
      borderRadius: 50,
      transparent: true,
      pointerEvents: true,
      text: 'X',
      fontSize: 20,
      fontWeight: 'bold'
    })

    buttons.x.on('pointerDown', () => {
      try {
        if (world.controls && world.controls.simulateButton) {
          world.controls.simulateButton(app.props.keyX || 'keyR', true)
          setTimeout(() => world.controls.simulateButton(app.props.keyX || 'keyR', false), 100)
        }
      } catch (err) {
        console.warn('[ExtendedMobileControls] Failed to trigger X button:', err)
      }
    })

    // Y button (top left - yellow)
    buttons.y = app.create('ui', {
      space: 'screen',
      position: [0.71, 0.45, 0],
      width: 60,
      height: 60,
      backgroundColor: 'rgba(255, 255, 0, 0.6)',
      borderColor: 'rgba(255, 255, 0, 0.8)',
      borderRadius: 50,
      transparent: true,
      pointerEvents: true,
      text: 'Y',
      fontSize: 20,
      fontWeight: 'bold'
    })

    buttons.y.on('pointerDown', () => {
      try {
        if (world.controls && world.controls.simulateButton) {
          world.controls.simulateButton(app.props.keyY || 'keyF', true)
          setTimeout(() => world.controls.simulateButton(app.props.keyY || 'keyF', false), 100)
        }
      } catch (err) {
        console.warn('[ExtendedMobileControls] Failed to trigger Y button:', err)
      }
    })

    console.log('[ExtendedMobileControls] 4-button mappable controls created successfully!')

  } catch (e) {
    console.error('[ExtendedMobileControls] Failed to create extended controls:', e)
  }
}



// Handle configuration changes
app.on('change', () => {
  console.log('[ExtendedMobileControls] Configuration changed, recreating extended UI')
  // Clear button references - UI nodes will be cleaned up automatically
  buttons = {}

  // Recreate with new settings
  initWaitTime = 0 // Reset init timer
})

// Cleanup
app.on('destroy', () => {
  console.log('[ExtendedMobileControls] Cleaning up')
  // Clear button references - UI nodes will be cleaned up automatically
  buttons = {}
})

console.log('[ExtendedMobileControls] Extended mobile controls script loaded successfully')