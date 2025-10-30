// Cartridge integration app - Simple hypscript

// Configure UI properties
app.configure([
  {
    key: 'buttonText',
    type: 'text',
    label: 'Connect Button Text',
    hint: 'Text displayed on the main connect button.',
    initial: 'Connect Cartridge',
  },
  {
    key: 'buttonColor',
    type: 'color',
    label: 'Button Color',
    hint: 'Background color of the connect button (hex or color name).',
    initial: '#fbbf24',
  },
  {
    key: 'hotkeysEnabled',
    type: 'switch',
    label: 'Keyboard Hotkeys',
    hint: 'Enable keyboard shortcuts for UI control and wallet connection.',
    options: [
      { label: 'Enabled', value: 'enabled' },
      { label: 'Disabled', value: 'disabled' }
    ],
    initial: 'disabled',
  },
  {
    key: 'hotKeyToggle',
    type: 'text',
    label: 'Toggle UI Hotkey',
    hint: 'Keyboard key to show/hide the cartridge UI (single character).',
    initial: 'I',
  },
  {
    key: 'hotKeyConnect',
    type: 'text',
    label: 'Quick Connect Hotkey',
    hint: 'Keyboard key for quick cartridge connect/disconnect (single character).',
    initial: 'Q',
  },
  {
    key: 'uiSpace',
    type: 'switch',
    label: 'UI Space',
    hint: 'Display UI in screen space or world space.',
    options: [
      { label: 'Screen', value: 'screen' },
      { label: 'World', value: 'world' },
    ],
    initial: 'screen',
  },
  {
    key: 'triggerZone',
    type: 'switch',
    label: 'Trigger Zone UI Control',
    hint: 'Show/hide UI when player enters the trigger zone.',
    options: [
      { label: 'Enabled', value: 'enabled' },
      { label: 'Disabled', value: 'disabled' },
    ],
    initial: 'enabled',
  },
  {
    key: 'triggerMeshVisibility',
    type: 'switch',
    label: 'Trigger Mesh Visibility',
    hint: 'Show/hide the trigger zone mesh.',
    options: [
      { label: 'Visible', value: 'visible' },
      { label: 'Invisible', value: 'invisible' }
    ],
    initial: 'invisible',
  },
])

// Cartridge state
app.state.connected = false
app.state.address = null
app.state.cartridge = null

// Get Rigid Bodies
const cartridgeBody = app.get('CartridgeLogo')
const triggerBody = app.get('AreaTrigger')
const triggerMesh = app.get('Sphere') // Or whatever your trigger mesh is named

// Trigger mesh visibility control
if (triggerMesh && app.props.triggerMeshVisibility === 'invisible') {
  triggerMesh.active = false
}

// console.log('[Cartridge] Trigger mesh visibility:', app.props.triggerMeshVisibility)
// console.log('[Cartridge] Trigger mesh found:', !!triggerMesh)
const mainUI = app.create('ui', {
  space: 'screen', // Start with screen space, update in updateUIPosition
  pivot: 'top-center',
  position: [0.885, 0.05, 0],
  width: 280,
  height: 200,
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  borderRadius: 8,
  padding: 16,
  flexDirection: 'column',
  gap: 12,
  borderWidth: 2,
  borderColor: '#fbbf24',
})

// Create connect button
const connectButton = app.create('uiview', {
  width: 245,
  height: 48,
  backgroundColor: app.props.buttonColor || '#fbbf24',
  borderRadius: 5,
  justifyContent: 'center',
  alignItems: 'center',
})

const buttonText = app.create('uitext', {
  value: app.props.buttonText || 'Connect Cartridge',
  color: '#000000',
  fontSize: 16,
  fontWeight: 'bold',
  textAlign: 'center',
})

// Create status text
const statusText = app.create('uitext', {
  value: 'Ready to connect',
  color: '#cccccc',
  fontSize: 14,
  textAlign: 'center',
})

// Create hotkey hints
const hotkeysText = app.create('uitext', {
  value: 'I: Toggle UI • Q: Quick Connect',
  color: '#64748b',
  fontSize: 10,
  textAlign: 'center',
})

// Create user info container (hidden initially)
const userInfoContainer = app.create('uiview', {
  width: 250,
  height: 80,
  flexDirection: 'column',
  gap: 8,
  visible: false,
  backgroundColor: 'rgba(251, 191, 36, 0.1)',
  borderRadius: 6,
  borderWidth: 1,
  borderColor: 'rgba(251, 191, 36, 0.3)',
})

