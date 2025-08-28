# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
```bash
# Development mode with hot reload
npm run dev

# Production build and run
npm run build
npm start

# Code quality
npm run lint          # Check code style
npm run lint:fix      # Auto-fix linting issues
npm run format        # Format code with Prettier
npm run check         # Run both lint and format

# Specialized development modes
npm run viewer:dev    # Viewer-only development mode
npm run client:dev    # Client-only development mode
npm run node-client:dev  # Node client development

# World management
npm run world:backup  # Backup world data
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Key environment variables:
   - `WORLD=world` - The world folder to run
   - `PORT=3000` - Server port
   - `JWT_SECRET` - Token signing secret
   - `ADMIN_CODE` - Admin access code (leave blank for open admin)
   - `ASSETS=local|s3` - Asset storage mode
   - `DB_URI=local|postgres://...` - Database configuration

## High-Level Architecture

### Core System Design
The project implements a **hybrid ECS architecture** with:
- **World Class**: Central orchestrator managing all systems with a multi-phase update loop
- **Systems**: Modular systems (Physics, Networking, Graphics, etc.) that register with World
- **Entities**: Specialized objects (App, PlayerLocal, PlayerRemote) that can be networked
- **Nodes**: Hierarchical scene graph nodes (Mesh, RigidBody, Collider, etc.) with Three.js integration

### Update Loop Phases
Systems update in this specific order:
1. `preTick()` → `preFixedUpdate()` → `fixedUpdate()` → `postFixedUpdate()`
2. `preUpdate()` → `update()` → `postUpdate()` → `lateUpdate()` → `postLateUpdate()`
3. `commit()` → `postTick()`

### Client-Server Architecture
- **Authoritative Server**: Server maintains canonical world state
- **Client Prediction**: Clients predict local changes for responsiveness
- **Binary Protocol**: MessagePack (msgpackr) for efficient data serialization
- **WebSocket Transport**: Real-time bidirectional communication
- **Packet System**: Typed packets for snapshots, commands, chat, blueprints, entities

## Key Systems

### Core Systems (src/core/)
- **World**: System orchestration and lifecycle management
- **Entities**: Entity management (App, PlayerLocal, PlayerRemote)
- **Physics**: PhysX-based physics with collision detection
- **Apps**: Runtime script environment with SES sandboxing
- **Avatars**: VRM avatar system with animation state machine
- **Events**: Inter-app event communication

### Client Systems (src/client/)
- **ClientGraphics**: Three.js rendering, post-processing, shadows, DOF
- **ClientControls**: Input handling (keyboard, mouse, touch, XR)
- **ClientCameraControls**: Camera with DOF, focal length, ADS zoom
- **ClientBuilder**: In-world editing with transform controls
- **ClientLoader**: Asset loading (GLTF, VRM, textures, audio, video)
- **ClientNetwork**: WebSocket management and packet queuing

### Server Systems (src/server/)
- **Server**: Main server coordination
- **ServerNetwork**: Connection management and broadcasting
- **Database**: SQLite/PostgreSQL integration via Knex

## App Development

### App Structure
Apps are stored as `.hyp` files containing:
- Blueprint configuration (JSON)
- Bundled assets (models, scripts, textures)
- Node hierarchy definitions

### Available Node Types
`Action`, `Anchor`, `Audio`, `Avatar`, `Collider`, `Controller`, `Group`, `Image`, `LOD`, `Mesh`, `Particles`, `Prim`, `RigidBody`, `SkinnedMesh`, `Sky`, `UI components`, `Video`

### Script Environment
```javascript
export default {
  init({ app, world }) {
    // Initialize app
  },
  update({ app, world, delta }) {
    // Frame update
  },
  fixedUpdate({ app, world, delta }) {
    // Physics update
  },
  keydown({ event, world }) {
    // Handle keyboard input
  }
}
```

Scripts run in a secure SES sandbox with access to:
- World APIs
- Node manipulation
- Networking
- Event system

## Build System

### ESBuild Configuration
- **Format**: ESM modules
- **JSX Support**: React JSX transformation
- **Source Maps**: Enabled in development
- **Polyfills**: Node polyfills for browser compatibility
- **Entry Points**:
  - `src/index.js` → Full server + client
  - `src/viewer.js` → Viewer-only build
  - `src/client.js` → Client-only build

