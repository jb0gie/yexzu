# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

# Run both lint and format checks
npm run check

# Clean up unused assets
npm run world:clean

# Viewer-only development mode
npm run viewer:dev

# Client-only development mode
npm run client:dev

# Backup world data
npm run world:backup
```

## High-Level Architecture


### Hybrid ECS System Architecture

**World Class** (`src/core/World.js`) - Central orchestrator managing all systems:
- **10-phase update loop**: `preTick` → `fixedUpdate` (60Hz) → `update` → `lateUpdate` → `postTick`
- Manages system registration and lifecycle
- Handles timing, physics, and rendering coordination
- Critical for understanding execution order

**System Architecture** - All systems inherit from `src/core/systems/System.js`:
- Implement EventEmitter pattern
- Standardized lifecycle methods matching World phases
- Separate client/server implementations for network synchronization

### Client/Server Architecture

**Dual System Design** - Completely separate client and server implementations:

**Server Systems**: `src/core/createServerWorld.js`
- Authoritative world state management
- Database operations via Knex (SQLite/PostgreSQL)
- Asset storage (local/s3)
- Network broadcasting to clients

**Client Systems**: `src/core/createClientWorld.js`
- Three.js rendering with post-processing effects
- Input handling and prediction
- Audio, UI, and XR support
- Asset streaming and interpolation

### Core Systems Hierarchy

```
World (World.js)
├── Entities (App, PlayerLocal, PlayerRemote)
├── Systems (10+ specialized systems)
│   ├── Physics - PhysX integration (60Hz fixed)
│   ├── Networks - WebSocket messaging
│   ├── Graphics - Three.js rendering
│   ├── CSS - CSS3D rendering (for WebView)
│   └── 10+ more specialized systems
├── Nodes - Scene graph hierarchy
│   ├── Mesh, Camera, Audio, UI, WebView
│   ├── RigidBody, Collider, Joint
│   └── 15+ more node types
└── Apps - Sandbox JavaScript applications
```

## WebView Nodes

### WebView Technical Implementation Details

**Critical Discovery**: WebView interaction requires a bridge between Three.js raycasting and DOM pointer events. The reticle raycast hits the invisible WebGL mesh, but pointer events only trigger on DOM elements. The solution adds onPointerEnter/Down/Up handlers to the WebView node that enable/disable iframe pointer-events.

**Simplified Implementation**:
WebViews directly enable pointer-events on the iframe when the pointerEvents property is true. The CSS3DObject handles DOM events naturally without any Three.js event bridging. This matches the proven pattern from agentic-hyperfy.

**How It Works**:
1. When pointerEvents: true is set
2. iframe.style.pointerEvents = 'auto' is applied
3. CSS3DRenderer renders the iframe in 3D space
4. DOM events naturally propagate to the iframe
5. User can click and scroll without any Three.js intervention

**Key Change**: Removed over-engineered raycast bridge - now uses simple direct pointer-events enable/disable

**Raycasting Requirements**:
- Mesh must have computeBoundingBox() and computeBoundingSphere() called
- Material must be visible (visible: true) despite opacity: 0
- sItem.matrix must be cloned and updated on position changes
- Do NOT use updateMatrixWorld() - Node class doesn't have this method

**Event Listener Placement**:
- Event listeners MUST be on CSS3DObject.element (container), not the inner div
- CSS3DRenderer transforms container coordinates, keeping event positions accurate
- Mouse events for desktop (mouseenter/mouseleave)
- Touch events always enabled for mobile (no hover state)

**DOM Layering**:
- CSS3D layer: z-index: 0 (behind WebGL)
- WebGL canvas: z-index: 1 (WebView hit mesh)
- UI layer: z-index: 2 (core UI, reticle)
- WebGL canvas has alpha: true for pass-through compositing

**Common Pitfalls**:
- Reticle raycastReticle() uses center screen coordinates (0,0)
- Octree requires proper bounding spheres for all items
- Mesh.visible must be true even with opacity: 0 for raycasting
- CSS3DObject.element is the correct event target, not child elements
- Pointer-events must be explicitly enabled/disabled
- Cleanup must remove all event listeners to prevent memory leaks


WebView nodes display interactive web content in both 3D world space and 2D screen space. Implemented based on https://github.com/saori-eth/agentic-hyperfy/tree/iframe

### Simple Working Pattern

Based on user testing, the simplest pattern works best:

```javascript
// Simple WebView example - displays a 3D webpage in the world
const webview = app.create('webview', {
  src: 'https://irb0gie.vercel.app',
  width: 4, // Width in meters
  height: 3, // Height in meters
  factor: 100, // Pixels per meter (higher = sharper)
  space: 'world', // 'world' for 3D positioned, 'screen' for 2D overlay
  position: [0, 1.5, -3], // Position in front of player at eye level
  pointerEvents: true, // Enable interaction with iframe
})

app.add(webview)

