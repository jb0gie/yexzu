app.configure([
  {
    key: 'audioSection',
    type: 'section',
    label: 'Audio Settings',
  },
  {
    key: 'audioNote',
    type: 'text',
    label: 'Playback',
    initial: 'owned by rig',
    hint: 'Audio playback is owned by the rig (djbooth + speakers). This app is visual-reactive only.',
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
    hint: 'Enable console logs for debugging',
  },
  {
    key: 'mesh1',
    type: 'text',
    label: 'Mesh 1 Name',
    initial: 'MeshLOD0_2',
    hint: 'Name of first mesh in GLB to apply audio reactivity',
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
    hint: 'spectrum slice that drives this surface',
  },
  {
    key: 'mesh1Scale',
    type: 'range',
    label: 'Mesh 1 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
    hint: 'reactive depth (how far the pulse travels)',
  },
  {
    key: 'mesh1Intensity',
    type: 'range',
    label: 'Mesh 1 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
    hint: 'gain on the band energy (how hot it flashes)',
  },
  {
    key: 'mesh1Color',
    type: 'color',
    label: 'Mesh 1 Color',
    initial: '#ff0000',
    hint: 'Color for audio reactivity',
  },
  {
    key: 'mesh2',
    type: 'text',
    label: 'Mesh 2 Name',
    initial: 'Coolant',
    hint: 'Name of second mesh in GLB (leave empty to disable)',
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
    hint: 'spectrum slice that drives this surface',
  },
  {
    key: 'mesh2Scale',
    type: 'range',
    label: 'Mesh 2 Scale',
    initial: 2,
    min: 0.1,
    max: 50,
    step: 0.1,
    hint: 'reactive depth (how far the pulse travels)',
  },
  {
    key: 'mesh2Intensity',
    type: 'range',
    label: 'Mesh 2 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
    hint: 'gain on the band energy (how hot it flashes)',
  },
  {
    key: 'mesh2Color',
    type: 'color',
    label: 'Mesh 2 Color',
    initial: '#0000ff',
    hint: 'Color for audio reactivity',
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
    hint: 'local loop for this panel — the rig normally drives the screen',
  },
  {
    key: 'videoLink',
    type: 'text',
    label: 'Video Link (paste URL here)',
    hint: 'direct mp4/m3u8 url, same local mode; the djbooth owns rig playback',
  },
  {
    key: 'streamSection',
    type: 'section',
    label: 'Livestream / Embed',
  },
  {
    key: 'embedWidth',
    type: 'range',
    label: 'Embed Width (m)',
    initial: 6,
    min: 0.5,
    max: 30,
    step: 0.1,
    hint: 'physical size of THIS panel for twitch/youtube webviews — match the Screens mesh',
  },
  {
    key: 'embedHeight',
    type: 'range',
    label: 'Embed Height (m)',
    initial: 3.375,
    min: 0.5,
    max: 20,
    step: 0.1,
    hint: 'embed plane height — match the Screens mesh',
  },
  {
    key: 'embedFactor',
    type: 'range',
    label: 'Embed Sharpness',
    initial: 150,
    min: 50,
    max: 300,
    step: 10,
    hint: 'iframe pixels per meter — higher is sharper and heavier',
  },
  {
    key: 'embedAudio',
    type: 'switch',
    label: 'Embed Audio',
    options: [
      { label: 'Auto (one screen wins)', value: 'auto' },
      { label: 'Always On (this screen)', value: 'on' },
      { label: 'Always Off', value: 'off' },
    ],
    initial: 'auto',
    hint: 'iframe audio is not spatial — when several surfaces show the same embed they elect ONE unmuted player',
  },
  {
    key: 'embedParents',
    type: 'text',
    label: 'Twitch Parents',
    initial: 'boltevm.com,localhost,127.0.0.1,255242621.xyz',
    hint: 'comma list of domains allowed to iframe twitch players',
  },
  {
    // key renamed from flipX: the blueprint had an old saved 'off' (from the
    // previous default) and a stored value always beats an `initial`, so the
    // mirror fix could never turn itself on. A new key has no saved value →
    // the default finally applies.
    key: 'mirrorX',
    type: 'switch',
    label: 'Fix Mirrored Image (X)',
    options: [
      { label: 'Off', value: 'off' },
      { label: 'On (fixes mirroring)', value: 'on' },
    ],
    initial: 'on',
    hint: 'the boltbase Screens mesh renders content back-to-front — keep ON unless the screen is rebuilt un-mirrored',
  },
  {
    key: 'mirrorY',
    type: 'switch',
    label: 'Flip Image Vertically (Y)',
    options: [
      { label: 'Off', value: 'off' },
      { label: 'On (fixes upside-down)', value: 'on' },
    ],
    initial: 'off',
    hint: 'if the picture is upside down, flip this',
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
    hint: 'local panel audio only — rig volume comes from the booth',
  },
  {
    key: 'isSpatial',
    type: 'switch',
    label: 'Audio Type',
    options: [
      { label: 'Spatial (3D)', value: true },
      { label: 'Global', value: false }
    ],
    initial: true,
    hint: 'local audio only — 3D falloff vs global',
  },
  {
    key: 'minDistance',
    type: 'number',
    label: 'Min Distance',
    initial: 5,
    min: 1,
    max: 50,
    hint: 'Distance where audio starts to fade (in meters)'
  },
  {
    key: 'maxDistance',
    type: 'number',
    label: 'Max Distance',
    initial: 20,
    min: 1,
    max: 100,
    hint: 'Distance where audio becomes inaudible (in meters)'
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
    initial: 2,
    hint: 'local audio only — falloff curve',
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
    hint: 'Name of group to spin (leave empty to disable)'
  },
  {
    key: 'lowerTrussSpeed',
    type: 'range',
    label: 'Lower Truss Speed',
    initial: 0.5,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
  },
  {
    key: 'upperTruss',
    type: 'text',
    label: 'Upper Truss Group',
    initial: 'UpperTruss',
    hint: 'Name of group to spin (leave empty to disable)'
  },
  {
    key: 'upperTrussSpeed',
    type: 'range',
    label: 'Upper Truss Speed',
    initial: -0.3,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
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
    hint: 'reactive tint while the rig is linked',
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
    initial: 'bass',
    hint: 'spectrum slice that drives this surface',
  },
  {
    key: 'thrusterScale',
    type: 'range',
    label: 'Thruster Scale',
    initial: 8,
    min: 0.1,
    max: 50,
    step: 0.1,
    hint: 'reactive depth (how far the pulse travels)',
  },
  {
    key: 'thrusterIntensity',
    type: 'range',
    label: 'Thruster Intensity',
    initial: 2,
    min: 0.1,
    max: 10,
    step: 0.1,
    hint: 'gain on the band energy (how hot it flashes)',
  },
  {
    key: 'engineInnerColor',
    type: 'color',
    label: 'Engine Inner Color',
    initial: '#00aaff',
    hint: 'reactive tint while the rig is linked',
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
    initial: 'mid',
    hint: 'spectrum slice that drives this surface',
  },
  {
    key: 'engineInnerScale',
    type: 'range',
    label: 'Engine Inner Scale',
    initial: 5,
    min: 0.1,
    max: 50,
    step: 0.1,
    hint: 'reactive depth (how far the pulse travels)',
  },
  {
    key: 'engineInnerIntensity',
    type: 'range',
    label: 'Engine Inner Intensity',
    initial: 1.5,
    min: 0.1,
    max: 10,
    step: 0.1,
    hint: 'gain on the band energy (how hot it flashes)',
  },
  {
    key: 'engineOuterColor',
    type: 'color',
    label: 'Engine Outer Color',
    initial: '#ffffff',
    hint: 'reactive tint while the rig is linked',
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
    initial: 'volume',
    hint: 'spectrum slice that drives this surface',
  },
  {
    key: 'engineOuterScale',
    type: 'range',
    label: 'Engine Outer Scale',
    initial: 3,
    min: 0.1,
    max: 50,
    step: 0.1,
    hint: 'reactive depth (how far the pulse travels)',
  },
  {
    key: 'engineOuterIntensity',
    type: 'range',
    label: 'Engine Outer Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
    hint: 'gain on the band energy (how hot it flashes)',
  },
  {
    key: 'tunnelSection',
    type: 'section',
    label: 'Tunnel Settings',
  },
  {
    key: 'tunnelMesh',
    type: 'text',
    label: 'Tunnel Piece Mesh Name',
    initial: 'tunnelPieceMeshLOD0004_1',
    hint: 'Name of the tunnel piece mesh in the GLB (for rig audio reactivity)'
  },
  {
    key: 'tunnelColor',
    type: 'color',
    label: 'Tunnel Color',
    initial: '#aa00ff',
    hint: 'reactive tint while the rig is linked',
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
    initial: 'bass',
    hint: 'spectrum slice that drives this surface',
  },
  {
    key: 'tunnelScale',
    type: 'range',
    label: 'Tunnel Scale',
    initial: 6,
    min: 0.1,
    max: 50,
    step: 0.1,
    hint: 'reactive depth (how far the pulse travels)',
  },
  {
    key: 'tunnelIntensity',
    type: 'range',
    label: 'Tunnel Intensity',
    initial: 1.5,
    min: 0.1,
    max: 10,
    step: 0.1,
    hint: 'gain on the band energy (how hot it flashes)',
  },
  {
    key: 'tunnelSpinSpeed',
    type: 'range',
    label: 'Tunnel Spin Speed',
    initial: 0.2,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
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
    hint: 'Name of mesh for audio reactivity'
  },
  {
    key: 'tableColor',
    type: 'color',
    label: 'Table Color',
    initial: '#ff00ff',
    hint: 'reactive tint while the rig is linked',
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
    initial: 'mid',
    hint: 'spectrum slice that drives this surface',
  },
  {
    key: 'tableScale',
    type: 'range',
    label: 'Table Scale',
    initial: 4,
    min: 0.1,
    max: 50,
    step: 0.1,
    hint: 'reactive depth (how far the pulse travels)',
  },
  {
    key: 'tableIntensity',
    type: 'range',
    label: 'Table Intensity',
    initial: 1.2,
    min: 0.1,
    max: 10,
    step: 0.1,
    hint: 'gain on the band energy (how hot it flashes)',
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
    hint: 'Name of mesh for audio reactivity'
  },
  {
    key: 'fanColor',
    type: 'color',
    label: 'Fan Color',
    initial: '#00ff00',
    hint: 'reactive tint while the rig is linked',
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
    initial: 'treble',
    hint: 'spectrum slice that drives this surface',
  },
  {
    key: 'fanScale',
    type: 'range',
    label: 'Fan Scale',
    initial: 5,
    min: 0.1,
    max: 50,
    step: 0.1,
    hint: 'reactive depth (how far the pulse travels)',
  },
  {
    key: 'fanIntensity',
    type: 'range',
    label: 'Fan Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
    hint: 'gain on the band energy (how hot it flashes)',
  },
  {
    key: 'fanSpinSpeed',
    type: 'range',
    label: 'Fan Spin Speed',
    initial: 2,
    min: 0,
    max: 10,
    step: 0.1,
    hint: 'rad/s — negative reverses',
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
    hint: 'Name of wheel mesh to spin'
  },
  {
    key: 'wheelSpeedX',
    type: 'range',
    label: 'Wheel Spin Speed X',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
  },
  {
    key: 'wheelSpeedY',
    type: 'range',
    label: 'Wheel Spin Speed Y',
    initial: 1,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
  },
  {
    key: 'wheelSpeedZ',
    type: 'range',
    label: 'Wheel Spin Speed Z',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
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
    hint: 'Name of ring 1 group to spin'
  },
  {
    key: 'r1Mesh',
    type: 'text',
    label: 'Ring 1 Mesh Name',
    initial: 'r1_2',
    hint: 'Name of mesh for audio reactivity'
  },
  {
    key: 'r1Color',
    type: 'color',
    label: 'Ring 1 Color',
    initial: '#ff00ff',
    hint: 'reactive tint while the rig is linked',
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
    initial: 'volume',
    hint: 'spectrum slice that drives this surface',
  },
  {
    key: 'r1Scale',
    type: 'range',
    label: 'Ring 1 Scale',
    initial: 3,
    min: 0.1,
    max: 50,
    step: 0.1,
    hint: 'reactive depth (how far the pulse travels)',
  },
  {
    key: 'r1Intensity',
    type: 'range',
    label: 'Ring 1 Intensity',
    initial: 1.5,
    min: 0.1,
    max: 10,
    step: 0.1,
    hint: 'gain on the band energy (how hot it flashes)',
  },
  {
    key: 'r1SpeedX',
    type: 'range',
    label: 'Ring 1 Spin Speed X',
    initial: 0.5,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
  },
  {
    key: 'r1SpeedY',
    type: 'range',
    label: 'Ring 1 Spin Speed Y',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
  },
  {
    key: 'r1SpeedZ',
    type: 'range',
    label: 'Ring 1 Spin Speed Z',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
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
    hint: 'Name of ring 2 group to spin'
  },
  {
    key: 'r2Mesh',
    type: 'text',
    label: 'Ring 2 Mesh Name',
    initial: 'r2_2',
    hint: 'Name of mesh for audio reactivity'
  },
  {
    key: 'r2Color',
    type: 'color',
    label: 'Ring 2 Color',
    initial: '#00ffff',
    hint: 'reactive tint while the rig is linked',
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
    initial: 'bass',
    hint: 'spectrum slice that drives this surface',
  },
  {
    key: 'r2Scale',
    type: 'range',
    label: 'Ring 2 Scale',
    initial: 3,
    min: 0.1,
    max: 50,
    step: 0.1,
    hint: 'reactive depth (how far the pulse travels)',
  },
  {
    key: 'r2Intensity',
    type: 'range',
    label: 'Ring 2 Intensity',
    initial: 1.5,
    min: 0.1,
    max: 10,
    step: 0.1,
    hint: 'gain on the band energy (how hot it flashes)',
  },
  {
    key: 'r2SpeedX',
    type: 'range',
    label: 'Ring 2 Spin Speed X',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
  },
  {
    key: 'r2SpeedY',
    type: 'range',
    label: 'Ring 2 Spin Speed Y',
    initial: 0.5,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
  },
  {
    key: 'r2SpeedZ',
    type: 'range',
    label: 'Ring 2 Spin Speed Z',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
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
    hint: 'Name of ring 3 group to spin'
  },
  {
    key: 'r3Mesh',
    type: 'text',
    label: 'Ring 3 Mesh Name',
    initial: 'r3_3',
    hint: 'Name of mesh for audio reactivity'
  },
  {
    key: 'r3Color',
    type: 'color',
    label: 'Ring 3 Color',
    initial: '#ff6600',
    hint: 'reactive tint while the rig is linked',
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
    initial: 'treble',
    hint: 'spectrum slice that drives this surface',
  },
  {
    key: 'r3Scale',
    type: 'range',
    label: 'Ring 3 Scale',
    initial: 3,
    min: 0.1,
    max: 50,
    step: 0.1,
    hint: 'reactive depth (how far the pulse travels)',
  },
  {
    key: 'r3Intensity',
    type: 'range',
    label: 'Ring 3 Intensity',
    initial: 1.5,
    min: 0.1,
    max: 10,
    step: 0.1,
    hint: 'gain on the band energy (how hot it flashes)',
  },
  {
    key: 'r3SpeedX',
    type: 'range',
    label: 'Ring 3 Spin Speed X',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
  },
  {
    key: 'r3SpeedY',
    type: 'range',
    label: 'Ring 3 Spin Speed Y',
    initial: 0,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
  },
  {
    key: 'r3SpeedZ',
    type: 'range',
    label: 'Ring 3 Spin Speed Z',
    initial: 0.5,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
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
    hint: 'Name of the light rig node'
  },
  {
    key: 'lightsActive',
    type: 'switch',
    label: 'Lights Active',
    options: [
      { label: 'On', value: 'enabled' },
      { label: 'Off', value: 'disabled' }
    ],
    initial: 'disabled',
    hint: 'Toggle lights on/off. Off by default — LightRig skeletal loop is expensive.'
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
    hint: 'Select light animation pattern (when lights are on)'
  },
  {
    key: 'lightsBone',
    type: 'text',
    label: 'Lights Bone Name',
    initial: 'rootLights',
    hint: 'Name of bone to spin'
  },
  {
    key: 'lightsSpinY',
    type: 'range',
    label: 'Lights Spin Speed Y',
    initial: 0.5,
    min: -5,
    max: 5,
    step: 0.1,
    hint: 'rad/s — negative reverses',
  },
  {
    key: 'speakerRig',
    type: 'text',
    label: 'Speaker Rig Name',
    initial: 'SpeakerRig',
    hint: 'Name of the speaker rig node'
  },
  {
    key: 'rigSection',
    type: 'section',
    label: 'Rig Audio Reactivity (v2)',
  },
  {
    key: 'reactiveSource',
    type: 'switch',
    label: 'Reactive Source',
    options: [
      { label: 'Rig (speakers)', value: 'rig' },
      { label: 'Disabled (own audio only)', value: 'disabled' },
    ],
    initial: 'rig',
    hint: 'rig = materials react to the surround rig\'s track (via boltSpeaker announcements). disabled = legacy own-audio behavior only.'
  }
])

