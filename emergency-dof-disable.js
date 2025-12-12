// EMERGENCY DOF DISABLE AND CAMERA RESET
// This script completely disables all DOF and resets camera to safe defaults

import { world } from 'hyperfy'

export default function EmergencyDOFDisable() {
  console.log('🚨 EMERGENCY DOF DISABLE AND CAMERA RESET')
  console.log('🛑 Disabling all DOF functionality...')

  // Step 1: Completely disable all DOF
  const disableAllDOF = () => {
    try {
      // Disable DOF in preferences
      if (world.prefs) {
        world.prefs.setDOFEnabled(false)
        world.prefs.setDOFFocusDistance(10)
        world.prefs.setDOFFocusRange(5)
        world.prefs.setDOFBokehScale(0)
        console.log('✅ DOF disabled in preferences')
      }

      // Disable camera controls
      if (world.cameraControls) {
        world.cameraControls.enabled = false
        world.cameraControls.dynamicDOF = false
        world.cameraControls.reticleAutofocus = false
        world.cameraControls.playerAutofocus = false
        console.log('✅ Camera controls DOF disabled')
      }

      // Reset camera DOF settings
      if (world.camera) {
        if (world.camera.dof) {
          world.camera.dof.enabled = false
          world.camera.dof.autofocus = false
          console.log('✅ Camera DOF settings reset')
        }
      }

      console.log('🛑 All DOF functionality disabled')
    } catch (error) {
      console.error('❌ Error disabling DOF:', error)
    }
  }

  // Step 2: Reset camera to safe defaults
  const resetCamera = () => {
    try {
      if (world.camera) {
        // Reset camera position and rotation
        world.camera.position.set(0, 0, 0)
        world.camera.rotation.set(0, 0, 0)
        world.camera.zoom = 1
        world.camera.fov = 75
        world.camera.near = 0.1
        world.camera.far = 1000
        world.camera.updateProjectionMatrix()
        console.log('✅ Camera position and settings reset')
      }

      // Reset player camera zoom
      if (world.entities?.player) {
        world.entities.player.cam.zoom = 1
        console.log('✅ Player camera zoom reset')
      }

      console.log('🔄 Camera reset to safe defaults')
    } catch (error) {
      console.error('❌ Error resetting camera:', error)
    }
  }

  // Step 3: Clear any post-processing effects
  const clearPostProcessing = () => {
    try {
      if (world.camera && world.camera.effects) {
        // Remove DOF effect if it exists
        if (world.camera.effects.dof) {
          world.camera.effects.dof = null
          console.log('✅ DOF effect removed from camera')
        }

        // Reset other effects to safe values
        if (world.camera.effects.bloom) {
          world.camera.effects.bloom.enabled = false
        }
        if (world.camera.effects.vignette) {
          world.camera.effects.vignette.enabled = false
        }
        console.log('✅ Post-processing effects reset')
      }
    } catch (error) {
      console.error('❌ Error clearing post-processing:', error)
    }
  }

  // Step 4: Force scene re-render
  const forceReRender = () => {
    try {
      if (world.stage && world.stage.scene) {
        // Force scene update
        world.stage.scene.updateMatrixWorld(true)
        console.log('✅ Scene matrix updated')
      }

      // Force camera update
      if (world.camera) {
        world.camera.updateMatrixWorld(true)
        world.camera.updateProjectionMatrix()
        console.log('✅ Camera matrices updated')
      }
    } catch (error) {
      console.error('❌ Error forcing re-render:', error)
    }
  }

  // Step 5: Add emergency commands
  const addEmergencyCommands = () => {
    // Emergency disable all DOF
    world.chat.bindCommand('emergency-disable-all', () => {
      console.log('🚨 EMERGENCY: Disabling ALL DOF...')
      disableAllDOF()
      resetCamera()
      clearPostProcessing()
      forceReRender()
      return 'All DOF emergency disabled'
    })

    // Reset camera completely
    world.chat.bindCommand('reset-camera', () => {
      console.log('🔄 EMERGENCY: Resetting camera...')
      resetCamera()
      clearPostProcessing()
      forceReRender()
      return 'Camera reset to defaults'
    })

    // Full system reset
    world.chat.bindCommand('full-reset', () => {
      console.log('🔄 EMERGENCY: Full system reset...')
      disableAllDOF()
      resetCamera()
      clearPostProcessing()
      forceReRender()

      // Reload page suggestion
      setTimeout(() => {
        console.log('💡 If black screen persists, try reloading the page')
      }, 2000)

      return 'Full system reset complete'
    })

    // Debug camera status
    world.chat.bindCommand('debug-camera', () => {
      const status = {
        camera: !!world.camera,
        cameraDOF: world.camera?.dof?.enabled || false,
        prefsDOF: world.prefs?.dofEnabled || false,
        controlsEnabled: world.cameraControls?.enabled || false,
        playerZoom: world.entities?.player?.cam?.zoom || 'unknown',
        cameraPosition: world.camera
          ? `${world.camera.position.x.toFixed(2)}, ${world.camera.position.y.toFixed(2)}, ${world.camera.position.z.toFixed(2)}`
          : 'unknown',
      }
      console.log('📊 Camera Status:', status)
      return status
    })

    // Test if scene is visible
    world.chat.bindCommand('test-visibility', () => {
      if (world.stage?.scene?.children?.length > 0) {
        console.log('✅ Scene has objects:', world.stage.scene.children.length)
        return `Scene visible with ${world.stage.scene.children.length} objects`
      } else {
        console.log('❌ Scene appears empty')
        return 'Scene may be empty or not rendering'
      }
    })
  }

  // Execute emergency procedures
  console.log('🛑 Executing emergency DOF disable procedures...')

  disableAllDOF()
  setTimeout(resetCamera, 100)
  setTimeout(clearPostProcessing, 200)
  setTimeout(forceReRender, 300)
  setTimeout(addEmergencyCommands, 500)

  console.log('\n🚨 EMERGENCY PROCEDURES COMPLETE')
  console.log('📋 Available emergency commands:')
  console.log('   /emergency-disable-all - Complete DOF disable')
  console.log('   /reset-camera - Reset camera to defaults')
  console.log('   /full-reset - Full system reset')
  console.log('   /debug-camera - Show camera status')
  console.log('   /test-visibility - Check if scene is visible')

  console.log('\n💡 If black screen persists:')
  console.log('   1. Try /full-reset')
  console.log('   2. Check browser console for errors')
  console.log('   3. Reload the page if needed')
  console.log('   4. Check if other scripts are interfering')

  // Auto-check after 5 seconds
  setTimeout(() => {
    console.log('\n🔍 Auto-checking system status...')
    if (world.stage?.scene?.children?.length === 0) {
      console.log('⚠️  WARNING: Scene appears to be empty')
      console.log('💡 This suggests a deeper rendering issue')
    } else if (world.stage?.scene?.children?.length > 0) {
      console.log('✅ Scene has objects, rendering should work')
      console.log('💡 If still black screen, issue may be with camera position or effects')
    }
  }, 5000)
}