// Keep app running
app.keepActive = true
```

**Important**: Do NOT use `app.on('init', () => { ... })` wrapper pattern. It does nothing and over-complicates the code. Create webviews directly at the top level.

### World-Space WebView (3D)

Display websites in the 3D world:

```javascript
const webview = app.create('webview', {
  src: 'https://example.com',
  width: 2,                    // Width in meters
  height: 1.5,                 // Height in meters
  position: [0, 1.5, -3],      // 3D position [x, y, z]
  pointerEvents: true         // Enable for interaction
});
app.add(webview);
```

### Screen-Space WebView (UI Overlay)

Display web content as 2D UI overlay:

```javascript
const uiWebview = app.create('webview', {
  src: 'https://threejs.org',
  width: 800,
  height: 600,
  space: 'screen',      // Screen space instead of world space
  position: [0.5, 0.1, 0]  // Screen coordinates (0-1)
});
app.add(uiWebview);
```

### WebView Properties

- `src`: URL to load in iframe (string)
- `html`: HTML content to use instead of src (string, optional)
- `width`: Width in world units (number, default: 1)
- `height`: Height in world units (number, default: 1)
- `factor`: Pixel density factor for iframe (number, default: 100)
- `doubleside`: Render both sides (boolean, default: false)
- `space`: 'world' or 'screen' (string, default: 'world')
- `pointerEvents`: Enable interaction (boolean, default: false)

### Interaction Modes

**Desktop**:
- `pointerEvents: true` required
- Mouse cursor unlock required (press ESC)
- Hover over webview to interact
- Scroll and click work naturally

**Mobile**:
- `pointerEvents: true` required
- Touch events work automatically
- No cursor unlock needed
- Single tap to interact, pinch to zoom

### Test File

**Working Example**: `examples/webview-simple.app.js`

```bash
# Load and test:
npm run dev
# Load: examples/webview-simple.app.js
# You should see a webpage at position [0, 1.5, -3]
# Desktop: Move close, unlock cursor (ESC), hover/click
# Mobile: Touch the webview directly
```

### Technical Implementation

- Uses three.js CSS3DRenderer for DOM rendering
- Canvas alpha compositing: WebGL canvas with `alpha: true` allows pointer events to pass through to CSS layer
- DOM layering: CSS3D (z:0) → WebGL canvas (z:1) → UI (z:2)
- Interaction via `pointer-events: auto` on iframe element
- **NO complex event listeners needed** - browser handles interaction naturally

### Performance Notes

- WebViews render to offscreen DOM layer
- Limited to ~10-20 webviews per scene for performance
- Complex pages may reduce FPS
- Mobile devices may throttle background iframes

### Technical Caveats Discovered During Implementation

**1. Simplified Event Handling is Key**:
- Initially tried complex `mouseenter`/`mouseleave`/`touchstart` event listeners on inner div
- These break after CSS3D transforms (coordinates get messed up)
- **SOLUTION**: Simply set `iframe.style.pointerEvents = 'auto'` and let browser handle it
- No event listeners needed at all!

**2. Canvas Alpha Compositing Required**:
- WebGL renderer MUST have `alpha: true` (line 17 in ClientGraphics.js)
- Without this, canvas blocks pointer events to CSS layer
- Alpha compositing lets events pass through to iframe

**3. Mobile Works Naturally**:
- `pointer-events: auto` works for both desktop AND mobile
- No special mobile handling needed
- Touch events work the same as mouse events

**4. Over-Engineering Breaks Things**:
- Initial test files had `app.on('init', ...)` wrappers and multiple webviews
- These didn't work at all
- **SIMPLE pattern works**: Direct creation, single webview, no wrappers
- See examples/webview-simple.app.js for correct pattern

**5. CSS3DObject.element is the Container**:
- Events should be on `CSS3DObject.element` (container div), not inner div
- CSS3DRenderer transforms the container, so that's where events work
- We don't attach events at all now (see point 1)

**6. File Organization Matters**:
- Collections copying during startup can cause race conditions
- Ensure clean collections in world/collections/ from src/world/collections/
- Don't create duplicate files in collections (prevents SES errors)

**7. DOM Layering and Z-Index Critical**:
- CSS3D layer: z-index: 0 (CSS3DRenderer domElement)
- WebGL canvas: z-index: 1 (Three.js renderer canvas)
- UI layer: z-index: 2 (React UI, reticule, etc.)
- **CRITICAL**: UI must be z-index: 2 to be visible above WebView/CSS3D layer
- Changing UI to z-index: 1 will hide reticule and core UI behind WebViews
- This is set in src/client/world-client.js line 74


**8. CSS3DObject.element is The Key**:
- Event listeners MUST be on objectCSS.element (container div), not inner div
- CSS3DRenderer transforms the container, keeping event coordinates accurate
- Events on inner div break after transforms due to coordinate mismatches
- This is critical for reticle/pointer system integration\n
**9. Iframe Scrolling Requires Explicit Attributes**:
- iframe.scrolling = 'yes' must be set to enable scroll wheel
- iframe.style.overflow = 'auto' ensures scrollbars appear
- Without these, pages won't scroll even with pointer-events enabled

**hitPoint Property**: hitPoint is NOT a WebView property. It's an internal THREE.js/Hyperfy property set by the raycasting system during interaction. Our implementation handles interaction via event listeners (mouseenter/mouseleave/touchstart/touchend) and the interacting flag. If interaction fails, check:
- CSS3DObject positioning sync in ClientCSS.js lateUpdate
- Browser iframe interaction policies
- Reticle raycasting against CSS3D layer
- Events are on CSS3DObject.element, not inner div

**Performance**: Limit to ~10-20 webviews per scene. Complex pages reduce FPS. Mobile may throttle background iframes.

## Critical Architecture Patterns

### 1. SES Security Environment
**Apps run in Secure ECMAScript (SES) sandbox** - MAJOR CONSTRAINTS:
- **NO ES6 modules** - Cannot use `import`/`export`
- **Must wrap apps in parentheses**: `({ init() {}, update(delta) {} })`
- **No direct eval() or new Function()**
- **Limited global API access** through controlled injection
- **Console.log is reliable** - prefer over `world.chat()` which is broken

### 2. Input System - Critical!
**Keyboard events DO NOT work** through standard event listeners:
```javascript
// ❌ WRONG - This will NOT work
app.on('keydown', (event) => { /* won't work */ })

// ✅ CORRECT - Use control() API
const control = app.control()
if (!control) return  // Always check
control.keyW.capture = true
if (control.keyW.pressed) {
  // Handle input
}
```

### 3. Chat API is Broken
**`world.chat()` system is unreliable** due to Apps.js conversion bug:
```javascript
// ❌ CAUSES CRASH: Cannot create property 'id' on string
debug: Apps.js:159
world.chat('message', true)  // THIS BREAKS

// ✅ WORKS: Use console.log
console.log('📡 Your message here')
```

### 4. 3D Positioning Can Cause Crashes
**Node position access can fail** - use try-catch and fallbacks:
```javascript
// ✅ STABLE - Handle position errors
let position = [0, 1, 0]
try {
  position = node.position.toArray()
} catch (e) {
  console.warn('Position access failed, using default')
}
```

### 5. App Development Pattern
**Apps MUST use specific format** for SES compatibility:
```javascript
// ✅ CORRECT - Wrap in parentheses
({
  configure() {
    // Configuration options
  },
  init() {
    // Initialize resources
  },
  update(delta) {
    // Frame updates (variable timestep)
  },
  fixedUpdate(delta) {
    // Physics updates (60Hz)
  },
  cleanup() {
    // Cleanup resources
  }
})
```

## Procedural Geometry (Prims)

### Basic Primitive Creation
```javascript
// Box
const box = app.create('mesh', {
  shape: 'box',
  size: [1, 1, 1], // Width, height, depth
  material: 'flat',
  color: '#ff0000',
  position: [0, 1, 0]
})

// Sphere
const sphere = app.create('mesh', {
  shape: 'sphere',
  radius: 0.5,
  widthSegments: 32,
  heightSegments: 16,
  material: 'flat',
  color: '#0000ff',
  position: [3, 1, 0]
})

// Cylinder
const cylinder = app.create('mesh', {
  shape: 'cylinder',
  radius: 0.5,
  height: 2,
  radialSegments: 32,
  material: 'flat',
  color: '#00ff00',
  position: [-3, 1, 0]
})

// Plane
const plane = app.create('mesh', {
  shape: 'plane',
  size: [5, 5],
  material: 'flat',
  color: '#cccccc',
  rotation: [-Math.PI / 2, 0, 0] // Flat on ground
})
```

### Collision Settings
```javascript
// Static collider (immovable)
const wall = app.create('mesh', {
  shape: 'box',
  size: [0.2, 3, 5],
  material: 'basic',
  color: '#888888',
  collision: 'static'  // Won't move, blocks players
})

