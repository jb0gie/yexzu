// =================================================================
// Super Run Mechanic Configuration
// =================================================================
app.configure([
  {
    key: 'superRunEmote',
    type: 'file',
    kind: 'emote',
    label: 'Super Run Emote',
  },
  {
    key: 'deactivationTime',
    type: 'number',
    label: 'Deactivation Time (seconds)',
    dp: 1,
    initial: 0.5,
    min: 0.1,
    max: 2.0,
    step: 0.1,
  },
])

const PLAYER_HALF_HEIGHT = 0.8
const SPRINT_SPEED_THRESHOLD = 5 // Speed in m/s to be considered sprinting

const SUPER_RUN_CONFIG = {
  activationTime: 1,
  extraSpeed: 30,
  layerMask: world.createLayerMask('environment'),
}

// =================================================================
// Client-Side Super Run Mechanic
// =================================================================
if (world.isClient) {
  const { superRunEmote, deactivationTime } = app.props

  // Declare variables but don't initialize yet
  let player
  let debugText
  let text

  let runTime = 0
  let superActive = false

  const tempVec = new Vector3()
  const tempQuat = new Quaternion()
  const tempEuler = new Euler(0, 0, 0, 'YXZ')

  function getForwardDirection(outVec) {
    // Use player rotation instead of control camera
    tempEuler.setFromQuaternion(player.rotation)
    tempEuler.x = 0
    tempEuler.z = 0
    tempQuat.setFromEuler(tempEuler)
    return outVec.copy(new Vector3(0, 0, -1)).applyQuaternion(tempQuat)
  }

  function isGrounded() {
    if (!player?.position) return true
    const origin = player.position.clone()
    const direction = new Vector3(0, -1, 0)
    const maxDistance = PLAYER_HALF_HEIGHT + 0.1
    const hit = world.raycast(origin, direction, maxDistance, SUPER_RUN_CONFIG.layerMask)
    return hit !== null && hit.distance <= PLAYER_HALF_HEIGHT + 0.05
  }

  const isMobile =
    typeof navigator !== 'undefined' && navigator.userAgent
      ? /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      : false

  // Wait for world to be ready
  if (world.isReady) {
    init()
  } else {
    world.on('ready', init)
  }

  function init() {
    // NOW it's safe to access player
    player = world.getPlayer()

    if (!player) {
      console.error('Super Run: Player not available')
      return
    }

    // Create debug UI only after world is ready
    debugText = app.create('ui', {
      space: 'screen',
      position: [0, 0],
      offset: [20, 20],
      width: 400,
      height: 150,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderRadius: 5,
      padding: 10,
    })
    text = app.create('uitext', {
      value: 'Debug: Initializing...',
      color: 'white',
      fontSize: 10,
      fontFamily: 'monospace',
    })
    debugText.add(text)
    app.add(debugText)

    // Start update loop
    app.on('update', update)
  }

  function update(dt) {
    if (!player) return

    // Check player velocity to detect sprinting (passive detection)
    const velocity = player.getLinearVelocity ? player.getLinearVelocity(new Vector3()) : new Vector3()
    const speed = velocity.length()
    const grounded = isGrounded()

    // Detect sprinting based on speed threshold and grounded state
    const isSprintingForward = speed > SPRINT_SPEED_THRESHOLD && grounded

    // Get joystick data for debug display only
    const stickX = 0 // Not used for logic, just debug
    const stickZ = 0
    const isActive = false

    let debugInfo = 'SUPER RUN DEBUG\n'
    debugInfo += 'Mobile: ' + isMobile + '\n'
    debugInfo += 'Speed: ' + speed.toFixed(2) + ' m/s\n'
    debugInfo += 'Grounded: ' + (grounded ? 'YES' : 'no') + '\n'
    debugInfo += 'Sprinting: ' + (isSprintingForward ? 'YES' : 'no') + '\n'
    debugInfo += 'RunTime: ' + runTime.toFixed(2) + 's\n'
    debugInfo += 'SuperActive: ' + (superActive ? 'YES' : 'no')

    debugText.children[0].props.value = debugInfo
    debugText.children[0].props.color = isSprintingForward ? '#00ff00' : '#ffffff'

    if (isSprintingForward) {
      runTime += dt
      if (runTime >= SUPER_RUN_CONFIG.activationTime && !superActive) {
        superActive = true
        const emoteUrl = superRunEmote?.url || ''
        player.applyEffect({
          emote: emoteUrl,
          duration: null,
          cancellable: false,
        })
      }
    } else {
      if (superActive) {
        const emoteUrl = superRunEmote?.url || ''
        player.applyEffect({
          emote: emoteUrl,
          duration: deactivationTime || 0.5,
          cancellable: true,
        })
        superActive = false
      }
      runTime = 0
    }

    if (superActive && isSprintingForward) {
      const dir = getForwardDirection(tempVec)
      player.push(dir.multiplyScalar(SUPER_RUN_CONFIG.extraSpeed * dt))
    }
  }
}
