# XR Development Improvement Plan

## Current State Assessment

**Reality Check**: XR is currently the least tested and least functional platform in Hyperfy. While PC has mature apps and mobile is being actively developed, XR lacks:
- Feature parity with PC/mobile
- Comprehensive testing infrastructure
- Developer tooling and examples
- Performance optimization for headsets

**Goal**: Elevate XR to first-class citizen alongside PC and mobile within 3 months.

---

## Phase 1: Foundation & Testing Infrastructure (Weeks 1-2)

### 1.1 XR Testing Framework
**Priority**: Critical - Can't improve what we can't test

```javascript
// New system: src/core/systems/XRTestHarness.js
export class XRTestHarness extends System {
  // Mock XR session without headset
  // Simulate controller inputs
  // Record/replay test sequences
  // Automated regression testing
}
```

**Deliverables**:
- [ ] XR simulator mode (`npm run dev -- --xr-sim`)
- [ ] Controller input recorder
- [ ] Automated XR interaction tests
- [ ] Performance metrics collection

### 1.2 XR Development Mode
**Priority**: High - Essential for rapid iteration

```javascript
// Add to ClientPrefs.js
xrDev: {
  enabled: false,
  showControllers: true,
  showRays: true,
  showGrabRanges: true,
  showSnapPoints: true,
  mockHeadset: false,  // For non-XR devs
  controllerBinding: 'keyboard' // keyboard|mouse|gamepad
}
```

**Deliverables**:
- [ ] Visual debugging overlay
- [ ] Real-time controller state monitor
- [ ] FPS/frame time HUD for XR
- [ ] Input latency visualization

### 1.3 XR Test World
**Priority**: High - Standardized testing environment

```javascript
// worlds/xr-validation-world.js
export default function() {
  return ({ app, world }) => {
    // Standardized test suite
    // 1. Controller tracking accuracy
    // 2. Grab interaction reliability
    // 3. UI interaction tests
    // 4. Performance benchmarks
    // 5. Comfort tests
  }
}
```

**Deliverables**:
- [ ] Standardized test scene
- [ ] Automated test sequence
- [ ] Performance benchmark suite
- [ ] Comfort validation tests

---

## Phase 2: Input System Parity (Weeks 3-5)

### 2.1 Unified Input Abstraction
**Problem**: PC, mobile, and XR have completely separate input handling

**Solution**: Create unified input layer

```javascript
// src/core/systems/UnifiedInput.js
export class UnifiedInput extends System {
  // Map all inputs to common actions:
  // select, grab, menu, move, rotate, scale
  // Context-aware input interpretation
}
```

**Input Mapping Matrix**:
| Action | PC | Mobile | XR Controller | XR Hand |
|--------|----|--------|---------------|---------|
| Select | Left click | Tap | Trigger | Pinch |
| Grab | Hold click | Double tap | Grip button | Grab gesture |
| Menu | Right click | Long press | Menu button | Palm up |
| Move | WASD | Joystick | Thumbstick | Point |

**Deliverables**:
- [ ] Unified input API
- [ ] Context-aware input interpretation
- [ ] Input method auto-detection
- [ ] Graceful fallback handling

### 2.2 XR UI System
**Problem**: Current UI nodes don't work in XR

**Solution**: World-space UI with controller interaction

```javascript
// src/core/nodes/XRUI.js
export class XRUI extends Node {
  // World-space canvas rendering
  // Controller ray interaction
  // Proximity activation
  // Hand tracking support
}
```

**Deliverables**:
- [ ] World-space UI rendering
- [ ] Controller raycasting for UI
- [ ] Hand tracking pinch gestures
- [ ] UI interaction haptics

### 2.3 Enhanced Controller Support
**Current**: Basic grip/trigger support
**Target**: Full controller feature utilization

```javascript
// Enhanced controller features
controller: {
  // Current: grip, trigger
  // Add:
  thumbstick: { pressed, touched, x, y },
  buttons: { a, b, x, y, menu },
  haptic: { actuators, pulse(intensity, duration) },
  battery: { level, charging },
  tracking: { quality, lossReason }
}
```

**Deliverables**:
- [ ] Full button mapping
- [ ] Haptic feedback API
- [ ] Battery/tracking status
- [ ] Controller model auto-loading

---

## Phase 3: XR-Specific Features (Weeks 6-8)

### 3.1 Hand Tracking Integration
**Priority**: Medium - High value, moderate complexity

