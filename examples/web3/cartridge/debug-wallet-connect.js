/**
 * Debug Wallet Connection Example
 * 
 * This version includes detailed error logging and debugging information
 * to help diagnose Web3 integration issues.
 */

// Only run on client
if (world.isClient) {
	console.log('[DebugWalletConnect] Starting debug wallet connect example...')

	// Check if world.web3 exists immediately
	console.log('[DebugWalletConnect] world.web3 exists:', typeof world.web3 !== 'undefined')
	if (world.web3) {
		console.log('[DebugWalletConnect] world.web3 methods:', Object.keys(world.web3))
	}

	// State
	let connected = false
	let address = null
	let chainId = null

	// Create UI with error handling
	let ui
	try {
		ui = app.create('ui')
		ui.width = 400
		ui.height = 350
		ui.backgroundColor = 'rgba(0, 15, 30, 0.9)'
		ui.borderRadius = 20
		ui.padding = 20
		ui.billboard = 'full'
		ui.pivot = 'center'
		ui.justifyContent = 'center'
		ui.alignItems = 'center'
		ui.gap = 15
		ui.position.y = 2

		console.log('[DebugWalletConnect] UI created successfully')
		app.add(ui)
		console.log('[DebugWalletConnect] UI added to app')
	} catch (error) {
		console.error('[DebugWalletConnect] Failed to create UI:', error)
		return // Exit if UI creation fails
	}

	// Create UI text elements with error handling
	let title, debugInfo, status, addressText, chainText, connectBtn

	try {
		// Title
		title = app.create('uitext')
		title.value = 'DEBUG WALLET CONNECT'
		title.color = '#00ffaa'
		title.fontSize = 20
		title.fontWeight = 'bold'
		ui.add(title)

		// Debug info
		debugInfo = app.create('uitext')
		debugInfo.value = 'Initializing...'
		debugInfo.color = '#ffffff'
		debugInfo.fontSize = 12
		ui.add(debugInfo)

		// Status text
		status = app.create('uitext')
		status.value = 'Not Connected'
		status.color = '#ffffff'
		status.fontSize = 16
		ui.add(status)

		// Address display
		addressText = app.create('uitext')
		addressText.value = ''
		addressText.color = '#00ffaa'
		addressText.fontSize = 14
		addressText.active = false
		ui.add(addressText)

		// Chain ID display
		chainText = app.create('uitext')
		chainText.value = ''
		chainText.color = '#00ffaa'
		chainText.fontSize = 14
		chainText.active = false
		ui.add(chainText)

		console.log('[DebugWalletConnect] UI text elements created successfully')
	} catch (error) {
		console.error('[DebugWalletConnect] Failed to create UI text elements:', error)
		return
	}

	// Connect button
	try {
		connectBtn = app.create('uitext')
		connectBtn.value = '[ CONNECT WALLET ]'
		connectBtn.color = '#00ffaa'
		connectBtn.fontSize = 16
		connectBtn.backgroundColor = 'rgba(0, 0, 0, 0.5)'
		connectBtn.padding = 12
		connectBtn.borderRadius = 8
		connectBtn.fontWeight = 'bold'

		connectBtn.onPointerOver = () => {
			connectBtn.backgroundColor = 'rgba(0, 30, 60, 0.8)'
		}

		connectBtn.onPointerOut = () => {
			connectBtn.backgroundColor = 'rgba(0, 0, 0, 0.5)'
		}

		connectBtn.onPointerDown = () => {
			connectBtn.color = '#ffffff'
		}

		connectBtn.onPointerUp = async () => {
			connectBtn.color = '#00ffaa'

			if (!connected) {
				await handleConnect()
			} else {
				await handleDisconnect()
			}
		}

		ui.add(connectBtn)
		console.log('[DebugWalletConnect] Connect button created successfully')
	} catch (error) {
		console.error('[DebugWalletConnect] Failed to create connect button:', error)
		return
	}

	// Update debug info
	function updateDebugInfo() {
		const info = []
		info.push(`world.web3: ${typeof world.web3 !== 'undefined' ? '✓' : '✗'}`)

		if (world.web3) {
			info.push(`connect: ${typeof world.web3.connect === 'function' ? '✓' : '✗'}`)
			info.push(`on: ${typeof world.web3.on === 'function' ? '✓' : '✗'}`)
			info.push(`isConnected: ${typeof world.web3.isConnected === 'function' ? '✓' : '✗'}`)
		}

		debugInfo.value = info.join(' | ')
	}

	// Connection handler
	async function handleConnect() {
		try {
			console.log('[DebugWalletConnect] Attempting to connect...')
			status.value = 'Connecting...'
			status.color = '#ffaa00'

			// Check if world.web3 exists before trying to use it
			if (!world.web3) {
				throw new Error('world.web3 is not available')
			}

			if (typeof world.web3.connect !== 'function') {
				throw new Error('world.web3.connect is not a function')
			}

			const result = await world.web3.connect()
			console.log('[DebugWalletConnect] Connection result:', result)

			connected = true
			address = result.address
			chainId = result.chainId

			updateUI()
			updateDebugInfo()

			world.chat('Wallet connected successfully!', true)
		} catch (error) {
			console.error('[DebugWalletConnect] Connection failed:', error)
			status.value = `Error: ${error.message}`
			status.color = '#ff0000'
			world.chat(`Failed to connect wallet: ${error.message}`, true)
			updateDebugInfo()
		}
	}

	// Disconnection handler
	async function handleDisconnect() {
		try {
			console.log('[DebugWalletConnect] Attempting to disconnect...')
			await world.web3.disconnect()

			connected = false
			address = null
			chainId = null

			updateUI()
			updateDebugInfo()

			world.chat('Wallet disconnected', true)
		} catch (error) {
			console.error('[DebugWalletConnect] Disconnect failed:', error)
			world.chat(`Failed to disconnect wallet: ${error.message}`, true)
		}
	}

	// Update UI based on connection state
	function updateUI() {
		if (connected) {
			status.value = 'Connected'
			status.color = '#00ff00'

			// Show address (shortened)
			const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
			addressText.value = `Address: ${shortAddress}`
			addressText.active = true

			// Show chain ID
			chainText.value = `Chain: ${chainId}`
			chainText.active = true

			connectBtn.value = '[ DISCONNECT ]'
		} else {
			status.value = 'Not Connected'
			status.color = '#ffffff'

			addressText.active = false
			chainText.active = false

			connectBtn.value = '[ CONNECT WALLET ]'
		}
	}

	// Setup event listeners with error handling
	function setupEventListeners() {
		try {
			if (world.web3 && typeof world.web3.on === 'function') {
				console.log('[DebugWalletConnect] Setting up event listeners...')

				world.web3.on('connected', data => {
					console.log('[DebugWalletConnect] Wallet connected event:', data)
				})

				world.web3.on('disconnected', () => {
					console.log('[DebugWalletConnect] Wallet disconnected event')
				})

				world.web3.on('error', error => {
					console.error('[DebugWalletConnect] Web3 error event:', error)
				})

				console.log('[DebugWalletConnect] Event listeners set up successfully')
			} else {
				console.warn('[DebugWalletConnect] Cannot set up event listeners - world.web3.on not available')
			}
		} catch (error) {
			console.error('[DebugWalletConnect] Failed to set up event listeners:', error)
		}
	}

	// Check if already connected
	function checkInitialState() {
		try {
			if (world.web3 && typeof world.web3.isConnected === 'function') {
				if (world.web3.isConnected()) {
					connected = true
					address = world.web3.getAddress()
					chainId = world.web3.getNetworkId()
					updateUI()
					console.log('[DebugWalletConnect] Already connected:', { address, chainId })
				}
			}
		} catch (error) {
			console.error('[DebugWalletConnect] Failed to check initial state:', error)
		}
	}

	// Initialize everything
	updateDebugInfo()
	setupEventListeners()
	checkInitialState()

	console.log('[DebugWalletConnect] Debug wallet connect example initialized')
}
