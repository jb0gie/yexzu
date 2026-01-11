import { System } from './System'
import { storage } from '../storage'

const key = 'hyp:solana:auths'
const template = 'Connect to world:\n{address}'

export class EVM extends System {
  constructor(world) {
    super(world)
    this.auths = storage.get(key, []) // [...{ address, signature }]
    this.connected = false
  }

  async bind({ connectors, connect, config, actions, abis, address, isConnected, isConnecting, disconnect }) {
    // console.log('[EVMClient.js] bind() called with:', {
    //   hasConnectors: !!connectors,
    //   numConnectors: connectors?.length,
    //   connectType: typeof connect,
    //   disconnectType: typeof disconnect,
    //   address,
    //   isConnected,
    //   isConnecting
    // })

    this.actions = actions
    this.abis = abis
    this.connection = { connect, disconnect, connectors }
    this.config = config
    this.address = address

    // console.log('[EVMClient.js] this.connection set to:', {
    //   hasConnect: !!this.connection.connect,
    //   hasDisconnect: !!this.connection.disconnect,
    //   numConnectors: this.connection.connectors?.length
    // })

    // Update connected state based on isConnected
    if (isConnected && !this.connected) {
      // console.log('[EVMClient.js] Connection state changed: disconnected -> connected')
      this.connected = true
      // Emit local event only - wallet connection is client-side
      this.emit('evmConnect', address)
    }
    if (!isConnected && this.connected) {
      // console.log('[EVMClient.js] Connection state changed: connected -> disconnected')
      this.connected = false
      // Emit local event only - wallet disconnection is client-side
      this.emit('evmDisconnect')
    }

    // Also update _reactData if it exists
    if (this._reactData) {
      this._reactData.isConnected = isConnected
      this._reactData.address = address
    }

    // console.log('[EVMClient.js] bind() completed, ready for connections')
  }

  // Public method for apps to call - simplified wrapper
  async connect() {
    // Check if already connected using either state
    const isAlreadyConnected = this.connected || this._reactData?.isConnected

    if (isAlreadyConnected) {
      console.log('[EVM] Already connected, skipping...')
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
          console.log('[EVM] Address received:', address)
          this.connected = true
          return { success: true, connector, address }
        }
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.warn('[EVM] Address not received within timeout, connection may have issues')
      return { success: true, connector, address: null }
    } catch (err) {
      // console.error('[EVM] Connection failed:', err.message)
      // console.error('[EVM] Error stack:', err.stack)
      return { success: false, error: err.message, reason: 'connection_failed' }
    }
  }

  // Public disconnect method for apps
  async disconnect() {
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
      if (this._reactData) {
        //console.log('[EVM] Resetting _reactData...')
        this._reactData.isConnected = false
        this._reactData.address = null
      }

      //console.log('[EVM] ✨ Disconnect completed successfully!')

      // Emit disconnect event locally only
      //console.log('[EVM] Emitting evmDisconnect event')
      this.emit('evmDisconnect')

      return { success: true }

    } catch (err) {
      //console.error('[EVM] 🔥 DISCONNECT FAILED!')
      //console.error('[EVM] Error:', err)
      //console.error('[EVM] Error message:', err.message)
      //console.error('[EVM] Error stack:', err.stack)

      // Even on error, reset our state to be safe
      this.connected = false
      if (this._reactData) {
        this._reactData.isConnected = false
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
}
