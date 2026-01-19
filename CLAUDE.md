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
- Note: Cartridge/StarkNet wallets use different patterns (not covered here)

### State Management Pattern

**Always use `app.state` for connection state:**
```javascript
app.state.connected = false
app.state.address = null
```

**Avoid local variables** - Other systems may need to inspect connection state

### EVMClient State Synchronization (CRITICAL)

**Understanding React/EVMClient state flow:**

The EVM system uses a two-layer state management approach:

1. **React Layer** (wagmi): Manages actual wallet connection
2. **EVMClient Layer** (world.evm): Caches state for non-React code

**Critical synchronization points:**
```javascript
// 1. React calls bind() when connection state changes
world.evm.bind({ isConnected, address, ... })

// 2. App calls connect() to initiate connection
const result = await world.evm.connect()
// ⚠️ May timeout before address is available

// 3. React eventually provides address via bind()
// 4. bind() emits evmConnect event
```

**Common race condition (FIXED):**
- **Symptom**: "already_connected" error on reconnect after disconnect
- **Cause**: Cached React state not cleared on disconnect
- **Fix**: disconnect() now clears all cached state
```javascript
// disconnect() clears all cached state:
this.connected = false
this.address = null                    // Clear cached address
this._cachedReactIsConnected = false   // Clear React state cache
this._cachedReactAddress = null        // Clear React address cache
```

**State management rules:**
1. **Use bind() for React updates**: Let bind() manage this.connected
2. **Don't set connected on timeout**: connect() without address doesn't set state
3. **Clear cache on disconnect**: Prevents stale state from previous sessions
4. **Check for address, not just state**: already_connected requires address

**Key implementation details in EVMClient.js:**
- `bind()` sets `this.address = address` when connecting
- `bind()` sets `this.address = null` when disconnecting
- `connect()` checks for address before returning already_connected
- `disconnect()` clears all cached React state

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
- `wallet-connect.js` assumes entity named `'WalletConnectLogo'`
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
  const result = await world.evm.connect()
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

**Handle edge case states correctly:**
```javascript
// "already_connected" and "not_connected" are not errors
// The user/app called connect/disconnect when already in that state
if (result.reason === 'already_connected') {
  // Already connected, just update UI
  statusText.value = 'Already connected'
  statusText.color = '#10b981'
}

if (result.reason === 'not_connected') {
  // Already disconnected, just update UI
  statusText.value = '🌐 Disconnected'
  statusText.color = '#cccccc'
}
```

### ENS Resolution

**EVM wallets support ENS name resolution with built-in caching:**

```javascript
// Resolve ENS name from address (with 5-minute cache)
const result = await world.evm.resolveName(address)
if (result.success && result.name) {
  console.log('ENS name:', result.name)
} else if (result.success && !result.name) {
  console.log('No ENS name found')
} else {
  console.error('Resolution failed:', result.reason)
}

// Lookup address from ENS name (with 5-minute cache)
const result = await world.evm.lookupName('vitalik.eth')
if (result.success && result.address) {
  console.log('Address:', result.address)
} else if (result.success && !result.address) {
  console.log('No address found')
} else {
  console.error('Lookup failed:', result.reason)
}
```

**ENS Resolution Features:**
- **Caching**: Results cached for 5 minutes to prevent rate limiting
- **Failure caching**: Failed lookups cached for 1 minute to avoid repeated attempts
- **Automatic cleanup**: Cache cleared when EVM client binds/reconnects
- **Error handling**: Graceful failure with detailed reasons
- **Format validation**: `.eth` suffix required for name lookups

**Implementation in EVMClient.js:**
- `resolveName(address)` - Resolves address → ENS name
- `lookupName(ensName)` - Resolves ENS name → address
- `cleanupCache()` - Removes expired cache entries
- `ensCacheTimeout = 5 * 60 * 1000` (5 minutes)

**Rate Limit Prevention:**
The ENS resolution includes multiple safeguards:
1. 5-minute cache for successful resolutions
2. 1-minute cache for failed resolutions
3. Per-address/per-name caching to avoid repeated API calls
4. Cache cleanup on bind to prevent stale entries

**Common ENS Resolution Issues:**
- **Rate limits**: Use built-in caching, don't resolve on every frame
- **Not finding names**: ENS names only exist on mainnet, not testnets
- **Performance**: Always check cache before making network requests
- **Invalid names**: ENS names must end with `.eth`

## DojoSystem Architecture

**Status: Removed from Client World Initialization**

DojoSystem has been removed from `createClientWorld.js` initialization. The project uses **Cartridge** for web3 integration instead of DojoEngine.

**Reason for Removal:**
- DojoSystem was causing initialization errors during Hyperfy startup
- Project uses Cartridge (`examples/web3/cartridge`) for StarkNet integration
- DojoSystem is no longer needed for current web3 implementation

**If you need to re-enable DojoSystem:**
1. Add import: `import { DojoSystem } from './systems/DojoSystem'`
2. Register system: `world.register('dojo', DojoSystem)`
3. Add initialization (if needed): `world.dojo.init()`

**Note:** DojoSystem is client-side only and requires browser environment:
- WASM modules cannot be imported in Node.js
- DojoEngine dependencies use browser-only APIs
- Server initialization will cause "Unknown file extension ".wasm"" errors

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
## Port Troubleshooting

**Issue**: Hyperfy fails to start with EADDRINUSE error

**Diagnosis**: Check if port is already in use
- Run: ss -tuln | grep :3011 (or your configured PORT)
- Check for running Hyperfy processes: ps aux | grep "build/index.js"

**Resolution Options**:
1. Kill existing process: kill <PID>
2. Use different port: Edit .env.local and change PORT=3011 to PORT=3012
3. Access existing instance: The server may already be running at http://localhost:3011

**Common Cause**: Previous Hyperfy dev session didn't shutdown properly