if (!world.isClient) return

// Debug logger
function debugLog(...args) {
  if (props.debugMode === 'enabled') {
    console.log('[Audio Reactivity]', ...args)
  }
}

// (local audio engine removed — the rig (djbooth + speakers) owns playback;
//  reactivity links to the speakers' announced audio node in the v2 section
//  at the bottom of this script)

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
const tunnelPiece = app.get(props.tunnelMesh || 'tunnelPieceMeshLOD0004_1')
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

function findSkinned(node) {
  if (!node) return null
  if (typeof node.getBone === 'function') return node
  const kids = node.children || []
  for (let i = 0; i < kids.length; i++) {
    const found = findSkinned(kids[i])
    if (found) return found
  }
  return null
}

// Get light and speaker rigs
const lightRigRoot = app.get(props.lightRig || 'LightRig')
const lightRig = findSkinned(lightRigRoot) || lightRigRoot
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

// Set up video player state
const player = {
  isPlaying: true,
  volume: props.defaultVolume || 10,
  elapsedTime: 0,
  duration: 0
}

// ---------- the Screens panel ----------
// One node, two drivers: the local `video`/`videoLink` props (legacy own mode,
// plays on load) and the rig — the djbooth owns the video in rig mode and
// anchors it to the same t0 as the rig audio. bolt-screen apps relay the
// booth's command onto this client's bus (they hold the server context that
// hears the booth), so this panel and every bolt-screen screen show the SAME
// element: `linked: true` keys the player per url, so one decode feeds any
// number of screens — frame-locked by construction, not by a sync timer.
// Lazily created: with no local src and a silent rig there is no video node
// (a Video with a null src builds a mesh with no texture).
let panel = null

