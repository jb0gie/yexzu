/**
 * Game Session Integration Example
 *
 * This example demonstrates how to:
 * - Use session policies for gasless, pre-approved transactions
 * - Integrate wallet with game mechanics
 * - Handle player actions that trigger blockchain transactions
 * - Track on-chain game state
 *
 * In this example, players can "claim resources" which triggers a
 * blockchain transaction without requiring manual approval each time.
 */

// Configuration
app.configure([
  {
    type: 'section',
    key: 'game',
    label: 'Game Contract Configuration',
  },
  {
    key: 'gameContract',
    type: 'text',
    label: 'Game Contract Address',
    placeholder: '0x...',
    initial: '',
  },
  {
    type: 'section',
    key: 'session',
    label: 'Session Settings',
  },
  {
    key: 'enableSession',
    type: 'switch',
    label: 'Enable Session',
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
    initial: 'true',
  },
])

// Server-side: Track player resources
if (world.isServer) {
  // Store player resources in app state
  if (!app.state.playerResources) {
    app.state.playerResources = {}
  }

  // Handle claim resource requests
  app.on('claimResource', async (data, networkId) => {
    const player = world.getPlayer(networkId)
    if (!player) return

    console.log(`[Server] ${player.name} claiming resource`)

    // Update local state
    if (!app.state.playerResources[player.id]) {
      app.state.playerResources[player.id] = { count: 0 }
    }
    app.state.playerResources[player.id].count++

    // Broadcast to all clients
    app.send('resourceClaimed', {
      playerId: player.id,
      playerName: player.name,
      count: app.state.playerResources[player.id].count,
      txHash: data.txHash,
    })
  })
}

