# Mobile Controls System - Complete Documentation

## Overview

Hyperfy's mobile control system provides a unified input layer that automatically bridges touch joystick input to keyboard-style controls. Apps can use the same code for both desktop and mobile without separate implementations.

## Architecture

### Core Components

1. **ClientControls System** (`src/core/systems/ClientControls.js`)
   - Manages layered priority control system
   - Handles all input events (keyboard, mouse, touch)
   - Provides proxy-based control API
   - Maintains control stack with priority ordering

2. **PlayerLocal Entity** (`src/core/entities/PlayerLocal.js`)
   - Creates and manages virtual joystick
   - Emits `stick` events with normalized input data
   - Bridges joystick input to keyboard controls
   - Handles movement direction calculation

3. **CoreUI Component** (`src/client/components/CoreUI.js`)
   - Renders visual joystick overlay
   - Positioned automatically based on screen orientation
   - Shows/hides based on touch activity

### Control Priority System

Controls are layered with priority values (higher = more priority):

```javascript
// Priority levels from source
const ControlPriorities = {
  PLAYER: 0,        // Player movement (lowest)
  GRABBABLE: 50,    // Object interaction
  ACTION: 100,      // Action system
  CORE_UI: 1000,    // Core UI
  BUILDER: 10000,   // Builder tools (highest)
}
```

## Input Flow

### Touch Event Processing

1. **Touch Start** (`ClientControls.onPointerDown`)
   - Creates touch info object with position, delta, prevPosition
   - Calls `onTouch` callback for each control in priority order
   - First control to return `true` consumes the event

2. **Touch Move** (`ClientControls.onPointerMove`)
   - Updates delta and position for active touches
   - Joystick calculates direction from center to touch position

3. **Touch End** (`ClientControls.onPointerUp`)
   - Calls `onTouchEnd` callback
   - Removes touch from active touches Map
   - Resets joystick state

### Joystick Creation

```javascript
// In PlayerLocal.initControl()
this.control = this.world.controls.bind({
  priority: ControlPriorities.PLAYER,
  onTouch: touch => {
    // Left side of screen = joystick area
    if (!this.stick && touch.position.x < this.control.screen.width / 2) {
      this.stick = {
        center: touch.position.clone(),  // Initial touch position
        active: false,                    // Not active until moved
        touch,                           // Current touch info
      }
    }
  },
  onTouchEnd: touch => {
    if (this.stick?.touch === touch) {
      this.stick = null
      this.world.emit('stick', null)  // Broadcast reset
    }
  },
})
```

### Joystick Activation

Joystick becomes active when moved > 3 pixels from center:

```javascript
// In PlayerLocal.update()
if (this.stick && !this.stick.active) {
  this.stick.active = this.stick.center.distanceTo(this.stick.touch.position) > 3
}
```

### Normalized Input Values

When active, joystick calculates normalized values (-1 to 1):

```javascript
const stickX = (touchX - centerX) / moveRadius  // Horizontal: -1 (left) to 1 (right)
const stickY = (touchY - centerY) / moveRadius  // Vertical: -1 (down) to 1 (up)

// Applied to movement
this.moveDir.x = stickX   // Left/right movement
this.moveDir.z = stickY   // Forward/back movement
```

### Stick Event Broadcasting

Joystick data is broadcast to all systems:

```javascript
this.world.emit('stick', this.stick)
```

`ClientControls` receives this and populates `control.touchStick.value`:

```javascript
// In ClientControls.onStick()
if (control.entries.touchStick) {
  control.entries.touchStick.value.x = clampedX  // Horizontal
  control.entries.touchStick.value.z = clampedY  // Vertical
  control.entries.touchStick.value.y = 0         // Not used
}
```

## API Reference

### Getting Control Interface

```javascript
const control = app.control()
if (!control) {
  console.warn('No control interface available')
  return
}
```

### Keyboard Input

```javascript
// Movement keys
control.keyW.down      // Forward
control.keyS.down      // Backward
control.keyA.down      // Left
control.keyD.down      // Right

// Action keys
control.space.down     // Jump/action
control.shiftLeft.down // Sprint
control.keyE.down      // Interact

// Arrow keys (also mapped)
control.arrowUp.down
control.arrowDown.down
control.arrowLeft.down
control.arrowRight.down
```

### Mobile/Touch Input

```javascript
// Virtual joystick (normalized -1 to 1)
const stickX = control.touchStick?.value.x || 0  // Horizontal: -1 (left) to 1 (right)
const stickZ = control.touchStick?.value.z || 0  // Vertical: -1 (down) to 1 (up)

// Touch action buttons
control.touchA.down  // Primary action (bottom-right)
control.touchB.down  // Secondary action (bottom-right)

// Screen dimensions
const screenWidth = control.screen?.width || window.innerWidth
const screenHeight = control.screen?.height || window.innerHeight
```

### Mouse Input

