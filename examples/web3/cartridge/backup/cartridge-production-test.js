/**
 * Cartridge Production Test - Using REAL Hyperfy System
 *
 * This tests the ACTUAL ClientWeb3 system that's registered in createClientWorld
 */

// Only run on client
if (world.isClient) {
  console.log("🎯 CARTRIDGE PRODUCTION TEST - USING REAL HYPERFY SYSTEM")
  console.log("========================================================")
  console.log("We are now testing the ACTUAL ClientWeb3 system")
  console.log("This is not an example - this is production code")

  // Force initialization if needed
  try {
    console.log("\n🔥 STEP 1: Force Web3 System Initialization")

    // Check if web3 exists on world
    console.log("world.web3 exists:", !!world.web3)

    if (world.web3) {
      console.log("🎯 Web3 system detected!")

      // Get debug info immediately
      console.log("\n🔍 STEP 2: Get Debug Information")
      try {
        const debugInfo = world.web3.getDebugInfo()
        console.log("Debug info:", debugInfo)
      } catch (e) {
        console.error("Debug info error:", e)
      }

      // STEP 3: BRUTE FORCE CONNECTION TEST
      console.log("\n🔥 STEP 3: Brute Force Connection Test")

      // Check current connection status
      try {
        const connected = world.web3.isConnected()
        console.log("Current connection status:", connected)

        if (connected) {
          console.log("🎉 ALREADY CONNECTED!")
          const address = world.web3.getAddress()
          const networkId = world.web3.getNetworkId()
          console.log("Address:", address)
          console.log("Network ID:", networkId)
        } else {
          console.log("Not connected - attempting connection...")

          // Attempt connection
          try {
            console.log("⚡ Attempting connection...")
            const result = world.web3.connect()
            console.log("Connect initiated:", result)

            if (result && typeof result.then === 'function') {
              console.log("Promise detected - monitoring connection...")
              result.then(
                connectionData => {
                  console.log("🎉 CONNECTION SUCCESS!")
                  console.log("Connection data:", connectionData)
                  console.log("Address:", connectionData.address)
                  console.log("Chain ID:", connectionData.chainId)
                },
                connectionError => {
                  console.error("💀 CONNECTION FAILED!")
                  console.error("Error:", connectionError)
                }
              )
            }
          } catch (connectError) {
            console.error("💥 Connection attempt failed:", connectError)
          }
        }
      } catch (statusError) {
        console.error("💥 Status check failed:", statusError)
      }

      // STEP 4: EVENT MONITORING - STAY VIGILANT
      console.log("\n🎯 STEP 4: Event Monitoring Setup")
      try {
        world.web3.on('connected', (data) => {
          console.log("🎉 CONNECTED EVENT FIRED!")
          console.log("Event data:", data)
        })

        world.web3.on('disconnected', () => {
          console.log("💀 DISCONNECTED EVENT FIRED!")
        })

        world.web3.on('error', (error) => {
          console.log("💥 ERROR EVENT FIRED!")
          console.error("Error:", error)
        })

        world.web3.on('transaction', (data) => {
          console.log("💸 TRANSACTION EVENT FIRED!")
          console.log("Transaction data:", data)
        })

        console.log("✅ Event listeners configured")
      } catch (eventError) {
        console.error("💥 Event setup failed:", eventError)
      }

      // STEP 5: GET CONTROLLER FOR ADVANCED TESTING
      console.log("\n🔍 STEP 5: Get Controller")
      try {
        const controller = world.web3.getController()
        console.log("Controller object:", controller)
        console.log("Controller type:", typeof controller)
        console.log("Controller exists:", !!controller)
      } catch (controllerError) {
        console.error("💥 Get controller failed:", controllerError)
      }

      // STEP 6: TRANSACTION TEST (if connected)
      setTimeout(() => {
        console.log("\n🔥 STEP 6: Transaction Test (if connected)")
        try {
          if (world.web3.isConnected()) {
            console.log("Connected - attempting test transaction...")

            // Simple test transaction
            const testCalls = [{
              contractAddress: '0x1234567890abcdef',
              entrypoint: 'test_method',
              calldata: ['0x1', '0x2']
            }]

            try {
              const txResult = world.web3.execute(testCalls)
              console.log("Transaction initiated:", txResult)
            } catch (txError) {
              console.error("Transaction failed:", txError)
            }
          } else {
            console.log("Not connected - skipping transaction test")
          }
        } catch (finalError) {
          console.error("Final test error:", finalError)
        }
      }, 3000)

    } else {
      console.log("💀 world.web3 NOT AVAILABLE")
      console.log("Available world properties:", Object.keys(world).sort().join(', '))
    }

  } catch (initError) {
    console.error("💥 Web3 access failed:", initError)
  }

  // FINAL STATUS
  setTimeout(() => {
    console.log("\n⏰ FINAL STATUS REPORT:")
    console.log("System tested with production code")
    console.log("Results: See console output above")
    console.log("Next: Use actual cartridge wallet for real testing")
  }, 5000)

} else {
  console.log('💀 Not in client environment - cartridge testing impossible')
}

;;null