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

  const player = world.getPlayer()
  const control = app.control()

  let runTime = 0
  let superActive = false

  const tempVec = new Vector3()
  const tempQuat = new Quaternion()
  const tempEuler = new Euler(0, 0, 0, 'YXZ')

  function getForwardDirection(outVec) {
    tempEuler.setFromQuaternion(control.camera.quaternion)
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

  const debugText = app.create('ui', {
    space: 'screen',
    position: [0, 0],
    offset: [20, 20],
    width: 400,
    height: 150,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 5,
    padding: 10,
  })
  const text = app.create('uitext', {
    value: 'Debug: Initializing...',
    color: 'white',
    fontSize: 10,
    fontFamily: 'monospace',
  })
  debugText.add(text)
  app.add(debugText)

  function isJoystickForward() {
    if (!isMobile || !control.touchStick) return false
    const stickX = control.touchStick.value?.x || 0
    const stickZ = control.touchStick.value?.z || 0
    const isJoystickActive = Math.abs(stickX) > 0.01 || Math.abs(stickZ) > 0.01
    return isJoystickActive && -stickZ > 0.3
  }

  app.on('update', dt => {
    const joystickForward = isJoystickForward()
    const grounded = isGrounded()
    const isSprintingForward =
      (isMobile ? joystickForward : control.keyW.down && (control.shiftLeft.down || control.shiftRight.down)) && grounded

    const stickX = control.touchStick?.value?.x || 0
    const stickZ = control.touchStick?.value?.z || 0
    const forwardAmount = -stickZ
    const isActive = Math.abs(stickX) > 0.01 || Math.abs(stickZ) > 0.01
    
    let debugInfo = 'SUPER RUN DEBUG\n'
    debugInfo += 'Mobile: ' + isMobile + '\n'
    debugInfo += 'Joystick: ' + (control.touchStick ? 'yes' : 'no') + '\n'
    debugInfo += 'Active: ' + (isActive ? 'YES' : 'no') + '\n'
    debugInfo += 'X: ' + stickX.toFixed(2) + ' Z: ' + stickZ.toFixed(2) + '\n'
    debugInfo += 'Forward: ' + forwardAmount.toFixed(2) + ' > 0.3\n'
    debugInfo += 'isForward: ' + (joystickForward ? 'YES' : 'no') + '\n'
    debugInfo += 'Grounded: ' + (grounded ? 'YES' : 'no') + '\n'
    debugInfo += 'Sprinting: ' + (isSprintingForward ? 'YES' : 'no') + '\n'
    debugInfo += 'RunTime: ' + runTime.toFixed(2) + 's'

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
  })
}