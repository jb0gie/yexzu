# Audio Reactivity Example

A complete example demonstrating audio reactivity with lights and materials reacting to music frequency data.

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

- **Auto Play on Load** - Start playing automatically when the world loads

## Key Concepts

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
})
```

### Cleanup

Always unlink before removing reactive nodes:

```javascript
node.unlinkAudioReactivity()
world.remove(node)
```

## Files

- `app.js` - Main application with the full demo
- `README.md` - This documentation

## Customization

Replace the audio source with your own music:

```javascript
const audio = world.createNode('audio', {
  src: 'asset://your-music.mp3',
  loop: true,
})
```

Try different scales and offsets:

```javascript
// Subtle reaction
light.linkAudioReactivity(audio.id, { band: 'volume', scale: 0.5, offset: 0.5 })

// Dramatic pulse
light.linkAudioReactivity(audio.id, { band: 'bass', scale: 5, offset: 0.2 })
```
