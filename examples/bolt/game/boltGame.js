/**
 * boltGame.js - 3D Physical DDR Game for Hyperfy
 * Players stand in trigger zones and press keys to hit arrows flying toward targets
 */

app.configure([
  {
    key: 'audio',
    type: 'file',
    kind: 'audio',
    label: 'Upload Song',
  },
  {
    key: 'sensitivity',
    type: 'number',
    label: 'Sensitivity Boost',
    initial: 1.0,
    min: 0.1,
    max: 5.0,
    dp: 2,
  },
  {
    key: 'rewardThreshold',
    type: 'number',
    label: 'Reward Score Threshold',
    initial: 5000,
  },
  {
    key: 'debugMode',
    type: 'switch',
    label: 'Debug Mode',
    options: [
      { label: 'Enabled', value: 'enabled' },
      { label: 'Disabled', value: 'disabled' },
    ],
    initial: 'disabled',
  },
  {
    key: 'autoTeleport',
    type: 'switch',
    label: 'Auto-Teleport to Zones',
    options: [
      { label: 'Enabled', value: 'enabled' },
      { label: 'Disabled', value: 'disabled' },
    ],
    initial: 'enabled',
  },
  {
    key: 'reactiveSection',
    type: 'section',
    label: 'Audio Reactive Settings',
  },
  {
    key: 'reactiveMesh1',
    type: 'text',
    label: 'Reactive Mesh 1 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh1Band',
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
    key: 'reactiveMesh1Scale',
    type: 'range',
    label: 'Mesh 1 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh1Intensity',
    type: 'range',
    label: 'Mesh 1 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh1Color',
    type: 'color',
    label: 'Mesh 1 Color',
    initial: '#ff00ff',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh2',
    type: 'text',
    label: 'Reactive Mesh 2 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh2Band',
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
    key: 'reactiveMesh2Scale',
    type: 'range',
    label: 'Mesh 2 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh2Intensity',
    type: 'range',
    label: 'Mesh 2 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh2Color',
    type: 'color',
    label: 'Mesh 2 Color',
    initial: '#00ffff',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh3',
    type: 'text',
    label: 'Reactive Mesh 3 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh3Band',
    type: 'switch',
    label: 'Mesh 3 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'mid',
  },
  {
    key: 'reactiveMesh3Scale',
    type: 'range',
    label: 'Mesh 3 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh3Intensity',
    type: 'range',
    label: 'Mesh 3 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh3Color',
    type: 'color',
    label: 'Mesh 3 Color',
    initial: '#00ff00',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh4',
    type: 'text',
    label: 'Reactive Mesh 4 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh4Band',
    type: 'switch',
    label: 'Mesh 4 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'treble',
  },
  {
    key: 'reactiveMesh4Scale',
    type: 'range',
    label: 'Mesh 4 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh4Intensity',
    type: 'range',
    label: 'Mesh 4 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh4Color',
    type: 'color',
    label: 'Mesh 4 Color',
    initial: '#ffff00',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh5',
    type: 'text',
    label: 'Reactive Mesh 5 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh5Band',
    type: 'switch',
    label: 'Mesh 5 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'volume',
  },
  {
    key: 'reactiveMesh5Scale',
    type: 'range',
    label: 'Mesh 5 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh5Intensity',
    type: 'range',
    label: 'Mesh 5 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh5Color',
    type: 'color',
    label: 'Mesh 5 Color',
    initial: '#ff8800',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh6',
    type: 'text',
    label: 'Reactive Mesh 6 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh6Band',
    type: 'switch',
    label: 'Mesh 6 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'bass',
  },
  {
    key: 'reactiveMesh6Scale',
    type: 'range',
    label: 'Mesh 6 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh6Intensity',
    type: 'range',
    label: 'Mesh 6 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh6Color',
    type: 'color',
    label: 'Mesh 6 Color',
    initial: '#ff0088',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh7',
    type: 'text',
    label: 'Reactive Mesh 7 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh7Band',
    type: 'switch',
    label: 'Mesh 7 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'mid',
  },
  {
    key: 'reactiveMesh7Scale',
    type: 'range',
    label: 'Mesh 7 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh7Intensity',
    type: 'range',
    label: 'Mesh 7 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh7Color',
    type: 'color',
    label: 'Mesh 7 Color',
    initial: '#8800ff',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh8',
    type: 'text',
    label: 'Reactive Mesh 8 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh8Band',
    type: 'switch',
    label: 'Mesh 8 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'treble',
  },
  {
    key: 'reactiveMesh8Scale',
    type: 'range',
    label: 'Mesh 8 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh8Intensity',
    type: 'range',
    label: 'Mesh 8 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh8Color',
    type: 'color',
    label: 'Mesh 8 Color',
    initial: '#00ff88',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh9',
    type: 'text',
    label: 'Reactive Mesh 9 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh9Band',
    type: 'switch',
    label: 'Mesh 9 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'volume',
  },
  {
    key: 'reactiveMesh9Scale',
    type: 'range',
    label: 'Mesh 9 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh9Intensity',
    type: 'range',
    label: 'Mesh 9 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh9Color',
    type: 'color',
    label: 'Mesh 9 Color',
    initial: '#ff0088',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh10',
    type: 'text',
    label: 'Reactive Mesh 10 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh10Band',
    type: 'switch',
    label: 'Mesh 10 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'bass',
  },
  {
    key: 'reactiveMesh10Scale',
    type: 'range',
    label: 'Mesh 10 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh10Intensity',
    type: 'range',
    label: 'Mesh 10 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh10Color',
    type: 'color',
    label: 'Mesh 10 Color',
    initial: '#ff5500',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh11',
    type: 'text',
    label: 'Reactive Mesh 11 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh11Band',
    type: 'switch',
    label: 'Mesh 11 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'mid',
  },
  {
    key: 'reactiveMesh11Scale',
    type: 'range',
    label: 'Mesh 11 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh11Intensity',
    type: 'range',
    label: 'Mesh 11 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh11Color',
    type: 'color',
    label: 'Mesh 11 Color',
    initial: '#55ff00',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh12',
    type: 'text',
    label: 'Reactive Mesh 12 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh12Band',
    type: 'switch',
    label: 'Mesh 12 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'treble',
  },
  {
    key: 'reactiveMesh12Scale',
    type: 'range',
    label: 'Mesh 12 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh12Intensity',
    type: 'range',
    label: 'Mesh 12 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh12Color',
    type: 'color',
    label: 'Mesh 12 Color',
    initial: '#0055ff',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh13',
    type: 'text',
    label: 'Reactive Mesh 13 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh13Band',
    type: 'switch',
    label: 'Mesh 13 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'volume',
  },
  {
    key: 'reactiveMesh13Scale',
    type: 'range',
    label: 'Mesh 13 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh13Intensity',
    type: 'range',
    label: 'Mesh 13 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh13Color',
    type: 'color',
    label: 'Mesh 13 Color',
    initial: '#ff0055',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh14',
    type: 'text',
    label: 'Reactive Mesh 14 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh14Band',
    type: 'switch',
    label: 'Mesh 14 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'bass',
  },
  {
    key: 'reactiveMesh14Scale',
    type: 'range',
    label: 'Mesh 14 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh14Intensity',
    type: 'range',
    label: 'Mesh 14 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh14Color',
    type: 'color',
    label: 'Mesh 14 Color',
    initial: '#55ffaa',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh15',
    type: 'text',
    label: 'Reactive Mesh 15 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh15Band',
    type: 'switch',
    label: 'Mesh 15 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'mid',
  },
  {
    key: 'reactiveMesh15Scale',
    type: 'range',
    label: 'Mesh 15 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh15Intensity',
    type: 'range',
    label: 'Mesh 15 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh15Color',
    type: 'color',
    label: 'Mesh 15 Color',
    initial: '#aa55ff',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh16',
    type: 'text',
    label: 'Reactive Mesh 16 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh16Band',
    type: 'switch',
    label: 'Mesh 16 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'treble',
  },
  {
    key: 'reactiveMesh16Scale',
    type: 'range',
    label: 'Mesh 16 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh16Intensity',
    type: 'range',
    label: 'Mesh 16 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh16Color',
    type: 'color',
    label: 'Mesh 16 Color',
    initial: '#ffaa55',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh17',
    type: 'text',
    label: 'Reactive Mesh 17 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh17Band',
    type: 'switch',
    label: 'Mesh 17 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'volume',
  },
  {
    key: 'reactiveMesh17Scale',
    type: 'range',
    label: 'Mesh 17 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh17Intensity',
    type: 'range',
    label: 'Mesh 17 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh17Color',
    type: 'color',
    label: 'Mesh 17 Color',
    initial: '#55aaff',
    description: 'Color for audio reactivity',
  },
  {
    key: 'reactiveMesh18',
    type: 'text',
    label: 'Reactive Mesh 18 Name',
    initial: '',
    description: 'Name of mesh to apply audio reactivity (leave empty to disable)',
  },
  {
    key: 'reactiveMesh18Band',
    type: 'switch',
    label: 'Mesh 18 Audio Band',
    options: [
      { label: 'Volume', value: 'volume' },
      { label: 'Bass', value: 'bass' },
      { label: 'Mid', value: 'mid' },
      { label: 'Treble', value: 'treble' },
    ],
    initial: 'bass',
  },
  {
    key: 'reactiveMesh18Scale',
    type: 'range',
    label: 'Mesh 18 Scale',
    initial: 10,
    min: 0.1,
    max: 50,
    step: 0.1,
  },
  {
    key: 'reactiveMesh18Intensity',
    type: 'range',
    label: 'Mesh 18 Intensity',
    initial: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: 'reactiveMesh18Color',
    type: 'color',
    label: 'Mesh 18 Color',
    initial: '#aa55aa',
    description: 'Color for audio reactivity',
  },
  {
    key: 'gameplaySection',
    type: 'section',
    label: 'Gameplay Settings',
  },
  {
    key: 'difficulty',
    type: 'switch',
    label: 'Game Difficulty',
    options: [
      { label: 'Easy', value: 'easy' },
      { label: 'Normal', value: 'normal' },
      { label: 'Hard', value: 'hard' },
    ],
    initial: 'normal',
  },
  {
    key: 'useAnimlib',
    type: 'switch',
    label: 'Use Animlib Emotes',
    options: [
      { label: 'Enabled', value: 'enabled' },
      { label: 'Disabled', value: 'disabled' },
    ],
    initial: 'disabled',
    description: 'Play dance emotes on hits (requires animlib in world)',
  },
  {
    key: 'colorSection',
    type: 'section',
    label: 'Arrow Colors',
  },
  {
    key: 'leftArrowColor',
    type: 'color',
    label: 'Left Arrow Color',
    initial: '#ff00ff',
  },
  {
    key: 'downArrowColor',
    type: 'color',
    label: 'Down Arrow Color',
    initial: '#00ffff',
  },
  {
    key: 'upArrowColor',
    type: 'color',
    label: 'Up Arrow Color',
    initial: '#00ff00',
  },
  {
    key: 'rightArrowColor',
    type: 'color',
    label: 'Right Arrow Color',
    initial: '#ff0000',
  },
  {
    key: 'ratingSection',
    type: 'section',
    label: 'Rating Colors',
  },
  {
    key: 'perfectColor',
    type: 'color',
    label: 'Perfect Color',
    initial: '#fbbf24',
  },
  {
    key: 'greatColor',
    type: 'color',
    label: 'Great Color',
    initial: '#34d399',
  },
  {
    key: 'goodColor',
    type: 'color',
    label: 'Good Color',
    initial: '#60a5fa',
  },
  {
    key: 'okayColor',
    type: 'color',
    label: 'Okay Color',
    initial: '#a78bfa',
  },
  {
    key: 'missColor',
    type: 'color',
    label: 'Miss Color',
    initial: '#f87171',
  },
])

