import { System } from './System.js'
import { web3Logger } from '../utils/web3Logger.js'
import { web3Environment } from '../utils/web3Environment.js'

/**
 * QUAI Client System
 *
 * Provides Quai Network integration for Hyperfy client.
 * Quai is NOT a standard EVM chain - it uses:
 * - Dual-ledger architecture (EVM + UTXO)
 * - Hierarchical sharding with 9 zones
 * - Proof of Entropy Minima consensus
 * - Pelagus wallet for browser integration
 *
 * IMPORTANT: This system requires the quais SDK (@quai/quai)
 * and Pelagus wallet extension to be installed.
 */
export class QUAIClient extends System {
  constructor(world) {
    super(world)
    this.provider = null
    this.signer = null
    this.address = null
    this.shard = null
    this.isInitialized = false
    this.initError = null
  }

  async init(options = {}) {
    try {
      web3Logger.info('Initializing QUAI client system...')

      // Validate browser environment
      web3Environment.validateBrowser(['browser', 'localStorage', 'WebSocket'])

      this.isInitialized = true
      web3Logger.success('QUAI client system initialized')
    } catch (error) {
      web3Logger.error('Failed to initialize QUAI client:', error)
      this.initError = error
      this.createMockAPI()
    }
  }

  /**
   * Check if Pelagus wallet is installed
   */
  isPelagusInstalled() {
    return typeof window !== 'undefined' && window.pelagus
  }

  /**
   * Connect to Quai Network via Pelagus wallet
   */
  async connect() {
    if (!this.isPelagusInstalled()) {
      return {
        success: false,
        reason: 'pelagus_not_installed',
        message: 'Pelagus wallet not detected. Please install Pelagus from https://pelaguswallet.io'
      }
    }

    try {
      web3Logger.network('Connecting to Quai Network via Pelagus...')

      // Request account access
      const accounts = await window.pelagus.request({
        method: 'quai_requestAccounts'
      })

      if (!accounts || accounts.length === 0) {
        return {
          success: false,
          reason: 'no_accounts',
          message: 'No accounts returned from Pelagus'
        }
      }

      this.address = accounts[0]

      // Get current chain/shard info
      const chainId = await window.pelagus.request({
        method: 'quai_chainId'
      })

      // Determine shard from address
      this.shard = this.getShardFromAddress(this.address)

      this.connected = true

      // Update player data
      if (this.world.entities?.player) {
        this.world.entities.player.modify({ quai: this.address })
      }

      web3Logger.success('Connected to Quai Network:', {
        address: this.address,
        chainId,
        shard: this.shard
      })

      this.emit('quaiConnect', {
        address: this.address,
        chainId,
        shard: this.shard
      })

      return {
        success: true,
        address: this.address,
        chainId,
        shard: this.shard
      }
    } catch (error) {
      web3Logger.error('Quai connection failed:', error)
      return {
        success: false,
        reason: 'connection_failed',
        error: error.message
      }
    }
  }

  /**
   * Disconnect from Quai Network
   */
  async disconnect() {
    try {
      // Pelagus doesn't have a disconnect method, just clear state
      this.address = null
      this.shard = null
      this.connected = false

      if (this.world.entities?.player) {
        this.world.entities.player.modify({ quai: null })
      }

      this.emit('quaiDisconnect', {})
      web3Logger.success('Disconnected from Quai Network')

      return { success: true }
    } catch (error) {
      web3Logger.error('Quai disconnect failed:', error)
      return {
        success: false,
        reason: 'disconnect_failed',
        error: error.message
      }
    }
  }

