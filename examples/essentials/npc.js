app.configure([
  {
    key: 'vrm',
    type: 'file',
    kind: 'avatar',
    label: 'Avatar',
  },
  {
    key: 'walkEmote',
    type: 'file',
    kind: 'emote',
    label: 'Walk Emote',
  },
  {
    key: 'runEmote',
    type: 'file',
    kind: 'emote',
    label: 'Run Emote',
  },
  {
    key: 'customEmote1',
    type: 'file',
    kind: 'emote',
    label: 'Custom Emote 1',
  },
  {
    key: 'customEmote2',
    type: 'file',
    kind: 'emote',
    label: 'Custom Emote 2',
  },
  {
    key: 'customEmote3',
    type: 'file',
    kind: 'emote',
    label: 'Custom Emote 3',
  },
  {
    key: 'customEmote4',
    type: 'file',
    kind: 'emote',
    label: 'Custom Emote 4',
  },
  {
    key: 'customEmote5',
    type: 'file',
    kind: 'emote',
    label: 'Custom Emote 5',
  },
  {
    key: 'block',
    type: 'toggle',
    label: 'Show Block',
    initial: false,
  },
])

const SEND_RATE = 0.33

const block = app.get('Block')
if (!app.config.block) {
  app.remove(block)
}

const emotes = [app.config.walkEmote?.url || null, app.config.runEmote?.url || null]
const walkEmoteIdx = 0
const runEmoteIdx = 1
const customEmoteIndices = []
function checkCustomEmote(n) {
  const key = `customEmote${n}`
  if (!app.config[key]) return
  const idx = emotes.length
  emotes.push(app.config[key].url)
  customEmoteIndices.push(idx)
}
checkCustomEmote(1)
checkCustomEmote(2)
checkCustomEmote(3)
checkCustomEmote(4)
checkCustomEmote(5)
console.log(emotes)

// npc avatars live on Cloudflare R2 (custom domain) - the old copies in
// src/world/assets/vrms are no longer referenced by this app
const VRM_BASE_URL = 'https://vrms.67420247.xyz'

// the 100 base avatar names in the bucket - half the picks add the _Voxel variant
const VRM_NAMES = [
  'Aesthetica',
  'AlwaysWatching',
  'Amazonas',
  'Anchor',
  'Angry',
  'Astrodisco',
  'Astronaut',
  'Avocado',
  'Bacondude',
  'Baldman',
  'BigBro',
  'Bloody',
  'Bullidan',
  'Butter',
  'CactusBoy',
  'CandyCane',
  'Cappy',
  'CaptainLobster',
  'Carrot',
  'Chad',
  'Chill',
  'Chilli',
  'Clown',
  'Coffee',
  'Confirmed',
  'Cookieman',
  'CoolAlien',
  'CoolBanana',
  'CoolChoco',
  'Crimsom',
  'Cubiq',
  'Cucumber',
  'David',
  'Devil',
  'DinoKid',
  'DisturbingEyes',
  'Dracula',
  'Eggplant',
  'Erika',
  'Expol',
  'Eyelids',
  'Ferk',
  'Franky',
  'Froggy',
  'Fungus',
  'Ghost',
  'GoodTomato',
  'HorrorNurse',
  'Hotdog',
  'Hugo',
  'IceCream',
  'Jennifer',
  'Jimmy',
  'Kate',
  'Kyle',
  'LilBro',
  'Lydia',
  'Mafiossini',
  'Mikel',
  'Milk',
  'Mint',
  'Mummy',
  'Muscary',
  'Mushy',
  'Nightmare',
  'Observer',
  'OldMoustache',
  'Olivia',
  'Pepo',
  'Pipe',
  'Polybot',
  'Polydancer',
  'Present',
  'Pumpkin',
  'Rabbit',
  'Retroman',
  'Ro',
  'Robert',
  'Rose',
  'SaintClaus',
  'Samuela',
  'Scarecrow',
  'Shiro',
  'Skelly',
  'Skull',
  'Snowy',
  'Sticker',
  'Teddy',
  'ToiletPaper',
  'Toothpaste',
  'Udom',
  'Wambo',
  'Watermelon',
  'WeirdFlexButOk',
  'WireFriend',
  'Witch',
  'Wizzir',
  'Wolfman',
  'XmasTree',
  'Zombie',
]

