import { createConfig, http, injected, useDisconnect, WagmiProvider } from 'wagmi'
import * as chains from 'wagmi/chains'
import { defineChain } from 'viem'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient()

// Custom chain definitions for networks not in wagmi/chains
const customChains = {
  monad: defineChain({
    id: 143,
    name: 'Monad',
    nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://testnet-rpc.monad.xyz'] },
    },
    blockExplorers: {
      default: { name: 'Monad Testnet Explorer', url: 'https://testnet-explorer.monad.xyz' },
    },
    testnet: true,
  }),
}

const chainStr = process.env.PUBLIC_EVM ?? 'mainnet'
const chain = chains[chainStr] || customChains[chainStr]
if (!chain) throw new Error(`invalid chain name: ${chainStr}. Available: ${Object.keys(chains).join(', ')}, ${Object.keys(customChains).join(', ')}`)

const transports = {
  [chain.id]: http(),
}

export const Providers = ({ children }) => (
  <WagmiProvider
    config={createConfig({
      chains: [chain],
      transports,
      connectors: [injected()],
      multiInjectedProviderDiscovery: false,
      // CRITICAL: Disable storage to prevent auto-reconnect
      storage: null,
      // Also explicitly disable persistance
      ssr: true,
    })}
  >
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
import { useConfig, useAccount } from 'wagmi'
import * as utils from 'viem/utils'
import { erc20Abi } from 'viem'

import { useConnect, useConnectors } from 'wagmi'
import { useState, useEffect } from 'react'

function Logic({ world }) {
  const config = useConfig()
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

  // useEffect(() => {
  //   const handlePlayer = player => {
  //     // console.log({ player, address })
  //     world.entities.player.modify({ evm: address })
  //     world.off('player', handlePlayer)
  //   }
  //   world.on('player', handlePlayer)

  //   if (!world.entities?.player) return
  //   world.entities.player.modify({ evm: address })

  //   return () => {
  //     world.off(handlePlayer)
  //   }
  // }, [address, world.entities?.player])

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
    }

    let actions = {}

    // for (const [action, fn] of Object.entries(evmActions)) {
    //   actions[action] = (...args) => fn(config, ...args)
    // }
    const abis = {
      erc20: erc20Abi,
      erc721: null,
    }

    // console.log('[EVM] Calling world.evm.bind()...')

    world.evm.bind({
      connectors,
      connect,
      disconnect,
      address,
      actions: evmActions,
      abis,
      config,
      isConnected,
      isConnecting,
    })

    // console.log('[EVM] world.evm.bind() called successfully')
    // console.log('[EVM] world.evm.connection:', world.evm.connection)
  }, [isConnected, isConnecting, address])

  return null
}
