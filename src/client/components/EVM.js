import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit, useAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import {
  // Ethereum L1
  mainnet,
  sepolia,
  holesky,
  // L2s
  arbitrum,
  arbitrumSepolia,
  arbitrumNova,
  base,
  baseSepolia,
  optimism,
  optimismSepolia,
  // Alt L1s
  polygon,
  polygonMumbai,
  avalanche,
  avalancheFuji,
  bsc,
  bscTestnet,
  fantom,
  fantomTestnet,
  gnosis,
  cronos,
  klaytn,
  // Monad
  monad,
  // Others
  scroll,
  scrollSepolia,
  blast,
  blastSepolia,
  zkSync,
  linea,
  lineaSepolia,
  mantle,
  celo,
  celoAlfajores,
  aurora,
  harmonyOne,
  moonbeam,
  moonriver,
  telos,
  fuse,
  meter,
  theta,
  oasys,
  hedera,
  hederaTestnet,
} from '@reown/appkit/networks'

const queryClient = new QueryClient()

// Reown AppKit Project ID - required for mobile wallet connections
// Get one free at: https://cloud.reown.com (formerly cloud.walletconnect.com)
const projectId = typeof env !== 'undefined' && env.PUBLIC_REOWN_PROJECT_ID
  ? env.PUBLIC_REOWN_PROJECT_ID
  : typeof env !== 'undefined' && env.PUBLIC_WALLETCONNECT_PROJECT_ID
    ? env.PUBLIC_WALLETCONNECT_PROJECT_ID
    : ''

// Network configuration - supports all major EVM networks
const networks = [
  // Ethereum L1
  mainnet,
  sepolia,
  holesky,
  // L2s
  arbitrum,
  arbitrumSepolia,
  arbitrumNova,
  base,
  baseSepolia,
  optimism,
  optimismSepolia,
  // Alt L1s
  polygon,
  polygonMumbai,
  avalanche,
  avalancheFuji,
  bsc,
  bscTestnet,
  fantom,
  fantomTestnet,
  gnosis,
  cronos,
  klaytn,
  // Monad
  monad,
  // Others
  scroll,
  scrollSepolia,
  blast,
  blastSepolia,
  zkSync,
  linea,
  lineaSepolia,
  mantle,
  celo,
  celoAlfajores,
  aurora,
  harmonyOne,
  moonbeam,
  moonriver,
  telos,
  fuse,
  meter,
  theta,
  oasys,
  hedera,
  hederaTestnet,
]

// Create Wagmi adapter with AppKit
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
  // Disable persistence to prevent auto-reconnect
  storage: null,
})

// Initialize AppKit if project ID is available
// Note: Add featuredWalletIds to prioritize specific wallets on the main view
// Find wallet IDs at: https://walletguide.walletconnect.network/
if (projectId && projectId.length >= 32) {
  console.log('[EVM] Initializing AppKit with projectId:', projectId.substring(0, 8) + '...')
  try {
    createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata: {
      name: 'Hyperfy',
      description: 'Hyperfy Virtual World',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://hyperfy.xyz',
      icons: ['https://avatars.githubusercontent.com/u/12345678'],
    },
    themeMode: 'dark',
    features: {
      analytics: false,
      swaps: false,
      onramp: false,
      email: false,
      // Disable auto-connect on page load
      connectMethodsOrder: ['wallet', 'email', 'social'],
    },
    // Prevent auto-opening the modal
    defaultAccountTypes: {
      eip155: 'EOA',
    },
    })
    console.log('[EVM] AppKit initialized successfully')
  } catch (err) {
    console.error('[EVM] Failed to initialize AppKit:', err)
  }
} else {
  console.warn('[EVM] No valid projectId found, AppKit disabled')
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

import { useState, useEffect, useCallback } from 'react'

function Logic({ world }) {
  const config = useConfig()
  const chainId = useChainId()
  const { address, isConnected, isConnecting, isReconnecting, isDisconnected } = useAccount()
  const { open, close } = useAppKit()
  const [initialized, setInitialized] = useState(false)
  const [hasAttemptedReconnect, setHasAttemptedReconnect] = useState(false)

  // Prevent auto-reconnect from opening the modal
  useEffect(() => {
    // Close any auto-opened modal on first mount
    if (!initialized) {
      setInitialized(true)
      // Close modal if it was auto-opened by reconnect
      if (isReconnecting) {
        console.log('[EVM] Preventing auto-reconnect modal...')
        close()
      }
    }
  }, [initialized, isReconnecting, close])

  // Track reconnection attempts
  useEffect(() => {
    if (isReconnecting && !hasAttemptedReconnect) {
      setHasAttemptedReconnect(true)
      // Close the modal that was auto-opened
      setTimeout(() => close(), 100)
    }
  }, [isReconnecting, hasAttemptedReconnect, close])

  // Set player.evm when wallet connects/disconnects
  useEffect(() => {
    if (world.entities?.player) {
      world.entities.player.modify({ evm: address || null })
    }
  }, [address, world.entities?.player])

  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  // Wrap connect to open AppKit modal
  const appKitConnect = useCallback(async (options = {}) => {
    console.log('[EVM] Opening AppKit modal...')
    try {
      // Open AppKit modal - this handles wallet selection
      // Using open() is the recommended way for AppKit
      open({ view: 'Connect' })
      // Return success immediately - AppKit handles the connection flow
      return { success: true }
    } catch (error) {
      console.error('[EVM] Failed to open AppKit:', error)
      return { success: false, error: error.message }
    }
  }, [open])

  // Wrap disconnect to use AppKit
  const appKitDisconnect = useCallback(async () => {
    console.log('[EVM] Disconnecting via AppKit...')
    try {
      await disconnect()
      return { success: true }
    } catch (error) {
      console.error('[EVM] Disconnect failed:', error)
      return { success: false, error: error.message }
    }
  }, [disconnect])

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
      connect: appKitConnect,
      disconnect: appKitDisconnect,
      wagmiConnect: connect,
      wagmiDisconnect: disconnect,
      address,
      chainId,
      actions: evmActions,
      abis,
      config,
      isConnected,
      isConnecting,
      appKit: { open },
    })
  }, [isConnected, isConnecting, address, chainId, appKitConnect, appKitDisconnect, open])

  return null
}
