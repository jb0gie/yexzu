app.configure([
  {
    type: 'section',
    label: 'Mobile Control Buttons'
  },
  {
    type: 'text',
    key: 'secondaryKey',
    label: 'Secondary Button Key',
    initial: 'keyControl',
    hint: 'Key to simulate (e.g., keyV, keyF, keyE, keySpace)'
  }
])

console.log('[SimpleControls] INIT - world.isServer:', !!world.isServer)

let buttonsCreated = false

// Initialize on first update to ensure client-side execution
app.on('update', (delta) => {
  // Only create UI on client where controls and UI systems are available
  if (!buttonsCreated && world.controls && app.control) {
    buttonsCreated = true
    console.log('[SimpleControls] Creating 2 buttons on CLIENT - controls available!')

    // Mappable secondary button - right side
    const btnSecondary = app.create('ui', {
      space: 'screen',
      position: [0.80, 0.45, 0], // Right side
      width: 45,
      height: 45,
      backgroundColor: 'rgba(0, 0, 0, 0.3)', // Native Hyperfy style
      borderRadius: 22,
      text: '⚡',
      fontSize: 16,
      color: 'white' // Native white text
    })
    app.add(btnSecondary)

    // Secondary button functionality - use setTouchBtn like CoreUI for mobile compatibility
    btnSecondary.on('pointerDown', () => {
      if (world.controls) {
        // Use configurable key - defaults to Control key for secondary actions
        const keyToSimulate = app.props.secondaryKey || 'keyControl'
        world.controls.setTouchBtn(keyToSimulate, true)
        setTimeout(() => world.controls.setTouchBtn(keyToSimulate, false), 100)
        console.log('[SimpleControls] Secondary button pressed:', keyToSimulate)
      }
    })

    btnSecondary.on('pointerUp', () => {
      if (world.controls) {
        const keyToSimulate = app.props.secondaryKey || 'keyControl'
        world.controls.setTouchBtn(keyToSimulate, false)
      }
    })

    // Camera zoom button - bottom left-center
    const btnZoom = app.create('ui', {
      space: 'screen',
      position: [0.65, 0.85, 0],
      width: 40,
      height: 30,
      backgroundColor: 'rgba(0, 0, 0, 0.3)', // Native Hyperfy style
      borderRadius: 15,
      text: '🔍',
      fontSize: 12,
      color: 'white' // Native white text
    })
    app.add(btnZoom)

    // Camera zoom button functionality - real working camera control
    btnZoom.on('pointerDown', () => {
      try {
        const control = app.control()
        if (control) {
          // Take permission for camera control
          control.camera.write = true

          // Cycle through zoom levels like CoreUI: Medium 3rd → Close 3rd → First Person → Far 3rd
          const zoomLevels = [5.0, 1.0, 0, 7.0]  // From CoreUI camera system
          const currentZoom = control.camera.zoom || zoomLevels[0]
          const currentIndex = zoomLevels.indexOf(currentZoom)
          const nextIndex = (currentIndex + 1) % zoomLevels.length
          control.camera.zoom = zoomLevels[nextIndex]

          console.log('[SimpleControls] Camera zoom:', control.camera.zoom)
        }
      } catch (err) {
        console.warn('[SimpleControls] Camera zoom failed:', err)
      }
    })

    console.log('[SimpleControls] 2 buttons added to scene!')
  }
})