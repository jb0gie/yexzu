// Simple 2D Fighting Stage
// Uses global app pattern like prim-switcher.js

// Get GLB node references
const gameBound = app.get('GameBound')
const gmBndCol = app.get('GmBndCol')
const gmBndTrggr = app.get('GmBndTrggr')

// Debug GLB node detection
console.log('[2D Stage] GLB Node Detection:')
console.log('  - GameBound:', !!gameBound)
console.log('  - GmBndCol:', !!gmBndCol)
console.log('  - GmBndTrggr:', !!gmBndTrggr)

// Spawn points array
const spawnPoints = [
  app.get('SpawnPoint'),
  app.get('SpawnPoint.001'),
  app.get('SpawnPoint.002'),
  app.get('SpawnPoint.003'),
  app.get('SpawnPoint.004'),
].filter(point => point !== null)

// Game state
let gameActive = false
let playersInZone = new Set()
let isInZone = false
let stageCamera = null
let stageUI = null
let statusText = null
let propsLogged = false

console.log('[2D Stage] Elemental fighting stage initialized')
console.log(`[2D Stage] Found ${spawnPoints.length} spawn points`)

// Debug props availability
app.on('update', () => {
  if (!propsLogged) {
    console.log('[2D Stage] Props available:', props)
    console.log('[2D Stage] Camera distance:', props.cameraDistance)
    console.log('[2D Stage] Camera height:', props.cameraHeight)
    console.log('[2D Stage] Camera follow speed:', props.cameraFollowSpeed)
    propsLogged = true
  }
})

// Configure app
app.configure([
  { type: 'section', key: 'gameSection', label: 'Game Status' },
  { key: 'gameStatus', type: 'text', label: 'Status', initial: 'Game Inactive' },
  { type: 'section', key: 'adminSection', label: 'Admin Controls' },
  {
    type: 'button',
    key: 'startGame',
    label: 'Start Game',
    onClick: () => startGame(),
  },
  {
    type: 'button',
    key: 'stopGame',
    label: 'Stop Game',
    onClick: () => stopGame(),
  },
  {
    type: 'button',
    key: 'restartGame',
    label: 'Restart Game',
    onClick: () => restartGame(),
  },
  {
    type: 'button',
    key: 'teleportToStage',
    label: 'Teleport to Stage',
    onClick: () => teleportPlayer(world.getPlayer()?.id),
  },
  {
    type: 'button',
    key: 'testCamera',
    label: 'Test 2D Camera',
    onClick: () => test2DCamera(),
  },
  { type: 'section', key: 'cameraSection', label: 'Camera Settings' },
  { key: 'cameraDistance', type: 'number', label: 'Camera Distance', initial: 15, min: 5, max: 50 },
  { key: 'cameraHeight', type: 'number', label: 'Camera Height', initial: 5, min: 0, max: 20 },
  { key: 'cameraFollowSpeed', type: 'range', label: 'Follow Speed', initial: 0.1, min: 0.01, max: 0.5, step: 0.01 },
])

console.log('[2D Stage] Configuration completed')

// Debug props after configuration
setTimeout(() => {
  console.log('[2D Stage] Props after timeout:', props)
  console.log('[2D Stage] Camera distance from props:', props.cameraDistance)
}, 1000)

