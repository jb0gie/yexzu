# Mobile Controls Quick Start

## For Users

**Add to your world:**
```json
{
  "apps": [
    {
      "id": "mobile-controls",
      "src": "examples/mobile/universal-mobile-controls.js",
      "props": {
        "enabled": true,
        "bridgeJoystick": true,
        "xButton": "mouseLeft",
        "yButton": "keyR",
        "showButtons": true
      }
    }
  ]
}
```

**Configure per game type:**
- Combat: X = `mouseLeft` (fire), Y = `keyR` (reload)
- Racing: X = `space` (handbrake), Y = `shiftLeft` (boost)
- Adventure: X = `keyE` (interact), Y = `keyF` (use)
- Platformer: X = `space` (jump), Y = `keyC` (crouch)

---

## For Developers

### Option 1: Zero Changes (Auto-Compat)

If your app reads `control[button].pressed`, it **already works with mobile!**

```javascript
// Example - works with keyboard AND mobile
const control = app.control()
if (control.mouseLeft.pressed) {
  fireWeapon()
}
```

### Option 2: Copy Template

1. Copy `examples/mobile/mobile-app-template.js`
2. Rename it for your app
3. Override `onPrimaryAction()` and `onSecondaryAction()`

```javascript
onPrimaryAction() {
  fireWeapon()  // Called by keyboard OR mobile
}

onSecondaryAction() {
  reload()       // Called by keyboard OR mobile
}
```

### Option 3: Event-Based Integration (Recommended)

Add to your existing app to listen for mobile button events:

```javascript
if (world.isClient) {
  // Capture control buttons
  const control = app.control()
  if (control?.mouseLeft) control.mouseLeft.capture = true
  if (control?.keyF) control.keyF.capture = true

  // Listen for mobile button events
  world.on('mobileButton', (data) => {
    if (data.player !== world.getPlayer()) return

    if (data.button === 'mouseLeft') {
      fireWeapon()
    } else if (data.button === 'keyF') {
      dash()
    }
  })
}

app.on('update', () => {
  const control = app.control()
  if (control?.mouseLeft?.pressed) fireWeapon()
  if (control?.keyF?.pressed) dash()
})
```

---

## Button Mappings

### Available Controls

| Control Key | Description | Common Use |
|-------------|-------------|------------|
| `mouseLeft` | Left click | Fire, attack, confirm |
| `mouseRight` | Right click | Aim, secondary fire |
| `space` | Space bar | Jump, handbrake |
| `keyE` | E key | Interact, use |
| `keyR` | R key | Reload, rotate |
| `keyF` | F key | Action, pickup |
| `shiftLeft` | Shift | Boost, sprint |
| `keyQ` | Q key | Drop, secondary |

### Standard Defaults

| Button | Default | Use Case |
|--------|---------|----------|
| X | `mouseLeft` | Primary action |
| Y | `keyR` | Secondary action |

---

## How It Works

### Touch Joystick → Game Controls

```
Touch Input
  ↓
PlayerLocal.js:910 emits 'stick' event
  ↓
universal-mobile-controls.js receives event
  ↓
Sets control.keyW/A/S/D.down based on joystick position
  ↓
Game reads control.keyW.down
  ↓
Player moves! ✓
```

### Touch Buttons → Game Actions

```
Tap X Button
  ↓
Sets control.mouseLeft.pressed = true
  ↓
Game checks control.mouseLeft.pressed
  ↓
Weapon fires! ✓
```

---

## Example: Making dash.js Work on Mobile

The file `examples/essentials/dash.js` uses the F key to dash. To make it work on mobile:

**Step 1:** Update dash.js to listen for mobile button events:

```javascript
world.on('mobileButton', (data) => {
  if (data.player !== world.getPlayer()) return

  if (data.button === 'keyF') {
    this.dash()
  }
})
```

**Step 2:** Configure universal-mobile-controls.js to map Y button to 'keyF':

```json
{
  "xButton": "mouseLeft",
  "yButton": "keyF"
}
```

**Step 3:** Mobile Y button now triggers dash!

See `examples/mobile/mobile-dash-example.js` for a complete working example.

---

## Testing

### Test Checklist

- [ ] Touch joystick moves player
- [ ] Touch joystick drives vehicles
- [ ] X button triggers primary action
- [ ] Y button triggers secondary action
- [ ] Works on mobile device
- [ ] Works on desktop (optional)
- [ ] No console errors
- [ ] Buttons don't overlap other UI

### Debug Console

Look for these messages:
```
[UniversalMobileControls] Initializing
[UniversalMobileControls] Action buttons created
[UniversalMobileControls] Triggered: mouseLeft
```

---

## Troubleshooting

### Buttons Don't Work?

1. Check `universal-mobile-controls.js` is loaded
2. Check console for warnings
3. Verify app.config has `enabled: true`
4. Verify app.config has `showButtons: true`

### Joystick Doesn't Move?

1. Check `bridgeJoystick: true` in config
2. Adjust `deadZone` (try 30 if too sensitive)
3. Check console for stick events

### Game Doesn't Respond?

1. Verify game uses `control[button].pressed`
2. Check game has captured the button
3. Check for control conflicts

---

## Advanced

### Custom Mobile UI

Create mobile-specific UI:

```javascript
if (config.enableMobile) {
  const ui = app.create('ui', {
    space: 'screen',
    position: [0.5, 0.5],
    // Mobile-optimized design
  })
  app.add(ui)
}
```

### Custom Events

Emit custom events:

```javascript
app.emit('gameAction', {
  type: 'fire',
  player: world.getPlayer()
})
```

Listen for events:

```javascript
app.on('gameAction', (data) => {
  if (data.type === 'fire') {
    // Handle fire
  }
})
```

---

## Standard

**Document:** `examples/mobile/HYPERFY_MOBILE_CONTROL_STANDARD.md`
**Template:** `examples/mobile/mobile-app-template.js`
**Implementation:** `examples/mobile/universal-mobile-controls.js`

---

## Support

For issues or suggestions:
1. Check the standard document
2. Review the template
3. Test with simple app first
4. Add debug logging

---

**Goal:** Make every Hyperfy app work seamlessly on mobile devices!