// WebView Runtime Test
app.on('init', () => {
  console.log('=== WebView Runtime Test ===');
  console.log('Available nodes:', Object.keys(app.nodes || {}));
  console.log('Has webview node:', !!app.nodes?.webview);
  
  try {
    if (app.nodes?.webview) {
      const webview = app.create('webview', {
        src: 'https://example.com',
        width: 2,
        height: 1.5,
        space: 'world',
        position: [0, 1.5, -3]
      });
      console.log('✅ WebView created successfully:', !!webview);
      app.add(webview);
      console.log('✅ WebView added to scene');
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
