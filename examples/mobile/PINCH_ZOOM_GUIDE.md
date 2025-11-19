# Pinch-to-Zoom Camera Control Guide

## How It Works

Pinch-to-zoom camera control simulates **mouse wheel scrolling** to zoom the camera in and out, just like Roblox mobile!

## Pinch Zones

### Active Zone (Center 30% of Screen)
```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────────┐ │  ← Pinch here to zoom!
│  │  🖐️ PINCH ZONE (ACTIVE)    │ │
│  │  Two fingers = Camera Zoom  │ │
│  │                             │ │
│  │  Pinch OUT = Zoom Out       │ │
│  │  (wider distance)           │ │
│  │                             │ │
│  │  Pinch IN = Zoom In         │ │
│  │  (closer distance)          │ │
│  └─────────────────────────────┘ │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

### Inactive Zones (Edge 70% of Screen)
```
┌─────────────────────────────────┐
│  ██████████████████████████████ │  ← Pinch ignored here
│  ██████████████████████████████ │  (too close to edge)
│  ██████████████████████████████ │
│  ██████████████████████████████ │
│  ██████████████████████████████ │
│  ██████████████████████████████ │
│  ██████████████████████████████ │
│  ██████████████████████████████ │
│  ██████████████████████████████ │
│                                 │
└─────────────────────────────────┘
```

## Zoom Levels

```
ZOOM OUT (3rd Person)    ← Pinch OUT (wider)
        ↓
        ↓
        ↓
┌─────────────────────────────────┐
│   👤         ← Far from player  │
│      ◯       ← Wide camera view │
│                                 │
│                                 │
│                                 │
│                      🎯         │
│                                 │
└─────────────────────────────────┘

        ↓
        ↓
        ↓
ZOOM IN (1st Person)     ← Pinch IN (closer)
```

## How to Use

### On Mobile:

1. **Find the pinch zone** - Middle 30% of your screen
2. **Place two fingers** in the center zone
3. **Pinch OUT** (move fingers apart) to zoom OUT
   - Camera moves further from player
   - Better for navigation and situational awareness
4. **Pinch IN** (move fingers together) to zoom IN
   - Camera moves closer to player
   - Better for aiming and precision
5. **Pinch all the way IN** for first-person view!
   - Like looking through the player's eyes

### On Desktop (Testing):

Hold **Ctrl** (or **Cmd** on Mac) + **scroll wheel** to simulate pinch-zoom

## Visual Feedback

When you start pinching, you'll see:

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│       ┌─────────────────┐       │
│       │  🖐️ Pinch to    │       │
│       │      Zoom       │       │
│       └─────────────────┘       │
│                                 │
│                                 │
└─────────────────────────────────┘
```

Then when zoom completes:

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│       ┌─────────────────┐       │
│       │   ✓ Zoom        │       │
│       │   Applied       │       │
│       └─────────────────┘       │
│                                 │
└─────────────────────────────────┘
```

## Technical Details

### Detection Logic
```javascript
// Check if pinch is in center zone
const centerX = window.innerWidth / 2
const centerY = window.innerHeight / 2
const zoneRadius = min(width, height) * 0.3  // 30% of screen

if (distanceFromCenter < zoneRadius) {
  // Activate pinch-zoom
} else {
  // Ignore pinch (let system handle it)
}
```

### Zoom Simulation
```javascript
// Pinch delta → Mouse wheel delta
const wheelDelta = -pinchDelta * zoomSpeed
control.mouseWheel.value = wheelDelta
```

## Configuration Options

### Enable/Disable
```
Enable Pinch Zoom: true/false
```

### Sensitivity
```
Min Pinch Distance: 50
  - Lower = More sensitive
  - Higher = Less sensitive (requires bigger pinch)

Zoom Speed: 0.5
  - 0.1 = Very slow zoom
  - 1.0 = Very fast zoom
  - 0.5 = Default (recommended)
```

### UI Feedback
```
Show Instructions: true/false
  - true = Show "🖐️ Pinch to Zoom" overlay
  - false = Silent operation
```

## Troubleshooting

### Pinch Not Working

1. **Check zone**
   - Make sure you're pinching in the **center 30%** of screen
   - Pinching near edges is ignored

2. **Check distance**
   - Pinch must move at least 50px (configurable)
   - Small pinches won't trigger zoom

3. **Check logs**
   - Open console, look for `[MobileCamera]` messages
   - Should see "Pinch started" when pinching

### Zoom Too Fast/Slow

1. **Adjust Zoom Speed**
   - Too fast? Lower to 0.3
   - Too slow? Raise to 0.7

2. **Adjust Min Distance**
   - Too sensitive? Raise to 100
   - Not sensitive enough? Lower to 30

### Camera Not Moving

1. **Check wheel support**
   - Some elements may not respond to mouse wheel
   - Test with Ctrl+scroll on desktop first

2. **Check camera system**
   - Verify the camera supports zoom/mouse wheel
   - Different camera mods may have different controls

## Use Cases

### Pistol Aiming
```
1. Equip pistol (hold X or configured key)
2. Pinch IN to zoom to first-person
3. Fire (tap X when equipped)
4. Pinch OUT to return to third-person
```

### Navigation
```
1. Pinch OUT for wide view
2. Move around with joystick
3. Pinch IN when you need precision
```

### Sword Combat
```
1. Pinch OUT for situational awareness
2. Attack (tap X when equipped)
3. Pinch IN quickly for precision strikes
```

## Benefits

✅ **Seamless** - No buttons needed for camera
✅ **Intuitive** - Works like every other mobile game
✅ **Fast** - Quick zoom in/out with pinch
✅ **Space-efficient** - No UI clutter
✅ **Standard** - Like Roblox, most mobile games
✅ **Configurable** - Adjust sensitivity and speed
✅ **Visual feedback** - Clear instructions overlay

## Comparison to Alternatives

### Button-Based Camera Control ❌
```
[+] Easy to implement
[-] Takes up screen space
[-] Requires finding buttons
[-] Not standard for mobile
[-] Clutters UI
```

### Pinch-to-Zoom ✅
```
[+] Standard mobile interaction
[+] No screen space used
[+] Intuitive for all users
[+] Professional feel
[-] Requires center zone (but this prevents accidental zoom)
```

## Best Practices

1. **Use the center zone** - Don't pinch near edges
2. **Smooth movements** - Jerky pinches = jerky zoom
3. **Practice** - Gets easier with use
4. **Adjust to taste** - Tune zoom speed for your preference
5. **Combine with buttons** - Use pinch + elemental buttons together

## Pro Tips

🎯 **Quick zoom**: Pinch all the way in for instant first-person
🎯 **Precision aiming**: Pinch to first-person, fire, pinch out
🎯 **Navigation**: Stay zoomed out when moving, zoom in when aiming
🎯 **Desktop testing**: Use Ctrl+scroll to test without mobile device
🎯 **Customize**: Adjust min distance and zoom speed to your preference

---

**Remember**: The pinch zone is your friend! Keep those two fingers in the center 30% of the screen for best results. 🖐️