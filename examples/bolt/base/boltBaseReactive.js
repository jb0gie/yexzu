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
    key: 'debugMode',
    type: 'switch',
    label: 'Debug Logging',
    options: [
      { label: 'Enabled', value: 'enabled' },
      { label: 'Disabled', value: 'disabled' },
    ],
    initial: 'disabled',
    description: 'Enable console logs for debugging',
  },
  {
    key: 'mesh1',
    type: 'text',
    label: 'Mesh 1 Name',
    initial: 'MeshLOD0_2',
    description: 'Name of first mesh in GLB to apply audio reactivity',
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
    type: 'color',
    label: 'Mesh 1 Color',
    initial: '#ff0000',
    description: 'Color for audio reactivity',
  },
  {
    key: 'mesh2',
    type: 'text',
    label: 'Mesh 2 Name',
    initial: 'Coolant',
    description: 'Name of second mesh in GLB (leave empty to disable)',
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
    type: 'color',
    label: 'Mesh 2 Color',
    initial: '#0000ff',
    description: 'Color for audio reactivity',
  },
  {
    key: 'screen',
    type: 'section',
    label: 'Screen Settings',
  },
  {
    key: 'video',
    type: 'file',
    kind: 'video',
    label: 'Upload Video',
  },
  {
    key: 'videoLink',
    type: 'text',
    label: 'Video Link (paste URL here)',
  },
  {
    key: 'defaultVolume',
    type: 'switch',
    label: 'Default Volume',
    options: [
      { label: 'Low', value: 1 },
      { label: 'Medium', value: 5 },
      { label: 'High', value: 10 }
    ],
    initial: 0,
  },
  {
    key: 'isSpatial',
    type: 'switch',
    label: 'Audio Type',
    options: [
      { label: 'Spatial (3D)', value: true },
      { label: 'Global', value: false }
    ],
    initial: true
  },
  {
    key: 'minDistance',
    type: 'number',
    label: 'Min Distance',
    initial: 5,
    min: 1,
    max: 50,
    description: 'Distance where audio starts to fade (in meters)'
  },
  {
    key: 'maxDistance',
    type: 'number',
    label: 'Max Distance',
    initial: 20,
    min: 1,
    max: 100,
    description: 'Distance where audio becomes inaudible (in meters)'
  },
  {
    key: 'rolloffFactor',
    type: 'switch',
    label: 'Falloff Rate',
    options: [
      { label: 'Gradual', value: 1 },
      { label: 'Medium', value: 2 },
      { label: 'Steep', value: 4 }
    ],
    initial: 2
  },
  {
    key: 'truss',
    type: 'section',
    label: 'Spinning Truss Settings',
  },
  {
    key: 'lowerTruss',
    type: 'text',
    label: 'Lower Truss Group',
    initial: 'LowerTruss',
    description: 'Name of group to spin (leave empty to disable)'
  },
  {
    key: 'lowerTrussSpeed',
    type: 'range',
    label: 'Lower Truss Speed',
    initial: 0.5,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'upperTruss',
    type: 'text',
    label: 'Upper Truss Group',
    initial: 'UpperTruss',
    description: 'Name of group to spin (leave empty to disable)'
  },
  {
    key: 'upperTrussSpeed',
    type: 'range',
    label: 'Upper Truss Speed',
    initial: -0.3,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'engineSection',
    type: 'section',
    label: 'Engine Settings',
  },
  {
    key: 'thrusterColor',
    type: 'color',
    label: 'Thruster Color',
    initial: '#ff4400',
  },
  {
    key: 'thrusterBand',
    type: 'switch',
    label: 'Thruster Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' }
    ],
    initial: 'bass'
  },
  {
    key: 'thrusterScale',
    type: 'range',
    label: 'Thruster Scale',
    initial: 8,
    min: 0.1,
    max: 50,
    step: 0.1
  },
  {
    key: 'thrusterIntensity',
    type: 'range',
    label: 'Thruster Intensity',
    initial: 2,
    min: 0.1,
    max: 10,
    step: 0.1
  },
  {
    key: 'engineInnerColor',
    type: 'color',
    label: 'Engine Inner Color',
    initial: '#00aaff',
  },
  {
    key: 'engineInnerBand',
    type: 'switch',
    label: 'Engine Inner Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' }
    ],
    initial: 'mid'
  },
  {
    key: 'engineInnerScale',
    type: 'range',
    label: 'Engine Inner Scale',
    initial: 5,
    min: 0.1,
    max: 50,
    step: 0.1
  },
  {
    key: 'engineInnerIntensity',
    type: 'range',
    label: 'Engine Inner Intensity',
    initial: 1.5,
    min: 0.1,
    max: 10,
    step: 0.1
  },
  {
    key: 'engineOuterColor',
    type: 'color',
    label: 'Engine Outer Color',
    initial: '#ffffff',
  },
  {
    key: 'engineOuterBand',
    type: 'switch',
    label: 'Engine Outer Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' }
    ],
    initial: 'volume'
  },
  {
    key: 'engineOuterScale',
    type: 'range',
    label: 'Engine Outer Scale',
    initial: 3,
    min: 0.1,
    max: 50,
    step: 0.1
  },
  {
    key: 'engineOuterIntensity',
    type: 'range',
    label: 'Engine Outer Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1
  },
  {
    key: 'tunnelSection',
    type: 'section',
    label: 'Tunnel Settings',
  },
  {
    key: 'tunnelColor',
    type: 'color',
    label: 'Tunnel Color',
    initial: '#aa00ff',
  },
  {
    key: 'tunnelBand',
    type: 'switch',
    label: 'Tunnel Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' }
    ],
    initial: 'bass'
  },
  {
    key: 'tunnelScale',
    type: 'range',
    label: 'Tunnel Scale',
    initial: 6,
    min: 0.1,
    max: 50,
    step: 0.1
  },
  {
    key: 'tunnelIntensity',
    type: 'range',
    label: 'Tunnel Intensity',
    initial: 1.5,
    min: 0.1,
    max: 10,
    step: 0.1
  },
  {
    key: 'fanSection',
    type: 'section',
    label: 'Fan Settings',
  },
  {
    key: 'fanMesh',
    type: 'text',
    label: 'Fan Mesh Name',
    initial: 'Cylinder007',
    description: 'Name of mesh for audio reactivity'
  },
  {
    key: 'fanColor',
    type: 'color',
    label: 'Fan Color',
    initial: '#00ff00',
  },
  {
    key: 'fanBand',
    type: 'switch',
    label: 'Fan Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' }
    ],
    initial: 'treble'
  },
  {
    key: 'fanScale',
    type: 'range',
    label: 'Fan Scale',
    initial: 5,
    min: 0.1,
    max: 50,
    step: 0.1
  },
  {
    key: 'fanIntensity',
    type: 'range',
    label: 'Fan Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1
  },
  {
    key: 'fanSpinSpeed',
    type: 'range',
    label: 'Fan Spin Speed',
    initial: 2,
    min: 0,
    max: 10,
    step: 0.1
  }
])

