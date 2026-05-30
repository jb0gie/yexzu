import { System } from './System'

/**
 * QUAI Server System
 *
 * Server-side support for Quai Network operations.
 * For full functionality, requires @quai/quai SDK.
 */
export class QUAI extends System {
  constructor(world) {
    super(world)
    this.rpcUrl = process.env.QUAI_RPC_URL || 'https://rpc.quai.network'
  }

  init() {
    this.world.quai = {
      connect: async () => ({
        success: false,
        reason: 'server_side',
        message: 'QUAI wallet connection only available on client'
      }),
      disconnect: async () => ({ success: true }),
      isConnected: () => false,
      getAddress: () => null,
      getShard: () => null,
      getWalletType: () => null,
      signMessage: async () => ({ success: false }),
      sendTransaction: async () => ({ success: false }),
      getBalance: async () => ({ success: false }),
      isPelagusInstalled: () => false,
      isTangemInstalled: () => false,
      connectPelagus: async () => ({ success: false, reason: 'server_side' }),
      connectTangem: async () => ({ success: false, reason: 'server_side' }),
    }
  }

  onQuaiConnect(socket, address) {
    socket.player.data.quai = address
    socket.player.modify({ quai: address })
    this.world.network.send('entityModified', { id: socket.player.data.id, quai: address })
  }

  onQuaiDisconnect(socket) {
    socket.player.data.quai = null
    socket.player.modify({ quai: null })
    this.world.network.send('entityModified', { id: socket.player.data.id, quai: null })
  }
}
