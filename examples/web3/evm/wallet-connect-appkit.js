// Wallet Connect Test for AppKit
// Tests mobile wallet connection via Reown AppKit

app.configure([
  {
    key: 'buttonText',
    type: 'text',
    label: 'Connect Button Text',
    initial: 'Connect Wallet',
  },
  {
    key: 'buttonColor',
    type: 'color',
    label: 'Button Color',
    initial: '#6366f1',
  },
])

// State
app.state.connected = false
app.state.address = null
app.state.connecting = false

// Get entities
const rig = app.get('WCRig')

// Create minimal status UI
const statusUI = app.create('ui', {
  space: 'screen',
  position: [0.89, 0.1, 0],
  width: 200,
  height: 40,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  borderRadius: 6,
  padding: 8,
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
})

const statusText = app.create('uitext', {
  value: '🌐 Click to Connect',
  color: '#cccccc',
  fontSize: 14,
  textAlign: 'center',
})

statusUI.add(statusText)
if (rig) rig.add(statusUI)

// Create Action for wallet connection
const connectAction = app.create('action', {
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

if (rig) rig.add(connectAction)

// Check connection state periodically
let checkInterval = null

function startConnectionCheck() {
  if (checkInterval) clearInterval(checkInterval)
  checkInterval = setInterval(() => {
    const player = world.getPlayer()
    const address = player?.evm || world.evm?.address
    const isConnected = world.evm?.connected

    if (isConnected && address && !app.state.connected) {
      // Connection detected
      app.state.connected = true
      app.state.address = address
      app.state.connecting = false

      const short = address.substring(0, 6) + '...' + address.substring(38)
      statusText.value = `✅ ${short}`
      statusText.color = '#10b981'
      connectAction.label = 'Disconnect Wallet'

      rig?.play({ name: 'ON', loop: true, fade: 0.3 })

      console.log('[Wallet] Connected:', address)
    } else if (!isConnected && app.state.connected) {
      // Disconnection detected
      app.state.connected = false
      app.state.address = null
      app.state.connecting = false

      statusText.value = '🌐 Disconnected'
      statusText.color = '#cccccc'
      connectAction.label = 'Connect Wallet'

      rig?.play({ name: 'OFF', loop: true, fade: 0.3 })

      console.log('[Wallet] Disconnected')
    }
  }, 500)
}

// Start checking
if (world.isClient) {
  startConnectionCheck()
}

// Connection function
async function connectWallet() {
  if (app.state.connected || app.state.connecting) {
    console.log('[Wallet] Already connected or connecting')
    return
  }

  console.log('[Wallet] Opening AppKit modal...')
  app.state.connecting = true
  statusText.value = '⏳ Open wallet modal...'
  statusText.color = '#f59e0b'

  try {
    // This opens the AppKit modal
    const result = await world.evm.connect()
    console.log('[Wallet] Connect result:', result)

    if (result.success) {
      // Wait for connection to complete via polling
      statusText.value = '⏳ Confirm in wallet...'
    } else {
      app.state.connecting = false
      statusText.value = '🌐 Click to Connect'
      statusText.color = '#cccccc'
    }
  } catch (error) {
    console.error('[Wallet] Connect error:', error)
    app.state.connecting = false
    statusText.value = '❌ Error - Try Again'
    statusText.color = '#ef4444'
    setTimeout(() => {
      if (!app.state.connected) {
        statusText.value = '🌐 Click to Connect'
        statusText.color = '#cccccc'
      }
    }, 3000)
  }
}

// Disconnect function
async function disconnectWallet() {
  if (!app.state.connected) {
    console.log('[Wallet] Not connected')
    return
  }

  try {
    await world.evm.disconnect()
    console.log('[Wallet] Disconnected')
  } catch (error) {
    console.error('[Wallet] Disconnect error:', error)
  }
}

// Cleanup on destroy
app.on('destroy', () => {
  if (checkInterval) clearInterval(checkInterval)
})

console.log('✅ AppKit Wallet Test initialized')
console.log('📱 Click "Connect Wallet" to open AppKit modal')
