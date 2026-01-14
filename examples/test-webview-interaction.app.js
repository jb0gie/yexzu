// WebView Interaction Test
// This test verifies that WebView interaction is working properly

app.on('init', () => {
  console.log('=== WebView Interaction Test ===')

  // Create a simple clickable webview
  const clickableWebview = app.create('webview', {
    src: 'https://example.com',
    width: 3,
    height: 2,
    position: [0, 1.5, -5],
    pointerEvents: true, // Enable interaction
    space: 'world',
  })

  app.add(clickableWebview)

  console.log('✅ Created clickable WebView')
  console.log('   Position: [0, 1.5, -5]')
  console.log('   Size: 3m x 2m')
  console.log('   pointerEvents: true')
  console.log('')
  console.log('🎯 INSTRUCTIONS:')
  console.log('   1. Move close to the WebView (within interaction range)')
  console.log('   2. Unlock mouse cursor (press ESC or use cursor unlock key)')
  console.log('   3. Hover over the WebView to see mouse cursor change')
  console.log('   4. Click to interact with the website')
  console.log('')
  console.log('💡 If interaction does not work:')
  console.log('   - Check browser console for errors')
  console.log('   - Verify pointerEvents is set to true')
  console.log('   - Ensure CSS3D layer is properly positioned')
})

// Keep app running
app.keepActive = true
