# Safe Keybindings for Hyperfy Apps

When creating apps with keyboard controls, avoid these keys that are used by Hyperfy's native controls:

## Reserved Keys (DO NOT USE)

### Movement & Actions
- **W, A, S, D** - Player movement (forward, left, back, right)
- **Q, E** - Strafe/lean (in some modes)
- **Space** - Jump
- **Shift** - Sprint/Run
- **Ctrl** - Crouch (if implemented)
- **F** - Interact
- **Tab** - Player list/scores
- **Esc** - Menu/escape

### Camera & View
- **Mouse movement** - Look around
- **Right-click** - ADS zoom (when enabled)
- **Scroll wheel** - Zoom (when enabled)

### Chat & UI
- **Enter** - Open chat
- **T** - Chat (alternate)
- **/** - Commands

### Building (when in build mode)
- **B** - Build mode toggle
- **G** - Grid snap
- **R** - Rotate
- **X, Y, Z** - Axis constraints

## Safe Keys for App Use

These keys are generally safe to use in your apps:

### Recommended for Effects/Settings
- **; : '** - Punctuation keys
- **[ ]** - Brackets
- **,** and **.** - Comma and period (good for prev/next)
- **K, L** - Middle keyboard letters
- **O, P** - Right side letters
- **I, U** - Upper row letters
- **N, M** - Lower row letters

### Number Keys
- **1-9, 0** - Generally safe for camera/mode switching

### Function Keys
- **F1-F12** - Usually safe but may be used by browser

## Example Safe Keybinding Pattern

```javascript
// Good example - using safe keys
app.on('keydown', (e) => {
  switch(e.key.toLowerCase()) {
    case ',': // Previous
    case '.': // Next  
    case ';': // Toggle effect 1
    case 'l': // Toggle effect 2
    case 'k': // Toggle effect 3
    case 'o': // Options/settings
    case 'p': // Pause/play
    case '[': // Decrease value
    case ']': // Increase value
  }
})
```

## Notes
- Always test your keybindings in-world to ensure no conflicts
- Consider using modifier keys (Ctrl+, Alt+) for advanced functions
- Provide a way to view controls in your app
- Allow users to customize keybindings when possible