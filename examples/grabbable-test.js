// Grabbable System Test App
// This app tests the grabbable functionality in Hyperfy

console.log('[Grabbable Test] Initializing test app')

app.keepActive = true

// Create a table as a base
const table = app.create('prim', {
  type: 'box',
  size: [4, 0.1, 3],
  position: [0, 0.5, -3],
  color: '#8B4513',
  name: 'table'
})
app.add(table)

// Create snap points above the table
const snapPositions = [
  [-1, 1.1, -3],
  [0, 1.1, -3],
  [1, 1.1, -3]
]

const snapPoints = []
snapPositions.forEach((pos, i) => {
  const snap = app.create('snap', {
    position: pos,
    name: `snap-point-${i}`
  })
  app.add(snap)
  snapPoints.push(snap)
})

// Create test grabbable objects
const grabbables = []
const colors = ['#FF0000', '#00FF00', '#0000FF']

for (let i = 0; i < 3; i++) {
  console.log(`[Grabbable Test] Creating grabbable ${i}`)

  // Create grabbable container
  const grabbable = app.create('grabbable', {
    position: [-3 + i * 1.5, 1.5, 0],
    grabDistance: 5,
    snapDistance: 1.5,
    snapToPoints: true,
    returnOnRelease: false,
    outlineColor: '#FFFF00',
    outlineEnabled: true,
    name: `grabbable-${i}`
  })

  // Track state
  let wasGrabbed = false
  let wasSnapped = false

  // Add visual mesh
  const mesh = app.create('prim', {
    type: 'box',
    size: [0.3, 0.3, 0.3],
    color: colors[i],
    name: `grabbable-mesh-${i}`
  })
  grabbable.add(mesh)

  // Add physics
  const rigidbody = app.create('rigidbody', {
    type: 'dynamic',
    mass: 0.5,
    name: `grabbable-body-${i}`
  })
  grabbable.add(rigidbody)

  // Setup callbacks
  grabbable.onGrab = (grabbable, player) => {
    wasGrabbed = true
    console.log(`[Grabbable Test] Grabbed ${i} by:`, player?.data?.name || 'unknown')
    console.log(`[Grabbable Test] Rigidbody type:`, rigidbody.type)
  }

  grabbable.onRelease = (grabbable, player) => {
    console.log(`[Grabbable Test] Released ${i} by:`, player?.data?.name || 'unknown')
    console.log(`[Grabbable Test] Is snapped:`, grabbable.isSnapped)
    wasGrabbed = false
  }

  grabbable.onSnap = (grabbable, snapPoint) => {
    wasSnapped = true
    console.log(`[Grabbable Test] Snapped ${i} to:`, snapPoint.toArray())
    console.log(`[Grabbable Test] Rigidbody type after snap:`, rigidbody.type)
  }

  grabbable.onUnsnap = (grabbable) => {
    console.log(`[Grabbable Test] Unsnapped ${i}`)
    wasSnapped = false
  }

  app.add(grabbable)
  grabbables.push(grabbable)
}

// Create UI to show test status
if (world.isClient) {
  const ui = app.create('ui', {
    width: 400,
    height: 200,
    backgroundColor: 'rgba(0, 15, 30, 0.9)',
    borderRadius: 10,
    padding: 15,
    billboard: 'full',
    position: [0, 3, -6],
    size: 0.003,
    name: 'test-ui'
  })

  const title = app.create('uitext', {
    value: '🧪 GRABBABLE TEST',
    color: '#00ffaa',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    name: 'test-title'
  })

  const instructions = app.create('uitext', {
    value: 'Try grabbing the colored cubes!\nThey should snap to positions above the table.',
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 1.4,
    textAlign: 'center',
    name: 'test-instructions'
  })

  ui.add(title)
  ui.add(instructions)
  app.add(ui)
}

// Update loop to check grabbable states
app.on('update', () => {
  grabbables.forEach((grabbable, i) => {
    if (grabbable.update) {
      grabbable.update()
    }
  })
})

// Cleanup
app.on('destroy', () => {
  console.log('[Grabbable Test] Cleaning up test app')
})

console.log('[Grabbable Test] Test setup complete. Created 3 grabbable objects.')
console.log('[Grabbable Test] Check browser console for interaction logs.')