const usernameText = app.create('uitext', {
  value: '',
  color: '#fbbf24',
  fontSize: 13,
  fontWeight: 'bold',
  textAlign: 'center',
})

const walletAddressText = app.create('uitext', {
  value: '',
  color: '#ffffff',
  fontSize: 12,
  textAlign: 'center',
})

// Cartridge title
const cartridgeTitle = app.create('uitext', {
  value: '⚡ CARTRIDGE',
  color: '#fbbf24',
  fontSize: 12,
  fontWeight: 'bold',
  textAlign: 'center',
})

// Assemble UI
connectButton.add(buttonText)
userInfoContainer.add(usernameText)
userInfoContainer.add(walletAddressText)
mainUI.add(connectButton)
mainUI.add(cartridgeTitle)
mainUI.add(statusText)
mainUI.add(userInfoContainer)
mainUI.add(hotkeysText)
cartridgeBody.add(mainUI)

// Initialize trigger zone variables and handlers (after UI creation)
let originalUIState = false // Default to hidden for trigger zones
let isPlayerNearby = false

// Set initial UI state - hide by default when trigger zone is enabled
const initialState = app.props.triggerZone === 'enabled' ? false : true
mainUI.active = initialState
originalUIState = initialState
// console.log('[Cartridge] Initial UI state:', initialState, '(trigger zone:', app.props.triggerZone + ')')

// Get the local player for comparison
const localPlayer = world.getPlayer()
// console.log('[Cartridge] Local player ID:', localPlayer?.id)

// Area trigger event handlers (client only)
if (triggerBody && app.props.triggerZone === 'enabled') {
  console.log('[Cartridge] Setting up trigger zone handlers')

  triggerBody.onTriggerEnter = (e) => {
    // console.log('[Cartridge] onTriggerEnter fired:', e)
    if (e.playerId) {
      const player = world.getPlayer(e.playerId)
      const isLocalPlayer = player && player.id === localPlayer?.id
      // console.log('[Cartridge] Player ID:', e.playerId, 'Local Player ID:', localPlayer?.id, 'IsLocalPlayer:', isLocalPlayer)
      if (isLocalPlayer) {
        isPlayerNearby = true
        originalUIState = mainUI.active
        mainUI.active = true
        // console.log('[Cartridge] LOCAL player entered trigger zone - UI shown, previous state:', originalUIState)
      } else {
        // console.log('[Cartridge] Non-local player entered trigger zone - ignoring')
      }
    }
  }

  triggerBody.onTriggerLeave = (e) => {
    // console.log('[Cartridge] onTriggerLeave fired:', e)
    if (e.playerId) {
      const player = world.getPlayer(e.playerId)
      const isLocalPlayer = player && player.id === localPlayer?.id
      // console.log('[Cartridge] Player ID:', e.playerId, 'Local Player ID:', localPlayer?.id, 'IsLocalPlayer:', isLocalPlayer)
      if (isLocalPlayer) {
        isPlayerNearby = false
        mainUI.active = originalUIState
        // console.log('[Cartridge] LOCAL player left trigger zone - UI restored to:', originalUIState)
      } else {
        // console.log('[Cartridge] Non-local player left trigger zone - ignoring')
      }
    }
  }
} else {
  console.log('[Cartridge] Trigger zone disabled or trigger body not found')
  console.log('[Cartridge] triggerZone prop:', app.props.triggerZone)
  console.log('[Cartridge] triggerBody exists:', !!triggerBody)
}

// Event handlers
connectButton.onPointerDown = () => {
  if (app.state.connected) {
    disconnectCartridge()
  } else {
    connectCartridge()
  }
}

connectButton.onPointerOver = () => {
  if (app.state.connected) {
    connectButton.backgroundColor = '#dc2626'
  } else {
    connectButton.backgroundColor = 'rgba(252, 211, 77, 0.9)'
  }
}

connectButton.onPointerOut = () => {
  if (app.state.connected) {
    connectButton.backgroundColor = '#ef4444'
  } else {
    connectButton.backgroundColor = app.props.buttonColor || '#fbbf24'
  }
}