if (!world.isClient) return

// Debug logger
function debugLog(...args) {
  if (props.debugMode === 'enabled') {
    console.log('[Audio Reactivity]', ...args)
  }
}

const audio = app.create('audio', {
  src: props.audioFile?.url || null,
  loop: true,
})
app.add(audio)

// Log the asset URL so you can copy it to boltFans.js
if (props.audioFile?.url) {
  console.log('[BoltBase] Audio asset URL:', props.audioFile.url)
}

// Get meshes from props
const mesh1 = props.mesh1 ? app.get(props.mesh1) : null
const mesh2 = props.mesh2 ? app.get(props.mesh2) : null

// Get truss groups for spinning
const lowerTruss = props.lowerTruss ? app.get(props.lowerTruss) : null
const upperTruss = props.upperTruss ? app.get(props.upperTruss) : null

// Get engine meshes (combined into boltbase GLB)
const thruster = app.get('Thrusters')
const engineInnerLOD = app.get('engineInnerMeshLOD0_2')
const engineOuterLOD = app.get('engineOuterMeshLOD0_2')
const tunnelPiece = app.get('tunnelPieceMeshLOD0_2')

// Get fan meshes
const fanMesh = app.get(props.fanMesh || 'FanMeshLOD0_7')

// Debug: log what we found
debugLog('Found nodes:', {
  mesh1: !!mesh1,
  mesh2: !!mesh2,
  lowerTruss: !!lowerTruss,
  upperTruss: !!upperTruss,
  thruster: !!thruster,
  engineInnerLOD: !!engineInnerLOD,
  engineOuterLOD: !!engineOuterLOD,
  tunnelPiece: !!tunnelPiece,
  fanMesh: !!fanMesh
})

const src = props.video?.url || props.videoLink;

let isPlaying = false

// Set up video player state
const player = {
  isPlaying: true,
  volume: props.defaultVolume || 10,
  elapsedTime: 0,
  duration: 0
}

if (!src) {
  console.error("No video source provided. Please upload a video or paste a video link.");
} else if (world.isClient) {
  const mesh = app.get('Screens');
  const video = app.create('video', {
    src,
    linked: true,
    loop: true,
    aspect: 16 / 9, // geometry is 16:9
    geometry: mesh.geometry,
    cover: true,
    volume: player.volume / 15, // Convert to 0-1 range for the video element
    spatial: props.isSpatial !== false, // Spatial audio by default
    minDistance: props.minDistance || 5,
    maxDistance: props.maxDistance || 20,
    rolloffFactor: props.rolloffFactor || 2
  });
  // Move video to the same place as mesh and adjust its position slightly
  video.position.copy(mesh.position);
  video.quaternion.copy(mesh.quaternion);
  video.scale.copy(mesh.scale);
  video.position.z += 0.001;
  mesh.active = false
  // Add the video to the scene and play it
  app.add(video);
  video.play();
}

