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
  {
    key: 'mesh1',
    type: 'text',
    label: 'Mesh 1 Name',
    initial: 'MeshLOD0_2',
    description: 'Name of first mesh in GLB to apply audio reactivity',
  },
  {
    key: 'mesh1Property',
    type: 'switch',
    label: 'Mesh 1 Property',
    options: [
      { label: 'Emissive Intensity', value: 'emissiveIntensity' },
      { label: 'Color', value: 'color' },
      { label: 'Emissive Color', value: 'emissiveColor' },
    ],
    initial: 'emissiveIntensity',
  },
  {
    key: 'mesh1Band',
    type: 'switch',
    label: 'Mesh 1 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'volume',
  },
  {
    key: 'mesh1Scale',
    type: 'range',
    label: 'Mesh 1 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'mesh1Intensity',
    type: 'range',
    label: 'Mesh 1 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'mesh1Color',
    type: 'text',
    label: 'Mesh 1 Color (hex or name)',
    initial: '',
    description: 'Leave empty for heatmap, or use #ff0000, red, etc.',
  },
  {
    key: 'mesh2',
    type: 'text',
    label: 'Mesh 2 Name',
    initial: 'Coolant',
    description: 'Name of second mesh in GLB (leave empty to disable)',
  },
  {
    key: 'mesh2Property',
    type: 'switch',
    label: 'Mesh 2 Property',
    options: [
      { label: 'Emissive Intensity', value: 'emissiveIntensity' },
      { label: 'Color', value: 'color' },
      { label: 'Emissive Color', value: 'emissiveColor' },
    ],
    initial: 'color',
  },
  {
    key: 'mesh2Band',
    type: 'switch',
    label: 'Mesh 2 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'bass',
  },
  {
    key: 'mesh2Scale',
    type: 'range',
    label: 'Mesh 2 Scale',
    initial: 2,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'mesh2Intensity',
    type: 'range',
    label: 'Mesh 2 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'mesh2Color',
    type: 'text',
    label: 'Mesh 2 Color (hex or name)',
    initial: '',
    description: 'Leave empty for heatmap, or use #ff0000, red, etc.',
  },
])

if (!world.isClient) return

const audio = app.create('audio', {
  src: props.audioFile?.url || null,
  loop: true,
})
app.add(audio)

// Get meshes from props
const mesh1 = props.mesh1 ? app.get(props.mesh1) : null
const mesh2 = props.mesh2 ? app.get(props.mesh2) : null

let isPlaying = false

function buildLinkOptions(meshProps) {
  const options = {
    band: meshProps.band,
    scale: meshProps.scale,
    intensity: meshProps.intensity,
    property: meshProps.property,
  }

  // Add color if specified
  if (meshProps.color && meshProps.color.trim()) {
    options.color = meshProps.color.trim()
  }

  return options
}

function startAudio() {
  if (isPlaying) return
  if (!props.audioFile?.url) {
    console.log('[Audio Reactivity] No audio file configured')
    return
  }

  try {
    audio.play()
    isPlaying = true
  } catch (err) {
    console.error('[Audio Reactivity] Failed to play audio:', err.message)
    return
  }

  // Link mesh 1
  if (mesh1) {
    const options = buildLinkOptions({
      band: props.mesh1Band,
      scale: props.mesh1Scale,
      intensity: props.mesh1Intensity,
      property: props.mesh1Property,
      color: props.mesh1Color,
    })
    mesh1.linkAudioReactivity(audio.id, options)
    console.log('[Audio Reactivity] Linked mesh1:', props.mesh1, options)
  }

  // Link mesh 2
  if (mesh2) {
    const options = buildLinkOptions({
      band: props.mesh2Band,
      scale: props.mesh2Scale,
      intensity: props.mesh2Intensity,
      property: props.mesh2Property,
      color: props.mesh2Color,
    })
    mesh2.linkAudioReactivity(audio.id, options)
    console.log('[Audio Reactivity] Linked mesh2:', props.mesh2, options)
  }

  if (playAction) {
    playAction.label = 'Stop Audio'
  }
}

function stopAudio() {
  if (!isPlaying) return

  audio.stop()
  isPlaying = false

  if (mesh1) mesh1.unlinkAudioReactivity()
  if (mesh2) mesh2.unlinkAudioReactivity()

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
  setTimeout(() => startAudio(), 100)
}

app.on('destroy', () => {
  stopAudio()
})
