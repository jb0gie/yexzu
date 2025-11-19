# Mobile Controls Examples - Simple Pattern

## Overview

This directory contains examples of the **simple mobile control pattern** for Hyperfy. Each app has **its own mobile button** directly in the app (like `emotes.js`).

## Key Files

### **mobile-app-template.js**
Copy this template to add mobile support to any app:
- Has its own mobile button
- Configurable position and style
- Works with keyboard AND mobile
- Simple pattern: `app.create('ui', { onPointerDown: action })`

### **SIMPLE_MOBILE_PATTERN.md**
Complete guide showing:
- How to add mobile buttons to any app
- Code examples
- Positioning tips (top-right corner!)
- Best practices

## Working Examples

### **dash.js** (`examples/essentials/dash.js`)
- "DASH" button (top-right, native theme)
- Position: `[-30, 100]`
- Works with keyboard (F) and mobile

### **Pistol** (`examples/elementals/elemental-item-pistol.js`)
- "SHOOT" button (top-right, native theme)
- "ADS" button (top-right, below shoot)
- Full pistol functionality on mobile

## How It Works

```javascript
if (config.showMobileButton) {
  const btn = app.create('ui', {
    space: 'screen',
    width: 50,
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',  // Native theme
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
```

## Positioning Strategy

**IMPORTANT: Avoid Native Mobile Controls**

**Native Hyperfy Controls:**
- **Left side**: Virtual joystick (movement)
- **Bottom-right**: Jump (A) + Action (B) buttons

**Your Buttons (Top-Right Corner):**
- Stack vertically with 60px spacing
- No overlap with native controls

**Button Layout:**
```
Y: 280   [ACTION - template]
Y: 220   [ADS - pistol]
Y: 160   [SHOOT - pistol]
Y: 100   [DASH - dash]
```

## Benefits

✅ **No universal controls needed**
✅ **No signal system**
✅ **Each app is independent**
✅ **Simple to implement**
✅ **50x50 perfect size**
✅ **Avoids native controls**

## When to Use

Use this pattern when:
- ✅ App has a simple action (dash, shoot, interact)
- ✅ You want mobile support
- ✅ You want to avoid native controls
- ✅ You want simplicity

## Documentation

- **SIMPLE_MOBILE_PATTERN.md** - Full implementation guide
- **TESTING_CHECKLIST.md** - How to test mobile controls
- **QUICK_START.md** - Quick start guide

## Test

1. Add `dash.js` to a world
2. Add pistol to the world
3. Load on mobile device
4. Buttons appear in **top-right corner** (stacked vertically)
5. Tap buttons or use keyboard (F for dash, mouse for pistol)

## Result

**Simple mobile controls that work immediately!** 🎯