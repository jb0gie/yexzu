/**
 * Cartridge Integration Fixed - No Console Errors
 *
 * Fixed version with proper console.log syntax for SES environment
 */

// Configure app
app.configure([
  {
    key: 'autoConnect',
    type: 'switch',
    label: 'Auto Connect Wallet',
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' }
    ],
    initial: 'false'
  },
  {
    key: 'testContract',
    type: 'text',
    label: 'Test Contract Address',
    initial: '0x1234567890abcdef'
  }
])

// Only run on client
if (world.isClient) {
  console.log("🎯 CARTRIDGE INTEGRATION FIXED - No Console Errors")
  console.log("=============================================")

  // Proper object return format for SES
  ({
    init() {
      console.log("🚀 Initializing cartridge integration...", "")

      // Get control interface
      this.control = app.control()
      if (!this.control) {
        console.error("❌ No control interface available", "")
        return
      }

      // Keep app active
      app.keepActive = true

      // Setup wallet state
      this.walletState = {
        connected: false,
        address: null,
        networkId: null,
        isConnecting: false,
        error: null,
        balance: null
      }

      // Capture control keys
      this.setupControls()

      // Check if web3 is available first
      this.checkWeb3Availability()

      // Only proceed if web3 is available
      if (world.web3) {
        // Setup event listeners
        this.setupEventListeners()

        // Auto-connect if configured
        if (props.autoConnect === 'true') {
          setTimeout(() => this.connectWallet(), 2000)
        }
      }

      console.log("✅ Cartridge integration initialized", "")
    },

    setupControls() {
      const keys = ['keyC', 'keyD', 'keyT']
      keys.forEach(key => {
        if (this.control[key]) this.control[key].capture = true
      })
      console.log("✅ Controls configured", "")
    },

    checkWeb3Availability() {
      console.log("Checking web3 availability...", "")

      if (!world.web3) {
        console.error("❌ world.web3 not available", "")

        // Debug what's actually available
        console.log("Available world properties:", Object.keys(world).join(', '))

        // Check if we're in the right environment
        console.log("Browser environment: " + (typeof window !== 'undefined'))
        console.log("LocalStorage: " + (typeof localStorage !== 'undefined'))

        return
      }

      console.log("✅ world.web3 is available", "")

      // Get debug info
      try {
        const debugInfo = world.web3.getDebugInfo()
        console.log("Web3 debug info: " + JSON.stringify(debugInfo), "")

        if (!debugInfo.initialized) {
          console.error("❌ Web3 system not initialized: " + debugInfo.error, "")
        } else {
          console.log("✅ Web3 system initialized", "")
        }
      } catch (e) {
        console.error("Debug info failed: " + e.message, "")
      }

      // Check existing connection
      try {
        const connected = world.web3.isConnected()
        console.log("Current connection status: " + connected, "")

        if (connected) {
          const address = world.web3.getAddress()
          const networkId = world.web3.getNetworkId()

          this.walletState.connected = true
          this.walletState.address = address
          this.walletState.networkId = networkId

          console.log("🎉 Already connected!", "")
          console.log("Address: " + address, "")
          console.log("Network: " + networkId, "")
        }
      } catch (e) {
        console.error("Connection check failed: " + e.message, "")
      }
    },

    setupEventListeners() {
      if (!world.web3) return

      console.log("Setting up event listeners...", "")

      world.web3.on('connected', (data) => {
        console.log("🎉 Wallet connected!", "")
        this.walletState.connected = true
        this.walletState.address = data.address
        this.walletState.networkId = data.chainId
        this.walletState.isConnecting = false
        console.log("Connected address: " + data.address, "")
        console.log("Connected chain: " + data.chainId, "")
      })

      world.web3.on('disconnected', () => {
        console.log("💀 Wallet disconnected", "")
        this.walletState.connected = false
        this.walletState.address = null
        this.walletState.networkId = null
      })

      world.web3.on('error', (error) => {
        console.error("💥 Wallet error: " + error.message, "")
        this.walletState.error = error.message
        this.walletState.isConnecting = false
      })

      world.web3.on('transaction', (data) => {
        console.log("💸 Transaction completed!", "")
        console.log("Transaction result: " + JSON.stringify(data), "")
      })
    },

    connectWallet() {
      if (!world.web3) {
        console.error("❌ Web3 not available", "")
        return
      }

      if (this.walletState.isConnecting) {
        console.log("Already connecting...", "")
        return
      }

      this.walletState.isConnecting = true
      this.walletState.error = null

      console.log("⚡ Attempting wallet connection...", "")

      try {
        const result = world.web3.connect()
        console.log("Connect initiated: " + typeof result, "")

        if (result && typeof result.then === 'function') {
          console.log("Promise detected - monitoring...", "")
          result.then(
            (data) => {
              console.log("🎉 Connection successful!", "")
              console.log("Address: " + data.address, "")
              console.log("Chain ID: " + data.chainId, "")
              this.walletState.isConnecting = false
            },
            (error) => {
              console.error("💀 Connection failed: " + error.message, "")
              this.walletState.error = error.message
              this.walletState.isConnecting = false
            }
          )
        } else {
          console.log("Connected (sync result): " + JSON.stringify(result), "")
          this.walletState.isConnecting = false
        }
      } catch (error) {
        console.error("💥 Connection attempt failed: " + error.message, "")
        this.walletState.error = error.message
        this.walletState.isConnecting = false
      }
    },

    disconnectWallet() {
      if (!world.web3) return

      console.log("🚪 Disconnecting wallet...", "")

      try {
        world.web3.disconnect()
        console.log("✅ Wallet disconnected", "")
      } catch (error) {
        console.error("💥 Disconnect failed: " + error.message, "")
      }
    },

    testTransaction() {
      if (!world.web3) {
        console.error("❌ Web3 not available", "")
        return
      }

      if (!this.walletState.connected) {
        console.error("❌ Not connected", "")
        return
      }

      console.log("🧪 Testing transaction...", "")

      const testCalls = [{
        contractAddress: props.testContract,
        entrypoint: 'test_method',
        calldata: ['0x1', '0x2']
      }]

      console.log("Transaction calls: " + JSON.stringify(testCalls), "")

      try {
        const result = world.web3.execute(testCalls)
        console.log("Transaction initiated: " + typeof result, "")

        if (result && typeof result.then === 'function') {
          console.log("Transaction promise detected", "")
          result.then(
            (txResult) => {
              console.log("🎉 Transaction successful!", "")
              console.log("Result: " + JSON.stringify(txResult), "")
            },
            (txError) => {
              console.error("💀 Transaction failed: " + txError.message, "")
            }
          )
        } else {
          console.log("Transaction completed (sync): " + JSON.stringify(result), "")
        }
      } catch (error) {
        console.error("💥 Transaction test failed: " + error.message, "")
      }
    },

    update(delta) {
      if (!this.control) return

      // Handle input
      this.handleInput()
    },

    handleInput() {
      // Connect wallet
      if (this.control.keyC?.pressed) {
        console.log("C key pressed - connecting wallet", "")
        this.connectWallet()
      }

      // Disconnect wallet
      if (this.control.keyD?.pressed) {
        console.log("D key pressed - disconnecting wallet", "")
        this.disconnectWallet()
      }

      // Test transaction
      if (this.control.keyT?.pressed) {
        console.log("T key pressed - testing transaction", "")
        this.testTransaction()
      }
    },

    cleanup() {
      // Release controls
      if (this.control) {
        const keys = ['keyC', 'keyD', 'keyT']
        keys.forEach(key => {
          if (this.control[key]?.capture !== undefined) {
            this.control[key].capture = false
          }
        })
      }

      console.log("🧹 Cartridge integration cleaned up", "")
    }
  })

} else {
  console.log("💀 Server environment - cartridge integration impossible", "")
}

;;null