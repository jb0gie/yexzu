import { BaseWeb3System } from './BaseWeb3System.js'
import { storage } from '../storage.js'
import { evmLogger } from '../utils/web3Logger.js'
import { createPublicClient, createWalletClient, erc20Abi, getContract, http } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'
import * as utils from 'viem/utils'
import * as chains from 'viem/chains'

const storageKey = 'evm:auths'

export class EVMSystem extends BaseWeb3System {
  constructor(world) {
    super(world)

    // Override environment detection based on world context
    this.environment = world.isClient ? 'client' : 'server'

    // EVM-specific properties
    this.auths = storage.get(storageKey, [])
    this.connection = null
    this.actions = null
    this.wallet = null
    this.getContract = getContract
    this.abis = null

    // Chain configuration
    this.chainName = process.env.PUBLIC_EVM ?? 'mainnet'
    this.chain = chains[this.chainName]

    if (!this.chain) {
      throw new Error(`[EVM] Invalid chain name: ${this.chainName}`)
    }

    evmLogger.info(`EVMSystem initialized for ${this.environment} on chain: ${this.chainName}`)
  }

  async init() {
    await super.init()

    try {
      if (this.world.isClient) {
        await this.initClient()
      } else if (this.world.isServer) {
        await this.initServer()
      }

      evmLogger.success(`EVMSystem initialized successfully in ${this.environment} mode`)
    } catch (error) {
      evmLogger.error('EVMSystem initialization failed', error)
      this.initError = error
      throw error
    }
  }

  async initClient() {
    evmLogger.info('Initializing client-side EVM...')

    // Client-specific initialization happens via bind() method from React component
    // This is called after wagmi provider is ready
    this.abis = {
      erc20: erc20Abi,
      erc721: null,
    }
  }

  async initServer() {
    evmLogger.info('Initializing server-side EVM...')

    // Set up common properties
    this.utils = utils
    this.actions = null
    this.wallet = null
    this.getContract = getContract
    this.abis = {
      erc20: erc20Abi,
      erc721: null,
    }

    if (process.env.EVM_SEED_PHRASE) {
      evmLogger.info('Creating server wallet client...')

      const account = mnemonicToAccount(process.env.EVM_SEED_PHRASE)

      this.wallet = createWalletClient({
        account,
        chain: this.chain,
        transport: http(),
      })

      this.actions = createPublicClient({
        chain: this.chain,
        transport: http(),
      })

      evmLogger.success('Server wallet client created', { address: account.address })
    } else {
      evmLogger.warn('EVM_SEED_PHRASE not set - EVM features disabled')
    }
  }

  /**
   * Client-only: Bind wagmi provider data
   */
  bind({ actions, utils, abis, config, address, isConnected, isConnecting, isDisconnected, connect, disconnect, connectors }) {
    if (!this.world.isClient) {
      throw new Error('[EVM] bind() is client-only')
    }

    evmLogger.info('Binding client EVM data...')

    this.actions = actions
    this.utils = utils
    this.abis = abis
    this.config = config
    this.address = address
    this.isConnected = isConnected
    this.isConnecting = isConnecting
    this.isDisconnected = isDisconnected
    this.connection = { connect, disconnect, connectors }

    if (isConnected && !this.isConnected) {
      this.world.network?.send?.('evmConnect', address)
      evmLogger.success('EVM connected', { address })
    }
    if (!isConnected && this.isConnected) {
      this.world.network?.send?.('evmDisconnect')
      evmLogger.info('EVM disconnected')
    }
  }

  /**
   * Connect to wallet (client-only)
   */
  async connect(player = null) {
    if (!this.world.isClient) {
      throw new Error('[EVM] connect() is client-only')
    }

    if (player) {
      throw new Error('[EVM] Cannot connect a remote player from client')
    }

    if (this.isConnected) {
      evmLogger.warn('Already connected')
      return
    }

    if (this.connection?.connect) {
      evmLogger.info('Initiating wallet connection...')
      this.connection.connect({ connector: this.connection.connectors?.[0] })
    } else {
      evmLogger.error('No connection handler available')
    }
  }

