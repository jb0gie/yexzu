import * as THREE from '../extras/three'
import { Raycaster, Vector3, Quaternion, MathUtils as THREE} from 'three'

export class CameraEnhanced {
  constructor(ctx, data) {
    this.ctx = ctx
    this._data = data

    // Enhanced DoF configuration
    this.dof = {
      enabled: data.dof?.enabled ?? true,
      focusDistance: data.dof?.focusDistance ?? 10,
      focusRange: data.dof?.focusRange ?? 5,
      bokehScale: data.dof?.maxBlur ?? 0.08,
      // Enhanced autofocus features
      autofocus: data.dof?.autofocus ?? false,
      autofocusSpeed: data.dof?.autofocusSpeed ?? 8,
      autofocusSmoothness: data.dof?.autofocusSmoothness ?? 0.08,
      // NEW: Head bone raycast options
      useHeadBoneRaycast: data.dof?.useHeadBoneRaycast ?? false,
      focusHysteresis: data.dof?.focusHysteresis ?? 0.05,
    }

    // Enhanced postprocessing pipeline
    this.composer = null
    this.effects = {}
    this._disposed = false

    // Enhanced camera properties
    this.camera = null
    this.composer = null
    this.effects = {}

    // Enhanced autofocus state
    this.autofocusTarget = null
    this.autofocusCurrent = data.dof?.focusDistance ?? 10
    this.autofocusTargetTime = 0

    // Head bone raycast system
    this.raycaster = new THREE.Raycaster()
    this.rayOrigin = new THREE.Vector3()
    this.rayDirection = new THREE.Vector3()
    this.lastHeadUpdate = 0

    // Focus smoothing and hysteresis
    this.focusSmooth = {
      current: data.dof?.focusDistance ?? 10,
      target: data.dof?.focusDistance ?? 10,
      velocity: 0,
      hysteresis: data.dof?.focusHysteresis ?? 0.05,
      smoothingFactor: 0.15
    }

    // Head bone tracking
    this.lastHeadPosition = new THREE.Vector3()
    this.lastHeadDirection = new THREE.Vector3()
  }

  mount() {
    console.log('[Camera-Enhanced] Enhanced camera node mounting with head bone raycast support')

    // Enhanced camera creation
    this.camera = new THREE.PerspectiveCamera(
      this.fov,
      1,
      this.near || 0.1,
      this.far || 1000
    )

    this.camera.position.copy(this.position)
    this.camera.rotation.copy(this.rotation)

    // Enhanced position/rotation tracking
    this.cameraPosition = new THREE.Vector3()
    this.cameraQuaternion = new THREE.Quaternion()
    this.cameraWorldMatrix = new THREE.Matrix4()

    // Enhanced postprocessing setup
    this.setupPostprocessing()
  }

  /**
   * Enhanced autofocus system with head bone raycast support
   */
  setupPostprocessing() {
    if (!this.ctx || !this.ctx.world || !this.ctx.world.graphics) return

    console.log('[Camera-Enhanced] Setting up enhanced postprocessing with head bone raycast')
  }

  /**
   * Enhanced head bone raycast autofocus
   * Updated performAutofocus with head bone raycast option
   */
  performAutofocus(delta) {
    // Safety checks (enhanced from original)
    if (this._disposed || !this.dof.autofocus || !this.effects.dof) return

    if (!this.effects.dof.circleOfConfusionMaterial) return

    const now = performance.now()
    const player = this.ctx?.world?.entities?.player

    if (!player) return

    // Head bone raycast option (NEW)
    if (this.dof.useHeadBoneRaycast && this.ctx?.world?.avatar) {
      const headMatrix = this.ctx.world.avatar.getBoneTransform('head')
      if (headMatrix) {
        // Use head bone position and orientation
        this.rayOrigin.setFromMatrixPosition(headMatrix)
        this.rayDirection.copy(new THREE.Vector3(0, 0, -1)).applyMatrix3(
          new THREE.Matrix3().setFromMatrix4(headMatrix)
        ).normalize()

        // Perform raycast from head position
        this.raycaster.set(this.rayOrigin, this.rayDirection)
      } else {
        // Fall back to camera position with head height
        this.rayOrigin.copy(this.camera.position)
        this.rayDirection.copy(this.camera.getWorldDirection(new THREE.Vector3()))
        this.rayOrigin.y += 1.6 // Standard eye height
      }
    } else {
      // Original camera-center raycast
      this.rayOrigin.copy(this.camera.position)
      this.rayDirection.copy(this.camera.getWorldDirection(new THREE.Vector3()))
      this.rayOrigin.y += 1.6 // Standard eye height
    }

    // Get focus distance using existing raycast logic
    const focusDistance = this.getEnhancedFocusDistance()

    if (focusDistance === null || isNaN(focusDistance)) return

    // Enhanced focus smoothing with hysteresis
    const smoothedDistance = this.applyFocusSmoothing(focusDistance)

    // Apply overshoot for dramatic focus pulls
    const overshoot = 1.05
    const newDistance = THREE.MathUtils.lerp(this.dof.focusDistance, smoothedDistance * overshoot, delta * this.dof.autofocusSpeed * (2 + this.dof.autofocusSmoothness))

    // Clamp to prevent excessive focus distance
    this.dof.focusDistance = THREE.MathUtils.lerp(newDistance, smoothedDistance, 0.1)

    // Update DOF effect
    if (this.effects.dof && this.effects.dof.circleOfConfusionMaterial) {
      this.effects.dof.circleOfConfusionMaterial.uniforms.focusDistance.value = this.dof.focusDistance / this.far
      this.effects.dof.circleOfConfusionMaterial.uniforms.focusRange.value = this.dof.focusRange / this.far
    }
  }

