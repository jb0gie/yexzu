// Simple Grabbable Test - Minimal Version
console.log('[Simple Grabbable] App starting')

app.keepActive = true

// Create a simple grabbable cube
const grabbable = app.create('grabbable', {
  position: [0, 1.5, 0],
  grabDistance: 5,
  snapDistance: 1
})

const cube = app.create('prim', {
  type: 'box',
  size: [0.5, 0.5, 0.5],
  color: '#FF0000'
})

const body = app.create('rigidbody', {
  type: 'dynamic',
  mass: 1
})

grabbable.add(cube)
grabbable.add(body)
app.add(grabbable)

console.log('[Simple Grabbable] Created grabbable cube')

app.on('update', () => {
  if (grabbable.update) grabbable.update()
})

console.log('[Simple Grabbable] App ready')