// Dynamic physics object
const crate = app.create('mesh', {
  shape: 'box',
  size: [1, 1, 1],
  material: 'basic',
  color: '#8B4513',
  collision: 'dynamic',  // Affected by physics
  mass: 5
})

// Trigger zone (no collision, detects entry/exit)
const triggerZone = app.create('mesh', {
  shape: 'box',
  size: [3, 2, 3],
  material: 'basic',
  color: '#ffff00',
  collision: 'trigger',  // Ghost object, triggers only
  visible: false         // Usually invisible
})

triggerZone.on('triggerEnter', (player) => {
  console.log('Player entered!')
})

triggerZone.on('triggerExit', (player) => {
  console.log('Player left!')
})
```

### Nested Groups for Organization
```javascript
// Create parent group
const building = app.create('group', {
  position: [0, 0, -10]
})

// Add walls
const walls = [
  app.create('mesh', { shape: 'box', size: [10, 3, 0.2] }),
  app.create('mesh', { shape: 'box', size: [10, 3, 0.2], position: [0, 0, -5] }),
  app.create('mesh', { shape: 'box', size: [0.2, 3, 5], position: [-5, 0, -2.5] }),
  app.create('mesh', { shape: 'box', size: [0.2, 3, 5], position: [5, 0, -2.5] })
]

walls.forEach(wall => building.add(wall))

// Add roof
const roof = app.create('mesh', {
  shape: 'box',
  size: [10.4, 0.2, 5.4],
  position: [0, 3, -2.5],
  color: '#8B0000'
})
building.add(roof)

// Move entire building
building.set({ position: [10, 0, 0] }) // All children move too

// Add to app
app.add(building)
```

## Key System APIs

### World Object
- `world.isClient` / `world.isServer` - Environment detection
- `world.entities.*` - Entity management
- `world.systems.*` - System access
- `world.network.maxUploadSize` - Upload limits

### App Object
- `app.create('nodetype', config)` - Create nodes
- `app.control()` - Input handling (MUST use for keyboard)
- `app.on()` / `app.off()` - Event registration
- `app.send(event, data)` - Custom events to server
- `app.keepActive = true` - Keep app running

### Node Properties
- `position: [x, y, z]` - 3D position
- `rotation: [x, y, z]` - Euler rotation
- `scale: [x, y, z]` - Scale factor
- `visible: boolean` - Rendering visibility
- `collisionEnabled: boolean` - Physics interaction

## Coordinate System & Units

### Y-Up Coordinate System
Hyperfy uses Y-up coordinates (same as Blender and Three.js):
- **X**: Horizontal (left/right)
- **Y**: Vertical (up/down) - up is positive
- **Z**: Depth (forward/backward)

```javascript
// ✅ CORRECT - Y-up positioning
const playerHeight = 1.8
const groundLevel = 0
const node = app.create('mesh', {
  position: [2, playerHeight, -3], // 2m right, 1.8m up, 3m forward
  rotation: [0, Math.PI / 4, 0]    // 45° rotation around Y axis
})

// ❌ WRONG - Z-up (common mistake from other engines)
const wrongPosition = [2, -3, 1.8] // Don't do this
```

### Real-World Dimensions
- **Avatar height**: ~1.8 units (meters)
- **Door height**: ~2.2-2.5 units
- **Room height**: ~3.0 units minimum
- **Wall thickness**: 0.1-0.2 units
- **Step height**: 0.2 units maximum (climbable)
- **Default walk speed**: ~5.0 units/second
- **Sprint speed**: ~8.0 units/second

```javascript
// ✅ CORRECT - Realistic object sizes
const door = app.create('mesh', {
  scale: [1.0, 2.3, 0.15], // 1m wide × 2.3m tall × 0.15m thick
  position: [0, 1.15, 0]    // Centered at human height
})

// ❌ WRONG - Improper scaling
const hugeDoor = app.create('mesh', {
  scale: [10, 30, 5] // Way too big, will cause issues
})
```

## Development Constraints

### 1. SES Sandbox Environment
Apps execute in controlled sandbox with restricted APIs. Always assume limited global access and use only provided APIs.

### Available Globals in SES Environment

#### ✅ Available Built-ins
```javascript
// Math operations (full Math object)
const random = Math.random()
const sinValue = Math.sin(Math.PI / 2)
const distance = Math.sqrt(x * x + y * y)

// Console logging (RELIABLE - always works)
console.log('Debug info')
console.warn('Warning')
console.error('Error')

// Core Hyperfy APIs
app.configure([...])
app.create('nodetype', config)
app.state.myValue = 123

world.isClient
world.isServer
world.network.send('event', data)
```

#### ❌ NOT Available
```javascript
// ❌ NO Date object
const now = Date.now() // ERROR - Date is not available
const today = new Date() // ERROR

// ❌ NO prng (pseudo-random number generator)
// Use Math.random() instead of prng.random()
const value = prng.random() // ERROR - prng is undefined

// ❌ NO fetch API (use app.send to server instead)
const response = await fetch(url) // ERROR

// ❌ NO localStorage
localStorage.setItem('key', 'value') // ERROR

// ❌ NO DOM access
document.getElementById('id') // ERROR - document is undefined
```

#### ⚠️ THREE.js Classes (Injected)
```javascript
// ✅ Available THREE.js classes (capitalized)
const position = new THREE.Vector3(1, 2, 3)
const rotation = new THREE.Quaternion()
const color = new THREE.Color('#ff0000')
const box = new THREE.Box3()
const sphere = new THREE.Sphere()

// Common pattern for physics calculations
const direction = new THREE.Vector3()
direction.subVectors(target, source).normalize()

// Note: Always use THREE namespace, not individual imports
// ❌ const { Vector3 } = THREE // Don't destructure
// ✅ new THREE.Vector3() // Correct
```

### 2. UI System Limitations
- **No responsive sizing** - Use explicit pixel values
- **No CSS animations** - Manual updates only
- **Fixed positioning** - No relative layouts
- **Basic shapes only** - Complex interactions manually implemented

### UI Layout & Positioning

#### Screen Space Coordinates (0-1 Percentage)
```javascript
// ✅ CORRECT - Position using 0-1 range (percentage of screen)
const ui = app.create('ui', {
  space: 'screen',
  position: [0.5, 0.1, 0], // 50% from left, 10% from top
  width: 0.3,              // 30% of screen width
  height: 0.2              // 20% of screen height
})

// Centered popup
const popup = app.create('ui', {
  space: 'screen',
  position: [0.5, 0.5, 0], // Center of screen
  width: 0.6,
  height: 0.4,
  anchor: [0.5, 0.5, 0]    // Anchor to center
})
```

#### Corner Positioning with Anchors
```javascript
// Top-left corner
const topLeft = app.create('ui', {
  space: 'screen',
  position: [0, 0, 0],
  anchor: [0, 0, 0]  // Anchor to top-left
})

