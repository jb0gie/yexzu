// TEST RESTORED ORIGINAL DOF IMPLEMENTATION
// This tests the original DOF system restored from git

import { world } from 'hyperfy'

export default function TestRestoredDOF() {
  console.log('🔬 Testing Restored Original DOF Implementation')

  let testResults = {
    cameraControlsLoaded: false,
    raycastMethodExists: false,
    raycastWorks: false,
    dofSettingsCorrect: false,
    noBlackScreen: true,
  }

  // Test 1: Check if camera controls are loaded
  setTimeout(() => {
    const cameraControls = world.cameraControls
    if (cameraControls) {
      testResults.cameraControlsLoaded = true
      console.log('✅ Camera controls loaded')

      // Check if raycast method exists
      if (typeof cameraControls.raycastFromPlayerHead === 'function') {
        testResults.raycastMethodExists = true
        console.log('✅ raycastFromPlayerHead method exists')

        // Test the raycast method
        try {
          const result = cameraControls.raycastFromPlayerHead()
          if (result !== null && result !== undefined) {
            testResults.raycastWorks = true
            console.log(`✅ raycastFromPlayerHead works: ${result.toFixed(2)}m`)
          } else {
            console.log(`⚠️  raycastFromPlayerHead returned null (no objects in scene?)`)
          }
        } catch (error) {
          console.error('❌ raycastFromPlayerHead error:', error)
        }
      } else {
        console.log('❌ raycastFromPlayerHead method not found')
      }
    } else {
      console.log('❌ Camera controls not loaded')
    }
  }, 1000)

  // Test 2: Check DOF settings
  setTimeout(() => {
    const prefs = world.prefs
    if (prefs) {
      console.log('📊 DOF Settings:')
      console.log(`   DOF Enabled: ${prefs.dofEnabled}`)
      console.log(`   Focus Distance: ${prefs.dofFocusDistance}`)
      console.log(`   Focus Range: ${prefs.dofFocusRange}`)
      console.log(`   Bokeh Scale: ${prefs.dofBokehScale}`)

      // Check if settings are reasonable
      if (
        prefs.dofEnabled === false &&
        prefs.dofFocusDistance === 10 &&
        prefs.dofFocusRange === 5 &&
        prefs.dofBokehScale === 1
      ) {
        testResults.dofSettingsCorrect = true
        console.log('✅ DOF settings are at safe defaults')
      } else {
        console.log('⚠️  DOF settings differ from defaults')
      }
    }
  }, 2000)

  // Test 3: Enable DOF and test functionality
  setTimeout(() => {
    const cameraControls = world.cameraControls
    const prefs = world.prefs

    if (cameraControls && prefs) {
      console.log('🧪 Enabling DOF for testing...')

      // Enable camera controls
      cameraControls.enabled = true
      console.log('✅ Camera controls enabled')

      // Enable DOF
      prefs.setDOFEnabled(true)
      console.log('✅ DOF enabled in preferences')

      // Enable reticle autofocus (uses head raycast)
      cameraControls.reticleAutofocus = true
      console.log('✅ Reticle autofocus enabled')

      // Test head raycast again
      const result = cameraControls.raycastFromPlayerHead()
      if (result !== null) {
        console.log(`✅ Head raycast working with DOF enabled: ${result.toFixed(2)}m`)
      }
    }
  }, 3000)

  // Test 4: Test both camera modes
  setTimeout(() => {
    const player = world.entities?.player
    const cameraControls = world.cameraControls

    if (player && cameraControls) {
      console.log('🧪 Testing both camera modes...')

      // Test first-person mode
      player.cam.zoom = 0
      console.log('🔄 Switched to first-person mode (zoom = 0)')

      setTimeout(() => {
        const fpResult = cameraControls.raycastFromPlayerHead()
        console.log(`📍 First-person head raycast: ${fpResult ? fpResult.toFixed(2) + 'm' : 'null'}`)

        // Test third-person mode
        player.cam.zoom = 3
        console.log('🔄 Switched to third-person mode (zoom = 3)')

        setTimeout(() => {
          const tpResult = cameraControls.raycastFromPlayerHead()
          console.log(`📍 Third-person head raycast: ${tpResult ? tpResult.toFixed(2) + 'm' : 'null'}`)

          console.log('✅ Both camera modes tested')
        }, 500)
      }, 500)
    }
  }, 5000)

  // Add test commands
  world.chat.bindCommand('test-dof-status', () => {
    const cameraControls = world.cameraControls
    const prefs = world.prefs
    const player = world.entities?.player

    const status = {
      cameraControlsEnabled: cameraControls?.enabled || false,
      dofEnabled: prefs?.dofEnabled || false,
      reticleAutofocus: cameraControls?.reticleAutofocus || false,
      playerAutofocus: cameraControls?.playerAutofocus || false,
      dynamicDOF: cameraControls?.dynamicDOF || false,
      playerZoom: player?.cam?.zoom || 'unknown',
      headRaycast: cameraControls?.raycastFromPlayerHead ? cameraControls.raycastFromPlayerHead() : 'method not found',
    }

    console.log('📊 DOF Status:', status)
    return status
  })

  world.chat.bindCommand('enable-dof-test', () => {
    if (world.cameraControls && world.prefs) {
      world.cameraControls.enabled = true
      world.prefs.setDOFEnabled(true)
      world.cameraControls.reticleAutofocus = true
      return 'DOF test enabled'
    }
    return 'Failed to enable DOF test'
  })

  world.chat.bindCommand('disable-dof-test', () => {
    if (world.cameraControls && world.prefs) {
      world.cameraControls.enabled = false
      world.prefs.setDOFEnabled(false)
      world.cameraControls.reticleAutofocus = false
      return 'DOF test disabled'
    }
    return 'Failed to disable DOF test'
  })

  console.log('\n🔬 RESTORED DOF TEST STARTED')
  console.log('📋 Testing:')
  console.log('   1. Camera controls loading')
  console.log('   2. Head raycast method existence')
  console.log('   3. Head raycast functionality')
  console.log('   4. DOF settings verification')
  console.log('   5. Both camera modes (FP/TP)')
  console.log('\n💡 Test commands:')
  console.log('   /test-dof-status - Show current DOF status')
  console.log('   /enable-dof-test - Enable DOF for testing')
  console.log('   /disable-dof-test - Disable DOF testing')

  console.log('\n🎯 Expected behavior:')
  console.log('   - DOF should work in both first-person and third-person')
  console.log('   - Head raycast should return distance to objects')
  console.log('   - No black screens should occur')
  console.log('   - Original implementation restored from git')
}
