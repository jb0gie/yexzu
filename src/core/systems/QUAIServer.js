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