// Bottom-right corner
const bottomRight = app.create('ui', {
  space: 'screen',
  position: [1, 1, 0],
  anchor: [1, 1, 0]  // Anchor to bottom-right
})

// Top-center
const topCenter = app.create('ui', {
  space: 'screen',
  position: [0.5, 0, 0],
  anchor: [0.5, 0, 0]
})
```

#### World Space UI with Billboarding
```javascript
// 3D UI element that always faces camera
const worldUI = app.create('ui', {
  space: 'world',        // Attach to 3D world
  position: [5, 2, -3],
  width: 2,              // 2 meters wide
  height: 0.5,           // 0.5 meters tall
  billboard: true        // Always face camera
})

// Floating nameplate above character
const nameplate = app.create('ui', {
  space: 'world',
  position: [0, 2.2, 0], // 2.2m above ground
  width: 1.5,
  height: 0.3,
  billboard: true
})

const nameText = app.create('uitext', {
  value: 'Player Name',
  fontSize: 24,
  color: '#ffffff'
})

nameplate.add(nameText)
```

#### Scrollable List Pattern
```javascript
// Container for scrollable list
const scrollContainer = app.create('ui', {
  space: 'screen',
  position: [0.1, 0.1, 0],
  width: 0.35,
  height: 0.6
})

// Content panel that grows
const contentPanel = app.create('ui', {
  space: 'screen',
  position: [0, 0, 0],
  width: 1,      // Match parent width
  height: 0.1    // Per item height
})

scrollContainer.add(contentPanel)

// Enable scrolling - IMPORTANT
scrollContainer.set({
  overflow: 'scroll',
  scrollVertical: true
})

// Add items dynamically
const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5']
items.forEach((item, index) => {
  const row = app.create('ui', {
    space: 'screen',
    position: [0, index * 0.1, 0], // Stack vertically
    width: 1,
    height: 0.1
  })

  const text = app.create('uitext', {
    value: item,
    position: [0.05, 0.5, 0], // Left padding
    fontSize: 16
  })

  row.add(text)
  contentPanel.add(row)
})

// Update content height based on items
contentPanel.set({
  height: items.length * 0.1
})
```

### 3. Networking Constraints
- **Fixed timestep physics** - 60Hz - don't exceed
- **Variable render updates** - Adapt to display refresh
- **Binary protocol only** - Use provided message helpers
- **Authoritative server** - Server is ground truth

### Networking Cost & Performance

#### When to Network vs Client-Only
```javascript
// ✅ NETWORK - Must sync to all clients
// Player state, game scores, shared objects
app.on('update', (delta) => {
  if (!world.isServer) return  // Server authoritative only

  app.state.playerPosition = playerNode.position.toArray()
  world.network.send('playerMove', {
    position: app.state.playerPosition,
    rotation: playerNode.rotation.toArray()
  })
})

// ❌ DON'T NETWORK - Client-side only
// Visual effects, UI state, local animations
app.on('update', (delta) => {
  if (!world.isClient) return  // Client visual only

  // Particle effects, local animations
  updateParticleSystem(delta)

  // UI state changes
  updateLocalUI()
})
```

#### Cost Calculator Examples
```javascript
// High cost (avoid frequent updates)
world.network.send('expensiveUpdate', {
  matrix: new Float32Array(16),  // 64 bytes per update
  vertices: new Float32Array(1000), // 4KB per update!
  timestamp: 12345
})

// Low cost (optimized)
world.network.send('optimizedUpdate', {
  position: [x, y, z],          // 12 bytes
  rotation: [x, y, z, w],       // 16 bytes
  state: flags                  // 1 byte
})

// Cost per update @ 60Hz:
// Expensive: ~246KB/s per player (4KB × 60)
// Optimized: ~1.7KB/s per player ((12+16+1) × 60)
```

#### Optimization Rules
```javascript
// ✅ Batch updates
let pendingUpdate = null
app.on('update', (delta) => {
  if (!world.isServer) return

  // Only update when significant change occurs
  if (hasSignificantChange()) {
    pendingUpdate = { /* data */ }
  }

  // Send at most 10 times per second
  if (pendingUpdate && timeSinceLastSend > 100) {
    world.network.send('batchUpdate', pendingUpdate)
    pendingUpdate = null
  }
})

// ❌ Avoid per-frame networking
app.on('update', (delta) => {
  if (!world.isServer) return

  // DON'T DO THIS - floods network
  world.network.send('frameUpdate', getAllState())
})

// ✅ Compress data
world.network.send('compact', {
  p: [x, y, z],    // Short keys
  r: [x, y, z, w],
  s: flags
})
```

### 4. Asset Pipeline
- **Content-addressed storage** - Assets identified by SHA-256 hash
- **Automatic deduplication** - Duplicate binaries automatically handled
- **Streaming loads** - Progressive asset loading built-in
- **Format limits** - GLB, VRM, HTML, Canvas, Audio, Video

## ⚠️ Critical Technical Caveats

### App Format - MAJOR ISSUE
**Hyperfy Apps DO NOT use `({...})` wrapper pattern despite cursor rules suggesting it**

```javascript
// ❌ WRONG - Despite what docs say, this doesn't work in practice
({
  init() {
    // code
  }
})

// ✅ CORRECT - Direct JavaScript at top level
app.configure([...])
const body = app.get('NodeName')
app.state.connected = false
```

**Verified in**: `/examples/web3/cartridge/cartridge.js`, `/examples/essentials/stamina-system.js`

### Critical API Issues

**1. `world.chat()` is BROKEN**
```javascript
// ❌ Crashes: Cannot create property 'id' on string
world.chat('message', true)

// ✅ Use console.log instead
console.log('📡 Your message here')
```

**2. Keyboard Events DON'T Work**
```javascript
// ❌ Standard event listeners won't work
document.addEventListener('keydown', handler)

// ✅ Use app.control() API
const control = app.control()
if (!control) return // Always check if control exists
control.keyW.capture = true
if (control.keyW.pressed) { }
```

**3. 3D Position Access Can Fail**
```javascript
// ✅ Always use try-catch
let position = [0, 1, 0]
try {
  position = node.position.toArray()
} catch (e) {
  console.warn('Position access failed, using default')
}
```

**4. GLB Nodes May Not Exist**
```javascript
// ⚠️ app.get() returns null if node doesn't exist in GLB
// Example: wallet-connect-base.js requires a node named 'Block'
const node = app.get('NodeName') // NodeName from Blender/GLB