// Connection functions
async function connectCartridge() {
  try {
    statusText.value = 'Connecting...'
    statusText.color = '#f59e0b'

    if (world.web3) {
      console.log('[Cartridge] Attempting to connect...')
      const result = await world.web3.connect()

      if (result && result.address) {
        app.state.connected = true
        app.state.address = result.address
        app.state.cartridge = world.web3.controller

        // Update UI for connected state
        buttonText.value = 'Disconnect'
        connectButton.backgroundColor = '#ef4444'
        statusText.value = 'Connected'
        statusText.color = '#10b981'
        userInfoContainer.visible = true

        const shortAddress = result.address.slice(0, 6) + '...' + result.address.slice(-4)
        walletAddressText.value = shortAddress

        // Get username from Cartridge API
        try {
          // console.log('[Cartridge] Looking up username for address:', result.address)

          // Use fetch to call Cartridge API
          const response = await fetch('https://api.cartridge.gg/accounts/lookup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              addresses: [result.address.toLowerCase()]
            })
          })

          if (response.ok) {
            const data = await response.json()
            // console.log('[Cartridge] API response:', data)

            if (data && data.results && data.results.length > 0) {
              // console.log('[Cartridge] Processing results array:', data.results)

              // Find the result that contains our address
              const userResult = data.results.find(apiResult => {
                // console.log('[Cartridge] Checking result:', apiResult)
                return apiResult.addresses && apiResult.addresses.map(a => a.toLowerCase()).includes(result.address.toLowerCase())
              })

              // console.log('[Cartridge] Found user result:', userResult)

              if (userResult && userResult.username) {
                const username = userResult.username
                // console.log('[Cartridge] Setting username text to:', `@${username}`)
                // console.log('[Cartridge] Username text element before:', usernameText.value)

                usernameText.value = `@${username}`

                // console.log('[Cartridge] Username text element after:', usernameText.value)
                // console.log('[Cartridge] Username text visible:', usernameText.visible)
                // console.log('[Cartridge] Username text parent visible:', usernameText.parent?.visible)
              } else {
                // console.log('[Cartridge] No username found in results for address:', result.address)
                // console.log('[Cartridge] User result exists:', !!userResult)
                // console.log('[Cartridge] User result username field:', userResult?.username)
              }
            } else {
              // console.log('[Cartridge] No results found in API response')
            }
          } else {
            console.log('[Cartridge] API request failed:', response.status, response.statusText)
          }
        } catch (e) {
          console.log('[Cartridge] Could not fetch username from API:', e.message)
        }

        app.emit('cartridgeConnected', {
          connected: true,
          address: result.address,
        })

        // console.log('[Cartridge] Connected:', result.address)
      } else {
        // User cancelled the modal
        console.log('[Cartridge] User cancelled connection')
        statusText.value = 'Ready to connect'
        statusText.color = '#cccccc'
        return
      }
    } else {
      throw new Error('world.web3 not available')
    }
  } catch (error) {
    // Check if this is a user cancellation
    if (
      error.message &&
      (error.message.includes('User cancelled') ||
        error.message.includes('User rejected') ||
        error.message.includes('User denied') ||
        error.message.includes('No account returned from controller') ||
        error.message.includes('Modal closed'))
    ) {
      console.log('[Cartridge] User cancelled connection')
      statusText.value = 'Ready to connect'
      statusText.color = '#cccccc'
      return
    }

    // Check for Cartridge service errors (HTTP 500, OAuth issues)
    if (
      error.message && (
        error.message.includes('HTTP error! status: 500') ||
        error.message.includes('Could not establish connection') ||
        error.message.includes('Receiving end does not exist') ||
        error.message.includes('api.cartridge.gg') ||
        error.message.includes('Turnkey')
      )
    ) {
      console.error('[Cartridge] Cartridge service error:', error.message)
      statusText.value = 'Cartridge service unavailable'
      statusText.color = '#f59e0b'

      setTimeout(() => {
        if (!app.state.connected) {
          statusText.value = 'Try again later'
          statusText.color = '#f59e0b'
        }
      }, 3000)

      setTimeout(() => {
        if (!app.state.connected) {
          statusText.value = 'Ready to connect'
          statusText.color = '#cccccc'
        }
      }, 8000)

      return
    }

    // Real connection error
    console.error('[Cartridge] Connection failed:', error)
    statusText.value = 'Connection failed'
    statusText.color = '#ef4444'

    setTimeout(() => {
      if (!app.state.connected) {
        statusText.value = 'Ready to connect'
        statusText.color = '#cccccc'
      }
    }, 2000)
  }
}

