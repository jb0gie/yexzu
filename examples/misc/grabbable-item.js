// grabbable-item v3 — pick up an app and hold it in your hand (client-authoritative)
// E = pick up, G = drop. Works solo; server sync comes later.
// If your console doesn't print "[grabbable-item] v3 loaded" on world join, the script is stale.

const MIN_HOLD_DISTANCE = 3
console.log('[grabbable-item] v3 loaded')

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
    let control = null
    let holding = false

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
      holding = true
      control = myApp.control()
    }

    function release() {
      holding = false
      control?.release()
      control = null
      const pos = getLocalPosition()
      if (pos) {
        myApp.position.set(pos.x, pos.y, pos.z)
      }
      console.log('[grabbable-item] dropped')
    }

    // bind keys on app control (APP priority)
    control = myApp.control()
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

    // while held, pin model to rightHand bone (sword lateUpdate pattern)
    app.on('lateUpdate', () => {
      if (!holding) return
      try {
        const player = world.getPlayer()
        const matrix = player?.getBoneTransform?.('rightHand')
        if (matrix) {
          model.position.setFromMatrixPosition(matrix)
          model.quaternion.setFromRotationMatrix(matrix)
        }
      } catch (err) {
        // bone not ready yet; keep last transform
      }
    })

    app.on('destroy', () => {
      control?.release()
    })
  }
}
