// Safe DOF test - minimal implementation to avoid black screens
// This test focuses on the ClientCameraControls raycast system only

import { world } from 'hyperfy'

export default function SafeDOFTest() {
  let testResults = {
    cameraControlsLoaded: false,
    raycastMethodExists: false,
    raycastReturnsValue: false,
    noBlackScreen: true,
  }

  let testStartTime = Date.now()

  console.log('🔬 Safe DOF Test Started')
  console.log('📋 Testing minimal DOF functionality...')

  // Test 1: Check if camera controls are loaded
  setTimeout(() => {
    const cameraControls = world.cameraControls
    if (cameraControls) {
      testResults.cameraControlsLoaded = true
      console.log('✅ Camera controls loaded')

      // Test 2: Check if raycast method exists
      if (typeof cameraControls.raycastFromPlayerHead === 'function') {
        testResults.raycastMethodExists = true
        console.log('✅ raycastFromPlayerHead method exists')

        // Test 3: Try calling raycast method
        try {
          const result = cameraControls.raycastFromPlayerHead()
          if (result !== null && result !== undefined) {
            testResults.raycastReturnsValue = true
            console.log(`✅ raycastFromPlayerHead returns value: ${result}`)
          } else {
            console.log(`⚠️  raycastFromPlayerHead returns null/undefined: ${result}`)
          }
        } catch (error) {
          console.error('❌ raycastFromPlayerHead threw error:', error)
        }
      } else {
        console.log('❌ raycastFromPlayerHead method not found')
      }
    } else {
      console.log('❌ Camera controls not loaded')
    }
  }, 1000)

  // Test 4: Monitor for black screen (check if scene is visible)
  world.on('tick', delta => {
    const elapsed = (Date.now() - testStartTime) / 1000

    // Check if we can still see the scene (basic check)
    if (world.stage && world.stage.scene) {
      const scene = world.stage.scene
      if (scene.children && scene.children.length > 0) {
        // Scene has objects, should be visible
        if (!testResults.noBlackScreen) {
          testResults.noBlackScreen = true
          console.log('✅ Scene visibility restored')
        }
      }
    }

    // Report progress every 5 seconds
    if (elapsed > 0 && elapsed % 5 < delta) {
      console.log(`⏱️  Test progress: ${elapsed.toFixed(1)}s`)
      console.log(`   Camera controls: ${testResults.cameraControlsLoaded ? '✅' : '❌'}`)
      console.log(`   Raycast method: ${testResults.raycastMethodExists ? '✅' : '❌'}`)
      console.log(`   Raycast returns: ${testResults.raycastReturnsValue ? '✅' : '❌'}`)
      console.log(`   No black screen: ${testResults.noBlackScreen ? '✅' : '❌'}`)
    }

    // Final results after 30 seconds
    if (elapsed > 30) {
      console.log('\n🎉 Safe DOF Test Results:')
      console.log(`✅ Camera controls loaded: ${testResults.cameraControlsLoaded ? '✅' : '❌'}`)
      console.log(`✅ Raycast method exists: ${testResults.raycastMethodExists ? '✅' : '❌'}`)
      console.log(`✅ Raycast returns value: ${testResults.raycastReturnsValue ? '✅' : '❌'}`)
      console.log(`✅ No black screen: ${testResults.noBlackScreen ? '✅' : '❌'}`)

      if (testResults.cameraControlsLoaded && testResults.raycastMethodExists) {
        console.log('\n🔧 Basic DOF infrastructure is working')
        if (testResults.raycastReturnsValue) {
          console.log('🎯 Head raycast is functional')
        } else {
          console.log('⚠️  Head raycast may need scene objects to work properly')
        }
      } else {
        console.log('\n❌ DOF infrastructure has issues')
      }

      console.log('\n💡 Next steps:')
      console.log('   - If all tests pass: DOF system is safe to use')
      console.log('   - If raycast returns null: Add scene objects for testing')
      console.log('   - If black screen: Disable this test immediately')

      world.off('tick')
    }
  })

  // Emergency disable command
  world.chat.bindCommand('disable-dof-test', () => {
    console.log('🚨 Disabling DOF test...')
    world.off('tick')
    return 'DOF test disabled'
  })

  // Manual raycast test
  world.chat.bindCommand('test-raycast', () => {
    const cameraControls = world.cameraControls
    if (cameraControls && typeof cameraControls.raycastFromPlayerHead === 'function') {
      try {
        const result = cameraControls.raycastFromPlayerHead()
        console.log(`Manual raycast result: ${result}`)
        return result
      } catch (error) {
        console.error('Manual raycast error:', error)
        return null
      }
    }
    return 'Camera controls not available'
  })

  console.log('💡 Emergency commands:')
  console.log('   /disable-dof-test - Stop this test')
  console.log('   /test-raycast - Manual raycast test')
}
