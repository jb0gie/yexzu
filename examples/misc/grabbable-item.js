// grabbable-item v5 — pick up an app and hold it in your hand (client-authoritative)
// E = pick up, G = drop. Works solo; server sync comes later.
// If your console doesn't print "[grabbable-item] v5 loaded" on world join, the script is stale.

const MIN_HOLD_DISTANCE = 3
// fine-tune where the tablet sits relative to the hand (in hand space, meters)
const GRAB_OFFSET = { x: 0, y: 0.02, z: -0.05 }
// how far in front of the player the tablet drops (meters)
const DROP_DISTANCE = 1

console.log('[grabbable-item] v5 loaded')

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
    let handModel = null // the clone that rides the hand

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
        world.remove(handModel)
        handModel = null
      }
      model.active = true
      // drop 1m in front of the player, at foot level — never under the capsule
      const pos = getLocalPosition()
      if (pos) {
        try {
          const player = world.getPlayer()
          const forward = new Vector3(0, 0, -1).applyQuaternion(player.quaternion)
          forward.y = 0
          if (forward.lengthSq() < 0.001) forward.set(0, 0, -1)
          forward.normalize().multiplyScalar(DROP_DISTANCE)
          myApp.position.set(pos.x + forward.x, pos.y + 0.02, pos.z + forward.z)
        } catch (err) {
          myApp.position.set(pos.x + 1, pos.y + 0.02, pos.z)
        }
      }
      console.log('[grabbable-item] dropped in front of player')
    }

    // bind keys ONCE at init (APP priority) — never re-bind in claim/release,
    // re-binding breaks the camera-write handoff and kills player movement
    const control = myApp.control()
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

    // while held, pin the clone to the rightHand bone (pistol lateUpdate pattern)
    let boneWarned = false
    myApp.on('lateUpdate', () => {
      if (!holding || !handModel) return
      try {
        const player = world.getPlayer()
        const matrix = player?.getBoneTransform?.('rightHand')
        if (matrix) {
          if (!boneWarned) { console.log('[grabbable-item] rightHand bone OK — pinning clone'); boneWarned = true }
          handModel.position.setFromMatrixPosition(matrix)
          handModel.quaternion.setFromRotationMatrix(matrix)
          // apply grab offset in hand space
          if (GRAB_OFFSET.x || GRAB_OFFSET.y || GRAB_OFFSET.z) {
            const off = new Vector3(GRAB_OFFSET.x, GRAB_OFFSET.y, GRAB_OFFSET.z)
            off.applyQuaternion(handModel.quaternion)
            handModel.position.add(off)
          }
        } else {
          if (!boneWarned) {
            console.log('[grabbable-item] rightHand bone null — falling back to shoulder-height carry')
            boneWarned = true
          }
          const pos = getLocalPosition()
          if (pos) {
            handModel.position.set(pos.x, pos.y + 1.4, pos.z)
          }
        }
      } catch (err) {
        // bone not ready yet; keep last transform
      }
    })

    myApp.on('destroy', () => {
      control?.release()
      if (handModel) world.remove(handModel)
    })
  }
}
