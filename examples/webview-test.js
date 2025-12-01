// WebView Stencil Cutout Test (Simplified)
// Demonstrates world-space webview with depth cutout

console.log('=== WebView Test (Simplified) ===')

// 1. World-space WebView (TV Screen)
const tvScreen = app.create('webview', {
	src: 'https://threejs.org',
	width: 800,
	height: 600,
	size: 0.001, // 1px = 1mm
	space: 'world',
	billboard: 'none',
	pointerEvents: true,
})
tvScreen.position.set(0, 1.5, -5)
app.add(tvScreen)

// 2. Occluder Box (Red)
const occluderBox = app.create('prim', {
	type: 'box',
	size: [2, 2, 0.5],
	position: [0, 1.5, -3], // In front of TV
	color: '#ff0000',
})
app.add(occluderBox)

console.log('WebView created. Red box should occlude it.')
