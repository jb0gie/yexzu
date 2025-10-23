/**
 * Cartridge Debug Fixed - No Console Errors
 *
 * Fixed version with proper console.log syntax and debugging world.web3
 */

// Only run on client
if (world.isClient) {
  console.log("🎯 CARTRIDGE DEBUG FIXED - No Console Errors")
  console.log("=============================================")

  // PROPER console.log syntax - single string parameter
  console.log("Starting cartridge debug with fixed console syntax")

  // STEP 1: Basic environment check
  console.log("Basic environment check:")
  console.log("world.isClient: " + world.isClient)
  console.log("world object: " + (typeof world !== 'undefined'))

  // STEP 2: Check world.web3 - the critical test
  console.log("World.web3 check:")
  console.log("world.web3 exists: " + (typeof world.web3 !== 'undefined'))

  if (world.web3) {
    console.log("SUCCESS: world.web3 is available!")

    // Try to get debug info
    try {
      const debugInfo = world.web3.getDebugInfo()
      console.log("Debug info: " + JSON.stringify(debugInfo))
    } catch (e) {
      console.log("Debug info error: " + e.message)
    }

    // Test connection status
    try {
      const connected = world.web3.isConnected()
      console.log("Connection status: " + connected)
    } catch (e) {
      console.log("Connection check error: " + e.message)
    }

  } else {
    console.log("CRITICAL: world.web3 is NOT available")
    console.log("Available world properties:")

    // List all available world properties
    const worldKeys = Object.keys(world)
    worldKeys.forEach(key => {
      console.log("- " + key)
    })

    console.log("This means ClientWeb3 system is not registered")
    console.log("Need to check if ClientWeb3 system is properly initialized")
  }

  // STEP 3: Alternative approach - check what's actually available
  console.log("Alternative check - what's actually on world:")
  console.log("world type: " + typeof world)
  console.log("world keys count: " + Object.keys(world).length)

  // Check for any web3-related properties
  const web3Keywords = ['web3', 'ethereum', 'wallet', 'cartridge', 'starknet']
  web3Keywords.forEach(keyword => {
    if (world[keyword]) {
      console.log("Found: " + keyword + " = " + typeof world[keyword])
    }
  })

} else {
  console.log("Not in client environment - cartridge debug impossible")
}

// Safe ending
;;null