  /**
   * Disconnect wallet (client-only)
   */
  async disconnect(player = null) {
    if (!this.world.isClient) {
      throw new Error('[EVM] disconnect() is client-only')
    }

    if (player) {
      throw new Error('[EVM] Cannot disconnect a remote player from client')
    }

    if (!this.isConnected) {
      evmLogger.warn('Not connected')
      return
    }

    if (this.connection?.disconnect) {
      evmLogger.info('Disconnecting wallet...')
      this.connection.disconnect()
    }
  }

  /**
   * Get wallet client (server-only)
   */
  getWalletClient() {
    if (!this.world.isServer) {
      throw new Error('[EVM] getWalletClient() is server-only')
    }

    return this.wallet
  }

  /**
   * Get balance for address (both contexts)
   */
  async getBalance(address) {
    const client = this.world.isServer ? this.actions : this.actions?.getBalance

    if (!client) {
      throw new Error('[EVM] No client available')
    }

    try {
      if (this.world.isServer) {
        return await client.getBalance({ address })
      } else {
        return await client({ address })
      }
    } catch (error) {
      evmLogger.error('Failed to get balance', { address, error })
      throw error
    }
  }

  /**
   * Execute transaction (both contexts)
   */
  async execute(transaction) {
    if (this.world.isServer) {
      if (!this.wallet) {
        throw new Error('[EVM] Server wallet not initialized')
      }
      return this.wallet.sendTransaction(transaction)
    } else {
      if (!this.actions || !this.actions.sendTransaction) {
        throw new Error('[EVM] Client actions not available')
      }
      return this.actions.sendTransaction(transaction)
    }
  }

  /**
   * Get contract instance (both contexts)
   */
  getContractInstance(address, abi) {
    const client = this.world.isServer ? this.wallet : this.actions

    if (!client) {
      throw new Error(`[EVM] No client available for ${this.environment}`)
    }

    return this.getContract({
      address,
      abi,
      client,
    })
  }

  /**
   * Deposit tokens (server-only)
   */
  async deposit(playerId, amount) {
    if (!this.world.isServer) {
      throw new Error('[EVM] deposit() is server-only')
    }

    evmLogger.transaction('Processing deposit', { playerId, amount })
    // Server-side deposit logic implementation
  }

  /**
   * Withdraw tokens (server-only)
   */
  async withdraw(playerId, amount) {
    if (!this.world.isServer) {
      throw new Error('[EVM] withdraw() is server-only')
    }

    evmLogger.transaction('Processing withdrawal', { playerId, amount })
    // Server-side withdraw logic implementation
  }

  /**
   * Network event handlers (server-only)
   */
  onEvmConnect(socket, address) {
    if (!this.world.isServer) {
      return
    }

    evmLogger.network('Player connected EVM', { playerId: socket.player.data.id, address })
    socket.player.data.evm = address
    socket.player.modify({ evm: address })
    this.world.network.send('entityModified', { id: socket.player.data.id, evm: address })
  }

  onEvmDisconnect(socket) {
    if (!this.world.isServer) {
      return
    }

    evmLogger.network('Player disconnected EVM', { playerId: socket.player.data.id })
    socket.player.data.evm = null
    socket.player.modify({ evm: null })
    this.world.network.send('entityModified', { id: socket.player.data.id, evm: null })
  }

  onDepositRequest({ depositId, serializedTx: _serializedTx }) {
    if (!this.world.isServer) {
      return
    }

    evmLogger.debug('Processing deposit request', { depositId })
    this.world.network.send('depositResponse', { depositId, serializedSignedTx: null })
  }

  onWithdrawRequest({ withdrawId, serializedTx: _serializedTx }) {
    if (!this.world.isServer) {
      return
    }

    evmLogger.debug('Processing withdrawal request', { withdrawId })
    this.world.network.send('withdrawResponse', { withdrawId, serializedSignedTx: null })
  }

  /**
   * Create debug info with EVM-specific details
   */
  createDebugInfo(additional = {}) {
    return {
      ...super.createDebugInfo(),
      chainName: this.chainName,
      hasWalletClient: !!this.wallet,
      hasActions: !!this.actions,
      authsCount: this.auths?.length || 0,
      ...additional
    }
  }

  destroy() {
    evmLogger.info('Destroying EVMSystem...')

    // Cleanup EVM-specific resources
    this.connection = null
    this.auths = []

    super.destroy()
  }
}