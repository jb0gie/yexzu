# Simple Mobile Controls Pattern

## Overview

This is the **simple pattern** for adding mobile controls to Hyperfy apps. Each app creates **its own mobile button** directly, with no universal controls or complex signals needed.

## Core Principles

**Like emotes.js:** Each app owns its button
**Size:** 50x50 pixels (great crossplatform size)
**Position:** Top-right corner (avoiding native controls)

## Pattern

```javascript
app.configure([
  {
    key: 'showMobileButton',
    type: 'toggle',
    label: 'Show Mobile Button',
    initial: true
  },
  {
    key: 'actionKey',
    type: 'switch',
    label: 'Action Key',
    initial: 'keyF'
  }
])

if (world.isClient) {
  const control = app.control()
  const actionKey = config.actionKey || 'keyF'

  if (control?.[actionKey]) {
    control[actionKey].capture = true
  }

  if (config.showMobileButton) {
    const btn = app.create('ui', {
      space: 'screen',
      width: 50,
      height: 50,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: 25,
      pivot: 'top-right',
      position: [1, 0],
      offset: [-30, 100],
      cursor: 'pointer',
      onPointerDown: () => doAction(),
      alignItems: 'center',
      justifyContent: 'center',
    })
    const label = app.create('uitext', {
      value: 'ACTION',
      color: 'white',
      fontSize: 10,
      fontWeight: 'bold'
    })
    btn.add(label)
    app.add(btn)
  }

  app.on('update', delta => {
    if (control?.[actionKey]?.pressed) {
      doAction()
    }
  })
}

function doAction() {
  console.log('Action performed!')
}
```

## Positioning Strategy

**IMPORTANT: Avoid Native Mobile Controls**

**Native Hyperfy Controls:**
- **Left side**: Virtual joystick (movement)
- **Bottom-right**: Jump (A) + Action (B) buttons

**Your Buttons:**
- **Top-right corner only**
- Stack vertically to avoid overlaps
- 60px spacing between buttons

## Button Layout (Top-Right)

```
Y: 280   [ACTION - template]
Y: 220   [ADS - pistol]
Y: 160   [SHOOT - pistol]
Y: 100   [DASH - dash]
```

**Example Offsets:**
```javascript
// dash.js
offset: [-30, 100]

// pistol SHOOT
offset: [-30, 160]

// pistol ADS
offset: [-30, 220]

// template ACTION
offset: [-30, 280]
```

## Benefits

✅ **No universal controls needed**
✅ **No signal system**
✅ **No cross-app coordination**
✅ **Each app is independent**
✅ **Simple to implement**
✅ **Avoids native controls**
✅ **50x50 perfect size**

## Implementation Steps

### 1. Add Configuration
```javascript
app.configure([
  {
    key: 'showMobileButton',
    type: 'toggle',
    label: 'Show Mobile Button',
    initial: true
  }
])
```

### 2. Create Button (in world.isClient)
```javascript
if (config.showMobileButton) {
  const btn = app.create('ui', {
    space: 'screen',
    width: 50,
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',  // Native theme color
    borderRadius: 25,
    pivot: 'top-right',
    position: [1, 0],
    offset: [-30, 100],  // Adjust Y for your app
    cursor: 'pointer',
    onPointerDown: () => yourAction(),
    alignItems: 'center',
    justifyContent: 'center',
  })
  const label = app.create('uitext', {
    value: 'BUTTON',
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  })
  btn.add(label)
  app.add(btn)
}
```

### 3. Add Keyboard Support
```javascript
app.on('update', delta => {
  if (control?.[actionKey]?.pressed) {
    yourAction()
  }
})
```

## Examples

### Working Examples

**dash.js** (`examples/essentials/dash.js`)
- "DASH" button (native theme)
- Position: `[-30, 100]`
- Function: charge() + dash

**Pistol** (`examples/elementals/elemental-item-pistol.js`)
- "SHOOT" button: `[-30, 160]`
- "ADS" button: `[-30, 220]`
- Full weapon control on mobile

**Template** (`mobile-app-template.js`)
- "ACTION" button: `[-30, 280]`
- Copy this for new apps

## Template

Copy from: `examples/mobile/mobile-app-template.js`

## Test It

1. Add `dash.js` to a world
2. Add pistol to the world
3. Load on mobile device
4. Buttons appear in top-right corner (stacked vertically)
5. Tap buttons or use keyboard

## When to Use

Use this pattern when:
- ✅ App has a simple action (dash, shoot, interact)
- ✅ You want mobile support
- ✅ You want to avoid native controls
- ✅ You want simplicity

## When NOT to Use

Don't use this pattern when:
- ❌ App has many buttons (use native controls)
- ❌ You need bottom-side controls (jump, etc.)
- ❌ You want shared universal controls

## Summary

**Simple:** Each app adds its own button in top-right
**Pattern:** `app.create('ui', { onPointerDown: action })`
**Position:** Top-right corner, stacked vertically
**Size:** 50x50 pixels (perfect for mobile)
**Result:** Works immediately, no complexity