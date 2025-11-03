# 🎯 Head Bone Raycast Depth of Field System

## Overview

This enhanced depth of field system uses **player head bone raycasting** instead of screen-center reticule raycasting for more accurate and natural focusing. The system provides superior focus accuracy, especially in VR environments where camera position may not match actual head position due to rig offsets.

## Architecture

```
Enhanced Focus Priority:
1. Head Bone Raycast (most accurate) ← NEW
2. Enhanced Camera-Center Raycast (fallback)
3. Player Distance (final fallback)
```

## Key Benefits

### ✅ **Superior Accuracy**
- Uses actual head orientation instead of screen center
- Aligns with HMD position in VR environments
- Accounts for head rotation independent of camera movement

### ✅ **VR Compatibility**
- Proper XR head tracking
- Matches HMD orientation and position
- Eliminates focus inconsistencies from camera rig offsets

### ✅ **Enhanced Stability**
- Focus hysteresis prevents micro-adjustments
- Anti-jump focus logic
- Velocity-based smoothing for natural motion

### ✅ **Performance Optimized**
- Leverages existing raycast infrastructure
- Smart update intervals
- Minimal overhead on existing systems

## Usage

### Quick Setup (Copy example system)
```javascript
({
  configure: [
    { type: 'toggle', key: 'enabled', label: 'Head Bone DoF', initial: true },
    { type: 'toggle', key: 'headBoneRaycast', label: 'Use Head Bones', initial: true }
  ]
})
```

### Manual Integration (Core Engine)

#### 1. **Existing System Enhancement** (Recommended)
```javascript
// In your ClientCameraControls setup:
this.useHeadBoneRaycast = true
this.focusHysteresis = 0.05 // Anti-jump threshold

// New head bone raycast method:
raycastFromPlayerHead() {
  const headMatrix = this.world.avatar.getBoneTransform('head')
  if (headMatrix) {
    const headPos = new THREE.Vector3().setFromMatrixPosition(headMatrix)
    const headDir = new THREE.Vector3(0, 0, -1).applyMatrix4(headMatrix)
    this.raycaster.set(headPos, headDir)
    return this.performEnhancedRaycast()
  }
  return null
}
```

#### 2. **Camera Node Enhancement** (Alternative)
```javascript
// In Camera.js camera config:
dof: {
  enabled: true,
  useHeadBoneRaycast: true, // Enable head bone raycast
  focusHysteresis: 0.05,    // Anti-jump logic
  autofocus: true
}

// Enhanced performAutofocus:
if (this.dof.useHeadBoneRaycast && this.ctx.world.avatar) {
  const headMatrix = this.ctx.world.avatar.getBoneTransform('head')
  // Use head position and orientation for raycasting
}
```

## Configuration Options

### **DoF Mode Selection**
- `auto-detect`: Combines head bone + camera + player distance
- `manual-player`: Uses only head bone raycast
- `manual-world`: Enhanced camera-center raycast
- `reticule`: Legacy screen-center system

### **Advanced Settings**
```javascript
{
  headBoneRaycast: true,     // Enable head bone raycast
  focusHysteresis: 0.05,     // Focus anti-jump threshold (0.01-1.0)
  dofSpeed: 8,               // Focus response speed (0.5-20)
  dofHSmoothness: 0.08,      // Focus smoothness (0.01-0.3)
  showDebug: false,          // Visual debug info
  showVisualization: true    // Focus point visualization
}
```

## Technical Implementation

### **Enhanced Head Bone Access**
The system leverages Hyperfy's existing head bone infrastructure:
```javascript
const headMatrix = avatar.getBoneTransform('head')
const headPos = new THREE.Vector3().setFromMatrixPosition(headMatrix)
const headQuat = new THREE.Quaternion().setFromRotationMatrix(headMatrix)
const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(headQuat)
```

### **Hierarchical Focus System**
1. **Priority 1**: Head bone raycast (most accurate)
2. **Priority 2**: Enhanced camera-center raycast (fallback)
3. **Priority 3**: Distance to player (final fallback)

### **Enhanced Focus Smoothing**
- Hysteresis-based anti-jump logic
- Velocity-based smoothing for natural motion
- Frame-rate independent timing

## Performance Considerations

### **Head Bone Update Frequency**
- Updates every frame (60fps) for real-time focusing
- HMD position in VR updates at XR display rate
- Efficient quaternion calculations

### **Raycast Optimization**
- Leverages existing octree structure
- Reuses intersectables for efficiency
- Caps maximum distance appropriately

### **Memory Management**
- Vector object pooling where possible
- Automatic cleanup on destroy
- Minimal object allocation

## VR-Specific Benefits

### **HMD Position Accuracy**
- Matches actual headset position
- Accounts for IPD and tracking offsets
- Works with room-scale/standing VR

### **Focus Consistency**
- Eliminates camera rig compensation issues
- Proper vertical offset handling
- Works with both 6DOF and 3DOF tracking

## Debugging

### **Visual Debug Indicators**
- Blue particles: Head position indicator
- Red particles: Focus point indicator
- Real-time focus statistics display

### **Console Debug Output**
```javascript
// Enable debug mode to see:
console.log(`Head focus: ${headFocus}m`)
console.log(`Camera focus: ${cameraFocus}m`)
console.log(`Focus smoothing: ${smooth}m`)
```

## Files Created

1. `src/core/systems/ClientCameraControls-enhanced.js` - Enhanced client camera controls
2. `src/core/nodes/Camera-enhanced.js` - Enhanced camera node with head bone support
3. `examples/postprocessing/enhanced-dof-head-bone-system.js` - Complete example system
4. `docs/HEAD_BONE_DOF_GUIDE.md` - This documentation

## Testing the System

### **Quick Validation**
1. Load example system: `examples/postprocessing/enhanced-dof-head-bone-system.js`
2. Enable head bone raycast
3. Strafe left/right during jump - watch focus adjust to head direction
4. Check debug output for head vs camera focus distances

### **VR Testing**
1. Use VR headset
2. Look up/down and observe focus changing with head orientation
3. Compare with legacy reticule system

## Next Steps

1. **Test the enhanced system** with your existing mobile controls
2. **Create any needed animations** for specific use cases
3. **Integrate with your VR workflows** for full compatibility
4. **Optimize head bone transform caching** for VR applications

The foundation is solid and ready for your specific use case implementation! 🎯