// Colors from configuration with fallbacks - use as function to get current values
const COLORS = (prop) => {
  const colors = {
    LEFT: app.props.leftArrowColor || '#ff00ff',
    DOWN: app.props.downArrowColor || '#00ffff',
    UP: app.props.upArrowColor || '#00ff00',
    RIGHT: app.props.rightArrowColor || '#ff0000',
    PERFECT: app.props.perfectColor || '#fbbf24',
    GREAT: app.props.greatColor || '#34d399',
    GOOD: app.props.goodColor || '#60a5fa',
    OKAY: app.props.okayColor || '#a78bfa',
    MISS: app.props.missColor || '#f87171',
  }
  return prop ? colors[prop] : colors
}

const DIRS = ['UP', 'DOWN', 'LEFT', 'RIGHT']

// Debug logging
function debugLog(...args) {
  if (app.props.debugMode === 'enabled') {
    console.log('[BoltGame]', ...args)
  }
}

function debugError(...args) {
  console.error('[BoltGame]', ...args)
}

// Animlib helper functions
function shouldUseAnimlib() {
  const enabled = app.props.useAnimlib === 'enabled'
  const isClient = world.isClient
  debugLog('shouldUseAnimlib:', { enabled, isClient, useAnimlibProp: app.props.useAnimlib })
  return enabled && isClient
}

