# Original DOF Implementation Restored

## Problem Fixed
The DOF (Depth of Field) post-processing was only working in first-person view after our zoom fixes. The original implementation used raycasting from the player's head/chest and should work in **both** first-person and third-person modes.

## What Was Restored

### 1. Original Head Raycast Method (`ClientCameraControls.js:497-530`)
```javascript
raycastFromPlayerHead() {
  // Get player head position (1.6m height offset)
  const headPos = player.entity.position.clone()
  headPos.y += 1.6 // Standard eye height

  // Get camera direction
  const cameraDir = new THREE.Vector3()
  this.world.camera.getWorldDirection(cameraDir)

  // Raycast from head position in camera direction
  this.raycaster.set(headPos, cameraDir)
  const intersects = this.raycaster.intersectObjects(scene.children, true)
  
  // Filter out close hits and return distance
  const validHits = intersects.filter(hit => hit.distance > 0.5)
  return validHits.length > 0 ? validHits[0].distance : null
}
```

### 2. Original DOF Update Logic (`ClientCameraControls.js:183-320`)
- **Priority 1**: Head raycast (works in both FP and TP)
- **Priority 2**: Camera center raycast (fallback)
- **Priority 3**: Zoom-based focus (when no raycast hits)

### 3. Original Autofocus System (`ClientCameraControls.js:322-350`)
- **Reticle autofocus**: Uses head raycast for consistency
- **Player autofocus**: Focuses on player distance
- **Dynamic DOF**: Auto-adjusts based on zoom level

### 4. Original Camera Autofocus (`Camera.js:931-1000`)
```javascript
performAutofocus(delta) {
  // Raycast from player head in BOTH modes
  const headPos = player.entity.position.clone()
  headPos.y += 1.6 // Standard eye height
  
  const cameraDir = new THREE.Vector3()
  camera.getWorldDirection(cameraDir)
  
  const raycaster = new THREE.Raycaster()
  raycaster.set(headPos, cameraDir)
  const intersects = raycaster.intersectObjects(scene.children, true)
  
  // Apply focus from head raycast
  if (validHits.length > 0) {
    targetDistance = validHits[0].distance
  }
}
```

## Key Features Restored

### ✅ Works in Both Camera Modes
- **First-person** (zoom < 1): Raycasts from player head
- **Third-person** (zoom >= 1): Raycasts from player head
- **No mode detection needed**: Same logic works everywhere

### ✅ Original Focus Priority System
1. **Head raycast** (most accurate) - works in both FP/TP
2. **Camera center raycast** (fallback)
3. **Zoom-based estimation** (when no hits)

### ✅ Zoom Stability Maintained
- Kept all zoom stability fixes from previous work
- Extreme zoom levels won't break DOF
- Emergency recovery methods still available

### ✅ Original Autofocus Modes
- **Reticle autofocus**: Uses head raycast with delay
- **Player autofocus**: Focuses on player distance
- **Dynamic DOF**: Auto-adjusts with zoom

## How It Works

### The Original Algorithm
1. **Get player head position**: `player.entity.position + (0, 1.6, 0)`
2. **Get camera look direction**: `camera.getWorldDirection()`
3. **Raycast from head**: Cast ray from head position in camera direction
4. **Filter hits**: Remove hits closer than 0.5m (likely the player)
5. **Apply focus**: Use the closest valid hit distance for DOF focus

### Why This Works in Both Modes
- **First-person**: Player head is at camera position, raycast goes where player looks
- **Third-person**: Player head is behind camera, raycast goes where camera looks
- **Same math**: No special case handling needed

## Testing
Created `test-original-dof.js` to verify:
- ✅ First-person DOF with head raycast
- ✅ Third-person DOF with head raycast  
- ✅ Head raycast functionality
- ✅ Zoom stability at extreme levels
- ✅ Seamless mode switching

## Usage
The restored system works exactly like the original:
- DOF focuses on whatever the player is looking at
- Works consistently in both first-person and third-person
- No manual mode switching required
- Zoom stability fixes prevent extreme zoom issues

**Manual test commands:**
- `/test-fp-dof` - Test first-person DOF
- `/test-tp-dof` - Test third-person DOF
- `/cam.recoverDOF()` - Emergency recovery if needed

The original DOF implementation has been successfully restored while maintaining all zoom stability improvements!