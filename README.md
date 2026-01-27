# Hyperfy ⚡️

<div align="center">
  <img src="overview.png" alt="Hyperfy Ecosystem" width="100%" />
  <p>
    <strong>Build, deploy, and experience interactive 3D virtual worlds</strong>
  </p>
</div>

## What is Hyperfy?

Hyperfy is an open-source framework for building interactive 3D virtual worlds. It combines a powerful physics engine, networked real-time collaboration, and a component-based application system to create immersive experiences that can be self-hosted or connected to the wider Hyperfy ecosystem.

## 🧬 Key Features

- **Standalone persistent worlds** - Host on your own domain
- **Realtime content creation** - Build directly in-world
- **Interactive app system** - Create dynamic applications with JavaScript
- **Portable avatars** - Connect via Hyperfy for consistent identity
- **Physics-based interactions** - Built on PhysX for realistic simulation
- **WebXR support** - Experience worlds in VR
- **WebView nodes** - Display interactive web content in 3D space
- **Extensible architecture** - Highly customizable for various use cases

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/hyperfy-xyz/hyperfy)

## 🚀 Quick Start

### Prerequisites

- Node.js 22.11.0+ (via [nvm](https://github.com/nvm-sh/nvm) or direct install)

### Installation

```bash
# Clone the repository
git clone https://github.com/hyperfy-xyz/hyperfy.git my-world
cd my-world

# Copy example environment settings
cp .env.example .env

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Docker Deployment

For containerized deployment, check [DOCKER.md](DOCKER.md) for detailed instructions.

## 🧩 Use Cases

- **Virtual Events & Conferences** - Host live gatherings with spatial audio
- **Interactive Showrooms** - Create product displays and demos
- **Social Spaces** - Build community hubs for collaboration
- **Gaming Environments** - Design immersive game worlds
- **Educational Experiences** - Develop interactive learning spaces
- **Creative Showcases** - Display 3D art and interactive installations

## 📚 Documentation & Resources

- **[Community Documentation](https://docs.hyperfy.xyz)** - Comprehensive guides and reference
- **[Website](https://hyperfy.io/)** - Official Hyperfy website
- **[Sandbox](https://play.hyperfy.xyz/)** - Try Hyperfy in your browser
- **[Twitter/X](https://x.com/hyperfy_io)** - Latest updates and announcements

## 💡 Examples

The `/examples` directory contains sample applications demonstrating Hyperfy patterns:

### Web3 Wallet Connection Examples

**EVM Wallet Connect** (`/examples/web3/evm/wallet-connect.js`)
- Connect to MetaMask and EVM-compatible wallets
- Minimal status UI with proximity trigger zone
- Quick action hotkey (Q) for instant connect/disconnect
- Uses `world.evm` API with `result.success/error` pattern
- ENS name resolution with 5-minute caching
- Fixed reconnection state management (see CLAUDE.md for details)

**Cartridge Integration** (`/examples/web3/cartridge/cartridge.js`)
- StarkNet wallet integration via Cartridge Controller  
- Same UI patterns as EVM wallet (status bar, trigger zone)
- Uses different API pattern (see cartridge-specific docs)

Both examples follow standardized patterns now documented in `CLAUDE.md`:
- **EVMClient State Synchronization** - Critical state management rules
- Entity-based interaction with Action system
- Minimal screen-space UI attached to world entities
- Optional proximity trigger zones
- Configurable quick action keys
- Event emissions for cross-app communication
- Error handling with user cancellation detection

### Particle & VFX Examples

**Ocean Simulation** (`/examples/particles/ocean.js`)
- Modern Hyperfy v2+ particle system patterns
- Uses `app.create('prim')` for water surface (no templates)
- Uses `app.create('particles')` with physics forces
- 17 configurable parameters via `app.configure()`
- Demonstrates burst emission, range syntax, and particle lifecycle
- Reference implementation for modern particle effects

**VFX Collection** (`/examples/vfx/`)
- Meteor showers with raycast collision detection
- Fire, smoke, rain, and weather effects
- Healing and glow particle systems
- Tornado and water fountain effects
- All using modern `app.create('particles')` patterns


## 📏 Project Structure

```
docs/              - Documentation and references
src/
  client/          - Client-side code and components
  core/            - Core systems (physics, networking, css3d, entities)
  server/          - Server implementation
CHANGELOG.md       - Version history and changes
```

## 🛠️ Development

### Architecture Principles

This codebase follows strict architectural principles documented in `CLAUDE.md`:

- **No Mocks/Fallbacks** - Systems fail fast with clear errors instead of silent fallbacks
- **Client/Server Separation** - Some systems (like DojoSystem) are client-side only due to WASM requirements
- **Duplicate Code Prevention** - ES6 class property accessors must be unique (see WebView.js patterns)

Refer to `CLAUDE.md` for detailed technical caveats and implementation patterns.

### Key Commands

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start

# Clean orphaned assets (experimental)
npm run world:clean

# Viewer only (development)
npm run viewer:dev

# Client only (development)
npm run client:dev

# Linting
npm run lint
npm run lint:fix
```

## 🖊️ Contributing

Contributions are welcome! Please check out our [contributing guidelines](CONTRIBUTING.md) and [code of conduct](CODE_OF_CONDUCT.md) before getting started.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a pull request

## 🌱 Project Status

This project is still in alpha as we transition all of our [reference platform](https://github.com/hyperfy-xyz/hyperfy-ref) code into fully self hostable worlds.
Most features are already here in this repo but still need to be connected up to work with self hosting in mind.
Note that APIs are highly likely to change during this time.
