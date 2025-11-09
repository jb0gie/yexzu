({
  name: 'Enhanced Strafe Flip System with New Animations',
  version: '3.0.0',

  configure([
    { type: 'section', label: 'Enhanced Strafe Flip System' },
    {
      type: 'toggle',
      key: 'enabled',
      label: 'Enable Enhanced Strafe Flips',
      initial: true
    },
    {
      type: 'select',
      key: 'triggerMode',
      label: 'Strafe Flip Trigger Mode',
      options: ['manual', 'auto-detect', 'comb', 'mobile-buttons'],
      initial: 'manual'
    },
    {
      type: 'select',
      key: 'strafeFlipVariation',
      label: 'Strafe Flip Variation',
      options: ['basic', 'enhanced', 'acrobatic'],
      initial: 'enhanced'
    },
    {
      type: 'select',
      key: 'physicsPreset',
      label: 'Physics Preset',
      options: ['casual', 'athletic', 'ninja', 'superhuman'],
      initial: 'athletic'
    },
    {
      type: 'toggle',
      key: 'strafeJumpEmotes',
      label: 'Use New Strafe Jump Emotes',
      initial: true
    },
    {
      type: 'toggle',
      key: 'strafeDetectionUI',
      label: 'Show Strafe Detection Visual',
      initial: false
    },
    {
      type: 'toggle',
      key: 'comboMode',
      label: 'Enable Combo Multipliers',
      initial: true
    }
  ])

  console.log('[EnhancedStrafeFlipSystem] Integrating new strafe flip animations...')

  // Physics presets optimized for strafe flips
  const enhancedPhysics = {
    basic: {
      up: 15, forward: 5, lateral: 8, timing: 180,
      description: 'Basic strafe flip without lateral boost'
    },
    enhanced: {
      up: 20, forward: 8, lateral: 12, timing: 150,
      description: 'Enhanced strafe flip with lateral movement'
    },
    acrobatic: {
      up: 28, forward: 12, lateral: 16, timing: 120,
      description: 'Acrobatic strafe flip with significant lateral and vertical boost'
    }
  }

  const presetPhysics = {
    casual: { up: 15, forward: 5, lateral: 8, timing: 200 },
    athletic: { up: 20, forward: 8, lateral: 12, timing: 150 },
    ninja: { up: 25, forward: 12, lateral: 15, timing: 100 },
    superhuman: { up: 35, forward: 16, lateral: 20, timing: 80 }
  }

  const strafeFlipData = {
    triggers: {
      manual: { keys: 'Q/E', description: 'Manual Q/E key triggers' },
      'auto-detect': { keys: 'Jump+Strafe', description: 'Auto-detection during jump+strafe' },
      comb: { keys: 'Strafe+Flip', description: 'Combines strafe and regular flip' },
      'mobile-buttons': { buttons: '🔄/↻', description: 'Mobile strafe flip buttons' }
    },
    variations: {
      basic: 'asset://emote-flip.glb',        // Basic flip modified for strafe
      enhanced: 'asset://emote-flip.glb?s=1.3',  // Enhanced scale
      acrobatic: 'asset://emote-flip.glb?s=1.6'  // Acrobatic scale
    },
    strafeJumpEmotes: {
      left: 'asset://emote-jump-left.glb?s=1.0&l=0',
      right: 'asset://emote-jump-right.glb?s=1.0&l=0'
    }
  }

  let flipState = {
    lastStrafeFlip: { left: 0, right: 0 },
    comboMultiplier: 1.0,
    strafeDirection: null,
    isStrafing: false,
    canStrafeFlip: true,
    currentMode: null
  }

  let uiElements = {}
  let strafeIndicators = {}

  // Enhanced strafe detection
  function detectStrafeDirection(player) {
    if (!player || !player.axis) return null

    const axis = player.axis
    let moveRad = Math.atan2(axis.x, -axis.z)
    let moveDeg = moveRad * (180 / Math.PI)
    if (moveDeg < 0) moveDeg += 360

    // Refined strafe detection zones (±22.5° from pure strafe)
    if (moveDeg >= 247.5 && moveDeg <= 292.5) return 'left'   // 270°±22.5°
    if (moveDeg >= 67.5 && moveDeg <= 112.5) return 'right'  // 90°±22.5°

    return null
  }

  // Enhanced strafe flip execution
  function executeEnhancedStrafeFlip(direction, triggerType = 'manual') {
    const player = world.entities.player
    if (!player) return

    const now = Date.now()
    const lastFlip = flipState.lastStrafeFlip[direction]
    const cooldown = 800 // 800ms cooldown

    if (now - lastFlip < cooldown) return

    console.log(`[EnhancedStrafeFlipSystem] Executing ${direction} strafe flip via ${triggerType}`)

    // Determine physics based on configuration
    let physics = presetPhysics[app.props.physicsPreset] || presetPhysics.athletic
    if (app.props.strafeFlipVariation !== 'basic') {
      physics = enhancedPhysics[app.props.strafeFlipVariation]
    }

    // Apply combo multiplier if enabled
    if (app.props.comboMode && flipState.comboMultiplier > 1.0) {
      physics = {
        up: Math.min(50, physics.up * flipState.comboMultiplier),
        forward: Math.min(25, physics.forward * flipState.comboMultiplier),
        lateral: Math.min(25, physics.lateral * flipState.comboMultiplier),
        timing: Math.max(50, physics.timing / flipState.comboMultiplier)
      }
    }

    // Calculate enhanced force vectors
    const playerRotation = player.rotation ? player.rotation : new Quaternion()
    const forwardDir = new Vector3(0, 0, -physics.forward).applyQuaternion(playerRotation)
    const lateralDir = direction === 'left'
      ? new Vector3(-physics.lateral, 0, 0).applyQuaternion(playerRotation)
      : new Vector3(physics.lateral, 0, 0).applyQuaternion(playerRotation)
    const upForce = new Vector3(0, physics.up, 0)

    const totalForce = upForce.add(forwardDir).add(lateralDir)

    // Apply launch force with enhanced timing
    setTimeout(() => {
      player.push(totalForce)
      triggerStrafeLaunchEffect(player.position, direction, physics.up)
      updateStrafeAnimation(player, direction, 'flip')
    }, 50)

    // Trigger the appropriate strafe flip animation with perfect timing
    setTimeout(() => {
      // Use correct strafe flip animations for both directions
      const flipMode = direction === 'left' ? 'SIDEFLIP_LEFT' : 'SIDEFLIP_RIGHT'
      setPlayerMode(player, flipMode)

      if (app.props.strafeFlipVariation !== 'basic') {
        // Delayed enhancement effects
        setTimeout(() => enhanceFlipAnimation(player), physics.timing)
      }

      updateComboSystem(direction)
    }, physics.timing)

    flipState.lastStrafeFlip[direction] = now
    flipState.strafeDirection = direction

    console.log(`[EnhancedStrafeFlipSystem] ${direction.toUpperCase()} strafe flip completed with ${physics.up}↑ ${physics.forward}→ ${physics.lateral}${direction === 'left' ? '←' : '→'}`)
  }

  // Update strafe animation based on direction
  function updateStrafeAnimation(player, direction, type) {
    if (!player || !app.props.strafeJumpEmotes) return

    if (type === 'jump' && direction) {
      const jumpEmote = direction === 'left'
        ? 'STRAFE_JUMP_LEFT'
        : 'STRAFE_JUMP_RIGHT'
      // Apply strafe jump animation if available
      player.applyEffect({
        emote: direction === 'left'
          ? strafeFlipData.strafeJumpEmotes.left
          : strafeFlipData.strafeJumpEmotes.right,
        duration: 0.8,
        cancellable: false
      })
    }
  }

  // Set player movement mode
  function setPlayerMode(player, mode) {
    if (!player || !player.locomotion) return

    try {
      player.locomotion.setMode(mode)
      console.log(`[EnhancedStrafeFlipSystem] Set player mode: ${mode}`)
    } catch (e) {
      console.warn(`[EnhancedStrafeFlipSystem] Failed to set player mode: ${mode}`, e)
    }
  }

  // Enhanced launch effects
  function triggerStrafeLaunchEffect(position, direction, intensity) {
    if (!app.props.effects) return
    if (!position || !position.toArray) return

    const basePosition = position.toArray()
    const effectColor = direction === 'left' ? [0.8, 0.3, 1, 0.9] : [1, 0.8, 0.2, 0.9]
    const particleSize = Math.max(0.08, intensity / 200)

    const particles = app.create('particles', {
      position: basePosition,
      particleCount: Math.floor(intensity),
      color: effectColor,
      size: particleSize,
      velocity: intensity / 2,
      lifespan: 0.8,
      gravity: -6,
      spread: 2.5
    })

    setTimeout(() => {
      if (particles) particles.remove()
    }, 1000)
  }

  // Manual Q/E keyboard controls
  function setupManualControls() {
    const control = app.control()
    if (!control) return

    if (app.props.triggerMode === 'manual') {
      control.keyQ.capture = true  // Left strafe flip
      control.keyE.capture = true  // Right strafe flip

      control.keyQ.onPress = () => executeEnhancedStrafeFlip('left', 'manual')
      control.keyE.onPress = () => executeEnhancedStrafeFlip('right', 'manual')
    }
  }

  // Auto-detection during strafe movements
  function setupAutoStrafeDetection() {
    if (app.props.triggerMode !== 'auto-detect') return

    app.on('update', (delta) => {
      const player = world.entities.player
      if (!player) return

      // Enhanced strafe detection with jump checking
      const isJumping = player.isJumping ||
                       (player.velocity && player.velocity.y > 2) ||
                       player.jumping
      const strafeDir = detectStrafeDirection(player)

      if (strafeDir) {
        flipState.isStrafing = true
        flipState.strafeDirection = strafeDir
        if (app.props.strafeDetectionUI) updateVisualIndicators(strafeDir, true)
      } else {
        flipState.isStrafing = false
        if (app.props.strafeDetectionUI) updateVisualIndicators(null, false)
      }

      if (isJumping && strafeDir) {
        // Auto-trigger when jumping while strafing
        executeEnhancedStrafeFlip(strafeDir, 'auto-detect')
      }
    })
  }

  // Comb mode: combines regular flip with strafe
  function setupCombMode() {
    if (app.props.triggerMode !== 'comb') return

    const control = app.control()
    if (!control) return

    // Q/E activate enhanced strafe flip mode
    control.keyQ.capture = true
    control.keyE.capture = true

    control.keyQ.onPress = () => {
      const player = world.entities.player
      if (player) executeEnhancedStrafeFlip('left', 'comb')
    }
    control.keyE.onPress = () => {
      const player = world.entities.player
      if (player) executeEnhancedStrafeFlip('right', 'comb')
    }
  }

  // Mobile UI for strafe flips
  function setupMobileStrafeUI() {
    if (app.props.triggerMode !== 'mobile-buttons') return

    // Create strafe flip buttons for mobile
    const buttonWidth = 60
    const buttonHeight = 60

    flipButtons.left = app.create('ui', {
      position: [0, 0, 0],
      width: buttonWidth,
      height: buttonHeight,
      style: {
        position: 'absolute',
        bottom: '80px',
        left: '20px',
        background: 'rgba(0, 191, 255, 0.7)',
        border: '2px solid rgba(0, 191, 255, 0.9)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold',
        touchAction: 'none',
        pointerEvents: 'auto'
      },
      text: '↺'
    })

    flipButtons.right = app.create('ui', {
      position: [0, 0, 0],
      width: buttonWidth,
      height: buttonHeight,
      style: {
        position: 'absolute',
        bottom: '80px',
        right: '20px',
        background: 'rgba(255, 165, 0, 0.7)',
        border: '2px solid rgba(255, 165, 0, 0.9)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold',
        touchAction: 'none',
        pointerEvents: 'auto'
      },
      text: '🔄'
    })

    if (flipButtons.left && flipButtons.left.element) {
      flipButtons.left.element.addEventListener('touchstart', (e) => {
        e.preventDefault()
        executeEnhancedStrafeFlip('left', 'mobile-buttons')
      })
    }

    if (flipButtons.right && flipButtons.right.element) {
      flipButtons.right.element.addEventListener('touchstart', (e) => {
        e.preventDefault()
        executeEnhancedStrafeFlip('right', 'mobile-buttons')
      })
    }
  }

  // Visual indicators for strafe detection
  function updateVisualIndicators(direction, active) {
    if (!app.props.strafeDetectionUI) return

    const indicatorText = active
      ? `STRAFE ${direction.toUpperCase()} ACTIVE`
      : 'NO STRAFE'

    if (uiElements.strafeIndicator) {
      uiElements.strafeIndicator.text = indicatorText
      uiElements.strafeIndicator.style.color = direction === 'left' ? 'rgba(0, 191, 255, 1)' : 'rgba(255, 165, 0, 1)'
    }
  }

  // Combo system for multiple consecutive strafe flips
  function updateComboSystem(direction) {
    if (!app.props.comboMode) return

    const now = Date.now()
    const comboWindow = 1500 // 1.5 second window

    if (now - flipState.lastStrafeFlip[direction === 'left' ? 'right' : 'left'] < comboWindow) {
      flipState.comboMultiplier = Math.min(2.5, flipState.comboMultiplier + 0.25)
      console.log(`[EnhancedStrafeFlipSystem] COMBO x${flipState.comboMultiplier}!`)
    } else {
      flipState.comboMultiplier = 1.0
    }
  }

  // Enhance flip animation (scale/speed modifications)
  function enhanceFlipAnimation(player) {
    if (!player) return

    const variation = app.props.strafeFlipVariation
    if (variation === 'enhanced' || variation === 'acrobatic') {
      const enhancementFactor = variation === 'acrobatic' ? 1.6 : 1.3
      player.applyEffect({
        emote: `asset://emote-flip.glb?s=${enhancementFactor}&l=0`,
        duration: enhancementFactor * 1.1,
        cancellable: false
      })
    }
  }

  // Initialize enhanced strafe flip system
  function initializeEnhancedSystem() {
    console.log('[EnhancedStrafeFlipSystem] Initializing enhanced strafe flip system...')

    if (!app.props.enabled) {
      console.log('[EnhancedStrafeFlipSystem] System disabled in configuration')
      return
    }

    const player = world.entities.player
    if (!player) {
      console.warn('[EnhancedStrafeFlipSystem] Player entity not found')
      return
    }

    // Setup based on trigger mode
    switch (app.props.triggerMode) {
      case 'manual':
        setupManualControls()
        break
      case 'auto-detect':
        setupAutoStrafeDetection()
        break
      case 'comb':
        setupCombMode()
        break
      case 'mobile-buttons':
        setupMobileStrafeUI()
        break
      default:
        setupManualControls() // Default fallback
    }

    console.log(`[EnhancedStrafeFlipSystem] Initialization complete! Mode: ${app.props.triggerMode}`)
    console.log(`[EnhancedStrafeFlipSystem] Physics: ${app.props.physicsPreset}, Variation: ${app.props.strafeFlipVariation}`)
  }

  // Initialize when ready
  let initTimer = 0
  app.on('update', (delta) => {
    initTimer++
    if (initTimer === 30) {
      initializeEnhancedSystem()
    }
  })

  // Cleanup
  app.on('destroy', () => {
    console.log('[EnhancedStrafeFlipSystem] Cleanup complete')
    if (uiElements.strafeIndicator) uiElements.strafeIndicator.destroy()
    Object.values(flipButtons).forEach(btn => {
      if (btn) btn.destroy()
    })
  })

  console.log('[EnhancedStrafeFlipSystem] Enhanced strafe flip system script loaded')
})