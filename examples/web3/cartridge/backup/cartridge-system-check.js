/**
 * Cartridge System Check - Environment Analysis
 *
 * This will check what's actually happening with the system initialization
 */

// Only run on client
if (world.isClient) {
  console.log("🔍 CARTRIDGE SYSTEM CHECK - ENVIRONMENT ANALYSIS")
  console.log("===============================================")

  // IMMEDIATE ENVIRONMENT CHECK
  console.log("IMMEDIATE CHECKS:")
  console.log("typeof window: " + (typeof window))
  console.log("typeof localStorage: " + (typeof localStorage))
  console.log("typeof WebSocket: " + (typeof WebSocket))

  // Check if we're getting browser environment
  if (typeof window === 'undefined') {
    console.error("❌ NOT IN BROWSER - ClientWeb3 requires browser environment")
  } else {
    console.log("✅ In browser environment")

    // Check for Cartridge Controller availability
    try {
      console.log("Checking for @cartridge/controller...")
      // This would normally be available at system level, not in SES
      console.log("This test runs in SES sandbox - system level check needed")
    } catch (e) {
      console.error("Cartridge check failed: " + e.message)
    }
  }

  // WORLD SYSTEM CHECK
  console.log("\nWORLD SYSTEM CHECK:")
  console.log("world exists: " + (typeof world !== 'undefined'))
  console.log("world.isClient: " + world.isClient)

  // Check for web3 system
  console.log("world.web3 exists: " + (typeof world.web3 !== 'undefined'))

  if (world.web3) {
    console.log("🎉 world.web3 FOUND!")
    try {
      const debugInfo = world.web3.getDebugInfo()
      console.log("Debug info: " + JSON.stringify(debugInfo))
    } catch (e) {
      console.error("Debug error: " + e.message)
    }
  } else {
    console.error("💀 world.web3 NOT FOUND")

    // Try to debug why
    console.log("Available world keys: " + Object.keys(world).join(', '))

    // Check if it's a system registration issue
    console.log("This suggests ClientWeb3 system initialization failed")
    console.log("Possible causes:")
    console.log("1. Build process failed to include cartridge dependencies")
    console.log("2. System initialization failed during startup")
    console.log("3. Browser environment not detected")
  }

  // SYSTEM-LEVEL DIAGNOSTICS
  console.log("\nSYSTEM-LEVEL DIAGNOSTICS:")
  console.log("Need to check system console logs for:")
  console.log("- '[ClientWeb3] Initializing Web3 system...'")
  console.log("- '[ClientWeb3] Environment: Browser/Unknown'")
  console.log("- '[ClientWeb3] Controller creation...'")
  console.log("- '[ClientWeb3] Success/failure messages'")

  // Check for any web3-related items
  const web3Keys = ['web3', 'ethereum', 'wallet']
  web3Keys.forEach(key => {
    if (world[key]) {
      console.log("Found alternate web property: " + key)
    }
  })

  // FINAL RECOMMENDATION
  console.log("\n🔬 SYSTEM STATUS:")
  if (!world.web3) {
    console.error("CRITICAL: Web3 system missing from app environment")
    console.log("REQUIRED: Check system-level logs for initialization errors")
    console.log("ACTION: Review build logs and system initialization")
  } else {
    console.log("✅ Web3 system available - can proceed with integration")
  }

} else {
  console.error("Not in client environment - cartridge system check impossible")
}

;;null