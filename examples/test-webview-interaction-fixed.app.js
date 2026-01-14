// WebView Interaction Fix Test
// This test verifies the interaction fix works properly
// Events now attached to CSS3DObject.element for proper event handling

app.on('init', () => {
  console.log('=== WebView Interaction Fix Test ===')
  console.log('This test verifies events work through CSS3D transforms')

  // Create interactive webviews at different positions
  const positions = [
    { pos: [-4, 1.5, -5], url: 'https://example.com', name: 'Left' },
    { pos: [0, 1.5, -5], url: 'https://threejs.org', name: 'Center' },
    { pos: [4, 1.5, -5], url: 'https://github.com', name: 'Right' },
  ]

  positions.forEach(({ pos, url, name }) => {
    const webview = app.create('webview', {
      src: url,
      width: 2.5,
      height: 1.8,
      position: pos,
      pointerEvents: true,
      space: 'world',
    })

    app.add(webview)
    console.log(`✅ ${name} WebView: ${url}`)
  })

  // Ground plane
  const ground = app.create('mesh', {
    shape: 'plane',
    size: [20, 20],
    color: '#333333',
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
  })
  app.add(ground)

  console.log('')
  console.log('🎯 TEST INSTRUCTIONS:')
  console.log('   Desktop:')
  console.log('   1. Approach any WebView (2.5m wide x 1.8m tall)')
  console.log('   2. Unlock cursor (press ESC)')
  console.log('   3. Hover - cursor should change to pointer')
  console.log('   4. Click - should be able to scroll/click links')
  console.log('')
  console.log('   Mobile:')
  console.log('   1. Touch WebView directly')
  console.log('   2. Should be able to tap links/scroll')
  console.log('   3. No cursor unlock needed')
  console.log('')
  console.log('💡 Events now on CSS3DObject.element (container div)')
  console.log('   This ensures proper event handling through CSS3D transforms')
  console.log('   Fixed: Events were on inner div, breaking after CSS3D transform')
})

app.keepActive = true
