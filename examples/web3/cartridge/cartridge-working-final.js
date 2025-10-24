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
		initial: '#8b5cf6' // Cartridge purple
	},
	{
		key: 'hotKeyToggle',
		type: 'text',
		label: 'Toggle UI Hotkey',
		hint: 'Keyboard key to show/hide the cartridge UI (single character).',
		initial: 'I'
	},
	{
		key: 'hotKeyConnect',
		type: 'text',
		label: 'Quick Connect Hotkey',
		hint: 'Keyboard key for quick cartridge connect/disconnect (single character).',
		initial: 'Q'
	}
])

// Cartridge state
let cartridgeState = {
	connected: false,
	address: null,
	cartridge: null
}

// Hotkey system variables (inspired by wallet-connect.js)
let control = null
let uiVisible = true
let hotKeyToggleCtrl = null
let hotKeyConnectCtrl = null
let toggleKeyPrevPressed = false
let connectKeyPrevPressed = false

// Create main UI container with Cartridge branding
const mainUI = app.create('ui', {
	space: 'screen',
	pivot: 'top-center',
	position: [0.9, 0.1, 0],
	width: 280,
	height: 220,
	backgroundColor: 'rgba(17, 24, 39, 0.95)', // Dark slate with higher opacity
	borderRadius: 16,
	padding: 16,
	flexDirection: 'column',
	gap: 12,
	borderWidth: 2,
	borderColor: 'rgba(139, 92, 246, 0.6)', // Cartridge purple border
	shadowColor: 'rgba(139, 92, 246, 0.3)', // Purple glow
	shadowBlur: 8
})

