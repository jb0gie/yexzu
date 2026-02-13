app.configure([
  {
    key: 'audioFile',
    type: 'file',
    kind: 'audio',
    label: 'Audio File',
    description: 'Upload an audio file to play',
  },
  {
    key: 'autoPlay',
    type: 'switch',
    label: 'Auto Play on Load',
    options: [
      { label: 'Yes', value: 'enabled' },
      { label: 'No', value: 'disabled' },
    ],
    initial: 'disabled',
  },
])

if (!world.isClient) return

if (!props.audioFile?.url) {
  console.log('[Audio Reactivity] No audio file configured. Please add an audio file in app settings.')
}

const audio = app.create('audio', {
  src: props.audioFile?.url || null,
  loop: true,
})

const bassLight = app.create('light', {
  type: 'point',
  color: '#ff0000',
  intensity: 0.2,
  distance: 20,
})
bassLight.position.set(-3, 2, 0)

const midLight = app.create('light', {
  type: 'point',
  color: '#00ff00',
  intensity: 0.2,
  distance: 20,
})
midLight.position.set(0, 2, 0)

const trebleLight = app.create('light', {
  type: 'point',
  color: '#0000ff',
  intensity: 0.2,
  distance: 20,
})
trebleLight.position.set(3, 2, 0)

const floor = app.create('prim', {
  type: 'plane',
  size: [15, 15],
  color: '#111111',
  emissive: '#440044',
  emissiveIntensity: 0.1,
})
floor.position.set(0, 0, 0)

const bassCube = app.create('prim', {
  type: 'box',
  size: [1, 1, 1],
  color: '#222222',
  emissive: '#ff0000',
  emissiveIntensity: 0.1,
})
bassCube.position.set(-3, 0.5, 2)

const midSphere = app.create('prim', {
  type: 'sphere',
  size: [0.6],
  color: '#222222',
  emissive: '#00ff00',
  emissiveIntensity: 0.1,
})
midSphere.position.set(0, 0.6, 2)

const trebleCone = app.create('prim', {
  type: 'cone',
  size: [0.5, 1],
  color: '#222222',
  emissive: '#0000ff',
  emissiveIntensity: 0.1,
})
trebleCone.position.set(3, 0.5, 2)

app.add(audio)
app.add(bassLight)
app.add(midLight)
app.add(trebleLight)
app.add(floor)
app.add(bassCube)
app.add(midSphere)
app.add(trebleCone)

let isPlaying = false

function startAudio() {
  if (isPlaying) return
  if (!props.audioFile?.url) {
    console.log('[Audio Reactivity] No audio file configured')
    return
  }

  audio.play()
  isPlaying = true

  bassLight.linkAudioReactivity(audio.id, {
    band: 'bass',
    scale: 4,
    offset: 0.2,
  })

  midLight.linkAudioReactivity(audio.id, {
    band: 'mid',
    scale: 4,
    offset: 0.2,
  })

  trebleLight.linkAudioReactivity(audio.id, {
    band: 'treble',
    scale: 4,
    offset: 0.2,
  })

  floor.linkAudioReactivity(audio.id, {
    band: 'volume',
    scale: 0.8,
    offset: 0.1,
    property: 'emissiveIntensity',
  })

  bassCube.linkAudioReactivity(audio.id, {
    band: 'bass',
    scale: 3,
    offset: 0.1,
    property: 'emissiveIntensity',
  })

  midSphere.linkAudioReactivity(audio.id, {
    band: 'mid',
    scale: 3,
    offset: 0.1,
    property: 'emissiveIntensity',
  })

  trebleCone.linkAudioReactivity(audio.id, {
    band: 'treble',
    scale: 3,
    offset: 0.1,
    property: 'emissiveIntensity',
  })

  if (playAction) {
    playAction.label = 'Stop Audio'
  }
}

function stopAudio() {
  if (!isPlaying) return

  audio.stop()
  isPlaying = false

  bassLight.unlinkAudioReactivity()
  midLight.unlinkAudioReactivity()
  trebleLight.unlinkAudioReactivity()
  floor.unlinkAudioReactivity()
  bassCube.unlinkAudioReactivity()
  midSphere.unlinkAudioReactivity()
  trebleCone.unlinkAudioReactivity()

  bassLight.intensity = 0.2
  midLight.intensity = 0.2
  trebleLight.intensity = 0.2
  floor.emissiveIntensity = 0.1
  bassCube.emissiveIntensity = 0.1
  midSphere.emissiveIntensity = 0.1
  trebleCone.emissiveIntensity = 0.1

  if (playAction) {
    playAction.label = 'Start Audio'
  }
}

const playAction = app.create('action', {
  label: 'Start Audio',
  distance: 5,
  duration: 0.2,
  onTrigger: () => {
    if (isPlaying) {
      stopAudio()
    } else {
      startAudio()
    }
  },
})
app.add(playAction)

if (props.autoPlay === 'enabled') {
  startAudio()
}

app.on('destroy', () => {
  stopAudio()
})