// The boltbase Screens mesh renders streams mirrored (its authored UVs /
// transform flip content; the standalone screen GLB does not). This engine's
// Video node can flip its own TEXTURE sampling (flipX/flipY) — a shader-space
// flip that no authored transform or winding can fight. Old engines lack the
// props, so fall back to mirroring the plane itself (three compensates the
// winding; doubleside keeps it visible either way).
function flipFix(node) {
  // X defaults ON: this mesh renders mirrored. An explicit 'off' disables.
  // NOTE the props are mirrorX/mirrorY (not flipX/flipY): the blueprint still
  // carries a flipX:'off' saved under the old default, and a saved value beats
  // `initial`, so a stale key would silently cancel the fix forever.
  const wantX = props.mirrorX !== 'off'
  const wantY = props.mirrorY === 'on'
  if (!wantX && !wantY) return
  const nativeFlip = typeof node.flipX === 'boolean'
  if (nativeFlip) {
    node.flipX = wantX
    node.flipY = wantY
  } else {
    if (wantX) node.scale.x *= -1
    if (wantY) node.scale.y *= -1
    node.doubleside = true
  }
  console.warn(
    `[BoltBase] flips — X=${wantX} Y=${wantY} via ${nativeFlip ? 'engine texture flip' : 'plane scale fallback'} | raw props mirrorX=${String(props.mirrorX)} mirrorY=${String(props.mirrorY)}`,
  )
}

