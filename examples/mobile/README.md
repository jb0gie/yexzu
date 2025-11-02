# Mobile Controls App

A standalone mobile touch controls app for Hyperfy that extracts the hardcoded mobile UI from CoreUI.js into a configurable system.

## Features

- **Jump Button**: Primary action/touch button (maps to `touchA`)
- **Action Button**: Secondary action button (maps to `touchB`) - only shows when actions are available
- **ADS Toggle**: Toggle for right-click/aim-down-sights mode
- **Camera Cycle**: Cycle through camera views (Medium 3rd → Close 3rd → First Person → Far 3rd)
- **Platformer Buttons**: Specialized controls for platformer mechanics
  - **Climb**: Trigger climb mode (F key)
  - **Ledge**: Trigger ledge grab (G key)
  - **Dive**: Trigger air dive (L key)

## Configuration

The app provides the following configuration options:

- **Show Mobile Controls**: Toggle all mobile controls on/off
- **Show Platformer Buttons**: Toggle platformer-specific buttons
- **Show Camera Button**: Toggle camera cycling button
- **Show ADS Button**: Toggle ADS toggle button

## Usage

Add this app to your world to enable mobile touch controls on touch devices:

```javascript
{
  id: 'mobile-controls',
  src: 'examples/mobile/mobile-controls.js'
}
```

## Platform Integration

The mobile controls automatically integrate with:

- **Player Actions**: Shows action button when interactive objects are available
- **Platformer System**: Updates button states based on player's current platformer mode
- **Camera System**: Provides visual feedback for current camera mode
- **Touch Control System**: Uses `world.controls.setTouchBtn()` for proper touch integration

## Button Layout

```
┌─────────────────────────────────┐
│                                 │
│         CLIMB LEDGE DIVE         │  ← Platformer buttons (top right)
│                                 │
│           ACTION                │  ← Action button (appears when needed)
│             ADS                 │  ← ADS toggle button
│                                 │
│    CAMERA                       │  ← Camera cycle button (bottom center)
│                                 │
│                     JUMP        │  ← Jump button (bottom right)
└─────────────────────────────────┘
```

## Technical Details

- Uses Hyperfy's UI system for touch-friendly controls
- Integrates with `world.controls` for proper input handling
- Automatically detects touch devices via `isTouch` utility
- Handles pointer capture for reliable touch events
- Visual feedback through color changes for active states
- Respect safe area insets for modern mobile devices