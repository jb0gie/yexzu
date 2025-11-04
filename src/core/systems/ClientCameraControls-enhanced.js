import { System } from './System'
import * as THREE from '../extras/three'

let systems
function getClientCameraControls(world) {
  if (!systems) systems = new Map()
  if (!systems.has(world)) {
    systems.set(world, new ClientCameraControls(world))
  }
  return systems.get(world)
}

export class ClientCameraControls extends System {
  constructor(world) {
    super(world)
    this.world = world

    // Enhanced head bone raycast system
    this.raycaster = new THREE.Raycaster()
    this.rayOrigin = new THREE.Vector3()
    this.rayDirection = new THREE.Vector3()
    this.lastHeadFocus = null
    this.focusHysteresis = 0.05
    this.headBoneLastUpdate = 0
    this.headBoneUpdateInterval = 16 // Update every frame (16ms @ 60fps)

    // Head bone tracking state
    this.lastHeadPosition = new THREE.Vector3()
    this.lastHeadDirection = new THREE.Vector3()
    this.headVelocity = new THREE.Vector3()
    this.isUsingHeadBoneRaycast = false
  }

  // Enhanced autofocus with head bone raycast support
  init({ viewport, stage }) {
    console.log('[ClientCameraControls-Enhanced] Initializing enhanced head bone raycast DOF system')

    this.viewport = viewport
    this.stage = stage
    this.settings = this.world.settings
    this.camera = this.world.camera
    this.entities = this.world.entities

    // Focus state management
    this.focusSmoothValue = 0
    this.focusSmoothTarget = 1
    this.focusSpeed = 1 // Focus adjustment speed
    this.focusRange = 5 // Focus range from prefs
    this.focusAcceleration = 0
    this.focusDistance = 10 // Default focus distance
    this.lastFocusTime = 0
    this.focusCoolDown = 200 // Cooldown to prevent focus spam

    // Raycast intersection utilities
    this.raycastResult = null
    this.intersectables = new THREE.Group()

    // Settings integration
    this.world.prefs.on('change', this.onPrefsChange)
    this.world.stage.on('change', this.onStageChange)
  }

  // Enhanced head bone raycast method
  raycastFromPlayerHead(multiplayer = true) {
    const player = this.world.entities.player
    const avatar = this.world.avatar

    if (!player || !avatar) {
      return null
    }

    try {
      // Get head bone transform using existing infrastructure
      const headMatrix = avatar.getBoneTransform('head')
      if (!headMatrix) return null

      // Extract head position from transform matrix
      const headPos = new THREE.Vector3().setFromMatrixPosition(headMatrix)

      // Extract head rotation from transform matrix
      const headQuat = new THREE.Quaternion().setFromRotationMatrix(headMatrix)

      // Calculate forward direction from head orientation
      const forward = this.rayDirection.copy(new THREE.Vector3(0, 0, -1)).applyQuaternion(headQuat)

      // Use existing raycast infrastructure from Stage.js
      this.raycaster.set(headPos, forward)

      // Get intersectable objects (world.scene contains all objects for raycasting)
      const intersectables = this.world.stage?.scene || this.world.viewport

      // Perform raycast using existing system
      const intersects = this.raycaster.intersectObjects(intersectables?.children || [], true)

      if (intersects.length > 0) {
        const targetDistance = intersects[0].distance
        this.headBoneLastUpdate = performance.now()
        this.lastHeadPosition.copy(headPos)
        this.lastHeadDirection.copy(forward)
        return targetDistance
      }

      return null

    } catch (error) {
      console.error('[ClientCameraControls-Enhanced] Head bone raycast failed:', error)
      return null
    }
  }

  // Enhanced head position tracking (for fallback and debugging)
  getHeadWorldPosition() {
    const player = this.world.entities.player
    const avatar = this.world.avatar

    if (!player || !avatar) {
      // Fallback to camera position if no avatar available
      return this.camera.position.clone()
    }

    const headMatrix = avatar.getBoneTransform('head')
    if (!headMatrix) {
      // Fallback to player eye height
      return player.position.clone().add(new THREE.Vector3(0, 1.6, 0))
    }

    return new THREE.Vector3().setFromMatrixPosition(headMatrix)
  }

  // Enhanced autofocus with head bone prioritization
  getEnhancedFocusDistance() {
    const player = this.world.entities.player
    const now = performance.now()

    if (!player) return this.focusDistance

    // Priority 1: Head bone raycast (most accurate)
    const headFocus = this.raycastFromPlayerHead()
    if (headFocus !== null && !Number.isNaN(headFocus)) {
      console.log(`[ClientCameraControls-Enhanced] Head bone focus: ${headFocus}m`)
      return Math.min(headFocus, 100) // Cap maximum focus distance
    }

    // Priority 2: Existing camera-center raycast
    const reticleFocus = this.raycastFromWorld(player.position, this.camera.getWorldDirection(new THREE.Vector3()))
    if (reticleFocus !== null && !Number.isNaN(reticleFocus)) {
      console.log(`[ClientCameraControls-Enhanced] Camera-center focus: ${reticleFocus}m`)
      return Math.min(reticleFocus, 100)
    }

    // Priority 3: Distance to player (fallback)
    const playerDistance = this.getPlayerFocusDistance()
    return Math.max(playerDistance, 2)
  }