async function disconnectCartridge() {
  try {
    if (world.web3 && app.state.connected) {
      await world.web3.disconnect()
    }

    app.state.connected = false
    app.state.address = null
    app.state.cartridge = null

    // Update UI for disconnected state
    buttonText.value = app.props.buttonText || 'Connect Cartridge'
    connectButton.backgroundColor = app.props.buttonColor || '#fbbf24'
    statusText.value = 'Disconnected'
    statusText.color = '#cccccc'
    statusText.visible = true
    userInfoContainer.visible = false
    walletAddressText.value = ''
    usernameText.value = ''

    app.emit('cartridgeDisconnected', {})

    setTimeout(() => {
      if (!app.state.connected) {
        statusText.value = 'Ready to connect'
        statusText.color = '#cccccc'
      }
    }, 2000)

    console.log('[Cartridge] Disconnected')
  } catch (error) {
    console.error('[Cartridge] Disconnect failed:', error)
  }
}

// Initialize hotkeys (optional)
if (app.props.hotkeysEnabled === 'enabled' && world.isClient) {
  const control = app.control()
  if (!control) {
    console.log('[Cartridge] Controls not available - controls not initialized on client')
  } else {
  const toggleKey = app.props.hotKeyToggle || 'I'
  const connectKey = app.props.hotKeyConnect || 'Q'

  const hotKeyToggleCtrl = control['key' + toggleKey.toUpperCase()]
  const hotKeyConnectCtrl = control['key' + connectKey.toUpperCase()]

  if (hotKeyToggleCtrl) {
    hotKeyToggleCtrl.capture = true
  }
  if (hotKeyConnectCtrl) {
    hotKeyConnectCtrl.capture = true
  }

  let toggleKeyPressed = false
  let connectKeyPressed = false

  app.on('update', () => {
    // Toggle UI
    if (hotKeyToggleCtrl?.pressed && !toggleKeyPressed) {
      if (isPlayerNearby) {
        // When in trigger zone, toggle normally but update the stored original state
        mainUI.active = !mainUI.active
        originalUIState = mainUI.active
        console.log('[Cartridge] UI toggled in trigger zone to:', originalUIState)
      } else {
        // Normal toggle when not in trigger zone
        mainUI.active = !mainUI.active
        originalUIState = mainUI.active
        console.log('[Cartridge] UI', mainUI.active ? 'shown' : 'hidden')
      }
    }
    toggleKeyPressed = hotKeyToggleCtrl?.pressed

    // Quick connect/disconnect
    if (hotKeyConnectCtrl?.pressed && !connectKeyPressed) {
      if (app.state.connected) {
        disconnectCartridge()
      } else {
        connectCartridge()
      }
    }
    connectKeyPressed = hotKeyConnectCtrl?.pressed
  })

    // console.log('[Cartridge] Hotkeys enabled (Toggle:', toggleKey, 'Connect:', connectKey, ')')
  }
} else {
  // console.log('[Cartridge] Hotkeys disabled')
}

// Update UI position and properties based on space
function updateUIPosition() {
  if (app.props.uiSpace === 'world') {
    // Set space property to world
    mainUI.space = 'world'

    // World space positioning - set arbitrary position
    mainUI.position.set(0, 1, 0.42)
    mainUI.billboard = 'none'
    mainUI.doubleside = false

    // For world space, set size property instead of scale
    mainUI.size = 0.01
  } else {
    // Set space property to screen
    mainUI.space = 'screen'

    // Screen space positioning
    mainUI.position[0] = 0.885
    mainUI.position[1] = 0.05
    mainUI.position[2] = 0
    mainUI.billboard = 'none'

    // Reset size for screen space
    mainUI.size = 0.01
  }
}

// Update position on frame update
app.on('update', () => {
  updateUIPosition()
})

// console.log('[Cartridge] App initialized')
// console.log('[Cartridge] Running on:', world.isClient ? 'Client' : 'Server')
// console.log('[Cartridge] UI Space:', app.props.uiSpace || 'screen')
// console.log('[Cartridge] Trigger Zone:', app.props.triggerZone === 'enabled' ? 'Enabled' : 'Disabled')
// console.log('[Cartridge] Trigger Mesh Visibility:', app.props.triggerMeshVisibility)
// console.log('[Cartridge] Hotkeys:', app.props.hotkeysEnabled === 'enabled' ? 'Enabled' : 'Disabled')
// console.log('[Cartridge] AreaTrigger Found:', !!triggerBody)
// console.log('[Cartridge] Trigger Mesh Found:', !!triggerMesh)
