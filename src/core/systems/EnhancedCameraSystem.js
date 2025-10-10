/**
 * Enhanced Camera System
 *
 * A game-engine-style camera management system that provides:
 * - Multiple camera types (Follow, Orbit, FirstPerson, Free, Cinematic)
 * - Smooth transitions and blending
 * - Target tracking and look-at functionality
 * - Easy camera switching and management
 * - Compatibility with both node cameras and legacy camera controls
 */

import * as THREE from '../extras/three'

const CAMERA_TYPES = {
  FOLLOW: 'follow',
  ORBIT: 'orbit',
  FIRST_PERSON: 'firstPerson',
  FREE: 'free',
  CINEMATIC: 'cinematic',
}

const TRANSITION_TYPES = {
  CUT: 'cut',
  SMOOTH: 'smooth',
  BLEND: 'blend',
}

export class EnhancedCameraSystem {
  constructor(world) {
    this.world = world
    this.cameras = new Map()
    this.activeCamera = null
    this.previousCamera = null
    this.transitionProgress = 0
    this.transitionDuration = 0
    this.transitionType = TRANSITION_TYPES.CUT

    // Default camera settings
    this.defaultSettings = {
      fov: 73,
      near: 0.2,
      far: 1200,
      position: new THREE.Vector3(0, 1.6, 0),
      rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
    }

    // Camera state for smooth transitions
    this.currentCameraState = {
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      fov: 73,
    }

    this.targetCameraState = {
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      fov: 73,
    }
  }

  /**
   * Create a new camera with enhanced game-engine-style settings
   */
  createCamera(name, type = CAMERA_TYPES.FOLLOW, options = {}) {
    const camera = {
      name,
      type,
      active: false,
      settings: { ...this.defaultSettings, ...options },

      // Game engine style properties
      target: options.target || null,
      followDistance: options.followDistance || 5,
      followHeight: options.followHeight || 2,
      lookAtTarget: options.lookAtTarget !== false,
      smoothFollow: options.smoothFollow !== false,
      collisionDetection: options.collisionDetection !== false,

      // Camera controls
      enableInput: options.enableInput !== false,
      enableZoom: options.enableZoom !== false,
      enableRotation: options.enableRotation !== false,

      // Movement settings
      moveSpeed: options.moveSpeed || 10,
      lookSpeed: options.lookSpeed || 2,
      zoomSpeed: options.zoomSpeed || 2,

      // Limits
      minDistance: options.minDistance || 1,
      maxDistance: options.maxDistance || 50,
      minPitch: options.minPitch || -89,
      maxPitch: options.maxPitch || 89,

      // Advanced settings
      damping: options.damping || 0.1,
      springStrength: options.springStrength || 0.1,
      targetOffset: options.targetOffset || new THREE.Vector3(0, 1, 0),
    }

    // Create the actual Three.js camera
    camera.camera = new THREE.PerspectiveCamera(
      camera.settings.fov,
      camera.settings.aspect || 1,
      camera.settings.near,
      camera.settings.far
    )

    // Set initial position
    camera.camera.position.copy(camera.settings.position)
    camera.camera.rotation.copy(camera.settings.rotation)

    // Type-specific setup
    this.setupCameraByType(camera)

    this.cameras.set(name, camera)
    return camera
  }

  setupCameraByType(camera) {
    switch (camera.type) {
      case CAMERA_TYPES.FOLLOW:
        this.setupFollowCamera(camera)
        break
      case CAMERA_TYPES.ORBIT:
        this.setupOrbitCamera(camera)
        break
      case CAMERA_TYPES.FIRST_PERSON:
        this.setupFirstPersonCamera(camera)
        break
      case CAMERA_TYPES.FREE:
        this.setupFreeCamera(camera)
        break
      case CAMERA_TYPES.CINEMATIC:
        this.setupCinematicCamera(camera)
        break
    }
  }

  setupFollowCamera(camera) {
    // Follow camera stays behind and above target
    camera.update = (delta, target) => {
      if (!target) return

      const idealPosition = new THREE.Vector3()
      const targetPosition = target.position || target

      // Calculate ideal follow position
      idealPosition.copy(targetPosition)
      idealPosition.add(camera.targetOffset)

      // Apply follow distance and height
      const direction = new THREE.Vector3(0, 0, -camera.followDistance)
      direction.applyQuaternion(target.quaternion || new THREE.Quaternion())
      idealPosition.add(direction)

      // Smooth follow
      if (camera.smoothFollow) {
        camera.camera.position.lerp(idealPosition, delta * camera.damping * 10)
      } else {
        camera.camera.position.copy(idealPosition)
      }

      // Look at target
      if (camera.lookAtTarget) {
        const lookAtPos = new THREE.Vector3().copy(targetPosition)
        lookAtPos.add(camera.targetOffset)
        camera.camera.lookAt(lookAtPos)
      }
    }
  }

