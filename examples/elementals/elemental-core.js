/**
 * Elemental Core
 *
 * - ItemRegistry
 * - ItemDB
 * - ActionBar
 * - Backpack
 *
 */

if (world.isServer) {
  const specs = {
    // [itemId]: { id, icon, name, desc, stack }
  }
  const invs = {
    // [playerId]: {
    //   active: 0,
  }
  //   items: [{ id, qty }],
  // }
  function getInv(playerId) {
    let inv = invs[playerId]
    if (!inv) {
      const key = `elemental-core:items:${playerId}`
      // world.set(key, null)
      inv = world.get(key) || {
        active: 0,
        items: new Array(20).fill(null),
      }
      invs[playerId] = inv
    }
    return inv
  }
  function save(playerId) {
    const inv = getInv(playerId)
    const key = `elemental-core:items:${playerId}`
    world.set(key, inv)
    console.log('saving', playerId, inv)
  }
  // when players enter send them their inventory
  world.on('enter', e => {
    const inv = getInv(e.playerId)
    app.sendTo(e.playerId, 'init', {
      specs,
      ...inv,
    })
    // let active item know to activate for player
    const item = inv.items[inv.active]
    if (item) {
      app.emit(`elemental-core:activate:${item.id}`, e.playerId)
    }
  })
  // listen for new or modified items
  world.on('elemental-item:spec', spec => {
    // update specs on client
    specs[spec.id] = spec
    app.send('spec', spec)
    // find players that currently have this item active
    // and let the item know to activate for that player
    for (const playerId in invs) {
      const inv = invs[playerId]
      const item = inv.items[inv.active]
      if (item && item.id === spec.id) {
        app.emit(`elemental-core:activate:${spec.id}`, playerId)
      }
    }
  })
  // listen to player changing active slot
  app.on('active', (idx, playerId) => {
    const inv = getInv(playerId)
    if (inv.active === idx) return
    const currItem = inv.items[inv.active]
    if (currItem) {
      app.emit(`elemental-core:deactivate:${currItem.id}`, playerId)
    }
    inv.active = idx
    const newItem = inv.items[inv.active]
    if (newItem) {
      app.emit(`elemental-core:activate:${newItem.id}`, playerId)
    }
    save(playerId)
  })
  // listen to play moving items
  app.on('move', ([a, b], playerId) => {
    const inv = getInv(playerId)
    if (typeof a !== 'number') return console.error('player attempt to move but A is NaN')
    if (typeof b !== 'number') return console.error('player attempt to move but B is NaN')
    if (!inv.items[a]) return console.error('player attempt to move but A is nothing')
    const activeItemId = inv.items[inv.active]?.id
    const itemA = inv.items[a]
    const itemB = inv.items[b]
    // if A and B are the same and B can stack more, this is a fill!
    let didFill
    if (itemA.id === itemB?.id) {
      const spec = specs[itemA.id]
      const fill = Math.min(itemA.qty, spec.stack - itemB.qty)
      if (fill > 0) {
        itemA.qty -= fill
        itemB.qty += fill
        if (itemA.qty === 0) {
          inv.items[a] = null
        }
        didFill = true
      }
    }
    // otherwise its a swap!
    if (!didFill) {
      inv.items[a] = itemB
      inv.items[b] = itemA
    }
    app.sendTo(playerId, 'setItem', [a, inv.items[a]])
    app.sendTo(playerId, 'setItem', [b, inv.items[b]])
    // check if active item changed
    const newActiveItemId = inv.items[inv.active]?.id
    if (activeItemId !== newActiveItemId) {
      app.emit(`elemental-core:deactivate:${activeItemId}`, playerId)
      app.emit(`elemental-core:activate:${newActiveItemId}`, playerId)
    }
    save(playerId)
  })
  // listen to player dropping items
  app.on('drop', (_, playerId) => {
    const inv = getInv(playerId)
    const item = inv.items[inv.active]
    if (!item) return
    app.emit(`elemental-core:drop:${item.id}`, playerId)
  })
  // listen to items wanting to give items to players
  world.on('elemental-item:give', ([playerId, id, qty]) => {
    const inv = getInv(playerId)
    const spec = specs[id]
    if (!spec) return console.error('core has no spec for item:', id)
    const activeIsEmpty = !inv.items[inv.active]
    // distribute quantity into existing or new stacks
    const changed = new Set()
    for (let n = 0; n < qty; n++) {
      let idx = inv.items.findIndex(item => {
        return item && item.id === id && item.qty < spec.stack
      })
      if (idx === -1) {
        // no stack found, find next empty slot
        idx = inv.items.findIndex(item => !item)
        if (idx === -1) {
          return console.error('player has no room to receive item:', id)
        }
        inv.items[idx] = { id, qty: 0 }
      }
      inv.items[idx].qty++
      changed.add(idx)
    }
    // notify changes
    for (const idx of changed) {
      app.sendTo(playerId, 'setItem', [idx, inv.items[idx]])
    }
    // if players active slot was empty but now has an item, activate it
    if (activeIsEmpty && inv.items[inv.active]) {
      app.emit(`elemental-core:activate:${inv.items[inv.active].id}`, playerId)
    }
    // save changes
    save(playerId)
  })
  // listen and respond to balance queries
  world.on('elemental:balance-request', ([playerId, itemId]) => {
    const inv = getInv(playerId)
    let balance = 0
    for (const item of inv.items) {
      if (item && item.id === itemId) balance += item.qty
    }
    app.emit('elemental:balance-response', [playerId, itemId, balance])
  })
  world.on('elemental-item:take', ([playerId, itemId, qty]) => {
    const inv = getInv(playerId)
    // ensure we have enough
    let n = 0
    for (const item of inv.items) {
      if (item && item.id === itemId) n += item.qty
    }
    if (n < qty) return console.error(`core asked to take ${itemId}:${qty} but player only has ${n}`)
    // take from active first (if possible) then other slots
    const changed = new Set()
    let remaining = qty
    const activeItem = inv.items[inv.active]
    const activeItemId = activeItem?.id
    if (activeItem && activeItem.id === itemId) {
      const taken = Math.min(activeItem.qty, remaining)
      activeItem.qty -= taken
      remaining -= taken
      changed.add(inv.active)
      if (activeItem.qty === 0) {
        inv.items[inv.active] = null
      }
    }
    if (remaining > 0) {
      for (let i = 0; i < inv.items.length; i++) {
        const item = inv.items[i]
        if (!item) continue
        const taken = Math.min(item.qty, remaining)
        item.qty -= taken
        remaining -= taken
        changed.add(i)
        if (item.qty === 0) {
          inv.items[i] = null
        }
        if (remaining === 0) break
      }
    }
    // check if active item changed
    const newActiveItemId = inv.items[inv.active]?.id
    if (activeItemId !== newActiveItemId) {
      app.emit(`elemental-core:deactivate:${activeItemId}`, playerId)
      app.emit(`elemental-core:activate:${newActiveItemId}`, playerId)
    }
    // notify changes
    for (const idx of changed) {
      app.sendTo(playerId, 'setItem', [idx, inv.items[idx]])
    }
    save(playerId)
  })
  // when the app is destroyed or rebooted, let held items know to deactivate
  app.on('destroy', () => {
    for (const playerId in invs) {
      const inv = invs[playerId]
      const item = inv.items[inv.active]
      if (item) {
        app.emit(`elemental-core:deactivate:${item.id}`, playerId)
      }
    }
  })
  // request all item metadata
  app.emit('elemental-core:request-specs')
  // send existing players their inventory
  const players = world.getPlayers()
  for (const player of players) {
    const inv = getInv(player.id)
    app.sendTo(player.id, 'init', {
      specs,
      ...inv,
    })
    // let active item know to activate for player
    const item = inv.items[inv.active]
    if (item) {
      app.emit(`elemental-core:activate:${item.id}`, player.id)
    }
  }

  // Add clear storage function
  app.on('clear-storage', playerId => {
    console.log('[core] Clearing storage for player:', playerId)
    const key = `elemental-core:items:${playerId}`
    world.set(key, null)

    // Reset to empty inventory
    const emptyInv = {
      active: 0,
      items: new Array(20).fill(null),
    }
    invs[playerId] = emptyInv

    // Send updated inventory to client
    app.sendTo(playerId, 'init', {
      specs,
      ...emptyInv,
    })

    console.log('[core] Storage cleared for player:', playerId)
  })
  app.on('give', playerId => {
    // Give button functionality - could be used for testing
    console.log('[core] Give button pressed for player:', playerId)
  })
}