```javascript
// Mouse buttons
control.mouseLeft.down   // Left click
control.mouseRight.down  // Right click

// Pointer lock state
control.pointer.locked   // Is pointer locked?

// Pointer position (normalized 0-1)
control.pointer.coords.x
control.pointer.coords.y

// Pointer position (pixels)
control.pointer.position.x
control.pointer.position.y

// Movement delta (for look controls)
control.pointer.delta.x
control.pointer.delta.y
```

### XR Input

```javascript
// Controller poses
control.xrLeftRayPose.position
control.xrLeftRayPose.quaternion
control.xrRightRayPose.position
control.xrRightRayPose.quaternion

// Controller sticks
control.xrLeftStick.value.x
control.xrLeftStick.value.z
control.xrRightStick.value.x
control.xrRightStick.value.z

// Controller buttons
control.xrLeftTrigger.down
control.xrLeftGrip.down
control.xrLeftBtn1.down
control.xrLeftBtn2.down
control.xrRightTrigger.down
control.xrRightGrip.down
control.xrRightBtn1.down
control.xrRightBtn2.down
```

### Camera Access

```javascript
// Current camera
control.camera.position
control.camera.quaternion
control.camera.rotation
control.camera.zoom

// Camera write control
control.camera.write = true  // Allow camera control
control.camera.write = false // Prevent camera control
```

## Usage Patterns

### Universal Movement Detection

```javascript
// Works on both desktop and mobile
const isMovingForward = 
  control.keyW?.down || 
  (control.touchStick?.value.z < -0.5)  // Joystick pushed forward

const isMovingBackward = 
  control.keyS?.down || 
  (control.touchStick?.value.z > 0.5)   // Joystick pulled back

const isMovingLeft = 
  control.keyA?.down || 
  (control.touchStick?.value.x < -0.5)  // Joystick left

const isMovingRight = 
  control.keyD?.down || 
  (control.touchStick?.value.x > 0.5)   // Joystick right
```

### Sprint Detection

```javascript
// PlayerLocal uses this pattern:
const isRunning = this.stick?.active || xr
  ? this.moving && this.moveDir.length() > 0.9  // Joystick at full extent
  : this.moving && (this.control.shiftLeft.down || this.control.shiftRight.down)  // Shift key
```

### Jump Detection

```javascript
// Universal jump detection
const isJumping = 
  control.space?.down || 
  control.touchA?.down || 
  control.xrRightBtn1?.down
```

### Direction Calculation

```javascript
// Get forward direction (works for both input types)
function getForwardDirection(outVec) {
  const tempEuler = new Euler(0, 0, 0, 'YXZ')
  const tempQuat = new Quaternion()
  
  // Use camera rotation for direction
  tempEuler.setFromQuaternion(control.camera.quaternion)
  tempEuler.x = 0  // Flatten to horizontal plane
  tempEuler.z = 0
  tempQuat.setFromEuler(tempEuler)
  
  return outVec.copy(new Vector3(0, 0, -1)).applyQuaternion(tempQuat)
}

// Apply movement
if (isMovingForward) {
  const dir = getForwardDirection(new Vector3())
  player.push(dir.multiplyScalar(speed * delta))
}
```

### Mobile-Only Features

```javascript
// Detect mobile device
const isMobile = 
  typeof navigator !== 'undefined' && navigator.userAgent
    ? /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    : false

// Screen side detection (for custom touch handling)
const isLeftSide = touch.position.x < control.screen.width / 2
const isRightSide = touch.position.x > control.screen.width / 2
```

## Binding Custom Controls

### Basic Control Binding

```javascript
const myControl = world.controls.bind({
  priority: 100,  // Higher priority = runs first
  
  onTouch: touch => {
    // Handle touch start/move
    console.log('Touch at:', touch.position.x, touch.position.y)
    
    // Return true to consume event (prevent lower priority controls from receiving it)
    return true
  },
  
  onTouchEnd: touch => {
    // Handle touch end
    console.log('Touch ended')
  },
  
  onButtonPress: (prop, text) => {
    // Handle keyboard input
    console.log('Key pressed:', prop)
  },
  
  onRelease: () => {
    // Cleanup when control is released
    console.log('Control released')
  }
})

// Access control entries
myControl.keySpace.onPress = () => {
  console.log('Space pressed!')
  return true  // Capture event
}

// Release control when done
myControl.release()
```

### Capturing Keys

```javascript
// Prevent default behavior and capture key
control.keyW.capture = true
control.keyA.capture = true
control.keyS.capture = true
control.keyD.capture = true

// Release capture
control.keyW.capture = false
```

### Creating Custom Buttons

```javascript
// Buttons are created automatically on first access
const myButton = control.myCustomButton

myButton.onPress = () => {
  console.log('Custom button pressed!')
  return true  // Capture event
}

myButton.onRelease = () => {
  console.log('Custom button released!')
}

// Simulate button press programmatically
world.controls.simulateButton('myCustomButton', true)  // Press
world.controls.simulateButton('myCustomButton', false) // Release
```

## Common Issues and Solutions

### Keyboard Events Not Working

**Problem**: `app.on('keydown')` doesn't work

**Solution**: Use `app.control()` instead