// Server-side initialization
if (world.isServer) {
  // Setup death collider (GmBndCol)
  if (gmBndCol) {
    // Convert to static rigidbody with trigger
    gmBndCol.type = 'static'
    gmBndCol.isTrigger = true

    gmBndCol.onTriggerEnter = hit => {
      if (!gameActive) return

      if (hit.playerId) {
        const player = world.getPlayer(hit.playerId)
        if (player) {
          // Instant death
          player.damage(player.health)
          console.log(`[2D Stage] Player ${hit.playerId} died in death zone`)
        }
      }
    }

    console.log('[2D Stage] Death collider configured')
  }

  // Setup trigger zone (GmBndTrggr)
  if (gmBndTrggr) {
    gmBndTrggr.isTrigger = true

    gmBndTrggr.onTriggerEnter = hit => {
      console.log(`[2D Stage] TRIGGER ENTER: ${hit.playerId}, gameActive: ${gameActive}`)
      if (hit.playerId && !playersInZone.has(hit.playerId)) {
        playersInZone.add(hit.playerId)
        app.send('player-enter-zone', { playerId: hit.playerId })
        console.log(`[2D Stage] Player ${hit.playerId} entered zone - sending message`)
      }
    }

    gmBndTrggr.onTriggerLeave = hit => {
      console.log(`[2D Stage] TRIGGER LEAVE: ${hit.playerId}`)
      if (hit.playerId && playersInZone.has(hit.playerId)) {
        playersInZone.delete(hit.playerId)
        app.send('player-leave-zone', { playerId: hit.playerId })
        console.log(`[2D Stage] Player ${hit.playerId} left zone - sending message`)
      }
    }

    console.log('[2D Stage] Trigger zone configured')
  } else {
    console.warn('[2D Stage] WARNING: GmBndTrggr trigger zone not found!')
  }

  // Listen for player death events
  world.on('health', ({ playerId, health }) => {
    if (health === 0 && playersInZone.has(playerId)) {
      const spawnPos = getRandomSpawnPoint()
      if (spawnPos) {
        // Store respawn position for elemental-combat to use
        app.emit('stage:override-spawn', [playerId, spawnPos])
        console.log(`[2D Stage] Set respawn for player ${playerId}`)
      }
    }
  })

  console.log('[2D Stage] Server initialized')
}

// Client-side initialization
if (world.isClient) {
  // Create 2D stage camera anchored to player
  console.log('[2D Stage] Creating 2D perspective camera anchored to player')
  console.log('[2D Stage] Using camera height:', props.cameraHeight || 5)
  console.log('[2D Stage] Using camera distance:', props.cameraDistance || 15)

  stageCamera = app.create('camera', {
    name: 'stage-cam-2d',
    fov: 50,
    active: false,
    attachToRig: true, // Anchor to player
    isPlayerCamera: false,
    position: [0, props.cameraHeight || 5, props.cameraDistance || 15], // Local to player
    showHelper: true,
  })

  console.log('[2D Stage] Stage camera created and anchored to player for 2D perspective')

  // Listen for server messages
  app.on('player-enter-zone', data => {
    console.log('[2D Stage] CLIENT: Received player-enter-zone:', data)
    const localPlayer = world.getPlayer()
    console.log('[2D Stage] CLIENT: Local player ID:', localPlayer?.id)
    if (localPlayer && localPlayer.id === data.playerId) {
      console.log('[2D Stage] CLIENT: Activating stage camera!')
      activateStageCamera()
      isInZone = true
      showUI('2D Fight Mode Active')
      console.log('[2D Stage] Entered 2D fight zone')
    }
  })

  app.on('player-leave-zone', data => {
    console.log('[2D Stage] CLIENT: Received player-leave-zone:', data)
    const localPlayer = world.getPlayer()
    if (localPlayer && localPlayer.id === data.playerId) {
      console.log('[2D Stage] CLIENT: Deactivating stage camera!')
      deactivateStageCamera()
      isInZone = false
      hideUI()
      console.log('[2D Stage] Left 2D fight zone')
    }
  })

  app.on('game-state-changed', data => {
    if (isInZone) {
      showUI(data.active ? '2D Fight Mode Active' : 'Game Inactive')
    }
  })

  // Update loop for camera following
  app.on('update', delta => {
    if (!isInZone || !stageCamera || !stageCamera.active) return

    updateStageCamera(delta)
  })

  console.log('[2D Stage] Client initialized')

  // Listen for chat commands for teleport
  world.on('command', e => {
    if (!e.args || e.args.length === 0) return

    console.log('[2D Stage] Received command:', e.args[0])

    // Handle /stage, /spawn, /center, /origin commands
    handleTeleportCommand(e.args[0], e.playerId)
  })
}

