/**
 * Simple Web3 System Test
 * 
 * This is a minimal test that only uses console logging to verify
 * that the Web3 system is properly initialized without complex UI.
 */

// Only run on client
if (world.isClient) {
	console.log('[SimpleWeb3Test] Starting simple Web3 test...')

	// Test 1: Check if world.web3 exists
	console.log('[SimpleWeb3Test] world.web3 exists:', typeof world.web3 !== 'undefined')

	if (typeof world.web3 === 'undefined') {
		console.error('[SimpleWeb3Test] ERROR: world.web3 is undefined!')
		world.chat('ERROR: world.web3 is not available', true)
		return
	}

	// Test 2: Check if world.web3 has required methods
	const requiredMethods = ['connect', 'disconnect', 'isConnected', 'on', 'off']
	const requiredProperties = ['getAddress', 'getNetworkId', 'getAccount']

	console.log('[SimpleWeb3Test] Testing required methods...')
	requiredMethods.forEach(method => {
		const exists = typeof world.web3[method] === 'function'
		console.log(`[SimpleWeb3Test] world.web3.${method}: ${exists ? '✓' : '✗'}`)
		if (!exists) {
			console.error(`[SimpleWeb3Test] ERROR: world.web3.${method} is missing!`)
		}
	})

	console.log('[SimpleWeb3Test] Testing required properties...')
	requiredProperties.forEach(prop => {
		const exists = typeof world.web3[prop] === 'function'
		console.log(`[SimpleWeb3Test] world.web3.${prop}: ${exists ? '✓' : '✗'}`)
		if (!exists) {
			console.error(`[SimpleWeb3Test] ERROR: world.web3.${prop} is missing!`)
		}
	})

	// Test 3: Try to set up event listeners
	try {
		console.log('[SimpleWeb3Test] Testing event listeners...')

		world.web3.on('connected', data => {
			console.log('[SimpleWeb3Test] Connected event received:', data)
			world.chat('Web3 connected!', true)
		})

		world.web3.on('disconnected', () => {
			console.log('[SimpleWeb3Test] Disconnected event received')
			world.chat('Web3 disconnected', true)
		})

		world.web3.on('error', error => {
			console.error('[SimpleWeb3Test] Error event received:', error)
			world.chat(`Web3 error: ${error.message}`, true)
		})

		console.log('[SimpleWeb3Test] ✓ Event listeners set up successfully')
	} catch (error) {
		console.error('[SimpleWeb3Test] ERROR: Failed to set up event listeners:', error)
		world.chat(`ERROR: Failed to set up event listeners: ${error.message}`, true)
	}

	// Test 4: Check if already connected
	try {
		console.log('[SimpleWeb3Test] Checking initial connection state...')
		const isConnected = world.web3.isConnected()
		console.log('[SimpleWeb3Test] Already connected:', isConnected)

		if (isConnected) {
			const address = world.web3.getAddress()
			const chainId = world.web3.getNetworkId()
			console.log('[SimpleWeb3Test] Connection details:', { address, chainId })
			world.chat(`Already connected: ${address?.slice(0, 6)}...`, true)
		}
	} catch (error) {
		console.error('[SimpleWeb3Test] ERROR: Failed to check connection state:', error)
		world.chat(`ERROR: Failed to check connection state: ${error.message}`, true)
	}

	// Test 5: Try a simple connection attempt (without actually connecting)
	try {
		console.log('[SimpleWeb3Test] Testing connection method availability...')
		if (typeof world.web3.connect === 'function') {
			console.log('[SimpleWeb3Test] ✓ Connect method is available')
			world.chat('Web3 system is ready for connection', true)
		} else {
			console.error('[SimpleWeb3Test] ERROR: Connect method is not available')
			world.chat('ERROR: Connect method is not available', true)
		}
	} catch (error) {
		console.error('[SimpleWeb3Test] ERROR: Failed to test connection method:', error)
		world.chat(`ERROR: Failed to test connection method: ${error.message}`, true)
	}

	console.log('[SimpleWeb3Test] Simple Web3 test completed')
	world.chat('Web3 system test completed - check console for details', true)
}
