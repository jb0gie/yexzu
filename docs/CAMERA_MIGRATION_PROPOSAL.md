# Camera System Migration Proposal

## Current State
- Legacy camera: `world._legacyCamera` (PerspectiveCamera)
- Camera nodes: New system with per-camera postprocessing
- Both systems running in parallel

## Proposed Migration

### Phase 1: Default Camera Node
```javascript
// In World.js constructor
this.defaultCamera = new Camera({
  name: 'default',
  fov: 73,  // Wide landscape preset
  near: 0.2,
  far: 1200,
  active: true
})

// Backwards compatibility
Object.defineProperty(this, 'camera', {
  get() {
    return this.cameraManager?.activeCamera?.camera || this.defaultCamera.camera
  }
})
```

### Phase 2: Remove Legacy Camera
- Remove `this._legacyCamera` from World.js
- Update all references to use camera nodes
- ClientCameraControls works with active camera node

### Phase 3: Enhanced Features
- Camera transitions/interpolation
- Camera paths/rails for cinematics
- Save/load camera presets
- Camera shake effects

## Benefits
1. **Single System** - Easier to maintain and extend
2. **Better Performance** - One render pipeline
3. **More Features** - Leverage node system capabilities
4. **Cleaner Codebase** - Remove duplicate camera logic

## Migration Steps
1. Create default Camera node in World initialization
2. Update ClientGraphics to always use camera nodes
3. Update ClientCameraControls to modify active camera node
4. Remove legacy camera code
5. Test all camera-dependent systems

## Backwards Compatibility
- `world.camera` continues to work (returns active camera's THREE.Camera)
- Existing camera control APIs remain functional
- Scripts using camera continue to work

## Code Changes Required

### World.js
- Create default Camera node instead of legacy camera
- Register with CameraManager automatically

### ClientGraphics.js  
- Always render through camera node's composer
- Remove legacy camera references

### ClientCameraControls.js
- Modify active camera node settings instead of world.camera
- Work with CameraManager for camera switching

## Timeline
- Phase 1: Immediate - Add default camera node
- Phase 2: Next sprint - Remove legacy code
- Phase 3: Future - Advanced features