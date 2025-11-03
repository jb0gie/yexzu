({
  name: 'Strafe Flip Integration Demo',
  version: '1.0.0',

  configure: [
    { type: 'section', label: '🎯 Strafe Flip Integration Demo' },
    {
      type: 'toggle',
      key: 'enabled',
      label: 'Enable Strafe Flip Demo',
      initial: true
    },
    {
      type: 'select',
      key: 'demoMode',
      label: 'Demo Mode',
      options: ['auto-play', 'manual-triggers', 'keyboard-controls', 'controller-gesture'],
      initial: 'manual-triggers'
    },
    {
      type: 'toggle',
      key: 'showInstructions',
      label: 'Show On-Screen Instructions',
      initial: true
    },
    {
      type: 'toggle',
      key: 'showDebug',
      label: 'Show Strafe Detection Debug',
      initial: false
    }
  ])

  console.log('[StrafeFlipDemo] Comprehensive strafe-flip integration demo starting...')

  // Demo state
  let demoState = {
    enabled: app.props.enabled,
    mode: app.props.demoMode,
    showInstructions: app.props.showInstructions,
    showDebug: app.props.showDebug,
    instructionsUI: null,
    debugLabels: [],
    lastTrigger: 0,
    triggerCount: { left: 0, right: 0, forward: 0, back: 0 }
  }

  // Quick strafe detection function
  function detectStrafeQuick(player) {
    if (!player || !player.axis) return null

    const axis = player.axis || { x: 0, z: 0 }
    if (Math.abs(axis.x) < 0.1) return null

    let strafeDeg = Math.atan2(axis.x, -axis.z) * (180 / Math.PI)
    if (strafeDeg < 0) strafeDeg += 360

    if (strafeDeg >= 247.5 && strafeDeg <= 292.5) return 'left'
    if (strafeDeg >= 67.5 && strafeDeg <= 112.5) return 'right'

    return null
  }

  // Execute strafe flip with enhanced physics
  function executeDemoStrafeFlip(direction, manualTrigger = true) {
    if (!app.props.enabled) return

    const now = Date.now()
    if (now - demoState.lastTrigger < 600) return

    const player = world.entities.player
    if (!player) return

    console.log(`[StrafeFlipDemo] Triggering ${direction} strafe flip`)

    // Strafe-specific physics
    const strafePhysics = {
      left: { up: 22, lateral: 16, timing: 120 },
      right: { up: 22, lateral: -16, timing: 120 }
    }

    const physics = strafePhysics[direction]

    // Apply lateral forces
    const upForce = new Vector3(0, physics.up, 0)
    const lateralForce = new Vector3(physics.lateral, physics.lateral * 0.25, 0)
    const totalForce = upForce.add(lateralForce)

    setTimeout(() => {
      player.push(totalForce)
      createStrafeEffect(player.position, direction)
    }, 40)

    // [TEMPORARY] Using existing emotes until strafe animations are created
    // TODO: Replace with actual strafe animations when ready
    setTimeout(() => {
      player.applyEffect({
        emote: direction === 'left' ? 'asset://emote-flip.glb?s=1.2&l=0' : 'asset://emote-flip.glb?s=1.2&l=0',
        duration: 1.0,
        cancellable: false
      })

      demoState.triggerCount[direction]++
      updateDebugDisplay()

      console.log(`[StrafeFlipDemo] ${direction} strafe flip executed (total: ${demoState.triggerCount[direction]})`)
    }, physics.timing)

    demoState.lastTrigger = now
  }

  // Enhanced strafe effects
  function createStrafeEffect(position, direction) {
    if (!position) return

    const basePos = position.toArray ? position.toArray() : position
    const colorDirection = direction === 'left' ?
      [0.2, 0.5, 1, 0.9] : [1, 0.3, 0.2, 0.9]

    const particles = app.create('particles', {
      position: basePos,
      particleCount: 25,
      color: colorDirection,
      size: 0.12,
      velocity: 12,
      lifespan: 1.0,
      gravity: -5,
      spread: 2.5
    })

    setTimeout(() => {
      if (particles) particles.remove()
    }, 1200)
  }

  // Create instructions display
  function createInstructionsDisplay() {
    if (!app.props.showInstructions) return

    demoState.instructionsUI = app.create('ui', {
      position: [0, 0, 0],
      width: 'auto',
      height: 'auto',
      style: {
        position: 'absolute',
        top: '20px',
        left: '20px',
        padding: '15px',
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '10px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 1000,
        maxWidth: '300px'
      }
    })

    updateInstructionsDisplay()

    // Auto-update every 2 seconds
    setInterval(updateInstructionsDisplay, 2000)
  }

  function updateInstructionsDisplay() {
    const player = world.entities.player
    const strafeDirection = player ? detectStrafeQuick(player) : null

    let instructions = '🚀 STRAFE FLIP DEMO\n\n'
    instructions += `Mode: ${app.props.demoMode}\n`

    if (strafeDirection) {
      instructions += `🎯 Strafing: ${strafeDirection.toUpperCase()}\n`
    } else {
      instructions += `❌ Not strafing\n`
    }

    instructions += `\nControls:\n• Q = Left Strafe Flip\n• E = Right Strafe Flip\n• Tap = Forward Flip\n• Swipe Down = Backflip\n\n`

    instructions += `Counts: L:${demoState.triggerCount.left} R:${demoState.triggerCount.right} F:${demoState.triggerCount.forward} B:${demoState.triggerCount.back}`

    if (demoState.instructionsUI) {
      demoState.instructionsUI.text = instructions
    }
  }

  // Manual trigger controls
  function setupManualTriggers() {
    if (app.props.demoMode !== 'manual-triggers') return

    const control = app.control()
    if (!control) return

    // Strafe flip triggers
    control.keyQ.capture = true
    control.keyE.capture = true

    control.keyQ.onPress = () => executeDemoStrafeFlip('left', true)
    control.keyE.onPress = () => executeDemoStrafeFlip('right', true)

    // Regular flips for comparison
    control.keyF.capture = true  // Forward
    control.keyB.capture = true  // Backflip

    control.keyF.onPress = () => {
      const player = world.entities.player
      if (player) {
        player.push(new Vector3(0, 18, -10))
        player.applyEffect({
          emote: 'asset://emote-flip.glb?s=1.3&l=0',
          duration: 1.1,
          cancellable: false
        })
        demoState.triggerCount.forward++
        updateDebugDisplay()
      }
    }

    control.keyB.onPress = () => {
      const player = world.entities.player
      if (player) {
        player.push(new Vector3(0, 18, 8))  // Backward force
        player.applyEffect({
          emote: 'asset://emote-backflip.glb?s=2.2&l=0',
          duration: 2.2,
          cancellable: false
        })
        demoState.triggerCount.back++
        updateDebugDisplay()
      }
    }
  }

  // Auto-play mode with scheduled demonstrations
  function setupAutoPlay() {
    if (app.props.demoMode !== 'auto-play') return

    let autoPhase = 0
    setInterval(() => {
      const demos = [
        () => executeDemoStrafeFlip('left'),
        () => executeDemoStrafeFlip('right'),
        () => {
          const player = world.entities.player
          if (player) {
            player.push(new Vector3(0, 18, -10))
            player.applyEffect({
              emote: 'asset://emote-flip.glb?s=1.3&l=0',
              duration: 1.1,
              cancellable: false
            })
          }
        },
        () => {
          const player = world.entities.player
          if (player) {
            player.push(new Vector3(0, 18, 8))
            player.applyEffect({
              emote: 'asset://emote-backflip.glb?s=2.2&l=0',
              duration: 2.2,
              cancellable: false
            })
          }
        }
      ]

      if (autoPhase < demos.length) {
        demos[autoPhase]()
        autoPhase = (autoPhase + 1) % demos.length
      }
    }, 3000)
  }

  // Controller gesture mode for VR
  function setupControllerGestures() {
    if (app.props.demoMode !== 'controller-gesture') return
    if (!world.isXR) return

    app.on('update', (delta) => {
      const control = app.control()
      if (!control) return

      // Left grip + joystick left = left strafe flip
      if (control.xrLeftGrip && control.xrLeftGrip.pressed && control.xrLeftStick) {
        if (control.xrLeftStick.value.x < -0.5) {
          executeDemoStrafeFlip('left', 'vr-gesture')
        }
      }

      // Right grip + joystick right = right strafe flip
      if (control.xrRightGrip && control.xrRightGrip.pressed && control.xrRightStick) {
        if (control.xrRightStick.value.x > 0.5) {
          executeDemoStrafeFlip('right', 'vr-gesture')
        }
      }
    })
  }

  // Debug display
  function updateDebugDisplay() {
    if (!app.props.showDebug) return

    const player = world.entities.player
    if (!player) return

    // Clean up old debug labels
    demoState.debugLabels.forEach(label => {
      if (label && label.remove) label.remove()
    })
    demoState.debugLabels = []

    const strafeDirection = detectStrafeQuick(player)

    const debugText = app.create('ui', {
      position: [0, 0, 0],
      width: 'auto',
      height: 'auto',
      style: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        padding: '10px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '5px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '11px',
        zIndex: 999
      },
      text: `${strafeDirection ? strafeDirection.toUpperCase() : 'STRAIGHT'}\n${JSON.stringify(demoState.triggerCount, null, 2)}`
    })

    demoState.debugLabels.push(debugText)

    setTimeout(() => debugText.remove(), 1500)
  }

  // Tap detection mode
  function setupTapDetect() {
    if (app.props.demoMode !== 'tap-detect') return

    const touchArea = world.viewport || document.body
    if (!touchArea) return

    touchArea.addEventListener('touchend', (e) => {
      if (!strafeDirection) return // Only respond during strafing

      const strafeDirection = detectStrafeQuick(world.entities.player)
      if (strafeDirection) {
        executeDemoStrafeFlip(strafeDirection, 'tap-detect')
      }
    })
  }

  // Main initialization
  function initializeDemo() {
    if (!app.props.enabled) {
      console.log('[StrafeFlipDemo] Demo disabled in configuration')
      return
    }

    console.log(`[StrafeFlipDemo] Starting ${app.props.demoMode} demonstration`)

    createInstructionsDisplay()
    updateDebugDisplay()

    // Setup specific demo mode
    try {
      setupManualTriggers()
      setupAutoPlay()
      setupControllerGestures()
      setupTapDetect()
    } catch (error) {
      console.error('[StrafeFlipDemo] Setup error:', error)
    }

    console.log('[StrafeFlipDemo] Strafe flip integration demo initialized successfully!')
  }

  // Initialize with slight delay
  let initTimer = 0
  app.on('update', (delta) => {
    initTimer++
    if (initTimer === 20) {
      initializeDemo()
    }
  })

  // Handle configuration changes
  app.on('change', () => {
    console.log('[StrafeFlipDemo] Configuration changed, updating demo')

    // Cleanup
    if (demoState.instructionsUI) {
      demoState.instructionsUI.remove()
    }

    // Update state
    demoState.showInstructions = app.props.showInstructions
    demoState.showDebug = app.props.showDebug
    demoState.mode = app.props.demoMode

    // Reinit
    setTimeout(initializeDemo, 200)
  })

  // Cleanup like other examples
  app.on('destroy', () => {
    console.log('[StrafeFlipDemo] Cleanup started')

    // Remove instructions
    if (demoState.instructionsUI) {
      demoState.instructionsUI.remove()
    }

    // Cleanup debug
    demoState.debugLabels.forEach(label => label.remove())

    // Remove event listeners
    if (app.props.demoMode === 'tap-detect') {
      const touchArea = world.viewport || document.body
      if (touchArea) touchArea.removeEventListener('touchend', () => {})
    }

    console.log('[StrafeFlipDemo] Cleanup completed')
  })

  console.log('[StrafeFlipDemo] Strafe flip integration demo loaded and ready!')
})