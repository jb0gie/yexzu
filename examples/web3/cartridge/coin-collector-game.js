/**
 * Blockchain Coin Collector Game
 *
 * A complete Web3-enabled game demonstrating:
 * - 3D coin collection mechanics
 * - Wallet integration
 * - On-chain reward claiming
 * - Client-server synchronization
 * - Session policies for gasless transactions
 * - Leaderboard system
 *
 * Players collect coins in the 3D world, then mint them as rewards on-chain.
 */

// Configuration
app.configure([
  {
    type: 'section',
    key: 'contract',
    label: 'Smart Contract',
  },
  {
    key: 'rewardContract',
    type: 'text',
    label: 'Reward Contract Address',
    placeholder: '0x...',
    initial: '',
  },
  {
    type: 'section',
    key: 'gameplay',
    label: 'Gameplay Settings',
  },
  {
    key: 'coinValue',
    type: 'number',
    label: 'Coins per Reward',
    initial: 10,
    min: 1,
    max: 100,
  },
  {
    key: 'spawnRadius',
    type: 'number',
    label: 'Spawn Radius',
    initial: 20,
    min: 5,
    max: 50,
  },
  {
    key: 'maxCoins',
    type: 'number',
    label: 'Max Active Coins',
    initial: 15,
    min: 5,
    max: 50,
  },
  {
    type: 'section',
    key: 'visual',
    label: 'Visual Settings',
  },
  {
    key: 'coinColor',
    type: 'color',
    label: 'Coin Color',
    value: '#FFD700',
  },
])

// =============================================================================
// SERVER SIDE - Game State Management
// =============================================================================
if (world.isServer) {
  // Initialize game state
  if (!app.state.initialized) {
    app.state = {
      initialized: true,
      players: {}, // Player stats
      activeCoins: [], // Active coins in world
      nextCoinId: 0,
      leaderboard: [], // Top players
      totalCoinsCollected: 0,
    }
  }

  const COIN_LIFETIME = 30000 // 30 seconds before despawn

  // Spawn initial coins
  function spawnCoins(count) {
    const radius = props.spawnRadius || 20
    const maxCoins = props.maxCoins || 15

    for (let i = 0; i < count; i++) {
      if (app.state.activeCoins.length >= maxCoins) break

      const angle = num(0, Math.PI * 2, 2)
      const distance = num(5, radius, 2)
      const x = Math.cos(angle) * distance
      const z = Math.sin(angle) * distance
      const y = num(1, 3, 2)

      const coin = {
        id: app.state.nextCoinId++,
        position: [x, y, z],
        rotation: [0, angle, 0],
        spawnTime: world.getTime(),
      }

      app.state.activeCoins.push(coin)
      app.send('coinSpawned', coin)
    }
  }

  // Initialize player data
  function initPlayer(playerId) {
    if (!app.state.players[playerId]) {
      app.state.players[playerId] = {
        id: playerId,
        coinsCollected: 0,
        rewardsClaimed: 0,
        lastClaimTime: 0,
      }
    }
  }

  // Handle coin collection
  app.on('coinCollected', (data, networkId) => {
    const player = world.getPlayer(networkId)
    if (!player) return

    // Verify coin exists
    const coinIndex = app.state.activeCoins.findIndex(c => c.id === data.coinId)
    if (coinIndex === -1) return

    // Remove coin from active list
    const coin = app.state.activeCoins[coinIndex]
    app.state.activeCoins.splice(coinIndex, 1)

    // Update player stats
    initPlayer(player.id)
    app.state.players[player.id].coinsCollected++
    app.state.totalCoinsCollected++

    // Broadcast collection
    app.send('coinCollectionConfirmed', {
      playerId: player.id,
      playerName: player.name,
      coinId: coin.id,
      totalCoins: app.state.players[player.id].coinsCollected,
    })

    // Spawn new coin
    spawnCoins(1)

    console.log(
      `[Server] ${player.name} collected coin ${coin.id}. Total: ${app.state.players[player.id].coinsCollected}`
    )
  })

  // Handle reward claim
  app.on('rewardClaimed', (data, networkId) => {
    const player = world.getPlayer(networkId)
    if (!player) return

    initPlayer(player.id)

    // Update stats
    const playerData = app.state.players[player.id]
    const coinsUsed = props.coinValue || 10

    if (playerData.coinsCollected >= coinsUsed) {
      playerData.coinsCollected -= coinsUsed
      playerData.rewardsClaimed++
      playerData.lastClaimTime = world.getTime()

      // Update leaderboard
      updateLeaderboard()

      // Broadcast
      app.send('rewardClaimConfirmed', {
        playerId: player.id,
        playerName: player.name,
        txHash: data.txHash,
        rewardsClaimed: playerData.rewardsClaimed,
        coinsRemaining: playerData.coinsCollected,
      })

      console.log(`[Server] ${player.name} claimed reward! TX: ${data.txHash}`)
    }
  })

  // Update leaderboard
  function updateLeaderboard() {
    app.state.leaderboard = Object.values(app.state.players)
      .filter(p => p.rewardsClaimed > 0)
      .sort((a, b) => b.rewardsClaimed - a.rewardsClaimed)
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        rewardsClaimed: p.rewardsClaimed,
      }))
  }

  // Send player data on request
  app.on('requestPlayerData', (data, networkId) => {
    const player = world.getPlayer(networkId)
    if (!player) return

    initPlayer(player.id)

    app.sendTo(networkId, 'playerData', {
      ...app.state.players[player.id],
    })
  })

  // Cleanup old coins
  app.on('update', () => {
    const now = world.getTime()
    const expired = []

    app.state.activeCoins = app.state.activeCoins.filter(coin => {
      if (now - coin.spawnTime > COIN_LIFETIME) {
        expired.push(coin.id)
        return false
      }
      return true
    })

    // Respawn coins that despawned
    if (expired.length > 0) {
      expired.forEach(id => {
        app.send('coinDespawned', { coinId: id })
      })
      spawnCoins(expired.length)
    }
  })

  // Spawn initial coins
  spawnCoins(props.maxCoins || 15)

  console.log('[Server] Coin Collector game initialized')
}

