import { System } from './System'
import { storage } from '../storage'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const key = 'hyp:solana:auths'
const template = 'Connect to world:\n{address}'

// Create a public client for Ethereum mainnet ENS resolution
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http('https://ethereum-rpc.publicnode.com'),
})

export class EVM extends System {
  constructor(world) {
    super(world)
    this.auths = storage.get(key, []) // [...{ address, signature }]
    this.connected = false
    // Store previous React state to detect actual changes
    this._cachedReactIsConnected = false
    this._cachedReactAddress = null
  }

  async bind({ connectors, connect, config, actions, abis, address, chainId, isConnected, isConnecting, disconnect }) {
    // Store the action bindings
    this.actions = actions
    this.abis = abis
    this.connection = { connect, disconnect, connectors }
    this.config = config

    // Cache React-provided data (for checking if state actually changed)
    this._cachedReactIsConnected = isConnected
    this._cachedReactAddress = address

    // Don't let bind() call this from React's stale state after explicit operations
    // Skip state updates if we're in the middle of an explicit connect/disconnect operation
    this.address = address
    this.chainId = chainId

    // Initialize ENS cache to prevent rate limiting
    this.ensCache = new Map()
    this.ensCacheTimeout = 5 * 60 * 1000 // 5 minutes

    // Update _reactData always (this is just caching React state)
    if (this._reactData) {
      this._reactData.isConnected = isConnected
      this._reactData.address = address
      this._reactData.chainId = chainId
    }

    // Cache current React state for comparison next time
    if (this._cachedReactIsConnected === undefined) {
      this._cachedReactIsConnected = isConnected
      this._cachedReactAddress = address
      this.connected = isConnected  // Initialize on first bind
      if (isConnected) {
        this.emit('evmConnect', address)
      }
      return
    }

    // Only update this.connected if React state has ACTUALLY changed
    const isConnectedChanged = isConnected !== this._cachedReactIsConnected
    const addressChanged = address !== this._cachedReactAddress

    // Cache the new state for next comparison
    this._cachedReactIsConnected = isConnected
    this._cachedReactAddress = address

    // Update only if the connection state changed (not just address updates)
    if (isConnectedChanged) {
      if (isConnected) {
        this.connected = true
        this.address = address // Store the address too
        this.chainId = chainId // Store the chainId
        // Emit local event only - wallet connection is client-side
        this.emit('evmConnect', address)
      } else {
        this.connected = false
        this.address = null // Clear address on disconnect
        this.chainId = null // Clear chainId on disconnect
        // Emit local event only - wallet disconnection is client-side
        this.emit('evmDisconnect')
      }
    } else if (addressChanged || (chainId !== undefined && chainId !== this.chainId)) {
      // Handle updates when already connected (e.g. chain switch or address change)
      this.address = address
      this.chainId = chainId
    }

    // Periodic cache cleanup (run once on bind)
    this.cleanupCache()
  }