if (world.isClient) {
  const $bar = app.create('ui', {
    space: 'screen',
    pivot: 'bottom-center',
    position: [0.5, 1, 0],
    offset: [0, -40, 0],
    width: 330,
    height: 70,
    padding: 5,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.8)',
  })
  const slots = []
  for (let i = 0; i < 5; i++) {
    const $item = app.create('uiview', {
      width: 70 - 5 - 5,
      height: 70 - 5 - 5,
      backgroundColor: 'rgba(255,255,255,0.07)',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: null,
      cursor: 'pointer',
    })
    $item.onPointerEnter = () => ($item.backgroundColor = 'rgba(255,255,255,0.1)')
    $item.onPointerLeave = () => ($item.backgroundColor = 'rgba(255,255,255,0.07)')
    $item.onPointerDown = () => select(i)
    $bar.add($item)
    const $img = app.create('uiimage', {
      // width: 70-5-5-1-1,
      // height: 70-5-5-1-1,
      // src: '/Frame 5.png',
      objectFit: 'cover',
      borderRadius: 5,
    })
    $item.add($img)
    const $qty = app.create('uitext', {
      absolute: true,
      right: 5,
      bottom: 5,
      width: 20,
      height: 20,
      color: 'white',
      fontSize: 12,
      fontWeight: 600,
      value: '',
    })
    $item.add($qty)
    slots.push({ $item, $img, $qty })
  }
  world.add($bar)
  const $backpack = app.create('ui', {
    space: 'screen',
    pivot: 'bottom-center',
    position: [0.5, 1, 0],
    offset: [0, -40 - 70 - 4, 0],
    width: 330,
    height: 200,
    padding: 5,
    borderRadius: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    backgroundColor: 'black',
  })
  for (let i = 5; i < 20; i++) {
    const $item = app.create('uiview', {
      width: 70 - 5 - 5,
      height: 70 - 5 - 5,
      backgroundColor: 'rgba(255,255,255,0.07)',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: null,
      cursor: 'pointer',
    })
    $item.onPointerEnter = () => ($item.backgroundColor = 'rgba(255,255,255,0.1)')
    $item.onPointerLeave = () => ($item.backgroundColor = 'rgba(255,255,255,0.07)')
    $item.onPointerDown = () => select(i)
    $backpack.add($item)
    const $img = app.create('uiimage', {
      // width: 70-5-5-1-1,
      // height: 70-5-5-1-1,
      // src: '/Frame 5.png',
      objectFit: 'cover',
      borderRadius: 5,
    })
    $item.add($img)
    const $qty = app.create('uitext', {
      absolute: true,
      right: 5,
      bottom: 5,
      width: 20,
      height: 20,
      color: 'white',
      fontSize: 12,
      fontWeight: 600,
      value: '',
    })
    $item.add($qty)
    slots.push({ $item, $img, $qty })
  }
  let init
  let specs
  let items
  let active
  let open
  let control
  let selected = null
  function setActive(idx) {
    if (selected) {
      slots[selected].$item.borderColor = null
      selected = null
    }
    active = idx
    for (let i = 0; i < 5; i++) {
      const slot = slots[i]
      slot.$item.borderColor = i === idx ? 'rgba(255,255,255,0.4)' : null
      app.send('active', idx)
    }
  }
  function toggleBackpack() {
    select(null)
    open = !open
    if (open) {
      world.add($backpack)
      control.pointer.unlock()
    } else {
      world.remove($backpack)
      control.pointer.lock()
    }
  }
  function select(idx) {
    // if selecting nothing, clear it
    if (selected !== null && idx === null) {
      slots[selected].$item.borderColor = selected === active ? 'rgba(255,255,255,0.4)' : null
      selected = null
    }
    // if first selection, select!
    else if (selected === null && idx !== null && items[idx]) {
      selected = idx
      slots[idx].$item.borderColor = 'white'
    }
    // if second selection is same, deselect!
    else if (selected !== null && idx !== null && selected === idx) {
      slots[idx].$item.borderColor = idx === active ? 'rgba(255,255,255,0.4)' : null
      selected = null
    }
    // if second selection, move!
    else if (selected !== null && idx !== null) {
      app.send('move', [selected, idx])
      slots[selected].$item.borderColor = selected === active ? 'rgba(255,255,255,0.4)' : null
      selected = null
    }
  }
  app.on('init', data => {
    init = true
    console.log('<- init', data)
    specs = data.specs
    items = data.items
    active = data.active
    for (let i = 0; i < items.length; i++) {
      const slot = slots[i]
      if (!slot) {
        console.warn('todo: slot', i)
        continue
      }
      const item = items[i]
      if (item) {
        const spec = specs[item.id]
        if (spec && spec.icon) {
          slot.$img.src = spec.icon
        } else {
          slot.$img.src = null
          console.warn('[core] No spec or icon found for item:', item.id)
        }
        slot.$qty.value = item.qty > 1 ? item.qty : ''
      } else {
        slot.$img.src = null
        slot.$qty.value = ''
      }
    }
    setActive(data.active)
    control?.release()
    control = app.control()
    control.digit1.onPress = () => setActive(0)
    control.digit2.onPress = () => setActive(1)
    control.digit3.onPress = () => setActive(2)
    control.digit4.onPress = () => setActive(3)
    control.digit5.onPress = () => setActive(4)
    control.keyB.onPress = () => toggleBackpack()
    control.keyQ.onPress = () => app.send('drop')
  })
  app.on('spec', spec => {
    if (!init) return
    console.log('<- spec', spec)
    specs[spec.id] = spec
    for (let i = 0; i < 20; i++) {
      const item = items[i]
      if (item && item.id === spec.id) {
        slots[i].$img.src = spec.icon
      }
    }
  })
  app.on('setItem', ([idx, item]) => {
    if (!init) return
    console.log('setItem', idx, item)
    items[idx] = item
    if (item) {
      const spec = specs[item.id]
      if (spec && spec.icon) {
        slots[idx].$img.src = spec.icon
      } else {
        slots[idx].$img.src = null
        console.warn('[core] No spec or icon found for item:', item.id)
      }
      slots[idx].$qty.value = item.qty > 1 ? item.qty : ''
    } else {
      slots[idx].$img.src = null
      slots[idx].$qty.value = ''
    }
    console.log('items', items)
  })
  app.on('update', delta => {
    if (!init) return
    if (control.pointer.locked && open) {
      toggleBackpack()
    }
  })
}