// ✅ Always check before using
if (node) {
  node.add(child)
} else {
  console.warn('Node not found in GLB: NodeName')
}
```

**5. EVM vs Web3 Context**
```javascript
// ❌ world.evm is NOT available to apps in SES sandbox
// It only exists in React component layer (EVM.js)
if (world.evm) { } // This will be false in apps!

// ✅ Use world.connectEthereumWallet() (injected for apps)
// This is available through the web3 system integration
const result = await world.connectEthereumWallet('metamask')
```

**Correct Pattern for Wallet Apps:**
```javascript
// Simple wallet connection (works in app context)
app.on('init', () => {
  if (!world.connectEthereumWallet) {
    console.error('❌ Web3 not configured - use hypkg.sh/hypkg/evm')
    return
  }
})

async function connect() {
  const result = await world.connectEthereumWallet('metamask')
  // Use result.address, result.provider, etc.
}
```

**6. WebView Nodes Require Special Pointer Handling**
```javascript
// WebViews render in CSS3D layer (DOM) separate from WebGL scene
// A proxy mesh in WebGL receives raycast hits, but iframe interaction
// requires explicit pointer-events management due to pointer lock

// ✅ CORRECT - Desktop: First click unlocks pointer and enables iframe
// The WebView node's onPointerDown handler:
// 1. Unlocks pointer if locked
// 2. Immediately sets iframe.style.pointerEvents = 'auto'
// 3. Subsequent clicks go to iframe content

// ✅ Mobile: iframe.pointerEvents always 'auto' (no pointer lock)

// Common issues:
// - If iframe doesn't receive clicks: Check onPointerDown enables pointer-events
// - If scrolling doesn't work: Ensure iframe.scrolling = 'yes' and overflow = 'auto'
// - If mouseleave disables too fast: Add interaction stabilization delay
```

### UI System Limitations

1. **No responsive sizing** - Must use explicit pixel values
2. **No CSS animations** - Manual updates only
3. **No relative positioning** - Fixed ratios or pixels only
4. **No z-index control** - Cannot manage overlapping elements
5. **No 3D transformations** - 2D only
6. **Fixed dimensions** - Cannot use `auto` or percentages

### Proper App Patterns

**Entity Access:**
```javascript
// Get nodes from GLB (Blender object names)
const body = app.get('WalletUI') // Node name from GLB

// Create only new UI elements
const ui = app.create('ui', { space: 'screen' })

// ⚠️ ALWAYS check if node exists before calling methods
if (body) {
  body.add(ui)
} else {
  console.warn('Node not found in GLB')
}
```

**Action Configuration:**
```javascript
app.create('action', {
  label: 'Connect',
  distance: 3,    // Not maxDist
  duration: 0.3,  // Hold duration
  onTrigger: connectWallet // Not onDown
})
```

**UI Updates:**
```javascript
// Use .set() method, not direct assignment
statusText.set({ value: 'Connected', color: '#00ff00' })
```

**Configuration Access:**
```javascript
// Use app.props, not app.config
const buttonText = app.props.buttonText || 'Default'
```

### Common Working Patterns

**State Management:**
```javascript
app.state.connected = false
app.state.address = null
```

**Event Handling:**
```javascript
app.on('update', (delta) => {
  // Per-frame logic
  if (!world.isClient) return // Server/client checks
})

world.network?.on('evmConnect', (address) => {
  app.state.connected = true
  updateUI()
})
```

**UI Event Handlers:**
Hyperfy UI elements use direct property assignment for event handlers (different from DOM events). See [UI_EVENT_HANDLERS.md](./UI_EVENT_HANDLERS.md) for comprehensive documentation.

```javascript
// ✅ CORRECT - Direct property assignment
const button = app.create('uiview', { interactive: true })

button.onPointerDown = () => {
  console.log('Button clicked!')
  connectWallet()
}

button.onPointerOver = () => {
  button.backgroundColor = '#008000' // Hover effect
}

button.onPointerOut = () => {
  button.backgroundColor = '#00a000' // Normal state
}
```

**Environment Detection:**
```javascript
if (world.isClient) {
  // Client-only code
}

if (world.isServer) {
  // Server-only code
}
```

**Animation & Interaction Examples**

#### Simple Animation with Delta Time
```javascript
app.state.rotation = 0
app.state.speed = Math.PI // radians per second

app.on('update', (delta) => {
  if (!world.isClient) return

  // Rotate continuously
  app.state.rotation += app.state.speed * delta

  const node = app.get('RotatingObject')
  if (node) {
    node.set({
      rotation: [0, app.state.rotation, 0]
    })
  }
})
```

#### Smooth Movement with Vector3.lerp
```javascript
app.state.targetPosition = new THREE.Vector3(10, 0, 5)
app.state.currentPosition = new THREE.Vector3(0, 0, 0)
app.state.moveSpeed = 2.0 // seconds to reach target

app.on('update', (delta) => {
  if (!world.isClient) return

  const node = app.get('MovingObject')
  if (!node) return

  // Smooth interpolation
  const factor = Math.min(delta / app.state.moveSpeed, 1)
  app.state.currentPosition.lerp(
    app.state.targetPosition,
    factor
  )

  node.position.copy(app.state.currentPosition)
})
```

#### Trigger Zones for Player Detection
```javascript
app.state.isPlayerNearby = false

app.on('init', () => {
  // Create invisible trigger zone
  const trigger = app.create('collider', {
    shape: 'box',
    size: [3, 2, 3], // 3m × 2m × 3m area
    trigger: true,   // No physics collision, only triggers
    visible: false
  })

  const body = app.get('TriggerZone')
  if (body) body.add(trigger)

  // Listen for trigger events
  trigger.on('triggerEnter', (player) => {
    app.state.isPlayerNearby = true
    console.log('Player entered zone')
  })

  trigger.on('triggerExit', (player) => {
    app.state.isPlayerNearby = false
    console.log('Player left zone')
  })
})
```

#### Action Labels for Interaction
```javascript
app.on('init', () => {
  // Create interactive button
  const button = app.create('action', {
    label: 'Press E to Interact', // Display message
    distance: 3,                   // Max interaction distance
    duration: 0.1                  // Instant activation
  })

  button.on('trigger', () => {
    console.log('Button pressed!')
    performAction()
  })

  const body = app.get('ButtonNode')
  if (body) body.add(button)
})

// Hold-to-charge action
app.on('init', () => {
  const chargeAction = app.create('action', {
    label: 'Hold to Charge',
    distance: 3,
    duration: 2.0 // 2 second hold time
  })

  chargeAction.on('start', () => {
    app.state.isCharging = true
    app.state.chargeAmount = 0
  })

  chargeAction.on('progress', (progress) => {
    app.state.chargeAmount = progress // 0 to 1
    updateChargeBar(progress)
  })

  chargeAction.on('trigger', () => {
    app.state.isCharging = false
    releaseChargedAttack(app.state.chargeAmount)
  })

  chargeAction.on('cancel', () => {
    app.state.isCharging = false
  })
})
```

### Example App Structure

**Simplified Pattern (Recommended)**: Like `wallet-connect-base.js` and `starknetkit` - no GLB required:
```javascript
// Direct app.add() pattern - simplest, works without 3D model
const mainUI = app.create('ui', { space: 'screen' })
app.add(mainUI) // Done!
```

**Advanced Pattern**: Attach to GLB nodes if needed

```javascript
// Configuration
app.configure([
  { key: 'buttonText', type: 'text', initial: 'Connect' }
])