// Available dance animations
const DANCE_ANIMS = [
  'vrmdancecharleston56',
  'vrmdancebodyroll156',
  'vrmdancereachhip61',
]

// Start continuous dance emote while playing
function startGameEmote() {
  debugLog('startGameEmote called')
  if (!shouldUseAnimlib()) {
    debugLog('Animlib not enabled, skipping emote')
    return
  }

  // Pick random animation
  const randomAnim = DANCE_ANIMS[Math.floor(Math.random() * DANCE_ANIMS.length)]
  debugLog('Starting random dance emote:', randomAnim)
  try {
    app.emit('animlib:play', {
      anim: randomAnim,
      target: 'player',
      options: {
        speed: 1.0,
        gaze: false,
        loop: true,
        cancellable: false,
      },
    })
    debugLog('animlib:play emit succeeded')
  } catch (err) {
    debugLog('animlib:play emit failed:', err.message)
  }
}

// Stop the dance emote
function stopGameEmote() {
  debugLog('stopGameEmote called')
  if (!shouldUseAnimlib()) return

  debugLog('Stopping dance emote')
  app.emit('animlib:stop', { target: 'player' })
}

// Scene objects
let down, up, left, right
let arrowTriggerUp, arrowTriggerDown, arrowTriggerLeft, arrowTriggerRight
let arrowUpSpawn, arrowDownSpawn, arrowLeftSpawn, arrowRightSpawn
let upArrowHit, downArrowHit, leftArrowHit, rightArrowHit
let playerStart

// Get scene objects
arrowTriggerUp = app.get('ArrowTriggerUp')
arrowTriggerDown = app.get('ArrowTriggerDown')
arrowTriggerLeft = app.get('ArrowTriggerLeft')
arrowTriggerRight = app.get('ArrowTriggerRight')

arrowUpSpawn = app.get('ArrowUpSpawn')
arrowDownSpawn = app.get('ArrowDownSpawn')
arrowLeftSpawn = app.get('ArrowLeftSpawn')
arrowRightSpawn = app.get('ArrowRightSpawn')

up = app.get('Up')
down = app.get('Down')
left = app.get('Left')
right = app.get('Right')

// Player start position
playerStart = app.get('PlayerStart')

// Individual hit targets per direction
upArrowHit = app.get('UpArrowHit')
downArrowHit = app.get('DownArrowHit')
leftArrowHit = app.get('LeftArrowHit')
rightArrowHit = app.get('RightArrowHit')

// Fallback to legacy ArrowHit for backward compatibility
const legacyArrowHit = app.get('ArrowHit')

// Hide original arrow meshes (they're just templates for cloning)
if (up) up.active = false
if (down) down.active = false
if (left) left.active = false
if (right) right.active = false

// Log scene object status
debugLog('Scene objects loaded:')
debugLog('  Triggers:', { UP: !!arrowTriggerUp, DOWN: !!arrowTriggerDown, LEFT: !!arrowTriggerLeft, RIGHT: !!arrowTriggerRight })
debugLog('  Spawns:', { UP: !!arrowUpSpawn, DOWN: !!arrowDownSpawn, LEFT: !!arrowLeftSpawn, RIGHT: !!arrowRightSpawn })
debugLog('  Targets:', { UP: !!up, DOWN: !!down, LEFT: !!left, RIGHT: !!right })
debugLog('  HitTargets:', { UP: !!upArrowHit, DOWN: !!downArrowHit, LEFT: !!leftArrowHit, RIGHT: !!rightArrowHit })
debugLog('  PlayerStart:', !!playerStart)

const DIRECTIONS = {
  UP: { trigger: arrowTriggerUp, spawn: arrowUpSpawn, target: up, hitTarget: upArrowHit },
  DOWN: { trigger: arrowTriggerDown, spawn: arrowDownSpawn, target: down, hitTarget: downArrowHit },
  LEFT: { trigger: arrowTriggerLeft, spawn: arrowLeftSpawn, target: left, hitTarget: leftArrowHit },
  RIGHT: { trigger: arrowTriggerRight, spawn: arrowRightSpawn, target: right, hitTarget: rightArrowHit },
}

// Get reactive meshes from props
const reactiveMeshes = []
for (let i = 1; i <= 18; i++) {
  const meshName = app.props[`reactiveMesh${i}`]
  if (meshName) {
    reactiveMeshes[i] = app.get(meshName)
  }
}

debugLog('Reactive meshes:', reactiveMeshes.map((m, i) => m ? i : null).filter(i => i))

// Log configuration at startup
debugLog('Configuration:', {
  difficulty: app.props.difficulty,
  useAnimlib: app.props.useAnimlib,
  sensitivity: app.props.sensitivity,
})

