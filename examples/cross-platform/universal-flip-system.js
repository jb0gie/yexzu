({
  name: 'Universal Flip Control System',
  version: '2.0.0',

  configure([
    { type: 'section', label: '🎯 Universal Flip System' },
    {
      type: 'toggle',
      key: 'enabled',
      label: 'Enable Flip Controls',
      initial: true
    },
    {
      type: 'select',
      key: 'flipStyle',
      label: 'Flip Trigger Style',
      options: ['tap', 'double-tap', 'swipe-up', 'swipe-down', 'button', 'gesture'],
      initial: 'tap'
    },
    {
      type: 'select',
      key: 'physicsPreset',
      label: 'Default Physics',
      options: ['casual', 'athletic', 'ninja', 'superhuman', 'moon', 'custom'],
      initial: 'athletic'
    },
    {
      type: 'slider',
      key: 'flipUpForce',
      label: 'Custom Up Force (5-50)',
      min: 5,
      max: 50,
      step: 1,
      initial: 18
    },
    {
      type: 'slider',
      key: 'flipForwardForce',
      label: 'Custom Forward Force (0-25)',
      min: 0,
      max: 25,
      step: 1,
      initial: 10
    },
    {
      type: 'toggle',
      key: 'effects',
      label: 'Visual Effects',
      initial: true
    },
    {
      type: 'toggle',
      key: 'sounds',
      label: 'Sound Effects',
      initial: true
    },
    { type: 'section', label: 'Platform-Specific' },
    {
      type: 'toggle',
      key: 'mobileButtons',
      label: 'Enable Mobile Flip Buttons',
      initial: true
    },
    {
      type: 'toggle',
      key: 'xrGesture',
      label: 'Enable XR Gesture Controls (VR/AR)',
      initial: true
    },
    {
      type: 'toggle',
      key: 'keyboardShortcuts',
      label: 'Enable Keyboard Shortcuts',
      initial: true
    }
  ])

  console.log('[UniversalFlipSystem] Cross-platform flip controls initializing...')

  // State management
  let flipButtons = {}
  let gestureState = {}
  let currentPhysics = {}
  let playerController = null
  let touchStartTime = 0
  let touchStartPos = { x: 0, y: 0 }
  let lastFlipTime = 0
  let platformDetection = {
    isMobile: false,
    isXR: false,
    isTouch: false,
    isDesktop: false
  }

  // Physics presets
  const physicsPresets = {
    casual: { up: 12, forward: 6, timing: 200 },
    athletic: { up: 18, forward: 10, timing: 150 },
    ninja: { up: 25, forward: 15, timing: 100 },
    superhuman: { up: 35, forward: 20, timing: 80 },
    moon: { up: 8, forward: 4, timing: 400 }
  }

  // Flip variations
  const flipTypes = {
    forward: { emote: 'asset://emote-flip.glb?s=1.1&l=0', duration: 1.1, name: 'Forward Flip' },
    backflip: { emote: 'asset://emote-backflip.glb?s=2.2&l=0', duration: 2.2, name: 'Backflip' },
    side: { emote: 'asset://emote-flip.glb?s=1.3&l=0', duration: 0.9, name: 'Side Flip' },
    double: { emote: 'asset://emote-flip.glb?s=1.5&l=0', duration: 1.8, name: 'Double Flip' },
    cork: { emote: 'asset://emote-backflip.glb?s=1.6&l=0', duration: 2.0, name: 'Corkscrew' }
  }

  // Platform detection
  function detectPlatform() {
    platformDetection.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    platformDetection.isMobile = platformDetection.isTouch && window.innerWidth < 1024
    platformDetection.isXR = world.isXR === true || (navigator.xr && navigator.xr.isSessionSupported)
    platformDetection.isDesktop = !platformDetection.isMobile && !platformDetection.isXR

    console.log(`[UniversalFlipSystem] Platform detected: Mobile=${platformDetection.isMobile}, XR=${platformDetection.isXR}, Desktop=${platformDetection.isDesktop}`)
  }

  // Initialize player controller
  function initializePlayerController() {
    const player = world.entities.player
    if (!player) {
      console.warn('[UniversalFlipSystem] Player entity not found')
      return null
    }

    playerController = {
      player: player,
      avatar: player.avatar,
      position: player.position || new Vector3(0, 0, 0),
      rotation: player.rotation || new Quaternion(0, 0, 0, 1)
    }

    return playerController
  }

  // Update physics from configuration
  function updatePhysics() {
    if (app.props.physicsPreset === 'custom') {
      currentPhysics = {
        up: app.props.flipUpForce,
        forward: app.props.flipForwardForce,
        timing: 150 // Fixed timing for custom
      }
    } else {
      currentPhysics = physicsPresets[app.props.physicsPreset] || physicsPresets.athletic
    }

    console.log(`[UniversalFlipSystem] Physics updated: ${JSON.stringify(currentPhysics)}`)
  }

  // Execute flip with physics
  function executeFlip(flipType = 'forward') {
    const now = Date.now()
    if (now - lastFlipTime < 800) return // Prevent flip spam
    lastFlipTime = now

    if (!playerController) return

    const flipConfig = flipTypes[flipType]
    if (!flipConfig) return

    console.log(`[UniversalFlipSystem] Executing ${flipConfig.name}`)

    // Get player direction
    const playerQuat = new Quaternion()
    playerQuat.setFromEuler(new Euler(0, 0, 0, 'YXZ'))

    // Calculate physics
    const upForce = new Vector3(0, currentPhysics.up, 0)
    const forwardDir = new Vector3(0, 0, -currentPhysics.forward)
    forwardDir.applyQuaternion(playerController.rotation || playerQuat)
    const totalForce = upForce.add(forwardDir)

    // Apply initial force
    setTimeout(() => {
      playerController.player.push(totalForce)
      if (app.props.effects) createLaunchEffect(playerController.position)
      if (app.props.sounds) playFlipSound('launch')
    }, 50)

    // Trigger flip animation with perfect timing
    setTimeout(() => {
      playerController.player.applyEffect({
        emote: flipConfig.emote,
        duration: flipConfig.duration,
        cancellable: false
      })

      if (app.props.effects) {
        createTrailEffect(playerController.player, flipConfig.duration)
      }

      console.log(`[UniversalFlipSystem] ${flipConfig.name} completed!`)
    }, currentPhysics.timing)
  }

  // Mobile button interface
  function createMobileFlipInterface() {
    if (!platformDetection.isMobile || !app.props.mobileButtons) return

    console.log('[UniversalFlipSystem] Creating mobile flip interface')

    // Primary flip button (right side)
    flipButtons.primary = app.create('ui', {
      position: [0, 0, 0],
      width: 70,
      height: 70,
      style: {
        position: 'absolute',
        bottom: '120px',
        right: '90px',
        background: 'rgba(255, 165, 0, 0.7)',
        border: '3px solid rgba(255, 165, 0, 0.9)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold',
        touchAction: 'none',
        pointerEvents: 'auto',
        boxShadow: '0 4px 12px rgba(255, 165, 0, 0.3)'
      },
      text: '🤸\nFLIP'
    })

    if (flipButtons.primary && flipButtons.primary.element) {
      flipButtons.primary.element.addEventListener('touchstart', (e) => {
        e.preventDefault()
        executeFlip('forward')
        animateButtonPress(flipButtons.primary)
      })
    }

    // Secondary flip button (left side)
    flipButtons.secondary = app.create('ui', {
      position: [0, 0, 0],
      width: 60,
      height: 60,
      style: {
        position: 'absolute',
        bottom: '120px',
        left: '90px',
        background: 'rgba(138, 43, 226, 0.7)',
        border: '2px solid rgba(138, 43, 226, 0.9)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold',
        touchAction: 'none',
        pointerEvents: 'auto',
        boxShadow: '0 4px 12px rgba(138, 43, 226, 0.3)'
      },
      text: '🔄\nBACK'
    })

    if (flipButtons.secondary && flipButtons.secondary.element) {
      flipButtons.secondary.element.addEventListener('touchstart', (e) => {
        e.preventDefault()
        executeFlip('backflip')
        animateButtonPress(flipButtons.secondary)
      })
    }

    // Physics preset button (center top for easy access)
    flipButtons.preset = app.create('ui', {
      position: [0, 0, 0],
      width: 80,
      height: 40,
      style: {
        position: 'absolute',
        bottom: '200px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(100, 200, 255, 0.6)',
        border: '2px solid rgba(100, 200, 255, 0.8)',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '10px',
        fontWeight: 'bold',
        touchAction: 'none',
        pointerEvents: 'auto'
      },
      text: `🎯\n${app.props.physicsPreset.toUpperCase()}`
    })

    if (flipButtons.preset && flipButtons.preset.element) {
      flipButtons.preset.element.addEventListener('touchstart', (e) => {
        e.preventDefault()
        // Cycle through presets
        const presets = Object.keys(physicsPresets)
        const currentIndex = presets.indexOf(app.props.physicsPreset)
        const nextIndex = (currentIndex + 1) % presets.length
        app.props.physicsPreset = presets[nextIndex]
        updatePhysics()

        // Update UI
        flipButtons.preset.text = `🎯\n${app.props.physicsPreset.toUpperCase()}`
        animateButtonPress(flipButtons.preset)

        console.log(`[UniversalFlipSystem] Physics changed to: ${app.props.physicsPreset}`)
      })
    }
  }

  // XR gesture controls
  function setupXRGestureControls() {
    if (!platformDetection.isXR || !app.props.xrGesture) return

    console.log('[UniversalFlipSystem] Setting up XR gesture controls')

    // Watch for XR controller button combinations
    app.on('update', (delta) => {
      const control = app.control()
      if (!control) return

      // Right controller grip + trigger = flip
      if (control.xrRightGrip && control.xrRightTrigger) {
        if (control.xrRightGrip.pressed && control.xrRightTrigger.value > 0.8) {
          executeFlip('forward')
          // Add brief cooldown to prevent spam
          control.xrRightGrip.capture = true
          control.xrRightTrigger.capture = true
          setTimeout(() => {
            control.xrRightGrip.capture = false
            control.xrRightTrigger.capture = false
          }, 800)
        }
      }

      // Left controller grip + trigger = backflip
      if (control.xrLeftGrip && control.xrLeftTrigger) {
        if (control.xrLeftGrip.pressed && control.xrLeftTrigger.value > 0.8) {
          executeFlip('backflip')
          control.xrLeftGrip.capture = true
          control.xrLeftTrigger.capture = true
          setTimeout(() => {
            control.xrLeftGrip.capture = false
            control.xrLeftTrigger.capture = false
          }, 800)
        }
      }
    })
  }

  // Keyboard shortcuts (desktop)
  function setupKeyboardControls() {
    if (!platformDetection.isDesktop || !app.props.keyboardShortcuts) return

    console.log('[UniversalFlipSystem] Setting up keyboard controls')

    const control = app.control()
    if (!control) return

    // Capture keys
    control.keyF.capture = true  // Forward flip
    control.keyB.capture = true  // Backflip
    control.keySpace.capture = true  // Contextual flip

    control.keyF.onPress = () => executeFlip('forward')
    control.keyB.onPress = () => executeFlip('backflip')
    control.keySpace.onPress = () => {
      // Contextual: jump + double-tap space = flip
      const now = Date.now()
      if (control.keySpace.lastPress && now - control.keySpace.lastPress < 300) {
        executeFlip('forward')
      }
      control.keySpace.lastPress = now
    }

    // Advanced shortcuts
    control.keyG.capture = true  // Side flip
    control.keyH.capture = true  // Double flip

    control.keyG.onPress = () => executeFlip('side')
    control.keyH.onPress = () => executeFlip('double')
  }

  // Touch gesture system
  function setupTouchGestures() {
    if (!platformDetection.isTouch) return

    console.log('[UniversalFlipSystem] Setting up touch gesture system')

    // Global touch listener for gestures
    let touchArea
    if (world.viewport) {
      touchArea = world.viewport
    } else {
      touchArea = document.body
    }

    touchArea.addEventListener('touchstart', handleTouchStart, { passive: false })
    touchArea.addEventListener('touchend', handleTouchEnd, { passive: false })
  }

  function handleTouchStart(e) {
    if (!app.props.enabled) return

    const touch = e.touches[0]
    touchStartTime = Date.now()
    touchStartPos = { x: touch.clientX, y: touch.clientY }
  }

  function handleTouchEnd(e) {
    if (!app.props.enabled) return

    const touch = e.changedTouches[0]
    const touchDuration = Date.now() - touchStartTime
    const deltaX = Math.abs(touch.clientX - touchStartPos.x)
    const deltaY = Math.abs(touch.clientY - touchStartPos.y)

    // Ignore if buttons were touched
    if (e.target.closest && e.target.closest('*[style*="touchAction"]')) return

    // Gesture detection based on configuration
    const gestureStyle = app.props.flipStyle

    switch (gestureStyle) {
      case 'tap':
        if (touchDuration < 200 && deltaX < 30 && deltaY < 30) {
          e.preventDefault()
          executeFlip('forward')
        }
        break

      case 'double-tap':
        // Would need to implement double-tap detection here
        if (touchDuration < 200 && deltaX < 30 && deltaY < 30) {
          gestureState.tapCount = (gestureState.tapCount || 0) + 1
          setTimeout(() => {
            if (gestureState.tapCount === 2) {
              executeFlip('forward')
            }
            gestureState.tapCount = 0
          }, 300)
        }
        break

      case 'swipe-up':
        if (deltaY > 50 && deltaX < 30 && touch.clientY < touchStartPos.y - 30) {
          e.preventDefault()
          executeFlip('forward')
        }
        break

      case 'swipe-down':
        if (deltaY > 50 && deltaX < 30 && touch.clientY > touchStartPos.y + 30) {
          e.preventDefault()
          executeFlip('backflip')
        }
        break
    }
  }

  // Visual effects
  function createLaunchEffect(position) {
    if (!position) return

    const burst = app.create('particles', {
      position: position.toArray ? position.toArray() : position,
      particleCount: 25,
      color: [1, 0.6, 0.1, 0.9],
      size: 0.08,
      velocity: 10,
      lifespan: 0.8,
      gravity: -8,
      spread: 2.5
    })

    setTimeout(() => {
      if (burst) burst.remove()
    }, 1000)
  }

  function createTrailEffect(player, duration) {
    if (!player || !player.position) return

    const trail = app.create('particles', {
      position: player.position.toArray(),
      particleCount: 40,
      color: [0.8, 0.5, 1, 0.7],
      size: 0.05,
      velocity: 3,
      lifespan: 1.2,
      gravity: -1.5,
      spread: 0.8
    })

    const interval = setInterval(() => {
      if (trail && player && player.position) {
        trail.position = player.position.toArray()
      }
    }, 60)

    setTimeout(() => {
      clearInterval(interval)
      if (trail) trail.remove()
    }, duration * 1000)
  }

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

  function playFlipSound(type) {
    // Sound implementation placeholder
    console.log(`[UniversalFlipSystem] Playing ${type} sound effect`)
  }

  // Main initialization
  function initializeSystem() {
    console.log('[UniversalFlipSystem] Initializing cross-platform flip system')

    if (!app.props.enabled) {
      console.log('[UniversalFlipSystem] System disabled in configuration')
      return
    }

    detectPlatform()
    initializePlayerController()
    updatePhysics()

    // Setup platform-specific interfaces
    createMobileFlipInterface()
    setupXRGestureControls()
    setupKeyboardControls()
    setupTouchGestures()

    console.log('[UniversalFlipSystem] Cross-platform flip system initialized successfully!')
    console.log(`[UniversalFlipSystem] Platform: ${Object.keys(platformDetection).filter(k => platformDetection[k]).join(', ')}`)
  }

  // Wait for world to be ready
  let initTimer = 0
  app.on('update', (delta) => {
    initTimer++
    if (initTimer === 30) { // ~0.5 seconds
      initializeSystem()
    }
  })

  // Handle configuration changes
  app.on('change', () => {
    console.log('[UniversalFlipSystem] Configuration changed, reinitializing')

    // Cleanup existing UI
    Object.values(flipButtons).forEach(btn => {
      if (btn) btn.destroy()
    })
    flipButtons = {}

    // Remove touch listeners if they were added
    if (platformDetection.isTouch && touchArea) {
      touchArea.removeEventListener('touchstart', handleTouchStart)
      touchArea.removeEventListener('touchend', handleTouchEnd)
    }

    // Reinitialize with new settings
    initializeSystem()
  })

  // Cleanup
  app.on('destroy', () => {
    console.log('[UniversalFlipSystem] Cleanup initiated')

    // Cleanup UI
    Object.values(flipButtons).forEach(btn => {
      if (btn) btn.destroy()
    })

    // Cleanup touch listeners
    if (platformDetection.isTouch && touchArea) {
      touchArea.removeEventListener('touchstart', handleTouchStart)
      touchArea.removeEventListener('touchend', handleTouchEnd)
    }

    console.log('[UniversalFlipSystem] Cleanup completed')
  })

  console.log('[UniversalFlipSystem] Cross-platform flip controls script loaded successfully')
})