function handleTeleportCommand(commandText, playerId) {
  console.log('[2D Stage] Handling teleport command:', commandText)

  const placeName = commandText.slice(1) // Remove the '/' prefix

  // Define known places and their positions
  const places = {
    stage: getRandomSpawnPoint(),
    spawn: getRandomSpawnPoint(),
    center: new THREE.Vector3(0, 100, 0), // Center at Y=100 to match stage height
    origin: new THREE.Vector3(0, 0, 0),
  }

  const targetPlace = placeName.toLowerCase()

  if (places[targetPlace]) {
    const player = world.getPlayer(playerId)
    if (player) {
      const pos = places[targetPlace]
      player.teleport(pos.toArray())
      world.chat?.add({
        id: Date.now().toString(),
        from: null,
        fromId: null,
        body: `Teleported to ${targetPlace}`,
        createdAt: new Date().toISOString(),
      })
      console.log(`[2D Stage] Teleported player ${playerId} to ${targetPlace}:`, pos.toArray())
    }
  } else {
    // Send error message via chat
    world.chat?.add({
      id: Date.now().toString(),
      from: null,
      fromId: null,
      body: `Unknown command: /${targetPlace}. Available: /${Object.keys(places).join(', /')}`,
      createdAt: new Date().toISOString(),
    })
    console.log(`[2D Stage] Unknown teleport destination: ${targetPlace}`)
  }
}

function activateStageCamera() {
  console.log('[2D Stage] ACTIVATE: stageCamera exists:', !!stageCamera)
  if (!stageCamera) return

  try {
    console.log('[2D Stage] ACTIVATE: world.cameraManager exists:', !!world.cameraManager)
    if (world.cameraManager) {
      world.cameraManager.setActiveCamera(stageCamera)
      console.log('[2D Stage] ACTIVATE: Used cameraManager.setActiveCamera')
    } else {
      stageCamera.active = true
      console.log('[2D Stage] ACTIVATE: Used stageCamera.active = true')
    }
    console.log('[2D Stage] Stage camera activated')
  } catch (error) {
    console.error('[2D Stage] Failed to activate camera:', error)
  }
}

function deactivateStageCamera() {
  console.log('[2D Stage] DEACTIVATE: Attempting to deactivate camera')
  try {
    console.log('[2D Stage] DEACTIVATE: world.activateDefaultCamera exists:', !!world.activateDefaultCamera)
    if (world.activateDefaultCamera) {
      world.activateDefaultCamera()
      console.log('[2D Stage] DEACTIVATE: Used world.activateDefaultCamera()')
    }
    console.log('[2D Stage] Stage camera deactivated')
  } catch (error) {
    console.error('[2D Stage] Failed to deactivate camera:', error)
  }
}

function updateStageCamera(delta) {
  if (!stageCamera || !stageCamera.active) return

  const localPlayer = world.getPlayer()
  if (!localPlayer) return

  // For 2D side-scrolling perspective, keep camera fixed relative to player
  // Only adjust height and distance for the 2D view
  const targetHeight = props.cameraHeight || 100
  const targetDistance = props.cameraDistance || 15

  // Smooth height adjustment for perspective
  stageCamera.position.y += (targetHeight - stageCamera.position.y) * (props.cameraFollowSpeed || 0.1)
  stageCamera.position.z += (targetDistance - stageCamera.position.z) * (props.cameraFollowSpeed || 0.1)

  // Keep X at 0 for fixed 2D perspective (side view)
  stageCamera.position.x = 0

  // Look slightly forward from player for side-scrolling view
  stageCamera.lookAt([
    localPlayer.position.x,
    localPlayer.position.y + 1,
    localPlayer.position.z + 5, // Look slightly ahead in 2D space
  ])

  // Debug camera position
  if (Math.random() < 0.1) {
    // Only log 10% of the time to avoid spam
    console.log('[2D Stage] 2D camera position:', {
      x: stageCamera.position.x.toFixed(2),
      y: stageCamera.position.y.toFixed(2),
      z: stageCamera.position.z.toFixed(2),
    })
  }
}