```javascript
// ❌ Doesn't work
app.on('keydown', e => {
  console.log('Key pressed:', e.key)
})

// ✅ Works
const control = app.control()
app.on('update', () => {
  if (control.keyW?.down) {
    console.log('W key held down')
  }
  if (control.keySpace?.pressed) {
    console.log('Space pressed this frame')
  }
})
```

### Mobile Input Not Detected

**Problem**: Joystick input not working in app

**Solution**: Check for `touchStick` and use optional chaining

```javascript
// ❌ May crash if touchStick doesn't exist
const stickX = control.touchStick.value.x

// ✅ Safe access
const stickX = control.touchStick?.value.x || 0

// ✅ Universal input handling
const moveX = control.keyA?.down ? -1 : control.keyD?.down ? 1 : control.touchStick?.value.x || 0
```

### Controls Not Responding

**Problem**: Control not receiving input

**Solution**: Check priority and binding order

```javascript
// Higher priority controls run first and can consume events
const highPriorityControl = world.controls.bind({
  priority: 1000,
  onTouch: () => {
    return true  // Consumes event, lower priority controls won't receive it
  }
})

const lowPriorityControl = world.controls.bind({
  priority: 0,
  onTouch: () => {
    // This won't be called if highPriorityControl returns true
  }
})
```

### Player Not Available

**Problem**: `world.getPlayer()` returns null

**Solution**: Wait for world to be ready

```javascript
// ❌ Player may not be available yet
const player = world.getPlayer()

// ✅ Wait for world ready
if (world.isReady) {
  init()
} else {
  world.on('ready', init)
}

function init() {
  const player = world.getPlayer()
  // Safe to use player now
}
```

## Best Practices

### 1. Always Check Control Availability

```javascript
const control = app.control()
if (!control) {
  console.warn('Control system not available')
  return
}
```

### 2. Use Optional Chaining

```javascript
// Safe property access
const stickX = control.touchStick?.value.x || 0
const isMoving = control.keyW?.down || false
```

### 3. Handle Both Input Types

```javascript
// Universal input handling
const isSprinting = 
  (control.shiftLeft?.down || control.shiftRight?.down) ||  // Keyboard
  (control.touchStick?.value.length() > 0.9)  // Mobile joystick at full extent
```

### 4. Check World State

```javascript
if (!world.isClient) return  // Only run on client

const player = world.getPlayer()
if (!player) return  // Player not available yet
```

### 5. Clean Up Resources

```javascript
app.on('cleanup', () => {
  if (myControl) {
    myControl.release()
  }
})
```

### 6. Use Constants for Configuration

```javascript
const PLAYER_HEIGHT = 1.6
const SPRINT_THRESHOLD = 0.9
const JOYSTICK_DEADZONE = 0.1
```

## Debugging

### Enable Debug UI

```javascript
// Create debug text overlay
const debugText = app.create('ui', {
  space: 'screen',
  position: [0, 0],
  offset: [20, 20],
  width: 400,
  height: 150,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
})

const text = app.create('uitext', {
  value: 'Debug: Initializing...',
  color: 'white',
  fontSize: 10,
  fontFamily: 'monospace',
})

debugText.add(text)
app.add(debugText)

// Update debug info in update loop
app.on('update', () => {
  const debugInfo = `
    Stick X: ${(control.touchStick?.value.x || 0).toFixed(2)}
    Stick Z: ${(control.touchStick?.value.z || 0).toFixed(2)}
    Key W: ${control.keyW?.down || false}
    Key A: ${control.keyA?.down || false}
    Key S: ${control.keyS?.down || false}
    Key D: ${control.keyD?.down || false}
    Running: ${isRunning}
  `
  debugText.children[0].props.value = debugInfo
})
```

### Log Input States

```javascript
app.on('update', () => {
  console.log('=== INPUT STATE ===')
  console.log('Joystick:', {
    x: control.touchStick?.value.x,
    z: control.touchStick?.value.z,
    active: !!control.touchStick
  })
  console.log('Keys:', {
    w: control.keyW?.down,
    a: control.keyA?.down,
    s: control.keyS?.down,
    d: control.keyD?.down,
    shift: control.shiftLeft?.down || control.shiftRight?.down
  })
  console.log('Mobile:', {
    isMobile: isMobile,
    screen: `${control.screen?.width}x${control.screen?.height}`
  })
})
```

## Summary

Hyperfy's mobile control system automatically bridges touch joystick input to keyboard-style controls, allowing apps to work seamlessly on both desktop and mobile with the same code. Key points:

- Use `app.control()` to access the control interface
- Check `control.touchStick?.value.x/z` for joystick input
- Check `control.keyW/A/S/D.down` for keyboard input
- Joystick appears on left side of screen automatically
- Right side of screen is for camera panning
- Use optional chaining (`?.`) for safe property access
- Combine both input types for universal controls
- Wait for `world.isReady` before accessing player

The system handles all the complexity of touch input, normalization, and event broadcasting, so apps can focus on game logic rather than input handling.