// App Configuration
app.configure([
  {
    key: 'clearStorage',
    type: 'button',
    label: 'Clear World Storage',
    onClick: () => {
      const player = world.getPlayer()
      app.send('clear-storage', player.id)
    },
  },
])

return

if (world.isClient) {
  const inv = createInventory()
  // wait for server to give us inventory
  app.on('init', data => {
    inv.init(data)
    console.log('init', data)
    const control = app.control()
    // number keys to switch active item
    control.digit1.onPress = () => {
      inv.setActive(0)
      app.send('active', 0)
    }
    control.digit2.onPress = () => {
      inv.setActive(1)
      app.send('active', 1)
    }
    control.digit3.onPress = () => {
      inv.setActive(2)
      app.send('active', 2)
    }
    control.digit4.onPress = () => {
      inv.setActive(3)
      app.send('active', 3)
    }
    control.digit5.onPress = () => {
      inv.setActive(4)
      app.send('active', 4)
    }
    // B to toggle bag
    control.keyB.onPress = () => {
      inv.toggleBag()
    }
    // Q to request item drop
    control.keyQ.onPress = () => {
      app.send('drop')
    }
  })
  // listen to item changes from server and update UI
  app.on('setItem', ([idx, item]) => {
    inv.setItem(idx, item)
  })
}

