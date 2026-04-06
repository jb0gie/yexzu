import { useState, useEffect, useCallback } from 'react'

/**
 * QUAI Component
 *
 * Handles Quai Network wallet integration via Pelagus.
 * Unlike EVM chains, Quai uses a unique sharded architecture
 * and requires Pelagus wallet (MetaMask doesn't support Quai).
 */
export function QUAI({ world }) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState(null)
  const [shard, setShard] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [isPelagusInstalled, setIsPelagusInstalled] = useState(false)

  // Check if Pelagus is installed
  useEffect(() => {
    const checkPelagus = () => {
      const installed = typeof window !== 'undefined' && !!window.pelagus
      setIsPelagusInstalled(installed)
      return installed
    }

    checkPelagus()

    // Pelagus might inject after page load
    window.addEventListener('load', checkPelagus)
    return () => window.removeEventListener('load', checkPelagus)
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

  // Connect function
  const connect = useCallback(async () => {
    if (!window.pelagus) {
      return {
        success: false,
        reason: 'pelagus_not_installed',
        message: 'Please install Pelagus wallet from pelaguswallet.io'
      }
    }

    try {
      const accounts = await window.pelagus.request({
        method: 'quai_requestAccounts'
      })

      if (accounts && accounts.length > 0) {
        setAddress(accounts[0])
        setIsConnected(true)
        updateShard(accounts[0])

        const chainId = await window.pelagus.request({ method: 'quai_chainId' })
        setChainId(chainId)

        return {
          success: true,
          address: accounts[0],
          chainId
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
      isPelagusInstalled: () => isPelagusInstalled,
      _reactData: {
        isConnected,
        address,
        shard,
        chainId,
        isPelagusInstalled
      }
    }
  }, [world, connect, disconnect, isConnected, address, shard, chainId, isPelagusInstalled, signMessage, sendTransaction, getBalance])

  // Component doesn't render anything visible
  return null
}
