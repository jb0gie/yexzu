// Ultra basic WebView - absolute minimal test

console.log('=== Basic WebView Test ===')

const webview = app.create('webview', {
  src: 'data:text/html,<html><body><h1>TEST</h1><button onclick="alert(1)">Click Me</button></body></html>',
  width: 3,
  height: 2,
  pointerEvents: true
})

app.add(webview)

console.log('✅ Basic WebView added')
console.log('Should see: "TEST" and a clickable button')
console.log('If button is clickable, interaction IS WORKING!')

app.keepActive = true