// State
app.state.score = 0
app.state.combo = 0
app.state.maxCombo = 0
app.state.isPlaying = false
app.state.arrows = []
app.state.currentZone = null
app.state.misses = 0
app.state.maxMisses = 5

// Dynamic timing windows based on difficulty
const WINDOWS = {
  get PERFECT() {
    return { easy: 0.15, normal: 0.1, hard: 0.08 }[app.props.difficulty || 'normal']
  },
  get GREAT() {
    return { easy: 0.3, normal: 0.2, hard: 0.15 }[app.props.difficulty || 'normal']
  },
  get GOOD() {
    return { easy: 0.45, normal: 0.35, hard: 0.25 }[app.props.difficulty || 'normal']
  },
  get OKAY() {
    return { easy: 0.6, normal: 0.5, hard: 0.35 }[app.props.difficulty || 'normal']
  },
}

const SPAWN_TO_HIT_TIME = 2.0
const BEAT_COOLDOWN = 0.2

// Difficulty multiplier for spawn rate (higher = more arrows)
function getDifficultyMultiplier() {
  return { easy: 0.7, normal: 1.0, hard: 1.4 }[app.props.difficulty || 'normal']
}

const dataArray = new Uint8Array(256)
let lastBeatTimes = { UP: 0, DOWN: 0, LEFT: 0, RIGHT: 0 }
let energyHistory = []

// Audio
const audio = app.create('video', {
  src: app.props.audio?.url,
  visible: false,
  volume: 0.8,
  loop: false,
})
app.add(audio)

// Hit particles
const hitParticles = app.create('particles', {
  max: 100, size: '0.15', color: COLORS('PERFECT'), life: '0.6', speed: '3', emitting: false,
})
app.add(hitParticles)

// UI
const gameUI = app.create('ui', {
  width: 600, height: 400, backgroundColor: 'transparent',
  position: [0.42, 3.5, -3.5], pivot: 'center',
  rotation: [0.5, 0, 0]
})
app.add(gameUI)

const container = app.create('uiview', {
  width: 500, height: 350, backgroundColor: 'transparent',
  flexDirection: 'column', alignItems: 'center',
})
gameUI.add(container)

const topBar = app.create('uiview', {
  width: 460, height: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10,
  borderWidth: 2, borderColor: '#fff', marginBottom: 5,
})
container.add(topBar)

// Find missing objects
const missing = []
if (!arrowTriggerUp) missing.push('ArrowTriggerUp')
if (!arrowTriggerDown) missing.push('ArrowTriggerDown')
if (!arrowTriggerLeft) missing.push('ArrowTriggerLeft')
if (!arrowTriggerRight) missing.push('ArrowTriggerRight')
if (!arrowUpSpawn) missing.push('ArrowUpSpawn')
if (!arrowDownSpawn) missing.push('ArrowDownSpawn')
if (!arrowLeftSpawn) missing.push('ArrowLeftSpawn')
if (!arrowRightSpawn) missing.push('ArrowRightSpawn')
if (!up) missing.push('Up')
if (!down) missing.push('Down')
if (!left) missing.push('Left')
if (!right) missing.push('Right')
if (!upArrowHit) missing.push('UpArrowHit')
if (!downArrowHit) missing.push('DownArrowHit')
if (!leftArrowHit) missing.push('LeftArrowHit')
if (!rightArrowHit) missing.push('RightArrowHit')

const allObjectsFound = missing.length === 0
const statusText = app.create('uitext', {
  value: allObjectsFound ? 'Status: Ready' : `Missing: ${missing.join(', ')}`,
  fontSize: 11,
  color: allObjectsFound ? '#0f0' : '#f00',
  marginBottom: 10,
})
container.add(statusText)

const judgmentView = app.create('uiview', {
  height: 100, width: 300, justifyContent: 'center', alignItems: 'center', marginBottom: 10
})
const ratingText = app.create('uitext', { value: 'READY', fontSize: 64, fontWeight: 'bold', color: '#fff' })
judgmentView.add(ratingText)
container.add(judgmentView)

// Zone indicator
const zoneText = app.create('uitext', { value: 'Zone: None', fontSize: 16, color: '#888', marginBottom: 5 })
container.add(zoneText)

// Arrow count indicator
const arrowCountText = app.create('uitext', { value: 'Arrows: 0', fontSize: 14, color: '#666', marginBottom: 5 })
container.add(arrowCountText)

// Misses indicator
const missesText = app.create('uitext', { value: 'Misses: 0/5', fontSize: 14, color: '#f87171', marginBottom: 10 })
container.add(missesText)

const statsRow = app.create('uiview', {
  flexDirection: 'row', justifyContent: 'space-between', width: 500, paddingLeft: 40, paddingRight: 40
})
const comboBlock = app.create('uiview', { flexDirection: 'column', alignItems: 'center' })
const comboVal = app.create('uitext', { value: '0', fontSize: 48, fontWeight: 'bold', color: COLORS('PERFECT') })
const comboLbl = app.create('uitext', { value: 'COMBO', fontSize: 16, color: '#fff' })
comboBlock.add(comboVal); comboBlock.add(comboLbl)

const scoreBlock = app.create('uiview', { flexDirection: 'column', alignItems: 'flex-end' })
const scoreVal = app.create('uitext', { value: '0000000', fontSize: 32, fontWeight: 'bold', color: '#fff' })
scoreBlock.add(scoreVal)

statsRow.add(comboBlock)
statsRow.add(scoreBlock)
container.add(statsRow)