// Client-side: UI and interaction
if (world.isClient) {
  let isConnected = false
  let isClaiming = false
  let resourceCount = 0

  // Initialize session policies if enabled
  async function initializeSession() {
    if (props.enableSession !== 'true' || !props.gameContract) {
      return
    }

    // Get the controller and configure session policies
    const controller = world.web3.getController()

    // Define session policies for automatic transaction approval
    const policies = {
      contracts: {
        [props.gameContract]: {
          name: 'Hyperfy Game',
          methods: [
            { name: 'claim_resource', entrypoint: 'claim_resource' },
            { name: 'use_resource', entrypoint: 'use_resource' },
            { name: 'trade_resource', entrypoint: 'trade_resource' },
          ],
        },
      },
    }

    console.log('[Client] Session policies configured:', policies)
  }

  // Create UI
  const ui = app.create('ui')
  ui.width = 500
  ui.height = 450
  ui.backgroundColor = 'rgba(0, 15, 30, 0.9)'
  ui.borderRadius = 20
  ui.padding = 25
  ui.billboard = 'full'
  ui.pivot = 'center'
  ui.justifyContent = 'center'
  ui.alignItems = 'center'
  ui.gap = 15
  ui.position.y = 2
  app.add(ui)

  // Title
  const title = app.create('uitext')
  title.value = 'WEB3 GAME INTEGRATION'
  title.color = '#00ffaa'
  title.fontSize = 26
  title.fontWeight = 'bold'
  ui.add(title)

  // Session status
  const sessionStatus = app.create('uitext')
  sessionStatus.value = 'Session: Not Configured'
  sessionStatus.color = '#ffaa00'
  sessionStatus.fontSize = 14
  ui.add(sessionStatus)

  // Resource counter
  const resourceCounter = app.create('uitext')
  resourceCounter.value = 'Resources: 0'
  resourceCounter.color = '#ffffff'
  resourceCounter.fontSize = 20
  resourceCounter.fontWeight = 'bold'
  resourceCounter.backgroundColor = 'rgba(0, 0, 0, 0.4)'
  resourceCounter.padding = 15
  resourceCounter.borderRadius = 10
  ui.add(resourceCounter)

  // Status message
  const status = app.create('uitext')
  status.value = 'Connect wallet to start'
  status.color = '#ffffff'
  status.fontSize = 16
  ui.add(status)

  // Transaction log
  const txLog = app.create('uitext')
  txLog.value = ''
  txLog.color = '#00ffaa'
  txLog.fontSize = 12
  txLog.active = false
  ui.add(txLog)

  // Connect button
  const connectBtn = app.create('uitext')
  connectBtn.value = '[ CONNECT & START SESSION ]'
  connectBtn.color = '#00ffaa'
  connectBtn.fontSize = 18
  connectBtn.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  connectBtn.padding = 12
  connectBtn.borderRadius = 8
  connectBtn.fontWeight = 'bold'

  connectBtn.onPointerOver = () => {
    connectBtn.backgroundColor = 'rgba(0, 30, 60, 0.8)'
  }

  connectBtn.onPointerOut = () => {
    connectBtn.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  }

  connectBtn.onPointerUp = async () => {
    if (!isConnected) {
      try {
        status.value = 'Connecting...'
        status.color = '#ffaa00'

        await world.web3.connect()
        await initializeSession()

        isConnected = true
        updateUI()

        status.value = 'Ready to claim resources!'
        status.color = '#00ff00'
      } catch (error) {
        console.error('Connection failed:', error)
        status.value = 'Connection failed'
        status.color = '#ff0000'
      }
    }
  }

  ui.add(connectBtn)

  // Claim button
  const claimBtn = app.create('uitext')
  claimBtn.value = '[ CLAIM RESOURCE ]'
  claimBtn.color = '#00ffaa'
  claimBtn.fontSize = 20
  claimBtn.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  claimBtn.padding = 15
  claimBtn.borderRadius = 10
  claimBtn.fontWeight = 'bold'
  claimBtn.active = false

  claimBtn.onPointerOver = () => {
    if (!isClaiming) {
      claimBtn.backgroundColor = 'rgba(0, 50, 100, 0.8)'
    }
  }

  claimBtn.onPointerOut = () => {
    claimBtn.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  }

  claimBtn.onPointerUp = async () => {
    if (!isClaiming && isConnected) {
      await claimResource()
    }
  }

  ui.add(claimBtn)

  // Info text
  const info = app.create('uitext')
  info.value = 'With session policies, transactions\nare gasless and auto-approved!'
  info.color = '#888888'
  info.fontSize = 12
  info.textAlign = 'center'
  ui.add(info)

  // Claim resource function
  async function claimResource() {
    if (!world.web3.isConnected()) {
      status.value = 'Please connect wallet first'
      status.color = '#ff0000'
      return
    }

    if (!props.gameContract) {
      status.value = 'Configure game contract in inspector'
      status.color = '#ff0000'
      return
    }

    isClaiming = true
    claimBtn.color = '#666666'
    status.value = 'Claiming resource...'
    status.color = '#ffaa00'

    try {
      // Execute transaction on-chain
      const call = {
        contractAddress: props.gameContract,
        entrypoint: 'claim_resource',
        calldata: [],
      }

      console.log('[Client] Executing claim_resource...')
      const result = await world.web3.execute(call)

      console.log('[Client] Transaction result:', result)

      // Update local count
      resourceCount++
      resourceCounter.value = `Resources: ${resourceCount}`

      // Notify server
      app.send('claimResource', {
        txHash: result.transaction_hash,
      })

      // Show transaction
      if (result.transaction_hash) {
        const shortHash = `${result.transaction_hash.slice(0, 8)}...${result.transaction_hash.slice(-6)}`
        txLog.value = `Last TX: ${shortHash}`
        txLog.active = true
      }

      status.value = 'Resource claimed successfully!'
      status.color = '#00ff00'

      // Reset status after delay
      setTimeout(() => {
        if (status.value === 'Resource claimed successfully!') {
          status.value = 'Ready to claim more!'
          status.color = '#ffffff'
        }
      }, 3000)
    } catch (error) {
      console.error('[Client] Claim failed:', error)
      status.value = `Claim failed: ${error.message}`
      status.color = '#ff0000'
    } finally {
      isClaiming = false
      claimBtn.color = '#00ffaa'
    }
  }

  // Update UI based on state
  function updateUI() {
    if (isConnected) {
      const addr = world.web3.getAddress()
      const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`

      connectBtn.active = false
      claimBtn.active = true

      if (props.enableSession === 'true' && props.gameContract) {
        sessionStatus.value = `Session: Active (${shortAddr})`
        sessionStatus.color = '#00ff00'
        info.active = true
      } else {
        sessionStatus.value = 'Session: Disabled'
        sessionStatus.color = '#ffaa00'
        info.active = false
      }
    } else {
      connectBtn.active = true
      claimBtn.active = false
      sessionStatus.value = 'Session: Not Active'
      sessionStatus.color = '#ff0000'
    }
  }

  // Handle server events
  app.on('resourceClaimed', data => {
    console.log('[Client] Resource claimed by player:', data)
    world.chat(`${data.playerName} claimed a resource! Total: ${data.count}`, true)
  })

  // Listen for wallet events
  world.web3.on('connected', () => {
    updateUI()
  })

  world.web3.on('disconnected', () => {
    isConnected = false
    updateUI()
  })

  world.web3.on('transaction', data => {
    console.log('[Client] Transaction event:', data)
  })

  // Listen for config changes
  app.on('config', () => {
    updateUI()
  })

  // Initial setup
  updateUI()
}