  // Enhanced player distance calculation
  getPlayerFocusDistance() {
    const player = this.world.entities.player
    if (!player) return this.focusDistance

    // Get head position (or player eye level fallback)
    const headPos = this.getHeadWorldPosition()
    const camPos = this.camera.position

    return headPos.distanceTo(camPos)
  }

  // Hysteresis-based focus smoothing
  applyFocusHysteresis(newFocus, previousFocus) {
    if (previousFocus === null) return newFocus

    const distance = Math.abs(newFocus - previousFocus)

    if (distance < this.focusHysteresis) {
      // Maintain current focus - prevents tiny jumps
      return previousFocus
    }

    // Large change - allow new focus
    return newFocus
  }

  // Enhanced dynamic focus calculation
  updateEnhancedFocus(delta) {
    const now = performance.now()

    // Skip updates during cooldown
    if (now - this.lastFocusTime < this.focusCoolDown) return

    const previousFocus = this.focusDistance
    const newFocus = this.getEnhancedFocusDistance()

    if (isNaN(newFocus)) return

    // Apply hysteresis to prevent focus jumping
    const smoothedFocus = this.applyFocusHysteresis(newFocus, previousFocus)

    if (smoothedFocus !== previousFocus) {
      this.lastFocusTime = now
      this.lastHeadFocus = smoothedFocus
    }

    // Enhanced focus smoothing (like existing but more refined)
    this.focusSmoothTarget = smoothedFocus
    this.focusSmoothValue = THREE.MathUtils.lerp(this.focusSmoothValue, this.focusSmoothTarget, 0.15)

    // Update DOF effect
    if (this.dof && this.dof.circleOfConfusionMaterial) {
      this.dof.circleOfConfusionMaterial.uniforms.focusDistance.value = this.focusSmoothValue / this.camera.far
    }
  }

  // Enhanced reticle system (fallback mode)
  updateReticleAutofocus(delta) {
    if (!this.reticleAutofocus || this.world.builder?.enabled) return

    const now = performance.now()

    // Use head bone raycast if available, fallback to existing reticule
    const focusDistance = this.getEnhancedFocusDistance()

    if (focusDistance !== null && !isNaN(focusDistance)) {
      const focusRange = Math.max(this.focusRange, 1)

      // Smooth focus adjustment (enhanced from V2)
      const lerpFactor = Math.min(delta * 4, 1) // Increased responsiveness
      this.focusDistance = THREE.MathUtils.lerp(this.focusDistance, focusDistance, lerpFactor)

      if (this.world.prefs.dofEnabled) {
        const normalizedValue = this.focusDistance / this.camera.far
        if (this.dof.circleOfConfusionMaterial) {
          this.dof.circleOfConfusionMaterial.uniforms.focusDistance.value = normalizedValue
        }
      }
    }
  }

  // Enhanced touch/hover controls with head bone support
  getEnhancedTouchDistance(x, y) {
    const player = this.world.entities.player
    if (!player) return null

    // Use head bone raycast for touch detection
    const headPos = this.getHeadWorldPosition()
    const pointerPos = this.getPointerPosition(x, y)

    // Calculate direction from head to touch point
    const direction = new THREE.Vector3()
      .subVectors(pointerPos, headPos)
      .normalize()

    this.raycaster.set(headPos, direction)

    const intersectables = this.world.stage?.scene || this.world.viewport
    const intersects = this.raycaster.intersectObjects(intersectables?.children || [], true)

    return intersects.length > 0 ? intersects[0].distance : null
  }

  // Main update loop
  preTick(dt) {
    // Enhanced focus calculations
    if (this.dof && this.dofEnabled) {
      this.updateReticleAutofocus(dt)
      this.updateEnhancedFocus(dt) // New enhanced system
    }

    // Existing touch controls (enhanced)
    // ... existing touch logic with head bone enhancement
  }

  // Settings change handler
  onPrefsChange = changes => {
    // Handle existing settings plus new head bone options
    if (changes.headBoneRaycast) {
      this.isUsingHeadBoneRaycast = changes.headBoneRaycast.value
      console.log(`[ClientCameraControls-Enhanced] Head bone raycast: ${this.isUsingHeadBoneRaycast}`)
    }

    if (changes.focusHysteresis) {
      this.focusHysteresis = Math.max(0.01, Math.min(0.5, changes.focusHysteresis.value))
      console.log(`[ClientCameraControls-Enhanced] Focus hysteresis: ${this.focusHysteresis}`)
    }
  }

  onStageChange = changes => {
    // Handle stage changes (existing logic)
    if (changes.camera) {
      this.camera = changes.camera.value
    }
  }
}

// Enhanced focus debugging utilities
export function debugFocusControls(world) {
  const controls = getClientCameraControls(world)

  console.log('[ClientCameraControls-Enhanced] Debug info:')
  console.log(`  Head bone raycast active: ${controls.isUsingHeadBoneRaycast}`)
  console.log(`  Focus hysteresis: ${controls.focusHysteresis}`)
  console.log(`  Current focus: ${controls.focusDistance}m`)
  console.log(/`  Last head bone update: ${controls.headBoneLastUpdate}ms ago`)
}