// grabbable-item — pick up an app and hold it in your hand (client-authoritative for now)
// E = pick up, G = drop. No server round-trip: grab happens locally so it works solo.
// Server sync (other players seeing the held item) goes back in once the feel is right.

const MIN_HOLD_DISTANCE = 3 // how close you must be to pick it up

// find the model node: GLB nodes are matched by id (the node name in the glb), not .name
const model =
  app.get('Tablet') ||
  (app.root?.children || []).find(c => c.id && c.id !== 'node') ||
  app.root?.children?.[0] ||
  null

if (!model) {
  console.error('[grabbable-item] no model child found — app has no children')
} else {
  if (world.isClient) {
    let control = null
    let holding = false
    let worldMatrix = null // remember where it came from so drop puts it back
    let originalParent = null

    function claim() {
      const player = world.getPlayer()
      const dist = player.position.distanceTo(app.root.position)
      console.log('[grabbable-item] grab attempt, distance:', dist.toFixed(2))
      if (dist > MIN_HOLD_DISTANCE) return console.log('[grabbable-item] too far, walk closer')
      holding = true
      control = app.control()
      // remember original spot
      worldMatrix = model.getWorldMatrix ? model.getWorldMatrix().clone() : null
      originalParent = model.parent
      // detach and track the hand bone in lateUpdate
    }

    function release() {
      holding = false
      control?.release()
      control = null
      const player = world.getPlayer()
      if (player) {
        // drop at the player's feet
        app.root.position.set(player.position.x, player.position.y, player.position.z)
      }
      console.log('[grabbable-item] dropped')
    }

    const localPlayer = world.getPlayer()
    if (localPlayer.local) {
      control = app.control()
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
    }

    // while held, pin model to rightHand bone (sword lateUpdate pattern)
    app.on('lateUpdate', () => {
      if (!holding) return
      const player = world.getPlayer()
      const matrix = player.getBoneTransform('rightHand')
      if (matrix) {
        model.position.setFromMatrixPosition(matrix)
        model.quaternion.setFromRotationMatrix(matrix)
      }
    })

    app.on('destroy', () => {
      control?.release()
    })
  }
}
