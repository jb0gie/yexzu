/**
 * Cartridge Initialization Diagnostic - Find Real Issue
 *
 * This will specifically diagnose what's happening during ClientWeb3 initialization
 */

// Only run on client
if (world.isClient) {
  console.log("🔬 CARTRIDGE INITIALIZATION DIAGNOSTIC")
  console.log("=====================================")

  // Check system environment
  console.log("Environment Check:")
  console.log("typeof window: " + (typeof window))
  console.log("typeof localStorage: " + (typeof localStorage))
  console.log("typeof WebSocket: " + (typeof WebSocket))

  // The critical issue: system level vs app level
  console.log("\nSystem vs App Level Analysis:")
  console.log("Apps run in SES sandbox - systems run at browser level")
  console.log("ClientWeb3 initialization happens at system level")
  console.log("world.web3 is injected into app environment after initialization")

  // Check for ANY web3-related properties
  console.log("\nWeb3 Property Search:")
  const allKeys = Object.keys(world)
  const web3Related = allKeys.filter(key =>
    key.toLowerCase().includes('web3') ||
    key.toLowerCase().includes('wallet') ||
    key.toLowerCase().includes('cartridge') ||
    key.toLowerCase().includes('ethereum')
  )

  console.log("Web3-related keys: " + web3Related.join(', '))

  if (world.web3) {
    console.log("🎯 world.web3 FOUND!")

    // Get detailed debug info
    try {
      const debugInfo = world.web3.getDebugInfo()
      console.log("System status: " + JSON.stringify(debugInfo))

      if (debugInfo.initialized) {
        console.log("✅ System properly initialized")
        console.log("Ready for cartridge connection testing")
      } else {
        console.error("❌ System initialization failed")
        console.error("Error: " + debugInfo.error)
        console.error("Environment: " + debugInfo.environment)

        if (debugInfo.error && debugInfo.error.includes('browser')) {
          console.error("BROWSER ENVIRONMENT ISSUE DETECTED")
          console.error("ClientWeb3 requires browser window/localStorage")
        }
      }
    } catch (e) {
      console.error("Debug info error: " + e.message)
    }
  } else {
    console.error("💀 world.web3 NOT AVAILABLE")

    // This is the real problem
    console.error("This means ClientWeb3 system failed during initialization")
    console.error("Possible causes:")
    console.error("1. ControllerProvider() failed to instantiate")
    console.error("2. Browser APIs not available (window/localStorage)")
    console.error("3. @cartridge/controller import failed")
    console.error("4. System initialization error caught and mocked")

    // System-level debug info
    console.log("\nSystem-level debugging needed:\")
    console.log("Check server logs for:")
    console.log("- '[ClientWeb3] Initializing Web3 system...'")
    console.log("- '[ClientWeb3] Environment: Browser/Unknown'")
    console.log("- '[ClientWeb3] Creating ControllerProvider...'")
    console.log("- '[ClientWeb3] ControllerProvider created/failed'")
    console.log("- '[ClientWeb3] Web3 system initialized successfully/failed'")

    // Alternative approach suggestion
    console.log("\n🎯 RECOMMENDED APPROACH:")
    console.log("1. Check server console for ClientWeb3 initialization logs")
    console.log("2. Verify @cartridge/controller is properly imported")
    console.log("3. Ensure browser environment for ClientWeb3")
    console.log("4. Test in actual browser, not server environment")
  }

  // Check system registration
  console.log("\nSystem Registration Check:")
  console.log("ClientWeb3 is registered as 'web3' in createClientWorld.js")
  console.log("System should be: world.web3")
  console.log("If missing, initialization failed during build/startup")

  // Final recommendation
  console.log("\n🔬 NEXT STEPS:")
  console.log("1. Look at server startup logs for ClientWeb3 errors")
  console.log("2. Test in actual browser environment")
  console.log("3. Verify cartridge controller dependencies")
  console.log("4. Check for build/import errors")

} else {
  console.error("Not in client environment - cartridge diagnostic impossible")
}

;;null