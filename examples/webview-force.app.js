// Force pointer events test
// Directly manipulates iframe pointer-events

console.log('=== Force Pointer Events Test ===')

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

console.log('✅ WebView created with pointerEvents: true')

// Force enable pointer events both immediately and after a delay
if (webview.iframe) {
  console.log('Setting iframe.pointerEvents = "auto"...')
  webview.iframe.style.pointerEvents = 'auto'
} else {
  console.log('Waiting for iframe to load...')
}

// Also set after creation
setTimeout(() => {
  console.log('WebView:', webview)
  console.log('iframe:', webview.iframe)
  if (webview.iframe) {
    console.log('Setting iframe.pointerEvents = "auto" again...')
    webview.iframe.style.pointerEvents = 'auto'
    console.log('✅ pointer-events should be enabled!')
    console.log('Try: click the iframe, scroll, click links...')
  }
}, 1000)

app.keepActive = true
