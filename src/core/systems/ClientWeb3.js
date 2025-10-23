import { System } from './System'
import ControllerProvider from '@cartridge/controller'
import { constants } from 'starknet'

/**
 * Client Web3 System
 *
 * - Runs on the client
 * - Provides Cartridge Controller integration for StarkNet wallet functionality
 * - Exposes wallet methods through world.web3 API
 *
 * IMPORTANT: This system operates at the browser level, not within the SES sandbox
 * Apps access this through the world.web3 API which is injected into their environment
 *
 */
export class ClientWeb3 extends System {
  constructor(world) {
    super(world)
    this.controller = null
    this.account = null
    this.isConnected = false
    this.address = null
    this.networkId = null
    this.listeners = new Map()
    this.isInitializing = false
    this.initError = null
  }

  async init(options = {}) {
    try {
      console.log('[ClientWeb3] Initializing Web3 system...')
      console.log('[ClientWeb3] Environment:', typeof window !== 'undefined' ? 'Browser' : 'Unknown')

      // We operate at the system level, not inside SES sandbox
      this.isInitializing = true
      this.initWeb3({})
      console.log('[ClientWeb3] Web3 system initialized successfully')
    } catch (error) {
      console.error('[ClientWeb3] Failed to initialize Web3 system:', error)
      this.initError = error
      // Create a functioning mock API for graceful degradation
      this.createFunctionalMockAPI()
    } finally {
      this.isInitializing = false
    }
  }

  initWeb3({
    policies = null,
    chains = null,
    defaultChainId = constants.StarknetChainId.SN_SEPOLIA,
    keychainUrl = 'https://x.cartridge.gg',
  } = {}) {
    try {
      console.log('[ClientWeb3] Starting controller initialization...')

      // Check if we're in a browser environment with required APIs
      if (typeof window === 'undefined') {
        throw new Error('Cartridge Controller requires browser environment (window object not found)')
      }

      const config = {
        keychainUrl,
        defaultChainId,
      }

      // Add policies if provided
      if (policies) {
        config.policies = policies
      }

      // Add custom chain configuration if provided
      if (chains) {
        config.chains = chains
      } else {
        // Default chains
        config.chains = [
          { rpcUrl: 'https://api.cartridge.gg/x/starknet/sepolia' },
          { rpcUrl: 'https://api.cartridge.gg/x/starknet/mainnet' },
        ]
      }

      console.log('[ClientWeb3] Environment check - window exists:', typeof window !== 'undefined')
      console.log('[ClientWeb3] Environment check - localStorage exists:', typeof localStorage !== 'undefined')
      console.log('[ClientWeb3] Environment check - WebSocket exists:', typeof WebSocket !== 'undefined')

      // Initialize controller with better error handling
      console.log('[ClientWeb3] Creating ControllerProvider...')
      this.controller = new ControllerProvider(config)
      console.log('[ClientWeb3] ControllerProvider created successfully')

    } catch (error) {
      console.error('[ClientWeb3] Failed to create controller:', error)
      console.error('[ClientWeb3] Error name:', error.name)
      console.error('[ClientWeb3] Error message:', error.message)
      console.error('[ClientWeb3] Error stack:', error.stack)

      // Create a mock controller that provides helpful error messages
      this.controller = {
        connect: async () => {
          const errorMsg = this.getControllerInitError()
          throw new Error(`Controller initialization failed: ${errorMsg}`)
        },
        disconnect: async () => { },
        isConnected: () => false,
        getAddress: () => null,
        getChainId: () => null,
        execute: async () => {
          throw new Error('Controller not initialized - cannot execute transactions')
        }
      }

      // Still create the API so world.web3 exists with meaningful error messages
      this.createFunctionalMockAPI()
      return
    }

    // Create the world.web3 API with proper binding
    this.createWorldWeb3API()
    console.log('[ClientWeb3] Web3 API created and attached to world')
  }

  getControllerInitError() {
    if (this.initError) {
      return this.initError.message
    }
    if (typeof window === 'undefined') {
      return 'Browser environment required'
    }
    return 'Unknown initialization error'
  }

