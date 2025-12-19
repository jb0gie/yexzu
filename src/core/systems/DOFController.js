import * as THREE from '../extras/three'
import { Raycaster, Vector3 } from '../extras/three'

/**
 * Dedicated DOF (Depth of Field) Controller
 *
 * Manages all DOF-related functionality:
 * - Focus distance calculation via raycast
 * - Smooth focus transitions
 * - Hysteresis to prevent jumping
 * - Far plane filtering
 * - Uniform updates through EffectRegistry
 */

export class DOFController {
  constructor(world) {
    this.world = world

    // Focus state
    this.currentFocusDistance = 10
    this.targetFocusDistance = 10
    this.focusSpeed = 0.08
    this.focusHysteresis = 1.5

    // Raycast state
    this.useHeadBoneRaycast = true
    this.lastRaycastPerformance = 0
    this.debugDOF = false

    // Fallback focus distance (from zoom-based calculation)
    this.fallbackFocusDistance = 10

    // Raycaster for focus detection
    this.raycaster = new Raycaster()

    // Vectors for raycasting
    this.v1 = new Vector3()
    this.v2 = new Vector3()
    this.v3 = new Vector3()
  }

  /**
   * Update DOF focus (called each frame)
   */
  update(delta) {
    if (!this.world.prefs?.dofEnabled) return
    if (!this.world.camera) return

    // Calculate target focus distance
    this._updateTargetFocusDistance()

    // Smooth focus transition
    if (this.world.prefs.focusSmoothing) {
      this._smoothFocusTransition(delta)
    } else {
      this.currentFocusDistance = this.targetFocusDistance
    }

    // Update DOF uniforms
    this._updateDofUniforms()
  }

  /**
   * Update target focus distance based on raycast or fallback
   */
  _updateTargetFocusDistance() {
    const raycastDistance = this._getRaycastFocusDistance()

    if (raycastDistance !== null) {
      // Raycast succeeded - update focus with hysteresis
      const distanceDelta = Math.abs(raycastDistance - this.targetFocusDistance)

      if (distanceDelta > this.focusHysteresis) {
        this.targetFocusDistance = raycastDistance

        if (this.debugDOF) {
          console.log(`[DOF] Raycast focus: ${this.targetFocusDistance.toFixed(1)}m`)
        }
      }
    } else {
      // Raycast failed - use fallback from zoom-based calculation
      const distanceDelta = Math.abs(this.fallbackFocusDistance - this.targetFocusDistance)

      if (distanceDelta > this.focusHysteresis) {
        this.targetFocusDistance = this.fallbackFocusDistance

        if (this.debugDOF) {
          console.log(`[DOF] Fallback focus: ${this.targetFocusDistance.toFixed(1)}m`)
        }
      }
    }
  }

  /**
   * Smooth focus transition using exponential smoothing
   */
  _smoothFocusTransition(delta) {
    const smoothing = 1 - Math.exp(-this.focusSpeed * delta)
    this.currentFocusDistance += (this.targetFocusDistance - this.currentFocusDistance) * smoothing
  }

  /**
   * Get focus distance via raycast
   * Priority 1: Player head bone
   * Priority 2: Reticle/camera center
   */
  _getRaycastFocusDistance() {
    // Try head bone raycast first
    if (this.useHeadBoneRaycast) {
      const headFocus = this._raycastFromPlayerHead()
      if (headFocus !== null) return headFocus
    }

    // Fallback to reticle raycast
    return this._raycastFromReticle()
  }

  /**
   * Raycast from player head bone
   */
  _raycastFromPlayerHead() {
    const player = this.world.entities.player
    if (!player?.avatar) return null

    try {
      const headMatrix = player.avatar.getBoneTransform('head')
      if (!headMatrix) return null

      const headPos = this.v1.setFromMatrixPosition(headMatrix)
      const headQuat = this.v2.setFromRotationMatrix(headMatrix)
      const forward = this.v3.set(0, 0, -1).applyQuaternion(headQuat)

      return this._performRaycast(headPos, forward)
    } catch (err) {
      if (this.debugDOF) console.warn('[DOF] Head raycast error:', err)
      return null
    }
  }

  /**
   * Raycast from camera/reticle
   */
  _raycastFromReticle() {
    if (!this.world.stage?.viewport) return null

    try {
      const hits = this.world.stage.raycastReticle()
      return this._processRaycastHits(hits)
    } catch (err) {
      if (this.debugDOF) console.warn('[DOF] Reticle raycast error:', err)
      return null
    }
  }

  /**
   * Perform raycast and get distance
   */
  _performRaycast(origin, direction) {
    this.raycaster.set(origin, direction)

    const intersectables = this.world.stage?.scene
    if (!intersectables) return null

    const intersects = this.raycaster.intersectObjects(
      intersectables.children || [],
      true
    )

    return this._processRaycastHits(intersects)
  }

  /**
   * Process raycast hits and extract distance
   */
  _processRaycastHits(hits) {
    if (!hits || hits.length === 0) return null

    // Filter out very close hits (likely the player)
    const validHits = hits.filter(hit => hit.distance > 0.5)
    if (validHits.length === 0) return null

    const distance = validHits[0].distance

    // Filter out sky/background (camera far plane)
    const camFar = this.world.camera.far || 1200
    if (distance > camFar * 0.8) return null

    return distance
  }

  /**
   * Update DOF uniforms through EffectRegistry
   */
  _updateDofUniforms() {
    if (!this.world.graphics?.effectRegistry) return

    const registry = this.world.graphics.effectRegistry
    const focus = this.currentFocusDistance
    const range = this.world.prefs.dofFocusRange || 20
    const bokeh = this.world.prefs.dofBokehScale || 1

    // Update focus distance
    registry.updateUniform('dof', 'circleOfConfusionMaterial.uniforms.focusDistance', focus)

    // Update focus range (converted to f-stop)
    const fStop = Math.max(0.5, Math.min(32, range / Math.max(1e-6, focus)))
    registry.updateUniform('dof', 'circleOfConfusionMaterial.uniforms.fStop', fStop)

    // Update bokeh scale
    registry.updateUniform('dof', 'circleOfConfusionMaterial.uniforms.maxBlur', bokeh)
  }

  /**
   * Get current focus distance (for external use)
   */
  getFocusDistance() {
    return this.currentFocusDistance
  }

  /**
   * Set fallback focus distance (from zoom-based calculation)
   */
  setFallbackFocusDistance(distance) {
    this.fallbackFocusDistance = Math.max(0.1, distance)
  }

  /**
   * Set target focus distance (for external use)
   */
  setFocusDistance(distance) {
    this.targetFocusDistance = Math.max(0.1, distance)
  }

  /**
   * Set focus speed
   */
  setFocusSpeed(speed) {
    this.focusSpeed = Math.max(0.01, Math.min(1, speed))
  }

  /**
   * Toggle debug logging
   */
  setDebug(enabled) {
    this.debugDOF = enabled
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Cleanup if needed
  }
}