// Start button
const startBtn = app.create('uiview', {
  width: 140, height: 50, backgroundColor: COLORS('GREAT'), borderRadius: 25,
  justifyContent: 'center', alignItems: 'center', cursor: 'pointer', marginTop: 25,
})
startBtn.add(app.create('uitext', { value: 'PLAY SONG', color: 'white', fontWeight: 'bold' }))
startBtn.onPointerDown = () => {
  debugLog('Start button clicked')
  debugLog('Audio src:', audio.src)
  debugLog('Props audio:', app.props.audio?.url)

  if (!app.props.audio?.url) {
    ratingText.value = 'NO SONG!'
    ratingText.color = '#f00'
    debugLog('ERROR: No audio file configured')
    return
  }

  // Always set src before playing
  audio.src = app.props.audio.url
  debugLog('Set audio src to:', app.props.audio.url)

  resetGame()

  // Try to play with error handling
  try {
    const playResult = audio.play()
    debugLog('Audio play() called, result:', playResult)

    // Link audio reactivity after a short delay to ensure audio is ready
    setTimeout(() => {
      linkAudioReactivity()
    }, 200)

    // Check if audio started
    setTimeout(() => {
      debugLog('After play - audio.playing:', audio.playing, 'audio.currentTime:', audio.currentTime)
      if (!audio.playing) {
        ratingText.value = 'AUDIO ERROR'
        ratingText.color = '#f00'
        debugLog('ERROR: Audio not playing after play() call')
      }
    }, 100)
  } catch (err) {
    debugLog('ERROR playing audio:', err.message)
    ratingText.value = 'PLAY ERROR'
    ratingText.color = '#f00'
  }
}
container.add(startBtn)

// Test button (spawns arrows without audio)
const testBtn = app.create('uiview', {
  width: 120, height: 40, backgroundColor: '#666', borderRadius: 20,
  justifyContent: 'center', alignItems: 'center', cursor: 'pointer', marginTop: 10,
})
testBtn.add(app.create('uitext', { value: 'TEST MODE', color: 'white', fontSize: 14 }))
testBtn.onPointerDown = () => {
  debugLog('Test mode activated')
  resetGame()
  app.state.isPlaying = true
  ratingText.value = 'TESTING'
  ratingText.color = '#0f0'
}
container.add(testBtn)

// Reward button
const rewardBtn = app.create('uiview', {
  width: 200, height: 50, backgroundColor: COLORS('PERFECT'), borderRadius: 25,
  justifyContent: 'center', alignItems: 'center', cursor: 'pointer', marginTop: 15, display: 'none',
})
rewardBtn.add(app.create('uitext', { value: 'CLAIM REWARD', color: '#000', fontWeight: 'bold' }))
container.add(rewardBtn)

rewardBtn.onPointerDown = async () => {
  if (!world.evm) return
  ratingText.value = 'CONNECTING...'
  const res = await world.evm.connect()
  if (res.success) {
    ratingText.value = 'REWARD SENT!'
    rewardBtn.display = 'none'
  } else {
    ratingText.value = 'CONN ERROR'
  }
}

// Exit/Quit button
const exitBtn = app.create('uiview', {
  width: 120, height: 40, backgroundColor: COLORS('MISS'), borderRadius: 20,
  justifyContent: 'center', alignItems: 'center', cursor: 'pointer', marginTop: 10,
})
exitBtn.add(app.create('uitext', { value: 'EXIT GAME', color: 'white', fontSize: 14 }))
exitBtn.onPointerDown = () => {
  exitGame()
}
container.add(exitBtn)

// Link meshes to audio reactivity
function linkAudioReactivity() {
  if (!audio.id) return

  for (let i = 1; i <= 18; i++) {
    const mesh = reactiveMeshes[i]
    if (!mesh) continue

    const options = {
      band: app.props[`reactiveMesh${i}Band`] || 'volume',
      scale: app.props[`reactiveMesh${i}Scale`] ?? 10,
      intensity: app.props[`reactiveMesh${i}Intensity`] ?? 1,
      property: 'color',
      color: app.props[`reactiveMesh${i}Color`] || '#ffffff',
    }
    mesh.linkAudioReactivity(audio.id, options)
    debugLog(`Linked reactiveMesh${i}:`, options)
  }
}

// Unlink meshes from audio reactivity
function unlinkAudioReactivity() {
  for (let i = 1; i <= 18; i++) {
    if (reactiveMeshes[i]) {
      reactiveMeshes[i].unlinkAudioReactivity()
    }
  }
  debugLog('Unlinked all reactive meshes')
}

// Exit game function
function exitGame() {
  debugLog('Exiting game')
  app.state.isPlaying = false
  app.state.currentZone = null
  app.state.misses = 0
  updateZoneDisplay()
  ratingText.value = 'EXITED'
  ratingText.color = '#888'
  // Stop audio
  if (audio.playing) {
    audio.stop()
    debugLog('Audio stopped')
  }
  // Unlink audio reactivity
  unlinkAudioReactivity()
  // Clear all arrows
  app.state.arrows.forEach(a => { if (a.node) world.remove(a.node) })
  app.state.arrows = []
  updateDisplays()
  // Reset key states to prevent stuck keys
  keyStates.left = false
  keyStates.right = false
  keyStates.up = false
  keyStates.down = false
  // Reset beat detection
  lastBeatTimes = { UP: 0, DOWN: 0, LEFT: 0, RIGHT: 0 }
  energyHistory = []
  // Stop dance emote
  stopGameEmote()
  // Teleport player back to start
  teleportToStart()
}

// Game over function
function gameOver() {
  debugLog('Game over - too many misses')
  app.state.isPlaying = false
  app.state.currentZone = null
  updateZoneDisplay()
  ratingText.value = 'GAME OVER'
  ratingText.color = COLORS('MISS')
  // Stop audio
  if (audio.playing) {
    audio.stop()
    debugLog('Audio stopped')
  }
  // Unlink audio reactivity
  unlinkAudioReactivity()
  // Clear all arrows
  app.state.arrows.forEach(a => { if (a.node) world.remove(a.node) })
  app.state.arrows = []
  updateDisplays()
  // Reset key states
  keyStates.left = false
  keyStates.right = false
  keyStates.up = false
  keyStates.down = false
  // Stop dance emote
  stopGameEmote()
  // Teleport player back to start
  teleportToStart()
}

