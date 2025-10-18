/**
 * Minimal Wallet Connection Example
 * 
 * This version avoids complex UI layouts and focuses on basic functionality
 * to isolate Web3 integration from UI issues.
 */

// Only run on client
if (world.isClient) {
	console.log('[MinimalWalletConnect] Starting minimal wallet connect...')

	// State
	let connected = false
	let address = null
	let chainId = null

	// Simple UI without complex layout
	const ui = app.create('ui')
	ui.width = 300
	ui.height = 200
	ui.backgroundColor = 'rgba(0, 15, 30, 0.9)'
	ui.padding = 20
	ui.billboard = 'full'
	ui.position.y = 2
	app.add(ui)

	// Simple status display
	const status = app.create('uitext')
	status.value = 'Not Connected'
	status.color = '#ffffff'
	status.fontSize = 16
	ui.add(status)

	// Simple connect button
	const connectBtn = app.create('uitext')
	connectBtn.value = '[ CONNECT WALLET ]'
	connectBtn.color = '#00ffaa'
	connectBtn.fontSize = 18
	connectBtn.backgroundColor = 'rgba(0, 0, 0, 0.5)'
	connectBtn.padding = 10
	ui.add(connectBtn)

	// Connection handler
	async function handleConnect() {
		try {
			console.log('[MinimalWalletConnect] Attempting to connect...')
			status.value = 'Connecting...'
			status.color = '#ffaa00'

			// Check if world.web3 exists
			if (!world.web3) {
				throw new Error('world.web3 is not available')
			}

			if (typeof world.web3.connect !== 'function') {
				throw new Error('world.web3.connect is not a function')
			}

			const result = await world.web3.connect()
			console.log('[MinimalWalletConnect] Connection result:', result)

			connected = true
			address = result.address
			chainId = result.chainId

			// Update UI
			status.value = 'Connected!'
			status.color = '#00ff00'
			connectBtn.value = '[ DISCONNECT ]'

			world.chat('Wallet connected successfully!', true)
		} catch (error) {
			console.error('[MinimalWalletConnect] Connection failed:', error)
			status.value = `Error: ${error.message}`
			status.color = '#ff0000'
			world.chat(`Failed to connect wallet: ${error.message}`, true)
		}
	}

	// Disconnection handler
	async function handleDisconnect() {
		try {
			console.log('[MinimalWalletConnect] Attempting to disconnect...')
			await world.web3.disconnect()

			connected = false
			address = null
			chainId = null

			// Update UI
			status.value = 'Not Connected'
			status.color = '#ffffff'
			connectBtn.value = '[ CONNECT WALLET ]'

			world.chat('Wallet disconnected', true)
		} catch (error) {
			console.error('[MinimalWalletConnect] Disconnect failed:', error)
			world.chat(`Failed to disconnect wallet: ${error.message}`, true)
		}
	}

	// Button click handler
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

	// Setup event listeners
	if (world.web3 && typeof world.web3.on === 'function') {
		world.web3.on('connected', data => {
			console.log('[MinimalWalletConnect] Connected event:', data)
		})

		world.web3.on('disconnected', () => {
			console.log('[MinimalWalletConnect] Disconnected event')
		})

		world.web3.on('error', error => {
			console.error('[MinimalWalletConnect] Error event:', error)
		})
	}

	// Check initial state
	if (world.web3 && typeof world.web3.isConnected === 'function') {
		if (world.web3.isConnected()) {
			connected = true
			address = world.web3.getAddress()
			chainId = world.web3.getNetworkId()

			status.value = 'Connected!'
			status.color = '#00ff00'
			connectBtn.value = '[ DISCONNECT ]'
		}
	}

	console.log('[MinimalWalletConnect] Minimal wallet connect initialized')
}