function startGame() {
  gameActive = true
  app.state.gameActive = true
  app.send('game-state-changed', { active: true })

  // Update config status
  app.config.gameStatus = 'Game Active'

  console.log('[2D Stage] Game started')
}

function stopGame() {
  gameActive = false
  app.state.gameActive = false
  playersInZone.clear()
  app.send('game-state-changed', { active: false })

  // Update config status
  app.config.gameStatus = 'Game Inactive'

  console.log('[2D Stage] Game stopped')
}

function restartGame() {
  console.log('[2D Stage] Restarting game...')
  stopGame()
  setTimeout(() => startGame(), 1000)
}

function teleportPlayer(networkId) {
  const spawnPos = getRandomSpawnPoint()
  const player = world.getPlayer(networkId)
  if (player && spawnPos) {
    player.teleport(spawnPos.toArray())
    console.log(`[2D Stage] Teleported player ${networkId} to stage`)

    // Send confirmation message via chat
    world.chat?.add({
      id: Date.now().toString(),
      from: null,
      fromId: null,
      body: 'Teleported to stage spawn point',
      createdAt: new Date().toISOString(),
    })
  } else {
    console.warn(`[2D Stage] Failed to teleport player ${networkId} - player or spawn not found`)
  }
}

function getRandomSpawnPoint() {
  if (spawnPoints.length === 0) {
    console.warn('[2D Stage] No spawn points available')
    return null
  }

  // Use spawn points 001-004 for random selection, fallback to main SpawnPoint
  const validSpawns = spawnPoints.length > 1 ? spawnPoints.slice(1) : spawnPoints
  const randomIndex = Math.floor(Math.random() * validSpawns.length)
  const spawn = validSpawns[randomIndex]

  if (!spawn) {
    console.warn('[2D Stage] Selected spawn point is null')
    return null
  }

  return spawn.position.clone()
}

function showUI(message) {
  // Create or update UI element
  if (!stageUI) {
    console.log('[2D Stage] UI: Creating screen UI for message:', message)

    stageUI = app.create('ui', {
      space: 'screen',
      width: 300,
      height: 80,
      x: 960, // Center of 1920px screen
      y: 50,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderRadius: 10,
      padding: 15,
    })

    statusText = app.create('uitext', {
      value: message,
      color: '#00ff00',
      fontSize: 20,
      align: 'center',
    })

    stageUI.add(statusText)
    app.add(stageUI)
  } else {
    statusText.value = message
  }
}

function hideUI() {
  if (stageUI) {
    app.remove(stageUI)
    stageUI = null
    statusText = null
  }
}

function test2DCamera() {
  console.log('[2D Stage] TEST: Button clicked - manually activating 2D camera')
  console.log('[2D Stage] TEST: stageCamera exists:', !!stageCamera)
  console.log('[2D Stage] TEST: camRef exists:', !!camRef)
  console.log('[2D Stage] TEST: world.cameraManager exists:', !!world.cameraManager)

  if (!stageCamera) {
    console.error('[2D Stage] TEST: ERROR - stageCamera is null!')
    return
  }

  console.log('[2D Stage] TEST: stageCamera.current.active:', stageCamera.active)
  console.log('[2D Stage] TEST: current active camera:', world.cameraManager?.activeCamera?.name)

  isInZone = true
  activateStageCamera()
  showUI('2D Camera Test Mode')

  // Check if activation worked
  setTimeout(() => {
    console.log('[2D Stage] TEST: After activation - stageCamera.active:', stageCamera.active)
    console.log('[2D Stage] TEST: current active camera:', world.cameraManager?.activeCamera?.name)
  }, 100)

  // Deactivate after 10 seconds
  setTimeout(() => {
    console.log('[2D Stage] TEST: Deactivating 2D camera')
    isInZone = false
    deactivateStageCamera()
    hideUI()
  }, 10000)
}
