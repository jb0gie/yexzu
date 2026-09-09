// grabbable-item v6 — pick up an app and hold it in front of you (telekinesis style)
// E = pick up, G = drop. Works solo; server sync comes later.
// If your console doesn't print "[grabbable-item] v6 loaded" on world join, the script is stale.

const MIN_HOLD_DISTANCE = 3
// how far in front of the player the tablet floats (meters)
const CARRY_DISTANCE = 1.5
// how high above eye level the tablet floats (meters)
const CARRY_HEIGHT = 1.4
// how far in front of the player the tablet drops (meters)
const DROP_DISTANCE = 1
// how high above the player's feet the tablet drops (meters)
const DROP_HEIGHT = 0.1

console.log('[grabbable-item] v6 loaded')

// find the model node: GLB nodes are matched by id (the node name in the glb), not .name
// NOTE: app.root is undefined in app scripts — use app.get(id) / app.children
const model =
  app.get('Tablet') ||
  (app.children || []).find(c => c.id && c.id !== 'node') ||
  app.children?.[0] ||
  null

if (!model) {
  console.error('[grabbable-item] no model child found — app has no children')
} else {
  if (world.isClient) {
    const myApp = app // SES: capture app proxy for closures
    let holding = false
    let handModel = null // the clone that rides in front of player

    function getLocalPosition() {
      // proxy .position can blow up if the player entity isn't fully built — read defensively
      try {
        const player = world.getPlayer()
        if (!player) return null
        const pos = player.position
        if (!pos || typeof pos.x !== 'number') return null
        return pos
      } catch (err) {
        console.log('[grabbable-item] position read failed:', err?.message || err)
        return null
      }
    }

    function claim() {
      const pos = getLocalPosition()
      if (!pos) return console.log('[grabbable-item] no local player position — cannot grab')
      const dist = pos.distanceTo(myApp.position)
      console.log('[grabbable-item] grab attempt, distance:', dist.toFixed(2))
      if (dist > MIN_HOLD_DISTANCE) return console.log('[grabbable-item] too far, walk closer')
      // pistol pattern: clone the model into the world, hide the original
      handModel = model.clone(true)
      handModel.position.setFromMatrixPosition(model.matrixWorld || model.matrix)
      handModel.quaternion.copy(model.quaternion)
      world.add(handModel)
      model.active = false
      holding = true
      console.log('[grabbable-item] claimed — clone pinned to hand')
    }

    function release() {
      holding = false
      if (handModel) {
        // compute drop position: forward from camera (or player) + up
        const pos = getLocalPosition()
        if (pos) {
          try {
            const player = world.getPlayer()
            // prefer camera forward if available
            let forward
            if (world.camera) {
              forward = new Vector3(0, 0, -1).applyQuaternion(world.camera.quaternion)
            } else {
              forward = new Vector3(0, 0, -1).applyQuaternion(player.quaternion)
            }
            forward.y = 0
            if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1)
            forward.normalize()
            const dropPos = handModel.position.clone()
              .add(forward.multiplyScalar(DROP_DISTANCE))
            dropPos.y = pos.y + DROP_HEIGHT // land near the ground, not at held height
            myApp.position.copy(dropPos)
          } catch (err) {
            // fallback: drop 1m in front on X axis, 0.5m up
            myApp.position.set(pos.x + 1, pos.y + DROP_HEIGHT, pos.z)
          }
        }
        world.remove(handModel)
        handModel = null
      }
      model.active = true
      console.log('[grabbable-item] dropped in front of player')
    }

    // bind keys ONCE at init with PLAYER priority (0) to avoid stealing movement/write
    const control = myApp.control({ priority: 0 }) // PLAYER priority
    control.keyE.onPress = () => {
      if (holding) return
      console.log('[grabbable-item] keydown: E')
      claim()
    }
    control.keyG.onPress = () => {
      if (!holding) return
      console.log('[grabbable-item] keydown: G')
      release()
    }

    // while held, position the clone in front of the player at eye height, facing camera yaw
    myApp.on('lateUpdate', () => {
      if (!holding || !handModel) return
      try {
        const player = world.getPlayer()
        if (!player) return
        // get forward vector from camera if available, else from player yaw only
        let forward
        if (world.camera) {
          forward = new Vector3(0, 0, -1).applyQuaternion(world.camera.quaternion)
        } else {
          forward = new Vector3(0, 0, -1).applyQuaternion(player.quaternion)
        }
        // zero out pitch/roll for level carry
        forward.y = 0
        if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1)
        forward.normalize()
        const targetPos = player.position.clone()
          .add(forward.multiplyScalar(CARRY_DISTANCE))
          .add(new Vector3(0, CARRY_HEIGHT, 0))
        handModel.position.copy(targetPos)
        // orientation: keep upright, face same yaw as camera/player (no tilt)
        const yaw = Math.atan2(forward.x, forward.z)
        handModel.rotation.set(0, yaw, 0)
      } catch (err) {
        // keep last transform
      }
    })

    myApp.on('destroy', () => {
      control?.release()
      if (handModel) world.remove(handModel)
    })
  }
}