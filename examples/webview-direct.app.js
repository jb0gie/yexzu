// Most direct WebView test - bypasses all event handling
// Just creates webview and sets pointer-events directly

console.log('=== Direct WebView Test ===')

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
console.log('Checking iframe pointer-events...')

// Force enable pointer events immediately
setTimeout(() => {
  if (webview.iframe) {
    console.log('Setting iframe pointer-events to auto...')
    webview.iframe.style.pointerEvents = 'auto'
    console.log('✅ pointer-events set to auto')
    console.log('Try clicking the webview now!')
  } else {
    console.log('❌ iframe not found after creation')
  }
}, 500)

app.keepActive = true