  // Public method for apps to call - simplified wrapper
  async connect() {
    // Mark that we're performing an explicit operation
    // (but only very briefly, React needs to update us!)
    this._explicitOperationTimestamp = Date.now()

    // If React has updated but isn't done connecting yet, don't block it
    // Check both local state and React state - if they're different, we're in transition
    if (this.connected && this._reactData?.isConnecting) {
      console.log('[EVM] Already connected locally, but React is still processing')
    }

    // Check if already connected using both local state AND we have an address
    // DON'T check this._reactData?.isConnected here - we might have stale bind() data
    const isAlreadyConnected = this.connected && (this.address || this._reactData?.address || this._cachedReactAddress)

    if (isAlreadyConnected) {
      console.log('[EVM] Already connected (has connection and address), skipping...')
      // Get address from React data if available
      const address = this._reactData?.address || this.address
      return { success: false, reason: 'already_connected', address }
    }

    // console.log('[EVM] connect() called from app')
    // console.log('[EVM] Connection object:', this.connection)
    // console.log('[EVM] Connectors:', this.connection?.connectors)
    // console.log('[EVM] React data available:', !!this._reactData)

    if (!this.connection || !this.connection.connect) {
      console.error('[EVM] Connection not bound yet')
      return { success: false, reason: 'not_bound' }
    }

    if (!this.connection.connectors || this.connection.connectors.length === 0) {
      console.error('[EVM] No connectors available')
      return { success: false, reason: 'no_connectors' }
    }

    try {
      const connector = this.connection.connectors[0]
      // console.log('[EVM] Connecting with connector:', connector?.name)
      // console.log('[EVM] Connector object:', connector)

      await this.connection.connect({ connector })

      // Wait for React to update with the address (max 2 seconds)
      console.log('[EVM] Waiting for address from React...')
      const maxWait = 2000
      const startTime = Date.now()

      while (Date.now() - startTime < maxWait) {
        const address = this._reactData?.address || this.address
        if (address) {
          this.address = address
          this.chainId = this._reactData?.chainId || this.chainId
          this.connected = true
          return { success: true, connector, address }
        }
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.warn('[EVM] Address not received within timeout')
      // Don't set this.connected = true here - we don't have an address yet!
      // Let bind() set it when React updates with the address
      return { success: true, connector, address: null }
    } catch (err) {
      // console.error('[EVM] Connection failed:', err.message)
      // console.error('[EVM] Error stack:', err.stack)
      return { success: false, error: err.message, reason: 'connection_failed' }
    }
  }

  // Public disconnect method for apps
  async disconnect() {
    // Mark that we're performing an explicit operation
    this._explicitOperationTimestamp = Date.now()

    // console.log('')
    // console.log('=====================================================')
    // console.log('🔥 [EVMClient.js] disconnect() CALLED 🔥')
    // console.log('=====================================================')

    // console.log('[EVM] DIAGNOSTIC STATE DUMP:')
    // console.log('   - this.connected:', this.connected)
    // console.log('   - this._reactData?.isConnected:', this._reactData?.isConnected)
    // console.log('   - this._reactData?.address:', this._reactData?.address)
    // console.log('   - this.connection exists:', !!this.connection)
    // console.log('   - this.connection.disconnect type:', typeof this.connection?.disconnect)

    // Check BOTH states
    const isActuallyConnected = this.connected || this._reactData?.isConnected
    //console.log('[EVM] isActuallyConnected check:', isActuallyConnected, '(this || reactData)')

    if (!isActuallyConnected) {
      //console.warn('[EVM] ⚠️ Not connected according to both state flags!')
      //console.warn('[EVM] this.connected =', this.connected)
      //console.warn('[EVM] this._reactData?.isConnected =', this._reactData?.isConnected)
      return { success: false, reason: 'not_connected' }
    }

    //console.log('[EVM] ✅ Connection confirmed, proceeding with disconnect')

    if (!this.connection || !this.connection.disconnect) {
      //console.error('[EVM] ❌ CRITICAL: Connection not bound or no disconnect method!')
      //console.error('[EVM] Connection:', this.connection)
      return { success: false, reason: 'not_bound' }
    }

    //console.log('[EVM] ✅ Disconnect method found, about to call it')

    try {
      // Call the actual disconnect function from wagmi
      //console.log('[EVM] executing: await this.connection.disconnect()')
      const disconnectResult = await this.connection.disconnect()
      //console.log('[EVM] ✅ this.connection.disconnect() call completed')
      //console.log('[EVM] Disconnect result:', disconnectResult)

      // Reset states
      //console.log('[EVM] Resetting EVMClient state...')
      this.connected = false
      this.address = null // Clear cached address
      this.chainId = null // Clear chainId
      this._cachedReactIsConnected = false // Clear cached React state
      this._cachedReactAddress = null // Clear cached React address
      if (this._reactData) {
        this._reactData.isConnected = false
        this._reactData.address = null
        this._reactData.chainId = null
      }

      // Emit disconnect event locally only
      this.emit('evmDisconnect')

      return { success: true }

    } catch (err) {
      // Even on error, reset our state to be safe
      this.connected = false
      this.chainId = null
      this._cachedReactIsConnected = false
      if (this._reactData) {
        this._reactData.isConnected = false
        this._reactData.chainId = null
      }

      return { success: false, error: err.message, reason: 'disconnect_failed' }
    }
  }

  deposit(playerId, amount) {
    throw new Error('[solana] deposit can only be called on the server')
  }

  withdraw(playerId, amount) {
    throw new Error('[solana] withdraw can only be called on the server')
  }

  async onDepositRequest({ depositId, serializedTx }) {
    // console.log('onDepositRequest', { depositId, serializedTx })
    // const tx = Transaction.from(Buffer.from(serializedTx, 'base64'))
    // const signedTx = await this.wallet.signTransaction(tx)
    // const serializedSignedTx = Buffer.from(signedTx.serialize()).toString('base64')
    this.world.network.send('depositResponse', { depositId, serializedSignedTx })
    // console.log('depositResponse', { depositId, serializedSignedTx })
  }

  async onWithdrawRequest({ withdrawId, serializedTx }) {
    // console.log('onWithdrawRequest', { withdrawId, serializedTx })
    // const tx = Transaction.from(Buffer.from(serializedTx, 'base64'))
    // const signedTx = await this.wallet.signTransaction(tx)
    // const serializedSignedTx = Buffer.from(signedTx.serialize({ requireAllSignatures: false })).toString('base64')
    this.world.network.send('withdrawResponse', { withdrawId, serializedSignedTx })
    // console.log('withdrawResponse', { withdrawId, serializedSignedTx })
  }

  // ENS Resolution with caching to prevent rate limits
  async resolveName(address) {
    if (!address) {
      return { success: false, reason: 'no_address' }
    }

    // Check cache first
    const cacheKey = `name:${address.toLowerCase()}`
    const cached = this.ensCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.ensCacheTimeout) {
      console.log('[EVM] ENS name resolved from cache:', cached.value)
      return { success: true, name: cached.value }
    }

    try {
      // Use viem's getEnsName with mainnet client (ENS only exists on Ethereum mainnet)
      const { getEnsName } = await import('viem/actions')
      const name = await getEnsName(mainnetClient, { address })

      if (name) {
        // Cache the result
        this.ensCache.set(cacheKey, {
          value: name,
          timestamp: Date.now()
        })
        console.log('[EVM] ENS name resolved:', name)
        return { success: true, name }
      } else {
        console.log('[EVM] No ENS name found for address:', address)
        return { success: true, name: null }
      }
    } catch (error) {
      // Contract reverts when no ENS name is set - treat as "no name found"
      if (error.message?.includes('reverted') || error.message?.includes('Internal error')) {
        this.ensCache.set(cacheKey, {
          value: null,
          timestamp: Date.now()
        })
        return { success: true, name: null }
      }
      console.error('[EVM] ENS name resolution failed:', error.message)
      // Cache failures briefly to prevent repeated attempts
      this.ensCache.set(cacheKey, {
        value: null,
        timestamp: Date.now() - (this.ensCacheTimeout - 60000) // Cache for 1 minute
      })
      return { success: false, reason: 'resolution_failed', error: error.message }
    }
  }