// Trigger handlers
function setupTriggerHandlers() {
  if (arrowTriggerUp) {
    arrowTriggerUp.onTriggerEnter = (e) => {
      if (!e.playerId) return
      const player = world.getPlayer()
      if (!player || e.playerId !== player.id) return
      app.state.currentZone = 'UP'
      debugLog('Entered zone: UP')
      updateZoneDisplay()
    }
    arrowTriggerUp.onTriggerExit = (e) => {
      if (!e.playerId) return
      const player = world.getPlayer()
      if (!player || e.playerId !== player.id) return
      if (app.state.currentZone === 'UP') {
        app.state.currentZone = null
        debugLog('Exited zone: UP')
        updateZoneDisplay()
      }
    }
  }

  if (arrowTriggerDown) {
    arrowTriggerDown.onTriggerEnter = (e) => {
      if (!e.playerId) return
      const player = world.getPlayer()
      if (!player || e.playerId !== player.id) return
      app.state.currentZone = 'DOWN'
      debugLog('Entered zone: DOWN')
      updateZoneDisplay()
    }
    arrowTriggerDown.onTriggerExit = (e) => {
      if (!e.playerId) return
      const player = world.getPlayer()
      if (!player || e.playerId !== player.id) return
      if (app.state.currentZone === 'DOWN') {
        app.state.currentZone = null
        debugLog('Exited zone: DOWN')
        updateZoneDisplay()
      }
    }
  }

  if (arrowTriggerLeft) {
    arrowTriggerLeft.onTriggerEnter = (e) => {
      if (!e.playerId) return
      const player = world.getPlayer()
      if (!player || e.playerId !== player.id) return
      app.state.currentZone = 'LEFT'
      debugLog('Entered zone: LEFT')
      updateZoneDisplay()
    }
    arrowTriggerLeft.onTriggerExit = (e) => {
      if (!e.playerId) return
      const player = world.getPlayer()
      if (!player || e.playerId !== player.id) return
      if (app.state.currentZone === 'LEFT') {
        app.state.currentZone = null
        debugLog('Exited zone: LEFT')
        updateZoneDisplay()
      }
    }
  }

  if (arrowTriggerRight) {
    arrowTriggerRight.onTriggerEnter = (e) => {
      if (!e.playerId) return
      const player = world.getPlayer()
      if (!player || e.playerId !== player.id) return
      app.state.currentZone = 'RIGHT'
      debugLog('Entered zone: RIGHT')
      updateZoneDisplay()
    }
    arrowTriggerRight.onTriggerExit = (e) => {
      if (!e.playerId) return
      const player = world.getPlayer()
      if (!player || e.playerId !== player.id) return
      if (app.state.currentZone === 'RIGHT') {
        app.state.currentZone = null
        debugLog('Exited zone: RIGHT')
        updateZoneDisplay()
      }
    }
  }
}

setupTriggerHandlers()

// Spawn arrow - spawns at spawner location, moves UP toward direction-specific hit target
function spawnArrow(dir) {
  debugLog('spawnArrow called:', dir)
  const data = DIRECTIONS[dir]

  if (!data) {
    debugError('No data for direction:', dir)
    return
  }
  if (!data.spawn) {
    debugError('Missing spawn for:', dir)
    return
  }
  if (!data.target) {
    debugError('Missing target for:', dir)
    return
  }

  // Use direction-specific hit target, fallback to legacy ArrowHit
  const hitTarget = data.hitTarget || legacyArrowHit
  if (!hitTarget) {
    debugError('Missing hit target for:', dir)
    return
  }

  try {
    // Temporarily activate target for cloning
    data.target.active = true

    // Clone the arrow mesh with deep clone
    const arrowNode = data.target.clone(true)
    arrowNode.active = true
    debugLog('Arrow cloned successfully')

    // Hide target again after cloning
    data.target.active = false

    // Get spawn position and rotation from spawner
    const spawnMatrix = data.spawn.getWorldMatrix(new Matrix4())
    const hitMatrix = hitTarget.getWorldMatrix(new Matrix4())

    const spawnPos = new Vector3()
    const hitPos = new Vector3()
    const spawnQuat = new Quaternion()
    spawnPos.setFromMatrixPosition(spawnMatrix)
    hitPos.setFromMatrixPosition(hitMatrix)
    spawnQuat.setFromRotationMatrix(spawnMatrix)

    // Position arrow at spawner location with spawner's rotation
    arrowNode.position.copy(spawnPos)
    arrowNode.quaternion.copy(spawnQuat)
    debugLog('Arrow positioned at spawner:', spawnPos.toArray(), 'rotation:', spawnQuat.toArray())

    // Add to world
    world.add(arrowNode)
    debugLog('Arrow added to world')

    // Store arrow data - moves from spawn position toward direction-specific hit target
    const startTime = world.getTime()
    app.state.arrows.push({
      dir,
      node: arrowNode,
      startPos: spawnPos.clone(),
      targetPos: hitPos.clone(),
      hitTarget: hitTarget,
      startTime: startTime,
      travelTime: SPAWN_TO_HIT_TIME,
      dead: false
    })

    debugLog('Arrow spawned. Total arrows:', app.state.arrows.length)
    updateDisplays()

  } catch (error) {
    debugError('Error spawning arrow:', error)
  }
}

// Teleport player to start position
function teleportToStart() {
  if (!playerStart) {
    debugLog('PlayerStart not found, cannot teleport')
    return
  }

  const player = world.getPlayer()
  if (!player) {
    debugLog('No player found, cannot teleport')
    return
  }

  const startMatrix = playerStart.getWorldMatrix(new Matrix4())
  const startPos = new Vector3()
  startPos.setFromMatrixPosition(startMatrix)

  player.teleport(startPos)
  debugLog('Teleported to PlayerStart:', startPos.x, startPos.y, startPos.z)
}