// State
app.state.connected = false

// Get GLB nodes
const body = app.get('WalletNode')

// Create UI
const ui = app.create('ui', {
  space: 'screen',
  position: [0.5, 0.1, 0],
  width: 200,
  height: 60
})

const text = app.create('uitext', {
  value: '🌐 Disconnected',
  color: '#cccccc',
  fontSize: 14
})

ui.add(text)

// Two attachment patterns:

// 1. Simple: Attach directly to app (like starknetkit - no GLB needed)
app.add(ui)

// 2. Advanced: Attach to GLB node
const body = app.get('NodeFromGLB')
if (body) {
  body.add(ui)
} else {
  // Fallback: attach to app
  app.add(ui)
}

// Click handling:

// Simple: Use uiview with onClick (like starknetkit)
const button = app.create('uiview', {
  onClick: connectWallet
})

// OR traditional action (requires distance/duration)
const action = app.create('action', {
  label: 'Connect',
  distance: 3,
  duration: 0.3,
  onTrigger: connectWallet
})
if (body) body.add(action)

// Functions
async function connectWallet() {
  if (!world.evm) {
    console.error('EVM not available')
    return
  }
}

// Events
app.on('init', () => {
  console.log('App initialized')
})
```

### Key Files for Reference
- `/home/blank/hyperfy/examples/web3/cartridge/cartridge.js` - Working wallet app
- `/home/blank/hyperfy/examples/essentials/stamina-system.js` - State management
- `/home/blank/hyperfy/examples/web3/starknetkit/wallet-connect.js` - Multi-wallet selector

## Development Best Practices

### Start Simple, Add Complexity
```javascript
// ✅ Step 1: Get basic functionality working
app.on('init', () => {
  console.log('App started')
  app.state.value = 0
})

// Step 2: Add configuration
app.configure([
  { key: 'startValue', type: 'number', initial: 0 }
])

// Step 3: Add UI
const ui = app.create('ui', {
  space: 'screen',
  position: [0.5, 0.1, 0],
  width: 0.3,
  height: 0.2
})

// Step 4: Add networking
app.on('update', (delta) => {
  if (!world.isServer) return
  world.network.send('update', { value: app.state.value })
})
```

### Test in Isolation
```javascript
// ✅ Test without dependencies
function testMath() {
  const result = add(2, 3)
  console.assert(result === 5, 'Addition failed')
}

// Test render
function testUI() {
  const ui = createTestUI()
  app.add(ui)
  console.log('UI rendered:', ui)
}

app.on('init', () => {
  testMath()
  testUI()
})
```

### Use console.log Extensively
```javascript
// ✅ Debug everything
app.on('init', () => {
  console.log('1. INIT - Starting app')
  console.log('2. World type:', world.isClient ? 'CLIENT' : 'SERVER')
  console.log('3. Available nodes:', app.nodes)
})

app.on('update', (delta) => {
  // Log once per second to avoid spam
  if (Math.random() < delta) { // Roughly once per second
    console.log('Update delta:', delta.toFixed(4))
  }
})

function connectWallet() {
  console.log('A. Connecting wallet...')

  world.connectEthereumWallet('metamask')
    .then((result) => {
      console.log('B. Success:', result.address)
    })
    .catch((error) => {
      console.error('C. Error:', error)
    })
}
```

### Verify Nodes Exist
```javascript
// ✅ Always check before using nodes
const node = app.get('ImportantNode')

if (!node) {
  console.error('❌ Node "ImportantNode" not found in GLB')
  // Provide clear instructions
  console.error('   Required: GLB must contain object named "ImportantNode"')
  return
}

// Proceed with confidence
node.add(childNode)
console.log('✅ Node found and configured')
```

### Measure Performance
```javascript
app.state.metrics = {
  frameCount: 0,
  lastReport: 0
}

app.on('update', (delta) => {
  app.state.metrics.frameCount++

  // Report every 5 seconds
  const now = performance.now()
  if (now - app.state.metrics.lastReport > 5000) {
    const fps = app.state.metrics.frameCount / 5
    console.log('FPS:', fps.toFixed(1))

    if (fps < 55) {
      console.warn('Performance issue detected!')
    }

    app.state.metrics.frameCount = 0
    app.state.metrics.lastReport = now
  }
})
```

### Clean Up on Destroy
```javascript
let intervalId = null
let eventHandler = null

app.on('init', () => {
  // Set up recurring task
  intervalId = setInterval(() => {
    console.log('Periodic task')
  }, 1000)

  // Set up event listener
  eventHandler = (data) => console.log('Event:', data)
  world.network.on('customEvent', eventHandler)
})

app.on('cleanup', () => {
  console.log('Cleaning up resources...')

  // Clear interval
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }

  // Remove event listener
  if (eventHandler) {
    world.network.off('customEvent', eventHandler)
    eventHandler = null
  }

  // Clean up nodes
  const node = app.get('DynamicNode')
  if (node) {
    node.destroy()
  }
})
```

## Code Organization Patterns

### Simple App (Single File, <200 Lines)
```javascript
// app.js - Complete app in one file
app.configure([
  { key: 'speed', type: 'number', initial: 1 }
])

app.state.rotation = 0

app.on('init', () => {
  setupScene()
  setupUI()
})

app.on('update', (delta) => {
  if (!world.isClient) return
  app.state.rotation += delta * app.props.speed
  updateRotation()
})

function setupScene() { /* ... */ }
function setupUI() { /* ... */ }
function updateRotation() { /* ... */ }
```

### Complex App Splitting Patterns
```javascript
// app.js - Main entry
import '/apps/utils/render.js'
import '/apps/logic/physics.js'
import '/apps/ui/hud.js'

app.configure([/* ... */])
app.on('init', initApp)

// utils/render.js
export function initRenderer() { /* ... */ }
export function renderFrame() { /* ... */ }

// logic/physics.js
export function initPhysics() { /* ... */ }
export function updatePhysics(delta) { /* ... */ }

// ui/hud.js
export function createHUD() { /* ... */ }
export function updateHUD() { /* ... */ }
```

### Reusable Component Pattern
```javascript
// components/Button.js
export function createButton(label, onClick) {
  const button = app.create('uiview', {
    space: 'screen',
    interactive: true,
    onClick: onClick
  })

  const text = app.create('uitext', {
    value: label,
    fontSize: 18,
    color: '#ffffff'
  })

  button.add(text)
  return button
}

