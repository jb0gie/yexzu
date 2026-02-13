export default function () {
  const audio = world.createNode('audio', {
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    loop: true,
  })

  const bassLight = world.createNode('light', {
    type: 'point',
    color: '#ff0000',
    intensity: 0.2,
    distance: 20,
    position: [-3, 2, 0],
  })

  const midLight = world.createNode('light', {
    type: 'point',
    color: '#00ff00',
    intensity: 0.2,
    distance: 20,
    position: [0, 2, 0],
  })

  const trebleLight = world.createNode('light', {
    type: 'point',
    color: '#0000ff',
    intensity: 0.2,
    distance: 20,
    position: [3, 2, 0],
  })

  const floor = world.createNode('prim', {
    type: 'plane',
    size: [15, 15],
    color: '#111111',
    emissive: '#440044',
    emissiveIntensity: 0.1,
    position: [0, 0, 0],
  })

  const bassCube = world.createNode('prim', {
    type: 'box',
    size: [1, 1, 1],
    color: '#222222',
    emissive: '#ff0000',
    emissiveIntensity: 0.1,
    position: [-3, 0.5, 2],
  })

  const midSphere = world.createNode('prim', {
    type: 'sphere',
    size: [0.6],
    color: '#222222',
    emissive: '#00ff00',
    emissiveIntensity: 0.1,
    position: [0, 0.6, 2],
  })

  const trebleCone = world.createNode('prim', {
    type: 'cone',
    size: [0.5, 1],
    color: '#222222',
    emissive: '#0000ff',
    emissiveIntensity: 0.1,
    position: [3, 0.5, 2],
  })

  app.configure([
    {
      key: 'autoPlay',
      type: 'switch',
      label: 'Auto Play on Load',
      options: [
        { label: 'Yes', value: 'enabled' },
        { label: 'No', value: 'disabled' },
      ],
      initial: 'enabled',
    },
  ])

  let isPlaying = false
  let playAction

  function startAudio() {
    if (isPlaying) return

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

  app.on('start', () => {
    if (app.props.autoPlay === 'enabled') {
      startAudio()
    }
  })

  playAction = app.create('action', {
    label: isPlaying ? 'Stop Audio' : 'Start Audio',
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

  world.add(audio)
  world.add(bassLight)
  world.add(midLight)
  world.add(trebleLight)
  world.add(floor)
  world.add(bassCube)
  world.add(midSphere)
  world.add(trebleCone)
  world.add(playAction)

  return () => {
    stopAudio()
    world.remove(audio)
    world.remove(bassLight)
    world.remove(midLight)
    world.remove(trebleLight)
    world.remove(floor)
    world.remove(bassCube)
    world.remove(midSphere)
    world.remove(trebleCone)
    world.remove(playAction)
  }
}
