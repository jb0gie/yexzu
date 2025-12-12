// SAFE MINIMAL DOF IMPLEMENTATION
// This adds the original head raycast functionality without risking black screens

import { world } from 'hyperfy'

export default function SafeMinimalDOF() {
  console.log('🔧 Safe Minimal DOF Implementation Loading...')

  // Add the original raycastFromPlayerHead method to camera controls
  const addRaycastMethod = () => {
    const cameraControls = world.cameraControls
    if (!cameraControls) {
      console.log('⚠️  Camera controls not ready, retrying...')
      setTimeout(addRaycastMethod, 1000)
      return
    }

    // Add the original raycast method
    cameraControls.raycastFromPlayerHead = function () {
      if (!this.world.entities?.player || !this.world.camera || !this.world.stage) {
        return null
      }

      const player = this.world.entities.player
      if (!player.entity?.position) return null

      try {
        // Get player head position
        const headPos = player.entity.position.clone()
        headPos.y += 1.6 // Standard eye height

        // Get camera direction
        const cameraDir = new THREE.Vector3()
        this.world.camera.getWorldDirection(cameraDir)

        // Set up raycaster
        this.raycaster.set(headPos, cameraDir)

        // Get intersectable objects from stage scene
        const scene = this.world.stage?.scene
        if (!scene) return null

        // Perform raycast
        const intersects = this.raycaster.intersectObjects(scene.children, true)

        if (intersects.length > 0) {
          // Filter out very close hits (likely the player)
          const validHits = intersects.filter(hit => hit.distance > 0.5)
          if (validHits.length > 0) {
            return validHits[0].distance
          }
        }

        return null
      } catch (error) {
        console.error('raycastFromPlayerHead error:', error)
        return null
      }
    }

    console.log('✅ Added raycastFromPlayerHead method to camera controls')
  }

  // Add minimal DOF integration
  const addMinimalDOF = () => {
    const cameraControls = world.cameraControls
    if (!cameraControls || typeof cameraControls.raycastFromPlayerHead !== 'function') {
      setTimeout(addMinimalDOF, 500)
      return
    }

    // Store original update method
    const originalUpdate = cameraControls.update
    if (!originalUpdate) {
      console.log('⚠️  No update method found in camera controls')
      return
    }

    // Add minimal DOF integration that won't cause black screens
    cameraControls.update = function (delta) {
      try {
        // Call original update
        originalUpdate.call(this, delta)

        // Only run if DOF is enabled and we have the raycast method
        if (!this.enabled || !this.world.prefs.dofEnabled) return
        if (typeof this.raycastFromPlayerHead !== 'function') return

        // Get head raycast distance
        const headDistance = this.raycastFromPlayerHead()

        // Only apply if we got a valid distance
        if (headDistance !== null && headDistance > 0 && isFinite(headDistance)) {
          // Apply focus distance with safety checks
          const safeDistance = Math.max(1, Math.min(100, headDistance))
          this.world.prefs.setDOFFocusDistance(safeDistance)

          // Set a reasonable focus range
          const safeRange = Math.max(2, Math.min(20, safeDistance * 0.3))
          this.world.prefs.setDOFFocusRange(safeRange)
        }
      } catch (error) {
        console.error('DOF update error:', error)
        // Emergency disable on error
        this.enabled = false
        this.world.prefs.setDOFEnabled(false)
      }
    }

    console.log('✅ Added minimal DOF integration')
  }

  // Add emergency disable functionality
  const addEmergencyControls = () => {
    world.chat.bindCommand('emergency-disable-dof', () => {
      console.log('🚨 Emergency DOF disable activated')
      if (world.cameraControls) {
        world.cameraControls.enabled = false
      }
      if (world.prefs) {
        world.prefs.setDOFEnabled(false)
      }
      return 'DOF emergency disabled'
    })

    world.chat.bindCommand('test-head-raycast', () => {
      if (world.cameraControls && typeof world.cameraControls.raycastFromPlayerHead === 'function') {
        const result = world.cameraControls.raycastFromPlayerHead()
        console.log(`Head raycast result: ${result}`)
        return result
      }
      return 'Head raycast method not available'
    })
  }

  // Initialize
  setTimeout(addRaycastMethod, 100)
  setTimeout(addMinimalDOF, 500)
  setTimeout(addEmergencyControls, 1000)

  console.log('🔧 Safe Minimal DOF Implementation Loaded')
  console.log('📋 Features:')
  console.log('   ✅ Original head raycast method')
  console.log('   ✅ Minimal DOF integration')
  console.log('   ✅ Emergency disable functionality')
  console.log('   ✅ Extensive error handling')
  console.log('\n💡 Commands:')
  console.log('   /emergency-disable-dof - Disable DOF if issues occur')
  console.log('   /test-head-raycast - Test the head raycast method')
}