// =============================================================================
// CLIENT SIDE - Game UI and Interaction
// =============================================================================
if (world.isClient) {
  // State
  let walletConnected = false
  let playerCoins = 0
  let rewardsClaimed = 0
  let isClaiming = false
  const coins = new Map() // coinId -> coin object

  // Colors
  const COLOR_PRIMARY = '#FFD700'
  const COLOR_SUCCESS = '#00ff00'
  const COLOR_WARNING = '#ffaa00'
  const COLOR_ERROR = '#ff0000'
  const COLOR_TEXT = '#ffffff'
  const COLOR_BG = 'rgba(0, 15, 30, 0.9)'
  const COLOR_BG_DARK = 'rgba(0, 0, 0, 0.5)'

  // =============================================================================
  // 3D COINS
  // =============================================================================

  // Create coin mesh
  function createCoin(coinData) {
    const group = app.create('group')
    group.position.fromArray(coinData.position)
    group.rotation.fromArray(coinData.rotation)

    // Coin geometry (simple cylinder for now)
    const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16)
    const material = new THREE.MeshStandardMaterial({
      color: props.coinColor || COLOR_PRIMARY,
      metalness: 0.8,
      roughness: 0.2,
      emissive: props.coinColor || COLOR_PRIMARY,
      emissiveIntensity: 0.5,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = Math.PI / 2
    mesh.castShadow = true

    // Add to scene
    const threeGroup = new THREE.Group()
    threeGroup.add(mesh)
    group.add(threeGroup)
    world.add(group)

    // Animate
    const startY = coinData.position[1]
    let time = 0

    const updateCoin = delta => {
      time += delta

      // Float animation
      const floatOffset = Math.sin(time * 2) * 0.2
      group.position.y = startY + floatOffset

      // Spin animation
      group.rotation.y += delta * 2

      // Scale pulse
      const scale = 1 + Math.sin(time * 3) * 0.1
      mesh.scale.set(scale, scale, scale)
    }

    return { group, mesh, update: updateCoin, geometry, material }
  }

  // Spawn coin
  function spawnCoin(coinData) {
    if (coins.has(coinData.id)) return

    const coin = createCoin(coinData)
    coins.set(coinData.id, coin)
  }

  // Remove coin
  function removeCoin(coinId) {
    const coin = coins.get(coinId)
    if (!coin) return

    // Cleanup
    world.remove(coin.group)
    coin.geometry.dispose()
    coin.material.dispose()
    coins.delete(coinId)
  }

  // Collect coin (collision check)
  function checkCoinCollection() {
    const player = world.getPlayer()
    if (!player) return

    const playerPos = player.position
    const collectRadius = 1.5

    coins.forEach((coin, coinId) => {
      const coinPos = coin.group.position
      const dx = playerPos.x - coinPos.x
      const dy = playerPos.y - coinPos.y
      const dz = playerPos.z - coinPos.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (distance < collectRadius) {
        collectCoin(coinId)
      }
    })
  }

  // Collect coin
  function collectCoin(coinId) {
    // Send to server
    app.send('coinCollected', { coinId })

    // Remove immediately for responsive feel
    removeCoin(coinId)

    // Show feedback
    showCollectionFeedback()
  }

  // =============================================================================
  // UI SYSTEM
  // =============================================================================

  // Main UI
  const ui = app.create('ui')
  ui.width = 500
  ui.height = 600
  ui.backgroundColor = COLOR_BG
  ui.borderRadius = 20
  ui.padding = 20
  ui.billboard = 'full'
  ui.pivot = 'top-right'
  ui.justifyContent = 'flex-start'
  ui.alignItems = 'stretch'
  ui.gap = 12
  ui.position.set(8, 2, 0)
  app.add(ui)

  // Title
  const title = app.create('uitext')
  title.value = '💰 COIN COLLECTOR'
  title.color = COLOR_PRIMARY
  title.fontSize = 28
  title.fontWeight = 'bold'
  title.textAlign = 'center'
  ui.add(title)

  // Stats Panel
  const statsPanel = app.create('uiview')
  statsPanel.backgroundColor = COLOR_BG_DARK
  statsPanel.borderRadius = 12
  statsPanel.padding = 15
  statsPanel.gap = 8
  ui.add(statsPanel)

  const coinsText = app.create('uitext')
  coinsText.value = '🪙 Coins: 0'
  coinsText.color = COLOR_TEXT
  coinsText.fontSize = 20
  coinsText.fontWeight = 'bold'
  statsPanel.add(coinsText)

  const rewardsText = app.create('uitext')
  rewardsText.value = '🏆 Rewards Claimed: 0'
  rewardsText.color = COLOR_TEXT
  rewardsText.fontSize = 16
  statsPanel.add(rewardsText)

  const progressText = app.create('uitext')
  progressText.value = 'Collect 10 coins to claim a reward!'
  progressText.color = COLOR_WARNING
  progressText.fontSize = 14
  statsPanel.add(progressText)

  // Wallet Status
  const walletStatus = app.create('uitext')
  walletStatus.value = '🔒 Wallet: Not Connected'
  walletStatus.color = COLOR_ERROR
  walletStatus.fontSize = 14
  walletStatus.backgroundColor = COLOR_BG_DARK
  walletStatus.padding = 10
  walletStatus.borderRadius = 8
  walletStatus.textAlign = 'center'
  ui.add(walletStatus)

  // Connect Button
  const connectBtn = createButton('[ CONNECT WALLET ]', COLOR_PRIMARY)
  connectBtn.onPointerUp = async () => {
    await handleConnect()
  }
  ui.add(connectBtn)

  // Claim Button
  const claimBtn = createButton('[ CLAIM REWARD ON-CHAIN ]', COLOR_SUCCESS)
  claimBtn.active = false
  claimBtn.onPointerUp = async () => {
    await handleClaim()
  }
  ui.add(claimBtn)

  // Status Message
  const statusMsg = app.create('uitext')
  statusMsg.value = 'Collect coins to earn rewards!'
  statusMsg.color = COLOR_TEXT
  statusMsg.fontSize = 14
  statusMsg.textAlign = 'center'
  statusMsg.backgroundColor = COLOR_BG_DARK
  statusMsg.padding = 10
  statusMsg.borderRadius = 8
  ui.add(statusMsg)

  // Instructions
  const instructions = app.create('uitext')
  instructions.value = '🎮 Walk near coins to collect them\n⛓️ Claim rewards on StarkNet blockchain'
  instructions.color = '#888888'
  instructions.fontSize = 12
  instructions.textAlign = 'center'
  instructions.lineHeight = 1.5
  ui.add(instructions)

  // =============================================================================
  // UI HELPERS
  // =============================================================================

  function createButton(text, color) {
    const btn = app.create('uitext')
    btn.value = text
    btn.color = color
    btn.fontSize = 18
    btn.fontWeight = 'bold'
    btn.backgroundColor = COLOR_BG_DARK
    btn.padding = 15
    btn.borderRadius = 10
    btn.textAlign = 'center'

    btn.onPointerOver = () => {
      btn.backgroundColor = 'rgba(0, 50, 100, 0.8)'
    }

    btn.onPointerOut = () => {
      btn.backgroundColor = COLOR_BG_DARK
    }

    btn.onPointerDown = () => {
      btn.color = COLOR_TEXT
    }

    return btn
  }

  function updateUI() {
    // Update stats
    coinsText.value = `🪙 Coins: ${playerCoins}`
    rewardsText.value = `🏆 Rewards Claimed: ${rewardsClaimed}`

    // Update progress
    const needed = props.coinValue || 10
    if (playerCoins >= needed) {
      progressText.value = `Ready to claim! (${playerCoins}/${needed})`
      progressText.color = COLOR_SUCCESS
      claimBtn.active = walletConnected
    } else {
      progressText.value = `Collect ${needed - playerCoins} more coins (${playerCoins}/${needed})`
      progressText.color = COLOR_WARNING
      claimBtn.active = false
    }

    // Update wallet status
    if (walletConnected) {
      const addr = world.web3.getAddress()
      const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`
      walletStatus.value = `🔓 Wallet: ${shortAddr}`
      walletStatus.color = COLOR_SUCCESS
      connectBtn.active = false
    } else {
      walletStatus.value = '🔒 Wallet: Not Connected'
      walletStatus.color = COLOR_ERROR
      connectBtn.active = true
      claimBtn.active = false
    }
  }

  function showCollectionFeedback() {
    // Flash effect
    statusMsg.value = '✨ Coin Collected!'
    statusMsg.color = COLOR_SUCCESS

    setTimeout(() => {
      statusMsg.value = 'Keep collecting!'
      statusMsg.color = COLOR_TEXT
    }, 1500)
  }

  // =============================================================================
  // WALLET INTEGRATION
  // =============================================================================

  async function handleConnect() {
    try {
      statusMsg.value = 'Connecting wallet...'
      statusMsg.color = COLOR_WARNING

      await world.web3.connect()
      walletConnected = true

      statusMsg.value = 'Wallet connected! Start collecting!'
      statusMsg.color = COLOR_SUCCESS
      world.chat('Wallet connected successfully!', true)

      updateUI()
    } catch (error) {
      console.error('Connection failed:', error)
      statusMsg.value = 'Connection failed'
      statusMsg.color = COLOR_ERROR
      world.chat('Failed to connect wallet', true)
    }
  }

  async function handleClaim() {
    if (!walletConnected) {
      statusMsg.value = 'Connect wallet first!'
      statusMsg.color = COLOR_ERROR
      return
    }

    const needed = props.coinValue || 10
    if (playerCoins < needed) {
      statusMsg.value = `Need ${needed - playerCoins} more coins!`
      statusMsg.color = COLOR_WARNING
      return
    }

    if (!props.rewardContract) {
      statusMsg.value = 'Configure contract in inspector'
      statusMsg.color = COLOR_ERROR
      return
    }

    isClaiming = true
    claimBtn.color = '#666666'
    statusMsg.value = 'Claiming reward on-chain...'
    statusMsg.color = COLOR_WARNING

    try {
      // Execute blockchain transaction
      const call = {
        contractAddress: props.rewardContract,
        entrypoint: 'claim_reward',
        calldata: [1], // Claim 1 reward
      }

      const result = await world.web3.execute(call)

      // Update local state
      playerCoins -= needed
      rewardsClaimed++

      // Notify server
      app.send('rewardClaimed', {
        txHash: result.transaction_hash,
      })

      statusMsg.value = '🎉 Reward claimed on blockchain!'
      statusMsg.color = COLOR_SUCCESS
      world.chat('Reward claimed successfully!', true)

      updateUI()
    } catch (error) {
      console.error('Claim failed:', error)
      statusMsg.value = `Claim failed: ${error.message}`
      statusMsg.color = COLOR_ERROR
    } finally {
      isClaiming = false
      claimBtn.color = COLOR_SUCCESS
    }
  }

  // =============================================================================
  // GAME LOOP
  // =============================================================================

  app.on('update', delta => {
    // Update coin animations
    coins.forEach(coin => {
      coin.update(delta)
    })

    // Check for coin collection
    checkCoinCollection()
  })

  // =============================================================================
  // NETWORK EVENTS
  // =============================================================================

  // Coin spawned
  app.on('coinSpawned', data => {
    spawnCoin(data)
  })

  // Coin despawned
  app.on('coinDespawned', data => {
    removeCoin(data.coinId)
  })

  // Collection confirmed by server
  app.on('coinCollectionConfirmed', data => {
    if (world.getPlayer()?.id === data.playerId) {
      playerCoins = data.totalCoins
      updateUI()
    }

    world.chat(`${data.playerName} collected a coin! Total: ${data.totalCoins}`, true)
  })

  // Reward claim confirmed
  app.on('rewardClaimConfirmed', data => {
    if (world.getPlayer()?.id === data.playerId) {
      rewardsClaimed = data.rewardsClaimed
      playerCoins = data.coinsRemaining
      updateUI()
    }

    world.chat(`🎉 ${data.playerName} claimed a reward on-chain!`, true)
  })

  // Player data received
  app.on('playerData', data => {
    playerCoins = data.coinsCollected || 0
    rewardsClaimed = data.rewardsClaimed || 0
    updateUI()
  })

  // Wallet events
  world.web3.on('connected', () => {
    walletConnected = true
    updateUI()
  })

  world.web3.on('disconnected', () => {
    walletConnected = false
    updateUI()
  })

  // Request initial player data
  app.send('requestPlayerData', {})

  // Spawn existing coins
  if (app.state.activeCoins) {
    app.state.activeCoins.forEach(coinData => {
      spawnCoin(coinData)
    })
  }

  // Initial UI update
  updateUI()

  console.log('[Client] Coin Collector initialized')
}