```javascript
// src/core/nodes/HandTracking.js
export class HandTracking extends Node {
  // Joint position tracking
  // Gesture recognition (pinch, grab, point)
  // Hand-relative interactions
  // Custom hand model support
}
```

**Implementation Steps**:
1. Detect hand tracking availability
2. Fall back to controllers if unavailable
3. Map hand gestures to input actions
4. Provide hand-specific interaction modes

**Deliverables**:
- [ ] Hand joint tracking
- [ ] Gesture recognition system
- [ ] Hand-relative UI interaction
- [ ] Performance optimization (60fps with hands)

### 3.2 Spatial Anchors & Persistence
**Priority**: Medium - Enables real-world integration

```javascript
// src/core/nodes/SpatialAnchor.js
export class SpatialAnchor extends Node {
  // Real-world surface detection
  // Persistent anchors across sessions
  // QR code anchor points
  // GPS anchors (outdoor AR)
}
```

**Use Cases**:
- Anchor virtual objects to real tables/walls
- Persistent room-scale experiences
- Shared multiplayer spaces
- Location-based AR experiences

**Deliverables**:
- [ ] Real-world surface detection
- [ ] Anchor persistence system
- [ ] QR code anchor support
- [ ] Multiplayer anchor sharing

### 3.3 Passthrough & Mixed Reality
**Priority**: Low-Medium - Platform-specific but high impact

```javascript
// src/core/systems/PassthroughManager.js
export class PassthroughManager extends System {
  // Passthrough mode toggle
  - Real-world occlusion
  - Mixed reality blending
  - Environment mapping
}
```

**Platform Support**:
- Quest 2: Basic passthrough
- Quest 3: Color passthrough
- Quest Pro: High-res color
- Future: AR glasses

**Deliverables**:
- [ ] Passthrough mode API
- [ ] Occlusion mesh generation
- [ ] Environment lighting sync
- [ ] Mixed reality UI

---

## Phase 4: Performance & Optimization (Weeks 9-10)

### 4.1 XR Performance Budgets
**Target Metrics**:
- Quest 2: 72fps minimum
- Quest 3: 90fps target
- PCVR: 120fps ideal

```javascript
// Performance monitoring
xrPerformance: {
  targetFps: 72,
  warnThreshold: 68,
  criticalThreshold: 60,
  metrics: {
    cpu: 0, gpu: 0, drawCalls: 0,
    triangles: 0, textures: 0
  }
}
```

**Optimization Strategies**:
- Foveated rendering support
- Dynamic LOD based on gaze
- Asynchronous timewarp
- Late latching for poses

**Deliverables**:
- [ ] Performance monitoring system
- [ ] Automatic quality adjustment
- [ ] Foveated rendering integration
- [ ] Optimization documentation

### 4.2 Asset Optimization Pipeline
**Problem**: XR requires different asset optimization than PC

**Solution**: XR-specific asset pipeline

```javascript
// Asset optimization for XR
assetPipeline: {
  xr: {
    maxTextureSize: 2048,
    maxVertices: 65536,
    maxDrawCalls: 100,
    compression: 'basis',
    lodDistance: 0.7 // Closer LOD switching
  }
}
```

**Deliverables**:
- [ ] XR asset validation
- [ ] Automatic LOD generation
- [ ] Texture compression pipeline
- [ ] Performance budgeting tools

---

## Phase 5: Developer Experience (Weeks 11-12)

### 5.1 XR Development Workflow
**Current**: No XR-specific dev tools
**Target**: Seamless XR development

```bash
# New npm scripts
npm run dev:xr          # Auto-enable XR debug mode
npm run test:xr         # Run XR simulation
npm run build:xr        # XR-optimized production build
npm run deploy:xr       # Deploy to XR platforms
```

**Hot Reload for XR**:
- Preserve XR session across reloads
- Maintain controller state
- Keep grabbed objects

**Deliverables**:
- [ ] XR-specific build pipeline
- [ ] Hot reload preservation
- [ ] XR debugging tools
- [ ] Deployment automation

### 5.2 Documentation & Examples
**Priority**: Critical for adoption

```
docs/xr/
├── getting-started.md      # XR dev setup
├── input-guide.md          # Unified input system
├── ui-design.md            # World-space UI
├── performance.md          # XR optimization
├── testing.md              # XR test strategies
└── examples/
    ├── grab-basics.js      # Basic grab interaction
    ├── hand-tracking.js    # Hand tracking demo
    ├── spatial-ui.js       # World-space menus
    ├── passthrough.js      # Mixed reality
    └── multiplayer.js      # Shared XR space
```

