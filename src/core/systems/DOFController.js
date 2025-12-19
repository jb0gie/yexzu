import * as THREE from '../extras/three'
import { Raycaster, Vector3, Quaternion, Matrix4 } from '../extras/three'

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
    this.focusHysteresis = 0.1  // Lower threshold for visible focus changes

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
    this.q1 = new Quaternion()
  }

  /**
   * Update DOF focus (called each frame)
   */
  update(delta) {
    if (!this.world.prefs?.dofEnabled) {
      console.warn('[DOF] SKIPPED - dofEnabled is false')
      return
    }
    if (!this.world.camera) {
      console.warn('[DOF] SKIPPED - no camera')
      return
    }

    console.log('[DOF] ==========================================')
    console.log('[DOF] UPDATE START - delta:', delta)

    // Calculate target focus distance
    this._updateTargetFocusDistance()

    // Smooth focus transition
    if (this.world.prefs.focusSmoothing) {
      this._smoothFocusTransition(delta)
    } else {
      this.currentFocusDistance = this.targetFocusDistance
    }

    console.log('[DOF] Current focus:', this.currentFocusDistance.toFixed(2), 'm')
    console.log('[DOF] Target focus:', this.targetFocusDistance.toFixed(2), 'm')

    // Update DOF uniforms
    this._updateDofUniforms()

    console.log('[DOF] UPDATE END')
    console.log('[DOF] ==========================================')
  }

  /**
   * Update target focus distance based on raycast or fallback
   */
  _updateTargetFocusDistance() {
    console.log('[DOF] _updateTargetFocusDistance() called')
    console.log('[DOF] Current target focus:', this.targetFocusDistance.toFixed(2))

    const raycastDistance = this._getRaycastFocusDistance()
    console.log('[DOF] Raycast result:', raycastDistance)

    if (raycastDistance !== null) {
      // Raycast succeeded - update focus with hysteresis
      const distanceDelta = Math.abs(raycastDistance - this.targetFocusDistance)
      console.log('[DOF] Raycast distance:', raycastDistance.toFixed(2), 'm')
      console.log('[DOF] Distance delta:', distanceDelta.toFixed(2), 'm (hysteresis:', this.focusHysteresis, ')')

      if (distanceDelta > this.focusHysteresis) {
        console.log('[DOF] APPLYING raycast focus - delta > hysteresis')
        this.targetFocusDistance = raycastDistance
      } else {
        console.log('[DOF] SKIPPING raycast focus - delta <= hysteresis')
      }
    } else {
      console.log('[DOF] Raycast returned NULL - using FALLBACK')
      // Raycast failed - use fallback from zoom-based calculation
      const distanceDelta = Math.abs(this.fallbackFocusDistance - this.targetFocusDistance)
      console.log('[DOF] Fallback distance:', this.fallbackFocusDistance.toFixed(2), 'm')
      console.log('[DOF] Fallback delta:', distanceDelta.toFixed(2), 'm')

      if (distanceDelta > this.focusHysteresis) {
        console.log('[DOF] APPLYING fallback focus')
        this.targetFocusDistance = this.fallbackFocusDistance
      } else {
        console.log('[DOF] SKIPPING fallback focus')
      }
    }

    console.log('[DOF] Final target focus:', this.targetFocusDistance.toFixed(2), 'm')
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
    console.log('[DOF] _getRaycastFocusDistance() called - useHeadBoneRaycast:', this.useHeadBoneRaycast)

    // Try head bone raycast first
    if (this.useHeadBoneRaycast) {
      const headFocus = this._raycastFromPlayerHead()
      console.log('[DOF] Head bone raycast result:', headFocus)
      if (headFocus !== null) {
        console.log('[DOF] Using HEAD BONE raycast:', headFocus.toFixed(2), 'm')
        return headFocus
      }
      console.log('[DOF] Head bone raycast FAILED - trying reticle')
    }

    // Fallback to reticle raycast
    const reticleFocus = this._raycastFromReticle()
    console.log('[DOF] Reticle raycast result:', reticleFocus)
    if (reticleFocus !== null) {
      console.log('[DOF] Using RETICLE raycast:', reticleFocus.toFixed(2), 'm')
    } else {
      console.log('[DOF] BOTH raycasts FAILED')
    }
    return reticleFocus
  }

  /**
   * Raycast from player head bone
   */
  _raycastFromPlayerHead() {
    console.log('[DOF] _raycastFromPlayerHead() called')

    const player = this.world.entities.player
    if (!player?.avatar) {
      console.log('[DOF] NO PLAYER or AVATAR')
      return null
    }

    console.log('[DOF] Player found:', !!player)
    console.log('[DOF] Avatar found:', !!player.avatar)

    try {
      const headMatrix = player.avatar.getBoneTransform('head')
      console.log('[DOF] Head bone matrix:', headMatrix)

      if (!headMatrix) {
        console.log('[DOF] Head bone matrix is NULL')
        return null
      }

      const headPos = this.v1.setFromMatrixPosition(headMatrix)
      const forward = this.v3.set(0, 0, -1).transformDirection(headMatrix)

      console.log('[DOF] Head position:', headPos)
      console.log('[DOF] Forward direction:', forward)

      const result = this._performRaycast(headPos, forward)
      console.log('[DOF] Raycast result from head:', result)

      return result
    } catch (err) {
      console.error('[DOF] HEAD RAYCAST ERROR:', err)
      return null
    }
  }

  /**
   * Raycast from camera/reticle
   */
  _raycastFromReticle() {
    console.log('[DOF] _raycastFromReticle() called')

    if (!this.world.stage?.viewport) {
      console.log('[DOF] NO STAGE or VIEWPORT')
      return null
    }

    try {
      const hits = this.world.stage.raycastReticle()
      console.log('[DOF] Reticle raycast hits:', hits?.length || 0)

      const result = this._processRaycastHits(hits)
      console.log('[DOF] Processed reticle result:', result)

      return result
    } catch (err) {
      console.error('[DOF] RETICLE RAYCAST ERROR:', err)
      return null
    }
  }

  /**
   * Perform raycast and get distance
   */
  _performRaycast(origin, direction) {
    console.log('[DOF] _performRaycast() called')
    console.log('[DOF] Origin:', origin)
    console.log('[DOF] Direction:', direction)

    this.raycaster.set(origin, direction)
    console.log('[DOF] Raycaster set')

    const intersectables = this.world.stage?.scene
    console.log('[DOF] Scene available:', !!intersectables)

    if (!intersectables) {
      console.log('[DOF] NO SCENE to raycast against')
      return null
    }

    console.log('[DOF] Scene children count:', intersectables.children?.length || 0)

    const intersects = this.raycaster.intersectObjects(
      intersectables.children || [],
      true
    )

    console.log('[DOF] Raw intersects count:', intersects.length)
    console.log('[DOF] Raw intersects:', intersects)

    const result = this._processRaycastHits(intersects)
    console.log('[DOF] Processed result:', result)

    return result
  }

  /**
   * Process raycast hits and extract distance
   */
  _processRaycastHits(hits) {
    console.log('[DOF] _processRaycastHits() called with', hits?.length || 0, 'hits')

    if (!hits || hits.length === 0) {
      console.log('[DOF] NO HITS')
      return null
    }

    console.log('[DOF] All hits:')
    hits.forEach((hit, i) => {
      console.log(`[DOF]   Hit ${i}: distance=${hit.distance}, object=${hit.object?.name || hit.object?.type}`)
    })

    // Filter out very close hits (likely the player)
    const validHits = hits.filter(hit => hit.distance > 0.5)
    console.log('[DOF] After filtering <0.5m: count =', validHits.length)

    if (validHits.length === 0) {
      console.log('[DOF] NO VALID HITS after filtering')
      return null
    }

    const distance = validHits[0].distance
    console.log('[DOF] Best hit distance:', distance)

    // Filter out sky/background (camera far plane)
    const camFar = this.world.camera.far || 1200
    const maxDistance = camFar * 0.8
    console.log('[DOF] Max distance allowed:', maxDistance.toFixed(2))
    console.log('[DOF] Hit distance vs max:', distance > maxDistance ? 'TOO FAR' : 'OK')

    if (distance > maxDistance) {
      console.log('[DOF] SKIPPED - Hit is too far (likely skybox)')
      return null
    }

    console.log('[DOF] ACCEPTED distance:', distance.toFixed(2), 'm')
    return distance
  }

  /**
   * Update DOF uniforms through EffectRegistry
   */
  _updateDofUniforms() {
    console.log('[DOF] _updateDofUniforms() called')

    if (!this.world.graphics?.effectRegistry) {
      console.log('[DOF] NO EFFECT REGISTRY')
      return
    }

    const dof = this.world.graphics.effectRegistry.instances.get('dof')
    if (!dof) {
      console.log('[DOF] NO DOF EFFECT INSTANCE')
      return
    }

    console.log('[DOF] Setting worldFocusDistance to:', this.currentFocusDistance.toFixed(2))

    // Update world focus distance directly on the effect
    dof.worldFocusDistance = this.currentFocusDistance

    // Recompile effect to apply changes
    if (dof.recompile && typeof dof.recompile === 'function') {
      console.log('[DOF] Recompiling effect')
      dof.recompile()
    } else {
      console.log('[DOF] NO recompile method on effect')
    }
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
