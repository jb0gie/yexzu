({
  name: 'Extended Mobile Controls V3 + Flip System',
  version: '3.0.0',

  configure([
    { type: 'section', label: 'Extended Mobile Controls V3 + Flip System' },
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
      options: ['compact', 'expanded', 'floating'],
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
      key: 'comboMode',
      label: 'Enable Flip Combos',
      initial: false
    }
  ])

  console.log('[ExtendedMobileControlsV3-FLIP] INITIALIZING - Enhanced Flip + Mobile Controls')

  // Enhanced state management
  let buttons = {}
  let flipButtons = {}
  let flipState = {
    lastFlipTime: 0,
    comboCount: 0,
    currentPreset: app.props.flipPhysics,
    canFlip: true,
    gestureActive: app.props.gestureControls,
    comboMode: app.props.comboMode,
    comboTimer: null
  }

  let adsToggled = false
  let cameraMode = 0

  // Physics presets (shared with Universal Flip System)
  const physicsPresets = {
    casual: { up: 12, forward: 6, timing: 200 },
    athletic: { up: 18, forward: 10, timing: 150 },
    ninja: { up: 25, forward: 15, timing: 100 },
    superhuman: { up: 35, forward: 20, timing: 80 },
    moon: { up: 8, forward: 4, timing: 400 }
  }

  // Enhanced flip types with mobile-specific variations
  const mobileFlipTypes = {
    tap: { emote: 'asset://emote-flip.glb?s=1.1&l=0', name: 'Quick Flip', cooldown: 500 },
    swipeUp: { emote: 'asset://emote-flip.glb?s=1.3&l=0', name: 'Power Flip', cooldown: 600 },
    swipeDown: { emote: 'asset://emote-backflip.glb?s=2.0&l=0', name: 'Backflip', cooldown: 700 },
    doubleTap: { emote: 'asset://emote-flip.glb?s=1.6&l=0', name: 'Double Flip', cooldown: 800 },
    longPress: { emote: 'asset://emote-backflip.glb?s=2.5&l=0', name: 'Super Flip', cooldown: 1000 }
  }

  // Touch gesture tracking
  let touchStart = { x: 0, y: 0, time: 0 }
  let lastTouchEnd = { x: 0, y: 0, time: 0 }

  // Platform detection
  function isTouchDevice() {
    try {
      return typeof ontouchstart !== 'undefined' && navigator.maxTouchPoints > 0
    } catch (e) {
      return false
    }
  }

  // Enhanced platform detection
  function detectDeviceCapabilities() {
    const isTouch = isTouchDevice()
    const isMobile = isTouch && window.innerWidth < 1024
    const hasGyro = 'DeviceOrientationEvent' in window
    const hasMultiTouch = navigator.maxTouchPoints > 2

    console.log(`[ExtendedMobileControlsV3-FLIP] Device capabilities: Touch=${isTouch}, Mobile=${isMobile}, Gyro=${hasGyro}, MultiTouch=${hasMultiTouch}`)

    return {
      isTouch,
      isMobile,
      hasGyro,
      hasMultiTouch
    }
  }

  // Enhanced button animation - simplified Hypscript style
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

  // Combo system - simplified
  function handleCombo(flipType) {
    if (!flipState.comboMode) return false

    const now = Date.now()
    if (now - flipState.lastFlipTime < 1200) {
      flipState.comboCount++
      console.log(`[ExtendedMobileControlsV3-FLIP] Combo x${flipState.comboCount}!`)
      return physicsPresets[flipState.currentPreset]
    } else {
      flipState.comboCount = 0
      return physicsPresets[flipState.currentPreset]
    }
  }

  // Enhanced flip execution - Hypscript style
  function executeMobileFlip(flipStyle = 'tap') {
    if (!app.props.showFlipControls) return

    const now = Date.now()
    const flipConfig = mobileFlipTypes[flipStyle]
    if (!flipConfig) return

    if (now - flipState.lastFlipTime < flipConfig.cooldown) return

    const player = world.entities.player
    if (!player) return

    console.log(`[ExtendedMobileControlsV3-FLIP] Executing ${flipStyle} flip`)

    // Get physics and handle orientation
    const physics = physicsPresets[flipState.currentPreset]
    const playerQuat = new Quaternion()
    playerQuat.setFromEuler(new Euler(0, player.rotation?.y || 0, 0, 'YXZ'))

    const upForce = new Vector3(0, physics.up, 0)
    const forwardForce = new Vector3(0, 0, -physics.forward).applyQuaternion(playerQuat)
    const totalForce = upForce.add(forwardForce)

    // Apply synchronized physics + animation
    setTimeout(() => {
      player.push(totalForce)
      if (app.props.flipEffects) createEnhancedFlipEffect(player.position, flipStyle)
    }, 50)

    setTimeout(() => {
      player.applyEffect({
        emote: flipConfig.emote,
        duration: 1.1,
        cancellable: false
      })
    }, physics.timing)

    flipState.lastFlipTime = now
    animateButtonPress(flipButtons.main, 1.0)
  }

  // Enhanced flip effects - simplified
  function createEnhancedFlipEffect(position, flipStyle) {
    if (!position || !app.props.flipEffects) return

    const particles = app.create('particles', {
      position: position.toArray ? position.toArray() : position,
      particleCount: 20,
      color: [1, 0.6, 0.1, 0.9],
      size: 0.08,
      velocity: 10,
      lifespan: 0.8,
      gravity: -6,
      spread: 2
    })

    setTimeout(() => {
      if (particles) particles.remove()
    }, 1000)
  }

  // Mobile gesture detection - simplified
  function handleMobileGesture(touchType) {
    if (!app.props.gestureControls) return

    if (touchType === 'tap') {
      executeMobileFlip('tap')
    } else if (touchType === 'swipeUp') {
      executeMobileFlip('swipeUp')
    } else if (touchType === 'swipeDown') {
      executeMobileFlip('swipeDown')
    }
  }

  // Enhanced mobile flip interface
  function createEnhancedFlipInterface() {
    if (!app.props.showFlipControls) return

    console.log('[ExtendedMobileControlsV3-FLIP] Creating enhanced mobile flip interface')

    const layout = app.props.flipLayout

    if (layout === 'compact') {
      // Compact layout (minimal footprint)
      createCompactFlipInterface()
    } else if (layout === 'expanded') {
      // Expanded layout (full control)
      createExpandedFlipInterface()
    } else if (layout === 'floating') {
      // Floating layout (contextual)
      createFloatingFlipInterface()
    }
  }

  function createCompactFlipInterface() {
    // Main flip button - integrates with existing button layout
    flipButtons.main = app.create('ui', {
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

    if (flipButtons.main && flipButtons.main.element) {
      flipButtons.main.element.addEventListener('touchstart', (e) => {
        e.preventDefault()
        handleMobileGesture('tap')
        animateButtonPress(flipButtons.main)
      })
    }

    // Physics indicator
    flipButtons.physics = app.create('ui', {
      position: [0, 0, 0],
      width: 30,
      height: 30,
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
      text: '🎯'
    })

    if (flipButtons.physics && flipButtons.physics.element) {
      flipButtons.physics.element.addEventListener('touchstart', (e) => {
        e.preventDefault()
        // Cycle physics preset
        const presets = Object.keys(physicsPresets)
        const currentIndex = presets.indexOf(flipState.currentPreset)
        flipState.currentPreset = presets[(currentIndex + 1) % presets.length]
        app.props.flipPhysics = flipState.currentPreset

        flipButtons.physics.text = flipState.currentPreset.charAt(0).toUpperCase()
        animateButtonPress(flipButtons.physics, 0.5)
      })
    }
  }

  function createExpandedFlipInterface() {
    // Full flip control pad
    const positions = {
      forward: { bottom: '240px', right: '75px' },
      backflip: { bottom: '160px', right: '20px' },
      side: { bottom: '160px', left: '20px' },
      double: { bottom: '240px', left: '75px' }
    }

    const colors = {
      forward: 'rgba(255, 165, 0, 0.7)',
      backflip: 'rgba(138, 43, 226, 0.7)',
      side: 'rgba(0, 191, 255, 0.7)',
      double: 'rgba(255, 69, 0, 0.7)'
    }

    Object.entries(positions).forEach(([flipType, pos]) => {
      flipButtons[flipType] = app.create('ui', {
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
          side: '🤸‍♂️',
          double: '🌟'
        }[flipType]
      })

      if (flipButtons[flipType] && flipButtons[flipType].element) {
        flipButtons[flipType].element.addEventListener('touchstart', (e) => {
          e.preventDefault()
          executeMobileFlip(flipType)
          animateButtonPress(flipButtons[flipType], 0.9)
        })
      }
    })
  }

  function createFloatingFlipInterface() {
    // Contextual buttons that appear when needed
    // Implementation would go here for floating UI
    console.log('[ExtendedMobileControlsV3-FLIP] Floating interface not yet implemented')
  }

  // Enhanced touch gesture handling
  function setupEnhancedTouchGestures() {
    if (!app.props.gestureControls) return

    console.log('[ExtendedMobileControlsV3-FLIP] Setting up enhanced touch gestures')

    const touchArea = world.viewport || document.body

    let touchData = {
      start: { x: 0, y: 0, time: 0 },
      current: { x: 0, y: 0 },
      startElement: null
    }

    touchArea.addEventListener('touchstart', (e) => {
      if (!app.props.enabled) return

      const touch = e.touches[0]
      touchData.start = { x: touch.clientX, y: touch.clientY, time: Date.now() }
      touchData.current = { ...touchData.start }
      touchData.startElement = e.target
    }, { passive: false })

    touchArea.addEventListener('touchmove', (e) => {
      if (!app.props.enabled) return

      const touch = e.touches[0]
      touchData.current = { x: touch.clientX, y: touch.clientY }
    }, { passive: false })

    touchArea.addEventListener('touchend', (e) => {
      if (!app.props.enabled) return

      const touch = e.changedTouches[0]
      const duration = Date.now() - touchData.start.time
      const deltaX = Math.abs(touch.clientX - touchData.start.x)
      const deltaY = Math.abs(touch.clientY - touchData.start.y)

      // Ignore if started on a button
      if (touchData.startElement && touchData.startElement.closest('*[style*="touchAction"]')) {
        touchData.startElement = null
        return
      }

      // Enhanced gesture recognition
      if (deltaX < 30 && deltaY < 30) {
        // Tap gesture
        if (duration < 200) {
          executeMobileGesture('tap', touch.clientX, touch.clientY, duration)
        }
      } else if (deltaY > deltaX * 1.5) {
        // Vertical swipe
        if (deltaY > 60) {
          executeMobileGesture('swipe', touch.clientX, touch.clientY, duration)
        }
      }

      touchData.startElement = null
    }, { passive: false })
  }

  // Original v2 controls (enhanced)
  function createEnhancedOriginalControls() {
    if (!app.props.enabled || !isTouchDevice()) {
      console.log('[ExtendedMobileControlsV3-FLIP] Extended controls disabled or not a touch device')
      return
    }

    console.log('[ExtendedMobileControlsV3-FLIP] Creating enhanced original mobile UI')

    try {
      // Enhanced ADS button
      if (app.props.showADS) {
        buttons.ads = app.create('ui', {
          position: [0, 0, 0],
          width: 65,
          height: 65,
          style: {
            position: 'absolute',
            bottom: '150px',
            right: '20px',
            background: adsToggled ? 'rgba(0, 255, 170, 0.6)' : 'rgba(255, 0, 0, 0.6)',
            border: adsToggled ? '3px solid rgba(0, 255, 170, 0.8)' : '3px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
            touchAction: 'none',
            pointerEvents: 'auto',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s ease'
          },
          text: adsToggled ? 'ADS\nON' : 'ADS'
        })

        if (buttons.ads && buttons.ads.element) {
          buttons.ads.element.addEventListener('touchstart', (e) => {
            e.preventDefault()
            adsToggled = !adsToggled

            // Enhanced visual feedback
            buttons.ads.style.background = adsToggled ? 'rgba(0, 255, 170, 0.8)' : 'rgba(255, 0, 0, 0.8)'
            buttons.ads.style.borderColor = adsToggled ? 'rgba(0, 255, 170, 1)' : 'rgba(255, 255, 255, 0.5)'
            buttons.ads.style.boxShadow = adsToggled ? '0 6px 20px rgba(0, 255, 170, 0.4)' : '0 6px 20px rgba(255, 0, 0, 0.4)'
            buttons.ads.text = adsToggled ? 'ADS\nON' : 'ADS'

            animateButtonPress(buttons.ads, 0.7)

            try {
              if (world.controls && world.controls.simulateButton) {
                world.controls.simulateButton('mouseRight', adsToggled)
              }
            } catch (err) {
              console.warn('[ExtendedMobileControlsV3-FLIP] Failed to toggle ADS:', err)
            }
          })

          // Add hover effect simulation
          buttons.ads.element.addEventListener('touchstart', () => {
            buttons.ads.style.transform = 'scale(0.95)'
          })

          buttons.ads.element.addEventListener('touchend', () => {
            setTimeout(() => {
              buttons.ads.style.transform = 'scale(1)'
            }, 150)
          })
        }
      }

      // Enhanced camera button
      if (app.props.showCamera) {
        buttons.camera = app.create('ui', {
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

        if (buttons.camera && buttons.camera.element) {
          buttons.camera.element.addEventListener('touchstart', (e) => {
            e.preventDefault()

            // Cycle camera mode
            cameraMode = (cameraMode + 1) % 4

            // Enhanced camera switching with VR compatibility
            try {
              const player = world.entities.player
              if (player && player.cam) {
                const zoomLevels = [5.0, 1.0, 0, 7.0]
                player.cam.zoom = zoomLevels[cameraMode]

                if (player.avatar) {
                  player.avatar.visible = cameraMode !== 2
                }
              }

              // Handle VR camera cycling
              if (world.isXR || (world.viewport && world.viewport.classList.contains('xr'))) {
                const vrCameraModes = ['third-person', 'first-person', 'free-look', 'cinematic']
                world.emit('camera-vr-mode', vrCameraModes[cameraMode])
              }
            } catch (err) {
              console.warn('[ExtendedMobileControlsV3-FLIP] Failed to update camera:', err)
            }

            // Enhanced visual feedback
            const colors = ['rgba(100, 200, 255, 0.6)', 'rgba(100, 255, 100, 0.6)', 'rgba(255, 100, 100, 0.6)', 'rgba(200, 200, 255, 0.6)']
            const labels = ['CAM\nCYCLE', 'CAM\nCLOSE', 'CAM\nFP', 'CAM\nFAR']
            buttons.camera.style.background = colors[cameraMode]
            buttons.camera.text = labels[cameraMode]

            animateButtonPress(buttons.camera, 0.6)
          })
        }
      }

      console.log('[ExtendedMobileControlsV3-FLIP] Enhanced original controls created successfully!')

    } catch (e) {
      console.error('[ExtendedMobileControlsV3-FLIP] Failed to create enhanced controls:', e)
    }
  }

  // Initialize system
  function initializeSystem() {
    console.log('[ExtendedMobileControlsV3-FLIP] Initializing enhanced mobile controls with flip system')

    if (!app.props.enabled) {
      console.log('[ExtendedMobileControlsV3-FLIP] System disabled in configuration')
      return
    }

    const deviceCapabilities = detectDeviceCapabilities()
    console.log(`[ExtendedMobileControlsV3-FLIP] Device capabilities:`, deviceCapabilities)

    if (!deviceCapabilities.isTouch) {
      console.log('[ExtendedMobileControlsV3-FLIP] Not running on touch device - controls disabled')
      return
    }

    // Create original controls (enhanced)
    createEnhancedOriginalControls()

    // Create flip controls
    createEnhancedFlipInterface()

    // Setup enhanced gestures
    setupEnhancedTouchGestures()

    console.log('[ExtendedMobileControlsV3-FLIP] Enhanced mobile controls with flip system initialized successfully!')
    console.log(`[ExtendedMobileControlsV3-FLIP] Layout: ${app.props.flipLayout}, Physics: ${app.props.flipPhysics}, Combo: ${app.props.comboMode}`)
  }

  // Wait for world to be ready (with enhanced timing)
  let initTimer = 0
  let lastCameraMode = cameraMode

  app.on('update', (delta) => {
    initTimer++
    if (initTimer === 25) { // Slightly faster initialization
      initializeSystem()
    }

    // Monitor for dynamic physics changes
    if (app.props.flipPhysics !== flipState.currentPreset) {
      flipState.currentPreset = app.props.flipPhysics
      if (flipButtons.physics) {
        flipButtons.physics.text = flipState.currentPreset.charAt(0).toUpperCase()
      }
    }

    // Monitor camera mode changes for VR compatibility
    if (cameraMode !== lastCameraMode) {
      lastCameraMode = cameraMode
      world.emit('camera-mode-changed', { mode: cameraMode, vrMode: world.isXR })
    }
  })

  // Enhanced configuration handler
  app.on('change', () => {
    console.log('[ExtendedMobileControlsV3-FLIP] Configuration changed, reinitializing UI')

    // Cleanup existing UI
    Object.values(buttons).forEach(btn => {
      if (btn) btn.destroy()
    })

    Object.values(flipButtons).forEach(btn => {
      if (btn) btn.destroy()
    })

    // Remove touch listeners
    if (touchArea) {
      touchArea.removeEventListener('touchstart', handleTouchStart)
      touchArea.removeEventListener('touchmove', handleTouchMove)
      touchArea.removeEventListener('touchend', handleTouchEnd)
    }

    // Reset state
    buttons = {}
    flipButtons = {}
    flipState.currentPreset = app.props.flipPhysics

    // Reinitialize with new settings
    initTimer = 0
  })

  // Enhanced cleanup
  app.on('destroy', () => {
    console.log('[ExtendedMobileControlsV3-FLIP] Cleanup initiated')

    // Cleanup UI
    Object.values(buttons).forEach(btn => {
      if (btn) btn.destroy()
    })

    Object.values(flipButtons).forEach(btn => {
      if (btn) btn.destroy()
    })

    // Cleanup timers
    if (flipState.comboTimer) {
      clearTimeout(flipState.comboTimer)
    }

    // Cleanup event listeners
    if (touchArea) {
      touchArea.removeEventListener('touchstart', handleTouchStart)
      touchArea.removeEventListener('touchmove', handleTouchMove)
      touchArea.removeEventListener('touchend', handleTouchEnd)
    }

    // Cleanup gesture state
    gestureState = {}

    console.log('[ExtendedMobileControlsV3-FLIP] Complete cleanup completed')
  })

  // Gesture state tracking
  let gestureState = {
    touchStart: { x: 0, y: 0, time: 0 },
    touchEnd: { x: 0, y: 0, time: 0 },
    active: false
  }

  // Gesture event handlers
  function handleTouchStart(e) {
    if (!app.props.gestureControls || !app.props.enabled) return

    const touch = e.touches[0]
    gestureState.touchStart = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    gestureState.active = true
  }

  function handleTouchMove(e) {
    if (!gestureState.active || !app.props.enabled) return

    const touch = e.touches[0]
    gestureState.current = { x: touch.clientX, y: touch.clientY }
  }

  function handleTouchEnd(e) {
    if (!gestureState.active || !app.props.enabled) return

    const touch = e.changedTouches[0]
    gestureState.touchEnd = { x: touch.clientX, y: touch.clientY, time: Date.now() }

    const duration = gestureState.touchEnd.time - gestureState.touchStart.time
    const deltaX = Math.abs(gestureState.touchEnd.x - gestureState.touchStart.x)
    const deltaY = Math.abs(gestureState.touchEnd.y - gestureState.touchStart.y)

    // Ignore button touches
    if (e.target && e.target.closest && e.target.closest('*[style*="touchAction"]')) {
      gestureState.active = false
      return
    }

    // Enhanced gesture recognition simple
    handleMobileGesture('tap')

    gestureState.active = false
  }

  let touchArea = world.viewport || document.body
  let initTimer = 0

  // Wait for world ready
  app.on('update', (delta) => {
    initTimer++
    if (initTimer === 30) {
      initializeSystem()
    }
  })

  // Configuration changes and cleanup remain the same as V2

  app.on('destroy', () => {
    console.log('[ExtendedMobileControlsV3-FLIP] Cleanup complete')
  })

  console.log('[ExtendedMobileControlsV3-FLIP] Enhanced mobile controls script loaded successfully')
})