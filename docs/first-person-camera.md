# First-Person Camera Implementation

## Overview
This document outlines the implementation of a first-person camera system in Hyperfy, including camera positioning, rotation handling, and smooth transitions between first and third-person modes.

## Key Features
- Toggle between first and third-person modes using 'C' key
- Camera positioned at eye level in first-person mode
- Smooth transitions between camera modes
- Proper collision handling and clipping prevention
- Consistent interaction distances in both modes

## Implementation Details

### Camera Configuration
```javascript
this.firstPersonCam = {
  position: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
  offset: new THREE.Vector3(0, 1.65, -0.7), // Eye level height and forward offset
  targetPosition: new THREE.Vector3(),
  targetQuaternion: new THREE.Quaternion(),
  lerpSpeed: 15
}
```

### Key Components

1. **Camera Mode Toggle**
   - Activated by pressing 'C'
   - Handles zoom and camera position transitions
   - Preserves VRM first-person settings

2. **Position Updates**
   - Camera positioned at eye level (1.65 units up)
   - Forward offset (-0.7 units) to prevent clipping
   - Smooth position transitions using lerp

3. **Rotation Handling**
   - Separate rotation limits for first-person (60 degrees) and third-person (90 degrees)
   - Base rotation only affected by left/right movement
   - Head bone rotation follows camera in first-person mode

4. **Interaction System**
   - Consistent interaction distances in both modes
   - Rig position updated to match base position
   - Maintains proper 'E' action functionality

### Code Examples

#### Camera Mode Toggle
```javascript
if (code === 'KeyC') {
  this.isFirstPerson = !this.isFirstPerson
  if (this.isFirstPerson) {
    this.normalZoom = this.cam.zoom
    this.cam.zoom = 0
    this.control.camera.zoom = 0
  } else {
    this.cam.zoom = this.normalZoom
    this.control.camera.zoom = this.normalZoom
  }
}
```

#### Position Updates
```javascript
// First-person camera position update
activeCam.targetPosition.copy(this.base.position)
activeCam.targetPosition.y += this.firstPersonCam.offset.y

const forward = new THREE.Vector3(0, 0, this.firstPersonCam.offset.z)
forward.applyQuaternion(this.base.quaternion)
activeCam.targetPosition.add(forward)
```

#### Rotation Updates
```javascript
if (this.isFirstPerson) {
  activeCam.rotation.x = clamp(activeCam.rotation.x, -this.firstPersonRotationLimit, this.firstPersonRotationLimit)
  
  if (this.headBone) {
    this.headBone.rotation.set(0, 0, 0)
    this.headBone.rotation.x = activeCam.rotation.x
  }

  const baseRotation = new THREE.Euler(0, activeCam.rotation.y, 0, 'YXZ')
  this.base.quaternion.setFromEuler(baseRotation)
}
```

## Best Practices
1. Always update the rig position to match the base position for consistent interactions
2. Use smooth transitions for camera movements to prevent jarring changes
3. Implement proper collision checks to prevent camera clipping
4. Maintain separate rotation limits for first and third-person modes
5. Update head bone rotation to match camera rotation in first-person mode

## Known Considerations
- Camera position needs careful tuning to prevent seeing inside the character model
- Rotation limits should be adjusted based on the desired level of head movement
- Interaction distances should be consistent across both camera modes
- VRM first-person settings should be respected for proper model rendering 