# CLAUDE.md

This file provides technical caveats and gotchas for working with the Hyperfy codebase.

## Core Development Commands

```bash
# Development mode with hot reload
npm run dev

# Production build and start
npm run build
npm start

# Run linting
npm run lint

# Run formatting
npm run format
```

## WebView Technical Caveats

**Critical Discovery**: CSS3D iframes in Three.js do NOT follow normal CSS pointer-events rules.

### How CSS3D iframe Interaction Works

**Normal CSS behavior (DOES NOT apply to CSS3D):**
- Parent `pointer-events: none` → blocks all children
- This is how the DOM normally works

**CSS3D behavior (what actually happens):**
- CSS3DRenderer creates special compositing layers
- iframes in CSS3D BYPASS normal DOM parent-child pointer-events rules
- Parent `pointer-events: none` does NOT block iframe in CSS3D context
- **Only iframe's own pointer-events setting matters**

### Implementation Details

**Agentic-hyperfy toggle approach (working pattern):**
```javascript
// Set parents to none (doesn't block iframe in CSS3D!)
container.style.pointerEvents = 'none'
inner.style.pointerEvents = 'none'

// Toggle ONLY iframe (this controls interaction)
mouseenter → iframe.style.pointerEvents = 'auto'   // ENABLE
mouseleave → iframe.style.pointerEvents = 'none'   // DISABLE

// Mobile: always 'auto' (no pointer lock on mobile)
if (!isDesktop) {
  iframe.style.pointerEvents = 'auto'
}
```

**Canvas pointer-events must also toggle:**
- WebGL canvas renders at z-index:1, CSS3D at z-index:0
- Canvas with `pointer-events: auto` blocks iframe clicks
- Solution: Set canvas to `pointer-events: none` when over WebViews
- Restore to `auto` when not over WebViews

### Usage Requirements

- **Desktop**: Requires `pointerEvents: true` AND pointer unlock (click) before interaction
- **Mobile**: Requires `pointerEvents: true` only (direct touch works)
- **All modes**: Must set `pointerEvents: true` on WebView node

### Performance Notes

- Limit to ~10-20 webviews per scene
- Complex pages reduce FPS
- Mobile may throttle background iframes

## WebView Geometry Support

**Feature**: WebView nodes now support custom geometry like Video nodes

### New Properties

**geometry** - Custom THREE.Geometry for the WebView mesh
- Type: `THREE.Geometry` or `null`
- Default: `null` (uses PlaneGeometry)
- Use custom geometry to place WebViews on any mesh surface

**width** - Width of the WebView when using default PlaneGeometry
- Type: `Number`
- Default: `1`

**height** - Height of the WebView when using default PlaneGeometry
- Type: `Number`
- Default: `1`

**pivot** - Pivot point for positioning geometry
- Type: `String`
- Default: `'center'`
- Options: `'center'`, `'top-left'`, `'top-center'`, `'top-right'`, `'center-left'`, `'center-right'`, `'bottom-left'`, `'bottom-center'`, `'bottom-right'`

### Usage Examples

**Using custom geometry (like Video nodes):**
```javascript
const sphere = new THREE.SphereGeometry(2, 32, 16);
const webview = world.createNode('webview', {
  src: 'https://example.com',
  geometry: sphere
});
```

**Using default plane geometry with sizing:**
```javascript
const webview = world.createNode('webview', {
  src: 'https://example.com',
  width: 3,
  height: 2,
  pivot: 'top-left'
});
```

**Dynamic updates:**
```javascript
webview.width = 4;  // Rebuilds with new width
webview.pivot = 'bottom-center';  // Rebuilds with new pivot
webview.geometry = customMesh;  // Rebuilds with custom geometry
```

### Implementation Details

**buildWorld() method changes:**
- Checks for `this._geometry` first, uses it if available
- Falls back to `THREE.PlaneGeometry(this._width, this._height)`
- Applies pivot transformation using `applyPivot()` function
- Maintains full compatibility with existing WebView functionality

**Similar to Video node:**
- Uses same pattern as Video.js geometry handling
- Custom shader materials can be applied via material property
- UV coordinates work the same as Video nodes for texture mapping

### Technical Notes

**CSS3D Layer Positioning:**
- The CSS3D iframe follows the mesh geometry's world transform
- iframe dimensions are calculated from geometry bounding box
- `factor` property scales pixel dimensions for CSS3D rendering

**Performance Considerations:**
- Custom geometry increases build time (regenerates CSS3D object)
- Complex geometries work but may impact collision detection
- Pivot calculations add minimal overhead during build

**Raycasting Support:**
- Custom geometry maintains full raycasting capabilities
- Octree insertion uses custom geometry bounds
- Mouse events work on custom shapes as expected

## Web3 Wallet Connection Patterns

**Standardized patterns for wallet connection apps**

### API Usage

**EVM Wallets (MetaMask, etc.) use `world.evm`:**
- `world.evm.connect()` - Returns `{ success: boolean, address?: string, reason?: string }`
- `world.evm.disconnect()` - Returns `{ success: boolean, reason?: string }`
- Check `result.success` before using `result.address`

**Cartridge (StarkNet) uses `world.web3`:**
- `world.web3.connect()` - Returns `{ address: string }` or throws
- `world.web3.disconnect()` - Returns void or throws
- Different error handling pattern (see cartridge.js)

### State Management Pattern

**Always use `app.state` for connection state:**
```javascript
app.state.connected = false
app.state.address = null
```

**Avoid local variables** - Other systems may need to inspect connection state

### UI Pattern

