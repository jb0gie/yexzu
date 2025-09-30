# Free-Flying Camera System

## Overview

The free-flying camera system allows camera nodes to be controlled with WASD and mouse controls, similar to a spectator or noclip mode. This enables users to freely explore the world from any camera's perspective.

## Features

- **WASD Movement**: Move camera forward/back/left/right
- **Vertical Control**: Move up with Q/Space, down with E
- **Mouse Look**: Full 360° rotation with mouse
- **Speed Boost**: Hold Shift for faster movement
- **Smooth Movement**: Optional smooth acceleration/deceleration
- **Automatic Control Capture**: Controls are automatically captured when camera is active

## Usage

### Basic Example

```javascript
const camera = app.create('camera', {
  name: 'spectator-cam',
  position: [10, 5, 10],
  rotation: [-0.3, 0.785, 0],
  
  // Enable free-flying mode
  freeFlying: true,
  
  // Optional: customize flight behavior
  flySpeed: 8,                  // Base movement speed
  flyBoostMultiplier: 3,        // Speed multiplier when shift held
  lookSensitivity: 0.002,       // Mouse look sensitivity
  smoothMovement: true,         // Smooth acceleration
  
  // Camera settings
  fov: 75,
  near: 0.1,
  far: 2000,
  
  // Show helper to visualize camera position
  showHelper: true
})

app.add(camera)
```

### Camera Modes Comparison

| Property         | Player Camera  | Static Camera | Free-Flying Camera |
| ---------------- | -------------- | ------------- | ------------------ |
| `attachToRig`    | `true`         | `false`       | `false`            |
| `isPlayerCamera` | `true`         | `false`       | `false`            |
| `freeFlying`     | `false`        | `false`       | `true`             |
| Movement         | Follows player | None          | WASD + Mouse       |

## Configuration Options

### Free-Flying Properties

```javascript
{
  freeFlying: true,           // Enable free-flying mode
  flySpeed: 5,                // Movement speed (units/second)
  flyBoostMultiplier: 3,      // Speed multiplier when shift pressed
  lookSensitivity: 0.002,     // Mouse sensitivity (radians per pixel)
  smoothMovement: true        // Enable smooth acceleration/deceleration
}
```

### Default Controls

- **W** - Move forward
- **S** - Move backward
- **A** - Move left
- **D** - Move right
- **Q** or **Space** - Move up
- **E** - Move down
- **Shift** - Speed boost (multiplies speed)
- **Mouse** - Look around (pitch and yaw)

## Control Capture

When a free-flying camera becomes active:

1. It automatically captures movement keys (WASD, QE, Space, Shift)
2. Player controls are disabled (can't move player while in free-flying camera)
3. Mouse look controls the camera rotation

When the camera becomes inactive:

1. All captured controls are released
2. Player controls are restored
3. Movement stops

### Manual Control Management

```javascript
// Manually capture controls
camera.captureControls()

// Manually release controls
camera.releaseControls()

// Check if controls are captured
if (camera.captureControls) {
  console.log('Camera has control')
}
```

## Runtime Adjustments

You can modify free-flying properties at runtime:

```javascript
// Change flight speed
camera.flySpeed = 10

// Adjust look sensitivity
camera.lookSensitivity = 0.001

// Toggle smooth movement
camera.smoothMovement = false

// Enable/disable free-flying mode
camera.freeFlying = true
```

## Advanced Examples

### Multiple Free-Flying Cameras

```javascript
const cameras = [
  { name: 'Overview', pos: [0, 20, 0], rot: [-Math.PI/2, 0, 0] },
  { name: 'Corner', pos: [15, 10, 15], rot: [-0.5, -0.785, 0] },
  { name: 'Ground', pos: [5, 1, 5], rot: [0, 0.5, 0] }
]

cameras.forEach((config, index) => {
  const cam = app.create('camera', {
    name: `free-cam-${index}`,
    position: config.pos,
    rotation: config.rot,
    freeFlying: true,
    flySpeed: 8,
    showHelper: true
  })
  app.add(cam)
})
```

### Switching Between Player and Free-Flying Camera

```javascript
let freeCam = null
let isFreeCam = false

// Create free-flying camera
freeCam = app.create('camera', {
  name: 'spectator',
  freeFlying: true,
  flySpeed: 10,
  showHelper: true
})
app.add(freeCam)

// Toggle with a key
const control = app.control()
if (control.keyV) control.keyV.capture = true

app.on('update', () => {
  if (control.keyV && control.keyV.pressed) {
    isFreeCam = !isFreeCam
    
    if (isFreeCam) {
      // Switch to free-flying camera
      freeCam.active = true
      console.log('Free-flying camera active')
    } else {
      // Return to player camera
      world.activateDefaultCamera?.()
      console.log('Player camera active')
    }
  }
})
```

### Custom Speed Zones

```javascript
const zones = [
  { name: 'Normal', speed: 5, color: '#ffffff' },
  { name: 'Fast', speed: 15, color: '#00ff00' },
  { name: 'Slow', speed: 2, color: '#ff0000' }
]

let currentZone = 0

// Cycle zones with key
app.on('update', () => {
  if (control.keyB && control.keyB.pressed) {
    currentZone = (currentZone + 1) % zones.length
    const zone = zones[currentZone]
    
    freeCam.flySpeed = zone.speed
    console.log(`Zone: ${zone.name} - Speed: ${zone.speed}`)
  }
})
```

## Best Practices

1. **Always set `attachToRig: false`** for free-flying cameras
2. **Use `showHelper: true`** during development to visualize camera position
3. **Provide UI feedback** when free-flying camera is active
4. **Capture Escape key** to allow users to return to player camera
5. **Disable organic motion** (`motion: { enabled: false }`) for cleaner control
6. **Set appropriate speed** based on world scale (larger worlds need higher speeds)

## Troubleshooting

### Camera doesn't move
- Ensure `freeFlying: true` is set
- Check that `attachToRig: false`
- Verify camera is active: `camera.active = true`
- Check console for control capture messages

### Controls don't work
- Make sure camera is the active camera
- Check that controls aren't captured by another system
- Verify mouse pointer lock is working (right-click in world)

### Camera movement is jerky
- Enable smooth movement: `smoothMovement: true`
- Adjust flySpeed to lower value
- Check frame rate (use ClientStats system)

### Camera rotates strangely
- Lower `lookSensitivity` value (e.g., 0.001)
- Check that camera isn't attached to rig
- Ensure rotation is properly initialized

## Implementation Details

The free-flying camera system:

1. Binds controls with high priority (10000) to override player controls
2. Captures WASD, QE, Space, and Shift keys
3. Reads mouse movement from `control.pointerMovement`
4. Applies movement in camera's local space (forward is camera's Z-axis)
5. Uses world-up for vertical movement (consistent up/down)
6. Implements smooth velocity interpolation when `smoothMovement: true`
7. Automatically releases controls when camera becomes inactive

## See Also

- [Camera Node Documentation](./CAMERA_NODE.md)
- [Camera Manager System](./CAMERA_MANAGER.md)
- [Example: working-cam-manager.js](../examples/cameras/working-cam-manager.js)
- [Example: free-flying-camera.js](../examples/cameras/free-flying-camera.js)
