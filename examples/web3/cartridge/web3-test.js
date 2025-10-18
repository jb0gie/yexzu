/**
 * Web3 System Test
 * 
 * This is a minimal test to verify that the Web3 system is properly initialized
 * and world.web3 is available to app scripts.
 */

// Only run on client
if (world.isClient) {
	// Create a simple UI to show the test results
	const ui = app.create('ui')
	ui.width = 300
	ui.height = 200
	ui.backgroundColor = 'rgba(0, 15, 30, 0.9)'
	ui.borderRadius = 20
	ui.padding = 20
	ui.billboard = 'full'
	ui.pivot = 'center'
	ui.justifyContent = 'center'
	ui.alignItems = 'center'
	ui.gap = 10
	ui.position.y = 2
	app.add(ui)

	// Title
	const title = app.create('uitext')
	title.value = 'WEB3 SYSTEM TEST'
	title.color = '#00ffaa'
	title.fontSize = 20
	title.fontWeight = 'bold'
	ui.add(title)

	// Test results
	const results = app.create('uitext')
	results.value = 'Testing...'
	results.color = '#ffffff'
	results.fontSize = 14
	ui.add(results)

	// Run tests
	function runTests() {
		const tests = []

		// Test 1: Check if world.web3 exists
		if (typeof world.web3 !== 'undefined') {
			tests.push('✓ world.web3 exists')
		} else {
			tests.push('✗ world.web3 is undefined')
		}

		// Test 2: Check if world.web3 has required methods
		if (world.web3) {
			const requiredMethods = ['connect', 'disconnect', 'isConnected', 'on', 'off']
			requiredMethods.forEach(method => {
				if (typeof world.web3[method] === 'function') {
					tests.push(`✓ world.web3.${method} is available`)
				} else {
					tests.push(`✗ world.web3.${method} is missing`)
				}
			})
		}

		// Test 3: Check if world.web3 has required properties
		if (world.web3) {
			const requiredProperties = ['getAddress', 'getNetworkId', 'getAccount']
			requiredProperties.forEach(prop => {
				if (typeof world.web3[prop] === 'function') {
					tests.push(`✓ world.web3.${prop} is available`)
				} else {
					tests.push(`✗ world.web3.${prop} is missing`)
				}
			})
		}

		// Update UI with results
		results.value = tests.join('\n')

		// Log to console for debugging
		console.log('Web3 System Test Results:')
		tests.forEach(test => console.log(test))
	}

	// Run tests after a short delay to ensure system is initialized
	setTimeout(runTests, 1000)
}
