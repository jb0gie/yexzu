# Camera Node Architecture Proposal

## Current Limitations

The camera system in Hyperfy is currently hardcoded as a singleton:
- Single `world.camera` instance attached to `world.rig`
- Global camera settings in `ClientPrefs` and `ClientGraphics`
- No ability to have multiple cameras
- Can't attach cameras to entities
- Difficult to implement cinematic cameras or spectator modes

## Proposed Camera Node Architecture

### 1. Camera as a Node

```javascript
// Core camera node
class Camera extends Node {
  constructor(ctx, props) {
    super(ctx, 'camera')
    
    // Camera properties
    this.fov = props.fov || 70
    this.near = props.near || 0.2  
    this.far = props.far || 1200
    this.aspect = props.aspect || 'auto'
    
    // DOF settings
    this.dof = {
      enabled: props.dof?.enabled || false,
      focusDistance: props.dof?.focusDistance || 10,
      focusRange: props.dof?.focusRange || 5,
      bokehScale: props.dof?.bokehScale || 1,
      aperture: props.dof?.aperture || 5.6
    }
    
    // Camera state
    this.active = props.active || false
    this.priority = props.priority || 0
    
    // Three.js camera
    this.camera = new THREE.PerspectiveCamera(this.fov, 1, this.near, this.far)
    this.add(this.camera)
  }
  
  setActive(active) {
    this.active = active
    if (active) {
      this.ctx.world.setActiveCamera(this)
    }
  }
  
  lookAt(target) {
    this.camera.lookAt(target)
  }
  
  follow(entity, options = {}) {
    // Attach camera to follow an entity
    this.following = entity
    this.followOptions = options
  }
}
```

### 2. Multiple Camera Support

```javascript
// In world structure
class World {
  constructor() {
    this.cameras = new Map() // All cameras in the world
    this.activeCamera = null // Currently active camera
    this.defaultCamera = null // Fallback camera
  }
  
  registerCamera(camera) {
    this.cameras.set(camera.name, camera)
    if (!this.defaultCamera) {
      this.defaultCamera = camera
      this.setActiveCamera(camera)
    }
  }
  
  setActiveCamera(camera) {
    if (this.activeCamera) {
      this.activeCamera.active = false
    }
    this.activeCamera = camera
    camera.active = true
    this.emit('camera-changed', camera)
  }
  
  transitionToCamera(camera, duration = 1, easing = 'smooth') {
    // Smooth camera transitions
  }
}
```

### 3. Usage Examples

```xml
<!-- Player camera -->
<Camera 
  name="player"
  active
  fov={70}
  dof={{ enabled: true, focusDistance: 10 }}
  follow={player}
/>

<!-- Spectator camera -->
<Camera 
  name="spectator"
  fov={90}
  position={[0, 20, 0]}
  rotation={[-90, 0, 0]}
/>

<!-- Cutscene camera -->
<Camera 
  name="cutscene1"
  fov={35}
  dof={{ enabled: true, focusDistance: 5, bokehScale: 2 }}
  animation="dolly-zoom"
/>
```

### 4. Camera Controller Nodes

```javascript
// Specialized camera controllers
class OrbitCamera extends Camera {
  constructor(ctx, props) {
    super(ctx, props)
    this.target = props.target || [0, 0, 0]
    this.distance = props.distance || 10
    this.autoRotate = props.autoRotate || false
  }
}

class FirstPersonCamera extends Camera {
  constructor(ctx, props) {
    super(ctx, props)
    this.mouseSensitivity = props.mouseSensitivity || 0.002
    this.enableHeadBob = props.headBob || true
  }
}

class CinematicCamera extends Camera {
  constructor(ctx, props) {
    super(ctx, props)
    this.path = props.path // Spline path for camera movement
    this.lookAtPath = props.lookAtPath // Spline for look direction
    this.speed = props.speed || 1
  }
}
```

### 5. Integration with Current Systems

#### Migration Path
1. **Phase 1**: Create Camera node alongside existing system
2. **Phase 2**: Migrate ClientCameraControls features to camera nodes
3. **Phase 3**: Deprecate world.camera singleton
4. **Phase 4**: Full node-based camera system

#### Backwards Compatibility
```javascript
// Maintain world.camera as getter for active camera
Object.defineProperty(world, 'camera', {
  get() {
    return this.activeCamera?.camera || this.defaultCamera?.camera
  }
})
```

### 6. Benefits

1. **Multiple Cameras**: Easy switching between different views
2. **Camera Presets**: Save and load camera configurations
3. **Cinematic Tools**: Path-based cameras, camera shake, transitions
4. **Per-Camera Settings**: Each camera has its own FOV, DOF, etc.
5. **Entity Attachment**: Cameras can follow players, vehicles, objects
6. **Network Sync**: Spectator cameras can be synced across clients
7. **App Integration**: Apps can spawn and control their own cameras

### 7. Implementation Priority

1. **Core Camera Node** - Basic camera as a node
2. **Camera Manager** - System for switching between cameras
3. **DOF Integration** - Move DOF settings to camera nodes
4. **Controller Types** - First-person, third-person, orbit cameras
5. **Transitions** - Smooth camera switching and animations
6. **Network Support** - Sync camera states for spectators
7. **Editor Support** - Visual camera placement and path editing

## Next Steps

1. Review with team for feedback
2. Create proof-of-concept Camera node
3. Test performance with multiple cameras
4. Plan migration timeline
5. Update documentation

## References

- Godot Camera3D: https://docs.godotengine.org/en/stable/classes/class_camera3d.html
- Unity Camera: https://docs.unity3d.com/Manual/class-Camera.html
- Three.js Camera: https://threejs.org/docs/#api/en/cameras/PerspectiveCamera
- A-Frame Camera: https://aframe.io/docs/1.4.0/components/camera.html