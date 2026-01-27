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

## System Dependency Handling

**Critical: Apps.js providers must handle undefined systems gracefully**

When removing systems from client world initialization (e.g., DojoSystem), the Apps.js providers must return `null` instead of `undefined` to prevent "Cannot read properties of undefined" errors.

### Problem Pattern
```javascript
// ❌ WRONG - Returns undefined when system doesn't exist
dojo(entity) {
  return world.dojo  // undefined when DojoSystem removed
}
// Apps calling entity.get('dojo').rehydrate() will crash
```

### Solution Pattern
```javascript
// ✅ CORRECT - Returns null when system doesn't exist
dojo(entity) {
  return world.dojo || null  // null when DojoSystem removed
}
// Apps get null and can handle gracefully
dojo?.rehydrate()  // Works safely
```

### Implementation Steps
1. **Client World**: Remove system import, registration, and initialization
2. **Apps.js**: Update provider to return `world.systemName || null`
3. **Apps**: Use optional chaining (`?.`) or null checks before calling methods

### Verification
- Restart Hyperfy and check for "Cannot read properties of" errors
- Test apps that might access the removed system
- Use `entity.get('systemName')?.method()` pattern in apps

## Cartridge Controller Bug

**Issue**: @cartridge/controller v0.10.7 has internal rehydrate error

**Error Message**: `TypeError: Cannot read properties of undefined (reading 'rehydrate')`

**Source**: The error occurs in @cartridge/controller's internal store persistence layer during React component mount. The library attempts to call `store.persist.rehydrate()` but `store.persist` is undefined.

**Stack Trace Pattern**:
```
at onMount (index-XXXXX.js:286656:47)
at commitHookEffectListMount (react-dom code)
at commitPassiveMountOnFiber (react-dom code)
```

**Impact**:
- Error appears in browser console but does not break functionality
- Cartridge wallet connection still works
- ENS resolution and other features remain operational

**Workaround**:
- This is a known bug in @cartridge/controller v0.10.7
- The error can be safely ignored as it doesn't affect functionality
- Consider downgrading to v0.10.6 if the console error is problematic

**Related Files**:
- `src/client/web3/ControllerProvider.js` - Cartridge initialization
- `src/core/systems/ClientWeb3.js` - Web3 system integration

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

**Common Cause**: Previous Hyperfly dev session didn't shutdown properly

## Particles System Configuration Pattern

**Implementing configurable particle effects in Hyperfy apps**

### Modern Approach (Hyperfy v2+)

**Use built-in particle systems and primitives instead of manual particle management:**

```javascript
// Create particle emitter with app.create('particles')
const spray = app.create('particles', {
  shape: ['sphere', 0.1],        // Built-in shapes: sphere, cone, point
  direction: 0.3,                // Randomization in initial direction
  rate: 10,                      // Particles per second
  loop: true,                    // Continuous emission
  life: '2~3',                   // Random lifetime range
  speed: '1~2',                  // Random initial speed
  size: '0.05~0.1',              // Random size range
  color: '#a8d8ff',              // Particle color
  alpha: '0.7~1.0',              // Random opacity
  force: new Vector3(0, -2, 0),  // Physics forces
  space: 'world',                // World or local space
  blending: 'additive'           // Additive blending mode
})
app.add(spray)

// Create particle bursts for explosions/splashes
const splash = app.create('particles', {
  shape: ['sphere', 0.1],
  direction: 1,
  rate: 0,                       // No continuous emission
  max: 50,                       // Max particles in system
  bursts: [{ time: 0, count: 50 }], // Emit 50 particles at time 0
  life: '1~2',
  speed: '2~4',
  color: '#ffffff~#a8d8ff',
  force: new Vector3(0, -9.8, 0),
  space: 'world',
  blending: 'additive'
})
app.add(splash)
```

### Legacy vs Modern Patterns

**❌ OLD PATTERN (Manual Particle Management):**
```javascript
// Manual array management
const particles = []

// Manual creation
const particle = someTemplate.clone(true)
particle.velocity = { x: 0, y: 1, z: 0 }
particles.push(particle)
world.add(particle)

// Manual update in game loop
for (let i = particles.length - 1; i >= 0; i--) {
  const p = particles[i]
  p.position.y += p.velocity.y * delta
  p.lifetime += delta
  if (p.lifetime > maxLifetime) {
    world.remove(p)
    particles.splice(i, 1)
  }
}
```

**✅ NEW PATTERN (Built-in Particle System):**
```javascript
// Particle system handles everything
const particles = app.create('particles', {
  rate: 10,
  speed: '1~2',
  force: new Vector3(0, -9.8, 0)
  // System handles: emission, movement, lifetime, cleanup
})
app.add(particles)
```

### Primitives for Basic Geometry

**Use `app.create('prim', type)` instead of templates for basic shapes:**

