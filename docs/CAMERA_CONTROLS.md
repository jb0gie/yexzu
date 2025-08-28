# Camera Controls Documentation

Hyperfy includes two camera systems: the legacy camera controls for the singleton camera, and the new Camera node system for multiple cameras with cinematic effects.

## Legacy Camera Controls (Current)

The existing singleton camera can be controlled via `world.cameraControls`:

### ADS Zoom (Aim Down Sights)
- **Right-click**: Hold to zoom in (like aiming in FPS games)
- **Scroll wheel**: Adjust zoom level while zoomed
- Disabled automatically in build mode

### Depth of Field
```javascript
// Enable/disable DOF
world.cameraControls.enableDOF()
world.cameraControls.disableDOF()

// Set focus distance
world.cameraControls.setDOFFocusDistance(10)
```

### Browser Console
```javascript
// Check if camera controls are available
world.cameraControls

// Enable DOF
world.cameraControls.enableDOF()
world.cameraControls.setDOFFocusDistance(5)

// Adjust focal length
world.cameraControls.setFocalLength(85)
```

## Camera Node System (New - Working!)

The Camera node allows multiple cameras with per-camera postprocessing effects. Camera nodes are now functional and can be created through app scripts.

### Creating Camera Nodes

```javascript
// In a HyperScript app
const camera = app.create('camera', {
  name: 'cinematic',
  fov: 35,           // Field of view
  near: 0.1,         // Near clipping plane  
  far: 2000,         // Far clipping plane
  active: true,      // Make this the active camera
  position: [0, 5, 10],
  rotation: [-20, 0, 0],
  
  // Depth of field settings
  dof: {
    enabled: true,
    fStop: 1.4,          // Aperture (lower = more blur)
    focusDistance: 10,   // Focus distance
    maxBlur: 0.025,      // Maximum blur amount
    autofocus: true,     // Enable autofocus
    autofocusSpeed: 2,   // Focus tracking speed
    pentagon: true       // Pentagon bokeh shape
  },
  
  // Bloom effect
  bloom: {
    enabled: true,
    intensity: 0.5,
    luminanceThreshold: 0.8,
    luminanceSmoothing: 0.3
  },
  
  // Vignette effect  
  vignette: {
    enabled: true,
    offset: 0.35,
    darkness: 0.4
  },
  
  // Film grain
  filmGrain: {
    enabled: true,
    intensity: 0.35
  },
  
  // Chromatic aberration
  chromaticAberration: {
    enabled: true,
    offset: [0.002, 0.002]
  }
})

app.add(camera)
```

### Camera Methods

```javascript
// Activation
camera.activate()      // Make this the active camera
camera.deactivate()    // Deactivate

// Camera settings
camera.setFOV(50)
camera.setFocalLength(85)  // In mm
camera.lookAt([0, 0, 0])   // Look at position

// Effect controls
camera.setDOF({ enabled: true, fStop: 1.2 })
camera.setBloom({ intensity: 0.8 })
camera.setVignette({ darkness: 0.5 })
camera.setFilmGrain({ intensity: 0.4 })
```

### Camera Presets

Common camera configurations:

#### Cinematic (35mm)
```javascript
{
  fov: 35,
  dof: { enabled: true, fStop: 1.4, autofocus: true },
  bloom: { enabled: true, intensity: 0.5 },
  vignette: { enabled: true, darkness: 0.4 }
}
```

#### Portrait (50mm)
```javascript
{
  fov: 50,
  dof: { enabled: true, fStop: 1.2, maxBlur: 0.04 },
  bloom: { enabled: true, intensity: 0.3 }
}
```

#### Documentary (24mm)
```javascript
{
  fov: 24,
  dof: { enabled: false },
  bloom: { enabled: false },
  vignette: { enabled: false }
}
```

### Multiple Cameras Example

```javascript
// Create multiple cameras
const cameras = []

// Wide establishing shot
cameras.push(app.create('camera', {
  name: 'wide',
  fov: 24,
  position: [20, 15, 20],
  active: true
}))

// Close-up portrait
cameras.push(app.create('camera', {
  name: 'portrait',
  fov: 50,
  position: [3, 2, 3],
  dof: { enabled: true, fStop: 1.2 }
}))

// Add all cameras
cameras.forEach(cam => app.add(cam))

// Switch cameras
let current = 0
app.on('keydown', (e) => {
  if (e.key === 'c') {
    cameras[current].deactivate()
    current = (current + 1) % cameras.length
    cameras[current].activate()
  }
})
```

## Performance Considerations

- Each camera has its own postprocessing pipeline
- Effects only render when camera is active
- DOF runs at reduced resolution (480p) for performance
- Disable unused effects to improve frame rate
- Autofocus uses raycasting (performance cost)

## Current Limitations

- Camera nodes work through `app.create('camera', {...})` in app scripts
- Only PerspectiveCamera supported (no OrthographicCamera)
- Maximum one active camera at a time
- Some effects may not work in XR mode
- Transitions between cameras are instant (no interpolation yet)
- ChromaticAberration effect temporarily disabled due to postprocessing conflicts
- DOF and ChromaticAberration can't be used together (separated into different passes)

## Migration Guide

Moving from legacy camera controls to Camera nodes:

**Before (Legacy):**
```javascript
world.cameraControls.enableDOF()
world.cameraControls.setDOFFocusDistance(10)
world.cameraControls.setFocalLength(85)
```

**After (Camera Node):**
```javascript
const camera = app.create('camera', {
  fov: 35,
  dof: { enabled: true, focusDistance: 10 },
  active: true
})
app.add(camera)
camera.setFocalLength(85)
```

## Browser Console Testing

```javascript
// Legacy system (currently working)
world.cameraControls.enableDOF()
world.cameraControls.setFocalLength(50)

// Reset camera to defaults (admin only)
world.cameraControls.reset()

// Camera node system
// Cameras must be created through app scripts (see examples/)
// Direct console creation not supported
```

## Working Examples

- `/examples/camera-test.js` - Simple camera node test
- `/examples/cinematic-camera.js` - Cinematic camera with postprocessing
- `/examples/camera-showcase.js` - Multiple camera configurations showcase