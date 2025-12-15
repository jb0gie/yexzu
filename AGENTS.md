# AGENTS.md

## Commands

```bash
npm run dev          # Full dev mode with hot reload
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format with Prettier
npm run check        # Lint + format
node test-<name>.js  # Run single test file
```

## Code Style

- **No semicolons**, single quotes, 2-space indent, 120 char width
- **ES6 modules** (import/export), prefer const, no var
- **Arrow functions** for callbacks, async/await for async
- **Console**: only warn/error (no console.log in production)
- **Naming**: camelCase (variables/functions), PascalCase (classes), UPPER_SNAKE_CASE (constants)
- **Event handlers**: prefix with 'on' (onKeyDown)
- **Boolean vars**: start with 'is', 'has', 'should'
- **Temp vars**: prefix with underscore (_v1, _q1)

## Architecture

- `src/core` - Shared core (World, Systems, Entities, Nodes)
- `src/client` - Client code (React, Three.js, UI)
- `src/server` - Server code (Fastify, WebSocket, DB)
- **ECS pattern**: World → Systems → Entities → Nodes
- **10-phase update loop**: preTick → fixedUpdate (60Hz) → update → lateUpdate → postTick

## App Development (SES Sandbox)

- **No ES6 export/import** in apps
- **Wrap apps**: `({ init() {}, update() {} })`
- **Use app.control()** for input (keyboard events don't work)
- **Implement cleanup()** method for resource disposal
- **Chat API broken**: use console.log instead of world.chat()
- **3D positioning**: wrap in try-catch, use fallbacks

## Key APIs

**World**: `world.isClient`, `world.isServer`, `world.getTime()`, `world.add/remove(node)`

**App**: `app.create('type', config)`, `app.control()`, `app.on/off()`, `app.send(event, data)`

**Node**: `position/rotation/scale`, `visible`, `collisionEnabled`, `add/remove(child)`

## Testing

- No formal test framework
- Manual test files: `node test-*.js`
- Test patterns in root directory

## Environment

- **Node**: 22.11.0
- **NPM**: >=10.0.0
- **Type**: ES modules
