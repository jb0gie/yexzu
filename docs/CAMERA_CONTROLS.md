# Camera Controls Documentation

Hyperfy now includes advanced camera controls for depth of field, focal length, and Three.js helper visualizations.

## Features

### Depth of Field (DOF)
- **Focus Distance**: Control what distance from the camera is in sharp focus
- **Focus Range**: Adjust the range of distances that appear in focus  
- **Bokeh Scale**: Control the intensity of the background blur effect

### Focal Length
- Simulate different camera lenses (24mm wide angle to 200mm telephoto)
- Automatically adjusts field of view based on focal length

### Helper Visualizations
- Camera frustum helper
- Grid helper for spatial reference
- Axes helper showing X (red), Y (green), Z (blue) directions

## API Reference

### Accessing Camera Controls

```javascript
// Access via world object
world.cameraControls
```

### Depth of Field Methods

```javascript
// Enable/disable DOF
world.cameraControls.enableDOF()
world.cameraControls.disableDOF()

// Set focus distance (in world units)
world.cameraControls.setDOFFocusDistance(10)

// Set focus range (in world units)
world.cameraControls.setDOFFocusRange(5)

// Set bokeh scale (blur intensity, typically 0.5 to 3)
world.cameraControls.setDOFBokehScale(2)

// Auto-focus on a position
const targetPos = new THREE.Vector3(0, 0, -10)
world.cameraControls.autoFocus(targetPos)
```

### Focal Length Methods

```javascript
// Set focal length (1-200mm, standard is 50mm)
world.cameraControls.setFocalLength(85)

// Get current focal length
const focalLength = world.cameraControls.getFocalLength()
```

### Helper Methods

```javascript
// Show/hide/toggle helper visualizations
world.cameraControls.showHelpers()
world.cameraControls.hideHelpers()
world.cameraControls.toggleHelpers()
```

### Camera Presets

```javascript
// Apply preset configurations
world.cameraControls.applyPreset('portrait')   // 85mm, shallow DOF
world.cameraControls.applyPreset('landscape')  // 24mm, no DOF
world.cameraControls.applyPreset('macro')      // 100mm, extreme shallow DOF
world.cameraControls.applyPreset('standard')   // 50mm, default settings
```

### Getting Camera Settings

```javascript
// Get all current camera settings
const settings = world.cameraControls.getCameraSettings()
// Returns: {
//   dof: { enabled, focusDistance, focusRange, bokehScale },
//   focalLength,
//   fov,
//   showHelpers
// }
```

## Browser Console Usage

You can control the camera directly from the browser console:

```javascript
// Enable DOF with portrait-like settings
world.cameraControls.enableDOF()
world.cameraControls.setDOFFocusDistance(5)
world.cameraControls.setDOFFocusRange(2)
world.cameraControls.setDOFBokehScale(2)

// Change to telephoto lens
world.cameraControls.setFocalLength(135)

// Show helpers for debugging
world.cameraControls.showHelpers()
```

## Keyboard Shortcuts Example

Here's an example of implementing keyboard shortcuts in a Hyperfy app:

```javascript
export default {
  keydown({ world, event }) {
    switch(event.key) {
      case '1': world.cameraControls.applyPreset('portrait'); break
      case '2': world.cameraControls.applyPreset('landscape'); break
      case '3': world.cameraControls.applyPreset('macro'); break
      case '4': world.cameraControls.applyPreset('standard'); break
      case 'd': // Toggle DOF
        if (world.prefs.dofEnabled) {
          world.cameraControls.disableDOF()
        } else {
          world.cameraControls.enableDOF()
        }
        break
      case 'h': world.cameraControls.toggleHelpers(); break
    }
  }
}
```

## Performance Considerations

- DOF effect runs at half resolution by default for better performance
- Disable DOF when not needed to improve frame rates
- Helpers should only be enabled during development/debugging

## Settings Persistence

All camera settings are automatically persisted to browser local storage and will be restored on page reload.

## Technical Details

- Focal length to FOV conversion uses 35mm film equivalent (24mm sensor height)
- DOF implementation uses the postprocessing library's DepthOfFieldEffect
- Helper visualizations use Three.js built-in helper classes