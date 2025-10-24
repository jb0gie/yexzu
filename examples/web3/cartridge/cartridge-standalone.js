// Standalone Cartridge Implementation
// Loads @cartridge/controller directly into browser environment
// Based on React documentation integration patterns

// Configure the app with customizable properties
app.configure([
	{
		key: 'buttonText',
		type: 'text',
		label: 'Connect Button Text',
		hint: 'Text displayed on the main connect button.',
		initial: 'Connect Cartridge'
	},
	{
		key: 'buttonColor',
		type: 'color',
		label: 'Button Color',
		hint: 'Background color of the connect button (hex or color name).',
		initial: '#10b981'
	}
])

// Cartridge state
let cartridgeState = {
	connected: false,
	address: null,
	controller: null,
	loading: false
}

// UI elements
let mainUI, connectButton, buttonText, statusText

// Initialize the app
function initApp() {
	if (!world.isClient) {
		console.log('[Cartridge] Server environment - skipping cartridge initialization')
		return
	}

	console.log('[Cartridge] Initializing standalone cartridge app...')
	createUI()
	loadCartridgeController()
}

// Create UI elements
function createUI() {
	mainUI = app.create('ui', {
		space: 'screen',
		pivot: 'top-center',
		position: [0.9, 0.1, 0],
		width: 280,
		height: 180,
		backgroundColor: 'rgba(0, 0, 0, 0.9)',
		borderRadius: 12,
		padding: 16,
		flexDirection: 'column',
		gap: 12
	})

	// Connect button
	connectButton = app.create('uiview', {
		width: 250,
		height: 45,
		backgroundColor: app.config?.buttonColor || '#10b981',
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center'
	})

	buttonText = app.create('uitext', {
		value: app.config?.buttonText || 'Connect Cartridge',
		color: '#ffffff',
		fontSize: 16,
		fontWeight: 'bold',
		textAlign: 'center'
	})

	// Status text
	statusText = app.create('uitext', {
		value: 'Loading controller...',
		color: '#f59e0b',
		fontSize: 14,
		textAlign: 'center'
	})

	// Loading indicator
	let loadingText = app.create('uitext', {
		value: 'Initializing cartridge...',
		color: '#6b7280',
		fontSize: 12,
		textAlign: 'center'
	})

	// Assemble UI
	connectButton.add(buttonText)
	mainUI.add(connectButton)
	mainUI.add(statusText)
	mainUI.add(loadingText)
	app.add(mainUI)

	// Event handlers
	connectButton.onPointerDown = () => {
		toggleConnection()
	}

	connectButton.onPointerOver = () => {
		if (cartridgeState.connected) {
			connectButton.backgroundColor = '#dc2626'
		} else {
			connectButton.backgroundColor = '#059669'
		}
	}

	connectButton.onPointerOut = () => {
		if (cartridgeState.connected) {
			connectButton.backgroundColor = '#ef4444'
		} else {
			connectButton.backgroundColor = app.config?.buttonColor || '#10b981'
		}
	}

	// Hide loading text after initialization
	setTimeout(() => {
		if (loadingText.parent) {
			mainUI.remove(loadingText)
		}
	}, 3000)
}

// Load Cartridge Controller into browser environment
function loadCartridgeController() {
	if (cartridgeState.loading) return
	cartridgeState.loading = true

	console.log('[Cartridge] Attempting to load @cartridge/controller...')

	// Try to load from different sources
	tryControllerLoad()
}

async function tryControllerLoad() {
	try {
		// Method 1: Check if already available globally
		if (typeof window !== 'undefined' && window.cartridge) {
			console.log('[Cartridge] Found window.cartridge')
			cartridgeState.controller = window.cartridge
			updateStatus('Controller found - ready to connect')
			return
		}

		// Method 2: Try to import from ES modules (if supported)
		if (typeof window !== 'undefined' && window.importShim) {
			console.log('[Cartridge] Trying module import...')
			const Controller = await window.importShim('@cartridge/controller')
			cartridgeState.controller = new Controller.default({
				chains: [
					{ rpcUrl: 'https://api.cartridge.gg/x/starknet/sepolia' },
					{ rpcUrl: 'https://api.cartridge.gg/x/starknet/mainnet' }
				]
			})
			updateStatus('Controller loaded via module import')
			return
		}

		// Method 3: Inject script tag to load from CDN
		console.log('[Cartridge] Attempting to load controller from CDN...')
		injectCartridgeScript()

	} catch (error) {
		console.error('[Cartridge] Controller load failed:', error)
		updateStatus('Controller not available - install @cartridge/controller')
		cartridgeState.loading = false
	}
}

