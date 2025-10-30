# Free-Flying Camera Implementation Summary

## Overview
Implemented a fully functional free-flying camera system for Hyperfy that allows cameras to move independently like a drone or spectator mode, with 6-degrees-of-freedom movement controlled by WASD/QE/Space keys and mouse look.

## Changes Made

### 1. Core Camera Node (`/hyperfy/src/core/nodes/Camera.js`)

#### New Properties
- `freeFlying`: Boolean flag to enable free-flying mode (default: false)
- `flySpeed`: Base movement speed (default: 5)
- `flyBoostMultiplier`: Speed multiplier when Shift is held (default: 3)
- `lookSensitivity`: Mouse look sensitivity (default: 0.003)
- `smoothMovement`: Enable smooth acceleration/deceleration (default: true)
- `controlsCaptured`: Internal flag tracking if controls are captured
- `_disposed`: Flag to prevent updates on unmounted cameras

#### New State Object
```javascript
flyState: {
  velocity: Vector3,        // Current velocity
  targetVelocity: Vector3,  // Target velocity based on inputs
  euler: Euler              // Camera rotation in Euler angles (YXZ order)
}
```

#### Key Methods Added

**`captureControls()`**
- Binds controls with high priority (10000) to override default player controls
- Captures: W, A, S, D, Q, E, Space, Shift (left/right)
- **Critically**: Captures `scrollDelta` to prevent zoom on underlying player camera
- Only executes if `freeFlying` is true

**`releaseControls()`**
- Releases all captured keys and scroll input
- Called when camera becomes inactive

**`updateFreeFlying(delta)`**
- Main update loop for free-flying camera movement
- **Mouse Look** (executed first):
  - Applies `pointer.delta` to `flyState.euler` for rotation
  - Clamps pitch to ±90° to prevent gimbal lock
  - Updates camera quaternion from euler angles
  
- **Movement Calculation** (FPS-style):
  - Projects camera forward vector onto horizontal plane (ignores pitch)
  - Calculates right vector perpendicular to horizontal forward
  - This ensures:
    - W/S moves horizontally forward/backward (not up/down when looking up/down)
    - A/D strafes purely left/right (not forward/backward)
    - Q/E/Space moves purely vertically
  
- **Velocity Application**:
  - Smooth mode: Lerps velocity toward target (10 * delta)
  - Instant mode: Directly copies target velocity
  - Position updated: `camera.position += velocity * delta`

#### Critical Mounting Change
Free-flying cameras are now **always added directly to the scene** (no parent):
```javascript
if (this.freeFlying) {
  this.ctx.world.stage.scene.add(this.camera)
} else {
  // Non-free-flying cameras can attach to app/entity
  this.ctx.entity.object3D.add(this.camera)
}
```

**Why**: Movement vectors are calculated in world space and applied to `camera.position`. If the camera had a parent, the position would be in local space relative to the parent, causing incorrect movement.

#### Lifecycle Integration
- **`makeActive()`**: Calls `captureControls()` for free-flying cameras
- **`makeInactive()`**: Calls `releaseControls()` for free-flying cameras
- **`update(delta)`**: Calls `updateFreeFlying(delta)` if free-flying and active, then returns early to prevent other systems from modifying the transform
- **`unmount()`**: Sets `_disposed = true` to prevent further updates

#### App API Exposure
Added to `getProxy()`:
```javascript
{
  freeFlying: Boolean,
  flySpeed: Number,
  lookSensitivity: Number,
  captureControls: Function,
  releaseControls: Function
}
```

### 2. Example Files

#### `/hyperfy/examples/cameras/free-flying-camera.js`
New minimal example demonstrating:
- Creating a free-flying camera at spawn
- Configuring speed, sensitivity, and boost multiplier
- Auto-activation
- UI instructions for controls

#### `/hyperfy/examples/cameras/working-cam-manager.js`
Updated to include:
- "Free-Flying Spectator" preset with configured properties
- Updated UI text to show free-flying camera controls
- All custom cameras default to `freeFlying: false`

### 3. Documentation

#### `/hyperfy/docs/FREE_FLYING_CAMERAS.md`
Comprehensive documentation including:
- Configuration options and their defaults
- Usage examples
- Control scheme
- Comparison with other camera modes
- Best practices

## Technical Decisions

### 1. FPS-Style Movement (Not True 6DOF)
**Decision**: Movement is locked to horizontal plane for WASD, vertical for Q/E/Space

**Rationale**:
- More intuitive for users (matches FPS games)
- Looking up/down doesn't cause vertical movement when pressing W
- Easier to navigate and maintain orientation
- Can still move in all 6 directions, just with separate controls

**Alternative Considered**: True 6DOF where W always moves in look direction (would fly up when looking up). Rejected as less user-friendly.

