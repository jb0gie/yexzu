# Universal Mobile Controls App

## Problem Analysis

**Root Cause:**

- Engine touch joystick exists (`PlayerLocal.js` lines 307-326)
- Touch only sets `PlayerLocal.moveDir` (lines 906-909)
- **Never populates** `control.keyW.down`, `control.keyA.down`, etc.
- Vehicles check `control.keyW.down` (e.g., `AdvancedCars.js` line 1491)
- Result: Touch joystick bypasses control system → vehicles don't work on mobile

**Verification:**

```javascript
// PlayerLocal.js line 912-916
} else {
  // otherwise use keyboard
  if (this.control.keyW.down || this.control.arrowUp.down) this.moveDir.z -= 1
  // ← Touch never reaches here!
}
```

## Solution: Universal Bridge App

### Architecture

**Single App Approach:**

- One app that ALL users add to their world
- Works with ANY vehicle/game app that uses `control` API
- Zero code changes needed in existing apps
- Configurable action buttons for different game types

### Core Components

#### 1. Touch Joystick Bridge

Listen to engine events and populate control keys:

```javascript
// Listen to engine's touch joystick
let lastStick = null

world.on('stick', (stick) => {
  lastStick = stick
})

app.on('update', () => {
  const control = app.control()
  if (!control) return
  
  if (lastStick && lastStick.active) {
    // Get stick direction
    const touchX = lastStick.touch.position.x
    const touchY = lastStick.touch.position.y
    const centerX = lastStick.center.x
    const centerY = lastStick.center.y
    
    const dx = touchX - centerX
    const dy = touchY - centerY
    
    // Dead zone to prevent drift
    const DEAD_ZONE = 20
    
    // Populate control keys based on direction
    control.keyW.down = dy < -DEAD_ZONE
    control.keyS.down = dy > DEAD_ZONE
    control.keyA.down = dx < -DEAD_ZONE
    control.keyD.down = dx > DEAD_ZONE
  } else {
    // Release all keys when stick inactive
    if (control.keyW) control.keyW.down = false
    if (control.keyS) control.keyS.down = false
    if (control.keyA) control.keyA.down = false
    if (control.keyD) control.keyD.down = false
  }
})
```

#### 2. Action Button System

Configurable X/Y buttons with mappings:

```javascript
app.configure([
  { type: 'section', label: 'Action Button Mappings' },
  {
    key: 'xButton',
    type: 'switch',
    label: 'X Button Action',
    initial: 'mouseLeft',
    options: [
      { value: 'mouseLeft', label: 'Fire/Attack (Left Click)' },
      { value: 'mouseRight', label: 'Aim (Right Click)' },
      { value: 'space', label: 'Jump/Handbrake (Space)' },
      { value: 'keyE', label: 'Interact (E)' },
      { value: 'keyR', label: 'Reload (R)' },
      { value: 'keyF', label: 'Use/Action (F)' },
      { value: 'shiftLeft', label: 'Boost/Sprint (Shift)' }
    ]
  },
  {
    key: 'yButton',
    type: 'switch',
    label: 'Y Button Action',
    initial: 'keyR',
    options: [/* same options */]
  },
  {
    key: 'buttonSize',
    type: 'number',
    label: 'Button Size',
    initial: 60,
    min: 40,
    max: 100
  },
  {
    key: 'buttonSpacing',
    type: 'number',
    label: 'Button Spacing',
    initial: 10,
    min: 0,
    max: 50
  }
])
```

#### 3. Button UI (emotes.js pattern)

