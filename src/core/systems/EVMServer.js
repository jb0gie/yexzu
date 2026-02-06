import { createPublicClient, createWalletClient, erc20Abi, getContract, http } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'
import * as utils from 'viem/utils'
import * as chains from 'viem/chains'
import { System } from './System'

export class EVM extends System {
  constructor(world) {
    super(world)
    this.evm = null

    const chainName = process.env.PUBLIC_EVM ?? 'mainnet'
    const chain = chains[chainName]

    if (!chain) throw new Error('invalid chain string')

    if (world.network.isServer) {
      const client = createPublicClient({
        chain,
        transport: http(),
      })

      this.utils = utils
      this.actions = client
      this.getContract = getContract
      this.abis = {
        erc20: erc20Abi,
        erc721: null,
      }

      const seedPhrase = process.env.EVM_SEED_PHRASE
      if (seedPhrase) {
        const account = mnemonicToAccount(seedPhrase)
        this.wallet = createWalletClient({
          account,
          chain,
          transport: http(),
        })
      } else {
        this.wallet = null
      }
    }
  }

  onEvmConnect(socket, address) {
    socket.player.data.evm = address
    socket.player.modify({ evm: address })
    this.world.network.send('entityModified', { id: socket.player.data.id, evm: address })
  }

  onEvmDisconnect(socket) {
    socket.player.data.evm = null
    socket.player.modify({ evm: null })
    this.world.network.send('entityModified', { id: socket.player.data.id, evm: null })
  }
}
