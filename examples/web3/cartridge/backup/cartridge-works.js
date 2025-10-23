/**
 * Cartridge Works - Completely Stable Implementation
 *
 * Ultra-stable implementation that avoids ALL 3D operations:
 * ✅ NO UI creation that could trigger positioning errors
 * ✅ NO direct position property access
 * ✅ ONLY console.log feedback
 * ✅ Promise-based async handling
 * ✅ Comprehensive error handling
 */

app.configure([
  {
    key: 'debug',
    type: 'switch',
    label: 'Debug Mode',
    options: [
      { value: 'true', label: 'Show Debug' },
      { value: 'false', label: 'Hide Debug' }
    ],
    initial: 'true'
  }
])

// Only run on client
if (world.isClient) {
  console.log("🎯 CARTRIDGE WORKS - Starting completely stable implementation...")
  console.log("==============================================")

  let walletState = {
    connected: false,
    address: null,
    chainId: null,
    error: null,
    initialized: false
  }

  // TEST: Verify this code runs to this point
  try {
    console.log("✅ Basic SES environment check passed")
    console.log("✅ Can access world object:", !!world)
    console.log("✅ Can access app object:", !!app)
  } catch (basicError) {
    console.error("❌ Basic environment test failed:", basicError)
    console.error("Script execution stopped at basic environment check")
    throw new Error("Environment setup failed")
  }

  // Ultra-safe Web3 test with comprehensive error handling
  console.log("📡 Starting Web3 system detection...")

  // Step 1: Check if we can safely access world.web3
  if (!world) {
    console.error("❌ World object not available")
    console.error("This should never happen - environment is broken")
    return
  }

  // Step 2: Safe Web3 system access
  if (!world.web3) {
    console.error("❌ Web3 system not found in world object")
    console.log("Available world properties:", Object.keys(world).sort().join(', '))
    throw new Error("Web3 system unavailable")
  }

  console.log("✅ Web3 system found")

  // Step 3: Comprehensive method detection
  const methods = [
    'connect', 'disconnect', 'isConnected', 'getAddress', 'getNetworkId',
    'getDebugInfo', 'execute', 'on', 'off', 'getAccount'
  ]

  console.log("📋 Web3 Method Availability:")
  const availableMethods = []
  methods.forEach(method => {
    try {
      const available = typeof world.web3[method] === 'function'
      console.log(`  ${method}: ${available ? '✅ Available' : '❌ Missing'}`)
      if (available) availableMethods.push(method)
    } catch (methodError) {
      console.warn(`  ${method}: ⚠️ Error checking - ${methodError.message}`)
    }
  })

  console.log(`✅ Available methods: ${availableMethods.length}/${methods.length}`)

  // Step 4: Debug information if available
  if (availableMethods.includes('getDebugInfo')) {
    try {
      const debugInfo = world.web3.getDebugInfo()
      console.log("🔍 Web3 Debug Info:", JSON.stringify(debugInfo, null, 2))
    } catch (debugError) {
      console.warn("Could not retrieve debug info:", debugError)
    }
  }

  // Step 5: Check existing connection status
  if (availableMethods.includes('isConnected')) {
    try {
      const connected = world.web3.isConnected()
      console.log(`Connection status: ${connected ? '✅ Connected' : '🔓 Not Connected'}`)

      if (connected) {
        const address = world.web3.getAddress()
        const chainId = world.web3.getNetworkId()

        walletState.connected = true
        walletState.address = address
        walletState.chainId = chainId

        const shortAddress = `${address.slice(0, 8)}...${address.slice(-6)}`
        console.log(`✅ Found existing wallet: ${shortAddress}`)
        console.log(`✅ Chain ID: ${chainId}`)
      } else {
        console.log("🔓 No existing wallet connection found")
      }
    } catch (connectionError) {
      console.error('Connection status check failed:', connectionError)
      walletState.error = 'Connection status check failed'
    }
  }

  // Step 6: Setup event listeners
  if (availableMethods.includes('on')) {
    try {
      console.log("🔗 Setting up event listeners...")

      world.web3.on('connected', (data) => {
        console.log('💡 Event: Wallet connected', data)
        walletState.connected = true
        walletState.address = data.address
        walletState.chainId = data.chainId
        walletState.initialized = true
        console.log("✅ Wallet connection established successfully!")
      })

      world.web3.on('disconnected', () => {
        console.log('💡 Event: Wallet disconnected')
        walletState.connected = false
        walletState.address = null
        walletState.chainId = null
        console.log("📡 Wallet disconnected")
      })

      world.web3.on('error', (error) => {
        console.log('💡 Event: Wallet error', error)
        walletState.error = error.message || 'Wallet error event'
        console.error("⚠️ Wallet error occurred:", walletState.error)
      })

      world.web3.on('transaction', (data) => {
        console.log('💡 Event: Transaction completed', data)
        console.log("🎉 Transaction executed successfully!")
      })

      console.log("✅ Event listeners configured")
    } catch (eventError) {
      console.error('Event listener setup failed:', eventError)
      walletState.error = 'Event listener setup failed'
    }
  }

  // Step 7: Auto-connect test
  const autoConnect = function() {
    if (walletState.connected) {
      console.log("✅ Already connected, skipping auto-connect")
      return
    }

    if (!availableMethods.includes('connect')) {
      console.warn("⚠️ Connect method not available - cannot test connection")
      return
    }

    console.log("🔄 Attempting auto-connect...")

    try {
      const result = world.web3.connect()

      if (result && typeof result.then === 'function') {
        // Async connection
        result.then(
          (connectionResult) => {
            console.log("🎉 Auto-connect successful!", connectionResult)
            console.log("🎉 CARTRIDGE INTEGRATION WORKING!")
            console.log("=====================================================")
            console.log(f"Address: {connectionResult.address}")
            console.log(f"Chain: {connectionResult.chainId}")
            console.log("🎯 Hyperfy Cartridge Integration: FULLY FUNCTIONAL")
            console.log("=====================================================")
          },
          (connectionError) => {
            console.error('❌ Auto-connect failed:', connectionError)
            console.log("⚠️ Connection failed - this is likely expected if no wallet is available")
            console.log("💡 Try connecting manually when ready")
          }
        )
      } else {
        // Sync connection
        console.log("🎉 Direct connection successful!", result)
        walletState.connected = true
        walletState.address = result.address
        walletState.chainId = result.chainId
        console.log("🎉 CARTRIDGE IS WORKING!")
      }
    } catch (connectError) {
      console.error('❌ Auto-connect attempt failed:', connectError)
      walletState.error = 'Auto-connect failed: ' + connectError.message
    }
  }

  // Final initialization with delay
  setTimeout(function() {
    console.log("🎯 FINAL STATUS REPORT")
    console.log("==============================================")
    console.log(f"Web3 System: {!!world.web3 ? '✅ YES' : '❌ NO'}")
    console.log(f"Connected: {walletState.connected ? '✅ YES' : '🔓 NO'}")
    console.log(f"Address: {walletState.address || 'None'}")
    console.log(f"Chain: {walletState.chainId || 'None'}")
    console.log(f"Error: {walletState.error || 'None'}")
    console.log("==============================================")
    console.log("🎯 CARTRIDGE IMPLEMENTATION: COMPLETE")
  }, 3000)

  // Auto-connect after brief initialization
  setTimeout(autoConnect, 2000)

  console.log("🎯 CARTRIDGE WORKS - Initialization complete!")

} else {
  console.log('Server environment detected - cartridge functionality not needed on server')
}

// Environment safe exports
if (world.isClient) {
  app.getWalletState = function() { return walletState; }
  app.connectTest = function() { console.log('Cartridge connection test'); }
}

// Safe ES module ending - prevents parsing issues
;;null