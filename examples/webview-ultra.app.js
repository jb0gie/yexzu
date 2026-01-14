// Ultra simple WebView test
// Matches user's working example exactly

console.log('=== Ultra Simple WebView ===')

const webview = app.create('webview', {
  src: 'https://irb0gie.vercel.app',
  width: 4,
  height: 3,
  factor: 100,
  space: 'world',
  position: [0, 1.5, -3],
  pointerEvents: true
})

app.add(webview)

console.log('✅ WebView added')
console.log('✅ Check console for any errors')
console.log('✅ Try clicking the webview')
console.log('✅ If it works, pointerEvents just works!')

app.keepActive = true