function buildLinkOptions(meshProps) {
  const options = {
    band: meshProps.band,
    scale: meshProps.scale,
    intensity: meshProps.intensity,
    property: 'color',
    color: meshProps.color || '#ffffff',
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
    debugLog('Failed to play audio:', err.message)
    return
  }

  // Link mesh 1
  if (mesh1) {
    const options = buildLinkOptions({
      band: props.mesh1Band,
      scale: props.mesh1Scale,
      intensity: props.mesh1Intensity,
      color: props.mesh1Color,
    })
    mesh1.linkAudioReactivity(audio.id, options)
    debugLog('Linked mesh1:', props.mesh1, options)
  }

  // Link mesh 2
  if (mesh2) {
    const options = buildLinkOptions({
      band: props.mesh2Band,
      scale: props.mesh2Scale,
      intensity: props.mesh2Intensity,
      color: props.mesh2Color,
    })
    mesh2.linkAudioReactivity(audio.id, options)
    debugLog('Linked mesh2:', props.mesh2, options)
  }

  // Link thruster
  if (thruster) {
    const options = {
      band: props.thrusterBand,
      scale: props.thrusterScale,
      intensity: props.thrusterIntensity,
      property: 'color',
      color: props.thrusterColor,
    }
    thruster.linkAudioReactivity(audio.id, options)
    debugLog('Linked thruster:', options)
  }

  // Link engine LOD meshes
  if (engineInnerLOD) {
    const options = {
      band: props.engineInnerBand,
      scale: props.engineInnerScale,
      intensity: props.engineInnerIntensity,
      property: 'color',
      color: props.engineInnerColor,
    }
    engineInnerLOD.linkAudioReactivity(audio.id, options)
    debugLog('Linked engineInnerLOD:', options)
  }

  if (engineOuterLOD) {
    const options = {
      band: props.engineOuterBand,
      scale: props.engineOuterScale,
      intensity: props.engineOuterIntensity,
      property: 'color',
      color: props.engineOuterColor,
    }
    engineOuterLOD.linkAudioReactivity(audio.id, options)
    debugLog('Linked engineOuterLOD:', options)
  }

  // Link tunnel piece
  if (tunnelPiece) {
    const options = {
      band: props.tunnelBand,
      scale: props.tunnelScale,
      intensity: props.tunnelIntensity,
      property: 'color',
      color: props.tunnelColor,
    }
    tunnelPiece.linkAudioReactivity(audio.id, options)
    debugLog('Linked tunnelPiece:', options)
  }

  // Link fan mesh
  if (fanMesh) {
    const options = {
      band: props.fanBand,
      scale: props.fanScale,
      intensity: props.fanIntensity,
      property: 'color',
      color: props.fanColor,
    }
    fanMesh.linkAudioReactivity(audio.id, options)
    debugLog('Linked fanMesh:', options)
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
  if (thruster) thruster.unlinkAudioReactivity()
  if (engineInnerLOD) engineInnerLOD.unlinkAudioReactivity()
  if (engineOuterLOD) engineOuterLOD.unlinkAudioReactivity()
  if (tunnelPiece) tunnelPiece.unlinkAudioReactivity()
  if (fanMesh) fanMesh.unlinkAudioReactivity()

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

// Spin truss groups
app.on('update', (dt) => {
  if (lowerTruss && props.lowerTrussSpeed !== 0) {
    lowerTruss.rotation.y += props.lowerTrussSpeed * dt
  }
  if (upperTruss && props.upperTrussSpeed !== 0) {
    upperTruss.rotation.y += props.upperTrussSpeed * dt
  }
})

// Thruster and engine rotation animation
app.on('update', delta => {
  if (thruster) {
    thruster.rotation.y += -0.1 * delta
    if (thruster.material) {
      thruster.material.textureY += 5 * delta
    }
  }
  if (engineInnerLOD) {
    engineInnerLOD.rotation.y += -0.1 * delta
  }
  if (engineOuterLOD) {
    engineOuterLOD.rotation.y += -0.1 * delta
  }
})

// Fan spinning - uses the configurable spin speed
app.on('update', delta => {
  if (fanMesh) {
    fanMesh.rotation.x += -props.fanSpinSpeed * delta
  }
})

app.on('destroy', () => {
  stopAudio()
})
