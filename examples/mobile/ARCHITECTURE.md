# Mobile Elemental Controls - Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │   JUMP (A)    │  │  ACTION (B)   │  │     ADS       │  ← Native Controls │
│  │   (Built-in)  │  │  (Built-in)   │  │  (Built-in)   │                   │
│  └───────────────┘  └───────────────┘  └───────────────┘                   │
│                                                                           │
│  ┌───────────────┐  ┌───────────────┐                                     │
│  │   [FIRE]      │  │   [RLD]       │  ← Extended X/Y Controls             │
│  │   (Smart)     │  │   (Smart)     │  (Context-Aware)                     │
│  └───────────────┘  └───────────────┘                                     │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTROL SYSTEMS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────┐                            │
│  │        Extended Mobile Controls           │                            │
│  │  ┌──────────────┐  ┌──────────────┐     │                            │
│  │  │      X       │  │      Y       │     │                            │
│  │  │ Button       │  │ Button       │     │                            │
│  │  └──────┬───────┘  └──────┬───────┘     │                            │
│  │         │                  │             │                            │
│  │         ▼                  ▼             │                            │
│  │  ┌──────────────┐  ┌──────────────┐     │                            │
│  │  │  keyE        │  │  keyF        │     │                            │
│  │  │  (Config)    │  │  (Config)    │     │                            │
│  │  └──────────────┘  └──────────────┘     │                            │
│  └──────────────────────────────────────────┘                            │
│                        │                                                    │
│                        ▼                                                    │
│  ┌──────────────────────────────────────────┐                            │
│  │       Mobile Elemental Integration       │                            │
│  │  ┌────────────────┐  ┌────────────────┐  │                            │
│  │  │ Elemental      │  │ Auto-Detect    │  │                            │
│  │  │ Detection      │  │ (0.5s poll)    │  │                            │
│  │  └────────┬───────┘  └────────┬───────┘  │                            │
│  │           │                   │           │                            │
│  │           ▼                   ▼           │                            │
│  │  ┌────────────────┐  ┌────────────────┐  │                            │
│  │  │ Pistol Equipped│  │ Sword Equipped │  │                            │
│  │  └──────┬─────────┘  └──────┬────────┘  │                            │
│  │         │                   │           │                            │
│  │         ▼                   ▼           │                            │
│  │  ┌────────────────┐  ┌────────────────┐  │                            │
│  │  │ X: fire (red)  │  │ X: attack      │  │                            │
│  │  │ Y: reload      │  │ Y: attack      │  │                            │
│  │  │   (blue)       │  │   (orange)     │  │                            │
│  │  └────────────────┘  └────────────────┘  │                            │
│  └──────────────────────────────────────────┘                            │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       ELEMENTAL SYSTEMS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │   Pistol     │  │    Sword     │  │   (More)     │                   │
│  │              │  │              │  │              │                   │
│  │ Fire/Reload  │  │   Attack     │  │  ...         │                   │
│  │ ADS/Equip    │  │  Equip       │  │              │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Control Flow

### Without Elemental Equipped
```
User Tap X
    │
    ▼
Extended Control
    │
    ▼
world.controls.setTouchBtn('keyE', true)
    │
    ▼
KeyE Event Triggered
    │
    ▼
Equip Pistol
```

### With Elemental Equipped
```
User Tap X
    │
    ▼
Elemental Detection (activeElemental = 'pistol')
    │
    ▼
Elemental Integration
    │
    ▼
control.mouseLeft.down = true
    │
    ▼
Pistol Fire Event
```

## Data Flow

### Configuration
```
App Configuration
    │
    ├─→ Extended Controls
    │   ├─ X Button: 'keyE'
    │   └─ Y Button: 'keyF'
    │
    └─ Elemental Integration
        ├─ Primary Action: 'fire'
        ├─ Secondary Action: 'reload'
        ├─ Compact Mode: true
        └─ Show Labels: true
```

### State Management
```
Global State
    │
    ├─ control = app.control()
    ├─ activeElemental = null
    ├─ buttons = { extended: {}, elemental: {} }
    └─ elementalCheckInterval = 0

Updates (every 0.5s)
    │
    ▼
checkActiveElemental()
    │
    ├─ control.keyE.down ?
    │   ├─ Yes → activeElemental = 'pistol'
    │   └─ No → activeElemental = null
    │
    ▼
updateButtonState()
    │
    ├─ Color buttons based on activeElemental
    └─ Update labels (FIRE vs X, RLD vs Y)
```