  createFunctionalMockAPI() {
    console.log('[ClientWeb3] Creating functional mock API for debugging')

    // Create a functional mock that provides helpful debugging information
    this.world.web3 = {
      // Connection methods
      connect: async () => {
        const errorMsg = this.getControllerInitError()
        throw new Error(`Web3 system initialization failed: ${errorMsg}. This usually means the Cartridge Controller could not be initialized in the browser environment.`)
      },
      disconnect: async () => {
        this.isConnected = false
        this.account = null
        this.address = null
        this.networkId = null
        this.emit('disconnected')
      },
      isConnected: () => this.isConnected,

      // Account info
      getAddress: () => this.address,
      getNetworkId: () => this.networkId,
      getAccount: () => this.account,

      // Transaction methods
      execute: async (calls, options = {}) => {
        throw new Error(`Controller not initialized - cannot execute transactions. ${this.getControllerInitError()}`)
      },

      // Event listeners
      on: this.on,
      off: this.off,

      // Configuration
      init: this.initWeb3,

      // Direct controller access for advanced usage
      getController: () => this.controller,

      // Debug information
      getDebugInfo: () => ({
        initialized: false,
        error: this.initError?.message,
        environment: typeof window !== 'undefined' ? 'browser' : 'unknown',
        hasWindow: typeof window !== 'undefined',
        hasLocalStorage: typeof localStorage !== 'undefined',
        hasWebSocket: typeof WebSocket !== 'undefined'
      })
    }
  }

  createWorldWeb3API() {
    // Create a properly functioning world.web3 API
    this.world.web3 = {
      // Connection methods - bound to maintain 'this' context
      connect: this.connect.bind(this),
      disconnect: this.disconnect.bind(this),
      isConnected: () => this.isConnected,

      // Account info
      getAddress: () => this.address,
      getNetworkId: () => this.networkId,
      getAccount: () => this.account,

      // Transaction methods
      execute: this.execute.bind(this),

      // Event listeners
      on: this.on.bind(this),
      off: this.off.bind(this),

      // Configuration
      init: this.initWeb3.bind(this),

      // Direct controller access for advanced usage
      getController: () => this.controller,

      // Debug information
      getDebugInfo: () => ({
        initialized: true,
        isConnected: this.isConnected,
        hasController: !!this.controller,
        environment: typeof window !== 'undefined' ? 'browser' : 'unknown',
        error: this.initError?.message
      })
    }
  }

  connect = async () => {
    try {
      console.log('[ClientWeb3] Connecting to Cartridge Controller...')

      this.account = await this.controller.connect()

      if (this.account) {
        this.isConnected = true
        this.address = this.account.address
        this.networkId = await this.account.getChainId()

        console.log('[ClientWeb3] Connected:', {
          address: this.address,
          chainId: this.networkId,
        })

        this.emit('connected', {
          address: this.address,
          chainId: this.networkId,
        })

        return {
          address: this.address,
          chainId: this.networkId,
          account: this.account,
        }
      }

      throw new Error('Failed to connect wallet')
    } catch (error) {
      console.error('[ClientWeb3] Connection failed:', error)
      this.emit('error', { type: 'connection', error })
      throw error
    }
  }

  disconnect = async () => {
    try {
      console.log('[ClientWeb3] Disconnecting...')

      if (this.controller && this.controller.disconnect) {
        await this.controller.disconnect()
      }

      this.account = null
      this.isConnected = false
      this.address = null
      this.networkId = null

      this.emit('disconnected')

      console.log('[ClientWeb3] Disconnected')
    } catch (error) {
      console.error('[ClientWeb3] Disconnect failed:', error)
      this.emit('error', { type: 'disconnect', error })
      throw error
    }
  }

  execute = async (calls, options = {}) => {
    if (!this.isConnected || !this.account) {
      throw new Error('Wallet not connected. Call world.web3.connect() first.')
    }

    try {
      console.log('[ClientWeb3] Executing transaction...', calls)

      const result = await this.account.execute(calls, options)

      console.log('[ClientWeb3] Transaction executed:', result)
      this.emit('transaction', { result })

      return result
    } catch (error) {
      console.error('[ClientWeb3] Transaction failed:', error)
      this.emit('error', { type: 'transaction', error })
      throw error
    }
  }

  on = (event, callback) => {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
  }

  off = (event, callback) => {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback)
    }
  }

  emit = (event, data) => {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`[ClientWeb3] Event listener error (${event}):`, error)
        }
      })
    }
  }

  destroy() {
    this.disconnect()
    this.listeners.clear()
    if (this.world.web3) {
      delete this.world.web3
    }
    console.log('[ClientWeb3] Destroyed')
  }
}
