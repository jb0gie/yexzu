# Mobile Controls Testing Checklist

## Files Created/Modified

### Core Implementation
- ✅ `examples/mobile/universal-mobile-controls.js` - Main mobile control app (v2.0 with events)
- ✅ `examples/essentials/dash.js` - Updated with mobile event listener

### Templates & Examples
- ✅ `examples/mobile/mobile-app-template.js` - Event-based template for new apps
- ✅ `examples/mobile/mobile-dash-example.js` - Complete working example

### Documentation
- ✅ `examples/mobile/HYPERFY_MOBILE_CONTROL_STANDARD.md` - Official standard (v2.0)
- ✅ `examples/mobile/QUICK_START.md` - User/developer quick start guide
- ✅ `examples/mobile/IMPLEMENTATION_NOTES.md` - Technical implementation details
- ✅ `examples/mobile/ESTABLISHED_STANDARD.md` - Standard summary
- ✅ `examples/mobile/MOBILE_CONTROLS_COMPLETE.md` - Implementation summary
- ✅ `examples/mobile/TESTING_CHECKLIST.md` - This file

---

## Testing Steps

### 1. Load Mobile Controls
- [ ] Add `universal-mobile-controls.js` to world
- [ ] Configure: `{ "xButton": "mouseLeft", "yButton": "keyF" }`
- [ ] Verify console: `[UniversalMobileControls] Initializing`
- [ ] Verify console: `[UniversalMobileControls] Action buttons created`

### 2. Test dash.js
- [ ] Add `dash.js` to world
- [ ] Verify console: `[Dash] Captured keyF for mobile compatibility`
- [ ] Verify console: `[Dash] Listening for mobile button events`
- [ ] Press F key → Should dash
- [ ] Press mobile Y button → Should dash

### 3. Test elemental-item-pistol.js
- [ ] Add pistol to world
- [ ] Verify console: `[pistol] Captured fire button: mouseLeft`
- [ ] Verify console: `[pistol] Captured reload button: keyR`
- [ ] Press mouseLeft → Should fire
- [ ] Press mobile X button → Should fire
- [ ] Press keyR → Should reload
- [ ] Press mobile Y button (if mapped to keyR) → Should reload

### 4. Test Touch Joystick
- [ ] Touch joystick appears on mobile
- [ ] Move joystick → Player moves
- [ ] Drive vehicle with joystick
- [ ] Verify console shows stick events

### 5. Test Button Visibility
- [ ] Buttons visible on mobile
- [ ] Buttons positioned correctly (bottom-right)
- [ ] Buttons don't overlap other UI
- [ ] Labels show correctly

---

## Expected Console Output

### Mobile Controls Loading
```
[UniversalMobileControls] Initializing
[UniversalMobileControls] Ready - Touch joystick bridge and action buttons configured
[UniversalMobileControls] Creating action buttons
[UniversalMobileControls] Action buttons created
```

### Mobile Button Press
```
[UniversalMobileControls] Button pressed: keyF
```

### dash.js Loading
```
[Dash] Captured keyF for mobile compatibility
[Dash] Listening for mobile button events
```

### dash.js Mobile Trigger
```
[Dash] Mobile dash triggered!
```

### pistol.js Loading
```
[pistol] Captured fire button: mouseLeft
[pistol] Captured reload button: keyR
[pistol] Captured ADS button: mouseRight
```

### pistol.js Firing
```
[pistol] FIRE TRIGGERED - button: mouseLeft
```

---

## Troubleshooting

### Buttons Don't Appear?
- [ ] Check `showButtons: true` in config
- [ ] Verify `enabled: true` in config
- [ ] Check console for errors

### Buttons Don't Work?
- [ ] Verify app is loaded and configured
- [ ] Check buttons are captured: `control[button].capture = true`
- [ ] Verify event listener is set up: `world.on('mobileButton', ...)`
- [ ] Check console for button press events

### Joystick Doesn't Move Player?
- [ ] Verify `bridgeJoystick: true` in config
- [ ] Check `world.on('stick', ...)` is receiving events
- [ ] Verify control keys are being set: `control.keyW.down`

### Game Doesn't Respond?
- [ ] Verify game uses `control[button].pressed` OR listens to events
- [ ] Check button mapping matches game expectations
- [ ] Verify no control conflicts

---

## Test Configurations

### Test 1: Combat Setup
```json
{
  "xButton": "mouseLeft",
  "yButton": "keyR"
}
```
**Apps:** pistol.js, dash.js (if available)
**Expected:** X fires, Y reloads

### Test 2: Dash Setup
```json
{
  "xButton": "mouseLeft",
  "yButton": "keyF"
}
```
**Apps:** dash.js, pistol.js
**Expected:** X fires, Y dashes

### Test 3: Adventure Setup
```json
{
  "xButton": "keyE",
  "yButton": "keyF"
}
```
**Apps:** Any app with interact/use actions
**Expected:** X interacts, Y uses

---

## Success Criteria

- [ ] Touch joystick moves player
- [ ] Touch joystick drives vehicles
- [ ] Mobile X button triggers primary action (fire, jump, etc.)
- [ ] Mobile Y button triggers secondary action (reload, dash, etc.)
- [ ] No console errors
- [ ] Buttons positioned correctly
- [ ] Works on mobile device
- [ ] Backward compatible with keyboard

---

## Notes

- Mobile controls use BOTH event-based and control state patterns
- Event-based: `world.emit('mobileButton', { button, player })`
- Control state: Sets `control[button].pressed = true`
- Apps can use EITHER pattern or BOTH
- Touch joystick always bridges to control keys for maximum compatibility

---

## Next Steps After Testing

1. **Document any issues** found during testing
2. **Test with real mobile devices** (not just desktop emulation)
3. **Test multiple apps** together to ensure no conflicts
4. **Create custom configurations** for different game types
5. **Update more apps** to use event-based pattern
6. **Add more buttons** if needed (A, B, C, D)

---

**If all tests pass:** Mobile controls are working correctly! ✅
**If tests fail:** Check console output and troubleshooting section above.