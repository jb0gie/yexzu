// Simple WebView example - displays a 3D webpage in the world
const webview = app.create('webview', {
  src: 'https://example.com',
  width: 4, // Width in meters
  height: 3, // Height in meters
  factor: 100, // Pixels per meter (higher = sharper)
  space: 'world', // 'world' for 3D positioned, 'screen' for 2D overlay
  position: [0, 1.5, -3], // Position in front of player at eye level
  pointerEvents: true, // Enable interaction with iframe
})

app.add(webview)
console.log('✅ WebView created with pointer events enabled!')