function ensurePanel(url) {
  if (panel) {
    if (url && panel.src !== url) panel.src = url
    return panel
  }
  const mesh = app.get('Screens')
  if (!mesh) {
    // GLB edits can drop/rename the Screens node — never crash the whole
    // script over a missing screen (that killed rig reactivity below)
    console.error('[BoltBase] "Screens" mesh not found in GLB — skipping video panel')
    return null
  }
  panel = app.create('video', {
    src: url || null,
    linked: true,
    loop: true,
    aspect: 16 / 9, // geometry is 16:9
    geometry: mesh.geometry,
    volume: player.volume / 15, // Convert to 0-1 range for the video element
    spatial: props.isSpatial !== false, // Spatial audio by default
    minDistance: props.minDistance || 5,
    maxDistance: props.maxDistance || 20,
    rolloffFactor: props.rolloffFactor || 2
  });
  // Move video to the same place as mesh and adjust its position slightly
  panel.position.copy(mesh.position);
  panel.quaternion.copy(mesh.quaternion);
  panel.scale.copy(mesh.scale);
  panel.position.z += 0.001;
  flipFix(panel);
  mesh.active = false
  app.add(panel);
  return panel
}

if (src) {
  const local = ensurePanel(src)
  local?.play()
}

{
  const RIG_VIDEO_EVENT = `${props.channel || 'bolt'}:video:command`
  const RIG_VIDEO_WHOIS = `${props.channel || 'bolt'}:video:whois`
  const EMBED_EVENT = `${props.channel || 'bolt'}:embed:audio`
  const DEFAULT_PARENTS = 'boltevm.com,localhost,127.0.0.1,255242621.xyz'
  const SCREEN_ID = app.instanceId
  const DRIFT = 0.25 // seconds off the shared clock before a screen re-seeks
  let t0 = 0 // world.getTime() the rig video started at (0 = not rig-driven)
  let lastPlayAsk = 0
  let streamSrc = false // current rig video is a livestream (m3u8) — never clock-seek it

  // ---- link helpers (same contract as bolt-screen; the booth's `kind` wins) ----

  // hls.js resolves the urls inside a playlist against the PLAYLIST's own url,
  // so a stream that got re-served from our own origin (the audio proxy) would
  // send every segment fetch to boltevm.com and 404. Unwrap it and let hls.js
  // see the original origin again.
  function unwrapStreamUrl(url) {
    if (typeof url !== 'string') return url
    if (!isStreamUrl(url)) return url
    const at = url.indexOf('/api/audio-proxy?url=')
    if (at === -1) return url
    try {
      return decodeURIComponent(url.slice(at + '/api/audio-proxy?url='.length))
    } catch (err) {
      return url
    }
  }

  function isStreamUrl(url) {
    return /\.m3u8/i.test(url || '')
  }

  function youtubeId(url) {
    // youtu\.?be covers both youtube.com and youtu.be — a bare /youtube/ guard
    // silently skips every youtu.be share link (it has no 'youtube')
    if (!/youtu\.?be/.test(url || '')) return null
    let m = url.match(/[?&]v=([\w-]{6,})/)
    if (!m) m = url.match(/\/(?:embed|live|shorts)\/([\w-]{6,})/)
    if (!m) m = url.match(/youtu\.be\/([\w-]{6,})/)
    return m ? m[1] : null
  }

  function twitchEmbed(url, parents) {
    if (!/twitch\.tv/.test(url || '')) return null
    let q = null
    let m = url.match(/twitch\.tv\/videos?\/(\d+)/)
    if (m) q = 'video=' + m[1]
    if (!q) {
      m = url.match(/[?&]channel=([\w-]+)/)
      if (m) q = 'channel=' + m[1]
    }
    if (!q) {
      m = url.match(/twitch\.tv\/(?!videos?\/|directory|downloads|clips|settings|subscriptions|jobs|turbo|inventory|wallet|p\/)([\w-]+)/)
      if (m) q = 'channel=' + m[1]
    }
    if (!q) return null
    // autoplay=true: ask the twitch player to start on load; mature-flagged
    // channels still gate behind a Start Watching click — twitch policy
    let out = 'https://player.twitch.tv/?' + q + '&autoplay=true'
    const list = (parents || DEFAULT_PARENTS).split(',')
    for (let i = 0; i < list.length; i++) {
      const p = list[i].trim()
      if (p) out += '&parent=' + p
    }
    return out
  }

  function normalizeEmbed(url, parents) {
    const yt = youtubeId(url)
    if (yt) return 'https://www.youtube-nocookie.com/embed/' + yt + '?autoplay=1&playsinline=1'
    return twitchEmbed(url, parents)
  }

  // an iframe's audio cannot be scripted from outside — the embed's own
  // start-muted parameter is the only lever
  function withEmbedMute(url, muted) {
    if (/youtube(-nocookie)?\.com\/embed/.test(url)) return url + (muted ? '&mute=1' : '&mute=0')
    if (/player\.twitch\.tv/.test(url)) return url + (muted ? '&muted=true' : '&muted=false')
    return url
  }

  function sniffKind(url) {
    if (normalizeEmbed(url, props.embedParents || DEFAULT_PARENTS)) return 'embed'
    return 'video'
  }

  // ---------- embed screen (twitch / youtube webviews) ----------
  // Twitch/YouTube pages can never feed a video texture, so those urls are
  // drawn as an in-world webview pinned to the Screens mesh transform. The rig
  // video panel is paused underneath while an embed owns the screen.
  let embedView = null
  let embedSrc = null // the normalized embed url currently shown (null = none)

  // ---------- embed audio election ----------
  // Every surface loads its OWN iframe for an embed, and iframe audio is
  // browser-tab audio — not spatial, not touchable via the engine. Without a
  // rule, N screens = N copies of the same stream playing on top of each
  // other. One surface per (channel, url) wins the audio; everyone else loads
  // the start-muted variant. The winner is the lowest instanceId among
  // announced screens: every screen computes the same answer from the same
  // in-process bus (app.emit IS world.events.emit), and a screen that rebuilds
  // mid-stream re-announces — the sitting winner re-emits on first sight of a
  // new id — so late arrivals converge instead of double-playing.
  const embedKnown = {} // url -> { ids: { id: true } }

  function recordEmbedId(url, id) {
    const rec = embedKnown[url] || (embedKnown[url] = { ids: {} })
    if (rec.ids[id]) return false
    rec.ids[id] = true
    return true
  }

  function embedWinner(url) {
    const rec = embedKnown[url]
    if (!rec) return null
    let best = null
    for (const id in rec.ids) {
      if (best === null || id < best) best = id
    }
    return best
  }

  function announceEmbed(url) {
    recordEmbedId(url, SCREEN_ID)
    app.emit(EMBED_EVENT, { url, id: SCREEN_ID })
  }

  function applyEmbedAudio(url) {
    const mode = props.embedAudio || 'auto'
    let live = false
    if (mode === 'on') live = true
    else if (mode === 'auto') live = embedWinner(url) === SCREEN_ID
    const next = withEmbedMute(url, !live)
    if (embedView.src !== next) embedView.src = next
    console.warn(`[BoltBase] embed audio ${live ? 'LIVE' : 'MUTED'} — ${url.slice(0, 64)} (${mode})`)
  }

  world.on(EMBED_EVENT, ann => {
    if (!ann || !ann.url || !ann.id) return
    if (!recordEmbedId(ann.url, ann.id)) return
    // a rebuilt screen just announced: the sitting winner answers so the
    // newcomer's idea of the set is complete (and cannot double-play)
    if (embedWinner(ann.url) === SCREEN_ID) app.emit(EMBED_EVENT, { url: ann.url, id: SCREEN_ID })
    if (embedSrc === ann.url) applyEmbedAudio(ann.url)
  })

  function ensureEmbedView() {
    if (embedView) return embedView
    const mesh = app.get('Screens')
    if (!mesh) {
      console.error('[BoltBase] "Screens" mesh not found — embed disabled')
      return null
    }
    embedView = app.create('webview', {
      src: null,
      width: props.embedWidth || 6,
      height: props.embedHeight || 3.375,
      factor: props.embedFactor || 150,
      space: 'world',
    })
    embedView.position.copy(mesh.position)
    embedView.quaternion.copy(mesh.quaternion)
    embedView.scale.copy(mesh.scale)
    embedView.position.z += 0.02
    flipFix(embedView)
    app.add(embedView)
    console.warn(`[BoltBase] embed webview armed — ${props.embedWidth || 6}x${props.embedHeight || 3.375}m @ ${props.embedFactor || 150}px/m (tune to the Screens mesh if it does not line up)`)
    return embedView
  }

  function setEmbed(raw) {
    const normalized = normalizeEmbed(raw, props.embedParents || DEFAULT_PARENTS)
    const url = normalized || raw // unknown host: show the page as-is
    if (!ensureEmbedView()) return
    embedSrc = url
    panel?.pause() // the iframe owns the screen now — silence the rig video
    t0 = 0
    if ((props.embedAudio || 'auto') !== 'off') announceEmbed(url)
    applyEmbedAudio(url)
    console.warn(`[BoltBase] embed on screen: ${url.slice(0, 80)}`)
  }

  function clearEmbed() {
    if (!embedSrc) return
    embedSrc = null
    if (embedView) embedView.src = null
    console.warn('[BoltBase] embed cleared')
  }

  // a screen drifts (tab throttle, a cold load, a long frame). Correct past
  // DRIFT — small enough to read as locked, large enough not to fight the
  // element every frame.
  // NOTE: no screenshare guard needed here (unlike bolt-screen) — this panel is
  // created without a screenId, so the engine never registers it as a share
  // target and it can only ever show the rig video.
  app.on('update', () => {
    if (!panel || !t0 || panel.loading || embedSrc) return
    const want = world.getTime() - t0
    if (!panel.playing) {
      // not started yet, or a pause to recover from — one ask every 2s, so a
      // slow load never stacks play() calls
      if (world.getTime() - lastPlayAsk < 2) return
      lastPlayAsk = world.getTime()
      panel.play()
      return
    }
    const duration = panel.duration
    // a livestream (and a vod that has not loaded its duration yet) has no
    // finite duration: the live edge moves and any seek lands on a stale
    // segment, so the rig clock must never seek it — just keep it playing
    // (above) and leave it at the edge
    if (!(isFinite(duration) && duration > 0)) return
    // past one cycle the element's own loop carries it; re-anchoring here
    // would fight the loop (and every screen loops on the same beat anyway)
    if (want > duration - 0.5) return
    if (Math.abs(panel.time - want) > DRIFT) panel.time = want
  })

  world.on(RIG_VIDEO_EVENT, cmd => {
    if (!cmd) return
    if (cmd.action === 'stop') {
      t0 = 0
      clearEmbed()
      panel?.pause()
      streamSrc = false
      return
    }
    if (cmd.action === 'volume') {
      if (embedSrc) {
        // iframe audio is tab audio; the embed player carries its own volume
        console.warn('[BoltBase] rig volume ignored while an embed is on screen')
        return
      }
      if (panel) panel.volume = cmd.value ?? 0
      return
    }
    if (cmd.action !== 'play' || !cmd.url) return
    const url = unwrapStreamUrl(cmd.url)
    const kind = cmd.kind === 'embed' || cmd.kind === 'video' ? cmd.kind : sniffKind(url)
    if (kind === 'embed') {
      setEmbed(url)
      return
    }
    clearEmbed()
    streamSrc = isStreamUrl(url)
    const node = ensurePanel(url)
    if (!node) return
    node.loop = true // the booth re-anchors this on every track change
    node.volume = cmd.volume ?? 0 // 0 by default — the rig track IS the music
    t0 = cmd.t0 ?? world.getTime()
    // a livestream lives at its edge — only file/vod playback joins the
    // shared clock mid-track
    if (!streamSrc) node.time = Math.max(0, world.getTime() - t0)
    node.play()
    debugLog('rig video:', url)
    console.warn(
      `[BoltBase] rig video: ${url.slice(0, 64)}${streamSrc ? ' (live stream)' : ''} vol=${node.volume}` +
        (node.volume === 0 ? ' — silent; raise Screen Volume on the booth to hear it' : ''),
    )
  })

  // move-rebuild healing: a rebuild wipes the listener above (no keepActive
  // API). Ask whoever holds the live command — the booth's client answers on
  // this same bus — until one does.
  let attempts = 0
  const whoisVideo = () => {
    if (t0 || attempts >= 8) return
    attempts++
    app.emit(RIG_VIDEO_WHOIS, { channel: props.channel || 'bolt' })
    setTimeout(whoisVideo, attempts === 1 ? 800 : 2000)
  }
  setTimeout(whoisVideo, 800)
}

