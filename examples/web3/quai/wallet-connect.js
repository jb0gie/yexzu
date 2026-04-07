// Quai Wallet Connect Example
// Demonstrates Pelagus wallet integration with Quai Network
// Quai is NOT standard EVM - it uses 9-zone sharded architecture

app.configure([
  {
    key: 'buttonText',
    type: 'text',
    label: 'Connect Button Text',
    initial: 'Connect Pelagus',
  },
  {
    key: 'debug',
    type: 'switch',
    label: 'Debug Logging',
    options: [
      { label: 'Enabled', value: 'enabled' },
      { label: 'Disabled', value: 'disabled' },
    ],
    initial: 'disabled',
  },
])

// State
app.state.connected = false
app.state.address = null
app.state.shard = null

// Get entities
const rig = app.get('WCRig')
const triggerBody = app.get('AreaTrigger')

// Initialize trigger zone
let isPlayerNearby = false
const localPlayer = world.getPlayer()

if (triggerBody) {
  triggerBody.onTriggerEnter = (e) => {
    try {
      if (e.playerId && localPlayer?.id) {
        const player = world.getPlayer(e.playerId)
        if (player && player.id === localPlayer.id) {
          isPlayerNearby = true
        }
      }
    } catch (err) {
      // Silent fail
    }
  }

  triggerBody.onTriggerLeave = (e) => {
    try {
      if (e.playerId && localPlayer?.id) {
        const player = world.getPlayer(e.playerId)
        if (player && player.id === localPlayer.id) {
          isPlayerNearby = false
        }
      }
    } catch (err) {
      // Silent fail
    }
  }
} else {
  isPlayerNearby = true
}

// Create status UI (only if rig exists to ensure proper context)
let statusUI = null
let statusText = null
let shardText = null

if (rig) {
  statusUI = app.create('ui', {
    space: 'screen',
    position: [0.89, 0.1, 0],
    width: 220,
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    padding: 8,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  })

  statusText = app.create('uitext', {
    value: '🌐 Disconnected',
    color: '#cccccc',
    fontSize: 14,
    textAlign: 'center',
  })

  shardText = app.create('uitext', {
    value: '',
    color: '#888888',
    fontSize: 12,
    textAlign: 'center',
  })

  statusUI.add(statusText)
  statusUI.add(shardText)
  rig.add(statusUI)
}

// Create Action for wallet connection (declared in outer scope)
let connectAction = null

if (rig) {
  connectAction = app.create('action', {
    label: 'Connect Pelagus',
    distance: 4,
    duration: 0.3,
    position: [0, .67, .2],
    onTrigger: () => {
      if (app.state.connected) {
        disconnectWallet()
      } else {
        connectWallet()
      }
    }
  })
  rig.add(connectAction)
}

// Check if QUAI system is available
function isQuaiAvailable() {
  const quai = world.quai
  return quai && typeof quai.connect === 'function'
}

// State tracking
let initCheckTimer = 0
let initChecked = false
let previousAddress = null

// Check initial connection state
const doInitialCheck = (dt) => {
  if (initChecked) return
  initCheckTimer += dt
  if (initCheckTimer < 0.5) return

  // Check if QUAI system is ready
  const quai = world.quai
  if (!quai || typeof quai.connect !== 'function') {
    // Silently skip until QUAI is ready
    return
  }

  const player = world.getPlayer()
  const address = player?.quai || (quai.getAddress ? quai.getAddress() : null)

  if (app.props.debug === 'enabled') {
    console.log('[Quai] Initial state:', { address })
  }

  if (address) {
    app.state.connected = true
    app.state.address = address
    previousAddress = address

    // Get shard info
    const shard = quai.getShard ? quai.getShard() : null
    app.state.shard = shard

    updateStatusUI(address, shard)

    if (rig) {
      rig.play({ name: 'ON', loop: true, fade: 0.3 })
    }

    if (app.props.debug === 'enabled') {
      console.log('[Quai] Already connected on init:', address, shard)
    }
  }

  initChecked = true
}

function updateStatusUI(address, shard) {
  if (!statusText) return
  const short = address.substring(0, 6) + '...' + address.substring(address.length - 4)
  statusText.value = `✅ ${short}`
  statusText.color = '#10b981'
  if (connectAction) connectAction.label = 'Disconnect'

  if (shardText) {
    if (shard?.name) {
      shardText.value = `📍 ${shard.name}`
    } else {
      shardText.value = ''
    }
  }
}

function triggerZoneVisible() {
  return !triggerBody || isPlayerNearby
}

// Main update loop
let checkTimer = 0

