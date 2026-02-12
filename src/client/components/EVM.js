import { createConfig, http, injected, useDisconnect, WagmiProvider } from 'wagmi'
import * as chains from 'wagmi/chains'
import { defineChain } from 'viem'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient()

// Monad mainnet configuration (chainId 143)
const monadMainnet = defineChain({
  id: 143,
  name: 'Monad',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://monadexplorer.com' },
  },
})

// Support both Monad mainnet and Ethereum mainnet (for ENS resolution)
const monad = monadMainnet
const eth = chains.mainnet

const config = createConfig({
  chains: [monad, eth],
  transports: {
    [monad.id]: http(),
    [eth.id]: http(),
  },
  connectors: [injected()],
  multiInjectedProviderDiscovery: false,
  storage: null,
  ssr: true,
})

export const Providers = ({ children }) => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </WagmiProvider>
)

export function EVM({ world }) {
  // console.log('[EVM] component rendering!')
  // console.log('[EVM] world parameter:', world)
  // console.log('[EVM] world.evm exists:', !!world?.evm)

  // Store the latest connection data for EVMClient to access
  if (world.evm && !world.evm._reactData) {
    world.evm._reactData = {}
  }

  return (
    <Providers>
      <Logic world={world} />
    </Providers>
  )
}

import * as evmActions from 'wagmi/actions'
import { useConfig, useAccount, useChainId } from 'wagmi'
import * as utils from 'viem/utils'
import { erc20Abi } from 'viem'

import { useConnect, useConnectors } from 'wagmi'
import { useState, useEffect } from 'react'

function Logic({ world }) {
  const config = useConfig()
  const chainId = useChainId()
  const { address, isConnected, isConnecting, isReconnecting, isDisconnected } = useAccount()
  const [initialized, setInitialized] = useState(false)
  // useEffect(() => {
  //   if (initialized) return
  //   setInitialized(true)

  //   let evm = { actions: {}, utils }
  //   for (const [action, fn] of Object.entries(evmActions)) {
  //     evm.actions[action] = (...args) => fn(config, ...args)
  //   }
  //   evm.abis = {
  //     erc20: erc20Abi,
  //     erc721: null,
  //   }

  //   world.evm = evm
  // }, [config])

  // Set player.evm when wallet connects/disconnects
  useEffect(() => {
    if (world.entities?.player) {
      world.entities.player.modify({ evm: address || null })
    }
  }, [address, world.entities?.player])

  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    //console.log('[EVM] useEffect running, wagmi state:')
    //console.log('[EVM] - isConnected:', isConnected)
    //console.log('[EVM] - isConnecting:', isConnecting)
    //console.log('[EVM] - address:', address)
    //console.log('[EVM] - connectors:', connectors)
    //console.log('[EVM] - connect function type:', typeof connect)
    //console.log('[EVM] - disconnect function type:', typeof disconnect)

    // Store latest data for EVMClient to access
    if (world.evm._reactData) {
      world.evm._reactData.address = address
      world.evm._reactData.isConnected = isConnected
      world.evm._reactData.isConnecting = isConnecting
      world.evm._reactData.chainId = chainId
    }

    let actions = {}

    const abis = {
      erc20: erc20Abi,
      erc721: null,
    }

    world.evm.bind({
      connectors,
      connect,
      disconnect,
      address,
      chainId,
      actions: evmActions,
      abis,
      config,
      isConnected,
      isConnecting,
    })
  }, [isConnected, isConnecting, address, chainId])

  return null
}
