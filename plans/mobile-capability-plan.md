# Mobile Capability Enhancement Plan

## Overview
Address mobile usability for interacting with World UI elements.

**Phase 1 COMPLETED:** boltTradeTerminal now starts hidden with toggle button.

---

## Phase 2: Mobile World UI Interaction (REVISED)

### Problem Statement
- Desktop: Mouse cursor hovers over world UI, click to interact
- Mobile: No cursor, only reticle at screen center, but no way to interact with world UI
- The action button (touchB) currently only triggers Action nodes (E-key interactions)
- Mobile users cannot click buttons, scroll, or interact with world-space UI panels

### Current System Flow

**ClientPointer.js** (lines 32-53):
```javascript
update(delta) {
  if (this.control.xrLeftTrigger.value || this.control.xrRightTrigger.value) {
    // VR input mode
  } else if (this.control.pointer.locked) {
    // Desktop FPS mode: raycast from reticle
    hit = this.world.stage.raycastReticle()[0]
    pressed = this.control.mouseLeft.pressed
  } else {
    // Mobile mode: uses DOM screen events only
    hit = this.screenHit  // Only works for screen-space UI!
    pressed = this.control.mouseLeft.pressed
  }
}
```

**ClientActions.js** (lines 56-60):
```javascript
this.btnDown =
  this.control.keyE.down ||
  this.control.touchB.down ||  // Action button used here
  this.control.xrLeftTrigger.down ||
  this.control.xrRightTrigger.down
```

### Conflict to Resolve
The action button (touchB) is shared between:
1. **Action System** - Triggers E-key actions (open doors, pick up items)
2. **World UI Interaction** (new) - Click buttons in world-space UI

**Resolution Priority:** World UI interaction takes precedence when reticle is over world UI. If no world UI under reticle, action system works as before.

---

## Implementation Plan

### 2.1 Modify ClientPointer.js for Mobile Reticle Raycasting

**Changes:**
1. Import `isTouch` from client utils
2. Add mobile mode that raycasts from reticle
3. Use touchB for pointer pressed/released detection
4. Only apply when pointer is NOT locked (mobile mode)

```javascript
import { isTouch } from '../../client/utils'

export class ClientPointer extends System {
  constructor(world) {
    super(world)
    this.pointerState = new PointerState()
    this.isTouch = isTouch  // Add this
    this.mobileReticleHit = null  // Track hit for feedback
  }

  update(delta) {
    let hit
    let pressed
    let released

    if (this.control.xrLeftTrigger.value || this.control.xrRightTrigger.value) {
      // VR input (unchanged)
      const ray = this.control.xrLeftTrigger.value ? this.control.xrLeftRayPose : this.control.xrRightRayPose
      const dir = v1.set(0, 0, -1).applyQuaternion(ray.quaternion)
      hit = this.world.stage.raycast(ray.position, dir)[0]
      const trigger = this.control.xrLeftTrigger.value ? this.control.xrLeftTrigger : this.control.xrRightTrigger
      pressed = trigger.pressed
      released = trigger.released
    } else if (this.control.pointer.locked) {
      // Desktop FPS mode (unchanged)
      hit = this.world.stage.raycastReticle()[0]
      pressed = this.control.mouseLeft.pressed
      released = this.control.mouseLeft.released
    } else if (this.isTouch) {
      // MOBILE: Raycast from reticle for world UI
      const reticleHits = this.world.stage.raycastReticle()
      const uiHit = reticleHits.find(h => h.node?.isUI || h.node?.constructor?.name === 'UI')

      hit = uiHit || null
      this.mobileReticleHit = uiHit || null

      // Use touchB for pointer events on mobile
      pressed = this.control.touchB.pressed
      released = this.control.touchB.released
    } else {
      // Desktop non-locked: screen cursor mode
      hit = this.screenHit
      pressed = this.control.mouseLeft.pressed
      released = this.control.mouseLeft.released
    }

    this.pointerState.update(hit, pressed, released)
  }
}
```

