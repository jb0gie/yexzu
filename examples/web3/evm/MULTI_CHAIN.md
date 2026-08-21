# Multi-Chain EVM in Hyperfy

Apps can interact with **any configured EVM network** — both through the connected
user's wallet (client side) and the world's server-side seed-phrase wallet.

## Configuring chains

**Client** (`src/client/components/EVM.js`): the `networks` array lists every chain
the wallet modal offers (~40 networks: mainnet, L2s, alt L1s, testnets).

**Server** (`EVMServer.js`): set a comma-separated env var. First entry = default.

```bash
# single chain (backcompat — same as before)
PUBLIC_EVM=mainnet

# multi-chain
PUBLIC_EVM=mainnet,base,lensTestnet

# optional per-chain RPC override (else viem uses the chain's default RPC)
EVM_RPC_BASE=https://your-base-rpc.example.com
EVM_RPC_LENSTESTNET=https://your-lens-rpc.example.com

# server-side tx wallet (optional; enables world.evm.getWallet / writeContract)
EVM_SEED_PHRASE="twelve word seed phrase here"
```

Unknown chain names fail fast at server boot with `[EVMServer] invalid chain string`.
Any viem chain name works (`viem/chains` v2.43+ ships mainnet, base, arbitrum,
optimism, polygon, bsc, avalanche, lens, lensTestnet, zksync, linea, scroll, etc).

## Server-side API (`world.evm` on the server)

```js
// Any configured chain — by name or numeric chainId:
const client = world.evm.getClient({ chain: 'base' })          // or { chainId: 8453 }
const bal = await client.getBalance({ address: '0x...' })

const wallet = world.evm.getWallet({ chain: 'lensTestnet' })
const hash = await wallet.sendTransaction({
  to: '0x...', value: parseEther('0.01'),
})

// Read a contract on a specific chain
const result = await world.evm.getClient({ chain: 'mainnet' }).readContract({
  address: '0xTOKEN',
  abi: world.evm.abis.erc20,
  functionName: 'balanceOf',
  args: ['0x...'],
})
```

**Backcompat:** `world.evm.actions`, `world.evm.wallet`, `world.evm.utils`,
`world.evm.abis`, `world.evm.getContract` still exist and point at the **default**
(first) chain — old apps keep working untouched.

Helpers: `world.evm.getChain('base' | 8453 | chainObj)`, `world.evm.chainsInfo`
(`[{ id, name, key }]`).

## Client-side API (`world.evm` in app scripts, runs per-player)

```js
// What can this world talk to?
const chains = world.evm.getSupportedChains()
// [{ id: 1, name: 'Ethereum' }, { id: 8453, name: 'Base' }, ...]

// Ask the user's wallet to switch networks (wallet shows a prompt)
const res = await world.evm.switchChain(8453) // Base
if (!res.success) console.warn('user rejected or chain missing')

// Then act on the CURRENT chain — wagmi actions take a chainId per call,
// so you can also target a chain directly after switching:
await world.evm.actions.writeContract(world.evm.config, {
  address: '0xCONTRACT',
  abi: myAbi,
  functionName: 'mint',
  chainId: 8453,
  // ...args
})
```

Wallet connection state (`world.evm.address`, `isConnected`, `chainId`) updates
automatically when the user switches networks.

## Typical cross-chain app flow

```js
// Server side (authoritative): read prices on two chains
const ethPrice = await world.evm.getClient({ chain: 'mainnet' }).readContract({...})
const basePrice = await world.evm.getClient({ chain: 'base' }).readContract({...})

// Client side: user mints on Base
await world.evm.switchChain(8453)
await world.evm.actions.writeContract(world.evm.config, {
  address, abi, functionName: 'mint', chainId: 8453,
})
```

## Notes

- ENS resolution (`world.evm.resolveName` / `lookupName`) stays mainnet-only by
  design — ENS lives on L1.
- The QUAI system (`QUAI.js` / `QUAIClient.js`) is a separate, non-EVM stack and
  is unaffected.