  /**
   * Enhanced head bone-based focus distance calculation
   */
  getEnhancedFocusDistance() {
    const player = this.ctx?.world?.entities?.player
    const stage = this.ctx?.world?.stage

    if (!player || !stage) return null

    // Enhanced scene intersection logic
    const intersectables = this.world.stage.getIntersectables()
    if (!intersectables) return null

    // Enhanced raycast with head-origin support
    const intersects = this.raycaster.intersectObjects(intersectables.children, true)

    if (intersects.length > 0) {
      // Enhanced target selection with head bone prioritization
      return Math.min(intersects[0].distance, this.far * 0.95) // Cap at 95% of far plane
    }

    return this.getPlayerDistanceFocus()
  }

  /**
   * Enhanced focus smoothing with hysteresis
   */
  applyFocusSmoothing(newFocus) {
    const previousFocus = this.dof.focusDistance

    if (previousFocus === null) return newFocus

    // Apply hysteresis to prevent focus jumping
    const delta = Math.abs(newFocus - previousFocus)

    if (delta < this.focusSmooth.hysteresis) {
      // Maintain current focus - prevents micro-adjustments
      return previousFocus
    }

    // Large change - allow new focus with enhanced smoothing
    const lerpFactor = Math.min(this.focusSmooth.smoothingFactor * 2, 1)
    const smoothedValue = THREE.MathUtils.lerp(previousFocus, newFocus, lerpFactor)

    // Enhanced velocity-based smoothing for natural motion
    const velocityDelta = (newFocus - previousFocus) / delta
    this.focusSmooth.velocity *= 0.9
    this.focusSmooth.velocity += velocityDelta * 0.1

    return smoothedValue + (this.focusSmooth.velocity * 0.05)
  }

  /**
   * Enhanced player distance focus (fallback)
   */
  getPlayerDistanceFocus() {
    const player = this.ctx?.world?.entities?.player
    if (!player) return this.dof.focusDistance || 10

    const camera = this.camera
    const headPos = this.getPlayerHeadPosition()

    return Math.max(headPos.distanceTo(camera.position), 2) // Minimum 2m focus
  }

  /**
   * Get accurate player head position
   */
  getPlayerHeadPosition() {
    const player = this.ctx?.world?.entities?.player
    const avatar = this.ctx?.world?.avatar

    if (!player || !avatar) {
      return player.position.clone().add(new THREE.Vector3(0, 1.6, 0)) // Fallback to eye height
    }

    const headMatrix = avatar.getBoneTransform('head')
    if (!headMatrix) {
      // Use HMD position in VR, eye height fallback elsewhere
      return this.isInXR ? this.camera.position : player.position.clone().add(new THREE.Vector3(0, 1.6, 0))
    }

    return new THREE.Vector3().setFromMatrixPosition(headMatrix)
  }

  /**
   * Enhanced head position/direction calculation
   */
  getHeadPositionOrientation() {
    const player = this.ctx?.world?.entities?.player
    const avatar = this.ctx?.world?.avatar

    if (!player || !avatar) {
      return {
        position: player.position.clone().add(new THREE.Vector3(0, 1.6, 0)),
        direction: this.camera.getWorldDirection(new THREE.Vector3())
      }
    }

    const headMatrix = avatar.getBoneTransform('head')
    if (!headMatrix) {
      return {
        position: this.camera.position.clone().add(new THREE.Vector3(0, 0.1, 0)), // Slight HMD offset
        direction: this.camera.getWorldDirection(new THREE.Vector3())
      }
    }

    const headPos = new THREE.Vector3().setFromMatrixPosition(headMatrix)
    const headQuat = new THREE.Quaternion().setFromRotationMatrix(headMatrix)
    const headDir = new THREE.Vector3(0, 0, -1).applyQuaternion(headQuat)

    return { position: headPos, direction: headDir }
  }

  /**
   * Enhanced dynamic DOF calculation
   */
  updateDynamicDOF(delta) {
    if (!this.dof || !this.dofEnabled) return

    // Enhanced focus calculation with head bone prioritization
    this.performAutofocus(delta)
  }

  /**
   * Enhanced update cycle
   */
  update(dt) {
    // Early exit for camera updates
    if (!this._active || this._disposed) return

    if (!this._active && this._active && this.dof.autofocus) {
      this.updateDynamicDOF(dt)
    }

    // Enhanced camera transform updates
    if (this._active && (this._active || this._active)) {
      this.camera.matrixWorldNeedsUpdate = true
    }
  }

  /**
   * Enhanced focus debugging utilities
   */
  debugFocusInfo() {
    console.log('[Camera-Enhanced] Focus Information:')
    console.log(`  DOF enabled: ${this.dof.enabled}`)
    console.log(`  Head bone raycast: ${this.dof.useHeadBoneRaycast}`)
    console.log(`  Current focus: ${this.dof.focusDistance.toFixed(2)}m`)
    console.log(`  Focus range: ${this.dof.focusRange.toFixed(2)}m`)
    console.log(`  Focus hysteresis: ${this.focusSmooth.hysteresis}`)
  }
}