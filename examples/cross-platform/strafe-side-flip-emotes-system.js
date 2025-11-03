({
  name: 'Strafe Side Flip Emotes System',
  version: '1.0.0',

  configure: [
    { type: 'section', label: '🚀 Strafe Side Flip System' },
    {
      type: 'toggle',
      key: 'enabled',
      label: 'Enable Strafe Side Flips',
      initial: true
    },
    {
      type: 'select',
      key: 'sideFlipTrigger',
      label: 'Side Flip Trigger',
      options: ['manual', 'strafe-detect', 'strafe-jump', 'controller-gesture'],
      initial: 'strafe-jump'
    },
    {
      type: 'slider',
      key: 'strafeThreshold',
      label: 'Strafe Detection Threshold (°)',
      min: 45,
      max: 135,
      step: 15,
      initial: 90
    },
    {
      type: 'select',
      key: 'physicsPreset',
      label: 'Side Flip Physics',
      options: ['casual', 'athletic', 'ninja', 'hyper', 'moon'],
      initial: 'athletic'
    },
    {
      type: 'toggle',
      key: 'autoDetect',
      label: 'Auto-Detect Strafe Direction',
      initial: true
    },
    {
      type: 'toggle',
      key: 'effects',
      label: 'Side Flip Particles',
      initial: true
    }
  ])

  console.log('[StrafeSideFlipEmotes] Strafe-based side flip emote system initializing...')

  // Strafe flip state
  let strafeState = {
    lastStrafe: 0,
    strafeDirection: null,
    currentPreset: app.props.physicsPreset,
    autoDetect: app.props.autoDetect,
    threshold: app.props.strafeThreshold
  }

  // Enhanced physics for side flips
  const strafeFlipPhysics = {
    casual: { up: 16, lateral: 12, timing: 160 },    // Casual lateral jump
    athletic: { up: 22, lateral: 16, timing: 120 }, // Realistic athlete
    ninja: { up: 28, lateral: 22, timing: 90 },     // Action hero
    hyper: { up: 35, lateral: 28, timing: 70 },     // Superhuman
    moon: { up: 10, lateral: 8, timing: 200 }       // Low gravity
  }

  // [TEMPORARY] Using existing flip emotes until animations are ready
  // TODO: Replace with actual strafe animations when created
  const strafeEmotes = {
    left: { emote: 'asset://emote-flip.glb?s=1.3&l=0', duration: 1.0, name: 'Strafe Left Flip (temp)' },
    right: { emote: 'asset://emote-flip.glb?s=1.3&l=0', duration: 1.0, name: 'Strafe Right Flip (temp)' }
  }

  // Strafe detection function
  function detectStrafeDirection(player) {
    if (!player || !player.position) return null

    // Get movement direction from existing axis system
    const axis = player.axis || { x: 0, z: 0 }

    // Calculate movement angle in degrees (0° = forward)
    let moveDeg = Math.atan2(axis.x, -axis.z) * (180 / Math.PI)
    if (moveDeg < 0) moveDeg += 360

    // Enhanced strafe detection zones (30° each direction for precise control)
    const leftStrafeZone = [247.5, 292.5]  // Left ±22.5° from 270°
    const rightStrafeZone = [67.5, 112.5]  // Right ±22.5° from 90°

    // Check strafe zones with configurable threshold
    const threshold = strafeState.threshold

    if (moveDeg >= leftStrafeZone[0] && moveDeg <= leftStrafeZone[1]) {
      return 'left'
    } else if (moveDeg >= rightStrafeZone[0] && moveDeg <= rightStrafeZone[1]) {
      return 'right'
    }

    return null
  }

  // Execute strafe-based flip
  function executeStrafeFlip(direction, triggerSource = 'auto') {
    if (!app.props.enabled) return

    const now = Date.now()
    if (now - strafeState.lastStrafe < 800) return // Debounce

    const player = world.entities.player
    if (!player) return

    const flipConfig = strafeEmotes[direction]
    if (!flipConfig) return

    console.log(`[StrafeSideFlipEmotes] Executing ${flipConfig.name} (${direction})`)

    // Enhanced physics specific to strafe movement
    const physics = strafeFlipPhysics[strafeState.currentPreset]
    const strafeDeg = direction === 'left' ? 270 : 90
    const strafeQuat = new Quaternion()
    strafeQuat.setFromEuler(new Euler(0, strafeDeg * Math.PI / 180, 0, 'XZY'))

    // Calculate strafe-specific forces
    const upForce = new Vector3(0, physics.up, 0)
    const lateralForce = new Vector3(
      direction === 'left' ? -physics.lateral : physics.lateral,
      physics.lateral * 0.3,  // Small upward lateral component
      0
    ).applyQuaternion(strafeQuat)
    const totalForce = upForce.add(lateralForce)

    // Apply forces with strafe-specific timing
    setTimeout(() => {
      player.push(totalForce)
      if (app.props.effects) createStrafeFlipEffect(player.position, direction)
    }, 40)

    // Trigger strafe emote
    setTimeout(() => {
      player.applyEffect({
        emote: flipConfig.emote,
        duration: flipConfig.duration,
        cancellable: false
      })
    }, physics.timing)

    strafeState.lastStrafe = now
    strafeState.strafeDirection = direction

    // Visual confirmation
    createStrafeConfirmation(player.position, direction)
    console.log(`[StrafeSideFlipEmotes] ${flipConfig.name} completed!`)
  }

  // Create strafe-specific particle effects
  function createStrafeFlipEffect(position, direction) {
    if (!position) return

    const basePos = position.toArray ? position.toArray() : position
    const sideColor = direction === 'left' ?
      [0.2, 0.5, 1, 0.9] : // Blue hue for left
      [1, 0.3, 0.2, 0.9]    // Red hue for right

    // Create directional particle burst
    const particles = app.create('particles', {
      position: basePos,
      particleCount: 25,
      color: sideColor,
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

  // Strafe confirmation effects
  function createStrafeConfirmation(position, direction) {
    if (!position) return

    const confirmation = app.create('particles', {
      position: position.toArray ? position.toArray() : position,
      particleCount: 10,
      color: direction === 'left' ? [0.3, 0.7, 1, 0.8] : [1, 0.5, 0.3, 0.8],
      size: 0.05,
      velocity: 3,
      lifespan: 0.6,
      gravity: -1,
      spread: 0.5
    })

    setTimeout(() => {
      if (confirmation) confirmation.remove()
    }, 700)
  }

  // Manual trigger controls
  function setupManualControls() {
    const control = app.control()
    if (!control) return

    if (app.props.sideFlipTrigger === 'manual') {
      // Manual keyboard triggers
      control.keyQ.capture = true  // Left strafe flip
      control.keyE.capture = true  // Right strafe flip

      control.keyQ.onPress = () => executeStrafeFlip('left', 'manual')
      control.keyE.onPress = () => executeStrafeFlip('right', 'manual')
    }
  }

  // Auto-detection for strafe-jump
  function setupAutoStrafeDetection() {
    if (!app.props.autoDetect) return

    app.on('update', (delta) => {
      const player = world.entities.player
      if (!player) return

      // Check if player is jumping and strafing
      const isJumping = player.isJumping || (player.velocity && player.velocity.y > 2)
      const strafeDirection = detectStrafeDirection(player)

      if (isJumping && strafeDirection && app.props.sideFlipTrigger === 'strafe-jump') {
        // Auto-trigger strafe flip on jump if strafing
        executeStrafeFlip(strafeDirection, 'auto-detect')
      }
    })
  }

  // Controller gesture for VR/XR
  function setupControllerGestures() {
    if (!world.isXR) return
    if (app.props.sideFlipTrigger !== 'controller-gesture') return

    app.on('update', (delta) => {
      const control = app.control()
      if (!control) return

      // Detect controller strafe gestures
      // Left: Left trigger + joystick left
      if (control.xrLeftTrigger && control.xrLeftTrigger.value > 0.8) {
        const joystickDirection = detectStrafeDirection(world.entities.player)
        if (joystickDirection === 'left') {
          executeStrafeFlip('left', 'vr-gesture')
        }
      }

      // Right: Right trigger + joystick right
      if (control.xrRightTrigger && control.xrRightTrigger.value > 0.8) {
        const joystickDirection = detectStrafeDirection(world.entities.player)
        if (joystickDirection === 'right') {
          executeStrafeFlip('right', 'vr-gesture')
        }
      }
    })
  }

  // Enhanced strafe flip interface
  function createSideFlipInterface() {
    if (!app.props.sideFlipTrigger || app.props.sideFlipTrigger === 'manual') return

    console.log('[StrafeSideFlipEmotes] Creating enhanced side flip interface')

    // Left strafe flip button
    flipButtons.strafeLeft = app.create('ui', {
      position: [-1, 0, 0],
      width: 70,
      height: 70,
      style: {
        position: 'absolute',
        bottom: '180px',
        left: '20px',
        background: 'rgba(30, 144, 255, 0.8)',
        border: '3px solid rgba(30, 144, 255, 0.9)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold',
        touchAction: 'none',
        pointerEvents: 'auto',
        boxShadow: '0 6px 16px rgba(30, 144, 255, 0.4)',
        transition: 'all 0.2s ease'
      },
      text: '🤸←'
    })

    // Right strafe flip button
    flipButtons.strafeRight = app.create('ui', {
      position: [1, 0, 0],
      width: 70,
      height: 70,
      style: {
        position: 'absolute',
        bottom: '180px',
        right: '20px',
        background: 'rgba(220, 20, 60, 0.8)',
        border: '3px solid rgba(220, 20, 60, 0.9)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold',
        touchAction: 'none',
        pointerEvents: 'auto',
        boxShadow: '0 6px 16px rgba(220, 20, 60, 0.4)',
        transition: 'all 0.2s ease'
      },
      text: '🤸→'
    })

    flipButtons.strafeLeft.element.addEventListener('touchstart', (e) => {
      e.preventDefault()
      executeStrafeFlip('left', 'button')
      animateButtonPress(flipButtons.strafeLeft, 0.8)
    })

    flipButtons.strafeRight.element.addEventListener('touchstart', (e) => {
      e.preventDefault()
      executeStrafeFlip('right', 'button')
      animateButtonPress(flipButtons.strafeRight, 0.8)
    })
  }

  // Initialize system
  function initializeSystem() {
    console.log('[StrafeSideFlipEmotes] Initializing strafe flip emote system')

    if (!app.props.enabled) {
      console.log('[StrafeSideFlipEmotes] System disabled in configuration')
      return
    }

    setupManualControls()
    setupAutoStrafeDetection()
    setupControllerGestures()
    createSideFlipInterface()

    console.log('[StrafeSideFlipEmotes] Strafe side flip system initialized successfully!')
  }

  // Wait for world ready
  let initTimer = 0
  app.on('update', (delta) => {
    initTimer++
    if (initTimer === 25) {
      initializeSystem()
    }
  })

  // Handle configuration changes
  app.on('change', () => {
    console.log('[StrafeSideFlipEmotes] Configuration changed, reinitializing')

    // Cleanup UI
    Object.values(flipButtons).forEach(btn => {
      if (btn) btn.destroy()
    })

    // Update internal state
    strafeState.currentPreset = app.props.physicsPreset
    strafeState.threshold = app.props.strafeThreshold
    strafeState.autoDetect = app.props.autoDetect

    // Reinitialize
    initTimer = 0
  })

  // Cleanup
  app.on('destroy', () => {
    console.log('[StrafeSideFlipEmotes] Cleanup started')

    // Cleanup UI
    Object.values(flipButtons).forEach(btn => {
      if (btn) btn.destroy()
    })

    // Remove event listeners
    if (eventListeners) {
      world.removeEventListener('update')
    }

    console.log('[StrafeSideFlipEmotes] Cleanup completed')
  })

  // Event listeners management
  let eventListeners = []

  console.log('[StrafeSideFlipEmotes] Strafe side flip emotes system loaded successfully')
})