// Inject Cartridge Controller script from CDN
function injectCartridgeScript() {
	if (typeof document === 'undefined') {
		// Not a browser environment
		updateStatus('Browser required for cartridge')
		cartridgeState.loading = false
		return
	}

	const script = document.createElement('script')
	script.src = 'https://unpkg.com/@cartridge/controller@0.10.3/dist/index.js'
	script.crossOrigin = 'anonymous'
	script.onerror = (error) => {
		console.error('[Cartridge] Script load failed:', error)
		updateStatus('Failed to load cartridge library')
		cartridgeState.loading = false
	}

	script.onload = () => {
		console.log('[Cartridge] Script loaded successfully')
		// The script should expose CartridgeController globally
		if (typeof window !== 'undefined' && window.CartridgeController) {
			cartridgeState.controller = new window.CartridgeController({
				chains: [
					{ rpcUrl: 'https://api.cartridge.gg/x/starknet/sepolia' },
					{ rpcUrl: 'https://api.cartridge.gg/x/starknet/mainnet' }
				]
			})
			updateStatus('Controller loaded successfully')
			cartridgeState.loading = false
		} else {
			updateStatus('Controller loaded but not available')
			cartridgeState.loading = false
		}
	}

	// Add script to document
	(document.head || document.documentElement).appendChild(script)
}

// Toggle connection
async function toggleConnection() {
	if (cartridgeState.loading) {
		updateStatus('Controller still loading...')
		return
	}

	if (cartridgeState.connected) {
		await disconnect()
	} else {
		await connect()
	}
}

// Connect to cartridge
async function connect() {
	try {
		if (!cartridgeState.controller) {
			updateStatus('No controller available')
			return
		}

		updateStatus('Connecting...')
		console.log('[Cartridge] Attempting connection with controller:', cartridgeState.controller)

		// Use the controller to connect
		const account = await cartridgeState.controller.connect()

		if (account && account.address) {
			cartridgeState.connected = true
			cartridgeState.address = account.address
			onConnectionSuccess()
		} else {
			throw new Error('No account returned from controller')
		}

	} catch (error) {
		console.error('[Cartridge] Connection failed:', error)
		updateStatus('Connection failed: ' + error.message)

		setTimeout(() => {
			if (!cartridgeState.connected) {
				updateStatus('Ready to connect')
			}
		}, 3000)
	}
}

// Handle successful connection
function onConnectionSuccess() {
	console.log('[Cartridge] Connected successfully:', cartridgeState.address)

	updateStatus('Connected: ' + cartridgeState.address.slice(0, 6) + '...' + cartridgeState.address.slice(-4))
	buttonText.value = 'Disconnect'
	connectButton.backgroundColor = '#ef4444'

	// Emit event for other apps
	app.emit('cartridgeConnected', {
		connected: true,
		address: cartridgeState.address,
		controller: cartridgeState.controller
	})
}

// Disconnect
async function disconnect() {
	try {
		console.log('[Cartridge] Disconnecting...')

		if (cartridgeState.controller && cartridgeState.controller.disconnect) {
			await cartridgeState.controller.disconnect()
		}

		cartridgeState.connected = false
		cartridgeState.address = null

		// Update UI
		updateStatus('Disconnected')
		buttonText.value = app.config?.buttonText || 'Connect Cartridge'
		connectButton.backgroundColor = app.config?.buttonColor || '#10b981'

		// Emit event
		app.emit('cartridgeDisconnected', {})

		setTimeout(() => {
			if (!cartridgeState.connected) {
				updateStatus('Ready to connect')
			}
		}, 2000)

	} catch (error) {
		console.error('[Cartridge] Disconnect failed:', error)
		// Force disconnect even if error
		cartridgeState.connected = false
		cartridgeState.address = null
		updateStatus('Disconnected')
		buttonText.value = app.config?.buttonText || 'Connect Cartridge'
		connectButton.backgroundColor = app.config?.buttonColor || '#10b981'
	}
}

// Update status text
function updateStatus(message) {
	console.log('[Cartridge] Status:', message)
	if (statusText) {
		statusText.value = message

		// Set color based on status
		if (message.includes('Connecting') || message.includes('Loading')) {
			statusText.color = '#f59e0b'
		} else if (message.includes('Connected')) {
			statusText.color = '#10b981'
		} else if (message.includes('Failed') || message.includes('Error')) {
			statusText.color = '#ef4444'
		} else {
			statusText.color = '#cccccc'
		}
	}
}

// Expose global functions
function connectWallet() {
	return connect()
}

function disconnectWallet() {
	return disconnect()
}

function getWalletState() {
	return {
		connected: cartridgeState.connected,
		address: cartridgeState.address,
		loading: cartridgeState.loading,
		hasController: !!cartridgeState.controller
	}
}

function getController() {
	return cartridgeState.controller
}

// Initialize the app
initApp()

// Initial diagnostics
console.log('[Cartridge] Standalone cartridge app initialized')
console.log('[Cartridge] Environment:', world.isClient ? 'Client' : 'Server')
console.log('[Cartridge] Has window:', typeof window !== 'undefined')
console.log('[Cartridge] Has document:', typeof document !== 'undefined')
console.log('[Cartridge] Has globalThis:', typeof globalThis !== 'undefined')
console.log('[Cartridge] Global objects:', Object.keys(typeof globalThis !== 'undefined' ? globalThis : {}))
console.log('[Cartridge] Available globals:', typeof this !== 'undefined' ? Object.keys(this) : 'no this')
console.log('[Cartridge] Trying to access world.web3:', typeof world.web3 !== 'undefined' ? 'Available' : 'Not available')