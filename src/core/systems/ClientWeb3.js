import { System } from './System'
import Controller from '@cartridge/controller'
import { constants } from 'starknet'

/**
 * Client Web3 System
 *
 * - Runs on the client
 * - Provides Cartridge Controller integration for StarkNet wallet functionality
 * - Exposes wallet methods through world.web3 API
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
  }

  async init(options = {}) {
    // Initialize with default configuration
    // The options parameter comes from World.init() and contains storage, assetsDir, etc.
    // We ignore those and use our own Web3-specific defaults
    this.initWeb3({})
  }

  initWeb3({
    policies = null,
    chains = null,
    defaultChainId = constants.StarknetChainId.SN_SEPOLIA,
    keychainUrl = 'https://x.cartridge.gg',
  } = {}) {
    try {
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

      // Initialize controller
      this.controller = new Controller(config)
      console.log('[ClientWeb3] Controller created successfully')
    } catch (error) {
      console.error('[ClientWeb3] Failed to create controller:', error)
      // Create a mock controller for graceful degradation
      this.controller = {
        connect: async () => { throw new Error('Web3 not available') },
        disconnect: async () => { }
      }
    }

    // Add web3 API to world
    this.world.web3 = {
      // Connection methods
      connect: this.connect,
      disconnect: this.disconnect,
      isConnected: () => this.isConnected,

      // Account info
      getAddress: () => this.address,
      getNetworkId: () => this.networkId,
      getAccount: () => this.account,

      // Transaction methods
      execute: this.execute,

      // Event listeners
      on: this.on,
      off: this.off,

      // Configuration
      init: this.initWeb3,

      // Direct controller access for advanced usage
      getController: () => this.controller,
    }

    console.log('[ClientWeb3] Cartridge Controller initialized')
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
