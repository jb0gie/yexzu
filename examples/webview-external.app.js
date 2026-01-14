// External URL test - same as user's working example

console.log('=== External URL Test ===')
console.log('Testing your exact URL...')

const webview = app.create('webview', {
  src: 'https://irb0gie.vercel.app',
  width: 4,
  height: 3,
  factor: 100,
  space: 'world',
  position: [0, 1.5, -3],
  pointerEvents: true
})

app.add(webview)

console.log('✅ Created webview with irb0gie.vercel.app')
console.log('If this works, something was wrong with our event handling')
console.log('If this fails, the issue is deeper (CSS3D, browser security, etc)')

app.keepActive = true
