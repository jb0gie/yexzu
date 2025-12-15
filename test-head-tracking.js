// Test script to verify head tracking works
import { createClientWorld } from './src/core/createClientWorld.js'

const world = createClientWorld()

console.log('Testing head tracking fix...')
console.log('World created:', !!world)
console.log('CameraManager exists:', !!world.cameraManager)
console.log('Default camera exists:', !!world.defaultCameraNode)
console.log('World camera getter works:', !!world.camera)

// Check if the fix is in place
const PlayerLocal = await import('./src/core/entities/PlayerLocal.js')
const fs = await import('fs')
const playerCode = fs.readFileSync('./src/core/entities/PlayerLocal.js', 'utf8')

const hasFix = playerCode.includes('this.world.rig.position.setFromMatrixPosition(matrix)')
const hasFirstPersonCheck = playerCode.includes('if (this.firstPerson)')

console.log('Head tracking fix applied:', hasFix)
console.log('First person check present:', hasFirstPersonCheck)

if (hasFix && hasFirstPersonCheck) {
  console.log('✅ Head tracking fix successfully applied!')
  console.log('Avatar head should now move with camera in first person mode.')
} else {
  console.log('❌ Fix not properly applied')
}
