// Cartridge implementation following wallet-connect.js pattern
// Uses proper SES-compatible syntax

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
	cartridge: null
}

// Create main UI container
const mainUI = app.create('ui', {
	space: 'screen',
	pivot: 'top-center',
	position: [0.9, 0.1, 0],
	width: 250,
	height: 150,
	backgroundColor: 'rgba(0, 0, 0, 0.8)',
	borderRadius: 12,
	padding: 16,
	flexDirection: 'column',
	gap: 12
})

// Create connect button
const connectButton = app.create('uiview', {
	width: 220,
	height: 45,
	backgroundColor: app.config?.buttonColor || '#10b981',
	borderRadius: 8,
	justifyContent: 'center',
	alignItems: 'center'
})

const buttonText = app.create('uitext', {
	value: app.config?.buttonText || 'Connect Cartridge',
	color: '#ffffff',
	fontSize: 16,
	fontWeight: 'bold',
	textAlign: 'center'
})

// Create status text
const statusText = app.create('uitext', {
	value: 'Ready to connect',
	color: '#cccccc',
	fontSize: 14,
	textAlign: 'center'
})

// Add components
connectButton.add(buttonText)
mainUI.add(connectButton)
mainUI.add(statusText)
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

// Connection functions
async function toggleConnection() {
	if (cartridgeState.connected) {
		await disconnect()
	} else {
		await connect()
	}
}

async function connect() {
	try {
		statusText.value = 'Connecting...'
		statusText.color = '#f59e0b'

		console.log('[Cartridge] Starting connection...')

		// Use the proper Hyperfy world.web3 API (which integrates @cartridge/controller)
		if (world.web3) {
			console.log('[Cartridge] Using world.web3 API')

			try {
				// Connect using the world web3 system
				const result = await world.web3.connect()
				console.log('[Cartridge] World web3 connection result:', result)

				if (result && result.address) {
					cartridgeState.connected = true
					cartridgeState.address = result.address
					cartridgeState.cartridge = world.web3.controller
					onConnectionSuccess()
				} else {
					throw new Error('No account address returned from world.web3')
				}

			} catch (web3Error) {
				console.log('[Cartridge] world.web3 connection failed:', web3Error.message)

				// Try alternative method using world.connectCartridge (if available)
				if (world.connectCartridge) {
					console.log('[Cartridge] Trying world.connectCartridge...')
					const cartridgeResult = await world.connectCartridge()

					if (cartridgeResult && cartridgeResult.address) {
						cartridgeState.connected = true
						cartridgeState.address = cartridgeResult.address
						cartridgeState.cartridge = cartridgeResult.controller
						onConnectionSuccess()
					} else {
						throw new Error('No address returned from world.connectCartridge')
					}
				} else {
					throw web3Error
				}
			}

		} else {
			console.error('[Cartridge] ❌ CARTRIDGE ENGINE ERROR: world.web3 not available')
			console.error('[Cartridge] This deployment requires cartridge integration as an engine feature')

			throw new Error('CARTRIDGE ENGINE ERROR: world.web3 API not available. Cartridge is a required engine feature and must be properly initialized.')
		}

	} catch (error) {
		console.error('[Cartridge] ❌ REAL CARTRIDGE CONNECTION FAILED:', error)
		console.error('[Cartridge] This is a real cartridge integration error - check browser environment')

		statusText.value = 'Real cartridge connection failed'
		statusText.color = '#ef4444'

		// Don't auto-retry for real cartridge errors - user action required
		setTimeout(() => {
			if (!cartridgeState.connected) {
				statusText.value = 'Cartridge connection required'
				statusText.color = '#dc2626'
			}
		}, 5000)
	}
}

function onConnectionSuccess() {
	console.log('[Cartridge] ✅ REAL CARTRIDGE CONNECTION SUCCESSFUL:', cartridgeState.address)
	console.log('[Cartridge] Integration: Real @cartridge/controller')
	console.log('[Cartridge] Engine Status: OPERATIONAL')

	statusText.value = 'Real Cartridge: ' + cartridgeState.address.slice(0, 6) + '...' + cartridgeState.address.slice(-4)
	statusText.color = '#10b981'
	buttonText.value = 'Disconnect'
	connectButton.backgroundColor = '#ef4444'

	// Emit event for other apps
	app.emit('cartridgeConnected', {
		connected: true,
		address: cartridgeState.address,
		integration: 'REAL_CARTRIDGE_CONTROLLER',
		engineFeature: 'ACTIVE'
	})
}

async function disconnect() {
	try {
		console.log('[Cartridge] Disconnecting...')

		// Use world.web3.disconnect() if available
		if (world.web3 && cartridgeState.connected) {
			console.log('[Cartridge] Using world.web3.disconnect()')
			await world.web3.disconnect()
		}

		cartridgeState.connected = false
		cartridgeState.address = null
		cartridgeState.cartridge = null

		// Update UI
		statusText.value = 'Disconnected'
		statusText.color = '#cccccc'
		buttonText.value = app.config?.buttonText || 'Connect Cartridge'
		connectButton.backgroundColor = app.config?.buttonColor || '#10b981'

		// Emit event
		app.emit('cartridgeDisconnected', {})

		setTimeout(() => {
			if (!cartridgeState.connected) {
				statusText.value = 'Ready to connect'
				statusText.color = '#cccccc'
			}
		}, 2000)

	} catch (error) {
		console.error('[Cartridge] Disconnect failed:', error)
		// Force disconnect even if API fails
		cartridgeState.connected = false
		cartridgeState.address = null
		cartridgeState.cartridge = null

		statusText.value = 'Disconnected'
		statusText.color = '#cccccc'
		buttonText.value = app.config?.buttonText || 'Connect Cartridge'
		connectButton.backgroundColor = app.config?.buttonColor || '#10b981'
	}
}

// Expose functions globally
function connectWallet() {
	return connect()
}

function disconnectWallet() {
	disconnect()
}

function getWalletState() {
	return {
		connected: cartridgeState.connected,
		address: cartridgeState.address
	}
}

function getCartridge() {
	return cartridgeState.cartridge
}

// Initial diagnostics
console.log('[Cartridge] App initialized')
console.log('[Cartridge] Running on:', world.isClient ? 'Client' : 'Server')