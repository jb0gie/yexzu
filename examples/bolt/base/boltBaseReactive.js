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

console.log('[Audio Reactivity] Initializing...')
console.log('[Audio Reactivity] AudioReactivity system:', world.audioReactivity ? 'available' : 'NOT available')

const audio = app.create('audio', {
  src: props.audioFile?.url || null,
  loop: true,
})
app.add(audio)

// Get a mesh from your GLB model
const mesh = app.get('MeshLOD0_2')
const meshMaterial = mesh?.material
const mesh2 = app.get('Coolant')
const meshMaterial2 = mesh2?.material

if (!mesh) {
  console.error('[Audio Reactivity] Could not find mesh named "MeshLOD0_2" in GLB model')
  console.log('[Audio Reactivity] Make sure your GLB has a mesh named "MeshLOD0_2"')
} else {
  console.log('[Audio Reactivity] Found mesh:', mesh.id)
  console.log('[Audio Reactivity] Mesh type:', mesh.name)
  console.log('[Audio Reactivity] Has material:', !!meshMaterial)
  console.log('[Audio Reactivity] Has linkAudioReactivity:', typeof mesh.linkAudioReactivity)
  if (meshMaterial) {
    console.log('[Audio Reactivity] Material emissiveIntensity:', meshMaterial.emissiveIntensity)
  }
}

// Debug mesh2
if (!mesh2) {
  console.error('[Audio Reactivity] Could not find mesh2 named "Coolant" in GLB model')
} else {
  console.log('[Audio Reactivity] Found mesh2:', mesh2.id)
  console.log('[Audio Reactivity] Mesh2 type:', mesh2.name)
  console.log('[Audio Reactivity] Mesh2 has material:', !!meshMaterial2)
  console.log('[Audio Reactivity] Mesh2 has linkAudioReactivity:', typeof mesh2.linkAudioReactivity)
}

let isPlaying = false

function startAudio() {
  if (isPlaying) return
  if (!props.audioFile?.url) {
    console.log('[Audio Reactivity] No audio file configured')
    return
  }
  if (!mesh) {
    console.log('[Audio Reactivity] No mesh available for audio reactivity')
    return
  }

  console.log('[Audio Reactivity] Starting audio...')
  console.log('[Audio Reactivity] Mesh:', mesh?.id)
  console.log('[Audio Reactivity] Mesh material:', mesh?.material ? 'found' : 'not found')
  console.log('[Audio Reactivity] Audio ID:', audio?.id)

  try {
    audio.play()
    isPlaying = true
    console.log('[Audio Reactivity] Audio playing, linking reactivity...')
  } catch (err) {
    console.error('[Audio Reactivity] Failed to play audio:', err.message)
    return
  }

  console.log('[Audio Reactivity] Linking meshes...')

  // Try linking immediately, then retry after delay if needed
  function tryLinkMeshes() {
    console.log('[Audio Reactivity] world.audioReactivity available:', !!world.audioReactivity)

    if (!world.audioReactivity) {
      console.log('[Audio Reactivity] System not ready, retrying in 500ms...')
      setTimeout(tryLinkMeshes, 500)
      return
    }

    // Make mesh emissive react to volume
    if (mesh) {
      mesh.linkAudioReactivity(audio.id, {
        band: 'volume',
        scale: 10,
        property: 'emissiveIntensity'
      })
      console.log('[Audio Reactivity] Linked mesh (emissiveIntensity)')
    }

    // Make mesh2 color react to treble
    if (mesh2) {
      mesh2.linkAudioReactivity(audio.id, {
        band: 'treble',
        scale: 20,
        property: 'color'
      })
      console.log('[Audio Reactivity] Linked mesh2 (color)')
    }
  }

  tryLinkMeshes()

  if (playAction) {
    playAction.label = 'Stop Audio'
  }
}

function stopAudio() {
  if (!isPlaying) return

  audio.stop()
  isPlaying = false

  if (mesh) {
    mesh.unlinkAudioReactivity()
  }

  if (playAction) {
    playAction.label = 'Start Audio'
  }
}

const playAction = app.create('action', {
  label: 'Start Audio',
  distance: 5,
  duration: 1,
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
  // Wait for audio node to be fully mounted before playing
  setTimeout(() => startAudio(), 100)
}

app.on('destroy', () => {
  stopAudio()
})
