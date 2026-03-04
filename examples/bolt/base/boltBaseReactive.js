app.configure([
  {
    key: 'audioSection',
    type: 'section',
    label: 'Audio Settings',
  },
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
    key: 'audioVolume',
    type: 'range',
    label: 'Audio Volume',
    initial: 1,
    min: 0,
    max: 2,
    step: 0.1,
    description: 'Volume multiplier (0 = silent, 1 = normal, 2 = 2x)',
  },
  {
    key: 'audioIsSpatial',
    type: 'switch',
    label: 'Audio Type',
    options: [
      { label: 'Spatial (3D)', value: true },
      { label: 'Global', value: false }
    ],
    initial: true,
    description: 'Spatial audio follows position, global is constant',
  },
  {
    key: 'audioMinDistance',
    type: 'number',
    label: 'Min Distance',
    initial: 5,
    min: 0.1,
    max: 100,
    description: 'Distance where audio starts to fade (meters)',
  },
  {
    key: 'audioMaxDistance',
    type: 'number',
    label: 'Max Distance',
    initial: 30,
    min: 1,
    max: 500,
    description: 'Distance where audio becomes inaudible (meters)',
  },
  {
    key: 'audioRolloffFactor',
    type: 'switch',
    label: 'Falloff Rate',
    options: [
      { label: 'Gradual', value: 1 },
      { label: 'Medium', value: 2 },
      { label: 'Steep', value: 4 }
    ],
    initial: 2,
    description: 'How quickly audio fades with distance',
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
    key: 'tunnelSpinSpeed',
    type: 'range',
    label: 'Tunnel Spin Speed',
    initial: 0.2,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'tableSection',
    type: 'section',
    label: 'Table Settings',
  },
  {
    key: 'tableMesh',
    type: 'text',
    label: 'Table Mesh Name',
    initial: 'TableMeshLOD0_8',
    description: 'Name of mesh for audio reactivity'
  },
  {
    key: 'tableColor',
    type: 'color',
    label: 'Table Color',
    initial: '#ff00ff',
  },
  {
    key: 'tableBand',
    type: 'switch',
    label: 'Table Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' }
    ],
    initial: 'mid'
  },
  {
    key: 'tableScale',
    type: 'range',
    label: 'Table Scale',
    initial: 4,
    min: 0.1,
    max: 50,
    step: 0.1
  },
  {
    key: 'tableIntensity',
    type: 'range',
    label: 'Table Intensity',
    initial: 1.2,
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
  },
  {
    key: 'wheelSection',
    type: 'section',
    label: 'Wheel Settings',
  },
  {
    key: 'wheelMesh',
    type: 'text',
    label: 'Wheel Mesh Name',
    initial: 'w',
    description: 'Name of wheel mesh to spin'
  },
  {
    key: 'wheelSpeedX',
    type: 'range',
    label: 'Wheel Spin Speed X',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'wheelSpeedY',
    type: 'range',
    label: 'Wheel Spin Speed Y',
    initial: 1,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'wheelSpeedZ',
    type: 'range',
    label: 'Wheel Spin Speed Z',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'r1Section',
    type: 'section',
    label: 'Ring 1 Settings',
  },
  {
    key: 'r1Group',
    type: 'text',
    label: 'Ring 1 Group Name',
    initial: 'r1',
    description: 'Name of ring 1 group to spin'
  },
  {
    key: 'r1Mesh',
    type: 'text',
    label: 'Ring 1 Mesh Name',
    initial: 'r1_2',
    description: 'Name of mesh for audio reactivity'
  },
  {
    key: 'r1Color',
    type: 'color',
    label: 'Ring 1 Color',
    initial: '#ff00ff',
  },
  {
    key: 'r1Band',
    type: 'switch',
    label: 'Ring 1 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' }
    ],
    initial: 'volume'
  },
  {
    key: 'r1Scale',
    type: 'range',
    label: 'Ring 1 Scale',
    initial: 3,
    min: 0.1,
    max: 50,
    step: 0.1
  },
  {
    key: 'r1Intensity',
    type: 'range',
    label: 'Ring 1 Intensity',
    initial: 1.5,
    min: 0.1,
    max: 10,
    step: 0.1
  },
  {
    key: 'r1SpeedX',
    type: 'range',
    label: 'Ring 1 Spin Speed X',
    initial: 0.5,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'r1SpeedY',
    type: 'range',
    label: 'Ring 1 Spin Speed Y',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'r1SpeedZ',
    type: 'range',
    label: 'Ring 1 Spin Speed Z',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'r2Section',
    type: 'section',
    label: 'Ring 2 Settings',
  },
  {
    key: 'r2Group',
    type: 'text',
    label: 'Ring 2 Group Name',
    initial: 'r2',
    description: 'Name of ring 2 group to spin'
  },
  {
    key: 'r2Mesh',
    type: 'text',
    label: 'Ring 2 Mesh Name',
    initial: 'r2_2',
    description: 'Name of mesh for audio reactivity'
  },
  {
    key: 'r2Color',
    type: 'color',
    label: 'Ring 2 Color',
    initial: '#00ffff',
  },
  {
    key: 'r2Band',
    type: 'switch',
    label: 'Ring 2 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' }
    ],
    initial: 'bass'
  },
  {
    key: 'r2Scale',
    type: 'range',
    label: 'Ring 2 Scale',
    initial: 3,
    min: 0.1,
    max: 50,
    step: 0.1
  },
  {
    key: 'r2Intensity',
    type: 'range',
    label: 'Ring 2 Intensity',
    initial: 1.5,
    min: 0.1,
    max: 10,
    step: 0.1
  },
  {
    key: 'r2SpeedX',
    type: 'range',
    label: 'Ring 2 Spin Speed X',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'r2SpeedY',
    type: 'range',
    label: 'Ring 2 Spin Speed Y',
    initial: 0.5,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'r2SpeedZ',
    type: 'range',
    label: 'Ring 2 Spin Speed Z',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'r3Section',
    type: 'section',
    label: 'Ring 3 Settings',
  },
  {
    key: 'r3Group',
    type: 'text',
    label: 'Ring 3 Group Name',
    initial: 'r3',
    description: 'Name of ring 3 group to spin'
  },
  {
    key: 'r3Mesh',
    type: 'text',
    label: 'Ring 3 Mesh Name',
    initial: 'r3_3',
    description: 'Name of mesh for audio reactivity'
  },
  {
    key: 'r3Color',
    type: 'color',
    label: 'Ring 3 Color',
    initial: '#ff6600',
  },
  {
    key: 'r3Band',
    type: 'switch',
    label: 'Ring 3 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' }
    ],
    initial: 'treble'
  },
  {
    key: 'r3Scale',
    type: 'range',
    label: 'Ring 3 Scale',
    initial: 3,
    min: 0.1,
    max: 50,
    step: 0.1
  },
  {
    key: 'r3Intensity',
    type: 'range',
    label: 'Ring 3 Intensity',
    initial: 1.5,
    min: 0.1,
    max: 10,
    step: 0.1
  },
  {
    key: 'r3SpeedX',
    type: 'range',
    label: 'Ring 3 Spin Speed X',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'r3SpeedY',
    type: 'range',
    label: 'Ring 3 Spin Speed Y',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'r3SpeedZ',
    type: 'range',
    label: 'Ring 3 Spin Speed Z',
    initial: 0.5,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'lightsSection',
    type: 'section',
    label: 'Light & Speaker Settings',
  },
  {
    key: 'lightRig',
    type: 'text',
    label: 'Light Rig Name',
    initial: 'LightRig',
    description: 'Name of the light rig node'
  },
  {
    key: 'lightsActive',
    type: 'switch',
    label: 'Lights Active',
    options: [
      { label: 'On', value: 'enabled' },
      { label: 'Off', value: 'disabled' }
    ],
    initial: 'enabled',
    description: 'Toggle lights on/off'
  },
  {
    key: 'lightAnimation',
    type: 'switch',
    label: 'Light Animation',
    options: [
      { label: 'On', value: 'LightsOn' },
      { label: 'One', value: 'LightsOne' },
      { label: 'Two', value: 'LightsTwo' },
      { label: 'Three', value: 'LightsThree' },
      { label: 'Four', value: 'LightsFour' },
      { label: 'Five', value: 'LightsFive' }
    ],
    initial: 'LightsOn',
    description: 'Select light animation pattern (when lights are on)'
  },
  {
    key: 'lightsBone',
    type: 'text',
    label: 'Lights Bone Name',
    initial: 'rootLights',
    description: 'Name of bone to spin'
  },
  {
    key: 'lightsSpinY',
    type: 'range',
    label: 'Lights Spin Speed Y',
    initial: 0.5,
    min: -5,
    max: 5,
    step: 0.1
  },
  {
    key: 'speakerRig',
    type: 'text',
    label: 'Speaker Rig Name',
    initial: 'SpeakerRig',
    description: 'Name of the speaker rig node'
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
  volume: props.audioVolume ?? 1,
  spatial: props.audioIsSpatial !== false,
  minDistance: props.audioMinDistance ?? 5,
  maxDistance: props.audioMaxDistance ?? 30,
  rolloffFactor: props.audioRolloffFactor ?? 2,
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
const engineInner = app.get('engineInner')
const engineOuter = app.get('engineOuter')
const engineInnerLOD = app.get('engineInnerMeshLOD0_2')
const engineOuterLOD = app.get('engineOuterMeshLOD0_2')
const tunnel = app.get('tunnel')
const tunnelPiece = app.get('tunnelPieceMeshLOD0_2')
const tableMesh = app.get(props.tableMesh || 'TableMeshLOD0_8')

// Get fan meshes
const fanMesh = app.get(props.fanMesh || 'FanMeshLOD0_7')

// Get all fan groups for spinning (CoolingFan to CoolingFan_5)
const fanGroups = []
for (let i = 0; i <= 5; i++) {
  const name = i === 0 ? 'CoolingFan' : `CoolingFan_${i}`
  const fan = app.get(name)
  if (fan) {
    fanGroups.push(fan)
    console.log(`[BoltBase] Found fan: ${name}`)
  }
}

// Get wheel mesh for spinning
const wheelMesh = app.get(props.wheelMesh || 'w')

// Get ring groups for spinning
const r1Group = app.get(props.r1Group || 'r1')
const r2Group = app.get(props.r2Group || 'r2')
const r3Group = app.get(props.r3Group || 'r3')

// Get ring meshes for audio reactivity
const r1Mesh = app.get(props.r1Mesh || 'r1_2')
const r2Mesh = app.get(props.r2Mesh || 'r2_2')
const r3Mesh = app.get(props.r3Mesh || 'r3_3')

// Get light and speaker rigs
const lightRig = app.get(props.lightRig || 'LightRig')
const speakerRig = app.get(props.speakerRig || 'SpeakerRig')

// Get the lights bone for spinning
const lightsBone = lightRig?.getBone?.(props.lightsBone || 'rootLights')

// Debug: log what we found
debugLog('Found nodes:', {
  mesh1: !!mesh1,
  mesh2: !!mesh2,
  lowerTruss: !!lowerTruss,
  upperTruss: !!upperTruss,
  thruster: !!thruster,
  engineInner: !!engineInner,
  engineOuter: !!engineOuter,
  engineInnerLOD: !!engineInnerLOD,
  engineOuterLOD: !!engineOuterLOD,
  tunnel: !!tunnel,
  tunnelPiece: !!tunnelPiece,
  tableMesh: !!tableMesh,
  fanMesh: !!fanMesh,
  fanCount: fanGroups.length,
  wheelMesh: !!wheelMesh,
  r1Group: !!r1Group,
  r2Group: !!r2Group,
  r3Group: !!r3Group,
  r1Mesh: !!r1Mesh,
  r2Mesh: !!r2Mesh,
  r3Mesh: !!r3Mesh,
  lightRig: !!lightRig,
  speakerRig: !!speakerRig,
  lightsBone: !!lightsBone
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

// Play light animation based on configuration
function playLightAnimation() {
  if (!lightRig) return

  if (props.lightsActive === 'disabled') {
    // Play LightsOff once, no looping
    lightRig.play({ name: 'LightsOff', loop: false, fade: 0.5 })
    debugLog('Playing light animation: LightsOff (once)')
    return
  }

  // Lights are on - play the selected animation with looping
  const animName = props.lightAnimation || 'LightsOn'
  lightRig.play({ name: animName, loop: true, fade: 0.5 })
  debugLog('Playing light animation:', animName, '(looping)')
}

// Play speaker animation
function playSpeakerAnimation(playing) {
  if (!speakerRig) return

  const animName = playing ? 'SpeakersOn' : 'SpeakersOff'
  speakerRig.play({ name: animName, loop: playing, fade: 0.5 })
  debugLog('Playing speaker animation:', animName)
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

  // Link table mesh
  if (tableMesh) {
    const options = {
      band: props.tableBand,
      scale: props.tableScale,
      intensity: props.tableIntensity,
      property: 'color',
      color: props.tableColor,
    }
    tableMesh.linkAudioReactivity(audio.id, options)
    debugLog('Linked tableMesh:', options)
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

  // Link ring meshes
  if (r1Mesh) {
    const options = {
      band: props.r1Band,
      scale: props.r1Scale,
      intensity: props.r1Intensity,
      property: 'color',
      color: props.r1Color,
    }
    r1Mesh.linkAudioReactivity(audio.id, options)
    debugLog('Linked r1Mesh:', options)
  }

  if (r2Mesh) {
    const options = {
      band: props.r2Band,
      scale: props.r2Scale,
      intensity: props.r2Intensity,
      property: 'color',
      color: props.r2Color,
    }
    r2Mesh.linkAudioReactivity(audio.id, options)
    debugLog('Linked r2Mesh:', options)
  }

  if (r3Mesh) {
    const options = {
      band: props.r3Band,
      scale: props.r3Scale,
      intensity: props.r3Intensity,
      property: 'color',
      color: props.r3Color,
    }
    r3Mesh.linkAudioReactivity(audio.id, options)
    debugLog('Linked r3Mesh:', options)
  }

  if (playAction) {
    playAction.label = 'Stop Audio'
  }

  // Play speaker animation (speakers bouncing)
  playSpeakerAnimation(true)

  // Play light animation
  playLightAnimation()
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
  if (tableMesh) tableMesh.unlinkAudioReactivity()
  if (fanMesh) fanMesh.unlinkAudioReactivity()
  if (r1Mesh) r1Mesh.unlinkAudioReactivity()
  if (r2Mesh) r2Mesh.unlinkAudioReactivity()
  if (r3Mesh) r3Mesh.unlinkAudioReactivity()

  if (playAction) {
    playAction.label = 'Start Audio'
  }

  // Stop speaker animation (speakers idle)
  playSpeakerAnimation(false)
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

// Initialize lights on startup
setTimeout(() => playLightAnimation(), 200)

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
  // Spin the engine groups (not LOD meshes)
  if (engineInner) {
    engineInner.rotation.y += -0.1 * delta
  }
  if (engineOuter) {
    engineOuter.rotation.y += -0.1 * delta
  }
})

// Tunnel spinning
app.on('update', delta => {
  if (tunnel && props.tunnelSpinSpeed !== 0) {
    tunnel.rotation.y += props.tunnelSpinSpeed * delta
  }
})

// Fan spinning - spin all fan groups
let fanSpinLogged = false
app.on('update', delta => {
  if (fanGroups.length === 0 && !fanSpinLogged) {
    console.log('[BoltBase] No fan groups found to spin')
    fanSpinLogged = true
    return
  }
  for (const fan of fanGroups) {
    if (fan) {
      fan.rotation.x += -props.fanSpinSpeed * delta
    }
  }
})

// Wheel spinning
app.on('update', delta => {
  if (wheelMesh) {
    wheelMesh.rotation.x += (props.wheelSpeedX || 0) * delta
    wheelMesh.rotation.y += (props.wheelSpeedY || 1) * delta
    wheelMesh.rotation.z += (props.wheelSpeedZ || 0) * delta
  }
})

// Ring groups spinning on all axes
app.on('update', delta => {
  if (r1Group) {
    r1Group.rotation.x += (props.r1SpeedX || 0.5) * delta
    r1Group.rotation.y += (props.r1SpeedY || 0) * delta
    r1Group.rotation.z += (props.r1SpeedZ || 0) * delta
  }
  if (r2Group) {
    r2Group.rotation.x += (props.r2SpeedX || 0) * delta
    r2Group.rotation.y += (props.r2SpeedY || 0.5) * delta
    r2Group.rotation.z += (props.r2SpeedZ || 0) * delta
  }
  if (r3Group) {
    r3Group.rotation.x += (props.r3SpeedX || 0) * delta
    r3Group.rotation.y += (props.r3SpeedY || 0) * delta
    r3Group.rotation.z += (props.r3SpeedZ || 0.5) * delta
  }
})

// Lights bone spinning
app.on('update', delta => {
  if (lightsBone?.rotation) {
    lightsBone.rotation.y += (props.lightsSpinY || 0.5) * delta
  }
})

app.on('destroy', () => {
  stopAudio()
})
