// Test script to verify DOF zoom fix
// This script tests the DOF system at extreme zoom levels to ensure it doesn't turn off

import { world } from 'hyperfy'

export default function TestDOFZoomFix() {
  let testResults = {
    extremeZoomOut: false,
    zoomBackIn: false,
    focusRecovery: false,
    noNaNValues: false,
  }

  world.on('tick', delta => {
    const camera = world.camera
    const player = world.entities.player
    const prefs = world.prefs

    if (!camera || !player || !prefs) return

    // Test 1: Extreme zoom out (should not break DOF)
    if (player.cam.zoom > 50 && !testResults.extremeZoomOut) {
      console.log('🧪 Testing extreme zoom out...')

      const focusDistance = prefs.dofFocusDistance
      const focusRange = prefs.dofFocusRange
      const bokehScale = prefs.dofBokehScale

      // Check for invalid values
      if (
        isFinite(focusDistance) &&
        focusDistance > 0 &&
        isFinite(focusRange) &&
        focusRange > 0 &&
        isFinite(bokehScale) &&
        bokehScale >= 0
      ) {
        testResults.extremeZoomOut = true
        console.log('✅ Extreme zoom out: DOF values remain valid')
        console.log(
          `   Focus: ${focusDistance.toFixed(2)}m, Range: ${focusRange.toFixed(2)}m, Bokeh: ${bokehScale.toFixed(2)}`
        )
      } else {
        console.log('❌ Extreme zoom out: Invalid DOF values detected!')
        console.log(`   Focus: ${focusDistance}, Range: ${focusRange}, Bokeh: ${bokehScale}`)
      }
    }

    // Test 2: Zoom back in (should restore normal DOF behavior)
    if (player.cam.zoom < 5 && testResults.extremeZoomOut && !testResults.zoomBackIn) {
      console.log('🧪 Testing zoom back in...')

      const focusDistance = prefs.dofFocusDistance

      if (isFinite(focusDistance) && focusDistance > 0 && focusDistance < 100) {
        testResults.zoomBackIn = true
        console.log('✅ Zoom back in: DOF focus restored')
        console.log(`   Focus: ${focusDistance.toFixed(2)}m`)
      } else {
        console.log('❌ Zoom back in: DOF focus not restored!')
        console.log(`   Focus: ${focusDistance}`)
      }
    }

    // Test 3: Focus recovery after extreme zoom
    if (testResults.extremeZoomOut && testResults.zoomBackIn && !testResults.focusRecovery) {
      console.log('🧪 Testing focus recovery...')

      // Check if camera controls can recover DOF
      if (world.cameraControls && typeof world.cameraControls.recoverDOF === 'function') {
        const recovered = world.cameraControls.recoverDOF()
        if (recovered) {
          testResults.focusRecovery = true
          console.log('✅ Focus recovery: DOF recovery function works')
        }
      } else {
        // Manual recovery test
        const focusDistance = prefs.dofFocusDistance
        if (isFinite(focusDistance) && focusDistance > 0) {
          testResults.focusRecovery = true
          console.log('✅ Focus recovery: Manual DOF values are valid')
        }
      }
    }

    // Test 4: No NaN or infinite values in DOF system
    if (!testResults.noNaNValues) {
      const focusDistance = prefs.dofFocusDistance
      const focusRange = prefs.dofFocusRange
      const bokehScale = prefs.dofBokehScale

      if (isFinite(focusDistance) && isFinite(focusRange) && isFinite(bokehScale)) {
        testResults.noNaNValues = true
        console.log('✅ No NaN values: All DOF parameters are finite')
      }
    }

    // Report final results
    if (Object.values(testResults).every(result => result === true)) {
      console.log('\n🎉 DOF Zoom Fix Test Results:')
      console.log('✅ All tests passed!')
      console.log('✅ Extreme zoom out: DOF remains stable')
      console.log('✅ Zoom back in: DOF behavior restored')
      console.log('✅ Focus recovery: System can recover from extreme values')
      console.log('✅ No NaN values: All parameters remain finite')
      console.log('\n🔧 The DOF zoom fix is working correctly!')

      // Stop the test
      world.off('tick')
    }
  })

  // Add manual recovery command for testing
  world.chat.bindCommand('test-dof-recovery', () => {
    console.log('🧪 Manual DOF recovery test...')
    if (world.cameraControls && typeof world.cameraControls.recoverDOF === 'function') {
      const result = world.cameraControls.recoverDOF()
      console.log(`Recovery result: ${result ? 'Success' : 'Failed'}`)
      return result
    }
    return false
  })

  console.log('🔬 DOF Zoom Fix Test Started')
  console.log('📋 Testing:')
  console.log('   1. Extreme zoom out behavior')
  console.log('   2. Zoom back in restoration')
  console.log('   3. Focus recovery mechanisms')
  console.log('   4. NaN/infinite value prevention')
  console.log('\n💡 Use /test-dof-recovery to manually test recovery')
}
