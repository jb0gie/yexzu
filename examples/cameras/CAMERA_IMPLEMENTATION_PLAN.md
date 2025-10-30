# Camera Node Implementation Plan

## Phase 1: Foundation (Non-Breaking)
**Goal**: Add camera node system alongside existing camera without breaking anything

### 1.1 Create Camera Node Class
```javascript
// src/core/nodes/Camera.js
```
- [ ] Extends Node base class
- [ ] Contains THREE.PerspectiveCamera instance
- [ ] Has properties: fov, near, far, active, priority
- [ ] Can be added to scene graph like any other node
- [ ] Does NOT replace world.camera yet

### 1.2 Create CameraManager System  
```javascript
// src/core/systems/CameraManager.js
```
- [ ] Manages all camera nodes in the world
- [ ] Tracks active camera
- [ ] Handles camera switching
- [ ] Initially just observes, doesn't control rendering

### 1.3 Test Infrastructure
- [ ] Create test world with camera node
- [ ] Verify camera node appears in scene graph
- [ ] Confirm it doesn't interfere with existing camera

## Phase 2: Integration (Backwards Compatible)
**Goal**: Make camera nodes functional while maintaining world.camera

### 2.1 Rendering Integration
- [ ] Modify ClientGraphics to check for active camera node
- [ ] Fall back to world.camera if no camera node active
- [ ] Test rendering with both camera types

### 2.2 Add Compatibility Layer
```javascript
// In World.js
Object.defineProperty(world, 'camera', {
  get() {
    // Return active camera node's THREE camera, or legacy camera
    return this.cameraManager?.activeCamera?.camera || this._legacyCamera
  }
})
```

### 2.3 Controls Integration  
- [ ] Update ClientControls to work with camera nodes
- [ ] Ensure mouse/keyboard input works with new cameras
- [ ] Test with both first-person and third-person views

## Phase 3: Feature Migration
**Goal**: Move camera features to node-based system

### 3.1 DOF Settings Migration
- [ ] Add DOF properties to Camera node
- [ ] Create getDOFSettings() method on Camera
- [ ] Update ClientGraphics to read DOF from active camera

### 3.2 Camera Controls Migration
- [ ] Move focal length to Camera node property
- [ ] Move ADS zoom to camera switching/animation
- [ ] Update ClientCameraControls to modify camera node

### 3.3 Create Standard Camera Types
- [ ] PlayerCamera node (follows player)
- [ ] SpectatorCamera node (free-flying)
- [ ] StaticCamera node (fixed position)

## Phase 4: Advanced Features
**Goal**: Add new capabilities enabled by node architecture

### 4.1 Camera Transitions
- [ ] Implement smooth camera switching
- [ ] Add transition types (cut, fade, dolly)
- [ ] Test with multiple cameras

### 4.2 Camera Attachments
- [ ] Allow cameras to follow entities
- [ ] Implement look-at constraints
- [ ] Add camera shake effects

### 4.3 App Support
- [ ] Allow apps to create cameras
- [ ] Add camera control permissions
- [ ] Document camera API for apps

## Implementation Order (Safe Path)

### Week 1: Foundation
1. **Create Camera.js node** (non-functional, just exists)
2. **Create CameraManager.js** (tracks but doesn't control)
3. **Add to world initialization** (doesn't affect rendering)
4. **Test that nothing breaks**

### Week 2: Make It Work
1. **Hook up rendering** (with fallback)
2. **Add compatibility layer**
3. **Test switching between cameras**
4. **Ensure backwards compatibility**

### Week 3: Migration
1. **Move DOF to cameras**
2. **Update camera controls**
3. **Create player camera**
4. **Deprecation warnings for old API**

### Week 4: Polish
1. **Camera transitions**
2. **Documentation**
3. **Migration guide**
4. **Remove legacy code (optional)**

## Testing Checklist

### Before Each Phase
- [ ] Existing camera still works
- [ ] Player controls function normally
- [ ] DOF and focal length work
- [ ] Build mode works
- [ ] Apps using camera still work

### After Implementation
- [ ] Can create multiple cameras
- [ ] Can switch between cameras
- [ ] Per-camera settings work
- [ ] Smooth transitions work
- [ ] Performance is acceptable

## Rollback Plan

If issues arise at any phase:
1. Camera nodes can be disabled via flag
2. CameraManager can be bypassed
3. Legacy camera code remains until fully tested
4. Git branches for each phase

## Code Locations to Modify

### Core Files
- `/src/core/nodes/` - Add Camera.js
- `/src/core/systems/` - Add CameraManager.js
- `/src/core/World.js` - Add compatibility layer
- `/src/core/createClientWorld.js` - Register CameraManager

### Systems to Update
- `ClientGraphics.js` - Rendering with camera nodes
- `ClientControls.js` - Input with camera nodes
- `ClientCameraControls.js` - Work with camera nodes
- `Stage.js` - Raycast from camera nodes

### Testing Files
- Create `/examples/camera-node-test.js`
- Create `/examples/multi-camera-demo.js`

## Success Criteria

Phase 1 Success:
- Camera nodes exist in scene graph
- No existing functionality broken
- Can query camera nodes via world.cameraManager

Phase 2 Success:
- Can render with camera node
- Can switch between multiple cameras
- world.camera still works for legacy code

Phase 3 Success:
- DOF settings per camera work
- Camera controls work with nodes
- Standard camera types available

Phase 4 Success:
- Smooth camera transitions
- Cameras can follow entities
- Apps can create cameras

## Risks and Mitigations

**Risk**: Breaking existing camera functionality
**Mitigation**: Keep legacy camera, gradual migration, feature flags

**Risk**: Performance impact with multiple cameras
**Mitigation**: Only update active camera, lazy initialization

**Risk**: Network sync complexity
**Mitigation**: Start with local-only cameras, add sync later

**Risk**: App compatibility
**Mitigation**: Maintain backwards compatibility layer permanently