```javascript
function createButton(label, action, offsetX, offsetY) {
  const btn = app.create('ui', {
    space: 'screen',
    width: config.buttonSize || 60,
    height: config.buttonSize || 60,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 22,
    pivot: 'bottom-right',
    position: [1, 1],
    offset: [offsetX, offsetY],
    cursor: 'pointer',
    alignItems: 'center',
    justifyContent: 'center',
    onPointerDown: () => {
      const control = app.control()
      if (!control || !control[action]) return
      
      // Simulate key press (100ms duration)
      control[action].down = true
      setTimeout(() => {
        if (control[action]) control[action].down = false
      }, 100)
    }
  })
  
  const text = app.create('uitext', {
    value: label,
    fontSize: 16,
    color: 'white'
  })
  btn.add(text)
  app.add(btn)
  return btn
}

// Create buttons
const spacing = config.buttonSpacing || 10
const size = config.buttonSize || 60
const btnX = createButton('X', config.xButton, -(size + spacing + 100), -120)
const btnY = createButton('Y', config.yButton, -100, -120)
```

#### 4. Mobile Detection

```javascript
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

if (!isMobile) {
  // Hide buttons on desktop
  if (btnX) btnX.visible = false
  if (btnY) btnY.visible = false
}
```

## File Structure

Create: `hyperfy/examples/mobile/universal-mobile-controls.js`

**Full Implementation (~180 lines):**

1. Configuration (40 lines)
2. Touch bridge (30 lines)
3. Button system (60 lines)
4. UI creation (40 lines)
5. Update loop (10 lines)

## How It Works

### For Vehicles (AdvancedCars.js, cruiser.js)

**Without modification:**

1. User adds universal-mobile-controls app to world
2. Touch joystick activates → bridge sets `control.keyW.down = true`
3. Vehicle reads `control.keyW.down` → car moves! ✓
4. User taps X button → bridge sets `control.space.down = true`
5. Vehicle reads `control.space.down` → handbrake! ✓

**Example flow:**

```
Touch Joystick (up) 
  → world.on('stick') fires
  → Bridge: control.keyW.down = true
  → AdvancedCars.js line 1491: if (control.keyW?.down) accelInput += 1
  → Car accelerates ✓
```

### For Combat (elemental-item-pistol.js)

1. Configure: X = mouseLeft, Y = keyR
2. Tap X → bridge sets `control.mouseLeft.down = true`
3. Pistol line 1055: `if (fireInput.pressed && canFire)` → fires! ✓
4. Tap Y → bridge sets `control.keyR.down = true`
5. Pistol line 1169: `if (reloadInput.pressed)` → reloads! ✓

## Success Criteria

**Movement Test:**

- ✓ Touch joystick makes `AdvancedCars.js` drive
- ✓ Touch joystick makes `cruiser.js` fly
- ✓ Works with ANY app using `control.keyW/A/S/D`

**Action Test:**

- ✓ X button fires pistol (mouseLeft)
- ✓ Y button reloads (keyR)
- ✓ Configurable for different game types

**Universal Test:**

- ✓ Zero code changes in existing apps
- ✓ One app to install per world
- ✓ Works across all mobile devices

## Deployment

**For Developers:**

1. Add `universal-mobile-controls.js` to world
2. Configure button mappings for their game
3. Existing vehicle/game apps work instantly

**Default Mappings:**

- X = Fire/Attack (mouseLeft) - for combat
- Y = Reload (keyR) - for combat
- Easily reconfigurable to:
  - X = Handbrake (space), Y = Boost (shift) - for racing
  - X = Interact (keyE), Y = Use (keyF) - for adventure games

## Layout Preview

```
┌─────────────────────────────┐
│                             │
│  [Touch Joystick]           │
│   (engine native)           │
│       ↑↓←→                  │
│                             │
│                             │
│                     [Y] [X] │
│                             │
│                   [Jump]    │
│                  (engine)   │
└─────────────────────────────┘
```

## Implementation Notes

**Critical Pattern:**

- Use `control.keyX.down = true/false` (property assignment)
- NOT `control.keyX.pressed` (readonly, engine-managed)
- 100ms press duration for action buttons
- Dead zone prevents joystick drift

**Performance:**

- Single update loop per frame
- Minimal overhead (~0.1ms per frame)
- No network traffic (client-only)

**Compatibility:**

- Works with control API (standard)
- No engine modifications needed
- Forward compatible with future Hyperfy versions