**Minimal status UI attached to entity:**
```javascript
const statusUI = app.create('ui', {
  space: 'screen',
  position: [0.89, 0.1, 0],  // Top-right corner
  width: 150,
  height: 40,
  backgroundColor: 'rgba(0, 0, 0, 0.8)'
})
const statusText = app.create('uitext', {
  value: '🌐 Disconnected',
  color: '#cccccc',
  fontSize: 14
})
statusUI.add(statusText)
entity.add(statusUI)  // Attach to world entity, not app
```

### Action System (Primary Interaction)

**Use `app.create('action')` instead of clickable UI:**
```javascript
const connectAction = app.create('action', {
  label: app.state.connected ? 'Disconnect Wallet' : 'Connect Wallet',
  distance: 4,      // Interaction distance in meters
  duration: 0.3,    // Hold duration in seconds
  onTrigger: () => {
    if (app.state.connected) {
      disconnectWallet()
    } else {
      connectWallet()
    }
  }
})
entity.add(connectAction)
```

**Benefits:**
- Consistent with Hyperfy interaction patterns
- Works across desktop and VR
- Automatic visual feedback (E key prompt)

### Trigger Zone Pattern

**Optional: Show UI/action only when nearby:**
```javascript
// Configure with app.configure()
app.configure([{
  key: 'triggerZone',
  type: 'switch',
  options: [{ label: 'Enabled', value: 'enabled' },
            { label: 'Disabled', value: 'disabled' }],
  initial: 'enabled'
}])

// Implementation in app code
if (triggerBody && app.props.triggerZone === 'enabled') {
  triggerBody.onTriggerEnter = (e) => {
    if (e.playerId === world.getPlayer()?.id) {
      isPlayerNearby = true
      connectAction.active = true  // Show action
    }
  }
  triggerBody.onTriggerLeave = (e) => {
    if (e.playerId === world.getPlayer()?.id) {
      isPlayerNearby = false
      connectAction.active = false  // Hide action
    }
  }
}
```

### Quick Action Hotkey

**Optional: Q key for instant connect/disconnect:**
```javascript
app.configure([{
  key: 'quickActionEnabled',
  type: 'switch',
  options: [{ label: 'Enabled', value: 'enabled' },
            { label: 'Disabled', value: 'disabled' }],
  initial: 'enabled'
}])

if (app.props.quickActionEnabled === 'enabled' && world.isClient) {
  const control = app.control()
  const quickKey = control.keyQ
  if (quickKey) quickKey.capture = true

  let quickKeyPressed = false
  app.on('update', () => {
    if (quickKey?.pressed && !quickKeyPressed) {
      if (app.state.connected) disconnectWallet()
      else connectWallet()
    }
    quickKeyPressed = quickKey?.pressed
  })
}
```

### Event Emissions

**Emit events for cross-app communication:**
```javascript
app.emit('walletConnected', {
  connected: true,
  address: result.address
})

app.emit('walletDisconnected', {})
```

### Entity Assumption Pattern

**Apps assume specific entity names exist:**
- `cartridge.js` assumes entity named `'CartridgeLogo'`
- `wallet-connect.js` assumes entity named `'WalletIcon'`
- Apps get entity reference: `const entity = app.get('EntityName')`

### Configuration Standards

**Standard configuration options:**
```javascript
app.configure([
  {
    key: 'buttonText',
    type: 'text',
    label: 'Connect Button Text',
    initial: 'Connect Wallet'
  },
  {
    key: 'buttonColor',
    type: 'color',
    label: 'Button Color',
    initial: '#6366f1'
  },
  {
    key: 'quickActionEnabled',
    type: 'switch',
    label: 'Quick Action Key',
    options: [{ label: 'Enabled', value: 'enabled' },
              { label: 'Disabled', value: 'disabled' }],
    initial: 'enabled'
  },
  {
    key: 'triggerZone',
    type: 'switch',
    label: 'Trigger Zone Control',
    options: [{ label: 'Enabled', value: 'enabled' },
              { label: 'Disabled', value: 'disabled' }],
    initial: 'enabled'
  }
])
```

### Error Handling Pattern

**Distinguish user cancellation from errors:**
```javascript
try {
  const result = await world.web3.connect()
} catch (error) {
  // User cancelled
  if (error.message.includes('User cancelled') ||
      error.message.includes('User rejected') ||
      error.message.includes('Modal closed')) {
    console.log('User cancelled connection')
    return  // Silent return, not an error
  }

  // Real error
  console.error('Connection failed:', error)
  statusText.value = 'Connection failed'
  statusText.color = '#ef4444'
}
```

## Docker Build Caveats

**Native Module Compilation Requirements**

When building Docker images using Alpine Linux, native Node.js modules require build tools:

**Required Packages:**
- `python3` - Python interpreter for node-gyp
- `make` - GNU Make build tool
- `g++` - GNU C++ compiler
- `sqlite-dev` - SQLite headers (for better-sqlite3)

**Add to Dockerfile builder stage:**
```dockerfile
RUN apk add --no-cache python3 make g++ sqlite-dev
```

**Packages Requiring Native Compilation:**
- `bufferutil` - WebSocket performance optimization (peer dependency of ws)
- `utf-8-validate` - WebSocket UTF-8 validation (peer dependency of ws)
- `better-sqlite3` - SQLite3 bindings (direct dependency)
- Any other native addons in the dependency tree

**Build Process:**
1. Install build dependencies BEFORE `npm install`
2. npm install will compile native modules automatically
3. Alpine packages are lightweight but minimal - always check for native deps
4. Verify build by checking for compiled .node files in node_modules

**Common Errors:**
- `gyp ERR! find Python` - Missing python3
- `node-gyp rebuild` failures - Missing make or g++
- SQLite compilation errors - Missing sqlite-dev