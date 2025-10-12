# Hyperfy Camera System - Complete Documentation

## Table of Contents
1. [Quick Start Guide](#quick-start-guide)
2. [Core Concepts](#core-concepts)
3. [Complete Parameter Reference](#complete-parameter-reference)
4. [Advanced Techniques](#advanced-techniques)
5. [Best Practices](#best-practices)
6. [Performance Guide](#performance-guide)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)

---

## Quick Start Guide

### Basic Camera Setup

The fastest way to create a camera:

```javascript
// Simple world-space camera
const camera = app.create('camera', {
  name: 'my-camera',
  position: [0, 2, 5],
  rotation: [-0.2, 0, 0],
  fov: 73,
  active: true
})
app.add(camera)
```

### Player-Following Camera

```javascript
// Camera attached to player rig
const playerCamera = app.create('camera', {
  name: 'player-camera',
  position: [0, 1.6, 3],
  active: true,
  attachToRig: true,
  isPlayerCamera: true
})
app.add(playerCamera)
```

### Free-Flying Camera

```javascript
// WASD-controlled spectator camera
const freeCamera = app.create('camera', {
  name: 'free-camera',
  position: [5, 5, 5],
  fov: 75,
  freeFlying: true,
  flySpeed: 8,
  lookSensitivity: 0.003
})
app.add(freeCamera)
```

---

## Core Concepts

### Camera Node Architecture

Hyperfy uses a **node-based camera system** where each camera is a scene node with full Three.js integration:

- **Camera Nodes**: Extend the base Node class, can be parented to objects
- **CameraManager**: Central system that tracks and switches between cameras
- **Post-processing**: Each camera has its own effect pipeline
- **Free-flying**: Optional WASD/mouse control for spectator cameras

### Camera Types

1. **Static Cameras**: Fixed position in world space
2. **Rig-Attached Cameras**: Follow the player rig
3. **Free-Flying Cameras**: User-controlled movement
4. **Player Cameras**: Main player viewpoint

### Activation System

```javascript
// Multiple ways to activate a camera
camera.active = true                    // Direct activation
world.cameraManager.setActiveCamera(camera) // Via manager
camera.activate()                       // Method call
```

---

## Complete Parameter Reference

### Basic Camera Properties

```javascript
const camera = app.create('camera', {
  // Core Three.js settings
  name: 'camera-name',           // Unique identifier
  position: [x, y, z],           // World position
  rotation: [x, y, z],           // Euler angles in radians
  fov: 73,                       // Field of view in degrees (default: 35)
  near: 0.1,                     // Near clipping plane (default: 0.1)
  far: 2000,                     // Far clipping plane (default: 2000)
  zoom: 1,                       // Camera zoom (default: 1)

  // Camera behavior
  active: false,                 // Whether this camera is initially active
  attachToRig: false,            // Attach to player rig?
  isPlayerCamera: false,          // Is this the main player camera?
  showHelper: true,              // Show camera frustum visualization
  helperScale: 0.3,              // Scale of helper visualization

  // Free-flying controls
  freeFlying: false,             // Enable WASD controls
  flySpeed: 5,                   // Movement speed
  flyBoostMultiplier: 3,         // Speed multiplier with Shift
  lookSensitivity: 0.003,        // Mouse look sensitivity
  smoothMovement: true,          // Smooth acceleration
  freeBody: 'noclip',            // 'noclip' or 'capsule' for physics
})
```

### Motion System Parameters

```javascript
motion: {
  enabled: true,                          // Enable organic movement
  bobAmount: 0.05,                       // Vertical bobbing intensity
  bobSpeed: 0.15,                        // Bobbing frequency
  swayAmount: 0.02,                      // Side-to-side sway
  swaySpeed: 0.1,                        // Sway frequency
  dampingFactor: 0.85,                  // Motion smoothing (0-1)
  breathingAmount: 0.01,                 // Subtle breathing motion
  breathingSpeed: 0.3,                   // Breathing frequency
  handheldShake: 0.001,                  // Micro handheld shake
  velocityInfluence: 0.3,                // How much movement affects camera
}
```

### Depth of Field (DOF) Parameters

```javascript
dof: {
  enabled: true,                          // Enable DOF effect
  focusDistance: 10,                      // Distance in world units
  focalLength: 35,                        // Focal length in mm
  fStop: 2.8,                            // Aperture (lower = shallower DOF)
  maxBlur: 0.03,                         // Maximum blur intensity
  autofocus: false,                       // Auto-focus on center screen
  autofocusSpeed: 8,                     // Focus pull speed
  autofocusSmoothness: 0.08,             // Focus smoothing
  luminanceThreshold: 0.2,               // Brightness threshold
  luminanceGain: 5,                       // Brightness boost for bokeh
  bias: 0.05,                            // Focus transition sharpness
  fringe: 1.5,                           // Chromatic aberration in bokeh
  pentagon: true,                        // Pentagon-shaped bokeh
  shapeBlur: 2.0                         // Bokeh shape intensity
}
```

### Post-Processing Effects

#### Bloom Effect
```javascript
bloom: {
  enabled: true,                          // Enable bloom
  intensity: 0.8,                        // Bloom strength
  luminanceThreshold: 0.7,               // Brightness threshold
  luminanceSmoothing: 0.4,                // Threshold smoothing
  radius: 1.0,                          // Bloom radius
  mipmapBlur: true                       // Use mipmap blur
}
```

#### Vignette Effect
```javascript
vignette: {
  enabled: true,                          // Enable vignette
  offset: 0.35,                          // Vignette start (0-1)
  darkness: 0.4,                         // Vignette darkness (0-1)
}
```

#### Chromatic Aberration
```javascript
chromaticAberration: {
  enabled: true,                          // Enable chromatic aberration
  offset: [0.004, 0.004],               // RGB channel offset
  radialModulation: true,                 // Vary effect by distance
  modulationOffset: 0.25                  // Modulation intensity
}
```

#### Film Grain
```javascript
filmGrain: {
  enabled: true,                          // Enable film grain
  intensity: 0.35,                       // Grain intensity
  grainScale: 1.5                        // Grain size
}
```

#### Tone Mapping
```javascript
toneMapping: {
  enabled: true,                          // Enable tone mapping
  mode: 'ACES_FILMIC',                    // Tone mapping mode
  exposure: 1.0,                         // Exposure compensation
  gamma: 2.2                             // Gamma correction
}
```

### Advanced Effects

#### Color Grading (LUT)
```javascript
colorLUT: {
  enabled: false,                         // Enable 3D LUT
  url: 'path/to/lut.png',                // LUT texture URL
  intensity: 1.0                         // LUT blending intensity
}
```

#### Hue/Saturation Adjustment
```javascript
hueSaturation: {
  enabled: false,                         // Enable H/S adjustment
  hue: 0,                                // Hue shift (-1 to 1)
  saturation: 0                           // Saturation adjustment (-1 to 1)
}
```

#### Brightness/Contrast
```javascript
brightnessContrast: {
  enabled: false,                         // Enable B/C adjustment
  brightness: 0,                          // Brightness offset (-1 to 1)
  contrast: 0                            // Contrast adjustment (-1 to 1)
}
```

#### Lens Distortion
```javascript
lensDistortion: {
  enabled: false,                         // Enable lens distortion
  distortion: 0,                          // Barrel/pincushion distortion
  cubicDistortion: 0,                     // Cubic distortion
  offset: [0, 0]                         // Principal point offset
}
```

#### God Rays (Volumetric Light)
```javascript
godRays: {
  enabled: false,                         // Enable god rays
  targetName: 'sun-light',                // Target light/object name
  density: 0.96,                         // Ray density
  decay: 0.95,                           // Ray decay
  weight: 0.9,                           // Ray weight
  exposure: 0.6,                         // Ray exposure
  samples: 60,                           // Ray samples
  clampMax: 1.0                          // Maximum intensity
}
```

---

## Advanced Techniques

### 1. Cinematic Depth of Field

Create professional-looking shallow DOF:

```javascript
const cinematicCamera = app.create('camera', {
  name: 'cinematic-portrait',
  position: [2, 1.6, 2],
  rotation: [-0.1, 0.3, 0],
  fov: 85,

  // Professional prime lens settings
  dof: {
    enabled: true,
    fStop: 1.4,                          // Ultra-wide aperture
    focalLength: 135,                     // Telephoto compression
    focusDistance: 2.5,                   // Subject distance
    maxBlur: 0.12,                        // Strong bokeh
    autofocus: true,                      // Track focus
    autofocusSpeed: 6                     // Smooth focus pulls
  },

  // Minimal camera movement
  motion: { enabled: false }
})
```

### 2. Dynamic Camera Switching

Smooth transitions between cameras:

```javascript
// Create camera array
const cameras = []
const presets = [
  { name: 'Wide', position: [10, 5, 10], fov: 35 },
  { name: 'Medium', position: [5, 2, 5], fov: 50 },
  { name: 'Close', position: [2, 1.6, 2], fov: 85 }
]

// Create cameras
presets.forEach(preset => {
  const camera = app.create('camera', {
    ...preset,
    active: false,
    dof: { enabled: true, fStop: 2.8 }
  })
  cameras.push(camera)
  app.add(camera)
})

// Switch function with transition
function switchCamera(index, smooth = true) {
  cameras.forEach((cam, i) => {
    cam.active = i === index
  })

  if (world.cameraManager && smooth) {
    world.cameraManager.setActiveCamera(cameras[index], true, 1.0)
  }
}
```

### 3. Free-Flying Spectator with Physics

```javascript
const spectatorCamera = app.create('camera', {
  name: 'spectator',
  position: [0, 10, 0],
  fov: 75,

  // Free-flying with physics collision
  freeFlying: true,
  flySpeed: 12,
  flyBoostMultiplier: 4,
  lookSensitivity: 0.002,
  smoothMovement: true,
  freeBody: 'capsule',              // Use physics capsule
  freeBodyRadius: 0.3,             // Capsule radius
  freeBodyHeight: 1.6,             // Capsule height
  freeCollideLayers: Layers.environment, // Collision layers

  // Clear view for spectating
  dof: { enabled: false },
  motion: { enabled: false }
})
```

### 4. Action Camera with Handheld Effect

```javascript
const actionCamera = app.create('camera', {
  name: 'action-cam',
  position: [0, 0.5, 1],
  fov: 100,                           // Wide FOV for action

  // Dynamic motion for handheld feel
  motion: {
    enabled: true,
    bobAmount: 0.008,
    swayAmount: 0.006,
    handheldShake: 0.004,
    velocityInfluence: 0.6,
    dampingFactor: 0.8
  },

  // Action-friendly settings
  dof: { enabled: false },            // No DOF for fast action

  // Intense bloom for action highlights
  bloom: {
    enabled: true,
    intensity: 1.2,
    luminanceThreshold: 0.5
  }
})
```

### 5. Security/Surveillance Camera

```javascript
const surveillanceCamera = app.create('camera', {
  name: 'security-cam',
  position: [0, 8, 0],
  rotation: [-Math.PI / 2, 0, 0],   // Top-down view
  fov: 60,

  // Fixed camera, no movement
  motion: { enabled: false },
  dof: { enabled: false },

  // Security camera look
  brightnessContrast: {
    enabled: true,
    brightness: -0.1,
    contrast: 0.3
  },

  filmGrain: {
    enabled: true,
    intensity: 0.6,
    grainScale: 2.5
  },

  vignette: {
    enabled: true,
    offset: 0.2,
    darkness: 0.3
  }
})
```

---

## Best Practices

### Performance Optimization

1. **Disable Unused Effects**: Turn off post-processing effects you don't need
2. **合理Use DOF Sparingly**: DOF is expensive, use judiciously
3. **Helper Visibility**: Turn off camera helpers in production
4. **Effect Limits**: Don't enable all effects on all cameras simultaneously

```javascript
// Performance-optimized camera
const optimizedCamera = app.create('camera', {
  name: 'performance-cam',
  fov: 73,

  // Only essential effects
  dof: { enabled: false },
  motion: { enabled: false },
  bloom: { enabled: false },

  // Minimal post-processing
  vignette: { enabled: false },
  chromaticAberration: { enabled: false },
  filmGrain: { enabled: false },

  // Hide helpers in production
  showHelper: false
})
```

### Camera Management

1. **Single Active Camera**: Only one camera should be active at a time
2. **Cleanup Unused Cameras**: Remove cameras when switching scenes
3. **Use CameraManager**: Leverage the built-in camera management system

```javascript
// Proper camera cleanup
function cleanupCameras() {
  // Deactivate all cameras
  world.cameraManager?.getAllCameras().forEach(cam => {
    cam.active = false
  })

  // Remove camera nodes
  cameras.forEach(camera => {
    app.remove(camera)
  })

  // Reset to default
  world.activateDefaultCamera?.()
}
```

### Memory Management

```javascript
// Clean event listeners and references
function cleanup() {
  // Release control captures
  if (control) {
    Object.keys(control).forEach(key => {
      if (control[key]?.capture !== undefined) {
        control[key].capture = false
      }
    })
  }

  // Remove cameras
  cameras.forEach(camera => {
    if (camera.destroy) camera.destroy()
    app.remove(camera)
  })

  // Clear references
  cameras = []
  control = null
}
```

---

## Performance Guide

### Impact Levels

| Effect | Performance Impact | Recommended Usage |
|--------|-------------------|------------------|
| DOF | High | Cutscenes, portraits only |
| Motion | Low | Most cameras |
| Bloom | Medium | Highlights, magical effects |
| Chromatic Aberration | Low | Artistic, lens effects |
| Film Grain | Low | Retro, cinematic looks |
| Vignette | Very Low | Most cameras |
| Tone Mapping | Medium | All cameras (recommended) |

### Optimization Strategies

1. **Effect Budgeting**: Limit to 3-4 effects per camera
2. **FOV Management**: Higher FOV = more scene to render
3. **Clipping Planes**: Adjust near/far planes for your scene scale
4. **Camera Helpers**: Disable in production builds

```javascript
// Performance-aware camera creation
function createPerfCamera(preset) {
  const config = { ...preset }

  // Adjust for performance level
  if (world.graphics?.performance?.level === 'low') {
    config.dof = { enabled: false }
    config.bloom = { enabled: false }
    config.chromaticAberration = { enabled: false }
  }

  return app.create('camera', config)
}
```

### Dynamic Effect Adjustment

```javascript
// Adjust effects based on performance
function adjustForPerformance(camera, fps) {
  if (fps < 30) {
    // Reduce effects for low FPS
    camera.dof.enabled = false
    camera.bloom.intensity *= 0.5
  } else if (fps > 50) {
    // Can afford more effects
    camera.dof.enabled = true
    camera.bloom.intensity = Math.min(camera.bloom.intensity * 1.2, 1.0)
  }
}
```

---

## Troubleshooting

### Common Issues

#### Camera Not Switching

**Problem**: Camera.active = true not working

**Solution**: Use CameraManager for proper switching:
```javascript
// Don't do this
camera.active = true

// Do this instead
world.cameraManager.setActiveCamera(camera)
```

#### DOF Not Working

**Problem**: DOF effect not visible

**Solutions**:
```javascript
// Check DOF is enabled
camera.dof.enabled = true

// Adjust f-stop for more blur
camera.dof.fStop = 1.4

// Increase max blur
camera.dof.maxBlur = 0.1

// Check focus distance
camera.dof.focusDistance = 5 // Adjust to your subject distance
```

#### Free Camera Controls Not Working

**Problem**: WASD controls not responding

**Solution**: Ensure controls are captured:
```javascript
const camera = app.create('camera', {
  freeFlying: true,
  // ... other settings
})

// Camera will auto-capture when active
camera.active = true
```

#### Performance Issues

**Problem**: Low FPS with cameras

**Solutions**:
```javascript
// Disable expensive effects
camera.dof.enabled = false
camera.bloom.enabled = false

// Reduce FOV for less rendering
camera.fov = 60

// Hide camera helpers
camera.showHelper = false
```

#### Camera Stutters or Jumps

**Problem**: Camera movement not smooth

**Solution**: Check motion and smoothMovement settings:
```javascript
camera.smoothMovement = true
camera.motion.dampingFactor = 0.9 // Higher = smoother
```

### Debug Commands

```javascript
// List all cameras
console.log('Cameras:', world.cameraManager?.getAllCameras())

// Get debug info
console.log('Camera Debug:', world.cameraManager?.getDebugInfo())

// Check active camera
console.log('Active:', world.cameraManager?.activeCamera?.name)

// Monitor performance
setInterval(() => {
  console.log('FPS:', world.graphics?.stats?.fps)
}, 1000)
```

---

## API Reference

### Camera Node Methods

#### Basic Control

```javascript
// Activation
camera.active = true                    // Set active state
camera.activate()                       // Activate camera
camera.deactivate()                     // Deactivate camera

// Position/Rotation
camera.lookAt(target)                   // Look at position/object
camera.position.set(x, y, z)            // Set position
camera.rotation.set(x, y, z)            // Set rotation

// Properties
camera.fov = 75                         // Set field of view
camera.setFOV(75)                       // Method version
camera.setClippingPlanes(0.1, 1000)     // Set near/far
camera.setFocalLength(50)               // Set focal length
```

#### Effect Control

```javascript
// DOF
camera.setDOF({
  fStop: 2.8,
  focusDistance: 10,
  enabled: true
})

// Bloom
camera.setBloom({
  intensity: 0.8,
  enabled: true
})

// Other effects
camera.setVignette({ offset: 0.3 })
camera.setChromaticAberration({ offset: [0.002, 0.002] })
camera.setFilmGrain({ intensity: 0.3 })
```

#### Helper Controls

```javascript
camera.setHelperVisible(true)           // Show/hide helper
camera.showHelper = true                // Direct property
```

### CameraManager Methods

```javascript
// Get camera manager
const manager = world.cameraManager

// Camera registration
manager.registerCamera(camera)           // Register camera
manager.unregisterCamera(camera)         // Unregister camera

// Camera switching
manager.setActiveCamera(camera)          // Set active camera
manager.getCamera('camera-id')           // Get camera by ID
manager.getAllCameras()                  // Get all cameras

// Transitions
manager.setActiveCamera(camera, true, 2.0) // With transition

// State
manager.activeCamera                     // Current active camera
manager.defaultCamera                    // Default camera
manager.getDebugInfo()                   // Debug information
```

### Events

```javascript
// Camera change events
world.on('camera-changed', (camera) => {
  console.log('Switched to:', camera.name)
})

world.on('camera-transition-start', ({ from, to }) => {
  console.log('Transition started')
})

world.on('camera-transition-complete', (camera) => {
  console.log('Transition complete')
})

// Empty manager (fallback to legacy)
world.on('camera-manager-empty', () => {
  console.log('No cameras, falling back')
})
```

### Free-Flying Camera Controls

```javascript
// Built-in controls (when freeFlying: true)
// W/S - Forward/Backward
// A/D - Strafe left/right
// Q/E or Space/Shift - Up/Down
// Mouse - Look around (right-click)
// Escape - Return to player camera

// Custom free camera control
camera.captureControls()                 // Manual control capture
camera.releaseControls()                 // Release controls
camera.flySpeed = 10                    // Movement speed
camera.lookSensitivity = 0.003          // Mouse sensitivity
```

---

## Examples Gallery

See `/examples/camera-control-system.js` for a complete working example demonstrating all camera features and techniques covered in this guide.

---

## Conclusion

The Hyperfy camera system provides professional-grade camera controls with cinematic post-processing effects. Master the balance between visual quality and performance to create stunning experiences.

For more examples and updates, check the examples directory and the core camera implementation in `/src/core/nodes/Camera.js`.