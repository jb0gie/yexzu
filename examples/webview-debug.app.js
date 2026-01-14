// Debug WebView - adds console logging to diagnose interaction issues

console.log('=== WebView Debug Test ===')

const webview = app.create('webview', {
  src: 'https://irb0gie.vercel.app',
  width: 4,
  height: 3,
  factor: 100,
  space: 'world',
  position: [0, 1.5, -3],
  pointerEvents: true,
})

app.add(webview)
console.log('✅ WebView created')

// Add debug logging
setTimeout(() => {
  console.log('WebView object:', webview)
  console.log('Has iframe:', !!webview.iframe)
  console.log('Has objectCSS:', !!webview.objectCSS)
  console.log('Has objectCSS.element:', webview.objectCSS?.element)

  if (webview.iframe) {
    console.log('iframe.src:', webview.iframe.src)
    console.log('iframe.style.pointerEvents:', webview.iframe.style.pointerEvents)
  }

  // Try to manually add event listener for debugging
  if (webview.objectCSS?.element) {
    console.log('Adding manual click listener to CSS3DObject.element...')
    webview.objectCSS.element.addEventListener('click', () => {
      console.log('❌ CLICK EVENT FIRING - but no visual feedback?')
    })
  }
}, 1000)

app.keepActive = true
