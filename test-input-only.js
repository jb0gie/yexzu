// Minimal test to verify input works

app.configure([
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
    key: 'debugMode',
    type: 'toggle',
    label: 'Debug Mode',
    initial: true,
  },
])

function debugLog(...args) {
  if (config.debugMode) {
    console.log('[INPUT TEST]', ...args)
  }
}

debugLog('=== INPUT TEST ===')

if (world.isClient) {
  const control = app.control()
  const dashKey = config.dashKey || 'keyF'
  let lastPressed = false

  debugLog('Control object:', control)
  debugLog('Dash key:', dashKey)

  if (!control) {
    debugLog('✗ ERROR: Control is undefined!')
    debugLog('This means app.control() returned nothing')
  } else {
    debugLog('✓ Control is available')
    debugLog('Available keys:', Object.keys(control).filter(k => k.startsWith('key') || k === 'space'))

    if (control[dashKey]) {
      control[dashKey].capture = true
      debugLog('✓ Captured key:', dashKey)
      debugLog('Key object:', control[dashKey])
    } else {
      debugLog('✗ Key not found:', dashKey)
    }
  }

  let frameCount = 0
  app.on('update', delta => {
    frameCount++

    if (frameCount % 60 === 0) { // Log every second (assuming 60fps)
      debugLog('Update running - frame:', frameCount)
      if (control) {
        debugLog('Key state - pressed:', control[dashKey]?.pressed || false)
      }
    }

    if (!control) return

    const isPressed = control[dashKey]?.pressed || false

    if (isPressed && !lastPressed) {
      debugLog('=====================================')
      debugLog('KEY PRESS DETECTED!', dashKey)
      debugLog('=====================================')
      world.chat('Dash key pressed!', true)
    }

    lastPressed = isPressed
  })

  debugLog('Test script loaded - press', dashKey.toUpperCase(), 'to test')
}
