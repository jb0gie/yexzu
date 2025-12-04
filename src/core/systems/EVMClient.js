import { System } from './System'
import { storage } from '../storage'

const key = 'evm:auths'

export class EVM extends System {
  constructor(world) {
    super(world)
    this.auths = storage.get(key, [])
    this.connected = false
    this.address = null
    this.isConnected = false
    this.isConnecting = false
    this.isDisconnected = true
    this.connection = null
  }

  init() {
    // Server-side init if needed
  }

  bind({ actions, utils, abis, config, address, isConnected, isConnecting, isDisconnected, connect, disconnect, connectors }) {
    this.actions = actions
    this.utils = utils
    this.abis = abis
    this.config = config
    this.address = address
    this.isConnected = isConnected
    this.isConnecting = isConnecting
    this.isDisconnected = isDisconnected
    this.connection = { connect, disconnect, connectors }

    if (isConnected && !this.connected) {
      this.connected = true
      this.world.network.send('evmConnect', address)
    }
    if (!isConnected && this.connected) {
      this.connected = false
      this.world.network.send('evmDisconnect')
    }
  }

  connect(player) {
    if (player && !this.world.isServer) {
      throw new Error('[evm] cannot connect a remote player from client')
    }
    if (this.connected) return
    if (this.connection?.connect) {
      this.connection.connect({ connector: this.connection.connectors?.[0] })
    }
  }

  disconnect(player) {
    if (player && !this.world.isServer) {
      throw new Error('[evm] cannot disconnect a remote player from client')
    }
    if (!this.connected) return
    if (this.connection?.disconnect) {
      this.connection.disconnect()
    }
  }

  deposit(playerId, amount) {
    if (!this.world.isServer) {
      throw new Error('[evm] deposit can only be called on the server')
    }
    // Server-side deposit logic
  }

  withdraw(playerId, amount) {
    if (!this.world.isServer) {
      throw new Error('[evm] withdraw can only be called on the server')
    }
    // Server-side withdraw logic
  }

  onDepositRequest({ depositId, serializedTx }) {
    this.world.network.send('depositResponse', { depositId, serializedSignedTx: null })
  }

  onWithdrawRequest({ withdrawId, serializedTx }) {
    this.world.network.send('withdrawResponse', { withdrawId, serializedSignedTx: null })
  }
}
