/**
 * Game-Engine-Style Camera Control System
 * 
 * This example demonstrates the new enhanced camera system with:
 * - Multiple camera types (Follow, Orbit, First Person, Free, Cinematic)
 * - Smooth transitions between cameras
 * - Easy camera switching with keyboard controls
 * - Target tracking and look-at functionality
 * - Collision detection
 * - Camera presets for common game scenarios
 */

console.log('🎮 Enhanced Camera Control System - Starting...')

// Global variables
let enhancedCameraSystem = null
let cameras = {}
let control = null
let initialized = false

// Camera configuration presets
const CAMERA_PRESETS = {
  thirdPerson: {
    name: 'Third Person',
    type: 'follow',
    description: 'Follows behind the player with smooth tracking',
    controls: 'WASD: Move, Mouse: Look, Scroll: Zoom'
  },
  firstPerson: {
    name: 'First Person',
    type: 'firstPerson',
    description: 'Camera at player eye level',
    controls: 'WASD: Move, Mouse: Look'
  },
  orbit: {
    name: 'Orbit Camera',
    type: 'orbit',
    description: 'Orbits around the player or target',
    controls: 'Mouse: Rotate orbit, Scroll: Distance'
  },
  free: {
    name: 'Free Camera',
    type: 'free',
    description: 'Free-flying camera with full control',
    controls: 'WASD: Move, Mouse: Look, Space/Shift: Up/Down'
  },
  cinematic: {
    name: 'Cinematic Camera',
    type: 'cinematic',
    description: 'Automated camera with cinematic movement',
    controls: 'Auto-moves along predefined paths'
  }
}