  /**
   * Determine which shard an address belongs to
   * Quai uses 9 zones in a 3x3 hierarchy (Prime, Region, Zone)
   */
  getShardFromAddress(address) {
    // Quai addresses start with shard prefix
    // This is a simplified version - actual implementation needs quais SDK
    if (!address || address.length < 4) return null

    // Address format: 0x<2 hex chars for shard>...
    const shardPrefix = address.slice(2, 4)

    // Map shard prefix to zone info
    // Based on Quai's 9 zone architecture
    const zoneMap = {
      '00': { prime: 'prime-0', region: 'cyprus', zone: 'zone-0-0' },
      '01': { prime: 'prime-0', region: 'cyprus', zone: 'zone-0-1' },
      '02': { prime: 'prime-0', region: 'cyprus', zone: 'zone-0-2' },
      '10': { prime: 'prime-1', region: 'paxos', zone: 'zone-1-0' },
      '11': { prime: 'prime-1', region: 'paxos', zone: 'zone-1-1' },
      '12': { prime: 'prime-1', region: 'paxos', zone: 'zone-1-2' },
      '20': { prime: 'prime-2', region: 'hydra', zone: 'zone-2-0' },
      '21': { prime: 'prime-2', region: 'hydra', zone: 'zone-2-1' },
      '22': { prime: 'prime-2', region: 'hydra', zone: 'zone-2-2' },
    }

    return zoneMap[shardPrefix] || { prime: 'unknown', region: 'unknown', zone: 'unknown' }
  }

  /**
   * Sign a message
   */
  async signMessage(message) {
    if (!this.connected || !this.address) {
      throw new Error('Not connected to Quai Network')
    }

    try {
      const signature = await window.pelagus.request({
        method: 'quai_sign',
        params: [this.address, message]
      })

      return { success: true, signature }
    } catch (error) {
      web3Logger.error('Message signing failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Send a transaction
   * Quai transactions include shard info and may need cross-shard coordination
   */
  async sendTransaction(tx) {
    if (!this.connected || !this.address) {
      throw new Error('Not connected to Quai Network')
    }

    try {
      const txHash = await window.pelagus.request({
        method: 'quai_sendTransaction',
        params: [{
          from: this.address,
          to: tx.to,
          value: tx.value,
          data: tx.data,
          // Quai-specific fields
          gasLimit: tx.gasLimit,
          gasPrice: tx.gasPrice,
        }]
      })

      return { success: true, txHash }
    } catch (error) {
      web3Logger.error('Transaction failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get balance for an address (uses quais SDK for proper shard handling)
   */
  async getBalance(address = this.address) {
    if (!address) {
      return { success: false, reason: 'no_address' }
    }

    try {
      // This would use quais SDK in full implementation
      // For now, return placeholder
      const balance = await window.pelagus.request({
        method: 'quai_getBalance',
        params: [address, 'latest']
      })

      return {
        success: true,
        balance,
        formatted: this.formatBalance(balance)
      }
    } catch (error) {
      web3Logger.error('Balance fetch failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Format Quai balance (18 decimals)
   */
  formatBalance(wei) {
    if (!wei) return '0'
    const quai = Number(wei) / 1e18
    return quai.toFixed(6)
  }

  /**
   * Create mock API for when initialization fails
   */
  createMockAPI() {
    this.world.quai = {
      connect: async () => ({
        success: false,
        reason: 'not_initialized',
        message: 'QUAI system failed to initialize'
      }),
      disconnect: async () => ({ success: false }),
      isConnected: () => false,
      getAddress: () => null,
      getShard: () => null,
      signMessage: async () => ({ success: false }),
      sendTransaction: async () => ({ success: false }),
      getBalance: async () => ({ success: false }),
      isPelagusInstalled: () => false,
    }
  }

  /**
   * Create the world.quai API
   */
  createWorldAPI() {
    this.world.quai = {
      connect: this.connect.bind(this),
      disconnect: this.disconnect.bind(this),
      isConnected: () => this.connected,
      getAddress: () => this.address,
      getShard: () => this.shard,
      signMessage: this.signMessage.bind(this),
      sendTransaction: this.sendTransaction.bind(this),
      getBalance: this.getBalance.bind(this),
      isPelagusInstalled: this.isPelagusInstalled.bind(this),
    }
  }

  destroy() {
    this.disconnect()
    if (this.world.quai) {
      delete this.world.quai
    }
    super.destroy()
  }
}
