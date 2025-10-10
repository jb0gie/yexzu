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
    //   items: [{ id, qty }],
    // }
  }
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
    backgroundColor: 'black',
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
