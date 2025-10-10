/**
 * Basic Wallet Connection Example
 *
 * This example demonstrates how to:
 * - Connect to Cartridge Controller wallet
 * - Display wallet address
 * - Handle connection/disconnection events
 * - Show wallet status in UI
 */

// Only run on client
if (world.isClient) {
  // State
  let connected = false
  let address = null
  let chainId = null

  // Create UI
  const ui = app.create('ui')
  ui.width = 400
  ui.height = 300
  ui.backgroundColor = 'rgba(0, 15, 30, 0.9)'
  ui.borderRadius = 20
  ui.padding = 20
  ui.billboard = 'full'
  ui.pivot = 'center'
  ui.justifyContent = 'center'
  ui.alignItems = 'center'
  ui.gap = 15
  ui.position.y = 2
  app.add(ui)

  // Title
  const title = app.create('uitext')
  title.value = 'CARTRIDGE WALLET'
  title.color = '#00ffaa'
  title.fontSize = 24
  title.fontWeight = 'bold'
  ui.add(title)

  // Status text
  const status = app.create('uitext')
  status.value = 'Not Connected'
  status.color = '#ffffff'
  status.fontSize = 16
  ui.add(status)

  // Address display
  const addressText = app.create('uitext')
  addressText.value = ''
  addressText.color = '#00ffaa'
  addressText.fontSize = 14
  addressText.active = false
  ui.add(addressText)

  // Chain ID display
  const chainText = app.create('uitext')
  chainText.value = ''
  chainText.color = '#00ffaa'
  chainText.fontSize = 14
  chainText.active = false
  ui.add(chainText)

  // Connect button
  const connectBtn = app.create('uitext')
  connectBtn.value = '[ CONNECT WALLET ]'
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

  connectBtn.onPointerDown = () => {
    connectBtn.color = '#ffffff'
  }

  connectBtn.onPointerUp = async () => {
    connectBtn.color = '#00ffaa'

    if (!connected) {
      await handleConnect()
    } else {
      await handleDisconnect()
    }
  }

  ui.add(connectBtn)

  // Connection handler
  async function handleConnect() {
    try {
      status.value = 'Connecting...'
      status.color = '#ffaa00'

      const result = await world.web3.connect()

      connected = true
      address = result.address
      chainId = result.chainId

      updateUI()

      world.chat('Wallet connected successfully!', true)
    } catch (error) {
      console.error('Connection failed:', error)
      status.value = 'Connection Failed'
      status.color = '#ff0000'
      world.chat('Failed to connect wallet', true)
    }
  }

  // Disconnection handler
  async function handleDisconnect() {
    try {
      await world.web3.disconnect()

      connected = false
      address = null
      chainId = null

      updateUI()

      world.chat('Wallet disconnected', true)
    } catch (error) {
      console.error('Disconnect failed:', error)
      world.chat('Failed to disconnect wallet', true)
    }
  }

  // Update UI based on connection state
  function updateUI() {
    if (connected) {
      status.value = 'Connected'
      status.color = '#00ff00'

      // Show address (shortened)
      const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
      addressText.value = `Address: ${shortAddress}`
      addressText.active = true

      // Show chain ID
      chainText.value = `Chain: ${chainId}`
      chainText.active = true

      connectBtn.value = '[ DISCONNECT ]'
    } else {
      status.value = 'Not Connected'
      status.color = '#ffffff'

      addressText.active = false
      chainText.active = false

      connectBtn.value = '[ CONNECT WALLET ]'
    }
  }

  // Listen for wallet events
  world.web3.on('connected', data => {
    console.log('Wallet connected:', data)
  })

  world.web3.on('disconnected', () => {
    console.log('Wallet disconnected')
  })

  world.web3.on('error', error => {
    console.error('Web3 error:', error)
  })

  // Check if already connected
  if (world.web3.isConnected()) {
    connected = true
    address = world.web3.getAddress()
    chainId = world.web3.getNetworkId()
    updateUI()
  }
}