// Usage in app
import { createButton } from '/components/Button.js'

app.on('init', () => {
  const btn = createButton('Click Me', handleClick)
  app.add(btn)
})
```

### Configuration-Driven Approach
```javascript
// config.js
export const GAME_CONFIG = {
  player: {
    speed: 5.0,
    jumpHeight: 2.0,
    health: 100
  },
  world: {
    gravity: -9.81,
    timeLimit: 300
  },
  ui: {
    showHUD: true,
    theme: 'dark'
  }
}

// app.js
import { GAME_CONFIG } from './config.js'

app.on('init', () => {
  app.state.playerSpeed = GAME_CONFIG.player.speed
  setupWorld(GAME_CONFIG.world)
  setupUI(GAME_CONFIG.ui)
})
```

### Debugging Pattern with Flags
```javascript
const DEBUG = {
  LOG_STATE: false,
  SHOW_BOUNDS: true,
  SKIP_AUTH: false,
  AI_DISABLED: false
}

app.on('update', (delta) => {
  if (DEBUG.LOG_STATE) {
    console.log('App state:', app.state)
  }

  if (DEBUG.SHOW_BOUNDS) {
    renderDebugBounds()
  }

  if (!DEBUG.AI_DISABLED) {
    updateAI(delta)
  }
})

// Quick toggle in console
window.toggleDebug = (flag) => {
  DEBUG[flag] = !DEBUG[flag]
  console.log('Debug flags:', DEBUG)
}
```

## Common Development Tasks

### Getting Started Quickly
1. Copy `.env.example` to `.env`
2. Run `npm install`
3. Start with `npm run dev`
4. Open browser at port 3000 (or configured PORT)
5. Create files in `world/` folder for persistent content

### Adding New Systems
1. Inherit from `System` class in appropriate `systems/` directory
2. Register system with World in initialization order
3. Implement required lifecycle methods
4. Use `world.events.emit()` for cross-system communication

### Debugging Tips
- **Check browser console** - Most reliable feedback source
- **Use `world.web3.getDebugInfo()`** - Web3 system diagnostics
- **Test SES environment** - Try basic operations vs complex ones
- **Monitor network tab** - Binary protocol debugging
- **Check server logs** - Backend issues show there

## Performance Considerations

### 1. Multi-threading Awareness
- Physics runs on separate thread (WebAssembly)
- Fixed timestep critical for stability
- Asset loading in background threads
- Multiple systems update in parallel

### 2. Memory Management
- Proper cleanup in app `cleanup()` method
- Object pooling for frequently created objects
- Octree spatial partitioning for large worlds
- Physics system has its own memory management

### 3. Network Considerations
- Delta compression enabled by default
- Client-side prediction for smooth feel
- Priority-based update rates for distant objects
- Built-in interpolation for smooth movement
- ❌ DON'T use the ({...}) wrapper pattern
  - ✅ DO use direct JavaScript code at the top level
  - ✅ DO use app.configure() and app.create() directly
  - ✅ DO reference world and app globally, not as parameters
- this doens't work in hyperfy
  app.import('/examples/essentials/stamina-system.js')
- anything in /examples is to be considered untested until i say so
### WebView Node Interaction - CRITICAL

**iframe.pointerEvents must be 'auto' permanently** - Toggling pointer-events between 'auto' and 'none' breaks interaction entirely.

**What works:**
```javascript
// ✅ CORRECT - Set once and never change
iframe.style.pointerEvents = 'auto'  // Permanent

// Mouse events only control CSS3D stabilization, not pointer-events
inner.addEventListener('mouseenter', () => {
  this.objectCSS.interacting = true  // Stop CSS3D updates
})
inner.addEventListener('mouseleave', () => {
  this.objectCSS.interacting = false  // Resume CSS3D updates
})
```

**What breaks:**
```javascript
// ❌ WRONG - Toggling pointer-events
inner.addEventListener('mouseenter', () => {
  iframe.style.pointerEvents = 'auto'  // Breaks interaction flow
})
inner.addEventListener('mouseleave', () => {
  iframe.style.pointerEvents = 'none'   // iframe becomes dead
})
```

**Why:** When pointer-events is toggled to 'none' on mouseleave, the iframe becomes non-interactive. The next click on the WebView will unlock the pointer (onPointerDown) but the iframe remains at pointer-events:none, preventing any interaction.

**Desktop behavior:**
1. Click WebView mesh → onPointerDown unlocks pointer 
2. iframe already has pointer-events:auto → immediately interactive
3. CSS3D updates paused during interaction (objectCSS.interacting = true)

**Mobile behavior:**
- No pointer lock → iframe always interactive
- CSS3D updates still paused during interaction for smooth scrolling

**Key insight from debugging:** The agentic-hyperfy approach works because it keeps pointer-events 'auto' during interaction. The toggle approach fails because mouseleave disables the iframe before the user can interact with it.

**7. CSS Layer pointer-events MUST be 'auto' for WebView interaction**
```javascript
// In src/client/world-client.js, .App__cssLayer must have:
// ❌ WRONG - Blocks ALL child elements from receiving events
.App__cssLayer { pointer-events: none; }

// ✅ CORRECT - Allows CSS3D elements to control their own event handling
.App__cssLayer { pointer-events: auto; }
```

**Why:** When a parent element has `pointer-events: none`, ALL child elements are blocked from receiving events, regardless of their own pointer-events setting. This is standard CSS behavior - the parent's setting takes precedence.

**How it works:**
1. `cssLayer:pointer-events:auto` allows event propagation into the CSS3D layer
2. Individual CSS3D elements control their own pointer-events:
   - WebView iframes: `pointer-events: auto` (receives clicks)
   - Non-interactive CSS3D objects: `pointer-events: none` (lets events fall through to WebGL)
3. Empty space in CSS3D layer allows events to reach WebGL canvas below

**WebView hierarchy for interaction:**
```javascript
// All elements in the chain must allow pointer-events:
document.body (pointer-events: auto)
  → cssLayer (pointer-events: auto)  // WAS 'none', CHANGED to 'auto'
    → CSS3DObject.element (no explicit setting)
      → container (pointer-events: auto)
        → inner (pointer-events: auto)
          → iframe (pointer-events: auto)  // Receives clicks!
