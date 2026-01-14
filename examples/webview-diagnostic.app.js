// Diagnostic WebView test
// Checks what's actually happening with interaction

console.log('=== WebView Diagnostic Test ===')

const webview = app.create('webview', {
  src: 'https://irb0gie.vercel.app',
  width: 4,
  height: 3,
  position: [0, 1.5, -3],
  pointerEvents: true
})

app.add(webview)

// Diagnostic checks
setTimeout(() => {
  console.log('Diagnostics after 1 second:')
  console.log('WebView exists:', !!webview)
  console.log('Has iframe:', !!webview.iframe)
  console.log('iframe URL:', webview.iframe?.src)
  console.log('iframe display:', webview.iframe?.style.display)
  console.log('iframe pointerEvents:', webview.iframe?.style.pointerEvents)

  if (webview.objectCSS) {
    console.log('Has CSS3DObject')
    console.log('CSS3D element:', webview.objectCSS.element)
    console.log('CSS3D element display:', webview.objectCSS.element?.style.display)
  }

  console.log('\n💡 Try opening browser DevTools:')
  console.log('   - Check the DOM for the iframe element')
  console.log('   - Look at its computed styles')
  console.log('   - Check Console for errors when you click')

  console.log('\n💡 Common issues:')
  console.log('   - iframe has pointer-events: none (fixed)')
  console.log('   - CSS3D element blocks iframe (shouldnt happen)')
  console.log('   - Browser blocks iframe interaction (security)')
  console.log('   - URL not loading (check iframe.src)')
}, 1000)

app.keepActive = true
