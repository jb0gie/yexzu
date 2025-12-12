// Test script to verify ORIGINAL DOF implementation works in both modes
// This tests the restored raycast from player head system

import { world } from 'hyperfy'

export default function TestOriginalDOF() {
  let testResults = {
    firstPersonDOF: false,
    thirdPersonDOF: false,
    headRaycastWorking: false,
    zoomStability: false,
    bothModesWorking: false,
  }

  let testStartTime = Date.now()
  let modeSwitchCount = 0

  world.on('tick', delta => {
    const camera = world.camera
    const player = world.entities.player
    const prefs = world.prefs
    const cameraControls = world.cameraControls

    if (!camera || !player || !prefs || !cameraControls) return

    const currentTime = Date.now()
    const elapsed = (currentTime - testStartTime) / 1000

    // Test 1: First-person DOF (zoom < 1)
    if (player.cam.zoom < 1 && !testResults.firstPersonDOF) {
      console.log('🧪 Testing first-person DOF...')

      // Check if DOF is enabled and working
      if (prefs.dofEnabled && cameraControls.enabled) {
        // Test head raycast functionality
        const headRaycastDistance = cameraControls.raycastFromPlayerHead()

        if (headRaycastDistance !== null && headRaycastDistance > 0) {
          testResults.firstPersonDOF = true
          testResults.headRaycastWorking = true
          console.log('✅ First-person DOF: Head raycast working')
          console.log(`   Head raycast distance: ${headRaycastDistance.toFixed(2)}m`)
          console.log(`   DOF focus distance: ${prefs.dofFocusDistance.toFixed(2)}m`)
        } else {
          console.log('❌ First-person DOF: Head raycast not working')
          console.log(`   Head raycast result: ${headRaycastDistance}`)
        }
      } else {
        console.log('❌ First-person DOF: DOF or camera controls not enabled')
      }
    }

    // Test 2: Third-person DOF (zoom >= 1)
    if (player.cam.zoom >= 1 && testResults.firstPersonDOF && !testResults.thirdPersonDOF) {
      console.log('🧪 Testing third-person DOF...')

      // Check if DOF is still working in third-person
      if (prefs.dofEnabled && cameraControls.enabled) {
        const headRaycastDistance = cameraControls.raycastFromPlayerHead()

        if (headRaycastDistance !== null && headRaycastDistance > 0) {
          testResults.thirdPersonDOF = true
          console.log('✅ Third-person DOF: Head raycast working')
          console.log(`   Head raycast distance: ${headRaycastDistance.toFixed(2)}m`)
        } else {
          console.log('❌ Third-person DOF: Head raycast not working')
        }
      } else {
        console.log('❌ Third-person DOF: DOF or camera controls not enabled')
      }
    }

    // Test 3: Mode switching (verify DOF works when switching between FP/TP)
    if (elapsed > 2 && elapsed < 30) {
      // Switch between modes every 3 seconds
      const shouldBeFirstPerson = Math.floor(elapsed / 3) % 2 === 0

      if (shouldBeFirstPerson && player.cam.zoom >= 1) {
        // Switch to first-person
        player.cam.zoom = 0
        modeSwitchCount++
        console.log(`🔄 Switched to first-person (switch #${modeSwitchCount})`)
      } else if (!shouldBeFirstPerson && player.cam.zoom < 1) {
        // Switch to third-person
        player.cam.zoom = 3
        modeSwitchCount++
        console.log(`🔄 Switched to third-person (switch #${modeSwitchCount})`)
      }
    }

    // Test 4: Zoom stability (extreme zoom shouldn't break DOF)
    if (player.cam.zoom > 20 && !testResults.zoomStability) {
      console.log('🧪 Testing zoom stability...')

      const focusDistance = prefs.dofFocusDistance
      const headRaycastDistance = cameraControls.raycastFromPlayerHead()

      if (
        isFinite(focusDistance) &&
        focusDistance > 0 &&
        (headRaycastDistance === null || (isFinite(headRaycastDistance) && headRaycastDistance > 0))
      ) {
        testResults.zoomStability = true
        console.log('✅ Zoom stability: DOF remains functional at extreme zoom')
        console.log(`   Zoom: ${player.cam.zoom.toFixed(1)}, Focus: ${focusDistance.toFixed(2)}m`)
      } else {
        console.log('❌ Zoom stability: DOF broken at extreme zoom')
      }
    }

    // Test 5: Both modes working (switched successfully multiple times)
    if (
      modeSwitchCount >= 4 &&
      testResults.firstPersonDOF &&
      testResults.thirdPersonDOF &&
      !testResults.bothModesWorking
    ) {
      testResults.bothModesWorking = true
      console.log('✅ Both modes working: Successfully switched between FP/TP multiple times')
    }

    // Report progress
    if (elapsed % 5 < delta && elapsed > 5) {
      console.log(`⏱️  Test progress: ${elapsed.toFixed(1)}s`)
      console.log(`   First-person: ${testResults.firstPersonDOF ? '✅' : '❌'}`)
      console.log(`   Third-person: ${testResults.thirdPersonDOF ? '✅' : '❌'}`)
      console.log(`   Head raycast: ${testResults.headRaycastWorking ? '✅' : '❌'}`)
      console.log(`   Zoom stability: ${testResults.zoomStability ? '✅' : '❌'}`)
      console.log(`   Both modes: ${testResults.bothModesWorking ? '✅' : '❌'}`)
    }

    // Final results
    if (Object.values(testResults).every(result => result === true)) {
      console.log('\n🎉 ORIGINAL DOF IMPLEMENTATION TEST RESULTS:')
      console.log('✅ All tests passed!')
      console.log('✅ First-person DOF: Working with head raycast')
      console.log('✅ Third-person DOF: Working with head raycast')
      console.log('✅ Head raycast: Functional in both modes')
      console.log("✅ Zoom stability: Extreme zoom doesn't break DOF")
      console.log('✅ Mode switching: Seamless FP/TP transitions')
      console.log('\n🔧 The original DOF implementation has been successfully restored!')
      console.log('🎯 DOF now works consistently in both first-person and third-person modes')

      // Stop the test
      world.off('tick')
    }

    // Timeout after 60 seconds
    if (elapsed > 60) {
      console.log('\n⏰ Test timeout reached')
      console.log('📊 Final Results:')
      console.log(`   First-person DOF: ${testResults.firstPersonDOF ? '✅' : '❌'}`)
      console.log(`   Third-person DOF: ${testResults.thirdPersonDOF ? '✅' : '❌'}`)
      console.log(`   Head raycast: ${testResults.headRaycastWorking ? '✅' : '❌'}`)
      console.log(`   Zoom stability: ${testResults.zoomStability ? '✅' : '❌'}`)
      console.log(`   Both modes: ${testResults.bothModesWorking ? '✅' : '❌'}`)

      world.off('tick')
    }
  })

  // Manual test commands
  world.chat.bindCommand('test-fp-dof', () => {
    console.log('🧪 Manual first-person DOF test...')
    const player = world.entities.player
    const cameraControls = world.cameraControls

    if (player && cameraControls) {
      // Force first-person
      player.cam.zoom = 0

      const headRaycastDistance = cameraControls.raycastFromPlayerHead()
      console.log(`Head raycast distance: ${headRaycastDistance}`)

      return headRaycastDistance !== null && headRaycastDistance > 0
    }
    return false
  })

  world.chat.bindCommand('test-tp-dof', () => {
    console.log('🧪 Manual third-person DOF test...')
    const player = world.entities.player
    const cameraControls = world.cameraControls

    if (player && cameraControls) {
      // Force third-person
      player.cam.zoom = 3

      const headRaycastDistance = cameraControls.raycastFromPlayerHead()
      console.log(`Head raycast distance: ${headRaycastDistance}`)

      return headRaycastDistance !== null && headRaycastDistance > 0
    }
    return false
  })

  console.log('🔬 ORIGINAL DOF IMPLEMENTATION TEST STARTED')
  console.log('📋 Testing:')
  console.log('   1. First-person DOF with head raycast')
  console.log('   2. Third-person DOF with head raycast')
  console.log('   3. Head raycast functionality')
  console.log('   4. Zoom stability at extreme levels')
  console.log('   5. Seamless mode switching')
  console.log('\n💡 Manual commands: /test-fp-dof, /test-tp-dof')
  console.log('⏱️  Test will run for up to 60 seconds')
}
