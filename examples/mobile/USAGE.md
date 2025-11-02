# Using the Mobile Controls App

## Quick Start

1. **Add the Mobile Controls App** to your world's JSON configuration:

```json
{
  "apps": [
    {
      "id": "mobile-controls",
      "src": "examples/mobile/mobile-controls.js",
      "props": {
        "showControls": true,
        "showPlatformerButtons": true,
        "showCameraButton": true,
        "showADSButton": true
      }
    }
  ]
}
```

2. **The mobile controls will automatically:**
   - Detect touch devices and show only on mobile/tablet
   - Hide the hardcoded UI from CoreUI.js when active
   - Provide all the same functionality as the original hardcoded buttons

## What Changed

### Before (Hardcoded)
- Mobile UI was baked into CoreUI.js
- No configuration options
- Difficult to customize or disable

### After (App-based)
- Mobile UI is a standalone app
- Fully configurable through app props
- Can be enabled/disabled per world
- Easy to customize and extend

## App Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `showControls` | boolean | `true` | Show/hide all mobile controls |
| `showPlatformerButtons` | boolean | `true` | Show platformer-specific buttons (Climb, Ledge, Dive) |
| `showCameraButton` | boolean | `true` | Show camera cycling button |
| `showADSButton` | boolean | `true` | Show ADS toggle button |

## Button Functions

### Standard Controls
- **JUMP** (bottom right): Primary action/jump (maps to `touchA`)
- **ACTION** (appears when needed): Secondary action (maps to `touchB`)
- **ADS** (toggle button): Aim-down-sights toggle
- **CAMERA** (bottom center): Cycle through camera views

### Platformer Controls
- **CLIMB** (orange): Trigger climb movement (F key)
- **LEDGE** (red): Grab ledges (G key)
- **DIVE** (purple): Air dive maneuver (L key)

## Integration Notes

- The app automatically detects when platformer mechanics are active
- Button states update based on player's current platformer mode
- Uses the same `world.controls.setTouchBtn()` API as the original implementation
- Respects safe area insets for modern mobile devices

## Backward Compatibility

If you have worlds that rely on the old hardcoded UI, they will continue to work. The system detects if the mobile controls app is present and:

- ✅ **With mobile-controls app**: Uses the configurable app
- ✅ **Without mobile-controls app**: Falls back to original hardcoded UI

## Testing

To test the mobile controls:

1. Open your world on a touch device (or use browser dev tools to simulate touch)
2. Add the mobile-controls app to your world
3. The controls should appear in the corners/bottom of the screen
4. Try each button to verify functionality

## Customization

You can easily customize the mobile controls by:

1. Editing `examples/mobile/mobile-controls.js`
2. Modifying button positions, sizes, colors
3. Adding new buttons or functionality
4. Changing the layout to suit your needs