**Deliverables**:
- [ ] Complete XR documentation
- [ ] 5+ example apps
- [ ] Video tutorials
- [ ] Best practices guide

---

## Phase 6: Real-World Validation (Week 13)

### 6.1 Dogfooding Requirements
**Goal**: Build actual XR apps using the system

**Apps to Build**:
1. **XR Workspace** - Virtual monitors, spatial UI
2. **XR Puzzle Game** - Physics-based puzzles
3. **XR Social Space** - Multiplayer hangout
4. **XR Creative Tool** - 3D modeling/sculpting

**Success Criteria**:
- Each app built in <1 week
- No XR-specific engine changes needed
- Performance meets targets
- Comfortable for 30+ minute sessions

### 6.2 Community Testing
**Goal**: Get external developers testing XR

**Testing Program**:
- Recruit 5-10 XR developers
- Provide test hardware if needed
- Weekly feedback sessions
- Bug bounty for critical issues

**Deliverables**:
- [ ] 5 external test apps
- [ ] 100+ hours of testing
- [ ] <10 critical bugs
- [ ] Developer satisfaction >80%

---

## Resource Allocation

### Team Requirements
- **1 XR Developer** (full-time, you)
- **1 Engine Developer** (part-time, me)
- **1 Technical Artist** (contract, for assets)
- **5 Community Testers** (volunteer/bounty)

### Time Investment
- **Weeks 1-2**: Foundation (40 hours)
- **Weeks 3-5**: Input parity (60 hours)
- **Weeks 6-8**: XR features (60 hours)
- **Weeks 9-10**: Optimization (40 hours)
- **Weeks 11-12**: Dev experience (40 hours)
- **Week 13**: Validation (20 hours)

**Total**: 260 hours over 13 weeks

---

## Risk Mitigation

### Risk 1: Hardware Limitations
**Problem**: Only one XR device for testing

**Mitigation**:
- XR simulator for non-headset development
- Community testing program
- Automated regression tests
- Cloud XR streaming for remote testing

### Risk 2: Performance Issues
**Problem**: Can't hit 72fps on Quest 2

**Mitigation**:
- Aggressive optimization from start
- Foveated rendering
- Dynamic quality scaling
- Simplified shaders for XR

### Risk 3: Developer Adoption
**Problem**: XR developers don't use Hyperfy

**Mitigation**:
- Compelling example apps
- Clear documentation
- Active community support
- Showcase successful projects

---

## Success Metrics

### Technical Metrics
- [ ] 90% code coverage for XR paths
- [ ] 72fps on Quest 2 in all examples
- [ ] <50ms input latency
- [ ] Zero XR-specific crashes

### Developer Metrics
- [ ] 5+ example XR apps
- [ ] 10+ external developers building XR apps
- [ ] 100+ hours of community testing
- [ ] Developer satisfaction >80%

### User Metrics
- [ ] Comfortable 30+ minute sessions
- [ ] No motion sickness reports
- [ ] Intuitive interactions (no tutorial needed)
- [ ] Willingness to recommend

---

## Immediate Next Steps (This Week)

### Day 1-2: Foundation
1. Set up XR test harness
2. Create basic XR simulator
3. Build validation test world

### Day 3-4: Testing
1. Deploy to Docker
2. Run through testing checklist
3. Document baseline performance

### Day 5: Planning
1. Review test results
2. Identify critical issues
3. Plan Week 2 priorities

---

## Long-term Vision (3-6 months)

### Month 4: Platform Expansion
- Pico 4 support
- PSVR2 support
- AR glasses (Magic Leap, HoloLens)
- WebXR mobile AR

### Month 5: Advanced Features
- Eye tracking integration
- Face tracking
- Body tracking
- Haptic gloves

### Month 6: Ecosystem
- XR asset marketplace
- XR app templates
- XR certification program
- XR developer grants

---

## Conclusion

This plan transforms XR from an afterthought into a core platform. With your hardware and dedication, we can achieve in 3 months what would take a year without real device testing.

**Key Principles**:
1. **Test on real hardware** - No simulations as primary method
2. **Developer-first** - Build what XR devs actually need
3. **Performance is feature** - 72fps is non-negotiable
4. **Iterate fast** - Daily testing, weekly releases
5. **Document everything** - Learn from each issue

**Ready to start with Phase 1?**
