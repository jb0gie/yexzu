# Legacy Camera System Documentation

## Overview
This document describes the legacy camera system that was removed to resolve conflicts with the new node-based camera system.

## System Components

### 1. ClientControls System (`src/core/systems/ClientControls.js`)
- **Purpose**: Provides legacy camera controls through `createCamera()` function
- **Key Function**: `createCamera(controls, control)` - Creates legacy camera interface
- **Location**: Lines 746-761 in ClientControls.js

### 2. Legacy Camera Interface
The legacy camera provided this interface:
```javascript
{
  $camera: true,
  position: THREE.Vector3,  // Copy of world.rig.position
  quaternion: THREE.Quaternion,  // Copy of world.rig.quaternion  
  rotation: THREE.Euler,  // Copy of world.rig.rotation (YXZ order)
  zoom: number,  // world.camera.position.z
  write: false,  // Read-only flag
}
```

### 3. Integration Points
- **World Creation**: Registered as 'controls' system in `createClientWorld()`
- **Camera Access**: Available through `app.control().camera`
- **Update Cycle**: Updated every frame in ClientControls system

## Conflicts with New System

### 1. Dual Camera Systems
Both systems were running simultaneously:
- Legacy: `world.register('controls', ClientControls)` 
- New: `world.register('cameraManager', CameraManager)`

### 2. Camera Control Conflicts
- Legacy system directly manipulated `world.camera.position.z` for zoom
- New system uses CameraManager for camera switching
- Both systems tried to control camera rotation/position

### 3. Helper Visibility
- Legacy system didn't support camera helpers
- New system has `showHelper` property on Camera nodes
- Conflict prevented helpers from displaying properly

### 4. Input Handling
- Legacy: Direct mouse/keyboard input mapping
- New: Systematic input through CameraManager and ClientCameraControls

## Key Differences

### Legacy System
- Single camera attached to player rig
- Direct manipulation of camera properties
- No helper visualization
- Simple zoom control via camera.position.z
- Integrated with general control system

### New Node Camera System
- Multiple cameras can exist as scene nodes
- Camera activation through CameraManager
- Helper visualization for debugging
- Rich camera properties (DOF, bloom, etc.)
- Apps can create their own cameras
- Proper camera prioritization and switching

## Migration Impact

### Removed Components
1. **ClientControls registration** - No longer registered as 'controls' system
2. **createCamera function** - Legacy camera interface removed
3. **Camera control binding** - Direct camera manipulation removed

### Preserved Components  
1. **Other control types** - mouse, keyboard, touch, XR controls remain
2. **Control priority system** - Layered control system still functional
3. **Input binding** - Core input handling preserved

### New Behavior
- Cameras now only work through CameraManager
- Camera helpers display properly
- Apps can create and manage their own cameras
- Smoother camera transitions and switching
- Better camera state management

## Reverting Changes
If needed, the legacy system can be restored by:
1. Re-adding ClientControls registration in `createClientWorld()`
2. Restoring the `createCamera` function in ClientControls.js
3. Ensuring proper coordination between legacy and new systems

## Files Modified
- `src/core/systems/ClientControls.js` - Removed createCamera function
- `src/core/createClientWorld.js` - Removed ClientControls registration
- `src/core/systems/CameraManager.js` - Enhanced for standalone operation
- `src/core/systems/ClientCameraControls.js` - Updated to work without legacy system