```javascript
// Create a plane prim for water surface
const water = app.create('prim', 'plane')
water.scale.set(5, 1, 5)
water.material = new THREE.MeshStandardMaterial({
  color: 0x006994,
  transparent: true,
  opacity: 0.8
})
app.add(water)

// Available primitive types:
// 'sphere', 'box', 'plane', 'cylinder', 'cone', 'torus'
```

### Configuration Structure

When creating particle-based effects (like ocean water simulation), use `app.configure()` to expose all tunable parameters:

```javascript
app.configure([
  {
    key: 'gridSize',
    type: 'range',
    label: 'Grid Size',
    initial: 20,
    min: 10,
    max: 50,
    step: 1
  },
  {
    key: 'particleEffectEnabled',
    type: 'switch',
    label: 'Particle Effect',
    options: [{ label: 'Enabled', value: 'enabled' },
              { label: 'Disabled', value: 'disabled' }],
    initial: 'enabled'
  }
])
```

### Pattern Implementation

**Follow this pattern when implementing configurable particle effects:**

1. **Use app.props with fallbacks for particle parameters:**
```javascript
const particles = app.create('particles', {
  rate: app.props.sprayRate || 10,
  speed: app.props.spraySpeed || '1~2',
  life: String(app.props.sprayLifetime || 2.0)
  // All parameters can be bound to app.props
})
```

2. **Use toggle switches for on/off effects:**
```javascript
if (app.props.effectEnabled === 'enabled') {
  // Create and add particle systems
  const effect = app.create('particles', { ... })
  app.add(effect)
}
```

3. **Reference app.props directly for conditional emission:**
```javascript
if (playerPos && app.props.playerTrailEnabled === 'enabled') {
  // Trigger trail particle bursts
  const trail = app.create('particles', {
    rate: 0,
    bursts: [{ time: 0, count: 5 }]
  })
  app.add(trail)
}
```

4. **Auto-cleanup with setTimeout for burst effects:**
```javascript
const burst = app.create('particles', { ... })
app.add(burst)
// Remove after particles die
setTimeout(() => app.remove(burst), 3000)
```

### Example Reference

**Ocean Particles Demo** (`examples/particles/ocean.js`):
- Uses `app.create('prim', 'plane')` for water surface instead of clone templates
- Uses `app.create('particles')` for all effects (spray, splash, trails)
- 17 configurable parameters covering all visual and behavioral aspects
- 15 range sliders for numeric values (grid size, wave properties, particle counts)
- 2 toggle switches for enabling/disabling entire effect systems
- No manual particle lifecycle management - system handles everything
- All parameters accessible via `app.props.keyName`
- Toggle switches use `'enabled'` / `'disabled'` string values for consistency

### Key Differences (Modern vs Legacy)

1. **No Templates Required**: Use `app.create('prim')` for basic geometry
2. **Built-in Physics**: `force: new Vector3(x, y, z)` instead of manual velocity updates
3. **Automatic Lifecycle**: Particle system handles emission, movement, and cleanup
4. **Burst Emission**: Use `bursts: [{time: 0, count: n}]` instead of manual loops
5. **Range Syntax**: `'1~2'` for random ranges instead of `Math.random()`
6. **Declarative**: Configure properties rather than imperative updates

### Benefits

- **Live Tuning**: Real-time parameter adjustment in Hyperfy editor
- **No Code Changes**: All visual tweaking via configuration UI
- **Toggle Control**: Enable/disable entire effect systems as needed
- **Performance**: Built-in optimizations and GPU acceleration
- **Cleaner Code**: ~60% less code, no manual array management
- **Reliability**: System handles edge cases, cleanup, and lifecycle
- **Consistent Pattern**: Follows Hyperfy's `app.create()` and `app.configure()` standards


## Depth of Field (DOF) Technical Caveats

**DOF raycast performance optimization with frame skipping**

DOFController uses frame skipping to reduce raycast frequency for better performance:
- `raycastInterval` (default: 16ms) - Minimum time between raycasts
- `frameSkipInterval` (default: 1) - Raycast every N frames (2=every other frame, 3=every third frame)
- Adjust via: `world.dofController.raycastInterval = 32` or `window.cam.dof.performance.setFrameSkip(3)`

**Hysteresis prevents focus jumping**

Focus changes only occur when distance delta exceeds `focusHysteresis` (default: 0.1):
- Prevents rapid focus oscillation when looking at edges
- Lower values (0.05) = more responsive but potentially jittery
- Higher values (0.2) = smoother but less responsive

**Fallback focus distance from zoom calculation**

When raycast fails (no hits or sky/background), uses `fallbackFocusDistance`:
- Default: 10 meters
- Set via: `world.dofController.setFallbackFocusDistance(distance)`
- Camera-based zoom calculation provides dynamic fallback

**Shader uniform updates normalized to 0-1 range**

Focus distance sent to shader is normalized: `focusDistance / camera.far`:
- Shader receives 0-1 range for GPU efficiency
- Actual distance available in `world.dofController.currentFocusDistance`
- Updates every frame regardless of raycast frequency

**Console debugging commands (admin-only)**