```

**Common mistake:**
```javascript
// This breaks everything:
// Even though iframe has pointer-events:auto, the parent cssLayer:none blocks it
.cssLayer { pointer-events: none; }  // ❌ Blocks all child elements
iframe { pointer-events: auto; }      // ❌ Still blocked by parent
```

**Testing:**
- Open /world/simple-interaction.app.json
- Click on the WebView
- Should be able to click links and scroll content

📝 **NOTE:** The agentic-hyperfy branch appears to work with `cssLayer:pointer-events:none` by toggling iframe pointer-events. This technically shouldn't work according to CSS specs, suggesting either:
1. A browser bug/quirk that was version-specific
2. CSS3DRenderer creates a special rendering context
3. The implementation was buggy but worked in specific conditions

Our testing shows that `cssLayer:pointer-events:auto` is the correct, spec-compliant approach.

**8. WebView Interaction Requires Dynamic Canvas Pointer-Events**
```javascript
// The WebGL canvas renders at z-index:1, CSS3D layer at z-index:0
// This means canvas is ON TOP of CSS3D content, blocking iframe clicks

// Solution: Dynamically toggle canvas pointer-events
// src/core/systems/ClientGraphics.js
init() {
  this.renderer.domElement.style.pointerEvents = 'none' // Start disabled
}

// src/core/nodes/WebView.js
this.onPointerDown = () => {
  // ... unlock pointer ...
  // When interacting with WebView, disable canvas pointer-events
  this.ctx.world.graphics.setCanvasPointerEvents(false) // 'none'
}

mouseEnterHandler = () => {
  // Mouse over WebView - disable canvas to allow iframe clicks
  this.ctx.world.graphics.setCanvasPointerEvents(false)
}

mouseLeaveHandler = () => {
  // Mouse left WebView - enable canvas for WebGL interactions
  this.ctx.world.graphics.setCanvasPointerEvents(true) // 'auto'
}
```

**Why this is needed:**

DOM structure in src/client/world-client.js:
```
viewport (z-index not set)
  ├── cssLayer (z-index: 0)
  ├── WebGL canvas (z-index: 1, position: relative) ← ON TOP
  └── UI layer (z-index: 2)
```

Since WebGL canvas has both:
- Higher z-index (1 vs 0)
- `position: relative` (creates stacking context)

It renders ON TOP of the CSS3D layer, blocking all clicks to iframes below.

**The fix:** Dynamically set `canvas.style.pointerEvents`:
- When over WebView: `pointer-events: none` (clicks fall through to CSS3D/iframe)
- When not over WebView: `pointer-events: auto` (WebGL interactions work)

**Alternative approaches considered:**
1. ❌ Swap z-index (canvas:0, cssLayer:1) - Would hide WebGL content behind CSS3D
2. ❌ Keep canvas pointer-events:none always - Would break WebGL click interactions
3. ✅ Dynamic toggling - Best of both worlds!

**Testing:**
1. Run: npm run dev
2. Open: /world/simple-interaction.app.json
3. Click WebView to unlock pointer
4. Verify: Can click links and scroll in iframe
5. Verify: When mouse leaves WebView, WebGL clicks work again
6. Verify: Camera controls work when not over WebView

**Important note:** The combination of these changes is required:
1. cssLayer: pointer-events: auto (from previous fix)
2. WebView elements: pointer-events: auto (from previous fix)
3. Canvas: dynamic pointer-events toggling (this fix)

📝 **HISTORY:** We initially thought cssLayer:pointer-events:auto would fix it,
but the canvas z-index issue was blocking events regardless. The complete fix
requires BOTH cssLayer:auto AND dynamic canvas pointer-events control.

**9. CRITICAL DISCOVERY: WebView Uses CSS3DRenderer Event Bypass**

After extensive debugging and 0 interaction results, discovered that **agentic-hyperfy uses completely different approach than standard CSS:**

## The Agentic-Hyperfy Approach (WORKING):
```javascript
// DOM structure remains STANDARD:
cssLayer (z-index: 0, pointer-events: none)  // ⚠️ NOT auto!
  → CSS3DObject container  // No explicit pointer-events
    → inner div  // pointer-events: none
      → iframe  // pointer-events: TOGGLED!

// Event handling:
inner.addEventListener('mouseenter', () => {
  iframe.style.pointerEvents = 'auto'  // Enable on hover
})
inner.addEventListener('mouseleave', () => {
  iframe.style.pointerEvents = 'none'   // Disable on leave
})
```

## Why This Counter-Intuitive Approach Works:

**CSS3DRenderer creates special rendering context where:**
1. Normal CSS parent-child pointer-events rules DON'T apply
2. iframes in CSS3D are rendered as **compositing layers**
3. **They don't participate in normal DOM event bubbling**
4. iframe's pointer-events setting controls ONLY the iframe (not blocked by parents)

**Standard CSS rules:**
- Parent `pointer-events:none` → ALL children blocked
- **BUT CSS3D iframes are special case!**

## Our Failed Approach (NOT WORKING):
```javascript
// We tried STANDARD CSS:
cssLayer (pointer-events: auto)  // Enable all
  → container (pointer-events: auto)
    → inner (pointer-events: auto)
      → iframe (pointer-events: auto)  // Always on

// Result: 0 interaction (even though it should work per CSS spec)
```

**Why it failed:** CSS3D iframes don't follow normal CSS flow, so standard approach doesn't apply!

## The Working Fix (CURRENT):
```javascript
// After implementing agentic-hyperfy approach:

// Set parents to none (doesn't block iframe in CSS3D!)
container.style.pointerEvents = 'none'
inner.style.pointerEvents = 'none'

// Toggle ONLY iframe (this works in CSS3D context)
inner.addEventListener('mouseenter', () => {
  if (isDesktop) {
    iframe.style.pointerEvents = 'auto'
    ctx.world.graphics.setCanvasPointerEvents(false)
  }
})
inner.addEventListener('mouseleave', () => {
  if (isDesktop) {
    iframe.style.pointerEvents = 'none'
    ctx.world.graphics.setCanvasPointerEvents(true)
  }
})

// Mobile: always on (no toggling)
if (!isDesktop) {
  iframe.style.pointerEvents = 'auto'
}
```

## Testing This Fix:

Run: `npm run dev`
Open: /world/agentic-approach-test.app.json

Expected behavior:
1. Hover mouse over WebView → iframe.pointer-events becomes 'auto'
2. Click WebView → pointer unlocks, iframe remains 'auto'
3. Click links/scroll in iframe → should work!
4. Move mouse away → iframe.pointer-events becomes 'none'

Check console for: "[ClientGraphics] Canvas pointer-events set to:"

## Key Insights:

- **CSS3DRenderer iframes are rendering edge cases**
- **Normal CSS pointer-events rules don't apply**
- **Only iframe's own pointer-events matters (not parents)**
- **Toggling approach works (even though CSS spec says it shouldn't)**
- **This is browser/CSS3D-specific behavior, not standard**

## Why We Were Wrong:

We assumed CSS3D iframes follow normal DOM event propagation, but they don't. CSS3DRenderer creates special rendering contexts where iframes are handled differently.

**Lesson:** Always test and verify with the actual implementation, not just CSS specs!
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