  setupOrbitCamera(camera) {
    // Orbit camera rotates around target
    camera.orbitAngle = 0
    camera.orbitRadius = camera.followDistance
    camera.orbitHeight = camera.followHeight

    camera.update = (delta, target) => {
      if (!target) return

      const targetPosition = target.position || target

      // Calculate orbit position
      const x = Math.cos(camera.orbitAngle) * camera.orbitRadius
      const z = Math.sin(camera.orbitAngle) * camera.orbitRadius

      camera.camera.position.set(targetPosition.x + x, targetPosition.y + camera.orbitHeight, targetPosition.z + z)

      // Look at target
      camera.camera.lookAt(targetPosition)
    }
  }

  setupFirstPersonCamera(camera) {
    // First person camera attached to target
    camera.update = (delta, target) => {
      if (!target) return

      const targetPosition = target.position || target
      const targetRotation = target.quaternion || new THREE.Quaternion()

      // Position camera at target's eye level
      camera.camera.position.copy(targetPosition)
      camera.camera.position.y += camera.targetOffset.y

      // Copy target rotation
      camera.camera.quaternion.copy(targetRotation)
    }
  }

  setupFreeCamera(camera) {
    // Free camera with full movement control
    camera.velocity = new THREE.Vector3()
    camera.angularVelocity = new THREE.Vector3()

    camera.update = (delta, input) => {
      // Apply input-based movement
      if (input && camera.enableInput) {
        const moveVector = new THREE.Vector3()

        if (input.forward) moveVector.z -= 1
        if (input.backward) moveVector.z += 1
        if (input.left) moveVector.x -= 1
        if (input.right) moveVector.x += 1
        if (input.up) moveVector.y += 1
        if (input.down) moveVector.y -= 1

        moveVector.normalize()
        moveVector.multiplyScalar(camera.moveSpeed * delta)

        // Apply movement relative to camera rotation
        moveVector.applyQuaternion(camera.camera.quaternion)
        camera.velocity.add(moveVector)
      }

      // Apply velocity with damping
      camera.velocity.multiplyScalar(1 - camera.damping)
      camera.camera.position.add(camera.velocity)

      // Apply rotation
      if (input && camera.enableRotation) {
        camera.camera.rotation.y -= input.lookX * camera.lookSpeed * delta
        camera.camera.rotation.x -= input.lookY * camera.lookSpeed * delta

        // Clamp pitch
        camera.camera.rotation.x = Math.max(
          (camera.minPitch * Math.PI) / 180,
          Math.min((camera.maxPitch * Math.PI) / 180, camera.camera.rotation.x)
        )
      }
    }
  }

  setupCinematicCamera(camera) {
    // Cinematic camera with predefined paths and automated movement
    camera.path = options.path || []
    camera.pathIndex = 0
    camera.pathProgress = 0

    camera.update = delta => {
      if (camera.path.length === 0) return

      // Move along path
      camera.pathProgress += delta * camera.moveSpeed

      if (camera.pathProgress >= 1) {
        camera.pathProgress = 0
        camera.pathIndex = (camera.pathIndex + 1) % camera.path.length
      }

      // Interpolate position along path
      const currentPoint = camera.path[camera.pathIndex]
      const nextPoint = camera.path[(camera.pathIndex + 1) % camera.path.length]

      camera.camera.position.lerpVectors(currentPoint, nextPoint, camera.pathProgress)

      // Look at next point or target
      if (camera.target) {
        camera.camera.lookAt(camera.target.position || camera.target)
      } else {
        camera.camera.lookAt(nextPoint)
      }
    }
  }

  /**
   * Switch to a different camera with smooth transition
   */
  switchCamera(name, transitionType = TRANSITION_TYPES.SMOOTH, duration = 1.0) {
    const camera = this.cameras.get(name)
    if (!camera) {
      console.warn(`Camera '${name}' not found`)
      return
    }

    this.previousCamera = this.activeCamera
    this.activeCamera = camera
    this.transitionType = transitionType
    this.transitionDuration = duration
    this.transitionProgress = 0

    // Set target state for smooth transition
    this.targetCameraState.position.copy(camera.camera.position)
    this.targetCameraState.rotation.copy(camera.camera.rotation)
    this.targetCameraState.fov = camera.settings.fov

    if (transitionType === TRANSITION_TYPES.CUT) {
      // Immediate switch
      this.currentCameraState.position.copy(this.targetCameraState.position)
      this.currentCameraState.rotation.copy(this.targetCameraState.rotation)
      this.currentCameraState.fov = this.targetCameraState.fov
      this.transitionProgress = 1
    }

    // Deactivate previous camera
    if (this.previousCamera) {
      this.previousCamera.active = false
    }

    // Activate new camera
    camera.active = true

    console.log(`Switched to camera: ${name} (${camera.type})`)
  }

