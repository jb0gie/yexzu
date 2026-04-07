import { useState, useEffect, useCallback } from 'react'

/**
 * QUAI Component
 *
 * Handles Quai Network wallet integration via Pelagus or Tangem.
 * Unlike EVM chains, Quai uses a unique sharded architecture
 * and requires Pelagus wallet or Tangem hardware wallet.
 *
 * Supported wallets:
 * - Pelagus (browser extension)
 * - Tangem (hardware wallet via web extension)
 */
export function QUAI({ world }) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState(null)
  const [shard, setShard] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [walletType, setWalletType] = useState(null) // 'pelagus' | 'tangem' | null
  const [isPelagusInstalled, setIsPelagusInstalled] = useState(false)
  const [isTangemInstalled, setIsTangemInstalled] = useState(false)

  // Check if wallets are installed
  useEffect(() => {
    const checkWallets = () => {
      // Check Pelagus
      const pelagusInstalled = typeof window !== 'undefined' && !!window.pelagus
      setIsPelagusInstalled(pelagusInstalled)

      // Check Tangem (via window.tangem or window.ethereum with Tangem provider)
      const tangemInstalled = typeof window !== 'undefined' && (
        !!window.tangem ||
        (window.ethereum?.isTangem) ||
        (window.ethereum?.providers?.some(p => p.isTangem))
      )
      setIsTangemInstalled(tangemInstalled)

      return { pelagusInstalled, tangemInstalled }
    }

    checkWallets()

    // Wallets might inject after page load
    window.addEventListener('load', checkWallets)
    return () => window.removeEventListener('load', checkWallets)
  }, [])

  // Listen for account changes
  useEffect(() => {
    if (!window.pelagus || !world) return

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // User disconnected
        setIsConnected(false)
        setAddress(null)
        setShard(null)
        if (world.entities?.player) {
          world.entities.player.modify({ quai: null })
        }
      } else {
        setAddress(accounts[0])
        setIsConnected(true)
        updateShard(accounts[0])
        if (world.entities?.player) {
          world.entities.player.modify({ quai: accounts[0] })
        }
      }
    }

    const handleChainChanged = (newChainId) => {
      setChainId(newChainId)
    }

    // Subscribe to events
    if (window.pelagus.on) {
      window.pelagus.on('accountsChanged', handleAccountsChanged)
      window.pelagus.on('chainChanged', handleChainChanged)
    }

    // Check existing connection (safely)
    try {
      window.pelagus.request({ method: 'quai_accounts' })
        .then(accounts => {
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0])
            setIsConnected(true)
            updateShard(accounts[0])
            if (world?.entities?.player) {
              world.entities.player.modify({ quai: accounts[0] })
            }
          }
        })
        .catch(err => {
          // Silently ignore - Pelagus may not be ready
          console.log('[QUAI] No existing connection')
        })
    } catch (err) {
      // Silently ignore
    }

    return () => {
      if (window.pelagus.removeListener) {
        window.pelagus.removeListener('accountsChanged', handleAccountsChanged)
        window.pelagus.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [world])

  // Determine shard from address
  const updateShard = useCallback((addr) => {
    if (!addr || addr.length < 4) {
      setShard(null)
      return
    }

    const shardPrefix = addr.slice(2, 4)
    const zoneMap = {
      '00': { prime: 'prime-0', region: 'cyprus', zone: 'zone-0-0', name: 'Cyprus-1' },
      '01': { prime: 'prime-0', region: 'cyprus', zone: 'zone-0-1', name: 'Cyprus-2' },
      '02': { prime: 'prime-0', region: 'cyprus', zone: 'zone-0-2', name: 'Cyprus-3' },
      '10': { prime: 'prime-1', region: 'paxos', zone: 'zone-1-0', name: 'Paxos-1' },
      '11': { prime: 'prime-1', region: 'paxos', zone: 'zone-1-1', name: 'Paxos-2' },
      '12': { prime: 'prime-1', region: 'paxos', zone: 'zone-1-2', name: 'Paxos-3' },
      '20': { prime: 'prime-2', region: 'hydra', zone: 'zone-2-0', name: 'Hydra-1' },
      '21': { prime: 'prime-2', region: 'hydra', zone: 'zone-2-1', name: 'Hydra-2' },
      '22': { prime: 'prime-2', region: 'hydra', zone: 'zone-2-2', name: 'Hydra-3' },
    }

    setShard(zoneMap[shardPrefix] || { name: 'Unknown', zone: 'unknown' })
  }, [])

  // Connect function with multi-wallet support
  const connect = useCallback(async (preferredWallet = null) => {
    // Try preferred wallet first, then fall back to any available
    let provider = null
    let detectedWallet = null

    if (preferredWallet === 'pelagus' || (!preferredWallet && window.pelagus)) {
      provider = window.pelagus
      detectedWallet = 'pelagus'
    } else if (preferredWallet === 'tangem' || (!preferredWallet && window.tangem)) {
      provider = window.tangem
      detectedWallet = 'tangem'
    } else if (window.ethereum?.isTangem) {
      provider = window.ethereum
      detectedWallet = 'tangem'
    }

    if (!provider) {
      return {
        success: false,
        reason: 'no_wallet_installed',
        message: 'Please install Pelagus (pelaguswallet.io) or Tangem wallet'
      }
    }

    try {
      // Both wallets use the same Quai JSON-RPC interface
      const accounts = await provider.request({
        method: 'quai_requestAccounts'
      })

      if (accounts && accounts.length > 0) {
        setAddress(accounts[0])
        setIsConnected(true)
        setWalletType(detectedWallet)
        updateShard(accounts[0])

        const chainId = await provider.request({ method: 'quai_chainId' })
        setChainId(chainId)

        return {
          success: true,
          address: accounts[0],
          chainId,
          walletType: detectedWallet
        }
      }

      return { success: false, reason: 'no_accounts' }
    } catch (error) {
      console.error('[QUAI] Connection error:', error)
      return {
        success: false,
        reason: 'user_rejected',
        error: error.message
      }
    }
  }, [updateShard])

  // Disconnect function
  const disconnect = useCallback(async () => {
    // Pelagus doesn't have explicit disconnect
    // Just clear our state
    setIsConnected(false)
    setAddress(null)
    setShard(null)

    if (world?.entities?.player) {
      world.entities.player.modify({ quai: null })
    }

    return { success: true }
  }, [world])

  // Sign message
  const signMessage = useCallback(async (message) => {
    if (!window.pelagus || !address) {
      return { success: false, reason: 'not_connected' }
    }

    try {
      const signature = await window.pelagus.request({
        method: 'quai_sign',
        params: [address, message]
      })

      return { success: true, signature }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }, [address])

  // Send transaction
  const sendTransaction = useCallback(async (tx) => {
    if (!window.pelagus || !address) {
      return { success: false, reason: 'not_connected' }
    }

    try {
      const txHash = await window.pelagus.request({
        method: 'quai_sendTransaction',
        params: [{
          from: address,
          to: tx.to,
          value: tx.value,
          data: tx.data,
          gasLimit: tx.gasLimit,
          gasPrice: tx.gasPrice,
        }]
      })

      return { success: true, txHash }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }, [address])

  // Get balance
  const getBalance = useCallback(async (addr = address) => {
    if (!window.pelagus || !addr) {
      return { success: false, reason: 'no_address' }
    }

    try {
      const balance = await window.pelagus.request({
        method: 'quai_getBalance',
        params: [addr, 'latest']
      })

      return {
        success: true,
        balance,
        formatted: formatBalance(balance)
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }, [address])

  // Format balance helper
  const formatBalance = (wei) => {
    if (!wei) return '0'
    const quai = Number(wei) / 1e18
    return quai.toFixed(6)
  }

  // Bind to world.quai API
  useEffect(() => {
    if (!world) return

    world.quai = {
      connect,
      disconnect,
      isConnected: () => isConnected,
      getAddress: () => address,
      getShard: () => shard,
      signMessage,
      sendTransaction,
      getBalance,
      // Wallet detection
      isPelagusInstalled: () => isPelagusInstalled,
      isTangemInstalled: () => isTangemInstalled,
      getWalletType: () => walletType,
      // Multi-wallet connect
      connectPelagus: () => connect('pelagus'),
      connectTangem: () => connect('tangem'),
      _reactData: {
        isConnected,
        address,
        shard,
        chainId,
        walletType,
        isPelagusInstalled,
        isTangemInstalled
      }
    }
  }, [world, connect, disconnect, isConnected, address, shard, chainId, walletType, isPelagusInstalled, isTangemInstalled, signMessage, sendTransaction, getBalance])

  // Component doesn't render anything visible
  return null
}
