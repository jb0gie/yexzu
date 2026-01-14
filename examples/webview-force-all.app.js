// Force all pointer events
// Enables on iframe, container, and inner

console.log('=== Force All Pointer Events ===')

const webview = app.create('webview', {
  src: 'https://irb0gie.vercel.app',
  width: 4, height: 3,
  space: 'world',
  position: [0, 1.5, -3],
  pointerEvents: true
})

app.add(webview)

// Force enable pointer events on everything
setTimeout(() => {
  console.log('Forcing pointer-events on all elements...')

  if (webview.iframe) {
    webview.iframe.style.pointerEvents = 'auto'
    console.log('✅ iframe.pointerEvents = auto')
  }

  if (webview.container) {
    webview.container.style.pointerEvents = 'auto'
    console.log('✅ container.pointerEvents = auto')
  }

  if (webview.inner) {
    webview.inner.style.pointerEvents = 'auto'
    console.log('✅ inner.pointerEvents = auto')
  }

  console.log('All elements should now accept pointer events!')
}, 500)

app.keepActive = true
