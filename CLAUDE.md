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
│   └── 10+ more specialized systems
├── Nodes - Scene graph hierarchy
│   ├── Mesh, Camera, Audio, UI
│   ├── RigidBody, Collider, Joint
│   └── 15+ more node types
└── Apps - Sandbox JavaScript applications
```

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

## Development Constraints

### 1. SES Sandbox Environment
Apps execute in controlled sandbox with restricted APIs. Always assume limited global access and use only provided APIs.

### 2. UI System Limitations
- **No responsive sizing** - Use explicit pixel values
- **No CSS animations** - Manual updates only
- **Fixed positioning** - No relative layouts
- **Basic shapes only** - Complex interactions manually implemented

### 3. Networking Constraints
- **Fixed timestep physics** - 60Hz - don't exceed
- **Variable render updates** - Adapt to display refresh
- **Binary protocol only** - Use provided message helpers
- **Authoritative server** - Server is ground truth

### 4. Asset Pipeline
- **Content-addressed storage** - Assets identified by SHA-256 hash
- **Automatic deduplication** - Duplicate binaries automatically handled
- **Streaming loads** - Progressive asset loading built-in
- **Format limits** - GLB, VRM, HTML, Canvas, Audio, Video

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