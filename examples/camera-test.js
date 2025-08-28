// Simple Camera Node Test
console.log('[Camera Test] Testing camera node creation...')

try {
  // Create a basic camera node
  const testCamera = app.create('camera', {
    name: 'test-camera',
    fov: 50,
    position: [0, 5, 10],
    active: true
  })
  
  console.log('[Camera Test] Created camera node:', testCamera)
  console.log('[Camera Test] Camera active:', testCamera.active)
  console.log('[Camera Test] Camera FOV:', testCamera.fov)
  
  // Add to world
  app.add(testCamera)
  console.log('[Camera Test] Camera added to app')
  
  // Test camera methods
  setTimeout(() => {
    console.log('[Camera Test] Testing camera methods...')
    testCamera.setFOV(35)
    console.log('[Camera Test] Changed FOV to:', testCamera.fov)
  }, 1000)
  
} catch (error) {
  console.error('[Camera Test] Error creating camera:', error)
  console.error('[Camera Test] Stack:', error.stack)
}