# Hyperfy App Development Patterns - Verified Reference

> **Based on code analysis of working examples in /examples/web3/ and /examples/essentials/**

## Critical Finding: App Format

### ✅ CORRECT FORMAT (Used in all working examples)
```javascript
// Direct code at top level - NO wrapper
app.configure([
  {
    key: 'buttonText',
    type: 'text',
    label: 'Button Text',
    initial: 'Connect',
  }
])

// Create and reference entities
cartridgeBody = app.get('CartridgeLogo')
const statusUI = app.create('ui', {
  space: 'screen',
  position: [0.89, 0.1, 0],
})

// Event handling
app.on('update', () => {
  // Update logic
})
```

### ❌ INCORRECT FORMAT (Not used in examples)
```javascript
// The ({...}) wrapper pattern is NOT used in working examples
({
  init() {
    // This format is not present in actual examples
  }
})
```

## Core Architecture

### Global Variables Available
- `app` - Main app instance for managing your application
- `world` - World state and interactions
- `config`/`props` - Configuration values from `app.configure()`
- `THREE` - Three.js library (if needed)
- `Vector3`, `Quaternion`, etc. - Math utilities

### App Structure Pattern
```javascript
// 1. Configuration
app.configure([
  { key: 'setting1', type: 'text', label: 'Setting', initial: 'value' }
])

// 2. State initialization (optional)
app.state.connected = false
app.state.address = null

// 3. Get existing nodes from GLB
const body = app.get('NodeName')  // Use Blender object name

// 4. Create new nodes
const ui = app.create('ui', { space: 'screen' })
const text = app.create('uitext', { value: 'Hello' })

// 5. Assemble hierarchy
ui.add(text)
body.add(ui)

// 6. Event handling
app.on('update', (delta) => {
  // Per-frame updates
})
```

## Configuration System

### Field Types
```javascript
app.configure([
  // Text input
  {
    key: 'title',
    type: 'text',
    label: 'Title',
    initial: 'Default Title'
  },

  // Number input
  {
    key: 'distance',
    type: 'number',
    label: 'Distance',
    min: 0.5,
    max: 20,
    dp: 1,  // decimal places
    initial: 3
  },

  // Switch/Dropdown
  {
    key: 'theme',
    type: 'switch',
    label: 'Theme',
    options: [
      { label: 'Dark', value: 'dark' },
      { label: 'Light', value: 'light' }
    ],
    initial: 'dark'
  },

  // File upload
  {
    key: 'logo',
    type: 'file',
    kind: 'texture',  // texture, audio, model, emote, hdr
    label: 'Logo'
  },

  // Color picker
  {
    key: 'color',
    type: 'color',
    label: 'Color',
    initial: '#ff0000'
  },

  // Section header
  {
    type: 'section',
    key: 'appearance',
    label: 'Appearance Settings'
  }
])
```

### Accessing Config Values
```javascript
// Use config global or app.config
const title = config.title || 'Default'
const distance = config.distance || 3
const logoUrl = config.logo?.url  // Optional chaining for files
```

## Node Operations

### Getting Nodes from GLB Model
```javascript
// Get by Blender object name (case-sensitive, spaces removed)
const body = app.get('CartridgeLogo')
const trigger = app.get('AreaTrigger')
const mesh = app.get('Sword')

// Always check if node exists
if (!body) {
  console.log('CartridgeLogo not found')
  // Fallback to app as attachment point
  body = app
}
```

### Creating New Nodes
```javascript
// UI Container
const ui = app.create('ui', {
  space: 'screen',  // or 'world'
  position: [0.5, 0.1, 0],  // [x, y, z] - screen space uses 0-1 normalized
  width: 250,
  height: 200,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  borderRadius: 12,
  padding: 16
})

// UI Text
const text = app.create('uitext', {
  value: 'Connected',
  color: '#10b981',
  fontSize: 14,
  fontWeight: 'bold',
  textAlign: 'center'
})

// UI Panel/View
const panel = app.create('uiview', {
  width: 200,
  height: 50,
  backgroundColor: '#333',
  borderRadius: 8,
  justifyContent: 'center',
  alignItems: 'center'
})

// Image
const image = app.create('uiimage', {
  src: config.logo?.url,
  width: 24,
  height: 24,
  objectFit: 'contain'
})

// Action (interactive button)
const action = app.create('action', {
  label: 'Connect Wallet',
  distance: 4,  // Activation distance in meters
  duration: 0.3,  // Hold duration in seconds
  position: [0, 1, 0]
})

// Audio
const audio = app.create('audio', {
  src: config.sound?.url,
  loop: true,
  volume: 0.8
})
```

### Node Hierarchy
```javascript
// Add child to parent
ui.add(text)
body.add(ui)

// Remove node
app.remove(oldNode)

// Attach to world (maintains world transform)
world.attach(barGroup)
```

## Event Handling

### App Events
```javascript
// Update loop (called every frame)
app.on('update', (delta) => {
  // delta = time since last frame in seconds
  updateStamina(delta)
})

// Config changed
app.on('config', () => {
  // React to configuration changes
  updateButtonColor()
})

// Custom events
app.on('cartridgeConnected', (data) => {
  console.log('Connected:', data.address)
})

// Emit events to other apps
app.emit('customEvent', { data: value })
```

### Node Events
```javascript
// Pointer interaction
button.onPointerDown = () => {
  button.color = '#ffffff'
}

button.onPointerUp = () => {
  button.color = '#00ffaa'
  performAction()
}

button.onPointerOver = () => {
  button.backgroundColor = 'rgba(0, 30, 60, 0.8)'
}

button.onPointerOut = () => {
  button.backgroundColor = 'rgba(0, 15, 30, 0.8)'
}

// Trigger events
action.onTrigger = () => {
  connectWallet()
}
```

### Keyboard Input
```javascript
// Get control handle
const control = app.control()
if (!control) return  // Always check

// Capture specific keys
control.keyQ.capture = true
control.keyE.capture = true

// Track key state
let qPressed = false

app.on('update', () => {
  if (control.keyQ.pressed && !qPressed) {
    // Q key pressed
    toggleUI()
  }
  qPressed = control.keyQ.pressed
})
```

### World Events
```javascript
// Player events
world.on('enter', (player) => {
  console.log(`${player.name} joined`)
})

world.on('leave', (player) => {
  console.log(`${player.name} left`)
})

world.on('chat', (message) => {
  console.log(`${message.from}: ${message.text}`)
})
```

## UI Styling

### UI Container Properties
```javascript
const ui = app.create('ui', {
  width: 300,
  height: 200,
  backgroundColor: 'rgba(0, 15, 30, 0.8)',
  borderRadius: 20,
  padding: 15,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.2)',

  // Layout
  flexDirection: 'column',  // or 'row'
  justifyContent: 'center',  // 'flex-start', 'flex-end', 'center'
  alignItems: 'center',      // 'stretch', 'flex-start', 'flex-end', 'center'
  gap: 10,  // Spacing between children

  // Positioning
  pivot: 'center',  // 'top-left', 'top-center', 'top-right', etc.
  billboard: 'full',  // 'null', 'full', 'y-axis'
  space: 'screen',   // 'screen' or 'world'

  // Transform
  position: [0.5, 0.1, 0],  // [x, y, z]
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  size: 0.01  // Pixel to meter conversion
})
```

### Text Properties
```javascript
const text = app.create('uitext', {
  value: 'Hello World',
  color: '#00ffaa',
  fontSize: 18,
  fontWeight: 'bold',  // or number: 400, 700, etc.
  lineHeight: 1.4,
  textAlign: 'center',  // 'left', 'center', 'right'
  fontFamily: 'Rubik',

  // Box model
  padding: 8,
  margin: 4,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  borderRadius: 6
})
```

### View/Panel Properties
```javascript
const panel = app.create('uiview', {
  width: 200,
  height: 100,
  backgroundColor: '#333',
  borderRadius: 10,
  padding: 12,
  margin: 8,

  // Flexbox
  flexDirection: 'column',
  justifyContent: 'space-between',
  alignItems: 'stretch',
  gap: 8,

  // Border
  borderWidth: 1,
  borderColor: '#555',

  // Visibility
  display: 'flex'  // or 'none'
})
```

## Client-Server Communication

### Sending Messages
```javascript
// Client to server
if (world.isClient) {
  action.onTrigger = () => {
    app.send('moveCube', { direction: 'up' })
  }
}

// Server to all clients
if (world.isServer) {
  app.on('moveCube', (data, senderId) => {
    // Update state
    cube.position.y += 1

    // Broadcast to all clients
    app.send('cubeMoved', {
      position: cube.position.toArray(),
      player: senderId
    })
  })
}

// Server to specific client
if (world.isServer) {
  app.sendTo(playerId, 'privateMessage', { data })
}
```

### Receiving Messages
```javascript
// Client receives from server
if (world.isClient) {
  app.on('cubeMoved', (data) => {
    cube.position.fromArray(data.position)
    console.log(`Moved by ${data.player}`)
  })
}
```

### State Synchronization
```javascript
// Server initializes state
if (world.isServer) {
  app.state = {
    connected: false,
    score: 0,
    position: [0, 1, 0]
  }
}

// Client uses state
if (world.isClient) {
  // State is automatically synchronized on connect
  if (app.state.connected) {
    initializeConnectedUI()
  }
}
```

## State Management

### App State
```javascript
// Initialize state
app.state.connected = false
app.state.address = null
app.state.balance = '0'

// Update state
app.state.connected = true
app.state.balance = newBalance

// State is automatically synced from server to clients
```

### Client-Only State
```javascript
// For state that doesn't need server sync
let uiVisible = true
let lastUpdate = 0
let animationTime = 0

app.on('update', (delta) => {
  animationTime += delta
})
```

## Networking

### Fetch API
```javascript
async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data')
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Fetch failed:', error)
    return null
  }
}

async function postData(payload) {
  try {
    const response = await fetch('https://api.example.com/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('POST failed:', error)
    return null
  }
}
```

## Common Patterns

### Toggle Pattern
```javascript
let isVisible = true

function toggle() {
  isVisible = !isVisible
  ui.active = isVisible
}

toggleButton.onPointerDown = toggle
```

### Hotkey Pattern
```javascript
const control = app.control()
if (control) {
  control.keyT.capture = true
  let tPressed = false

  app.on('update', () => {
    if (control.keyT.pressed && !tPressed) {
      toggle()
    }
    tPressed = control.keyT.pressed
  })
}
```

### Conditional Rendering
```javascript
app.on('update', () => {
  // Show/hide based on conditions
  ui.active = isPlayerNearby && config.showUI

  // Update positions
  if (config.uiSpace === 'world') {
    ui.space = 'world'
    ui.position.set(2, 1.5, 1)
    ui.billboard = 'full'
  }
})
```

### Error Handling
```javascript
async function connect() {
  try {
    statusText.value = 'Connecting...'
    statusText.color = '#f59e0b'

    const result = await world.web3.connect()

    if (result && result.address) {
      app.state.connected = true
      statusText.value = 'Connected'
      statusText.color = '#10b981'
    }
  } catch (error) {
    console.error('Connection failed:', error)
    statusText.value = 'Connection failed'
    statusText.color = '#ef4444'

    // Reset after delay
    setTimeout(() => {
      statusText.value = 'Ready to connect'
      statusText.color = '#cccccc'
    }, 3000)
  }
}
```

## Critical Documentation Conflict Alert

**IMPORTANT**: There is a conflict between cursor rules documentation and actual working examples:

- **Documentation** suggests using `({...})` wrapper pattern
- **Working examples** use direct top-level code WITHOUT wrapper

The examples in `/examples/web3/` and `/examples/essentials/` all use the direct code pattern shown in this document. The wrapper pattern appears to be outdated or incorrect documentation.

### SES Environment Restrictions

From verified examples, the following restrictions apply:

### ❌ NOT Allowed
- `import`/`export` statements (throws SES errors)
- `eval()` or `new Function()`
- Browser-specific APIs not provided by Hyperfy
- Direct DOM manipulation
- The `({...})` wrapper pattern (causes syntax issues)

### ✅ Allowed
- All standard JavaScript (ES6+ features work)
- Global APIs: `app`, `world`, `config`, `THREE`, etc.
- `fetch()` for HTTP requests
- `console.log()` for debugging (preferred over `world.chat()`)
- All Hyperfy node types and methods
- Direct top-level code execution

## UI Limitations (from cursor rules)

### Confirmed UI Restrictions
1. **No responsive sizing** - Must use explicit pixel values
2. **No CSS animations** - Manual updates only
3. **No relative positioning** - Fixed values only
4. **No 3D transformations** - Limited to 2D transforms
5. **No advanced CSS features** - Gradients, filters, blend modes not supported
6. **No z-index control** - Cannot manage overlapping
7. **No touch gestures** - Limited touch support
8. **Fixed width/height** - Cannot use auto or percentages

### UI Workaround Example
```javascript
// For responsive-like behavior, calculate manually
const control = app.control()
const ui = app.create('ui', {
  space: 'screen',
  width: control.screenWidth * 0.3,  // 30% of screen
  height: control.screenHeight * 0.2, // 20% of screen
  position: [0, 1, 0],
  pivot: 'top-left'
})
```

## Critical API Issues

### 1. world.chat() is BROKEN
**DO NOT USE**: `world.chat()` causes crashes due to Apps.js conversion bug

```javascript
// ❌ AVOID - This will crash
world.chat('message', true)

// ✅ USE - Direct console.log instead
console.log('📡 Your message here')
```

**Error**: `Cannot create property 'id' on string` at `Apps.js:159`

### 2. 3D Position Access Can Fail
Node position access can throw errors - always use try-catch:

```javascript
// ✅ Safe pattern
let position = [0, 1, 0]
try {
  position = node.position.toArray()
} catch (e) {
  console.warn('Position access failed, using default')
}
```

### 3. Keyboard Events DO NOT Work
Standard keyboard events are not forwarded to apps. Always use `app.control()`:

```javascript
// ❌ WRONG - Won't work
app.on('keydown', (event) => { /* won't work */ })