// resolve the npc avatar - a configured file wins, otherwise roll a random name + variant
function pickVrm() {
  const configured = app.config.vrm?.url
  if (configured) {
    const filename = (app.config.vrm.name || 'npc').replace(/\.vrm$/i, '')
    return { name: filename, url: configured }
  }
  const name = VRM_NAMES[num(0, VRM_NAMES.length - 1)]
  const variant = num(0, 1) === 1 ? '_Voxel' : ''
  return { name, url: `${VRM_BASE_URL}/${name}${variant}.vrm` }
}

if (world.isServer) {
  const state = app.state
  // pick the avatar once on the server - state syncs to every client so the npc looks the same for everyone
  const vrm = pickVrm()
  state.vrm = vrm.url
  state.name = vrm.name
  console.warn('[npc] avatar:', vrm.name, vrm.url)
  const ctrl = app.create('controller')
  ctrl.position.copy(app.position)
  world.add(ctrl)
  const v1 = new Vector3()
  let lastSend = 0
  // TODO: actions should have chance multipliers
  const actions = [
    () => {
      // emote
      const idx = customEmoteIndices[num(0, customEmoteIndices.length - 1)]
      let time = num(1, 5, 2)
      return delta => {
        state.e = idx
        time -= delta
        // console.log('emote', idx)
        return time <= 0
      }
    },
    () => {
      // move
      const angle = num(0, 360) * DEG2RAD
      const eul = new Euler(0, angle, 0, 'YXZ')
      const qua = new Quaternion().setFromEuler(eul)
      const direction = new Vector3(0, 0, -1)
      direction.applyQuaternion(qua)
      let time = num(1, 5, 2)
      const run = num(0, 1) === 1
      const speed = run ? 4 : 2
      return delta => {
        state.ry = angle
        v1.copy(direction).multiplyScalar(delta * speed)
        v1.y = -9.81
        ctrl.move(v1)
        state.px = ctrl.position.x
        state.py = ctrl.position.y
        state.pz = ctrl.position.z
        state.e = run ? runEmoteIdx : walkEmoteIdx
        time -= delta
        // console.log('walk', ctrl.position.toArray())
        return time <= 0
      }
    },
  ]
  function getAction() {
    return actions[num(0, actions.length - 1)]()
  }
  let action = getAction()
  app.on('fixedUpdate', delta => {
    const finished = action(delta)
    if (finished) action = getAction()
    lastSend += delta
    if (lastSend > SEND_RATE) {
      lastSend = 0
      app.send('change', [state.px, state.py, state.pz, state.ry, state.e])
    }
  })
  state.px = ctrl.position.x
  state.py = ctrl.position.y
  state.pz = ctrl.position.z
  state.ry = 0
  state.e = null
  state.ready = true
  app.send('init', state)
}

if (world.isClient) {
  if (app.state.ready) {
    init(app.state)
  } else {
    app.on('init', init)
  }
  function init(state) {
    // breadcrumb: which avatar this client is about to render
    console.warn('[npc] render:', state.name, state.vrm)
    const root = app.create('group')
    root.position.set(state.px, state.py, state.pz)
    const avatar = app.create('avatar', {
      src: state.vrm,
    })
    const nametag = app.create('nametag', {
      label: state.name,
    })
    avatar.rotation.y = state.ry
    avatar.onLoad = () => {
      nametag.position.y = avatar.getHeight() + 0.1
      root.add(nametag)
    }
    root.add(avatar)
    world.add(root)
    const position = new BufferedLerpVector3(root.position, SEND_RATE * 1.2)
    app.on('change', ([px, py, pz, ry, e]) => {
      position.push([px, py, pz])
      avatar.rotation.y = ry
      avatar.emote = emotes[e]
    })
    app.on('update', delta => {
      position.update(delta)
    })
  }
}
