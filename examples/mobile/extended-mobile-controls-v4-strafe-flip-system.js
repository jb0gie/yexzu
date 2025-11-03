({
  name: 'Extended Mobile Controls V4 + Strafe-Flip System',
  version: '4.0.0',

  configure: [
    { type: 'section', label: '🚀 Extended Mobile Controls V4 + Strafe-Flip' },
    {
      type: 'toggle',
      key: 'enabled',
      label: 'Enable Extended Controls',
      initial: true
    },
    {
      type: 'toggle',
      key: 'showADS',
      label: 'Show ADS Button',
      initial: true
    },
    {
      type: 'toggle',
      key: 'showCamera',
      label: 'Show Camera Cycle Button',
      initial: true
    },
    {
      type: 'toggle',
      key: 'showFlipControls',
      label: 'Show Flip Controls',
      initial: true
    },
    {
      type: 'select',
      key: 'flipLayout',
      label: 'Flip Button Layout',
      options: ['compact', 'expanded', 'minimal'],
      initial: 'compact'
    },
    {
      type: 'select',
      key: 'flipPhysics',
      label: 'Flip Physics Preset',
      options: ['casual', 'athletic', 'ninja', 'superhuman', 'moon'],
      initial: 'athletic'
    },
    {
      type: 'toggle',
      key: 'flipEffects',
      label: 'Enable Flip Visual Effects',
      initial: true
    },
    {
      type: 'toggle',
      key: 'gestureControls',
      label: 'Enable Gesture Controls (tap/swipe)',
      initial: true
    },
    {
      type: 'toggle',
      key: 'showStrafeButtons',
      label: 'Show Strafe Flip Buttons',
      initial: true
    },
    {
      type: 'select',
      key: 'strafeFlipMode',
      label: 'Strafe Flip Detection Mode',
      options: ['auto-detect', 'manual-buttons', 'controller-gesture', 'tap-detect'],
      initial: 'auto-detect'
    },
    {
      type: 'toggle',
      key: 'vrCompatible',
      label: 'VR Mode Compatible',
      initial: true
    }
  ])

  console.log('[ExtendedMobileControlsV4] INITIALIZING - Enhanced with Strafe-Flip System')

  // Enhanced state management
  let enhancedState = {
    buttons: {},
    flipButtons: {},
    strafeButtons: {},
    adsToggled: false,
    cameraMode: 0,
    lastFlip: 0,
    lastStrafeFlip: 0,
    currentPreset: app.props.flipPhysics,
    strafeDirection: null, // 'left', 'right', or null
    strafeDetectionActive: true,
    canFlip: true
  }

  // Physics presets
  const physicsPresets = {
    casual: { up: 12, forward: 6, timing: 200 },
    athlete: { up: 18, forward: 10, timing: 150 },
    ninja: { up: 25, forward: 15, timing: 100 },
    superhuman: { up: 35, forward: 20, timing: 80 },
    moon: { up: 8, forward: 4, timing: 400 }
  }

  // Flip variations
  const flipTypes = {
    tap: { emote: 'asset://emote-flip.glb?s=1.1&l=0', cooldown: 600 },
    swipeUp: { emote: 'asset://emote-flip.glb?s=1.3&l=0', cooldown: 700 },
    swipeDown: { emote: 'asset://emote-backflip.glb?s=2.0&l=0', cooldown: 800 }
  }

  // [TEMPORARY] Using existing flip emotes until strafe animations are created
  // TODO: Replace with actual strafe animations when ready
  const strafeFlipTypes = {
    left: { emote: 'asset://emote-flip.glb?s=1.4&l=0', cooldown: 800 },
    right: { emote: 'asset://emote-flip.glb?s=1.4&l=0', cooldown: 800 }
  }

  // Touch tracking
  let touch = {
    start: { x: 0, y: 0, time: 0 },
    end: { x: 0, y: 0, time: 0 }
  }

  // Enhanced touch detection - same as V2/V3
  function isTouchDevice() {
    try {
      return typeof ontouchstart !== 'undefined' && navigator.maxTouchPoints > 0
    } catch (e) {
      return false
    }
  }

  // Button animation - clean Hypscript style
  function animateButtonPress(button) {
    if (!button || !button.element) return

    button.element.style.transform = 'scale(0.95)'
    button.element.style.opacity = '0.8'

    setTimeout(() => {
      if (button.element) {
        button.element.style.transform = 'scale(1)'
        button.element.style.opacity = '1'
      }
    }, 150)
  }

  // Detect strafe direction based on player movement
  function detectStrafeDirection() {
    const player = world.entities.player
    if (!player || !player.axis) return null

    const axis = player.axis || { x: 0, z: 0 }
    if (Math.abs(axis.x) < 0.2) return null // Not strafing enough

    // Calculate strafe angle (0° = forward)
    let strafeDeg = Math.atan2(axis.x, -axis.z) * (180 / Math.PI)
    if (strafeDeg < 0) strafeDeg += 360

    // Enhanced strafe detection zones
    if (strafeDeg >= 247.5 && strafeDeg <= 292.5) return 'left'
    if (strafeDeg >= 67.5 && strafeDeg <= 112.5) return 'right'

    return null
  }

  // Execute enhanced flip
  function executeEnhancedFlip(flipType, physics = null) {
    if (!enhancedState.canFlip) return

    const now = Date.now()
    const flipConfig = flipTypes[flipType]
    if (!flipConfig) return

    const cooldown = flipType.includes('strafe') ? strafeFlipTypes[flipType]?.cooldown || 800 : flipConfig.cooldown
    if (now - enhancedState.lastFlip < cooldown) return

    const player = world.entities.player
    if (!player) return

    const physicsToUse = physics || physicsPresets[enhancedState.currentPreset]

    // Calculate forces based on flip type
    const upForce = new Vector3(0, physicsToUse.up, 0)
    const playerQuat = new Quaternion()
    playerQuat.setFromEuler(new Euler(0, player.rotation?.y || 0, 0, 'YXZ'))
    const forwardForce = new Vector3(0, 0, -physicsToUse.forward).applyQuaternion(playerQuat)
    const totalForce = upForce.add(forwardForce)

    // Apply forces with proper timing
    setTimeout(() => {
      player.push(totalForce)
      if (app.props.flipEffects) createFlipEffect(player.position, flipType)
    }, 60) // Better timing than V3

    setTimeout(() => {
      player.applyEffect({
        emote: flipConfig.emote,
        duration: flipConfig.duration || 1.1,
        cancellable: false
      })
    }, physicsToUse.timing)

    enhancedState.lastFlip = now
  }

  // Execute strafe-specific flip
  function executeStrafeFlip(direction) {
    if (!app.props.showStrafeButtons) return

    const now = Date.now()
    if (now - enhancedState.lastStrafeFlip < 1200) return

    const player = world.entities.player
    if (!player) return

    const strafeConfig = strafeFlipTypes[direction]
    if (!strafeConfig) return

    console.log(`[ExtendedMobileControlsV4] Executing strafe flip (${direction})`)

    // Use strafe-specific physics
    const strafePhysics = strafeFlipPhysics[enhancedState.currentPreset]

    // Calculate directional forces
    const upForce = new Vector3(0, strafePhysics.up, 0)
    const lateralForce = new Vector3(
      direction === 'left' ? -strafePhysics.lateral : strafePhysics.lateral,
      strafePhysics.lateral * 0.25, // Small vertical lateral component
      0
    )

    // Apply both forces
    setTimeout(() => {
      player.push(upForce)
      player.push(lateralForce)

      if (app.props.flipEffects) createStrafeFlipEffect(player.position, direction)
    }, 80)

    setTimeout(() => {
      // [TEMPORARY] Using existing flips until strafe animations are created
      // TODO: Replace with actual strafe animations when ready
      player.applyEffect({
        emote: strafeConfig.emote, // Currently using regular flip as placeholder
        duration: strafeConfig.duration || 1.0,
        cancellable: false
      })
    }, strafePhysics.timing)

    enhancedState.lastStrafeFlip = now
    enhancedState.strafeDirection = direction

    // Visual confirmation
    createStrafeConfirmation(player.position, direction)
  }

  // Create flip effects
  function createFlipEffect(position, flipType) {
    if (!position) return

    const basePos = position.toArray ? position.toArray() : position
    const colors = {
      tap: [1, 0.6, 0.1, 0.9],
      swipeUp: [0.8, 0.3, 1, 0.9],
      swipeDown: [1, 0.3, 0.8, 0.9]
    }

    const particles = app.create('particles', {
      position: basePos,
      particleCount: 20,
      color: colors[flipType] || [1, 0.6, 0.1, 0.9],
      size: 0.08,
      velocity: 10,
      lifespan: 0.8,
      gravity: -6,
      spread: 2
    })

    setTimeout(() => particles.remove(), 1000)
  }

  function createStrafeFlipEffect(position, direction) {
    if (!position) return

    const basePos = position.toArray ? position.toArray() : position
    const sideColor = direction === 'left' ? [0.2, 0.5, 1, 0.9] : [1, 0.3, 0.2, 0.9]

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

    setTimeout(() => particles.remove(), 1200)
  }

  function createStrafeConfirmation(position, direction) {
    if (!position || !app.props.effects) return

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

    setTimeout(() => confirmation.remove(), 700)
  }

  // Touch gesture handling - clean and simple (Hypscript style)
  function setupTouchGestures() {
    if (!app.props.gestureControls) return

    const touchArea = world.viewport || document.body
    if (!touchArea) return

    touchArea.addEventListener('touchend', (e) => {
      if (!app.props.enabled) return

      // Ignore button touches - simple direct approach
      if (e.target && e.target.closest && e.target.closest('*[style*="touchAction"]')) return

      // Simple tap detection (like V2)
      executeEnhancedFlip('tap')
    })
  }

  // Create strafe buttons
  function createStrafeButtons() {
    if (!app.props.showStrafeButtons) return

    // Left strafe flip button - blue
    enhancedState.strafeButtons.strafeLeft = app.create('ui', {
      position: [0, 0, 0],
      width: 65,
      height: 65,
      style: {
        position: 'absolute',
        bottom: '290px', // Above flip buttons
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

    // Right strafe flip button - red
    enhancedState.strafeButtons.strafeRight = app.create('ui', {
      position: [0, 0, 0],
      width: 65,
      height: 65,
      style: {
        position: 'absolute',
        bottom: '290px',
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

    enhancedState.strafeButtons.strafeLeft.element.addEventListener('touchstart', (e) => {
      e.preventDefault()
      executeStrafeFlip('left')
      animateButtonPress(enhancedState.strafeButtons.strafeLeft)
    })

    enhancedState.strafeButtons.strafeRight.element.addEventListener('touchstart', (e) => {
      e.preventDefault()
      executeStrafeFlip('right')
      animateButtonPress(enhancedState.strafeButtons.strafeRight)
    })
  }

  // Enhanced original controls (V3 style)
  function createEnhancedOriginalControls() {
    if (!app.props.enabled) return

    try {
      // ADS - enhanced from V3
      if (app.props.showADS) {
        enhancedState.buttons.ads = app.create('ui', {
          position: [0, 0, 0],
          width: 65,
          height: 65,
          style: {
            position: 'absolute',
            bottom: '150px',
            right: '20px',
            background: enhancedState.adsToggled ? 'rgba(0, 255, 170, 0.6)' : 'rgba(255, 0, 0, 0.6)',
            border: enhancedState.adsToggled ? '3px solid rgba(0, 255, 170, 0.8)' : '3px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            touchAction: 'none',
            pointerEvents: 'auto',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s ease'
          },
          text: enhancedState.adsToggled ? 'ADS\nON' : 'ADS'
        })

        enhancedState.buttons.ads.element.addEventListener('touchstart', handleADSTouch)
      }

      // Camera - enhanced from V3
      if (app.props.showCamera) {
        enhancedState.buttons.camera = app.create('ui', {
          position: [0, 0, 0],
          width: 55,
          height: 55,
          style: {
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(100, 200, 255, 0.5)',
            border: '2px solid rgba(100, 200, 255, 0.7)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
            touchAction: 'none',
            pointerEvents: 'auto',
            opacity: '0.8',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease'
          },
          text: 'CAM\nCYCLE'
        })

        enhancedState.buttons.camera.element.addEventListener('touchstart', handleCameraTouch)
      }

      console.log('[ExtendedMobileControlsV4] Enhanced original controls created')

    } catch (error) {
      console.error('[ExtendedMobileControlsV4] Failed to create original controls:', error)
    }
  }

  // Create flip controls
  function createFlipControls() {
    if (!app.props.showFlipControls) return

    console.log(`[ExtendedMobileControlsV4] Creating flip controls (${app.props.flipLayout})`)

    if (app.props.flipLayout === 'expanded') {
      createExpandedFlipInterface()
    } else {
      createCompactFlipInterface()
    }
  }

  function createCompactFlipInterface() {
    enhancedState.flipButtons.main = app.create('ui', {
      position: [0, 0, 0],
      width: 65,
      height: 65,
      style: {
        position: 'absolute',
        bottom: '220px',
        right: '20px',
        background: 'rgba(255, 165, 0, 0.8)',
        border: '3px solid rgba(255, 165, 0, 0.9)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '13px',
        fontWeight: 'bold',
        touchAction: 'none',
        pointerEvents: 'auto',
        boxShadow: '0 6px 16px rgba(255, 165, 0, 0.3)',
        transition: 'all 0.2s ease'
      },
      text: '🤸'
    })

    enhancedState.flipButtons.main.element.addEventListener('touchstart', (e) => {
      e.preventDefault()
      executeEnhancedFlip('tap')
      animateButtonPress(enhancedState.flipButtons.main)
    })

    enhancedState.flipButtons.physics = app.create('ui', {
      position: [0, 0, 0],
      width: 35,
      height: 35,
      style: {
        position: 'absolute',
        bottom: '220px',
        right: '95px',
        background: 'rgba(100, 200, 255, 0.6)',
        border: '2px solid rgba(100, 200, 255, 0.8)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '10px',
        fontWeight: 'bold',
        touchAction: 'none',
        pointerEvents: 'auto'
      },
      text: enhancedState.currentPreset.charAt(0).toUpperCase()
    })

    enhancedState.flipButtons.physics.element.addEventListener('touchstart', handlePhysicsCycleTouch)
  }

  function createExpandedFlipInterface() {
    const positions = {
      forward: { bottom: '240px', right: '75px' },
      backflip: { bottom: '160px', right: '20px' },
      side: { bottom: '160px', left: '20px' }
    }

    const colors = {
      forward: 'rgba(255, 165, 0, 0.7)',
      backflip: 'rgba(138, 43, 226, 0.7)',
      side: 'rgba(0, 191, 255, 0.7)'
    }

    Object.entries(positions).forEach(([flipType, pos]) => {
      enhancedState.flipButtons[flipType] = app.create('ui', {
        position: [0, 0, 0],
        width: 55,
        height: 55,
        style: {
          position: 'absolute',
          bottom: pos.bottom,
          left: pos.left || 'auto',
          right: pos.right || 'auto',
          background: colors[flipType],
          border: `2px solid ${colors[flipType].replace('0.7', '0.9')}`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '11px',
          fontWeight: 'bold',
          touchAction: 'none',
          pointerEvents: 'auto'
        },
        text: {
          forward: '🤸',
          backflip: '🔄',
          side: '🤸‍♂️'
        }[flipType]
      })

      enhancedState.flipButtons[flipType].element.addEventListener('touchstart', (e) => {
        e.preventDefault()
        executeEnhancedFlip(flipType)
        animateButtonPress(enhancedState.flipButtons[flipType])
      })
    })
  }

  // Touch handlers - clean and simple (Hypscript style)
  function setupTouchGestures() {
    if (!app.props.gestureControls) return

    const touchArea = world.viewport || document.body
    if (!touchArea) return

    touchArea.addEventListener('touchend', (e) => {
      if (!app.props.enabled) return

      // Ignore button touches
      if (e.target && e.target.closest && e.target.closest('*[style*="touchAction"]')) return

      // Simple tap detection (like V2)
      executeEnhancedFlip('tap')
    })
  }

  // Strafe auto-detection system
  function setupStrafeAutoDetection() {
    if (app.props.strafeFlipMode === 'auto-detect') {
      app.on('update', (delta) => {
        const player = world.entities.player
        if (!player) return

        // Check if player is jumping and strafing
        const isJumping = player.isJumping || (player.velocity && player.velocity.y > 2)
        const strafeDirection = detectStrafeDirection()

        if (isJumping && strafeDirection) {
          // Execute strafe flip automatically during jump
          executeStrafeFlip(strafeDirection)
        }
      })
    }
  }

  // Touch handlers
  function handleADSTouch(e) {
    e.preventDefault()

    enhancedState.adsToggled = !enhancedState.adsToggled

    enhancedState.buttons.ads.style.background = enhancedState.adsToggled ? 'rgba(0, 255, 170, 0.8)' : 'rgba(255, 0, 0, 0.8)'
    enhancedState.buttons.ads.style.borderColor = enhancedState.adsToggled ? 'rgba(0, 255, 170, 1)' : 'rgba(255, 255, 255, 0.5)'
    enhancedState.buttons.ads.style.boxShadow = enhancedState.adsToggled ? '0 6px 20px rgba(0, 255, 170, 0.4)' : '0 6px 20px rgba(255, 0, 0, 0.4)'
    enhancedState.buttons.ads.text = enhancedState.adsToggled ? 'ADS\nON' : 'ADS'

    animateButtonPress(enhancedState.buttons.ads)

    try {
      if (world.controls && world.controls.simulateButton) {
        world.controls.simulateButton('mouseRight', enhancedState.adsToggled)
      }
    } catch (err) {
      console.warn('[ExtendedMobileControlsV4] ADS toggle failed:', err)
    }
  }

  function handleCameraTouch(e) {
    e.preventDefault()

    enhancedState.cameraMode = (enhancedState.cameraMode + 1) % 4

    const player = world.entities.player
    if (player && player.cam) {
      const zoomLevels = [5.0, 1.0, 0, 7.0]
      player.cam.zoom = zoomLevels[enhancedState.cameraMode]

      if (player.avatar) {
        player.avatar.visible = enhancedState.cameraMode !== 2
      }
    }

    if (app.props.vrCompatible) {
      const colors = ['rgba(100, 200, 255, 0.6)', 'rgba(100, 255, 100, 0.6)', 'rgba(255, 100, 100, 0.6)', 'rgba(200, 200, 255, 0.6)']
      const labels = ['CAM\nCYCLE', 'CAM\nCLOSE', 'CAM\nFP', 'CAM\nFAR']
      enhancedState.buttons.camera.style.background = colors[enhancedState.cameraMode]
      enhancedState.buttons.camera.text = labels[enhancedState.cameraMode]
    }

    animateButtonPress(enhancedState.buttons.camera)
  }

  function handlePhysicsCycleTouch(e) {
    e.preventDefault()

    const presets = Object.keys(physicsPresets)
    const currentIndex = presets.indexOf(enhancedState.currentPreset)
    enhancedState.currentPreset = presets[(currentIndex + 1) % presets.length]

    if (enhancedState.flipButtons.physics) {
      enhancedState.flipButtons.physics.text = enhancedState.currentPreset.charAt(0).toUpperCase()
    }

    console.log(`[ExtendedMobileControlsV4] Physics changed to: ${enhancedState.currentPreset}`)
  }

  // Enhanced update loop for monitoring
  app.on('update', (delta) => {
    // Monitor flip states for real-time effects
    const player = world.entities.player
    if (!player || !player.avatar || !player.avatar.instance) return

    const locoMode = player.avatar.instance.loco?.mode
    if (locoMode === 'FLIP' || locoMode === 'BACKFLIP') {
      if (app.props.flipEffects && Math.random() < 0.2) {
        createFlipEffect(player.position, 'tap')
      }
    }

    // Update strafe direction display
    if (enhancedState.flipButtons.strafeLeft) {
      const currentDirection = detectStrafeDirection()
      if (currentDirection) {
        enhancedState.flipButtons.strafeLeft.style.opacity = '1.0'
        enhancedState.flipButtons.strafeRight.style.opacity = '1.0'
      } else {
        enhancedState.flipButtons.strafeLeft.style.opacity = '0.6'
        enhancedState.flipButtons.strafeRight.style.opacity = '0.6'
      }
    }
  })

  // Configuration changes
  app.on('change', () => {
    console.log('[ExtendedMobileControlsV4] Configuration changed, reinitializing')

    // Cleanup
    Object.values(enhancedState.buttons).forEach(btn => btn && btn.destroy())
    Object.values(enhancedState.flipButtons).forEach(btn => btn && btn.destroy())
    Object.values(enhancedState.strafeButtons).forEach(btn => btn && btn.destroy())

    // Remove event listeners
    const touchArea = world.viewport || document.body
    if (touchArea && touchArea.removeEventListener) {
      touchArea.removeEventListener('touchend', (e) => {})
    }

    // Reset state
    enhancedState.buttons = {}
    enhancedState.flipButtons = {}
    enhancedState.strafeButtons = {}
    enhancedState.currentPreset = app.props.flipPhysics

    // Reinit
    let resetTimer = 0
    const resetInterval = setInterval(() => {
      resetTimer++
      if (resetTimer === 25) {
        clearInterval(resetInterval)
        setupControls()
      }
    }, 16)
  })

  // Main setup function
  function setupControls() {
    if (!app.props.enabled) return

    if (!isTouchDevice()) {
      console.log('[ExtendedMobileControlsV4] Not a touch device - controls disabled')
      return
    }

    console.log(`[ExtendedMobileControlsV4] Setting up controls - ${app.props.flipLayout}, ${app.props.strafeFlipMode}`)

    try {
      createEnhancedOriginalControls()
      createFlipControls()
      createStrafeButtons()
      setupTouchGestures()
      setupStrafeAutoDetection()

      console.log('[ExtendedMobileControlsV4] Enhanced strafe-flip controls initialized successfully')

    } catch (error) {
      console.error('[ExtendedMobileControlsV4] Setup failed:', error)
    }
  }

  // Initialize
  let initTimer = 0
  app.on('update', (delta) => {
    initTimer++
    if (initTimer === 35) { // Slightly longer delay than V2/V3 (30 → 35)
      setupControls()
    }
  })

  // Cleanup - clean Hypscript style
  app.on('destroy', () => {
    console.log('[ExtendedMobileControlsV4] Cleanup complete')
  })

  console.log('[ExtendedMobileControlsV4] Enhanced mobile controls with strafe-flip - Hypscript compliant and ready!')
})