# Testing Grabbables in Hyperfy

## Understanding How Apps Work in Hyperfy

**IMPORTANT**: Hyperfy does NOT have a `/spawn` command. Apps are created through the **Builder system** by uploading bundled `.hyp` files that contain both 3D models and scripts.

## How to Test the Grabbable System

### Method 1: Using the Builder (Recommended for Testing)

1. **Create a simple test object**:
   - In Hyperfy, open the Builder (press B or click the Builder button)
   - Drag any 3D model into the scene (or use a default cube)
   - Select the object and click "Edit Script"

2. **Replace the script** with the content from `examples/grabbable-test.js`

3. **The test will run automatically** when you place the object

### Method 2: Create a Test App Bundle

1. **Create the app structure**:
   ```
   test-grabbable/
   ├── model.glb (any 3D model)
   └── index.js (copy from examples/grabbable-test.js)
   ```

2. **Bundle it into a .hyp file** using Hyperfy's bundler tool

3. **Upload through the Builder** UI

### Method 3: Programmatic Testing (Advanced)

If you have builder/admin permissions, you can create apps in code:

```javascript
// This would run in an existing app's script
const data = {
  id: uuid(),
  type: 'app',
  blueprint: 'test-grabbable',
  position: [0, 0, 0],
  quaternion: [0, 0, 0, 1],
  scale: [1, 1, 1]
}
const testApp = world.entities.add(data, true)
```

## What the Test Does

The `examples/grabbable-test.js` app creates:
1. A table as a reference surface
2. 3 snap points positioned above the table
3. 3 colored cubes that are grabbable
4. A UI with instructions

## How to Verify It's Working

1. **Check the browser console** (F12) - You should see:
   ```
   [Grabbable Test] Initializing test app
   [Grabbable Test] Creating grabbable 0
   [Grabbable Test] Creating grabbable 1
   [Grabbable Test] Creating grabbable 2
   [Grabbable Test] Test setup complete
   ```

2. **Try grabbing the colored cubes**:
   - Walk up to a cube
   - Click and hold to grab it
   - Move it around
   - Release when near a snap point above the table

3. **Watch the console for interaction logs**:
   ```
   [Grabbable Test] Grabbed 0 by: [player name]
   [Grabbable Test] Rigidbody type: kinematic
   [Grabbable Test] Released 0 by: [player name]
   [Grabbable Test] Is snapped: true
   [Grabbable Test] Snapped 0 to: [x, y, z]
   [Grabbable Test] Rigidbody type after snap: static
   ```

## Verifying Each Feature

### ✅ Grab Mechanic
- [ ] Cubes highlight when you look at them
- [ ] Clicking grabs the cube
- [ ] Cube follows your view/cursor
- [ ] Rigidbody changes to kinematic
- [ ] onGrab callback fires (check console)

### ✅ Release Mechanic
- [ ] Clicking again releases the cube
- [ ] Cube stops following your view
- [ ] onRelease callback fires (check console)

### ✅ Snapping
- [ ] Moving cube near snap points makes it snap
- [ ] Snap distance is respected (~1.5 units)
- [ ] Cube aligns to snap point position
- [ ] onSnap callback fires
- [ ] Rigidbody changes to static (if configured)

### ✅ Unsnapping
- [ ] Grabbing a snapped cube unsnaps it
- [ ] onUnsnap callback fires
- [ ] Rigidbody changes back to dynamic

## Troubleshooting

### App doesn't appear
- Check browser console for errors
- Verify the script was pasted correctly
- Ensure you're using the Builder system correctly

### Can't grab cubes
- Verify `world.isClient` is true
- Check grab distance is large enough (currently 5 units)
- Ensure you're clicking directly on the cubes
- Look for console errors during grab attempt

### Snapping doesn't work
- Verify snap points were created (check console for "Creating snap" logs)
- Ensure snap distance is appropriate (currently 1.5 units)
- Check that `world.snaps` system exists
- Verify cubes are being released near snap points

### Physics issues
- Check rigidbody types change correctly (dynamic → kinematic → static)
- Verify rigidbody is added as child of grabbable
- Look for physics errors in console

### No console output
- Remember console.log works in SES, but world.chat() is broken
- Check browser console filtering (select "All levels")
- Verify the app is actually running (check for initialization logs)

## Understanding the Architecture

### How Apps Are Structured
Apps in Hyperfy are:
1.  **.hyp bundles**  : ZIP files containing models + scripts + metadata
2. Run in **SES sandbox** for security
3. Access global `app`, `world`, `props`, `utils` objects
4. Use `app.create()` to make nodes, `app.add()` to add them
5. Event-driven with `app.on()` and `app.emit()`

### The Builder Flow
1. User uploads model via Builder UI
2. Model is stored in `world/assets/` by hash
3. Script is attached to the blueprint
4. When placed, app runs automatically
5. Position/rotation/scale are entity properties

### Testing vs Production
- **Testing**: Edit scripts directly in Builder
- **Production**: Bundle as `.hyp` and upload
- **Verification**: Always check browser console

## Key Differences from My Initial Approach

**What I got wrong**:
- ❌ No `/spawn` command exists
- ❌ Apps aren't spawned via chat
- ❌ Scripts don't use `({...})` wrapper
- ❌ Apps need 3D models, not just scripts
- ❌ World assets use content addressing

**Correct approach**:
- ✅ Use Builder UI to create/edit apps
- ✅ Scripts run at top level
- ✅ Apps bundle models with scripts
- ✅ Positioned visually in 3D space
- ✅ Test by interacting in-world

## Next Steps

1. Use Builder to create a test object
2. Paste the test script
3. Interact and check console
4. Verify all features work
5. Report any remaining issues
