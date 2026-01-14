// WebView Runtime Test
app.on('init', () => {
  console.log('=== WebView Runtime Test ===');
  console.log('Available nodes:', Object.keys(app.nodes || {}));
  console.log('Has webview node:', !!app.nodes?.webview);

  try {
    if (app.nodes?.webview) {
      // World-space WebView (display website)
      const webview1 = app.create('webview', {
        src: 'https://threejs.org',
        width: 2,
        height: 1.5,
        position: [-3, 1.5, -3]
      });
      app.add(webview1);
      console.log('✅ WebView 1 created: world-space, Three.js website');

      // World-space WebView (Google)
      const webview2 = app.create('webview', {
        src: 'https://google.com',
        width: 2,
        height: 1.5,
        position: [0, 1.5, -3]
      });
      app.add(webview2);
      console.log('✅ WebView 2 created: world-space, Google');

      // World-space WebView with pointer interaction
      const webview3 = app.create('webview', {
        src: 'https://github.com',
        width: 2,
        height: 1.5,
        position: [3, 1.5, -3],
        pointerEvents: true
      });
      app.add(webview3);
      console.log('✅ WebView 3 created: world-space with pointerEvents (clickable)');

      // Ground plane for reference
      const ground = app.create('mesh', {
        shape: 'plane',
        size: [20, 20],
        color: '#333333',
        rotation: [-Math.PI / 2, 0, 0],
        position: [0, 0, 0]
      });
      app.add(ground);
      console.log('✅ Ground plane added');

      console.log('\n🎯 Test Setup Complete!');
      console.log('Three WebViews at positions: Left(-3), Center(0), Right(+3)');
      console.log('Right WebView (GitHub) has pointerEvents enabled - try clicking it!');

    } else {
      console.error('❌ WebView node not available');
    }
  } catch (error) {
    console.error('❌ Error creating webview:', error.message);
    console.error(error.stack);
  }
});

// Keep app running
app.keepActive = true;