// ✅ CORRECT - Use control API
const control = app.control()
if (!control) return
control.keyW.capture = true
if (control.keyW.pressed) {
  // Handle input
}
```

## Debugging Tips

1. **Use console.log()** - The most reliable debugging method
   ```javascript
   console.log('[MyApp] State:', app.state)
   console.log('[MyApp] Config:', config)
   ```

2. **Check browser console** - Most Hyperfy errors appear here

3. **Guard against missing nodes**
   ```javascript
   const body = app.get('NodeName')
   if (!body) {
     console.warn('NodeName not found, using app')
     return
   }
   ```

4. **Test on client first** - Most features need `if (world.isClient)` check

5. **Use try-catch for async operations**
   ```javascript
   try {
     await fetchData()
   } catch (error) {
     console.error('Failed:', error.message)
   }
   ```

## Summary of Critical Facts

Based on code analysis of actual working Hyperfy apps:

1. **App Format**: Direct top-level code (NO wrapper pattern)
2. **Globals**: `app`, `world`, `config` automatically available
3. **Configuration**: Use `app.configure()` with field arrays
4. **Node Access**: `app.get('BlenderName')` for GLB nodes
5. **Node Creation**: `app.create('type', options)` for new nodes
6. **Event Handling**: `app.on('update', callback)` for loops
7. **Input**: `app.control()` required for keyboard input
8. **Client Check**: `if (world.isClient)` for client-only code
9. **Chat API**: BROKEN - use `console.log()` instead
10. **Position Access**: Can fail - use try-catch

**Always reference actual examples in `/examples/web3/` and `/examples/essentials/` for correct patterns.**

## Migration from Incorrect Documentation

If you have code using the `({...})` wrapper pattern:

1. **Remove the wrapper** - Delete `({` at start and `})` at end
2. **Update method calls** - Change `this.app` to `app`, `this.world` to `world`
3. **Move lifecycle methods** - Convert `init()` to top-level code
4. **Update state access** - Use `app.state` instead of `this.state`

### Before (Incorrect Pattern)
```javascript
({
  init() {
    this.app.configure([...])
    this.ui = this.app.create('ui')
  },

  update(delta) {
    // update code
  }
})
```

### After (Correct Pattern)
```javascript
app.configure([...])
const ui = app.create('ui')

app.on('update', (delta) => {
  // update code
})
```

## Summary

All working Hyperfy apps follow these patterns:

1. **Direct code** at top level (no wrapper)
2. **Global variables** (`app`, `world`, `config`) are available automatically
3. **Configuration** via `app.configure()` with field arrays
4. **Node access** via `app.get('BlenderName')`
5. **Node creation** via `app.create('type', options)`
6. **Events** via `app.on('event', callback)`
7. **UI** via `app.create('ui')` with flexbox properties
8. **Client check** with `if (world.isClient)` for client-only features

This document is based on actual working examples in `/home/blank/hyperfy/examples/web3/` and `/home/blank/hyperfy/examples/essentials/`.