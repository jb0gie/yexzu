# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the Hyperfy codebase.

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
Apps are JavaScript code that runs in a secure sandboxed environment on both client and server. Apps can be created directly in the world editor or loaded from `.hyp` files.

### Important: SES Environment Restrictions
Hyperfy uses SES (Secure ECMAScript) for security:
- **NEVER use ES6 `export` or `import` syntax** - SES will throw errors
- **Always wrap apps in parentheses** when using the object return format
- **Use only approved global APIs and objects**
- **No direct `eval()` or `new Function()` usage**
- **Avoid browser-specific APIs** that aren't explicitly provided

### App Format - Object Return (Recommended)
```javascript
({
  init() {
    // Initialize app
    this.cube = this.app.get('cube')
  },
  
  update(delta) {
    // Frame update
    if (this.cube) {
      this.cube.rotation.y += 0.01
    }
  },
  
  fixedUpdate(delta) {
    // Physics update
  },
  
  cleanup() {
    // Clean up resources
  }
})
```

### App Format - Global App (Simple)
```javascript
// Direct use of the app global
app.configure([
  // Configuration options...
])

const myObject = app.create('mesh')
app.add(myObject)

app.on('update', (dt) => {
  // Update logic
})
```

### Available Global Objects
- **`app`**: The main app instance for managing your application
- **`world`**: World state and interactions with environment and players
- **`props`**: App configuration values (shorthand for app.config)
- **`config`**: Alias for app.config
- **`THREE`**: Three.js library for 3D operations
- **`Vector3`**, **`Quaternion`**, **`Euler`**, **`Matrix4`**: Math utilities

### Input System - Using app.control()
For keyboard and mouse input in apps, use the `app.control()` method:

```javascript
// Get control interface
const control = app.control()
if (!control) {
  console.warn('No control interface available')
  return
}

// Capture specific keys
control.bracketLeft.capture = true  // Capture [ key
control.bracketRight.capture = true // Capture ] key

// Check key states in update loop
app.on('update', () => {
  if (control.bracketLeft && control.bracketLeft.pressed) {
    // [ key was pressed this frame
  }
  if (control.keyW && control.keyW.down) {
    // W key is being held down
  }
})
```

**Note**: The `app.on('keydown')` pattern does NOT work - keyboard events are not forwarded to apps. Always use `app.control()` for input handling.

### Configuration System
Apps can expose configuration UI using `app.configure()`:

```javascript
app.configure([
  {
    type: 'text',
    key: 'title',
    label: 'Title',
    initial: 'Default Title'
  },
  {
    type: 'file',
    key: 'audioFile',
    kind: 'audio',
    label: 'Background Music'
  },
  {
    type: 'switch',
    key: 'theme',
    label: 'Theme',
    initial: 'neon',
    options: [
      { value: 'neon', label: 'Neon' },
      { value: 'dark', label: 'Dark' },
      { value: 'light', label: 'Light' }
    ]
  },
  {
    key: 'neonColor',
    type: 'color',
    label: 'Neon Color',
    initial: '#00ffaa',
    when: [{ key: 'theme', op: 'eq', value: 'neon' }] // Conditional field
  }
])

// Access configuration values
const title = props.title || app.config.title
const audioUrl = app.config.audioFile?.url
```

### Client-Server Communication
```javascript
// Client-side
if (world.isClient) {
  const action = app.create('action')
  action.onTrigger = () => {
    app.send("cube:move", { data: 123 })
  }
  
  app.on("cube:position", (data) => {
    app.position.fromArray(data)
  })
}

// Server-side
if (world.isServer) {
  app.on("cube:move", (data, networkId) => {
    app.position.y += 1
    app.send("cube:position", app.position.toArray())
  })
}
```

### Node Types Available
`action`, `anchor`, `audio`, `avatar`, `camera`, `collider`, `controller`, `group`, `image`, `joint`, `lod`, `mesh`, `nametag`, `particles`, `prim`, `rigidbody`, `skinnedmesh`, `sky`, `snap`, `ui`, `uiview`, `uitext`, `uiimage`, `video`

## Camera System

### Creating Cameras
```javascript
const camera = app.create('camera', {
  name: 'my-camera',
  position: [10, 5, 10],
  rotation: [-0.3, 0.785, 0],
  active: false,  // Don't auto-activate
  attachToRig: false,  // Place in world space (not attached to player)
  isPlayerCamera: false,
  showHelper: true,  // Show camera frustum visualization
  
  // Camera settings
  fov: 50,
  near: 0.1,
  far: 2000,
  
  // Motion settings
  motion: {
    enabled: true,
    bobAmount: 0.002,
    bobSpeed: 0.02,
    swayAmount: 0.001,
    swaySpeed: 0.01,
    dampingFactor: 0.98
  },
  
  // DOF settings
  dof: {
    enabled: true,
    fStop: 2.8,
    focusDistance: 15,
    maxBlur: 0.03,
    autofocus: true
  },
  
  // Other effects
  bloom: { enabled: false, intensity: 0.5 },
  vignette: { enabled: false, offset: 0.35, darkness: 0.4 },
  filmGrain: { enabled: false, intensity: 0.25 }
})

app.add(camera)

// Activate camera
camera.active = true
```

