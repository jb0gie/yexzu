/**
 * Cartridge Debug Arena - Systematic Testing
 *
 * We are going to test EVERY possible approach to make cartridge work
 * No assumptions, just raw testing of what actually functions
 */

// Only run on client
if (world.isClient) {
  console.log("🥊 CARTRIDGE DEBUG ARENA - ENTERING COMBAT MODE")
  console.log("==============================================")
  console.log("Mission: Make Cartridge work in Hyperfy AT ALL COSTS")
  console.log("Approach: Test every single possible method")
  console.log("Time to bleed: NOW")

  // TEST 1: BRUTE FORCE ENVIRONMENT DETECTION
  console.log("\n🔍 TEST 1: Brute Force Environment Detection")
  try {
    console.log("world.isClient:", world.isClient)
    console.log("world object:", !!world)
    console.log("world.web3:", !!world.web3)
    console.log("Available world properties:", Object.keys(world).sort().join(', '))
  } catch (e) {
    console.error("❌ Environment detection failed:", e)
  }

  // TEST 2: WEB3 METHOD DETECTION - NO MERCY
  console.log("\n🔍 TEST 2: Web3 Method Detection - Surgical Strike")
  if (world.web3) {
    const methodsToTest = [
      'connect', 'disconnect', 'isConnected', 'getAddress', 'getNetworkId',
      'getDebugInfo', 'execute', 'on', 'off', 'getAccount', 'signMessage',
      'sendTransaction', 'request', 'enable'
    ]

    console.log("Web3 method availability:")
    methodsToTest.forEach(method => {
      try {
        const available = typeof world.web3[method] === 'function'
        const status = available ? '✅ FUNCTION' : '❌ MISSING'
        console.log(`  ${method}: ${status}`)

        if (available) {
          console.log(`    🔍 Function signature confirmed: ${typeof world.web3[method]}`)
        }
      } catch (e) {
        console.error(`  ${method}: 💥 EXPLOSION -`, e.message)
      }
    })

    // TEST 3: DESPERATE CONNECTION ATTEMPTS
    console.log("\n🔥 TEST 3: Connection Attempts - Going Nuclear")

    // Attempt 1: Direct connect
    try {
      console.log("⚡ Attempt 1: Direct connect() call")
      const connectResult = world.web3.connect()
      console.log("💥 Direct connect result:", connectResult)

      if (connectResult && typeof connectResult.then === 'function') {
        console.log("🎯 Async connection detected")
        connectResult.then(
          success => console.log("🎉 CONNECTION SUCCESS:", success),
          error => console.log("💀 CONNECTION FAILED:", error)
        )
      }
    } catch (e) {
      console.error("💥 Direct connect explosion:", e)
    }

    // Attempt 2: Check existing connection FIRST
    try {
      console.log("🔍 Attempt 2: Check existing connection status")
      const alreadyConnected = world.web3.isConnected()
      console.log("Existing connection status:", alreadyConnected)

      if (alreadyConnected) {
        console.log("🔥 ALREADY CONNECTED - JACKPOT!")
        const address = world.web3.getAddress()
        const chainId = world.web3.getNetworkId()
        console.log("Address:", address)
        console.log("Chain:", chainId)
      }
    } catch (e) {
      console.error("💥 Connection check explosion:", e)
    }

    // Attempt 3: Event listener setup - AGGRESSIVE
    console.log("\n🎯 TEST 4: Event Listener Setup - Shock & Awe")
    try {
      console.log("Setting up event listeners...")

      // We need these events to work
      world.web3.on('connected', function(data) {
        console.log("🎉 EVENT: Wallet connected - WE HAVE LIFEFORM")
        console.log("Connection data:", data)
      })

      world.web3.on('disconnected', function() {
        console.log("💀 EVENT: Wallet disconnected - DEATH DETECTED")
      })

      world.web3.on('error', function(error) {
        console.log("💥 EVENT: Wallet error - PAIN DETECTED")
        console.error("Error details:", error)
      })

      world.web3.on('transaction', function(data) {
        console.log("💸 EVENT: Transaction - MONEY MOVEMENT DETECTED")
        console.log("Transaction data:", data)
      })

      console.log("✅ Event listeners configured - Standing by")
    } catch (e) {
      console.error("💥 Event setup explosion:", e)
    }

    // TEST 5: DEBUG INFO EXTRACTION - INTELLIGENCE GATHERING
    console.log("\n🔍 TEST 5: Debug Information - Spy Mode")
    try {
      if (typeof world.web3.getDebugInfo === 'function') {
        const debug = world.web3.getDebugInfo()
        console.log("🔍 Debug info extracted:", debug)
      } else {
        console.log("❌ getDebugInfo not available")
      }
    } catch (e) {
      console.error("💥 Debug extraction failed:", e)
    }
  }

  // TEST 6: ABSOLUTE DESPERATION - TRY EVERYTHING
  console.log("\n🆘 TEST 6: Absolute Desperation Mode")
  console.log("Time remaining: 0 seconds")
  console.log("Status: All or nothing")

  // Try to force any kind of connection
  setTimeout(function() {
    console.log("\n⏰ FINAL STATUS REPORT:")
    console.log("Cartridge integration status: UNKNOWN")
    console.log("Next steps: We need real testing environment")
    console.log("Recommendation: Deploy and test in actual Hyperfy")
  }, 5000)

} else {
  console.log('💀 Server environment - cartridge combat impossible')
}

// We either win or we die
;;null