function createInventory() {
  const bar = app.create('ui', {
    space: 'screen',
    width: 400,
    height: 100,
    pivot: 'bottom-center',
    position: [0.5, 1, 0],
    offset: [0, -20, 0],
    flexDirection: 'row',
  })
  app.add(bar)
  const bagBtn = app.create('ui', {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    space: 'screen',
    width: 50,
    height: 50,
    pivot: 'bottom-right',
    position: [1, 1, 0],
    offset: [-50, -45, 0],
    cursor: 'pointer',
  })
  bagBtn.onPointerEnter = () => {
    bagBtn.backgroundColor = 'rgba(0, 0, 0, 0.8)'
  }
  bagBtn.onPointerLeave = () => {
    bagBtn.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  }
  bagBtn.onPointerDown = () => {
    toggleBag()
  }
  // app.add(bagBtn)
  const bag = app.create('ui', {
    backgroundColor: 'rgba(0, 0, 0, 1)',
    borderRadius: 10,
    space: 'screen',
    width: 315,
    height: 390,
    padding: 10,
    pivot: 'bottom-right',
    position: [1, 1, 0],
    offset: [-50, -110, 0],
    flexWrap: 'wrap',
    gap: 5,
  })
  // app.add(bag) // debug open
  const slots = []
  for (let idx = 0; idx < 25; idx++) {
    if (idx < 5) {
      const slot = addBarSlot({ parent: bar, idx })
      slots.push(slot)
    } else {
      const slot = addBagSlot({ parent: bag, idx })
      slots.push(slot)
    }
  }
  function init(data) {
    setActive(data.active)
    for (let idx = 0; idx < data.items.length; idx++) {
      const item = data.items[idx]
      slots[idx].setItem(item)
    }
  }
  let active = null
  function setActive(idx) {
    if (active === idx) return
    active = idx
    for (let idx = 0; idx < 5; idx++) {
      slots[idx].setActive(false)
    }
    slots[idx].setActive(true)
  }
  let bagVisible = false
  function toggleBag(value) {
    value = value === true || value === false ? value : !bagVisible
    if (bagVisible === value) return
    bagVisible = value
    if (bagVisible) {
      world.add(bag)
    } else {
      world.remove(bag)
    }
  }
  function setItem(idx, item) {
    slots[idx].setItem(item)
  }
  return {
    init,
    setActive,
    setItem,
    toggleBag,
  }
}

