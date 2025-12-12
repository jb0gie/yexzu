// Diagnostic script to identify what's causing the black screen
// This will help isolate whether it's related to DOF or something else

import { world } from 'hyperfy'

export default function DiagnosticScript() {
  console.log('🔍 Starting diagnostic...')

  // Check if basic world systems are available
  const checks = {
    world: !!world,
    camera: !!world?.camera,
    prefs: !!world?.prefs,
    entities: !!world?.entities,
    player: !!world?.entities?.player,
    cameraControls: !!world?.cameraControls,
  }

  console.log('📋 System availability:')
  Object.entries(checks).forEach(([name, available]) => {
    console.log(`   ${name}: ${available ? '✅' : '❌'}`)
  })

  // Check DOF settings
  if (world?.prefs) {
    console.log('🎯 DOF Settings:')
    console.log(`   DOF Enabled: ${world.prefs.dofEnabled}`)
    console.log(`   Focus Distance: ${world.prefs.dofFocusDistance}`)
    console.log(`   Focus Range: ${world.prefs.dofFocusRange}`)
    console.log(`   Bokeh Scale: ${world.prefs.dofBokehScale}`)
  }

  // Check camera settings
  if (world?.camera) {
    console.log('📷 Camera Settings:')
    console.log(`   Position: ${world.camera.position?.x}, ${world.camera.position?.y}, ${world.camera.position?.z}`)
    console.log(`   Zoom: ${world.camera.position?.z}`)
    console.log(`   Far: ${world.camera.far}`)
    console.log(`   Near: ${world.camera.near}`)
  }

  // Check player settings
  if (world?.entities?.player) {
    console.log('🧍 Player Settings:')
    console.log(`   Zoom: ${world.entities.player.cam?.zoom}`)
    console.log(`   First Person: ${world.entities.player.firstPerson}`)
  }

  // Test basic camera movement
  world.on('tick', delta => {
    // Only run for a few seconds to avoid spam
    if (!this.diagnosticStartTime) {
      this.diagnosticStartTime = Date.now()
    }

    const elapsed = Date.now() - this.diagnosticStartTime
    if (elapsed > 5000) {
      console.log('✅ Diagnostic complete - no obvious errors detected')
      console.log('💡 If you still see a black screen, the issue might be:')
      console.log('   1. Graphics/WebGL initialization problems')
      console.log('   2. Missing assets or scene loading issues')
      console.log('   3. Browser compatibility issues')
      console.log('   4. Network/loading problems')

      world.off('tick')
      return
    }

    // Try to detect any runtime errors
    try {
      // Basic camera operation test
      if (world.camera && world.entities.player) {
        const player = world.entities.player
        const camera = world.camera

        // Test if camera follows player
        if (player.position && camera.position) {
          const distance = player.position.distanceTo(camera.position)
          if (distance > 1000) {
            console.log('⚠️  Camera very far from player - possible positioning issue')
          }
        }
      }
    } catch (error) {
      console.error('❌ Runtime error detected:', error.message)
      console.error('Stack:', error.stack)
      world.off('tick')
    }
  })

  // Manual DOF disable test
  world.chat.bindCommand('disable-dof', () => {
    console.log('🛑 Manually disabling DOF...')
    if (world.prefs) {
      world.prefs.setDOFEnabled(false)
      console.log('✅ DOF disabled')
      return true
    }
    return false
  })

  // Manual camera reset test
  world.chat.bindCommand('reset-camera', () => {
    console.log('🔄 Resetting camera position...')
    if (world.camera && world.entities.player) {
      world.camera.position.set(0, 0, 5)
      console.log('✅ Camera reset to (0, 0, 5)')
      return true
    }
    return false
  })

  console.log('💡 Available diagnostic commands:')
  console.log('   /disable-dof - Manually disable DOF')
  console.log('   /reset-camera - Reset camera position')
}