### Asset Pipeline
- **Hash-based Storage**: Content-addressed by SHA-256
- **Deduplication**: Automatic asset deduplication
- **Storage Options**: Local filesystem or S3
- **Supported Formats**: GLB, VRM, JPG, PNG, MP3, MP4

## Networking Details

### Packet Types
- `Snapshot`: World state updates
- `Command`: Player actions
- `Chat`: Chat messages
- `Blueprint`: App definitions
- `Entity`: Entity spawn/despawn
- `Asset`: Asset transfer

### WebSocket Protocol
- **Auth**: JWT token authentication
- **Binary Format**: MessagePack serialization
- **Compression**: Optional compression for large packets
- **Reconnection**: Automatic reconnection with state recovery

## VRM Avatar System

### Features
- **VRM 1.0 Support**: Full @pixiv/three-vrm integration
- **Animation States**: Idle, Walk, Run, Jump, Fall, Fly
- **Emotes**: Backflip, dance, wave, etc.
- **Cross-fading**: Smooth animation transitions
- **Look-At**: Eye tracking and head following
- **Physics**: Collision detection and response

### Animation Pipeline
- **Emote Factory**: Centralized animation management
- **State Machine**: Automatic state transitions
- **Performance**: Distance-based LOD and update rates

## Build Mode Features

### Transform Controls
- **Grab Mode**: Click and drag objects
- **Translate**: Move along axes
- **Rotate**: Rotate around axes
- **Scale**: Uniform and non-uniform scaling
- **Snapping**: Grid and rotation snapping

### Editor Features
- **Multi-Selection**: Shift-click for multiple selection
- **Hierarchy**: Node tree view and manipulation
- **Properties Panel**: Real-time property editing
- **Asset Import**: Drag-and-drop file support
- **Undo/Redo**: Action history management

## Code Style

### Formatting
- **No Semicolons**: Omit semicolons
- **Single Quotes**: Use single quotes for strings
- **Arrow Functions**: Prefer arrow functions without parentheses for single params
- **Line Width**: 120 characters max
- **Trailing Commas**: ES5 style

### Linting Rules
- **React**: Hooks rules enforced
- **No Console**: Warn except for warn/error
- **Prefer Const**: Use const over let when possible
- **No Var**: Never use var
- **Unused Variables**: Allowed with underscore prefix

### Ignored Paths
- `build/**`, `world/**`, `node_modules/**`
- `src/core/libs/**`, `src/core/vendors/**`
- `src/core/three-vrm/**`, `src/core/three/**`
- `physx-js-webidl.js` files

## Important Patterns

### System Registration
```javascript
class MySystem {
  constructor(world) {
    this.world = world
    world.register(this)
  }
  update(delta) { /* ... */ }
}
```

### Node Creation
```javascript
const mesh = app.create({
  type: 'mesh',
  name: 'MyMesh',
  url: 'model.glb',
  position: [0, 1, 0],
  rotation: [0, Math.PI, 0]
})
```

### Network Packets
```javascript
// Client → Server
network.send('command', { action: 'jump' })

// Server → Clients
network.broadcast('snapshot', worldState)
```

## Performance Considerations

- **Fixed Timestep**: Physics runs at 60Hz fixed timestep
- **Variable Rendering**: Graphics update at display refresh rate
- **LOD System**: Distance-based level of detail
- **Culling**: Frustum and occlusion culling
- **Asset Streaming**: Progressive asset loading
- **Network Optimization**: Delta compression and interpolation

## Database Schema

### SQLite/PostgreSQL Tables
- **blueprints**: App definitions and metadata
- **assets**: Asset hashes and references
- **players**: Player data and preferences
- **world**: World configuration and state

## Voice Chat (LiveKit)

Configure in `.env`:
- `LIVEKIT_WS_URL`: LiveKit server URL
- `LIVEKIT_API_KEY`: API key
- `LIVEKIT_API_SECRET`: API secret

## Testing

Currently no automated tests. Manual testing recommended:
1. Run `npm run dev`
2. Test in multiple browsers
3. Verify multiplayer functionality
4. Check build mode operations
5. Test asset uploads
6. Verify physics interactions