// ponytail: never auto-start the LightRig mixer. Looping skinned play() is the
// CPU hog on live (mixer.update every frame). Proximity action opts in.
let lightsOn = false

function playLightAnimation() {
  if (!lightRig) return
  if (!lightsOn) {
    lightRig.play({ name: 'LightsOff', loop: false, fade: 0.5 })
    debugLog('Playing light animation: LightsOff (once)')
    return
  }
  const animName = props.lightAnimation || 'LightsOn'
  lightRig.play({ name: animName, loop: true, fade: 0.5 })
  debugLog('Playing light animation:', animName, '(looping)')
}

function setLights(on) {
  lightsOn = !!on
  if (playAction) playAction.label = lightsOn ? 'Stop Lights' : 'Start Lights'
  playLightAnimation()
  console.warn('[BoltBase] lights', lightsOn ? 'ON' : 'OFF')
}

const playAction = app.create('action', {
  label: lightsOn ? 'Stop Lights' : 'Start Lights',
  distance: 5,
  duration: 0.5,
  onTrigger: () => setLights(!lightsOn),
})
app.add(playAction)

app.on('update', dt => {
  if (lowerTruss && props.lowerTrussSpeed) lowerTruss.rotation.y += props.lowerTrussSpeed * dt
  if (upperTruss && props.upperTrussSpeed) upperTruss.rotation.y += props.upperTrussSpeed * dt
  if (thruster) {
    thruster.rotation.y += -0.1 * dt
    if (thruster.material) thruster.material.textureY += 5 * dt
  }
  if (engineInner) engineInner.rotation.y += -0.1 * dt
  if (engineOuter) engineOuter.rotation.y += -0.1 * dt
  if (tunnel && props.tunnelSpinSpeed) tunnel.rotation.y += props.tunnelSpinSpeed * dt
  const fanSpeed = props.fanSpinSpeed || 0
  if (fanSpeed) {
    for (let i = 0; i < fanGroups.length; i++) fanGroups[i].rotation.x += -fanSpeed * dt
  }
  if (wheelMesh) {
    const wx = props.wheelSpeedX || 0
    const wy = props.wheelSpeedY || 1
    const wz = props.wheelSpeedZ || 0
    if (wx) wheelMesh.rotation.x += wx * dt
    if (wy) wheelMesh.rotation.y += wy * dt
    if (wz) wheelMesh.rotation.z += wz * dt
  }
  if (r1Group) {
    r1Group.rotation.x += (props.r1SpeedX || 0.5) * dt
    r1Group.rotation.y += (props.r1SpeedY || 0) * dt
    r1Group.rotation.z += (props.r1SpeedZ || 0) * dt
  }
  if (r2Group) {
    r2Group.rotation.x += (props.r2SpeedX || 0) * dt
    r2Group.rotation.y += (props.r2SpeedY || 0.5) * dt
    r2Group.rotation.z += (props.r2SpeedZ || 0) * dt
  }
  if (r3Group) {
    r3Group.rotation.x += (props.r3SpeedX || 0) * dt
    r3Group.rotation.y += (props.r3SpeedY || 0) * dt
    r3Group.rotation.z += (props.r3SpeedZ || 0.5) * dt
  }
})