### 2.2 Modify ClientActions.js to Respect World UI

The action system should NOT trigger when the user is looking at world UI:

```javascript
update(delta) {
  // Check if pointer system has a mobile reticle hit on UI
  const pointerSystem = this.world.pointer  // ClientPointer
  const hasWorldUIHit = pointerSystem?.mobileReticleHit?.node?.isUI

  // Don't process action if user is interacting with world UI
  if (hasWorldUIHit) {
    if (this.current.node) {
      this.current.node = null
      this.current.distance = Infinity
      this.emit('change', false)
      this.action.stop()
    }
    return
  }

  // ... rest of existing action logic
}
```

### 2.3 Add Reticle Visual Feedback (CoreUI.js)

When mobile reticle is over interactive world UI, change the reticle appearance:

```javascript
function Reticle({ world }) {
  const [pointerLocked, setPointerLocked] = useState(world.controls.pointer.locked)
  const [buildMode, setBuildMode] = useState(world.builder.enabled)
  const [overWorldUI, setOverWorldUI] = useState(false)

  useEffect(() => {
    // Check for world UI hit on mobile
    function checkWorldUI() {
      if (isTouch && world.pointer?.mobileReticleHit) {
        setOverWorldUI(true)
      } else {
        setOverWorldUI(false)
      }
    }

    const interval = setInterval(checkWorldUI, 100)
    return () => clearInterval(interval)
  }, [])

  const visible = isTouch ? true : pointerLocked
  if (!visible) return null

  return (
    <div className={cls('reticle', { 'over-ui': overWorldUI })}>
      <div className='reticle-item' />
    </div>
  )
}
```

Add CSS for the over-ui state:
```css
.reticle.over-ui .reticle-item {
  background: #836ef1;  /* Theme accent color */
  transform: scale(1.5);
  box-shadow: 0 0 10px #836ef1;
}
```

### 2.4 Ensure UI Nodes Have isUI Flag

In `src/core/nodes/UI.js`, add explicit flag:

```javascript
export class UI extends Node {
  isUI = true  // Add this property
  // ... rest of class
}
```

---

## Files to Modify

1. `src/core/systems/ClientPointer.js` - Add mobile reticle raycasting
2. `src/core/systems/ClientActions.js` - Skip actions when over world UI
3. `src/client/components/CoreUI.js` - Add reticle visual feedback
4. `src/core/nodes/UI.js` - Add isUI flag (if not present)

---

## Test Plan

### Test 1: Mobile World UI Click
1. Create world-space UI with a button
2. On mobile, look at the button (reticle over it)
3. Verify reticle changes color
4. Press action button
5. Verify button onPointerDown fires
6. Release action button
7. Verify button onPointerUp fires

### Test 2: Action System Still Works
1. Place an Action node nearby
2. Look away from world UI, at the action
3. Press action button
4. Verify action triggers correctly

### Test 3: Priority Test
1. Place Action node directly behind world UI panel
2. Look at world UI panel
3. Press action button
4. Verify world UI gets click, NOT the action

### Test 4: Desktop Regression
1. Test desktop mouse interaction unchanged
2. Test pointer lock mode
3. Test screen UI interaction

---

## Success Criteria

- Mobile users can click buttons in world-space UI using action button + reticle
- Reticle provides visual feedback when over interactive world UI
- Action system still works when not looking at world UI
- World UI takes precedence over actions when both are in view
- Desktop behavior unchanged (no regression)
- Performance impact minimal (< 1ms per frame)

---

## Phase 1 Status: COMPLETE ✓

boltTradeTerminal changes:
- Starts hidden (`app.state.visible = false`)
- Toggle button always visible on right side, middle of screen
- Button says "📊 Trade" when hidden, "Hide" when visible
- Close button (X) on both list and trade views
- Keyboard toggle (semicolon key) still works
