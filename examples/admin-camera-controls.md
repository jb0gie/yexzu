# Admin Camera Controls for Hyperfy

## Overview
Camera controls with post-processing features are now available for admins. All features are **disabled by default** to prevent unexpected behavior.

## Quick Start for Admins

1. Open browser console (F12)
2. Type `cam.help()` to see all commands
3. Type `cam.enable()` to activate camera controls

## Console Commands

### Basic Controls
- `cam.enable()` - Enable camera control system
- `cam.disable()` - Disable camera control system  
- `cam.settings()` - View current settings
- `cam.help()` - Show help

### Depth of Field (DOF)
```javascript
cam.dof.enable()           // Enable depth of field effect
cam.dof.disable()          // Disable depth of field effect
cam.dof.setFocus(10)       // Set focus distance in world units
cam.dof.setRange(5)        // Set focus range (blur falloff)
cam.dof.setBokeh(2)        // Set bokeh intensity
```

### Focal Length (Zoom)
```javascript
cam.setFocalLength(50)     // Set focal length in mm (10-200)
// Common values:
// 24mm - Wide angle
// 50mm - Standard
// 85mm - Portrait
// 100mm+ - Telephoto
```

### Scroll Wheel Zoom
```javascript
cam.zoom.enable()          // Enable mouse wheel zoom
cam.zoom.disable()         // Disable mouse wheel zoom
cam.zoom.setSpeed(5)       // Adjust zoom speed (1-50)
```

### Autofocus Features
```javascript
// Reticle autofocus - focuses on what you're looking at
cam.autofocus.reticle(true)   // Enable
cam.autofocus.reticle(false)  // Disable

// Player autofocus - keeps your avatar in focus
cam.autofocus.player(true)    // Enable
cam.autofocus.player(false)   // Disable

// Focus transition settings
cam.autofocus.smoothing(true)  // Smooth focus transitions
cam.autofocus.speed(0.1)       // Transition speed (0.01-1)
```

### Camera Presets
```javascript
cam.preset('portrait')     // 85mm, DOF on, close focus
cam.preset('landscape')    // 24mm, DOF off, far focus
cam.preset('macro')        // 100mm, DOF on, very close focus
cam.preset('standard')     // 50mm, DOF off, medium focus
```

## Example Workflows

### Portrait Photography Setup
```javascript
cam.enable()
cam.preset('portrait')
cam.autofocus.player(true)
```

### Cinematic Mode
```javascript
cam.enable()
cam.dof.enable()
cam.dof.setFocus(15)
cam.dof.setRange(8)
cam.dof.setBokeh(3)
cam.setFocalLength(85)
```

### Documentary Style
```javascript
cam.enable()
cam.setFocalLength(24)
cam.autofocus.reticle(true)
cam.zoom.enable()
```

## Notes
- Only admins can use these controls
- All settings persist across sessions
- DOF requires post-processing to be enabled in graphics settings
- Scroll zoom captures mouse wheel input when enabled

## Troubleshooting
- If commands don't work, ensure you're logged in as admin
- If DOF looks wrong, try adjusting focus distance to match your scene scale
- For best DOF quality, enable high quality post-processing in settings