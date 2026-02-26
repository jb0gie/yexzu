import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { monad } from '@reown/appkit/networks'

const queryClient = new QueryClient()

// Reown AppKit Project ID - required for mobile wallet connections
// Get one free at: https://cloud.reown.com (formerly cloud.walletconnect.com)
const projectId = typeof env !== 'undefined' && env.PUBLIC_REOWN_PROJECT_ID
  ? env.PUBLIC_REOWN_PROJECT_ID
  : typeof env !== 'undefined' && env.PUBLIC_WALLETCONNECT_PROJECT_ID
    ? env.PUBLIC_WALLETCONNECT_PROJECT_ID
    : ''

// Network configuration - Monad mainnet
const networks = [monad]

// Create Wagmi adapter with AppKit
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
})

// Initialize AppKit if project ID is available
if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata: {
      name: 'Hyperfy',
      description: 'Hyperfy Virtual World',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://hyperfy.xyz',
      icons: [],
    },
  })
}

export const Providers = ({ children }) => (
  <WagmiProvider config={wagmiAdapter.wagmiConfig}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </WagmiProvider>
)

export function EVM({ world }) {
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
import { useConfig, useAccount, useChainId, useConnect, useConnectors, useDisconnect } from 'wagmi'
import { erc20Abi } from 'viem'

import { useState, useEffect } from 'react'

function Logic({ world }) {
  const config = useConfig()
  const chainId = useChainId()
  const { address, isConnected, isConnecting, isReconnecting, isDisconnected } = useAccount()
  const [initialized, setInitialized] = useState(false)

  // Set player.evm when wallet connects/disconnects
  useEffect(() => {
    if (world.entities?.player) {
      world.entities.player.modify({ evm: address || null })
    }
  }, [address, world.entities?.player])

  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    // Store latest data for EVMClient to access
    if (world.evm._reactData) {
      world.evm._reactData.address = address
      world.evm._reactData.isConnected = isConnected
      world.evm._reactData.isConnecting = isConnecting
      world.evm._reactData.chainId = chainId
    }

    const actions = {}

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