// Teleport player to a specific trigger zone
function teleportToZone(dir) {
  if (app.props.autoTeleport !== 'enabled') return
  if (!app.state.isPlaying) return

  const player = world.getPlayer()
  if (!player) return

  const data = DIRECTIONS[dir]
  if (!data || !data.trigger) return

  // Get trigger position
  const triggerMatrix = data.trigger.getWorldMatrix(new Matrix4())
  const triggerPos = new Vector3()
  triggerPos.setFromMatrixPosition(triggerMatrix)

  // Teleport player to trigger position (keep current Y or use trigger Y)
  const playerPos = player.position
  const targetY = playerPos.y !== undefined ? playerPos.y : triggerPos.y

  // Create target position Vector3 - teleport expects a Vector3 object
  const targetPos = new Vector3(triggerPos.x, targetY, triggerPos.z)
  player.teleport(targetPos)
  app.state.currentZone = dir
  updateZoneDisplay()
  debugLog('Teleported to zone:', dir, 'at', targetPos.x, targetPos.y, targetPos.z)

  // Spawn teleport effect
  spawnTeleportEffect(triggerPos)
}

// Spawn visual effect when teleporting
function spawnTeleportEffect(pos) {
  const effect = app.create('particles', {
    max: 30,
    size: '0.05~0.15',
    color: '#ffffff~#a8d8ff',
    life: '0.3~0.6',
    speed: '2~4',
    direction: 1,
    emitting: true,
    space: 'world',
  })
  app.add(effect)
  if (effect && effect.position) {
    effect.position.x = pos.x
    effect.position.y = pos.y
    effect.position.z = pos.z
  }
  setTimeout(() => { if (effect) app.remove(effect) }, 600)
}

// Handle hit - check if arrow is near ArrowHit when player presses key in zone
function handleHit(dir) {
  debugLog('handleHit:', dir, 'isPlaying:', app.state.isPlaying)

  if (!app.state.isPlaying) {
    debugLog('Not playing, ignoring hit')
    return
  }

  // Find the closest arrow to ArrowHit for this direction
  let closest = null
  let bestProgress = -1
  const currentTime = world.getTime()

  for (const arrow of app.state.arrows) {
    if (arrow.dir === dir && !arrow.dead) {
      const progress = (currentTime - arrow.startTime) / arrow.travelTime
      // Arrow is hittable when near ArrowHit (progress 0.7 to 1.1)
      if (progress >= 0.7 && progress <= 1.1) {
        if (progress > bestProgress) {
          bestProgress = progress
          closest = arrow
        }
      }
    }
  }

  if (closest) {
    // Calculate timing accuracy based on how close to ArrowHit (progress = 1.0)
    const progress = (currentTime - closest.startTime) / closest.travelTime
    const diff = Math.abs(1.0 - progress) * closest.travelTime
    debugLog('Hit! progress:', progress.toFixed(3), 'diff:', diff.toFixed(3))
    scoreHit(closest, diff)
  } else {
    debugLog('Miss - no hittable arrow near ArrowHit')
  }
}

// Score hit - particles spawn at direction-specific hit target location
function scoreHit(arrow, diff) {
  arrow.dead = true
  if (arrow.node) world.remove(arrow.node)

  let points = 0; let rating = ''; let color = ''
  if (diff < WINDOWS.PERFECT) { points = 1000; rating = 'PERFECT!!'; color = COLORS('PERFECT') }
  else if (diff < WINDOWS.GREAT) { points = 600; rating = 'GREAT!'; color = COLORS('GREAT') }
  else if (diff < WINDOWS.GOOD) { points = 300; rating = 'GOOD'; color = COLORS('GOOD') }
  else { points = 100; rating = 'OKAY'; color = COLORS('OKAY') }

  app.state.score += points
  app.state.combo++
  app.state.maxCombo = Math.max(app.state.maxCombo, app.state.combo)

  showJudgment(rating, color)

  // Spawn particles at the arrow's specific hit target position
  const hitTarget = arrow.hitTarget || upArrowHit || downArrowHit || leftArrowHit || rightArrowHit || legacyArrowHit
  if (hitTarget && hitParticles) {
    hitParticles.position.copy(hitTarget.position)
    hitParticles.color = color
    hitParticles.emitting = true
    setTimeout(() => { if (hitParticles) hitParticles.emitting = false }, 100)
  }
  updateDisplays()
}

function showJudgment(text, color) {
  ratingText.value = text
  ratingText.color = color
  debugLog('Judgment:', text)
}

function updateDisplays() {
  scoreVal.value = app.state.score.toString().padStart(8, '0')
  comboVal.value = app.state.combo.toString()
  arrowCountText.value = `Arrows: ${app.state.arrows.length}`
  missesText.value = `Misses: ${app.state.misses}/${app.state.maxMisses}`
}

function updateZoneDisplay() {
  zoneText.value = `Zone: ${app.state.currentZone || 'None'}`
  zoneText.color = app.state.currentZone ? COLORS(app.state.currentZone) : '#888'
}

function resetGame() {
  debugLog('resetGame called')
  app.state.score = 0
  app.state.combo = 0
  app.state.misses = 0
  app.state.arrows.forEach(a => { if (a.node) world.remove(a.node) })
  app.state.arrows = []
  lastBeatTimes = { UP: 0, DOWN: 0, LEFT: 0, RIGHT: 0 }
  energyHistory = []
  ratingText.value = 'GO!'
  ratingText.color = '#fff'
  if (rewardBtn) rewardBtn.display = 'none'
  updateDisplays()
  // Teleport player to start position
  teleportToStart()
  debugLog('Game reset complete')
}

function handleSongEnd() {
  app.state.isPlaying = false
  app.state.currentZone = null
  updateZoneDisplay()
  // Clear any remaining arrows
  app.state.arrows.forEach(a => { if (a.node) world.remove(a.node) })
  app.state.arrows = []
  updateDisplays()
  if (app.state.score >= (app.props.rewardThreshold || 5000)) {
    rewardBtn.display = 'flex'
    ratingText.value = 'VICTORY!'
    ratingText.color = COLORS('PERFECT')
  } else {
    ratingText.value = 'TRY AGAIN'
    ratingText.color = COLORS('MISS')
  }
}

// Track if we've logged the audio status
let audioStatusLogged = false

// Track update loop
let lastUpdateLog = 0

// Control reference for input handling
let control = null
if (world.isClient) {
  control = app.control()
}

// Key state tracking
let keyStates = {
  left: false,
  right: false,
  up: false,
  down: false,
  escape: false
}