## UI System

### UI Components and Limitations
The UI system uses Canvas-based rendering with Yoga layout engine. Important limitations:
- **No responsive sizing**: Width/height must be explicit pixel values (no `auto` or percentages)
- **No relative positioning**: Position is fixed, not relative to other elements
- **No CSS animations**: No transitions, keyframes, or CSS animations
- **No z-index control**: Render order determined by hierarchy
- **Basic shapes only**: No complex shapes or clip paths

### Creating UI
```javascript
// UI container in 3D world
const ui = app.create('ui', {
  width: 300,
  height: 200,
  backgroundColor: 'rgba(0, 15, 30, 0.8)',
  borderRadius: 20,
  padding: 15,
  billboard: 'full',  // Always face camera
  pivot: 'center',     // Anchor point
  position: [0, 2, 0], // 3D position
  size: 0.005         // Scale factor
})

// UI text element
const text = app.create('uitext', {
  value: 'Hello World',
  color: '#00ffaa',
  fontSize: 18,
  padding: 10
})

// Interaction events
text.onPointerDown = () => {
  text.color = '#ffffff'
}
text.onPointerUp = () => {
  text.color = '#00ffaa'
  performAction()
}

ui.add(text)
app.add(ui)
```

### Workaround for Responsive UI
```javascript
// Calculate screen dimensions using control
const control = app.control()
const screenWidth = control.screenWidth()
const screenHeight = control.screenHeight()

const ui = app.create('ui', {
  space: 'screen',
  width: screenWidth * 0.3,  // 30% of screen width
  height: screenHeight * 0.2, // 20% of screen height
})
```

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

## Code Style

### Formatting
- **No Semicolons**: Omit semicolons (enforced by Prettier)
- **Single Quotes**: Use single quotes for strings
- **Arrow Functions**: Prefer arrow functions for callbacks
- **Line Width**: 120 characters max
- **Trailing Commas**: ES5 style
- **2-Space Indentation**: Consistent throughout

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

## Performance Considerations

- **Fixed Timestep**: Physics runs at 60Hz fixed timestep
- **Variable Rendering**: Graphics update at display refresh rate
- **LOD System**: Distance-based level of detail
- **Culling**: Frustum and occlusion culling
- **Asset Streaming**: Progressive asset loading
- **Network Optimization**: Delta compression and interpolation

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
const mesh = app.create('mesh', {
  id: 'MyMesh',
  position: [0, 1, 0],
  rotation: [0, Math.PI, 0]
})
app.add(mesh)
```

### Network Packets
```javascript
// Client → Server
app.send('command', { action: 'jump' })

// Server → Clients  
app.send('snapshot', worldState)
```

## Common Issues and Solutions

### Camera Not Following Player
- Set `attachToRig: true` for player-attached cameras
- Set `attachToRig: false` for world-space cameras

### Keyboard Events Not Working
- Don't use `app.on('keydown')` - it doesn't work
- Use `app.control()` to access keyboard state

### UI Not Responsive
- UI dimensions must be explicit pixels, not percentages
- Calculate dimensions based on screen size using `control.screenWidth()`

### App Not Updating
- Ensure you've subscribed to update events: `app.on('update', callback)`
- Check that `app.keepActive = true` if needed

### Assets Not Loading
- Check file format is supported (GLB, VRM, JPG, PNG, MP3, MP4)
- Verify URL is correct in configuration
- Use optional chaining: `config.asset?.url`

## Best Practices

1. **Always clean up resources** in the `cleanup()` method
2. **Use object pooling** for frequently created/destroyed objects
3. **Minimize update subscriptions** - only subscribe when needed
4. **Cache calculations** that don't change every frame
5. **Use optional chaining** for nullable configuration values
6. **Separate client/server code** clearly with `if (world.isClient)` blocks
7. **Test multiplayer scenarios** with multiple browser tabs
8. **Profile performance** using stats-gl integration
9. **Document configuration fields** with clear labels and defaults
10. **Handle errors gracefully** with try/catch blocks

## Important Reminders

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files to creating new ones
- NEVER proactively create documentation files (*.md) unless explicitly requested
- Only use emojis if the user explicitly requests it
- Remember that keyboard events (`app.on('keydown')`) don't work - use `app.control()`
- Camera helpers show the frustum visualization, not the camera itself
- The engine uses a fixed timestep for physics (60Hz) with interpolation for smooth visuals
- right so there are a bunch of files in '/home/blank/hyperfy/examples'and it's getting confusing as to what we are doing let's start fresh using our new '/home/blank/hyperfy/CLAUDE.md' and make a working '/home/blank/hyperfy/examples/camera-control-system.js' don't delete '/home/blank/hyperfy/examples/camera-dof-bridge.js' and anything todo with prims.