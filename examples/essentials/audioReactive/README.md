# Audio Reactivity Example

A complete example demonstrating audio reactivity with lights and materials responding to music frequency data.

## What It Shows

This example creates a 3-light setup where each light responds to different frequency bands:
- **Red Light** - Responds to bass frequencies (kick drum, bass)
- **Green Light** - Responds to mid frequencies (snare, vocals)
- **Blue Light** - Responds to treble frequencies (hi-hats, cymbals)

Plus three emissive primitives that pulse with the music.

## Usage

1. Install the app in your Hyperfy world
2. Walk near the center area
3. Press **E** to start/stop the music
4. Watch the lights and prims react to the audio

## Configuration

- **Audio File** - Upload an audio file to play (required)
- **Auto Play on Load** - Start playing automatically when the world loads

## Key Concepts

### Creating Reactive Lights

```javascript
const light = app.create('light', {
  type: 'point',
  color: '#ff0000',
  intensity: 0.5,
  distance: 100,
})
app.add(light)

// Link to audio source
light.linkAudioReactivity(audio.id, {
  band: 'bass',
  scale: 2,
  offset: 0.5,
})
```

### Creating Reactive Prims

```javascript
const prim = app.create('prim', {
  type: 'box',
  color: '#222222',
  emissive: '#00ffff',
  emissiveIntensity: 0.1,
})
app.add(prim)

// React to volume
prim.linkAudioReactivity(audio.id, {
  band: 'volume',
  scale: 1.5,
  property: 'emissiveIntensity',
})
```

### Frequency Bands

| Band | Frequency Range | Sounds |
|------|----------------|--------|
| bass | 0-172 Hz | Kick drum, bass guitar |
| mid | 172-689 Hz | Snare, vocals, synths |
| treble | 689+ Hz | Hi-hats, cymbals, sibilance |
| volume | All combined | Overall loudness |

### Link Options

```javascript
node.linkAudioReactivity(sourceId, {
  band: 'bass', // 'volume' | 'bass' | 'mid' | 'treble'
  scale: 2, // Multiplier for the audio value
  offset: 0.5, // Base value added to result
  property: 'emissiveIntensity', // For prims: 'emissiveIntensity' | 'emissive'
})
```

### Cleanup

Always unlink before removing reactive nodes:

```javascript
node.unlinkAudioReactivity()
app.remove(node)
```

Or use the destroy event:

```javascript
app.on('destroy', () => {
  light.unlinkAudioReactivity()
})
```

## Files

- `app.js` - Main application with the full demo
- `README.md` - This documentation

## Setup

1. Install the app in your Hyperfy world
2. Open the app settings and upload an audio file
3. Enable "Auto Play on Load" if desired
4. The app will create reactive lights and prims

## Customization

To use your own music, upload an audio file in the app settings or modify the code:

```javascript
app.configure([
  {
    key: 'audioFile',
    type: 'file',
    kind: 'audio',
    label: 'Audio File',
  },
])

const audio = app.create('audio', {
  src: props.audioFile?.url,
  loop: true,
})
app.add(audio)
```

Try different scales and offsets:

```javascript
// Subtle reaction
light.linkAudioReactivity(audio.id, { band: 'volume', scale: 0.5, offset: 0.5 })

// Dramatic pulse
light.linkAudioReactivity(audio.id, { band: 'bass', scale: 5, offset: 0.2 })
```

## Light Types

The Light node supports three types:

```javascript
// Directional light (like sun)
const sun = app.create('light', {
  type: 'directional',
  color: '#ffffff',
  intensity: 1,
})

// Point light (omnidirectional)
const lamp = app.create('light', {
  type: 'point',
  color: '#ffaa00',
  intensity: 1,
  distance: 50,
  decay: 2,
})

// Spot light (cone)
const spotlight = app.create('light', {
  type: 'spot',
  color: '#ffffff',
  intensity: 2,
  distance: 100,
  angle: Math.PI / 6,
  penumbra: 0.2,
})
```