### 2. Direct Scene Attachment (No Parent)
**Decision**: Free-flying cameras are added directly to scene, never to a parent entity

**Rationale**:
- Movement calculations use world-space vectors
- Applying world-space vectors to local-space position causes incorrect movement
- Simplifies the implementation
- Camera is truly "free" from any entity

**Bug Fixed**: Initially cameras were attached to their creating entity's `object3D`, causing the world/local space mismatch that prevented strafing from working.

### 3. High-Priority Control Capture
**Decision**: Controls captured with priority 10000

**Rationale**:
- Ensures free-flying camera controls override all other systems
- Prevents player movement while flying
- Prevents unintended interactions with other apps

**Critical**: Must capture `scrollDelta`, not `scroll`, to prevent zoom events on the default camera.

### 4. Smooth Movement Default
**Decision**: `smoothMovement` defaults to true with lerp factor of 10

**Rationale**:
- Feels more natural and polished
- Prevents jarring instant starts/stops
- Still responsive enough for navigation
- Can be disabled per-camera if instant movement needed

## Issues Encountered & Resolved

### Issue 1: Controls Not Captured
**Problem**: `this.captureControls` property overwrote the `captureControls()` method

**Solution**: Renamed property to `this.controlsCaptured`

### Issue 2: Mouse Not Controlling Camera
**Problem**: Used `control.pointerMovement` instead of `control.pointer.delta`

**Solution**: Changed to `control.pointer.delta` and added `pointer.locked` check

### Issue 3: WASD Directions Incorrect
**Problem**: W/S were flipped, A/D weren't strafing correctly

**Solution**: Rewrote movement calculation to directly apply `forward`, `right`, and `up` vectors based on key presses

### Issue 4: Initial Camera Rotation Mismatch
**Problem**: Movement direction didn't match initial view direction

**Solution**: Initialize `flyState.euler` from `camera.quaternion` in `mount()` method

### Issue 5: Mouse Scroll Affecting Camera
**Problem**: Scroll wheel was zooming the player camera

**Solution**: Capture `control.scrollDelta` instead of `control.scroll`

### Issue 6: Camera Locked to 2 Axes
**Problem**: Camera only moved in straight line regardless of look direction

**Solution**: Added `updateMatrixWorld()` and switched to `getWorldQuaternion()` for direction vectors

### Issue 7: Strafing Not Working
**Problem**: A/D keys caused mostly forward/backward movement instead of left/right

**Root Cause**: Movement vectors were calculated from full camera rotation (including pitch). When looking up/down, the "right" vector pointed diagonally (mostly forward/backward with tiny left/right component).

**Solution**: Project forward vector onto horizontal plane, then calculate right vector perpendicular to it. This gives true FPS-style movement where:
- WASD moves horizontally (parallel to ground)
- Q/E/Space moves vertically
- Looking up/down doesn't affect horizontal movement direction

### Issue 8: Parent Transform Mismatch
**Problem**: Camera had parent (app's `object3D`), causing world-space movement vectors to be applied to local-space position

**Solution**: Always add free-flying cameras directly to scene with no parent

## Controls

- **W/A/S/D**: Move horizontally (forward/left/backward/right)
- **Q / Space**: Move up
- **E**: Move down
- **Shift**: Speed boost (3x by default)
- **Mouse**: Look around (requires pointer lock)
- **Mouse Scroll**: Disabled (captured to prevent zoom)

## Performance Considerations

- Uses object pooling (velocity vectors reused)
- Minimal allocations per frame
- Early return in update loop prevents other systems from processing
- No physics simulation (pure kinematic movement)
- Smooth movement uses efficient lerp (no spring physics)

## Future Enhancements (Not Implemented)

Potential improvements for the future:
- Collision detection option
- Acceleration/deceleration curves
- Configurable control bindings
- Alternative movement modes (true 6DOF, orbit, etc.)
- Camera shake/bob options
- Zoom control
- Speed based on distance from objects
- Save/restore camera positions

## Testing

Tested scenarios:
- ✅ Camera activation/deactivation
- ✅ All movement directions (WASD/QE/Space)
- ✅ Mouse look in all directions
- ✅ Speed boost with Shift
- ✅ Smooth vs instant movement
- ✅ Control capture/release
- ✅ Multiple cameras switching
- ✅ Looking up/down while moving
- ✅ Scroll wheel captured correctly
- ✅ No parent transform interference

## Conclusion

The free-flying camera system is now fully functional with proper FPS-style movement controls. The implementation correctly handles:
- Independent 6-degrees-of-freedom movement
- Intuitive horizontal/vertical separation
- Clean control capture/release
- Proper world-space positioning
- Smooth and responsive movement