function addBarSlot({ parent, idx }) {
  let active = false
  const labelValue = idx + 1
  const root = app.create('uiview', {
    // backgroundColor: 'blue',
    width: 70,
    height: 90,
    margin: 5,
  })
  parent.add(root)
  const square = app.create('uiview', {
    width: 70,
    height: 70,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    cursor: 'pointer',
    borderWidth: 1,
    // borderColor: 'rgba(255, 255, 255, 1)',
  })
  square.onPointerEnter = () => {
    square.backgroundColor = 'rgba(0, 0, 0, 0.8)'
  }
  square.onPointerLeave = () => {
    square.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  }
  // square.onPointerDown = () => {
  //   onClick(idx)
  // }
  root.add(square)
  const img = app.create('uiimage', {
    width: 66,
    height: 66,
    src: null,
    borderRadius: 8,
  })
  square.add(img)
  const btm = app.create('uiview', {
    // backgroundColor: 'black',
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  })
  root.add(btm)
  const label = app.create('uitext', {
    color: 'white',
    textAlign: 'center',
    fontWeight: 500,
    value: labelValue,
  })
  btm.add(label)
  return {
    setActive: value => {
      if (active === value) return
      active = value
      square.borderColor = active ? 'rgba(255, 255, 255, 1)' : null
    },
    setItem: item => {
      // console.log('setItem', idx, item)
      img.src = item?.icon || null
    },
  }
}