app.on('update', (dt) => {
  // Visibility based on trigger zone
  const visible = triggerZoneVisible()
  if (statusUI) statusUI.active = visible
  if (connectAction) connectAction.active = visible

  doInitialCheck(dt)

  // Skip if QUAI system not available yet
  const quai = world.quai
  if (!quai || typeof quai.connect !== 'function') {
    return
  }

  checkTimer += dt
  if (checkTimer < 0.5) return
  checkTimer = 0

  const player = world.getPlayer()
  const address = player?.quai || (quai.getAddress ? quai.getAddress() : null)

  if (address !== previousAddress) {
    previousAddress = address

    if (address) {
      app.state.connected = true
      app.state.address = address

      const shard = quai.getShard ? quai.getShard() : null
      app.state.shard = shard

      updateStatusUI(address, shard)

      rig?.play({ name: 'ON', loop: true, fade: 0.3 })

      if (app.props.debug === 'enabled') {
        console.log('[Quai] Connected:', address, shard)
      }
    } else if (app.state.connected) {
      app.state.connected = false
      app.state.address = null
      app.state.shard = null

      if (statusText) {
        statusText.value = '🌐 Disconnected'
        statusText.color = '#cccccc'
      }
      if (shardText) shardText.value = ''
      if (connectAction) connectAction.label = 'Connect Pelagus'

      rig?.play({ name: 'OFF', loop: true, fade: 0.3 })

      if (app.props.debug === 'enabled') {
        console.log('[Quai] Disconnected')
      }
    }
  }
})

// Connection function
async function connectWallet() {
  if (app.state.connected) {
    if (app.props.debug === 'enabled') {
      console.log('[Quai] Already connected')
    }
    return
  }

  // Check if QUAI system is available
  const quai = world.quai
  if (!quai || typeof quai.connect !== 'function') {
    if (statusText) {
      statusText.value = '⏳ Loading...'
      statusText.color = '#f59e0b'
    }
    console.error('[Quai] QUAI system not yet initialized')
    setTimeout(() => {
      if (statusText) {
        statusText.value = '🌐 Disconnected'
        statusText.color = '#cccccc'
      }
    }, 2000)
    return
  }

  // Check if Pelagus is installed
  const isInstalled = quai.isPelagusInstalled ? quai.isPelagusInstalled() : false
  if (!isInstalled) {
    if (statusText) {
      statusText.value = '❌ Install Pelagus'
      statusText.color = '#ef4444'
    }
    console.error('[Quai] Pelagus wallet not installed')
    console.log('[Quai] Download from: https://pelaguswallet.io')

    // Reset after delay
    setTimeout(() => {
      if (statusText) {
        statusText.value = '🌐 Disconnected'
        statusText.color = '#cccccc'
      }
    }, 3000)
    return
  }

  if (statusText) {
    statusText.value = '⏳ Connecting...'
    statusText.color = '#f59e0b'
  }

  try {
    const result = await quai.connect()

    if (app.props.debug === 'enabled') {
      console.log('[Quai] Connect result:', result)
    }

    if (result.success) {
      app.state.connected = true
      app.state.address = result.address
      app.state.shard = result.shard

      updateStatusUI(result.address, result.shard)

      rig?.play({ name: 'ON', loop: true, fade: 0.3 })

      app.emit('quaiConnected', {
        connected: true,
        address: result.address,
        shard: result.shard
      })
    } else if (result.reason === 'user_rejected') {
      if (statusText) {
        statusText.value = '❌ Cancelled'
        statusText.color = '#ef4444'
      }
      setTimeout(() => {
        if (statusText) {
          statusText.value = '🌐 Disconnected'
          statusText.color = '#cccccc'
        }
      }, 2000)
    }
  } catch (error) {
    console.error('[Quai] Connect error:', error)
    if (statusText) {
      statusText.value = '❌ Error'
      statusText.color = '#ef4444'
    }

    setTimeout(() => {
      if (statusText) {
        statusText.value = '🌐 Disconnected'
        statusText.color = '#cccccc'
      }
    }, 3000)
  }
}

// Disconnect function
async function disconnectWallet() {
  if (!app.state.connected) {
    if (app.props.debug === 'enabled') {
      console.log('[Quai] Not connected')
    }
    return
  }

  // Check if QUAI system is available
  const quai = world.quai
  if (!quai || typeof quai.disconnect !== 'function') {
    console.error('[Quai] QUAI system not available')
    return
  }

  try {
    await quai.disconnect()
    if (app.props.debug === 'enabled') {
      console.log('[Quai] Disconnected')
    }
  } catch (error) {
    console.error('[Quai] Disconnect error:', error)
  }
}

// Quick action hotkey (Q) - only on client
if (world.isClient) {
  try {
    const control = app.control()
    if (control && control.keyQ) {
      control.keyQ.capture = true
      let quickKeyPressed = false
      app.on('update', () => {
        if (control.keyQ?.pressed && !quickKeyPressed) {
          if (app.state.connected) disconnectWallet()
          else connectWallet()
        }
        quickKeyPressed = control.keyQ?.pressed
      })
    }
  } catch (err) {
    // Control not available (server-side or not initialized)
    console.log('[Quai] Quick action hotkey not available')
  }
}

if (app.props.debug === 'enabled') {
  console.log('✅ Quai Wallet Connect initialized')
  console.log('🔷 Requires Pelagus wallet (not MetaMask)')
  console.log('🔷 Quai uses 9-zone sharded architecture')
}