  /**
   * Update camera system
   */
  update(delta) {
    if (!this.activeCamera) return

    // Update transition
    if (this.transitionProgress < 1) {
      this.transitionProgress += delta / this.transitionDuration
      this.transitionProgress = Math.min(1, this.transitionProgress)

      // Smooth interpolation
      const t = this.smoothStep(this.transitionProgress)

      this.currentCameraState.position.lerp(
        this.previousCamera ? this.previousCamera.camera.position : this.currentCameraState.position,
        this.targetCameraState.position,
        t
      )

      this.currentCameraState.rotation.x = THREE.MathUtils.lerp(
        this.previousCamera ? this.previousCamera.camera.rotation.x : this.currentCameraState.rotation.x,
        this.targetCameraState.rotation.x,
        t
      )

      this.currentCameraState.rotation.y = THREE.MathUtils.lerp(
        this.previousCamera ? this.previousCamera.camera.rotation.y : this.currentCameraState.rotation.y,
        this.targetCameraState.rotation.y,
        t
      )

      this.currentCameraState.fov = THREE.MathUtils.lerp(
        this.previousCamera ? this.previousCamera.settings.fov : this.currentCameraState.fov,
        this.targetCameraState.fov,
        t
      )
    }

    // Update active camera
    const target = this.getTargetForCamera(this.activeCamera)
    const input = this.getInputForCamera(this.activeCamera)

    this.activeCamera.update(delta, target, input)

    // Apply collision detection if enabled
    if (this.activeCamera.collisionDetection) {
      this.applyCollisionDetection(this.activeCamera)
    }

    // Update world camera
    this.updateWorldCamera()
  }

  getTargetForCamera(camera) {
    // Get appropriate target based on camera type
    if (camera.type === CAMERA_TYPES.FOLLOW || camera.type === CAMERA_TYPES.FIRST_PERSON) {
      return this.world.rig || this.world.camera
    }
    return camera.target
  }

  getInputForCamera(camera) {
    // Get input state for camera control
    if (!camera.enableInput || !this.world.controls) return null

    const control = this.world.controls.getActiveControl()
    if (!control) return null

    return {
      forward: control.keyW?.down,
      backward: control.keyS?.down,
      left: control.keyA?.down,
      right: control.keyD?.down,
      up: control.keySpace?.down,
      down: control.keyShift?.down,
      lookX: control.pointer?.delta.x || 0,
      lookY: control.pointer?.delta.y || 0,
    }
  }

  applyCollisionDetection(camera) {
    // Simple collision detection to prevent camera from going through walls
    if (!this.world.physics) return

    // Implementation depends on physics system availability
    // This is a placeholder for collision detection logic
  }

  updateWorldCamera() {
    // Update the world's main camera with active camera state
    if (this.world.camera) {
      this.world.camera.position.copy(this.activeCamera.camera.position)
      this.world.camera.quaternion.copy(this.activeCamera.camera.quaternion)
      this.world.camera.fov = this.activeCamera.settings.fov
    }
  }

  smoothStep(t) {
    // Smooth interpolation function
    return t * t * (3 - 2 * t)
  }

  /**
   * Get camera by name
   */
  getCamera(name) {
    return this.cameras.get(name)
  }

  /**
   * Get active camera
   */
  getActiveCamera() {
    return this.activeCamera
  }

  /**
   * List all cameras
   */
  listCameras() {
    return Array.from(this.cameras.keys())
  }

  /**
   * Remove camera
   */
  removeCamera(name) {
    const camera = this.cameras.get(name)
    if (camera) {
      if (camera.active) {
        this.activeCamera = null
      }
      this.cameras.delete(name)
    }
  }

  /**
   * Camera presets for common game scenarios
   */
  createPresetCameras() {
    const cameras = {}

    // Third Person Follow
    cameras.thirdPerson = this.createCamera('thirdPerson', CAMERA_TYPES.FOLLOW, {
      followDistance: 5,
      followHeight: 2,
      lookAtTarget: true,
      smoothFollow: true,
      damping: 0.1,
    })

    // First Person
    cameras.firstPerson = this.createCamera('firstPerson', CAMERA_TYPES.FIRST_PERSON, {
      targetOffset: new THREE.Vector3(0, 1.6, 0),
    })

    // Orbit Camera
    cameras.orbit = this.createCamera('orbit', CAMERA_TYPES.ORBIT, {
      orbitRadius: 10,
      orbitHeight: 5,
      enableInput: true,
      enableRotation: true,
    })

    // Free Camera
    cameras.free = this.createCamera('free', CAMERA_TYPES.FREE, {
      enableInput: true,
      enableRotation: true,
      enableZoom: true,
      moveSpeed: 15,
      lookSpeed: 2,
    })

    // Cinematic Camera
    cameras.cinematic = this.createCamera('cinematic', CAMERA_TYPES.CINEMATIC, {
      moveSpeed: 0.5,
      lookAtTarget: true,
    })

    return cameras
  }
}

// Export constants for use in apps
export { CAMERA_TYPES, TRANSITION_TYPES }
