// WebView Stencil Cutout Test
// Demonstrates world-space and screen-space webviews with depth cutouts

console.log('=== WebView Stencil Cutout Test ===')

// Configuration for the app
app.configure([
	{
		key: 'webviewUrl',
		type: 'text',
		label: 'WebView URL',
		initial: 'https://threejs.org',
		placeholder: 'Enter URL...',
	},
	{
		key: 'webviewWidth',
		type: 'number',
		label: 'Width',
		initial: 800,
		min: 200,
		max: 1920,
	},
	{
		key: 'webviewHeight',
		type: 'number',
		label: 'Height',
		initial: 600,
		min: 150,
		max: 1080,
	},
])

// World-space webview (TV screen) - Fixed with new API
const tvScreen = app.create('webview', {
	src: props.webviewUrl || 'https://threejs.org',
	width: props.webviewWidth || 800,
	height: props.webviewHeight || 600,
	worldWidth: 0.8,    // 0.8 meters wide (much smaller)
	worldHeight: 0.6,   // 0.6 meters tall (much smaller)
	space: 'world',
	billboard: 'full',  // Face camera like a TV screen
	pointerEvents: true, // Allow clicking
	visible: true,
	opacity: 1,
})
tvScreen.position.set(0, 1.5, -5) // Positioned closer and lower
app.add(tvScreen)

// Debug logging
console.log('WebView created with dimensions:', {
	width: props.webviewWidth || 800,
	height: props.webviewHeight || 600,
	worldWidth: 0.8,
	worldHeight: 0.6,
	scaleX: (0.8 / (props.webviewWidth || 800)) * 0.001,
	scaleY: (0.6 / (props.webviewHeight || 600)) * 0.001
})

// Box that should occlude the TV screen when in front
const occluderBox = app.create('prim', {
	type: 'box',
	size: [2, 2, 0.5],
	position: [0, 2, -4], // Positioned in front of TV screen
	color: '#ff0000',
})
app.add(occluderBox)

// Box behind the TV screen (should not occlude)
const backgroundBox = app.create('prim', {
	type: 'box',
	size: [1, 1, 1],
	position: [0, 2, -12], // Positioned behind TV screen
	color: '#00ff00',
})
app.add(backgroundBox)

// Screen-space HUD webview - Fixed with new API
const hud = app.create('webview', {
	src: 'https://threejs.org',
	width: 300,
	height: 200,
	space: 'screen',
	pointerEvents: true, // Allow clicking
	visible: true,
	opacity: 0.9,
})
hud.position.set(0.7, 0.1, 0) // Top-right corner
app.add(hud)

// Create labels for testing
const tvLabel = app.create('ui', {
	width: 300,
	height: 40,
	position: [0, 4, -8],
	billboard: 'y',
	backgroundColor: 'rgba(0, 0, 0, 0.8)',
	borderRadius: 5,
	padding: 5,
})
const tvLabelText = app.create('uitext', {
	value: 'TV SCREEN (world-space)',
	fontSize: 18,
	color: '#00ffaa',
	textAlign: 'center',
	fontWeight: 'bold',
})
tvLabel.add(tvLabelText)
app.add(tvLabel)

const occluderLabel = app.create('ui', {
	width: 300,
	height: 40,
	position: [0, 3.5, -4],
	billboard: 'y',
	backgroundColor: 'rgba(0, 0, 0, 0.8)',
	borderRadius: 5,
	padding: 5,
})
const occluderLabelText = app.create('uitext', {
	value: 'OCCLUDER (red box)',
	fontSize: 18,
	color: '#ff0000',
	textAlign: 'center',
	fontWeight: 'bold',
})
occluderLabel.add(occluderLabelText)
app.add(occluderLabel)

const backgroundLabel = app.create('ui', {
	width: 300,
	height: 40,
	position: [0, 3.5, -12],
	billboard: 'y',
	backgroundColor: 'rgba(0, 0, 0, 0.8)',
	borderRadius: 5,
	padding: 5,
})
const backgroundLabelText = app.create('uitext', {
	value: 'BACKGROUND (green box)',
	fontSize: 18,
	color: '#00ff00',
	textAlign: 'center',
	fontWeight: 'bold',
})
backgroundLabel.add(backgroundLabelText)
app.add(backgroundLabel)

// HUD label - re-enabled
const hudLabel = app.create('ui', {
	width: 200,
	height: 30,
	position: [0.7, 0.2, 0],
	space: 'screen',
	backgroundColor: 'rgba(0, 0, 0, 0.8)',
	borderRadius: 5,
	padding: 5,
})
const hudLabelText = app.create('uitext', {
	value: 'HUD (screen-space)',
	fontSize: 14,
	color: '#ffffff',
	textAlign: 'center',
	fontWeight: 'bold',
})
hudLabel.add(hudLabelText)
app.add(hudLabel)

// Handle configuration changes
app.on('config', () => {
	if (tvScreen) {
		tvScreen.src = props.webviewUrl
		tvScreen.width = props.webviewWidth
		tvScreen.height = props.webviewHeight
		console.log('WebView config updated:', props.webviewUrl)
	}
})

// Add some movement to the occluder box for testing
let time = 0
app.on('update', (delta) => {
	time += delta
	if (occluderBox) {
		// Move the occluder box back and forth to test occlusion
		occluderBox.position.z = -4 + Math.sin(time * 0.5) * 2
	}
})

console.log('WebView test setup complete!')
console.log('- World-space WebView: TV screen with billboard mode')
console.log('- Screen-space WebView: HUD overlay in top-right')
console.log('- Red box moves back and forth to test occlusion')
console.log('- Green box stays behind the TV screen')
console.log('- Both WebViews have pointer events enabled for interaction')
console.log('- Move the camera around to test different angles and billboard behavior')
