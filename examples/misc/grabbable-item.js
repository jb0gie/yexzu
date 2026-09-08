// grabbable-item — pick up an app and hold it in your hand, sword-style
// Clone of elemental-item-sword's equip path: server claims, client attaches to rightHand bone.
// Drop this script on the tablet app. E = pick up, G = drop.

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
  console.log('[grabbable-item] model found:', model.id, '| E to grab, G to drop')

  // state: who is holding it (server-authoritative)

  if (world.isServer) {
    app.state.holder = app.state.holder || null

    world.on(`grabbable-item:request:${app.instanceId}`, playerId => {
      if (app.state.holder) return // already held
      const player = world.getPlayer(playerId)
      if (!player) return
      const dist = player.position.distanceTo(app.root.position)
      if (dist > MIN_HOLD_DISTANCE) return
      app.state.holder = playerId
      app.send('held', playerId)
    })

    world.on(`grabbable-item:drop:${app.instanceId}`, playerId => {
      if (app.state.holder !== playerId) return
      const player = world.getPlayer(playerId)
      if (player) {
        app.state.position = [player.position.x, player.position.y, player.position.z]
      }
      app.state.holder = null
      app.send('dropped', app.state.position)
    })

    world.on('leave', e => {
      if (app.state.holder === e.playerId) {
        app.state.holder = null
        app.send('dropped', app.state.position || [0, 0, 0])
      }
    })
  }

  if (world.isClient) {
    let control = null
    let holding = false

    function attach(player) {
      holding = true
      control = app.control()
      // hide the world copy; we render it on the hand instead
      model.active = false
    }

    function detach() {
      holding = false
      control?.release()
      control = null
      model.active = true
      if (app.state.position) app.root.position.fromArray(app.state.position)
    }

    const holderId = app.state.holder
    const localPlayer = world.getPlayer()

    if (holderId && holderId === localPlayer.id) {
      attach(localPlayer)
    } else if (holderId) {
      model.active = false // someone else holds it
    }

    // pickup/drop keys
    if (localPlayer.local) {
      control = app.control()
      control.keyE.onPress = () => {
        console.log('[grabbable-item] keydown: E')
        if (holding) return
        app.emit(`grabbable-item:request:${app.instanceId}`, localPlayer.id)
        console.log('[grabbable-item] activate sent')
      }
      control.keyG.onPress = () => {
        console.log('[grabbable-item] keydown: G')
        if (!holding) return
        app.emit(`grabbable-item:drop:${app.instanceId}`, localPlayer.id)
      }
    }

    app.on('held', playerId => {
      const localPlayer = world.getPlayer()
      if (playerId === localPlayer.id) {
        attach(localPlayer)
      } else {
        model.active = false
      }
    })

    app.on('dropped', position => {
      detach()
      if (position) app.root.position.fromArray(position)
    })

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
