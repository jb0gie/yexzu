// Camera DOF Bridge - Paste this in browser console to connect the app UI to actual DOF
// This creates a bridge between the app's CONFIG values and the world's DOF system

// Run this in browser console:
(function () {
  console.log('=== Camera DOF Bridge Active ===')

  // Check if world and camera controls exist
  if (!window.world) {
    console.error('World not found! Make sure you are in a Hyperfy world.')
    return
  }

  if (!window.world.cameraControls) {
    console.warn('Camera controls not found. DOF might not be available.')
  }

  // Create a global bridge object that the app can write to
  window.CAMERA_BRIDGE = {
    DOF_ENABLED: false,
    DOF_FOCUS_DISTANCE: 10,
    DOF_FOCUS_RANGE: 5,
    DOF_BOKEH_SCALE: 1,
    SHOW_HELPERS: false
  }

  // Apply settings function
  function applyDOFSettings() {
    try {
      // Apply through camera controls if available
      if (window.world.cameraControls) {
        if (window.CAMERA_BRIDGE.DOF_ENABLED) {
          window.world.cameraControls.enableDOF()
          // Only apply DOF settings when enabled
          window.world.cameraControls.setDOFFocusDistance(window.CAMERA_BRIDGE.DOF_FOCUS_DISTANCE)
          window.world.cameraControls.setDOFFocusRange(window.CAMERA_BRIDGE.DOF_FOCUS_RANGE)
          window.world.cameraControls.setDOFBokehScale(window.CAMERA_BRIDGE.DOF_BOKEH_SCALE)
        } else {
          window.world.cameraControls.disableDOF()
        }

        if (window.CAMERA_BRIDGE.SHOW_HELPERS) {
          window.world.cameraControls.showHelpers()
        } else {
          window.world.cameraControls.hideHelpers()
        }
      }

      // Apply directly to graphics system if available
      if (window.world.graphics && window.world.graphics.dof) {
        window.world.graphics.dofEnabled = window.CAMERA_BRIDGE.DOF_ENABLED

        // Only update uniforms when DOF is enabled
        if (window.CAMERA_BRIDGE.DOF_ENABLED) {
          // Update using the circleOfConfusionMaterial for world units
          if (window.world.graphics.dof.circleOfConfusionMaterial) {
            const cocUniforms = window.world.graphics.dof.circleOfConfusionMaterial.uniforms
            if (cocUniforms.focusDistance) {
              cocUniforms.focusDistance.value = window.CAMERA_BRIDGE.DOF_FOCUS_DISTANCE
            }
            if (cocUniforms.focusRange) {
              cocUniforms.focusRange.value = window.CAMERA_BRIDGE.DOF_FOCUS_RANGE
            }
          }

          // Update bokeh scale on bokehMaterial
          if (window.world.graphics.dof.bokehMaterial) {
            const bokehUniforms = window.world.graphics.dof.bokehMaterial.uniforms
            if (bokehUniforms.scale) {
              bokehUniforms.scale.value = window.CAMERA_BRIDGE.DOF_BOKEH_SCALE
            }
          }
        }

        if (window.world.graphics.updatePostProcessingEffects) {
          window.world.graphics.updatePostProcessingEffects()
        }
      }
    } catch (e) {
      console.error('Error applying DOF settings:', e)
    }
  }

  // Poll for changes every frame
  let lastDOF = false
  let lastFocus = 10
  let lastRange = 5
  let lastBokeh = 1
  let lastHelpers = false

  function checkForChanges() {
    if (window.CAMERA_BRIDGE.DOF_ENABLED !== lastDOF ||
      window.CAMERA_BRIDGE.DOF_FOCUS_DISTANCE !== lastFocus ||
      window.CAMERA_BRIDGE.DOF_FOCUS_RANGE !== lastRange ||
      window.CAMERA_BRIDGE.DOF_BOKEH_SCALE !== lastBokeh ||
      window.CAMERA_BRIDGE.SHOW_HELPERS !== lastHelpers) {

      lastDOF = window.CAMERA_BRIDGE.DOF_ENABLED
      lastFocus = window.CAMERA_BRIDGE.DOF_FOCUS_DISTANCE
      lastRange = window.CAMERA_BRIDGE.DOF_FOCUS_RANGE
      lastBokeh = window.CAMERA_BRIDGE.DOF_BOKEH_SCALE
      lastHelpers = window.CAMERA_BRIDGE.SHOW_HELPERS

      console.log('DOF Settings Changed:', {
        enabled: lastDOF,
        focus: lastFocus,
        range: lastRange,
        bokeh: lastBokeh,
        helpers: lastHelpers
      })

      applyDOFSettings()
    }

    requestAnimationFrame(checkForChanges)
  }

  checkForChanges()

  // Provide manual control functions
  window.cameraDOF = {
    enable: () => {
      window.CAMERA_BRIDGE.DOF_ENABLED = true
      applyDOFSettings()
    },
    disable: () => {
      window.CAMERA_BRIDGE.DOF_ENABLED = false
      applyDOFSettings()
    },
    setFocus: (distance) => {
      window.CAMERA_BRIDGE.DOF_FOCUS_DISTANCE = distance
      applyDOFSettings()
    },
    setRange: (range) => {
      window.CAMERA_BRIDGE.DOF_FOCUS_RANGE = range
      applyDOFSettings()
    },
    setBokeh: (scale) => {
      window.CAMERA_BRIDGE.DOF_BOKEH_SCALE = scale
      applyDOFSettings()
    },
    showHelpers: () => {
      window.CAMERA_BRIDGE.SHOW_HELPERS = true
      applyDOFSettings()
    },
    hideHelpers: () => {
      window.CAMERA_BRIDGE.SHOW_HELPERS = false
      applyDOFSettings()
    },
    // New autofocus functions using raycast
    autoFocusRaycast: () => {
      if (window.world.cameraControls && window.world.cameraControls.autoFocusRaycast) {
        const distance = window.world.cameraControls.autoFocusRaycast()
        if (distance !== null) {
          window.CAMERA_BRIDGE.DOF_FOCUS_DISTANCE = distance
          console.log('Raycast autofocus: distance =', distance.toFixed(2))
          return distance
        }
      }
      console.warn('Raycast autofocus not available or no target found')
      return null
    },
    autoFocusPlayer: () => {
      if (window.world.cameraControls && window.world.cameraControls.autoFocusPlayer) {
        const distance = window.world.cameraControls.autoFocusPlayer()
        if (distance !== null) {
          window.CAMERA_BRIDGE.DOF_FOCUS_DISTANCE = distance
          console.log('Player autofocus: distance =', distance.toFixed(2))
          return distance
        }
      }
      console.warn('Player autofocus not available or player not found')
      return null
    },
    status: () => {
      console.log('Current DOF Settings:', window.CAMERA_BRIDGE)
      console.log('Camera controls available:', !!window.world.cameraControls)
      console.log('Graphics DOF available:', !!(window.world.graphics && window.world.graphics.dof))
      if (window.world.cameraControls && window.world.cameraControls.raycastFocusDistance) {
        const raycastDist = window.world.cameraControls.raycastFocusDistance()
        if (raycastDist !== null) {
          console.log('Raycast distance to center:', raycastDist.toFixed(2))
        }
      }
      if (window.world.cameraControls && window.world.cameraControls.getFocusDistanceToPlayer) {
        const playerDist = window.world.cameraControls.getFocusDistanceToPlayer()
        if (playerDist !== null) {
          console.log('Distance to player:', playerDist.toFixed(2))
        }
      }
    }
  }

  console.log('Bridge ready! Use window.cameraDOF for manual control')
  console.log('Available commands:')
  console.log('  cameraDOF.enable()')
  console.log('  cameraDOF.disable()')
  console.log('  cameraDOF.setFocus(10)')
  console.log('  cameraDOF.setRange(5)')
  console.log('  cameraDOF.setBokeh(2)')
  console.log('  cameraDOF.showHelpers()')
  console.log('  cameraDOF.autoFocusRaycast() - Focus on object at screen center')
  console.log('  cameraDOF.autoFocusPlayer() - Focus on player')
  console.log('  cameraDOF.status()')
})();