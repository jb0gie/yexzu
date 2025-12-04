import { createConfig, http, injected, useDisconnect, WagmiProvider } from 'wagmi'
import * as chains from 'wagmi/chains'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient()

const chainStr = process.env.PUBLIC_EVM ?? 'mainnet'
const chain = chains[chainStr]
if (!chain) throw new Error('invalid chain name')

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
    })}
  >
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </WagmiProvider>
)

export function EVM({ world }) {
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

  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    if (initialized) return
    if (!world.systems?.evm) {
      console.warn('[EVM] EVM system not available')
      return
    }
    setInitialized(true)

    let actions = {}
    for (const [action, fn] of Object.entries(evmActions)) {
      actions[action] = (...args) => fn(config, ...args)
    }

    try {
      world.systems.evm.bind({
        actions,
        utils,
        abis: { erc20: erc20Abi, erc721: null },
        config,
        address,
        isConnected,
        isConnecting: isConnecting || isReconnecting,
        isDisconnected,
        connect: connect || (() => {}),
        disconnect: disconnect || (() => {}),
        connectors: connectors || [],
      })
    } catch (error) {
      console.error('[EVM] Failed to bind EVM system:', error)
    }
  }, [config, initialized])

  useEffect(() => {
    if (!world.systems?.evm) return

    try {
      world.systems.evm.address = address
      world.systems.evm.isConnected = isConnected
      world.systems.evm.isConnecting = isConnecting || isReconnecting
      world.systems.evm.isDisconnected = isDisconnected
    } catch (error) {
      console.error('[EVM] Failed to update EVM state:', error)
    }
  }, [address, isConnected, isConnecting, isReconnecting, isDisconnected, world.systems])

  return null
}