```javascript
// Enable/disable DOF
window.cam.dof.enable() / disable()

// Manual focus control
window.cam.dof.setFocus(distance)      // Set focus distance (meters)
window.cam.dof.setRange(range)         // Set focus range
window.cam.dof.setBokeh(scale)         // Set blur amount
window.cam.dof.setFStop(fstop)         // Set aperture

// Performance monitoring
window.cam.dof.performance.get()       // Get {lastRaycastTime, raycastInterval, frameSkipInterval}
window.cam.dof.performance.setFrameSkip(interval)  // Adjust raycast frequency

// Direct controller access
world.dofController.setDebug(true)     // Enable debug logging
world.dofController.getFocusDistance() // Get current focus
world.dofController.setFocusSpeed(speed)  // 0.01-1 (default: 3.0)
```

**Common DOF issues and fixes**

- **DOF not visible**: Check `world.prefs.dofEnabled`, increase `bokehScale` (window.cam.dof.setBokeh(10)), decrease f-stop (window.cam.dof.setFStop(1.4))
- **Focus not changing**: Check raycast hits with `world.dofController._getRaycastFocusDistance()`, reduce hysteresis, increase focus speed
- **Performance issues**: Increase frameSkipInterval, disable with `window.cam.dof.disable()`

**DOF shader parameter mapping**

EffectRegistry maps world preferences to shader uniforms:
- `world.prefs.dofFocalLength` (mm) → `focalLength` (normalized)
- `world.prefs.dofFocusRange` → `focusRange` (normalized)
- `world.prefs.dofMaxBlur` → `bokehScale` (multiplied by 2)
- `world.prefs.dofFStop` → `fStop` (direct)

## THREE.js Object Availability

When using THREE constructors, note that THREE may not be in scope. Use:
- Direct Vector3 (global)
- Direct material objects for prim.material
- Avoid THREE.MeshStandardMaterial()

## Console Logging Performance Caveats

**Critical: Console.log in high-frequency code paths causes severe performance degradation**

### Issue Discovery
Typing `/dof` in chat caused CPU spike to 40%, GPU spike to 5%, and framerate drop from 60 to 24 FPS due to console.log statements firing on every command.

### Root Cause
Two console.log statements in `src/core/systems/ClientPrefs.js`:
- Line 145: `[ClientPrefs] ${prefKey} set to:` logging for all preference changes
- Line 156: `DOF ${enabled ? 'ENABLED ✓' : 'DISABLED ✗'}` status logging

### Performance Impact by Code Location

**Critical (Frame Loops)** - Remove immediately:
- `update()`, `lateUpdate()`, `fixedUpdate()`, `onEarlyUpdate()` handlers
- Console logs fire every frame (~60 times/second)
- Causes immediate framerate drops and CPU/GPU spikes

**High (Frequent Events)** - Use conditional logging:
- `onTriggerEnter`, `onTriggerExit`, `onCollision`
- Input handlers: `onKeyDown`, `onMouseMove`, `onClick`
- Rapidly repeating user actions

**Medium (State Changes)** - Acceptable for debugging:
- Configuration/property changes
- App initialization, mount/unmount
- Network events

**Low (Initialization)** - Safe to keep:
- One-time setup code
- Error handling for critical failures

### Best Practice Pattern

**Use conditional debug logging:**
```javascript
// In app configuration
app.configure([
  {
    key: 'debugLogs',
    type: 'switch',
    label: 'Debug Logging',
    options: [{ label: 'Enabled', value: 'enabled' },
              { label: 'Disabled', value: 'disabled' }],
    initial: 'disabled'
  }
])

// Debug helper function
function debugLog(...args) {
  if (app.props.debugLogs === 'enabled') {
    console.log('[app]', ...args)
  }
}

// Usage in code
debugLog('State changed:', newState)  // Only logs when enabled
```

**Benefits:**
- Zero performance impact when disabled
- Maintain debugging capability
- User-controlled via configuration
- Clean production console output

### Discovered Issues

**Fireball elemental item** (`world/assets/93eb35186806d40895d0843fcfb73fb4c7025736d6c0203243041deffab1e26f.js`):
- Console.log in `lateUpdate()` handler (4 statements)
- Executes every frame when item is held
- Immediate performance degradation during gameplay

**SimpleTriggerArea** (`world/assets/b11765f8dfee8571a140268114305efa3c7a4e8bf412e82f85359fbeb6a2cfad.js`):
- Console.log in `onTriggerEnter` handler
- Fires every time player enters trigger area
- Unnecessary console spam

### Recommendation

**New Development:**
1. Implement conditional debug logging pattern in all new systems
2. Never use console.log directly in frame loops
3. Add `debugLogs` configuration option to all interactive apps

**Existing Code Audit:**
- 3,232 console.log statements found across 443 JavaScript files
- Priority: Frame loops → frequent events → state changes → initialization
- Remove or conditionally wrap all logs in high-frequency paths

**Linting Rule:**
Prevent console.log in update/lateUpdate/fixedUpdate handlers to catch issues during development.

