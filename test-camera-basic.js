#!/usr/bin/env node

// Test script to verify camera node system basics
import { createClientWorld } from './src/core/createClientWorld.js'
import { createNode } from './src/core/extras/createNode.js'

console.log('=== Basic Camera System Test ===')

// Create a test world
const world = createClientWorld()

// Initialize the world with minimal options
await world.init({
  storage: {},
  assetsDir: './build/public',
  assetsUrl: 'http://localhost:3011'
})

console.log('\n1. Testing world.camera backwards compatibility:')
console.log('  - world.camera exists:', world.camera !== undefined)
console.log('  - Is PerspectiveCamera:', world.camera?.isPerspectiveCamera === true)
console.log('  - Camera FOV:', world.camera?.fov)

console.log('\n2. Testing CameraManager:')
console.log('  - CameraManager exists:', world.cameraManager !== undefined)
console.log('  - Total cameras:', world.cameraManager?.cameras.size || 0)
console.log('  - Active camera:', world.cameraManager?.activeCamera?.id || 'none')

console.log('\n3. Testing camera node creation:')
try {
  const cameraNode = createNode('camera', {
    name: 'test-camera',
    fov: 50,
    near: 0.1,
    far: 1000,
    active: false
  })
  console.log('  - Camera node created:', cameraNode !== undefined)
  console.log('  - Camera node type:', cameraNode?.name)
  console.log('  - Camera THREE object:', cameraNode?.camera?.isPerspectiveCamera)
  
  // Activate the node
  cameraNode.activate({ world, entity: { worldNodes: new Set() } })
  
  console.log('\n4. Testing camera registration:')
  console.log('  - Total cameras after create:', world.cameraManager?.cameras.size || 0)
  console.log('  - Test camera registered:', world.cameraManager?.cameras.has(cameraNode.id))
  
} catch (error) {
  console.error('  - Failed to create camera node:', error)
}

console.log('\n=== Test Complete ===')

// Clean up
world.destroy()
process.exit(0)