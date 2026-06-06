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
    label: 'Connect Wallet',
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

// Check initial connection state - ONLY for UI sync, never auto-connect
const doInitialCheck = (dt) => {
  if (initChecked) return
  initCheckTimer += dt
  if (initCheckTimer < 1.0) return // Wait longer before first check

  // Don't auto-detect or auto-connect anything
  // Just mark as checked so the update loop takes over
  initChecked = true

  if (app.props.debug === 'enabled') {
    console.log('[Quai] Init check complete - waiting for user action')
  }
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
const checkTimer = 0

app.on('update', (dt) => {
  // Visibility based on trigger zone
  const visible = triggerZoneVisible()
  if (statusUI) statusUI.active = visible
  if (connectAction) connectAction.active = visible

  doInitialCheck(dt)

  // Update visibility based on trigger zone only
  // No polling for wallet connection - only connect via onTrigger
})

// Connection function
async function connectWallet() {
  if (app.state.connected) {
    if (app.props.debug === 'enabled') {
      console.log('[Quai] Already connected')
    }
    return
  }

  if (statusText) {
    statusText.value = '⏳ Connecting...'
    statusText.color = '#f59e0b'
  }

  // Try QUAI direct connection first (Pelagus/Tangem)
  const quai = world.quai
  if (quai?.isPelagusInstalled?.()) {
    try {
      const result = await quai.connect()

      if (result.success) {
        app.state.connected = true
        app.state.address = result.address
        app.state.shard = result.shard

        updateStatusUI(result.address, result.shard)
        rig?.play({ name: 'ON', loop: true, fade: 0.3 })

        app.emit('quaiConnected', {
          connected: true,
          address: result.address,
          shard: result.shard,
          walletType: result.walletType || 'pelagus'
        })
        return
      }
    } catch (error) {
      console.log('[Quai] Direct connect failed, trying EVM/Reown...')
    }
  }

  // Fall back to EVM/Reown (for WalletConnect to Pelagus or other wallets)
  const evm = world.evm
  if (evm?.connect) {
    try {
      console.log('[Quai] Connecting via EVM/Reown...')
      const result = await evm.connect()

      if (result.success || evm.connected) {
        // Wait for address to be available
        let attempts = 0
        while (!evm.address && attempts < 10) {
          await new Promise(r => setTimeout(r, 500))
          attempts++
        }

        if (evm.address) {
          app.state.connected = true
          app.state.address = evm.address
          // Determine shard from EVM address
          const shard = quai?.getShard ? quai.getShard() : null
          app.state.shard = shard

          updateStatusUI(evm.address, shard)
          rig?.play({ name: 'ON', loop: true, fade: 0.3 })

          app.emit('quaiConnected', {
            connected: true,
            address: evm.address,
            shard: shard,
            walletType: 'evm-reown'
          })
          return
        }
      }
    } catch (error) {
      console.error('[Quai] EVM connect failed:', error)
    }
  }

  // Connection failed
  if (statusText) {
    statusText.value = '❌ Install Pelagus'
    statusText.color = '#ef4444'
  }
  console.error('[Quai] No wallet available')
  console.log('[Quai] Download from: https://pelaguswallet.io')

  setTimeout(() => {
    if (statusText) {
      statusText.value = '🌐 Disconnected'
      statusText.color = '#cccccc'
    }
  }, 3000)
}

// Disconnect function
async function disconnectWallet() {
  if (!app.state.connected) {
    if (app.props.debug === 'enabled') {
      console.log('[Quai] Not connected')
    }
    return
  }

  // Try QUAI disconnect first
  const quai = world.quai
  if (quai?.disconnect) {
    try {
      await quai.disconnect()
      if (app.props.debug === 'enabled') {
        console.log('[Quai] Disconnected from QUAI')
      }
    } catch (error) {
      // Silent fail
    }
  }

  // Also disconnect EVM if connected there
  const evm = world.evm
  if (evm?.disconnect && evm.connected) {
    try {
      await evm.disconnect()
      if (app.props.debug === 'enabled') {
        console.log('[Quai] Disconnected from EVM')
      }
    } catch (error) {
      // Silent fail
    }
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
  console.log('🔷 Supports: Pelagus, Tangem, Reown/WalletConnect')
  console.log('🔷 Quai uses 9-zone sharded architecture')
}