app.on('destroy', () => {
  setLights(false)
})

// ---------- v2: rig-driven audio reactivity ----------
// The surround rig (djbooth -> boltSpeaker apps) announces its live audio
// node id on the client bus ('<ch>:speaker:audio'). AudioReactivity is a
// world-global registry (systems/AudioReactivity.js), so meshes in THIS app
// can link to a node created by ANOTHER app. Same prop-driven bands/colors/
// scales as the local audio links above.
//
// Rebuild healing: if this app rebuilds (moved/edited) its links are gone —
// it whois-es the speakers until one answers with the live audio id.
if (world.isClient && props.reactiveSource !== 'disabled') {
  const CHANNEL = props.channel || 'bolt'
  const AUDIO_EVENT = `${CHANNEL}:speaker:audio`
  const WHOIS_EVENT = `${CHANNEL}:reactive:whois`

  const reactiveTargets = [
    { node: mesh1, key: 'mesh1' },
    { node: mesh2, key: 'mesh2' },
    { node: thruster, key: 'thruster' },
    { node: engineInnerLOD, key: 'engineInner' },
    { node: engineOuterLOD, key: 'engineOuter' },
    { node: tunnelPiece, key: 'tunnel' },
    { node: tableMesh, key: 'table' },
    { node: fanMesh, key: 'fan' },
    { node: r1Mesh, key: 'r1' },
    { node: r2Mesh, key: 'r2' },
    { node: r3Mesh, key: 'r3' },
  ].filter(t => t.node)

  const missing = [
    { node: mesh1, key: props.mesh1 || 'MeshLOD0_2' },
    { node: mesh2, key: props.mesh2 || 'Coolant' },
    { node: thruster, key: 'Thrusters' },
    { node: tunnelPiece, key: props.tunnelMesh || 'tunnelPieceMeshLOD0004_1' },
    { node: fanMesh, key: props.fanMesh || 'FanMeshLOD0_7' },
  ].filter(t => !t.node).map(t => t.key)

  console.warn(
    `[BoltBase] rig reactivity armed — ${reactiveTargets.length} targets` +
    (missing.length ? ` | NOT FOUND in GLB: ${missing.join(', ')} (check Mesh props)` : '')
  )
  if (reactiveTargets.length === 0) {
    console.warn('[BoltBase] no reactivity targets found — GLB node names no longer match props')
  }

  let linkedSourceId = null

  function rigLinkOptions(key) {
    const options = {
      band: props[`${key}Band`] || 'volume',
      scale: props[`${key}Scale`] ?? 1,
      intensity: props[`${key}Intensity`] ?? 1,
      property: 'color',
      color: props[`${key}Color`] || '#ffffff',
    }
    // from/to color lerp (engine supports it natively — getColorFromOptions
    // lerps _fromColor -> _toColor by the band's raw 0..1 energy)
    if (props[`${key}FromColor`] && props[`${key}ToColor`]) {
      options.from = props[`${key}FromColor`]
      options.to = props[`${key}ToColor`]
    }
    return options
  }

  function unlinkRigAudio() {
    if (!linkedSourceId) return
    for (const t of reactiveTargets) {
      try {
        t.node.unlinkAudioReactivity()
      } catch (err) {
        debugLog('unlink failed', t.key, err.message)
      }
    }
    debugLog('unlinked rig audio', linkedSourceId)
    linkedSourceId = null
  }

  function linkRigAudio(audioId) {
    if (linkedSourceId === audioId) return
    unlinkRigAudio()
    for (const t of reactiveTargets) {
      try {
        t.node.linkAudioReactivity(audioId, rigLinkOptions(t.key))
      } catch (err) {
        debugLog('link failed', t.key, err.message)
      }
    }
    linkedSourceId = audioId
    debugLog('linked', reactiveTargets.length, 'targets to speaker audio node', audioId)
  }

  world.on(AUDIO_EVENT, ann => {
    if (!ann) return
    if (ann.playing && ann.audioId) linkRigAudio(ann.audioId)
    else unlinkRigAudio()
  })

  // rebuild/move healing: ask speakers who is playing until answered
  let attempts = 0
  const whois = () => {
    if (linkedSourceId || attempts >= 8) return
    attempts++
    app.emit(WHOIS_EVENT, { channel: CHANNEL })
    debugLog('whois: asking speakers for live audio node (attempt', attempts + ')')
    setTimeout(whois, attempts === 1 ? 800 : 2000)
  }
  setTimeout(whois, 800)

  app.on('destroy', () => unlinkRigAudio())
}