## Button State Machine

```
┌─────────────┐
│  INITIAL    │
│  (No input) │
└──────┬──────┘
       │
       │ user taps button
       ▼
┌─────────────┐
│ DETECT      │
│ Elemental   │
└──────┬──────┘
       │
       ├─→ No elemental → Extended Mode
       │                │
       │                ├─→ X → keyE (configurable)
       │                └─→ Y → keyF (configurable)
       │
       └─→ Elemental active → Elemental Mode
                          │
                          ├─→ Pistol
                          │   ├─→ X → fire (red)
                          │   └─→ Y → reload (blue)
                          │
                          └─→ Sword
                              ├─→ X → attack (orange)
                              └─→ Y → attack (orange)
```

## File Interaction Diagram

```
┌──────────────────────────────────────────────┐
│  user/App Configuration                      │
│  (X maps to keyE, Y maps to keyF, etc.)     │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│  example-combined-setup.js                   │
│  ┌────────────────────────────────────────┐  │
│  │  createExtendedControls()              │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │  buttons.extended.x = createUI()  │  │  │
│  │  │  buttons.extended.x.onPointerDown│  │  │
│  │  └──────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  createElementalControls()             │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │  buttons.elemental.x = createUI() │  │  │
│  │  │  buttons.elemental.x.onPointerDown│  │  │
│  │  └──────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  checkActiveElemental()                │  │
│  │  (polls every 0.5s)                    │  │
│  └────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────┘
                   │
                   ├─→ onPointerDown
                   │    │
                   │    ├─→ triggerExtendedAction('X')
                   │    │    │
                   │    │    └─→ world.controls.setTouchBtn('keyE', true)
                   │    │
                   │    └─→ triggerElementalAction('fire')
                   │         │
                   │         └─→ control.mouseLeft.down = true
                   │
                   ▼
┌──────────────────────────────────────────────┐
│  elemental-item-pistol.js                    │
│  ┌────────────────────────────────────────┐  │
│  │  if (control.mouseLeft.pressed) {      │  │
│  │    hooks.call('fire', { ... })         │  │
│  │  }                                     │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Server receives 'fire' event               │
│  └─→ Process shot, damage, etc.
```

## Configuration Layers

```
Layer 3: User Configuration
├─ extended-mobile-controls.js
│  ├─ keyX: 'keyE'
│  └─ keyY: 'keyF'
└─ mobile-elemental-integration.js
   ├─ primaryAction: 'fire'
   ├─ secondaryAction: 'reload'
   └─ compactMode: true

Layer 2: System Defaults
├─ Extended Controls
│  └─ Fallback: keyX='keyR', keyY='keyF'
└─ Elemental Integration
   └─ Fallback: fire='fire', reload='reload'

Layer 1: Hyperfy Core
├─ Native A/B Buttons
│  ├─ touchA: jump
│  └─ touchB: action
└─ Control System
   └─ world.controls.setTouchBtn()
```

## Performance Characteristics

```
Component                │ Frequency   │ Complexity  │ Notes
────────────────────────┼─────────────┼─────────────┼────────────────────
Elemental Detection     │ 0.5s        │ O(1)        │ Simple key check
Button State Updates    │ On change   │ O(1)        │ UI property set
Extended Action Trigger │ On tap      │ O(1)        │ setTouchBtn call
Elemental Action        │ On tap      │ O(1)        │ Direct property set
UI Creation             │ Once        │ O(1)        │ 2 buttons created
Memory Usage            │ -           │ O(1)        │ Minimal overhead
```

## Error Handling

```
Error Scenario                 │ Detection              │ Handling
──────────────────────────────┼────────────────────────┼─────────────────────────
No control object             │ app.control() === null │ Return early, log warn
onPointerDown not available   │ typeof !== 'function'  │ Log warning, no handler
Elemental not found           │ control.keyE missing   │ Use extended controls
Invalid action mapping        │ action not in ACTIONS  │ Use default (fire)
Button doesn't exist          │ buttons.x === null     │ Return early, log warn
```

This architecture ensures:
- **Separation of concerns**: Extended vs Elemental systems are independent
- **Performance**: Minimal polling (0.5s), no per-frame operations
- **Flexibility**: Easy to add new elementals or actions
- **Reliability**: Comprehensive error handling and fallbacks
- **Usability**: Clear visual feedback and intuitive controls