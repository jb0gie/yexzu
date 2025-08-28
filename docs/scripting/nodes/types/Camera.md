# Camera Node

A cinematic camera node with full Three.js settings and advanced postprocessing effects.

## Creating a Camera

```javascript
const camera = app.create('camera', {
  name: 'myCamera',
  fov: 35,           // Field of view (degrees)
  near: 0.1,         // Near clipping plane
  far: 2000,         // Far clipping plane
  active: false,     // Whether this camera is active
  position: [0, 5, 10],
  rotation: [0, 0, 0]
})
app.add(camera)
```

## Properties

### Basic Camera Settings

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `fov` | number | 35 | Field of view in degrees (35mm equivalent) |
| `aspect` | number | auto | Aspect ratio (auto-calculated from viewport) |
| `near` | number | 0.1 | Near clipping plane distance |
| `far` | number | 2000 | Far clipping plane distance |
| `zoom` | number | 1 | Zoom factor |
| `active` | boolean | false | Whether this camera is the active render camera |

### Depth of Field (DOF)

```javascript
camera.setDOF({
  enabled: true,
  fStop: 1.4,          // Aperture f-stop (lower = more blur)
  focusDistance: 10,   // Distance to focus point
  maxBlur: 0.025,      // Maximum blur amount
  autofocus: true,     // Enable autofocus
  autofocusSpeed: 2,   // Autofocus transition speed
  pentagon: true,      // Pentagon-shaped bokeh
  fringe: 0.7,         // Chromatic aberration in blur
  dithering: 0.0001    // Dither amount
})
```

### Bloom Effect

```javascript
camera.setBloom({
  enabled: true,
  intensity: 0.5,
  luminanceThreshold: 0.8,
  luminanceSmoothing: 0.3,
  radius: 0.8,
  mipmapBlur: true
})
```

### Vignette Effect

```javascript
camera.setVignette({
  enabled: true,
  offset: 0.35,     // Distance from center
  darkness: 0.4     // Darkness intensity
})
```

### Chromatic Aberration

```javascript
camera.setChromaticAberration({
  enabled: true,
  offset: [0.002, 0.002],  // Color channel offset
  radialModulation: true,   // Increase effect at edges
  modulationOffset: 0.15
})
```

### Film Grain

```javascript
camera.setFilmGrain({
  enabled: true,
  intensity: 0.35,
  grainScale: 1.5
})
```

### Tone Mapping

```javascript
camera.toneMapping = {
  enabled: true,
  mode: 'ACES_FILMIC',  // or 'LINEAR', 'REINHARD', etc.
  exposure: 1.0,
  gamma: 2.2
}
```

## Methods

### Camera Control

| Method | Description |
|--------|-------------|
| `activate()` | Make this the active render camera |
| `deactivate()` | Deactivate this camera |
| `setFOV(fov)` | Set field of view |
| `setFocalLength(mm)` | Set focal length (affects FOV) |
| `getFocalLength()` | Get current focal length |
| `setClippingPlanes(near, far)` | Set near/far clipping planes |
| `lookAt(target)` | Point camera at target (Vector3, Node, or [x,y,z]) |

### Effect Methods

| Method | Description |
|--------|-------------|
| `setDOF(settings)` | Update depth of field settings |
| `setBloom(settings)` | Update bloom settings |
| `setVignette(settings)` | Update vignette settings |
| `setChromaticAberration(settings)` | Update chromatic aberration |
| `setFilmGrain(settings)` | Update film grain settings |

## Camera Presets

### Cinematic Wide (35mm)
```javascript
{
  fov: 35,
  dof: { enabled: true, fStop: 1.4, autofocus: true },
  bloom: { enabled: true, intensity: 0.5 },
  vignette: { enabled: true, darkness: 0.4 }
}
```

### Portrait Mode (50mm)
```javascript
{
  fov: 50,
  dof: { enabled: true, fStop: 1.2, maxBlur: 0.04 },
  bloom: { enabled: true, intensity: 0.3 },
  vignette: { enabled: false }
}
```

### Documentary (24mm)
```javascript
{
  fov: 24,
  dof: { enabled: false },
  bloom: { enabled: false },
  vignette: { enabled: false }
}
```

### Film Noir
```javascript
{
  fov: 28,
  dof: { enabled: true, fStop: 2.8 },
  vignette: { enabled: true, darkness: 0.8 },
  filmGrain: { enabled: true, intensity: 0.8 }
}
```

## Example: Complete Cinematic Camera

```javascript
export default function CinematicCamera(world, opts) {
  const app = world.add({
    id: 'cinematic-camera',
    position: opts.position || [0, 0, 0]
  })
  
  // Create cinematic camera
  const camera = app.create('camera', {
    name: 'main-camera',
    fov: 35,
    active: true,
    position: [0, 10, 20],
    
    // Depth of field settings
    dof: {
      enabled: true,
      fStop: 1.4,
      autofocus: true,
      autofocusSpeed: 2
    },
    
    // Visual effects
    bloom: {
      enabled: true,
      intensity: 0.5
    },
    vignette: {
      enabled: true,
      darkness: 0.4
    },
    chromaticAberration: {
      enabled: true,
      offset: [0.002, 0.002]
    },
    filmGrain: {
      enabled: true,
      intensity: 0.35
    }
  })
  
  app.add(camera)
  
  // Keyboard controls
  app.on('keydown', (event) => {
    if (event.key === 'f') {
      // Toggle autofocus
      const current = camera.dof.autofocus
      camera.setDOF({ autofocus: !current })
    }
    
    if (event.key === 'v') {
      // Toggle vignette
      const current = camera.vignette.enabled
      camera.setVignette({ enabled: !current })
    }
  })
  
  // Animate camera
  let time = 0
  app.on('update', (event) => {
    time += event.delta
    
    // Gentle camera drift for handheld feel
    camera.rotation = [
      Math.sin(time * 0.5) * 0.01,
      Math.cos(time * 0.3) * 0.01,
      0
    ]
  })
  
  return { app }
}
```

## Performance Notes

- Each camera has its own postprocessing pipeline
- Effects are only rendered when the camera is active
- Autofocus uses raycasting which has a performance cost
- DOF resolution is limited to 480p for performance
- Consider disabling effects on lower-end devices

## Limitations

- Currently only PerspectiveCamera is supported
- OrthographicCamera support may be added in the future
- Some effects may not work in XR mode
- Maximum of one active camera at a time