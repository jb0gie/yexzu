# Testing Grabbable - Fixed Outline Crash

## The Problem
The outline effect was crashing the client with:
```
TypeError: Cannot read properties of undefined (reading 'enable')
```

## The Fix
I've disabled the outline effect temporarily to prevent the crash:

1. Removed outline setup call from mount()
2. Made setupOutline() do nothing
3. Removed outline-related imports
4. Removed outline properties from defaults
5. Removed outline properties from constructor
6. Removed outlineEffect initialization

## Test Now

The crash should be fixed. Please test again:

1. Kill any hanging dev server processes:
   ```bash
   pkill -f "node.*build"
   ```

2. Start fresh:
   ```bash
   npm run dev
   ```

3. Open browser to `http://localhost:3000`

4. Press **B** to open Builder

5. Add a cube:
   - Click "Add" in Builder
   - Choose "Box"
   - Place it in the scene

6. Edit script:
   - Select the box
   - Click "Edit Script"
   - Delete existing script
   - Paste the simple test:

```javascript
// Simple Grabbable Test - Minimal Version
console.log('[Simple Grabbable] App starting')

app.keepActive = true

const grabbable = app.create('grabbable', {
  position: [0, 1.5, 0],
  grabDistance: 5,
  snapDistance: 1
})

const cube = app.create('prim', {
  type: 'box',
  size: [0.5, 0.5, 0.5],
  color: '#FF0000'
})

const body = app.create('rigidbody', {
  type: 'dynamic',
  mass: 1
})

grabbable.add(cube)
grabbable.add(body)
app.add(grabbable)

console.log('[Simple Grabbable] Created grabbable cube')

app.on('update', () => {
  if (grabbable.update) grabbable.update()
})

console.log('[Simple Grabbable] App ready')
```

7. **Check browser console (F12)** for:
   ```
   [Simple Grabbable] App starting
   [Simple Grabbable] App ready
   ```

8. **Try grabbing** the red cube - click and drag

Expected behavior:
- Cube should highlight when hovered
- Click and drag to grab
- Cube follows cursor
- Release by clicking again
- Console shows interaction logs

## What Was Fixed

### Before (Crashed):
- Outline effect tried to use postprocessing
- Import failed or effect misconfigured
- Caused infinite render loop
- Client crashed with "Cannot read properties of undefined"

### After (Should Work):
- Outline effect completely disabled
- No postprocessing imports
- No outline-related code running
- Should not crash

## If It Still Crashes

Please provide the new error messages. The outline crash should be gone now.

## Next Steps

If this works, we can:
1. Test the full grabbable system
2. Add snap points
3. Test callbacks
4. Fix outline effect properly (when stable)
