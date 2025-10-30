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
      // console.log('[ClientWeb3] Initializing Web3 system...')
      // console.log('[ClientWeb3] Environment:', typeof window !== 'undefined' ? 'Browser' : 'Unknown')

      // We operate at the system level, not inside SES sandbox
      this.isInitializing = true
      this.initWeb3({})
      // console.log('[ClientWeb3] Web3 system initialized successfully')
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
    requireCartridge = true, // Make cartridge requirement explicit
  } = {}) {
    // console.log('[ClientWeb3] ===== CARTRIDGE ENGINE FEATURE INITIALIZATION =====')
    // console.log('[ClientWeb3] Forcing cartridge initialization as engine requirement...')

    // Cartridge is now a required engine feature - fail fast if not available
    if (typeof window === 'undefined') {
      throw new Error('CARTRIDGE ENGINE ERROR: Browser environment required for cartridge integration. This deployment requires client-side execution.')
    }

    if (!localStorage) {
      throw new Error('CARTRIDGE ENGINE ERROR: LocalStorage required for cartridge integration. Browser security settings may be blocking access.')
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

    // console.log('[ClientWeb3] Environment Validation:')
    // console.log('[ClientWeb3] ✅ window:', typeof window !== 'undefined')
    // console.log('[ClientWeb3] ✅ localStorage:', typeof localStorage !== 'undefined')
    // console.log('[ClientWeb3] ✅ WebSocket:', typeof WebSocket !== 'undefined')

    // === ENGINE FEATURE: CARTRIDGE CONTROLLER INITIALIZATION ===
    // console.log('[ClientWeb3] ===== INITIALIZING CARTRIDGE CONTROLLER (ENGINE LEVEL) =====')
    // console.log('[ClientWeb3] Configuration:', config)

    try {
      this.controller = new ControllerProvider(config)
      // console.log('[ClientWeb3] ✅ Cartridge Controller initialized successfully!')
      // console.log('[ClientWeb3] ✅ Engine feature ready: Cartridge Controller v0.10.7')
      // console.log('[ClientWeb3] ✅ Available commands: connect(), disconnect(), execute()')
    } catch (error) {
      // ===== ENGINE FAILURE: CARTRIDGE FEATURE NOT INITIALIZED =====
      console.error('[ClientWeb3] ======================================================')
      console.error('[ClientWeb3] ❌ CARTRIDGE ENGINE FEATURE INITIALIZATION FAILED')
      console.error('[ClientWeb3] ======================================================')
      console.error('[ClientWeb3] CRITICAL ERROR: Cartridge controller could not be initialized')
      console.error('[ClientWeb3] Engine Status: FAILED')
      console.error('[ClientWeb3] Error:', error.message)
      console.error('[ClientWeb3] Stack:', error.stack)
      console.error('[ClientWeb3] ======================================================')
      console.error('[ClientWeb3] SOLUTIONS:')
      console.error('[ClientWeb3] 1. Ensure running in browser environment (not Node.js)')
      console.error('[ClientWeb3] 2. Check cartridge dependencies: npm install @cartridge/controller')
      console.error('[ClientWeb3] 3. Verify browser supports required APIs (LocalStorage, WebSocket)')
      console.error('[ClientWeb3] 4. Check network connectivity to Cartridge infrastructure')
      console.error('[ClientWeb3] ======================================================')

      // Store initialization error for later retrieval
      this.initError = error

      // FAIL HARD - Cartridge is a required engine feature
      throw new Error(`CRITICAL ENGINE FAILURE: Cartridge controller initialization failed - ${error.message}. Cartridge integration is required for this Hyperfy deployment.`)
    }

    // ===== SUCCESS: CARTRIDGE ENGINE FEATURE INITIALIZED =====
    // console.log('[ClientWeb3] ======================================================')
    // console.log('[ClientWeb3] ✅ CARTRIDGE ENGINE FEATURE INITIALIZED SUCCESSFULLY')
    // console.log('[ClientWeb3] ======================================================')
    // console.log('[ClientWeb3] Engine Status: OPERATIONAL')
    // console.log('[ClientWeb3] Feature: Cartridge Controller v0.10.7')
    // console.log('[ClientWeb3] Environment: Browser Client')
    // console.log('[ClientWeb3] Networks: Sepolia + Mainnet Ready')
    // console.log('[ClientWeb3] API: world.web3 available for apps')
    // console.log('[ClientWeb3] ======================================================')

    // Create the world.web3 API with proper binding
    this.createWorldWeb3API()
    // console.log('[ClientWeb3] ✅ World API attached: world.web3')
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
    console.log('[ClientWeb3] ❌ CARTRIDGE ENGINE FEATURE REQUIRED - FAILED TO INITIALIZE')
    console.log('[ClientWeb3] ==========================================================')
    console.log('[ClientWeb3] CRITICAL: Cartridge controller is a required engine feature')
    console.log('[ClientWeb3] This deployment cannot proceed without cartridge integration')
    console.log('[ClientWeb3] ==========================================================')

    // Cartridge is now required - no fallback simulation, only clear error messages
    this.world.web3 = {
      connect: async () => {
        throw new Error(`CARTRIDGE ENGINE ERROR: Cannot connect wallet - required cartridge controller failed to initialize. ${this.initError?.message || 'Unknown initialization error'}`)
      },
      disconnect: async () => {
        throw new Error('CARTRIDGE ENGINE ERROR: Cannot disconnect - cartridge controller not initialized. This deployment requires cartridge integration.')
      },
      isConnected: () => false,

      // Account info - all throw errors since cartridge is required
      getAddress: () => {
        throw new Error('CARTRIDGE ENGINE ERROR: Cannot get address - cartridge controller not initialized. This deployment requires cartridge integration.')
      },
      getNetworkId: () => {
        throw new Error('CARTRIDGE ENGINE ERROR: Cannot get network ID - cartridge controller not initialized. This deployment requires cartridge integration.')
      },
      getAccount: () => {
        throw new Error('CARTRIDGE ENGINE ERROR: Cannot get account - cartridge controller not initialized. This deployment requires cartridge integration.')
      },

      // Transaction methods
      execute: async (calls, options = {}) => {
        throw new Error('CARTRIDGE ENGINE ERROR: Cannot execute transactions - cartridge controller not initialized. This deployment requires cartridge integration.')
      },

      // Event listeners
      on: this.on,
      off: this.off,

      // Configuration
      init: this.initWeb3,

      // Direct controller access for advanced usage
      getController: () => {
        throw new Error('CARTRIDGE ENGINE ERROR: Cannot access controller - cartridge initialization failed. This deployment requires cartridge integration.')
      },

      // Debug information - enhanced to show critical failure
      getDebugInfo: () => ({
        initialized: false,
        engineFeatureRequired: 'CARTRIDGE CONTROLLER',
        status: 'CRITICAL FAILURE',
        error: this.initError?.message || 'Cartridge controller initialization failed',
        environment: typeof window !== 'undefined' ? 'browser' : 'unknown',
        hasWindow: typeof window !== 'undefined',
        hasLocalStorage: typeof localStorage !== 'undefined',
        hasWebSocket: typeof WebSocket !== 'undefined',
        requirementsMet: false,
        deploymentStatus: 'FAILED - Cartridge integration required'
      })
    }
  }

  createWorldWeb3API() {
    // console.log('[ClientWeb3] 🔧 CREATING WORLD WEB3 API - REAL CARTRIDGE INTEGRATION')
    // console.log('[ClientWeb3] ======================================================')
    // console.log('[ClientWeb3] ✅ Engine Feature: Cartridge Controller v0.10.7')
    // console.log('[ClientWeb3] ✅ Integration: Real @cartridge/controller')
    // console.log('[ClientWeb3] ✅ Networks: StarkNet Sepolia + Mainnet')
    // console.log('[ClientWeb3] ✅ API: Real transaction execution')
    // console.log('[ClientWeb3] ======================================================')

    // Create the real world.web3 API with actual cartridge integration
    this.world.web3 = {
      // Connection methods - bound to maintain 'this' context
      connect: this.connect.bind(this),
      disconnect: this.disconnect.bind(this),
      isConnected: () => this.isConnected,

      // Account info - real data from cartridge controller
      getAddress: () => this.address,
      getNetworkId: () => this.networkId,
      getAccount: () => this.account,

      // Transaction methods - real StarkNet execution
      execute: this.execute.bind(this),

      // Event listeners
      on: this.on.bind(this),
      off: this.off.bind(this),

      // Configuration
      init: this.initWeb3.bind(this),

      // Direct controller access for advanced usage
      getController: () => this.controller,

      // Debug information - enhanced to show real integration status
      getDebugInfo: () => ({
        initialized: true,
        engineFeatureStatus: 'OPERATIONAL',
        integrationType: 'REAL CARTRIDGE CONTROLLER',
        hasController: !!this.controller,
        controllerVersion: 'v0.10.7',
        isConnected: this.isConnected,
        environment: typeof window !== 'undefined' ? 'browser' : 'unknown',
        supportedNetworks: ['SN_SEPOLIA', 'SN_MAINNET'],
        error: this.initError?.message,
        deploymentStatus: 'READY - Cartridge engine feature active'
      })
    }

    // console.log('[ClientWeb3] ✅ WORLD WEB3 API CREATED - Real cartridge integration ready')
  }

  connect = async () => {
    try {
      console.log('[ClientWeb3] 🌐 CONNECTING TO CARTRIDGE CONTROLLER (REAL INTEGRATION)')
      console.log('[ClientWeb3] ======================================================')

      this.account = await this.controller.connect()

      if (this.account) {
        this.isConnected = true
        this.address = this.account.address
        this.networkId = await this.account.getChainId()

        console.log('[ClientWeb3] ✅ REAL CARTRIDGE CONNECTION ESTABLISHED:')
        console.log('[ClientWeb3]   Address:', this.address)
        console.log('[ClientWeb3]   Network ID:', this.networkId)
        console.log('[ClientWeb3]   Controller: @cartridge/controller v0.10.7')
        console.log('[ClientWeb3]   Integration: REAL (no simulation)')

        this.emit('connected', {
          address: this.address,
          chainId: this.networkId,
          integration: 'REAL_CARTRIDGE_CONTROLLER',
        })

        return {
          address: this.address,
          chainId: this.networkId,
          account: this.account,
          integration: 'REAL_CARTRIDGE_CONTROLLER',
        }
      }

      throw new Error('REAL CARTRIDGE CONNECTION FAILED: No account returned from controller')
    } catch (error) {
      console.error('[ClientWeb3] ❌ REAL CARTRIDGE CONNECTION FAILED:', error)
      console.error('[ClientWeb3] This is a real cartridge controller connection failure')
      this.emit('error', { type: 'connection', error, integration: 'REAL_CARTRIDGE' })
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
      throw new Error('CARTRIDGE ENGINE ERROR: Real cartridge wallet not connected. Call world.web3.connect() first to connect with real cartridge controller.')
    }

    try {
      console.log('[ClientWeb3] 💰 EXECUTING REAL STARKNET TRANSACTION')
      console.log('[ClientWeb3] =========================================')
      console.log('[ClientWeb3] Calls:', calls)
      console.log('[ClientWeb3] Options:', options)
      console.log('[ClientWeb3] Network:', this.networkId)
      console.log('[ClientWeb3] Controller: @cartridge/controller v0.10.7')

      const result = await this.account.execute(calls, options)

      console.log('[ClientWeb3] ✅ REAL STARKNET TRANSACTION EXECUTED:')
      console.log('[ClientWeb3]   Transaction Hash:', result.transaction_hash)
      console.log('[ClientWeb3]   Network:', this.networkId)
      console.log('[ClientWeb3]   Integration: REAL (no simulation)')
      console.log('[ClientWeb3]   Status: Broadcast to StarkNet')

      this.emit('transaction', {
        result,
        integration: 'REAL_CARTRIDGE_CONTROLLER',
        network: this.networkId
      })

      return result
    } catch (error) {
      console.error('[ClientWeb3] ❌ REAL STARKNET TRANSACTION FAILED:', error)
      console.error('[ClientWeb3] This is a real transaction failure on StarkNet network')
      this.emit('error', { type: 'transaction', error, integration: 'REAL_CARTRIDGE' })
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
