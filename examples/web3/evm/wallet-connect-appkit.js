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
app.state.modalOpen = false

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
  value: '🌐 Disconnected',
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

// Track if we're attempting reconnect
let isReconnecting = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 3

// Function to check and restore wallet connection after app resume
async function checkAndRestoreConnection() {
  if (isReconnecting) return
  if (app.state.connected) return // Already showing as connected

  const player = world.getPlayer()
  const address = player?.evm || world.evm?.address

  // If wallet has address but app doesn't show connected, restore it
  if (address && !app.state.connected) {
    if (app.props.debug === 'enabled') {
      console.log('[Wallet] Detected wallet connection on resume:', address)
    }

    app.state.connected = true
    app.state.address = address
    previousAddress = address

    const short = address.substring(0, 6) + '...' + address.substring(38)
    statusText.value = `✅ ${short}`
    statusText.color = '#10b981'
    connectAction.label = 'Disconnect Wallet'

    if (rig) {
      rig.play({ name: 'ON', loop: true, fade: 0.3 })
    }
  }
}

// Check initial connection state - use update loop to avoid SES restrictions
let initCheckTimer = 0
let initChecked = false

const doInitialCheck = (dt) => {
  if (initChecked) return
  initCheckTimer += dt
  if (initCheckTimer < 0.5) return // Wait 0.5 seconds

  const player = world.getPlayer()
  const address = player?.evm || world.evm?.address
  const isConnected = world.evm?.connected

  if (app.props.debug === 'enabled') {
    console.log('[Wallet] Initial state:', { address, isConnected, rigFound: !!rig })
  }

  if (address) {
    // Have address - treat as connected (isConnected flag may lag)
    app.state.connected = true
    app.state.address = address
    previousAddress = address

    const short = address.substring(0, 6) + '...' + address.substring(38)
    statusText.value = `✅ ${short}`
    statusText.color = '#10b981'
    connectAction.label = 'Disconnect Wallet'

    // Play animation if rig exists
    if (rig) {
      if (app.props.debug === 'enabled') console.log('[Wallet] Playing ON animation for existing connection')
      rig.play({ name: 'ON', loop: true, fade: 0.3 })
    } else if (app.props.debug === 'enabled') {
      console.log('[Wallet] No rig found, cannot play animation')
    }

    if (app.props.debug === 'enabled') console.log('[Wallet] Already connected on init:', address)
  }

  initChecked = true
}

// Use app update loop instead of setInterval (SES restriction)
let checkTimer = 0
let previousAddress = null
let debugCounter = 0
let awayTimer = 0
let lastUpdateTime = 0

app.on('update', (dt) => {
  // Detect if we've been "away" (app backgrounded) - dt will be large
  const now = Date.now()
  const timeSinceLastUpdate = now - lastUpdateTime
  lastUpdateTime = now

  // If more than 2 seconds since last update, app was likely backgrounded
  if (timeSinceLastUpdate > 2000 && lastUpdateTime > 0) {
    if (app.props.debug === 'enabled') {
      console.log('[Wallet] App resumed after', timeSinceLastUpdate, 'ms - checking connection')
    }
    // Check if wallet is still connected
    checkAndRestoreConnection()
  }
  // Do initial check first
  doInitialCheck(dt)

  // Check every 0.5 seconds (500ms)
  checkTimer += dt
  if (checkTimer < 0.5) return
  checkTimer = 0

  const player = world.getPlayer()
  const address = player?.evm || world.evm?.address
  const isConnected = world.evm?.connected

  // Debug logging every 5 seconds (if enabled)
  if (app.props.debug === 'enabled') {
    debugCounter++
    if (debugCounter >= 10) {
      debugCounter = 0
      console.log('[Wallet Debug]', {
        playerEvm: player?.evm,
        worldEvmAddress: world.evm?.address,
        worldEvmConnected: world.evm?.connected,
        appState: app.state,
        previousAddress
      })
    }
  }

  // Update if address changed OR if we need to reset after modal closed
  if (address !== previousAddress || (app.state.modalOpen && !isConnected && !address)) {
    previousAddress = address

    if (address) {
      // Connection established (check address since isConnected may lag)
      app.state.connected = true
      app.state.address = address
      app.state.modalOpen = false

      const short = address.substring(0, 6) + '...' + address.substring(38)
      statusText.value = `✅ ${short}`
      statusText.color = '#10b981'
      connectAction.label = 'Disconnect Wallet'

      // Only play animation on new connection
      rig?.play({ name: 'ON', loop: true, fade: 0.3 })

      if (app.props.debug === 'enabled') console.log('[Wallet] Connected:', address)
    } else if (!address && app.state.connected) {
      // Disconnected
      app.state.connected = false
      app.state.address = null
      app.state.modalOpen = false

      statusText.value = '🌐 Disconnected'
      statusText.color = '#cccccc'
      connectAction.label = 'Connect Wallet'

      rig?.play({ name: 'OFF', loop: true, fade: 0.3 })

      if (app.props.debug === 'enabled') console.log('[Wallet] Disconnected')
    }
  }
})

// Connection function
async function connectWallet() {
  if (app.state.connected) {
    if (app.props.debug === 'enabled') console.log('[Wallet] Already connected')
    return
  }

  if (app.props.debug === 'enabled') console.log('[Wallet] Opening AppKit modal...')
  app.state.modalOpen = true
  statusText.value = '⏳ Select wallet...'
  statusText.color = '#f59e0b'

  try {
    // Open AppKit modal - this returns immediately, doesn't wait for connection
    const result = await world.evm.connect()
    if (app.props.debug === 'enabled') console.log('[Wallet] Modal opened:', result)

    // Note: Modal is open, but user hasn't connected yet
    // The update loop will detect when they actually connect
    if (!result.success) {
      app.state.modalOpen = false
      statusText.value = '🌐 Disconnected'
      statusText.color = '#cccccc'
    }
    // If success, we wait for polling to detect actual connection
  } catch (error) {
    console.error('[Wallet] Connect error:', error)
    app.state.modalOpen = false
    statusText.value = '❌ Error'
    statusText.color = '#ef4444'

    // Reset after delay using world time
    let errorTimer = 0
    const resetOnUpdate = (dt) => {
      errorTimer += dt
      if (errorTimer >= 3 && !app.state.connected) {
        statusText.value = '🌐 Disconnected'
        statusText.color = '#cccccc'
        app.off('update', resetOnUpdate)
      }
    }
    app.on('update', resetOnUpdate)
  }
}

// Disconnect function
async function disconnectWallet() {
  if (!app.state.connected) {
    if (app.props.debug === 'enabled') console.log('[Wallet] Not connected')
    return
  }

  try {
    await world.evm.disconnect()
    if (app.props.debug === 'enabled') console.log('[Wallet] Disconnected')
  } catch (error) {
    console.error('[Wallet] Disconnect error:', error)
  }
}

if (app.props.debug === 'enabled') {
  console.log('✅ AppKit Wallet Test initialized')
  console.log('📱 Click "Connect Wallet" to open AppKit modal')
  console.log('⏳ Wait for actual connection before celebrating!')
}