if (world.isClient) {
  console.log('✅ Running on client side')

  // Keep app active
  app.keepActive = true

  app.on('update', (delta) => {
    if (!initialized) {
      initializeCameraSystem()
      return
    }

    // Update enhanced camera system
    if (enhancedCameraSystem) {
      enhancedCameraSystem.update(delta)
    }

    // Handle camera switching
    handleCameraControls()
  })

  function initializeCameraSystem() {
    try {
      // Import the enhanced camera system
      const { EnhancedCameraSystem, CAMERA_TYPES, TRANSITION_TYPES } = world.import('EnhancedCameraSystem')

      // Create the enhanced camera system
      enhancedCameraSystem = new EnhancedCameraSystem(world)

      // Get control interface
      control = app.control()
      if (!control) {
        console.warn('[Camera] No control interface available')
        return
      }

      // Capture keys for camera control
      setupCameraControls()

      // Create preset cameras
      cameras = enhancedCameraSystem.createPresetCameras()

      // Set default camera
      enhancedCameraSystem.switchCamera('thirdPerson', TRANSITION_TYPES.SMOOTH, 1.0)

      initialized = true
      console.log('[Camera] Enhanced camera system initialized!')

      // Print available cameras
      console.log('🎥 Available Cameras:')
      Object.entries(CAMERA_PRESETS).forEach(([key, preset]) => {
        console.log(`  ${key}: ${preset.name} - ${preset.description}`)
      })

      console.log('')
      console.log('🎮 Controls:')
      console.log('  1-5: Switch camera presets')
      console.log('  [: Previous camera, ]: Next camera')
      console.log('  F: Toggle follow mode')
      console.log('  C: Toggle collision detection')
      console.log('  +/-: Adjust follow distance')
      console.log('  Arrow Keys: Manual camera control (free cam only)')
      console.log('')
      console.log('🎯 Active Camera:', enhancedCameraSystem.getActiveCamera()?.name || 'none')

    } catch (error) {
      console.error('[Camera] Failed to initialize enhanced camera system:', error)
      console.log('[Camera] Falling back to basic camera system...')
      initializeBasicCameraSystem()
    }
  }

  function initializeBasicCameraSystem() {
    // Fallback to basic camera system if enhanced system fails
    try {
      // Get control interface
      control = app.control()
      if (!control) {
        console.warn('[Camera] No control interface available')
        return
      }

      // Capture keys for basic camera control
      setupCameraControls()

      initialized = true
      console.log('[Camera] Basic camera system initialized')

    } catch (error) {
      console.error('[Camera] Failed to initialize basic camera system:', error)
    }
  }

  function setupCameraControls() {
    if (!control) return

    // Capture number keys for camera switching (digit1..digit5)
    if (control.digit1) control.digit1.capture = true
    if (control.digit2) control.digit2.capture = true
    if (control.digit3) control.digit3.capture = true
    if (control.digit4) control.digit4.capture = true
    if (control.digit5) control.digit5.capture = true
    if (control.bracketLeft) control.bracketLeft.capture = true
    if (control.bracketRight) control.bracketRight.capture = true
    if (control.keyF) control.keyF.capture = true
    if (control.keyC) control.keyC.capture = true
    // Replace +/- with equal and minus
    if (control.equal) control.equal.capture = true
    if (control.minus) control.minus.capture = true

    // Arrow keys for manual control
    control.arrowUp.capture = true
    control.arrowDown.capture = true
    control.arrowLeft.capture = true
    control.arrowRight.capture = true
  }

  function handleCameraControls() {
    if (!control || !enhancedCameraSystem) return

    // Number keys: Switch to specific camera
    if (control.digit1?.pressed) {
      switchToCamera('thirdPerson')
    }
    if (control.digit2?.pressed) {
      switchToCamera('firstPerson')
    }
    if (control.digit3?.pressed) {
      switchToCamera('orbit')
    }
    if (control.digit4?.pressed) {
      switchToCamera('free')
    }
    if (control.digit5?.pressed) {
      switchToCamera('cinematic')
    }

    // Cycle cameras with [ and ]
    if (control.bracketLeft?.pressed) {
      cycleCameras(true)
    }
    if (control.bracketRight?.pressed) {
      cycleCameras(false)
    }

    // F: Toggle follow mode
    if (control.keyF?.pressed) {
      toggleFollowMode()
    }

    // C: Toggle collision detection
    if (control.keyC?.pressed) {
      toggleCollisionDetection()
    }

    // +/-: Adjust follow distance
    if (control.equal?.pressed) {
      adjustFollowDistance(0.5)
    }
    if (control.minus?.pressed) {
      adjustFollowDistance(-0.5)
    }

    // Arrow keys: Manual control (for free camera)
    if (control.arrowUp?.down || control.arrowDown?.down ||
      control.arrowLeft?.down || control.arrowRight?.down) {
      handleManualCameraControl()
    }
  }

  function switchToCamera(cameraName) {
    if (!enhancedCameraSystem) return

    const camera = enhancedCameraSystem.getCamera(cameraName)
    if (camera) {
      enhancedCameraSystem.switchCamera(cameraName, 'smooth', 1.0)
      console.log(`[Camera] Switched to: ${CAMERA_PRESETS[cameraName]?.name || cameraName}`)
    } else {
      console.warn(`[Camera] Camera '${cameraName}' not found`)
    }
  }

  function cycleCameras(reverse = false) {
    if (!enhancedCameraSystem) return

    const cameraList = enhancedCameraSystem.listCameras()
    if (cameraList.length === 0) return

    const activeCamera = enhancedCameraSystem.getActiveCamera()
    const currentIndex = activeCamera ? cameraList.indexOf(activeCamera.name) : -1

    let nextIndex
    if (reverse) {
      nextIndex = currentIndex <= 0 ? cameraList.length - 1 : currentIndex - 1
    } else {
      nextIndex = currentIndex >= cameraList.length - 1 ? 0 : currentIndex + 1
    }

    const nextCameraName = cameraList[nextIndex]
    enhancedCameraSystem.switchCamera(nextCameraName, 'smooth', 0.5)
    console.log(`[Camera] Cycled to: ${CAMERA_PRESETS[nextCameraName]?.name || nextCameraName}`)
  }

  function toggleFollowMode() {
    const activeCamera = enhancedCameraSystem?.getActiveCamera()
    if (activeCamera) {
      activeCamera.lookAtTarget = !activeCamera.lookAtTarget
      console.log(`[Camera] Follow mode: ${activeCamera.lookAtTarget ? 'ON' : 'OFF'}`)
    }
  }

  function toggleCollisionDetection() {
    const activeCamera = enhancedCameraSystem?.getActiveCamera()
    if (activeCamera) {
      activeCamera.collisionDetection = !activeCamera.collisionDetection
      console.log(`[Camera] Collision detection: ${activeCamera.collisionDetection ? 'ON' : 'OFF'}`)
    }
  }

  function adjustFollowDistance(delta) {
    const activeCamera = enhancedCameraSystem?.getActiveCamera()
    if (activeCamera && (activeCamera.type === 'follow' || activeCamera.type === 'orbit')) {
      activeCamera.followDistance = Math.max(1, Math.min(50, activeCamera.followDistance + delta))
      console.log(`[Camera] Follow distance: ${activeCamera.followDistance.toFixed(1)}`)
    }
  }

  function handleManualCameraControl() {
    const activeCamera = enhancedCameraSystem?.getActiveCamera()
    if (!activeCamera || activeCamera.type !== 'free') return

    // Manual control for free camera
    const moveSpeed = 0.1
    const moveVector = new THREE.Vector3()

    if (control.arrowUp.down) moveVector.z -= moveSpeed
    if (control.arrowDown.down) moveVector.z += moveSpeed
    if (control.arrowLeft.down) moveVector.x -= moveSpeed
    if (control.arrowRight.down) moveVector.x += moveSpeed

    // Apply movement relative to camera rotation
    moveVector.applyQuaternion(activeCamera.camera.quaternion)
    activeCamera.camera.position.add(moveVector)
  }

  // Camera configuration for app
  app.configure([
    {
      type: 'text',
      key: 'defaultCamera',
      label: 'Default Camera',
      initial: 'thirdPerson',
      options: [
        { value: 'thirdPerson', label: 'Third Person' },
        { value: 'firstPerson', label: 'First Person' },
        { value: 'orbit', label: 'Orbit' },
        { value: 'free', label: 'Free Camera' },
        { value: 'cinematic', label: 'Cinematic' }
      ]
    },
    {
      type: 'switch',
      key: 'smoothTransitions',
      label: 'Smooth Transitions',
      initial: true
    },
    {
      type: 'number',
      key: 'transitionDuration',
      label: 'Transition Duration (seconds)',
      initial: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.1
    },
    {
      type: 'switch',
      key: 'showCameraHelpers',
      label: 'Show Camera Helpers',
      initial: false
    },
    {
      type: 'switch',
      key: 'enableCollision',
      label: 'Enable Collision Detection',
      initial: true
    }
  ])

  // Cleanup
  app.on('cleanup', () => {
    console.log('[Camera] Cleaning up enhanced camera system...')
    enhancedCameraSystem = null
    cameras = {}
    initialized = false
  })

  console.log('[Camera] Enhanced camera control system loaded')
} else {
  console.log('❌ Not running on client side, skipping camera system')
}