function addBagSlot({ parent, idx }) {
  const square = app.create('uiview', {
    width: 70,
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    // borderWidth: 1,
    // borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    cursor: 'pointer',
    borderWidth: 1,
    // borderColor: 'rgba(255, 255, 255, 1)',
  })
  square.onPointerEnter = () => {
    square.backgroundColor = 'rgba(255, 255, 255, 0.1)'
  }
  square.onPointerLeave = () => {
    square.backgroundColor = 'rgba(255, 255, 255, 0.07)'
  }
  // square.onPointerDown = () => {
  //   onClick(idx)
  // }
  parent.add(square)
  const img = app.create('uiimage', {
    width: 66,
    height: 66,
    src: null,
    borderRadius: 8,
  })
  square.add(img)
  return {
    setItem: item => {
      // ...
    },
  }
}

// ===== PROCEDURAL LOCOMOTION & AIMING API =====
if (world.isClient) {
  console.log('[locomotion-api] ✓ Initializing locomotion API system')

  const locomotionAPI = {
    // Active aiming states per player
    aimingStates: new Map(), // playerId -> { active, intensity, targetBones }

    // Camera zoom/ADS system
    zoomStates: new Map(), // playerId -> { current, target, levels, levelIndex }

    /**
     * Initialize locomotion system for a player
     * @param {string} playerId - Player ID
     */
    init(playerId) {
      if (!this.aimingStates.has(playerId)) {
        this.aimingStates.set(playerId, {
          active: false,
          intensity: 0,
          targetIntensity: 0,
          targetBones: {}
        })
      }

      if (!this.zoomStates.has(playerId)) {
        this.zoomStates.set(playerId, {
          current: 1.5, // Default third-person distance
          target: 1.5,
          levels: [1.5, 1.0, 0.5, 0.3], // Configurable zoom levels
          levelIndex: 0,
          transitionSpeed: 8.0
        })
      }
    },

    /**
     * Set zoom levels for a player
     * @param {string} playerId - Player ID  
     * @param {Array<number>} levels - Array of zoom distances
     */
    setZoomLevels(playerId, levels) {
      const state = this.zoomStates.get(playerId)
      if (state) {
        state.levels = [...levels]
        state.levelIndex = 0
        state.target = state.levels[0]
      }
    },

    /**
     * Cycle to next zoom level
     * @param {string} playerId - Player ID
     * @returns {number} New zoom level
     */
    cycleZoom(playerId) {
      const state = this.zoomStates.get(playerId)
      if (!state) return 1.5

      state.levelIndex = (state.levelIndex + 1) % state.levels.length
      state.target = state.levels[state.levelIndex]

      return state.target
    },

    /**
     * Get current zoom level
     * @param {string} playerId - Player ID
     * @returns {number} Current zoom distance
     */
    getZoom(playerId) {
      const state = this.zoomStates.get(playerId)
      return state ? state.current : 1.5
    },

    /**
     * Update zoom (called in update loop)
     * @param {string} playerId - Player ID
     * @param {number} delta - Delta time
     */
    updateZoom(playerId, delta) {
      const state = this.zoomStates.get(playerId)
      if (!state) return

      // Smooth interpolation to target zoom
      const diff = state.target - state.current
      if (Math.abs(diff) > 0.001) {
        state.current += diff * state.transitionSpeed * delta
      } else {
        state.current = state.target
      }

      // Update camera zoom (control.camera.zoom)
      const player = world.getPlayer(playerId)
      if (player) {
        const control = app.control()
        if (control && control.camera) {
          control.camera.zoom = state.current
        }
      }
    },

    /**
     * Start aiming for a player
     * @param {string} playerId - Player ID
     * @param {Object} config - Aiming configuration
     *   - bones: Array of bone names to manipulate
     *   - maxRotations: Object with max rotation per bone (in radians)
     *   - transitionSpeed: Speed of aim transition
     */
    startAiming(playerId, config = {}) {
      const state = this.aimingStates.get(playerId)
      if (!state) return

      state.active = true
      state.targetIntensity = 1.0
      state.config = {
        bones: config.bones || ['spine', 'chest', 'neck', 'head', 'leftUpperArm', 'rightUpperArm'],
        maxRotations: config.maxRotations || {
          spine: { x: 0.1, y: 0.2 },
          chest: { x: 0.15, y: 0.25 },
          neck: { x: 0.1, y: 0.15 },
          head: { x: 0.2, y: 0.3 },
          leftUpperArm: { x: -0.3, y: 0 },
          rightUpperArm: { x: -0.3, y: 0 }
        },
        transitionSpeed: config.transitionSpeed || 5.0
      }
    },

    /**
     * Stop aiming for a player
     * @param {string} playerId - Player ID
     */
    stopAiming(playerId) {
      const state = this.aimingStates.get(playerId)
      if (!state) return

      state.targetIntensity = 0.0
      // Will transition out, then set active = false when intensity reaches 0
    },

    /**
     * Set aiming intensity (0-1)
     * @param {string} playerId - Player ID
     * @param {number} intensity - Target intensity (0-1)
     */
    setAimIntensity(playerId, intensity) {
      const state = this.aimingStates.get(playerId)
      if (!state) return

      state.targetIntensity = Math.max(0, Math.min(1, intensity))
    },

    /**
     * Update aiming bones (called in update loop)
     * @param {string} playerId - Player ID
     * @param {number} delta - Delta time
     */
    updateAiming(playerId, delta) {
      const state = this.aimingStates.get(playerId)
      if (!state) return

      const player = world.getPlayer(playerId)
      if (!player) return

      // Smooth intensity transition
      const intensityDiff = state.targetIntensity - state.intensity
      if (Math.abs(intensityDiff) > 0.001) {
        state.intensity += intensityDiff * (state.config?.transitionSpeed || 5.0) * delta
      } else {
        state.intensity = state.targetIntensity
      }

      // If fully transitioned out, deactivate and reset bones
      if (state.intensity <= 0.001 && state.targetIntensity === 0) {
        state.active = false
        state.intensity = 0
        // Reset all bone rotations to original
        if (state.config && state.config.bones) {
          for (const boneName of state.config.bones) {
            player.resetBoneRotation(boneName)
          }
        }
        return
      }

      if (!state.active || state.intensity <= 0) return

      // Get camera direction for aiming
      const control = app.control()
      if (!control || !control.camera) return

      const cameraDir = new Vector3(0, 0, -1)
      cameraDir.applyQuaternion(control.camera.quaternion)

      // Calculate aim angles from camera direction
      const aimYaw = Math.atan2(cameraDir.x, cameraDir.z)
      const aimPitch = Math.asin(-cameraDir.y)

      // Get player base rotation
      const playerYaw = Math.atan2(player.quaternion.x, player.quaternion.w) * 2

      // Calculate relative aim angles
      let relativeYaw = aimYaw - playerYaw
      // Normalize to -PI to PI
      while (relativeYaw > Math.PI) relativeYaw -= Math.PI * 2
      while (relativeYaw < -Math.PI) relativeYaw += Math.PI * 2

      const relativePitch = aimPitch

      // Apply bone rotations based on config
      if (state.config && state.config.bones) {
        // Debug log once per second
        if (!state._lastDebugLog || Date.now() - state._lastDebugLog > 1000) {
          console.log('[locomotion-api] Applying aim rotations - intensity:', state.intensity.toFixed(2))
          console.log('  relativePitch:', (relativePitch * 180 / Math.PI).toFixed(1), 'deg')
          console.log('  relativeYaw:', (relativeYaw * 180 / Math.PI).toFixed(1), 'deg')
          state._lastDebugLog = Date.now()
        }

        for (const boneName of state.config.bones) {
          const maxRot = state.config.maxRotations[boneName]
          if (!maxRot) continue

          // Calculate target rotation for this bone
          const targetX = relativePitch * maxRot.x * state.intensity
          const targetY = relativeYaw * maxRot.y * state.intensity

          // Create Euler rotation
          const euler = new Euler(targetX, targetY, 0, 'YXZ')

          // Apply additive bone rotation
          const result = player.addBoneRotation(boneName, euler)

          // Debug first application
          if (!state._debuggedBones) state._debuggedBones = new Set()
          if (!state._debuggedBones.has(boneName)) {
            console.log(`[locomotion-api] Applied rotation to ${boneName}:`, result ? 'SUCCESS' : 'FAILED')
            console.log(`  targetX: ${(targetX * 180 / Math.PI).toFixed(1)}°, targetY: ${(targetY * 180 / Math.PI).toFixed(1)}°`)
            state._debuggedBones.add(boneName)
          }

          // Store target rotations for debugging
          if (!state.targetBones[boneName]) {
            state.targetBones[boneName] = { x: 0, y: 0, z: 0 }
          }

          state.targetBones[boneName].x = targetX
          state.targetBones[boneName].y = targetY
        }
      }
    },

    /**
     * Get target bone rotations for a player
     * @param {string} playerId - Player ID
     * @returns {Object} Bone rotations object
     */
    getBoneRotations(playerId) {
      const state = this.aimingStates.get(playerId)
      return state ? state.targetBones : {}
    }
  }

  // Expose locomotion API globally for weapons to use
  world.on('elemental-core:get-locomotion-api', (callback) => {
    callback(locomotionAPI)
  })

  // Track which players have custom zoom control
  locomotionAPI.customZoomPlayers = new Set()

  // World configuration for default zoom behavior
  world.on('elemental-core:disable-default-zoom', (playerId) => {
    locomotionAPI.customZoomPlayers.add(playerId)
    console.log('[locomotion-api] ✓ Disabled default zoom for player:', playerId)
    console.log('[locomotion-api] Custom zoom players:', Array.from(locomotionAPI.customZoomPlayers))
  })

  world.on('elemental-core:enable-default-zoom', (playerId) => {
    locomotionAPI.customZoomPlayers.delete(playerId)
    console.log('[locomotion-api] ✓ Enabled default zoom for player:', playerId)
    console.log('[locomotion-api] Custom zoom players:', Array.from(locomotionAPI.customZoomPlayers))
  })

  // Check if a player has custom zoom control (for PlayerLocal to query)
  world.on('elemental-core:has-custom-zoom', (playerId, callback) => {
    const hasCustom = locomotionAPI.customZoomPlayers.has(playerId)
    console.log('[locomotion-api] Query has-custom-zoom for', playerId, '→', hasCustom)
    callback(hasCustom)
  })

  // Handle focal length requests from weapons
  world.on('pistol:set-focal-length', (data) => {
    console.log('[locomotion-api] Received focal length request:', data.focalLength, 'mm from', data.source)
    if (world.prefs && world.prefs.setFocalLength) {
      world.prefs.setFocalLength(data.focalLength)
      console.log('[locomotion-api] Applied focal length via world.prefs:', data.focalLength, 'mm')
    } else {
      console.warn('[locomotion-api] Could not access world.prefs.setFocalLength')
    }
  })

  // Auto-update for all players
  app.on('update', (delta) => {
    const players = world.getPlayers()
    for (const player of players) {
      if (locomotionAPI.aimingStates.has(player.id)) {
        locomotionAPI.updateAiming(player.id, delta)
        locomotionAPI.updateZoom(player.id, delta)
      }
    }
  })
}