// Create connect button with Cartridge styling
const connectButton = app.create('uiview', {
	width: 220,
	height: 48,
	backgroundColor: app.config?.buttonColor || '#8b5cf6', // Cartridge purple
	borderRadius: 12,
	justifyContent: 'center',
	alignItems: 'center',
	borderWidth: 1,
	borderColor: 'rgba(168, 85, 247, 0.4)', // Lighter purple border
	shadowColor: 'rgba(139, 92, 246, 0.4)', // Purple shadow
	shadowBlur: 6
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

// Create hotkey hints text
const hotkeysText = app.create('uitext', {
	value: 'I: Toggle UI • Q: Quick Connect',
	color: '#64748b', // Muted gray
	fontSize: 10,
	textAlign: 'center',
	fontWeight: '400',
	opacity: 0.7
})

// Create user info container (shown when connected) with Cartridge styling
const userInfoContainer = app.create('ui', {
	width: 250,
	height: 120,
	flexDirection: 'column',
	gap: 8,
	visible: false, // Hidden initially
	backgroundColor: 'rgba(139, 92, 246, 0.1)', // Subtle purple background
	borderRadius: 12,
	padding: 12,
	borderWidth: 1,
	borderColor: 'rgba(168, 85, 247, 0.3)' // Light purple border
})

// Username display
const usernameText = app.create('uitext', {
	value: '',
	color: '#ffffff',
	fontSize: 16,
	fontWeight: 'bold',
	textAlign: 'center'
})

// Wallet info container
const walletInfoContainer = app.create('ui', {
	width: 250,
	height: 60,
	flexDirection: 'column',
	gap: 4
})

// Wallet address with copy button container
const walletAddressContainer = app.create('ui', {
	width: 250,
	height: 30,
	flexDirection: 'row',
	justifyContent: 'space-between',
	alignItems: 'center'
})

// Wallet address text
const walletAddressText = app.create('uitext', {
	value: '',
	color: '#94a3b8',
	fontSize: 12,
	textAlign: 'left'
})

// Copy wallet button with Cartridge styling
const copyButton = app.create('uiview', {
	width: 60,
	height: 28,
	backgroundColor: 'rgba(168, 85, 247, 0.8)', // Cartridge purple
	borderRadius: 8,
	justifyContent: 'center',
	alignItems: 'center',
	borderWidth: 1,
	borderColor: 'rgba(196, 181, 253, 0.4)' // Light purple border
})

const copyButtonText = app.create('uitext', {
	value: 'Copy',
	color: '#ffffff',
	fontSize: 11,
	fontWeight: 'bold',
	textAlign: 'center'
})

// Balance display
const balanceText = app.create('uitext', {
	value: '',
	color: '#10b981',
	fontSize: 14,
	textAlign: 'center'
})

// Assemble wallet info
copyButton.add(copyButtonText)
walletAddressContainer.add(walletAddressText)
walletAddressContainer.add(copyButton)
walletInfoContainer.add(walletAddressContainer)
walletInfoContainer.add(balanceText)

// Assemble user info
userInfoContainer.add(usernameText)
userInfoContainer.add(walletInfoContainer)

// Add Cartridge title/branding
const cartridgeTitle = app.create('uitext', {
	value: '⚡ CARTRIDGE',
	color: '#a855f7', // Bright purple
	fontSize: 12,
	fontWeight: 'bold',
	textAlign: 'center',
	letterSpacing: 2,
	opacity: 0.8
})

// Add components
connectButton.add(buttonText)
mainUI.add(connectButton)
mainUI.add(cartridgeTitle)
mainUI.add(statusText)
mainUI.add(userInfoContainer)
mainUI.add(hotkeysText)
app.add(mainUI)

// Event handlers
connectButton.onPointerDown = () => {
	toggleConnection()
}

connectButton.onPointerOver = () => {
	if (cartridgeState.connected) {
		connectButton.backgroundColor = '#dc2626' // Darker red for disconnect
	} else {
		connectButton.backgroundColor = 'rgba(168, 85, 247, 0.9)' // Lighter Cartridge purple on hover
	}
}

// Copy button functionality
copyButton.onPointerDown = () => {
	if (cartridgeState.address) {
		// Copy to clipboard
		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			navigator.clipboard.writeText(cartridgeState.address).then(() => {
				copyButtonText.value = 'Copied!'
				copyButton.backgroundColor = '#10b981' // Green for success
				setTimeout(() => {
					copyButtonText.value = 'Copy'
					copyButton.backgroundColor = 'rgba(168, 85, 247, 0.8)' // Back to Cartridge purple
				}, 2000)
			}).catch(err => {
				console.error('[Cartridge] Failed to copy address:', err)
			})
		}
	}
}

copyButton.onPointerOver = () => {
	copyButton.backgroundColor = 'rgba(196, 181, 253, 0.9)' // Lighter purple on hover
}

copyButton.onPointerOut = () => {
	copyButton.backgroundColor = 'rgba(168, 85, 247, 0.8)' // Back to normal Cartridge purple
}

connectButton.onPointerOut = () => {
	if (cartridgeState.connected) {
		connectButton.backgroundColor = '#ef4444' // Red for disconnect
	} else {
		connectButton.backgroundColor = app.config?.buttonColor || '#8b5cf6' // Cartridge purple
	}
}

// Function to update hotkey hints
function updateHotkeyHints() {
	const toggleKey = (app.config && app.config.hotKeyToggle) || 'I'
	const connectKey = (app.config && app.config.hotKeyConnect) || 'Q'

	let connectHint = 'Quick Connect'
	if (cartridgeState.connected) {
		connectHint = 'Disconnect'
	}

	hotkeysText.value = `${toggleKey}: Toggle UI • ${connectKey}: ${connectHint}`
}

// Initialize hotkeys on client (inspired by wallet-connect.js)
function initHotkeys() {
	if (!world.isClient) return

	try {
		control = app.control()
		if (!control) return

		console.log('[Cartridge] Initializing hotkey system')

		// Function to map a single character to control key handle
		function resolveKey(char, fallbackChar) {
			const letter = (char || fallbackChar || '').trim().toUpperCase()
			const k = control['key' + letter]
			return k || control['key' + fallbackChar]
		}

		function refreshKeyBindings() {
			// Release previous captures
			if (hotKeyToggleCtrl) hotKeyToggleCtrl.capture = false
			if (hotKeyConnectCtrl) hotKeyConnectCtrl.capture = false

			// Get keys from app config
			const toggleKey = (app.config && app.config.hotKeyToggle) || 'I'
			const connectKey = (app.config && app.config.hotKeyConnect) || 'Q'

			hotKeyToggleCtrl = resolveKey(toggleKey, 'I')
			hotKeyConnectCtrl = resolveKey(connectKey, 'Q')

			// Capture the keys
			if (hotKeyToggleCtrl) {
				hotKeyToggleCtrl.capture = true
				console.log('[Cartridge] Bound toggle key:', toggleKey, 'to control:', hotKeyToggleCtrl)
			}
			if (hotKeyConnectCtrl) {
				hotKeyConnectCtrl.capture = true
				console.log('[Cartridge] Bound connect key:', connectKey, 'to control:', hotKeyConnectCtrl)
			}

			console.log('[Cartridge] Hotkeys configured:', {
				toggle: toggleKey,
				connect: connectKey,
				toggleControl: !!hotKeyToggleCtrl,
				connectControl: !!hotKeyConnectCtrl
			})
		}

		// Initial binding
		refreshKeyBindings()
		// Store on control for access in update loop
		control._refreshCartridgeKeyBindings = refreshKeyBindings

	} catch (error) {
		console.error('[Cartridge] Error initializing hotkeys:', error)
	}
}

// Toggle UI visibility
function toggleUI() {
	uiVisible = !uiVisible
	mainUI.active = uiVisible
	console.log('[Cartridge] UI', uiVisible ? 'shown' : 'hidden')
}

// Quick connect/disconnect
async function quickConnect() {
	if (cartridgeState.connected) {
		// Disconnect
		await disconnect()
	} else {
		// Connect
		await connect()
	}
}

// Hotkey update loop (inspired by wallet-connect.js)
app.on('update', () => {
	if (!world.isClient || !control) return

	// Refresh key bindings in case config changed
	if (control._refreshCartridgeKeyBindings) {
		control._refreshCartridgeKeyBindings()
	}

	// Handle toggle UI hotkey
	if (hotKeyToggleCtrl?.pressed && !toggleKeyPrevPressed) {
		toggleUI()
	}
	toggleKeyPrevPressed = hotKeyToggleCtrl?.pressed

	// Handle quick connect/disconnect hotkey
	if (hotKeyConnectCtrl?.pressed && !connectKeyPrevPressed) {
		quickConnect()
	}
	connectKeyPrevPressed = hotKeyConnectCtrl?.pressed
})

// Fetch username for the connected wallet
async function fetchUsername(address) {
	try {
		// Try to get username from cartridge controller or account
		if (cartridgeState.cartridge && cartridgeState.cartridge.getUsername) {
			const username = await cartridgeState.cartridge.getUsername()
			return username || `Cartridge User`
		}

		// Fallback: use first part of address as temporary name
		return `User ${address.slice(0, 6)}`
	} catch (error) {
		console.log('[Cartridge] Could not fetch username:', error.message)
		return `User ${address.slice(0, 6)}`
	}
}

// Fetch token balance for the connected wallet
async function fetchBalance(address) {
	try {
		if (world.web3 && world.web3.account) {
			// Try to get ETH balance from the connected account
			// Note: This is a simplified balance check - real implementation would need proper StarkNet token contracts
			const balance = await world.web3.account.getBalance()
			return balance ? `${parseFloat(balance).toFixed(4)} ETH` : '0.0000 ETH'
		}

		// Fallback for now - would need real balance fetching implementation
		return 'Loading...'
	} catch (error) {
		console.log('[Cartridge] Could not fetch balance:', error.message)
		return 'Balance unavailable'
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
				// Add timeout to handle modal cancellation scenario
				const connectPromise = world.web3.connect()
				const timeoutPromise = new Promise((_, reject) => {
					setTimeout(() => reject(new Error('Connection timeout - user may have cancelled modal')), 30000)
				})

				// Race between connection and timeout
				const result = await Promise.race([connectPromise, timeoutPromise])
				console.log('[Cartridge] World web3 connection result:', result)

				if (result && result.address) {
					cartridgeState.connected = true
					cartridgeState.address = result.address
					cartridgeState.cartridge = world.web3.controller
					await onConnectionSuccess(result)
				} else {
					throw new Error('No account address returned from world.web3')
				}

			} catch (web3Error) {
				console.log('[Cartridge] world.web3 connection failed:', web3Error.message)

				// Check if user cancelled the modal vs actual error
				if (web3Error.message && (
					web3Error.message.includes('User cancelled') ||
					web3Error.message.includes('User rejected') ||
					web3Error.message.includes('Modal closed') ||
					web3Error.message.includes('dismissed') ||
					web3Error.message.includes('User denied') ||
					web3Error.message.includes('Connection timeout') ||
					web3Error.message.includes('user may have cancelled modal')
				)) {
					// User cancelled modal - reset to initial state
					console.log('[Cartridge] User cancelled connection modal')
					statusText.value = 'Ready to connect'
					statusText.color = '#cccccc'
					return
				}

				// Try alternative method using world.connectCartridge (if available)
				if (world.connectCartridge) {
					console.log('[Cartridge] Trying world.connectCartridge...')
					const cartridgeResult = await world.connectCartridge()

					if (cartridgeResult && cartridgeResult.address) {
						cartridgeState.connected = true
						cartridgeState.address = cartridgeResult.address
						cartridgeState.cartridge = cartridgeResult.controller
						await onConnectionSuccess(cartridgeResult)
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

		// Check if this is a modal cancellation
		if (error.message && (
			error.message.includes('User cancelled') ||
			error.message.includes('User rejected') ||
			error.message.includes('Modal closed') ||
			error.message.includes('dismissed') ||
			error.message.includes('User denied') ||
			error.message.includes('Connection timeout') ||
			error.message.includes('user may have cancelled modal')
		)) {
			// User cancelled - reset to ready state
			console.log('[Cartridge] Connection cancelled by user')
			statusText.value = 'Ready to connect'
			statusText.color = '#cccccc'
			return
		}

		statusText.value = 'Real cartridge connection failed'
		statusText.color = '#ef4444'

		// Don't auto-retry for real cartridge errors - user action required
		setTimeout(() => {
			if (!cartridgeState.connected) {
				statusText.value = 'Ready to connect'
				statusText.color = '#cccccc'
			}
		}, 2000)
	}
}

async function onConnectionSuccess(connectionResult) {
	console.log('[Cartridge] ✅ REAL CARTRIDGE CONNECTION SUCCESSFUL:', cartridgeState.address)
	console.log('[Cartridge] Integration: Real @cartridge/controller')
	console.log('[Cartridge] Engine Status: OPERATIONAL')

	// Hide status text and show user info container
	statusText.visible = false
	userInfoContainer.visible = true

	// Update button to show disconnect
	buttonText.value = 'Disconnect'
	connectButton.backgroundColor = '#ef4444'

	// Fetch and display additional user info
	try {
		// Get username
		const username = await fetchUsername(cartridgeState.address)
		usernameText.value = username

		// Display wallet address (shortened)
		const shortAddress = cartridgeState.address.slice(0, 6) + '...' + cartridgeState.address.slice(-4)
		walletAddressText.value = shortAddress

		// Fetch and display balance (show loading initially)
		balanceText.value = 'Loading balance...'

		// Try to fetch the actual balance
		const balance = await fetchBalance(cartridgeState.address)
		balanceText.value = 'Balance: ' + balance

	} catch (error) {
		console.log('[Cartridge] Error fetching user info:', error.message)
		usernameText.value = 'Cartridge User'
		walletAddressText.value = cartridgeState.address.slice(0, 6) + '...' + cartridgeState.address.slice(-4)
		balanceText.value = 'Balance: Loading...'
	}

	// Update hotkey hints
	updateHotkeyHints()

	// Emit event for other apps
	app.emit('cartridgeConnected', {
		connected: true,
		address: cartridgeState.address,
		integration: 'REAL_CARTRIDGE_CONTROLLER',
		engineFeature: 'ACTIVE',
		connectionResult
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
		statusText.visible = true
		userInfoContainer.visible = false
		buttonText.value = app.config?.buttonText || 'Connect Cartridge'
		connectButton.backgroundColor = app.config?.buttonColor || '#10b981'

		// Clear user info
		usernameText.value = ''
		walletAddressText.value = ''
		balanceText.value = ''

		// Update hotkey hints
		updateHotkeyHints()

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
		statusText.visible = true
		userInfoContainer.visible = false
		buttonText.value = app.config?.buttonText || 'Connect Cartridge'
		connectButton.backgroundColor = app.config?.buttonColor || '#10b981'

		// Clear user info
		usernameText.value = ''
		walletAddressText.value = ''
		balanceText.value = ''

		// Update hotkey hints
		updateHotkeyHints()
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

// Initialize hotkeys on client
if (world.isClient) {
	initHotkeys()
	// Set initial hotkey hints
	updateHotkeyHints()
}

// Initial diagnostics
console.log('[Cartridge] App initialized')
console.log('[Cartridge] Running on:', world.isClient ? 'Client' : 'Server')