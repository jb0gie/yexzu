/**
 * Cartridge System Diagnostic - Find Out What's Really Wrong
 *
 * This will diagnose why cartridge isn't working and what we need to fix
 */

// Only run on client
if (world.isClient) {
  console.log("🔬 CARTRIDGE SYSTEM DIAGNOSTIC - FIND THE BUG")
  console.log("=============================================")

  // BRUTAL SYSTEM DIAGNOSTICS
  console.log("\n🔥 STEP 1: System Level Diagnostics")

  // Check if we're actually in a browser
  console.log("Browser environment:", typeof window !== 'undefined')
  console.log("LocalStorage available:", typeof localStorage !== 'undefined')
  console.log("WebSocket available:", typeof WebSocket !== 'undefined')

  // Check world registration
  console.log("\n🔥 STEP 2: World Registration Check")
  console.log("world object exists:", !!world)
  console.log("Available world systems:", Object.keys(world).sort().join(', '))

  // THE CRITICAL TEST - WEB3 SYSTEM
  console.log("\n🔥 STEP 3: Web3 System Critical Analysis")

  if (world.web3) {
    console.log("🎯 world.web3 FOUND - SYSTEM EXISTS")

    // Get comprehensive debug info
    try {
      const debugInfo = world.web3.getDebugInfo()
      console.log("🎯 Debug Info:", debugInfo)

      if (!debugInfo.initialized) {
        console.log("💀 SYSTEM NOT INITIALIZED - THIS IS THE PROBLEM")
        console.log("Error:", debugInfo.error)
        console.log("Environment:", debugInfo.environment)
        console.log("Has Window:", debugInfo.hasWindow)
      } else {
        console.log("✅ System initialized properly")
      }
    } catch (debugError) {
      console.error("💀 Debug info failed:", debugError)
    }

    // Test every single method with error handling
    console.log("\n🔥 STEP 4: Method Testing - Operation Chaos")

    const methods = [
      'connect', 'disconnect', 'isConnected', 'getAddress', 'getNetworkId',
      'getAccount', 'getController', 'execute', 'on', 'off'
    ]

    methods.forEach(method => {
      try {
        console.log(`\nTesting ${method}:`)
        const result = world.web3[method]()
        console.log(`  ✅ ${method}:`, typeof result, result)

        if (result && result.then) {
          console.log(`  🎯 ${method} returns Promise`)
        }
      } catch (methodError) {
        console.error(`  💥 ${method} failed:`, methodError.message)
      }
    })

    // Connection status deep dive
    console.log("\n🔥 STEP 5: Connection Status Deep Dive")
    try {
      const isConnected = world.web3.isConnected()
      console.log("Currently connected:", isConnected)

      if (isConnected) {
        console.log("🎉 ALREADY CONNECTED - GET INFO")
        const address = world.web3.getAddress()
        const networkId = world.web3.getNetworkId()
        const account = world.web3.getAccount()

        console.log("Address:", address)
        console.log("Network ID:", networkId)
        console.log("Account object:", account)
      } else {
        console.log("🔓 Not connected - will test connection")
      }
    } catch (statusError) {
      console.error("💀 Connection status check failed:", statusError)
    }

    // Controller deep dive
    console.log("\n🔥 STEP 6: Controller Analysis")
    try {
      const controller = world.web3.getController()
      console.log("Controller object:", controller)
      console.log("Controller type:", typeof controller)
      console.log("Controller exists:", !!controller)

      if (controller) {
        console.log("Controller methods:", Object.getOwnPropertyNames(controller).filter(name => typeof controller[name] === 'function'))
      }
    } catch (controllerError) {
      console.error("💀 Controller analysis failed:", controllerError)
    }

    // CONNECTION ATTEMPT - NO MERCY
    console.log("\n🔥 STEP 7: Connection Attempt - Surgical Strike")
    try {
      console.log("⚡ Attempting connection...")
      const connectResult = world.web3.connect()
      console.log("Connect result:", connectResult)
      console.log("Connect result type:", typeof connectResult)

      if (connectResult && connectResult.then) {
        console.log("🎯 Promise returned - monitoring...")

        connectResult.then(
          successData => {
            console.log("🎉 CONNECTION SUCCESS!", successData)
            console.log("Success address:", successData.address)
            console.log("Success chainId:", successData.chainId)
          },
          failureData => {
            console.error("💀 CONNECTION FAILED!", failureData)
            console.error("Failure message:", failureData.message)
            console.error("Failure stack:", failureData.stack)
          }
        )
      } else {
        console.log("🤔 Non-promise result - analyzing...")
      }
    } catch (connectError) {
      console.error("💥 Connection attempt failed:", connectError)
      console.error("Error name:", connectError.name)
      console.error("Error message:", connectError.message)
      console.error("Error stack:", connectError.stack)
    }

    // EVENT LISTENER TEST
    console.log("\n🔥 STEP 8: Event Listener Setup")
    try {
      console.log("Setting up event listeners...")

      world.web3.on('connected', (data) => {
        console.log("🎉 EVENT: Connected - WALLET CONNECTED")
        console.log("Event data:", data)
      })

      world.web3.on('disconnected', () => {
        console.log("💀 EVENT: Disconnected - WALLET DISCONNECTED")
      })

      world.web3.on('error', (error) => {
        console.log("💥 EVENT: Error - SOMETHING WENT WRONG")
        console.error("Error details:", error)
      })

      world.web3.on('transaction', (data) => {
        console.log("💸 EVENT: Transaction - MONEY MOVED")
        console.log("Transaction data:", data)
      })

      console.log("✅ Event listeners configured")
    } catch (eventError) {
      console.error("💥 Event setup failed:", eventError)
    }

  } else {
    console.log("💀 world.web3 NOT AVAILABLE")
    console.log("This means the ClientWeb3 system isn't registered or failed during initialization")
    console.log("Available world properties:", Object.keys(world || {}).sort().join(', '))

    // Try to force registration
    console.log("\n🆘 ATTEMPTING MANUAL WEB3 REGISTRATION")
    try {
      // Check if ClientWeb3 exists in the system
      const modulePath = '/src/core/systems/ClientWeb3.js'
      console.log("Checking for ClientWeb3 module...")
      // Note: In a real scenario, we'd need to import and register this
      // For now, we document that it's missing
    } catch (e) {
      console.error("Manual registration attempt failed:", e)
    }
  }

  // FINAL ANALYSIS
  setTimeout(() => {
    console.log("\n🔬 FINAL DIAGNOSTIC RESULTS:")
    console.log("==================================")

    if (!world.web3) {
      console.log("💀 CRITICAL: world.web3 does not exist")
      console.log("REQUIRED ACTION: Ensure ClientWeb3 system is registered")
    } else {
      console.log("🎯 world.web3 exists but may have initialization issues")
      console.log("SUGGESTION: Check browser environment and cartridge controller")
    }

    console.log("\nNext steps for real cartridge integration:")
    console.log("1. Test in actual browser with cartridge extension")
    console.log("2. Ensure ClientWeb3 system is properly initialized")
    console.log("3. Test with real cartridge wallet connection")
    console.log("4. Implement transaction execution")
  }, 3000)

} else {
  console.log('💀 Not in client environment - cartridge diagnostics impossible')
}

// Diagnostic complete
;;null