// Update loop
app.on('update', () => {
  if (!world.isClient) return

  // Log every 2 seconds that update is running
  const nowTime = Date.now()
  if (nowTime - lastUpdateLog > 2000) {
    debugLog('Update loop running - isPlaying:', app.state.isPlaying, 'arrows:', app.state.arrows.length, 'audioPlaying:', audio.playing)
    lastUpdateLog = nowTime
  }

  if (app.props.audio?.url && audio.src !== app.props.audio.url) {
    audio.src = app.props.audio.url
    debugLog('Audio src updated:', app.props.audio.url)
  }

  // Log audio status once
  if (!audioStatusLogged && app.props.debugMode === 'enabled') {
    const audioData = world.audioReactivity?.getBands?.(audio.id)
    debugLog('Audio status - src:', !!audio.src, 'playing:', audio.playing, 'audioData:', !!audioData)
    audioStatusLogged = true
  }

  // Handle keyboard input using app.control() pattern
  if (control) {
    // Check for key presses (WASD and Arrow keys)
    const leftPressed = control.keyArrowLeft?.pressed || control.keyA?.pressed
    const rightPressed = control.keyArrowRight?.pressed || control.keyD?.pressed
    const upPressed = control.keyArrowUp?.pressed || control.keyW?.pressed
    const downPressed = control.keyArrowDown?.pressed || control.keyS?.pressed

    // Trigger on rising edge (key just pressed)
    // Only process game input when playing
    if (app.state.isPlaying) {
      // Teleport first, then attempt hit (combines movement + hit into one action)
      if (leftPressed && !keyStates.left) {
        teleportToZone('LEFT')
        if (app.state.currentZone === 'LEFT') handleHit('LEFT')
      }
      if (rightPressed && !keyStates.right) {
        teleportToZone('RIGHT')
        if (app.state.currentZone === 'RIGHT') handleHit('RIGHT')
      }
      if (upPressed && !keyStates.up) {
        teleportToZone('UP')
        if (app.state.currentZone === 'UP') handleHit('UP')
      }
      if (downPressed && !keyStates.down) {
        teleportToZone('DOWN')
        if (app.state.currentZone === 'DOWN') handleHit('DOWN')
      }
    }

    // Exit game on Escape key
    const escapePressed = control.keyEscape?.pressed
    if (escapePressed && !keyStates.escape && app.state.isPlaying) {
      exitGame()
    }

    // Update key states
    keyStates.left = leftPressed
    keyStates.right = rightPressed
    keyStates.up = upPressed
    keyStates.down = downPressed
    keyStates.escape = escapePressed
  }

  try {
    if (audio.playing || app.state.isPlaying) {
      if (!app.state.isPlaying && audio.playing) {
        debugLog('Audio started playing! isPlaying was:', app.state.isPlaying, 'audio.playing:', audio.playing)
        // Start dance emote when game begins
        startGameEmote()
      }
      app.state.isPlaying = true
      // Use audio time when playing, otherwise use world time for test mode
      const now = audio.playing ? audio.currentTime : world.getTime()

      // Beat detection using audio reactivity system
      const audioData = world.audioReactivity?.getBands?.(audio.id)
      if (audioData?.raw) {
        const freq = audioData.raw

        let totalEnergy = 0; for (let i = 0; i < 64; i++) totalEnergy += freq[i]
        const currentEnergy = totalEnergy / 64 / 255
        energyHistory.push(currentEnergy)
        if (energyHistory.length > 50) energyHistory.shift()

        const avgEnergy = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length
        // Apply difficulty multiplier: easy = fewer arrows, hard = more arrows
        const threshold = avgEnergy * (1.5 / (app.props.sensitivity || 1)) / getDifficultyMultiplier()

        let beatDetected = false
        const bands = { LEFT: [2, 10], DOWN: [10, 30], UP: [30, 70], RIGHT: [70, 150] }
        for (const [dir, [start, end]] of Object.entries(bands)) {
          let sum = 0; for (let i = start; i < end; i++) sum += freq[i]
          const val = sum / (end - start) / 255
          if (val > threshold && val > 0.1 && now > lastBeatTimes[dir] + BEAT_COOLDOWN) {
            debugLog('Beat detected:', dir, 'val:', val.toFixed(3), 'threshold:', threshold.toFixed(3))
            spawnArrow(dir); lastBeatTimes[dir] = now
            beatDetected = true
          }
        }
      } else {
        // No audio data - spawn arrows on timer for testing
        if (Math.random() < 0.03) {
          const randomDir = DIRS[Math.floor(Math.random() * DIRS.length)]
          debugLog('Test spawn (no audio data):', randomDir)
          spawnArrow(randomDir)
        }
      }

      // Move arrows
      const currentTime = world.getTime()
      for (let i = app.state.arrows.length - 1; i >= 0; i--) {
        const arrow = app.state.arrows[i]
        if (!arrow || arrow.dead) continue

        // Calculate progress based on elapsed time
        const elapsedTime = currentTime - arrow.startTime
        const progress = Math.min(elapsedTime / arrow.travelTime, 1)

        if (arrow.node) {
          // Lerp from startPos to targetPos
          arrow.node.position.lerpVectors(arrow.startPos, arrow.targetPos, progress)
        }

        // Remove when reaching target
        if (progress >= 1) {
          debugLog('Arrow reached target (miss):', arrow.dir)
          arrow.dead = true
          if (arrow.node) world.remove(arrow.node)
          app.state.combo = 0
          app.state.misses++
          showJudgment('MISS', COLORS('MISS'))
          updateDisplays()
          // Check for game over
          if (app.state.misses >= app.state.maxMisses) {
            gameOver()
            return
          }
        }
      }
    } else {
      if (app.state.isPlaying) {
        handleSongEnd()
        // Stop dance emote when game ends
        stopGameEmote()
      }
      app.state.isPlaying = false
    }
  } catch (err) { }
})

// Cleanup on destroy
app.on('destroy', () => {
  unlinkAudioReactivity()
  stopGameEmote()
})