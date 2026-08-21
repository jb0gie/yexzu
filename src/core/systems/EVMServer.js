import { createPublicClient, createWalletClient, erc20Abi, getContract, http } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'
import * as utils from 'viem/utils'
import * as chains from 'viem/chains'
import { System } from './System'

// Comma-separated chain list, read lazily at construction time (AFTER dotenv loads —
// do NOT hoist to module scope or .env values are missed):
//   PUBLIC_EVM=mainnet                       -> mainnet only (same as before)
//   PUBLIC_EVM=mainnet,base,lensTestnet     -> three chains, mainnet = default
function parseChainNames() {
  return (process.env.PUBLIC_EVM ?? 'mainnet')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

export class EVM extends System {
  constructor(world) {
    super(world)
    this.evm = null

    // Resolve every requested chain up-front; unknown name = fatal config error.
    const chainNames = parseChainNames()
    this.chainNames = chainNames
    const resolved = chainNames.map(name => {
      const chain = chains[name]
      if (!chain) throw new Error(`[EVMServer] invalid chain string: "${name}"`)
      return { name, chain }
    })

    if (world.network.isServer) {
      this.chainsInfo = [] // [{ id, name, key }]
      this.clients = new Map() // chainId -> PublicClient
      this.wallets = new Map() // chainId -> WalletClient | null

      const seedPhrase = process.env.EVM_SEED_PHRASE
      const account = seedPhrase ? mnemonicToAccount(seedPhrase) : null

      for (const { name, chain } of resolved) {
        // Optional per-chain RPC override: EVM_RPC_BASE=https://..., else viem uses chain defaults.
        const rpcUrl = process.env[`EVM_RPC_${name.toUpperCase()}`]
        this.clients.set(chain.id, createPublicClient({ chain, transport: http(rpcUrl) }))
        this.wallets.set(
          chain.id,
          account ? createWalletClient({ account, chain, transport: http(rpcUrl) }) : null
        )
        this.chainsInfo.push({ id: chain.id, name: chain.name, key: name })
      }

      this.defaultChainId = resolved[0].chain.id

      // Backcompat aliases -> default (first) chain. Existing apps using
      // world.evm.actions / world.evm.wallet / world.evm.utils keep working unchanged.
      this.utils = utils
      this.actions = this.clients.get(this.defaultChainId)
      this.wallet = this.wallets.get(this.defaultChainId)
      this.getContract = getContract
      this.abis = {
        erc20: erc20Abi,
        erc721: null,
      }

      console.log(
        `[EVMServer] chains: ${resolved.map((r, i) => (i === 0 ? `${r.name}(default)` : r.name)).join(', ')}`
      )
    }
  }

  // Resolve a chain from a name ('base'), numeric chainId (8453), viem chain object, or null (default).
  getChain(key) {
    if (key == null) return chains[this.chainNames[0]]
    if (typeof key === 'object') return key.id != null ? key : null
    if (typeof key === 'number') {
      for (const name of this.chainNames) {
        const c = chains[name]
        if (c && c.id === key) return c
      }
      return null
    }
    return chains[String(key)] ?? null
  }

  // PublicClient for any configured chain: getClient({ chain: 'base' }) or ({ chainId: 8453 })
  getClient(opts = {}) {
    const chain = this.getChain(opts.chain ?? opts.chainId)
    if (!chain) throw new Error(`[EVMServer] unknown chain: ${opts.chain ?? opts.chainId}`)
    const client = this.clients.get(chain.id)
    if (!client) throw new Error(`[EVMServer] chain not configured: ${chain.name} (add to PUBLIC_EVM)`)
    return client
  }

  // WalletClient (seed phrase) for any configured chain: getWallet({ chain: 'lensTestnet' })
  getWallet(opts = {}) {
    const chain = this.getChain(opts.chain ?? opts.chainId)
    if (!chain) throw new Error(`[EVMServer] unknown chain: ${opts.chain ?? opts.chainId}`)
    const wallet = this.wallets.get(chain.id)
    if (!wallet) throw new Error(`[EVMServer] no wallet configured for ${chain.name} (set EVM_SEED_PHRASE)`)
    return wallet
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
