/**
 * Cartridge Browser Ready - Environment Aware Implementation
 *
 * This handles the real browser environment issue and provides proper fallback
 */

// Configure app
app.configure([
  {
    key: 'mode',
    type: 'switch',
    label: 'Mode',
    options: [
      { value: 'browser', label: 'Browser Mode' },
      { value: 'server', label: 'Server Mode' },
      { value: 'mock', label: 'Mock Mode' }
    ],
    initial: 'browser'
  },
  {
    key: 'autoConnect',
    type: 'switch',
    label: 'Auto Connect',
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' }
    ],
    initial: 'false'
  }
])

// Only run on client (this is the client-side check)
if (world.isClient) {
  console.log("🎯 CARTRIDGE BROWSER READY - Environment Aware")
  console.log("=============================================")

  // Use proven working syntax
  ({
    init() {
      console.log("Initializing cartridge system...", "")

      // Check actual environment
      const isBrowser = (typeof window !== 'undefined')
      const hasLocalStorage = (typeof localStorage !== 'undefined')
      const hasWebSocket = (typeof WebSocket !== 'undefined')

      console.log("Environment analysis:")
      console.log("Is Browser: " + isBrowser)
      console.log("Has LocalStorage: " + hasLocalStorage)
      console.log("Has WebSocket: " + hasWebSocket)

      // Setup basic state
      this.walletState = {
        connected: false,
        address: null,
        networkId: null,
        environment: 'unknown',
        error: null
      }

      // Determine operating mode
      if (props.mode === 'mock') {
        console.log("Mode: MOCK - Using simulated cartridge")
        this.setupMockSystem()
      } else if (!world.web3) {
        console.log("Mode: FALLBACK - ClientWeb3 system unavailable")
        console.log("This usually means system initialization failed")
        this.setupFallbackSystem()
      } else if (isBrowser) {
        console.log("Mode: BROWSER - Real cartridge available")
        this.setupRealSystem()
      } else {
        console.log("Mode: SERVER - Mock system required")
        this.setupFallbackSystem()
      }

      console.log("Cartridge system initialized")
    },

    setupRealSystem() {
      console.log("Setting up REAL cartridge system...")

      // Check debug info
      try {
        const debugInfo = world.web3.getDebugInfo()
        console.log("System debug info: " + JSON.stringify(debugInfo))

        if (debugInfo.initialized) {
          console.log("System properly initialized - ready for real usage")
          this.walletState.environment = 'browser'

          // Setup event listeners
          this.setupRealEventListeners()

          // Check existing connection
          this.checkExistingConnection()
        } else {
          console.log("System initialization failed: " + debugInfo.error)
          this.walletState.environment = 'initialization-failed'
          this.walletState.error = debugInfo.error
        }
      } catch (e) {
        console.log("Debug info failed: " + e.message)
        this.walletState.environment = 'debug-failed'
      }
    },

    setupMockSystem() {
      console.log("Setting up MOCK cartridge system...")
      this.walletState.environment = 'mock'

      // Mock cartridge functionality
      this.mockWeb3 = {
        connect: async () => {
          console.log("Mock connect called")
          await this.delay(1000)

          const mockData = {
            address: "0x1234567890abcdef",
            chainId: "SN_SEPOLIA",
            mock: true
          }

          this.walletState.connected = true
          this.walletState.address = mockData.address
          this.walletState.networkId = mockData.chainId

          console.log("Mock connection successful")
          return mockData
        },

        disconnect: async () => {
          console.log("Mock disconnect called")
          this.walletState.connected = false
          this.walletState.address = null
          this.walletState.networkId = null
        },

        isConnected: () => this.walletState.connected,
        getAddress: () => this.walletState.address,
        getNetworkId: () => this.walletState.networkId,

        execute: async (calls) => {
          console.log("Mock transaction: " + JSON.stringify(calls))
          await this.delay(1500)

          return {
            transaction_hash: "0xabc123",
            mock: true,
            calls: calls.length
          }
        },

        on: (event, callback) => {
          console.log("Mock event listener: " + event)
          // Store callbacks for mock events
          if (!this.mockListeners) this.mockListeners = {}
          if (!this.mockListeners[event]) this.mockListeners[event] = []
          this.mockListeners[event].push(callback)
        },

        getDebugInfo: () => ({
          initialized: true,
          environment: 'mock',
          isConnected: this.walletState.connected,
          mock: true
        })
      }

      this.setupMockEventListeners()
    },

    setupFallbackSystem() {
      console.log("Setting up FALLBACK cartridge system...")
      this.walletState.environment = 'fallback'

      // Simple fallback with helpful error messages
      this.mockWeb3 = {
        connect: async () => {
          throw new Error("Cartridge requires browser environment with world.web3 system")
        },
        isConnected: () => false,
        getAddress: () => null,
        getNetworkId: () => null,
        execute: async () => {
          throw new Error("Cartridge system not available - check browser environment")
        },
        on: () => {},
        getDebugInfo: () => ({
          initialized: false,
          environment: 'fallback',
          error: 'System not available',
          recommendation: 'Use browser with world.web3'
        })
      }
    },

    setupRealEventListeners() {
      if (!world.web3) return

      console.log("Setting up real event listeners...")

      world.web3.on('connected', (data) => {
        console.log("Real connected event: " + JSON.stringify(data))
        this.walletState.connected = true
        this.walletState.address = data.address
        this.walletState.networkId = data.chainId
      })

      world.web3.on('disconnected', () => {
        console.log("Real disconnected event")
        this.walletState.connected = false
        this.walletState.address = null
        this.walletState.networkId = null
      })

      world.web3.on('error', (error) => {
        console.error("Real error event: " + JSON.stringify(error), "")
        this.walletState.error = error.message
      })
    },

    setupMockEventListeners() {
      console.log("Setting up mock event listeners...")
      // Mock events fire automatically during mock operations
    },

    checkExistingConnection() {
      if (!world.web3) return

      console.log("Checking existing connection...")

      try {
        const connected = world.web3.isConnected()
        console.log("Existing connection: " + connected)

        if (connected) {
          const address = world.web3.getAddress()
          const networkId = world.web3.getNetworkId()

          this.walletState.connected = true
          this.walletState.address = address
          this.walletState.networkId = networkId

          console.log("Already connected: " + address)
          console.log("Network: " + networkId)
        }
      } catch (e) {
        console.error("Connection check failed: " + e.message, "")
      }
    },

    connectWallet() {
      const web3 = world.web3 || this.mockWeb3
      if (!web3) {
        console.error("No web3 system available", "")
        return
      }

      console.log("Attempting wallet connection...")

      try {
        const result = web3.connect()
        console.log("Connect result type: " + typeof result)

        if (result && typeof result.then === 'function') {
          console.log("Promise detected - monitoring connection...")
          result.then(
            (data) => {
              console.log("Connection successful!")
              console.log("Address: " + data.address)
              console.log("Chain: " + data.chainId)
            },
            (error) => {
              console.error("Connection failed: " + error.message, "")
              this.walletState.error = error.message
            }
          )
        } else {
          console.log("Connected (sync result): " + JSON.stringify(result))
          if (result && result.address) {
            this.walletState.connected = true
            this.walletState.address = result.address
            this.walletState.networkId = result.chainId
          }
        }
      } catch (error) {
        console.error("Connection error: " + error.message, "")
        this.walletState.error = error.message
      }
    },

    testTransaction() {
      const web3 = world.web3 || this.mockWeb3
      if (!web3) {
        console.error("No web3 system available", "")
        return
      }

      if (!this.walletState.connected) {
        console.error("Not connected", "")
        return
      }

      console.log("Testing transaction...")

      const testCalls = [{
        contractAddress: "0x1234567890abcdef",
        entrypoint: "test_method",
        calldata: ["0x1", "0x2"]
      }]

      try {
        const result = web3.execute(testCalls)
        console.log("Transaction initiated: " + typeof result)

        if (result && typeof result.then === 'function') {
          result.then(
            (txResult) => {
              console.log("Transaction successful!")
              console.log("Result: " + JSON.stringify(txResult))
            },
            (txError) => {
              console.error("Transaction failed: " + txError.message, "")
            }
          )
        } else {
          console.log("Transaction completed: " + JSON.stringify(result))
        }
      } catch (error) {
        console.error("Transaction error: " + error.message, "")
      }
    },

    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    },

    update(delta) {
      // Handle any periodic updates
      // For now, we'll keep this minimal
    },

    cleanup() {
      console.log("Cleaning up cartridge system...")
      console.log("Final state: " + JSON.stringify(this.walletState))
    }
  })

} else {
  console.log("Not in client environment - cartridge integration impossible")
}

;;null