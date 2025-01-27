# Enhanced App Inspection System

This guide explains how to add position/rotation controls and a freeze toggle to Hyperfy's app inspection system.

## Implementation Steps

### 1. Update InspectPane.js
First, modify `src/client/components/InspectPane.js` to add the new fields:

```javascript
// Add state for transform values
function Fields({ app, blueprint }) {
  const [position, setPosition] = useState(app.root?.position || new THREE.Vector3())
  const [rotation, setRotation] = useState(app.root?.rotation || new THREE.Euler())
  const [frozen, setFrozen] = useState(app.frozen || false)
  
  // Add live updates
  useEffect(() => {
    const onUpdate = () => {
      if (app.root) {
        setPosition(app.root.position.clone())
        setRotation(app.root.rotation.clone())
      }
      setFrozen(app.frozen)
    }
    onUpdate()
    app.on('update', onUpdate)
    return () => app.off('update', onUpdate)
  }, [app])

  // Add transform fields to the UI
  const transformFields = [
    {
      type: 'section',
      key: 'transform',
      label: 'Transform',
    },
    {
      type: 'vector3',
      key: 'position',
      label: 'Position',
      value: position,
    },
    {
      type: 'euler',
      key: 'rotation',
      label: 'Rotation',
      value: rotation,
    },
    {
      type: 'switch',
      key: 'frozen',
      label: 'Freeze',
      value: frozen,
      options: [
        { value: true, label: 'Frozen' },
        { value: false, label: 'Unfrozen' }
      ]
    },
    ...fields
  ]
}
```

### 2. Add Transform Handlers
Add these handlers to the `modify` function in `Fields`:

```javascript
const modify = (key, value) => {
  if (config[key] === value) return

  // Position updates
  if (key === 'position' && app.root) {
    app.root.position.copy(value)
    app.data.position = value.toArray()
    world.network.send('entityModified', {
      id: app.data.id,
      position: app.data.position
    })
    if (app.networkPos) {
      app.networkPos.pushArray(app.data.position)
    }
    setPosition(value.clone())
    return
  }

  // Rotation updates
  if (key === 'rotation' && app.root) {
    app.root.rotation.copy(value)
    const quaternion = new THREE.Quaternion().setFromEuler(value)
    app.data.quaternion = quaternion.toArray()
    world.network.send('entityModified', {
      id: app.data.id,
      quaternion: app.data.quaternion
    })
    if (app.networkQuat) {
      app.networkQuat.pushArray(app.data.quaternion)
    }
    setRotation(value.clone())
    return
  }

  // Freeze updates
  if (key === 'frozen') {
    app.frozen = value
    world.network.send('entityModified', {
      id: app.data.id,
      frozen: value
    })
    setFrozen(value)
    return
  }
}
```

### 3. Update App.js
Modify `src/core/entities/App.js` to handle frozen state:

```javascript
export class App extends Entity {
  constructor(world, data, local) {
    super(world, data, local)
    // Add frozen state
    this.frozen = data.frozen || false
  }

  modify(data) {
    let rebuild
    // Handle frozen state
    if (data.hasOwnProperty('frozen')) {
      this.frozen = data.frozen
      this.data.frozen = data.frozen
      if (this.frozen && this.data.mover) {
        this.data.mover = null
        rebuild = true
      }
    }
    // Block position/rotation updates when frozen
    if (data.hasOwnProperty('position') && !this.frozen) {
      this.data.position = data.position
      this.networkPos.pushArray(data.position)
    }
    if (data.hasOwnProperty('quaternion') && !this.frozen) {
      this.data.quaternion = data.quaternion
      this.networkQuat.pushArray(data.quaternion)
    }
    if (rebuild) {
      this.build()
    }
  }

  move() {
    // Block movement when frozen
    if (this.frozen) return
    this.data.mover = this.world.network.id
    this.build()
    world.network.send('entityModified', { 
      id: this.data.id, 
      mover: this.data.mover 
    })
  }
}
```

## Features
- Direct numeric input for position/rotation
- Freeze toggle to prevent movement
- Real-time network sync
- Works with existing movement system

## Usage
1. Right-click an app to open inspect pane
2. Use numeric inputs for precise positioning
3. Toggle freeze to lock in place
4. Changes sync across network automatically

## Testing
1. Verify position/rotation inputs update in real-time
2. Check freeze prevents all movement
3. Confirm changes sync to other clients
4. Test interaction with right-click move system 