  async lookupName(ensName) {
    if (!ensName) {
      return { success: false, reason: 'no_name' }
    }

    // Validate ENS name format
    if (!ensName.endsWith('.eth')) {
      console.log('[EVM] Not an ENS name:', ensName)
      return { success: true, address: null }
    }

    // Check cache first
    const cacheKey = `address:${ensName.toLowerCase()}`
    const cached = this.ensCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.ensCacheTimeout) {
      console.log('[EVM] ENS address resolved from cache:', cached.value)
      return { success: true, address: cached.value }
    }

    try {
      // Use viem's getEnsAddress with mainnet client (ENS only exists on Ethereum mainnet)
      const { getEnsAddress } = await import('viem/actions')
      const address = await getEnsAddress(mainnetClient, { name: ensName })

      if (address) {
        // Cache the result
        this.ensCache.set(cacheKey, {
          value: address,
          timestamp: Date.now()
        })
        console.log('[EVM] ENS address resolved:', address)
        return { success: true, address }
      } else {
        console.log('[EVM] No address found for ENS name:', ensName)
        return { success: true, address: null }
      }
    } catch (error) {
      console.error('[EVM] ENS address resolution failed:', error.message)
      // Cache failures briefly to prevent repeated attempts
      this.ensCache.set(cacheKey, {
        value: null,
        timestamp: Date.now() - (this.ensCacheTimeout - 60000) // Cache for 1 minute
      })
      return { success: false, reason: 'resolution_failed', error: error.message }
    }
  }

  // Clear expired cache entries
  cleanupCache() {
    const now = Date.now()
    let cleaned = 0
    for (const [key, entry] of this.ensCache.entries()) {
      if (now - entry.timestamp > this.ensCacheTimeout) {
        this.ensCache.delete(key)
        cleaned++
      }
    }
    if (cleaned > 0) {
      console.log(`[EVM] Cleaned ${cleaned} expired ENS cache entries`)
    }
  }
}
