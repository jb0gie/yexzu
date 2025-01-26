# Implementing Double Jump in Hyperfy

This guide explains how to add a double jump feature with a flip animation to your Hyperfy world.

## 1. Create the Double Jump System

Create a new file `src/core/systems/DoubleJump.js`:

```javascript
import { System } from './System'
import * as THREE from '../extras/three'
import { Emotes, emotes } from '../extras/playerEmotes'

export class DoubleJump extends System {
  constructor(world) {
    super(world)
    this.lastJumpTime = 0
    this.DOUBLE_JUMP_FORCE = 9.75  // 1.5x the base jump force
    this.isDoubleJumping = false
  }

  async init({ loadPhysX }) {
    // Preload the flip animation
    await this.world.loader.load('emote', emotes[Emotes.DOUBLE_JUMP])
  }

  start() {
    // Bind to space key with priority 0
    this.control = this.world.controls.bind({
      priority: 0,
      onPress: code => this.handleKeyPress(code)
    })
  }

  getLocalPlayer() {
    return Array.from(this.world.entities.items.values())
      .find(entity => entity.isPlayer && entity.constructor.name === 'PlayerLocal')
  }

  update() {
    const localPlayer = this.getLocalPlayer()
    if (!localPlayer) return

    // Handle animation timing
    if (this.isDoubleJumping) {
      const timeSinceLastJump = performance.now() - this.lastJumpTime
      if (timeSinceLastJump > 400) {
        // Switch back to float after flip completes
        localPlayer.emote = Emotes.FLOAT
      }
      if (timeSinceLastJump > 800) {
        this.isDoubleJumping = false
      }
    }

    // Reset on landing
    if (localPlayer.grounded) {
      this.isDoubleJumping = false
      this.lastJumpTime = 0
    }
  }

  handleKeyPress(code) {
    if (code !== 'Space') return false
    
    const localPlayer = this.getLocalPlayer()
    if (!localPlayer) return false

    // Only double jump if:
    // 1. In the air (jumping/falling)
    // 2. Not already double jumping
    // 3. Not grounded
    if (!localPlayer.grounded && !this.isDoubleJumping && 
        (localPlayer.jumping || localPlayer.falling)) {
      
      // Apply upward force
      const currentVel = localPlayer.capsule.getLinearVelocity()
      v1.copy(currentVel)
      v1.y = this.DOUBLE_JUMP_FORCE
      localPlayer.capsule.setLinearVelocity(v1.toPxVec3())

      // Start flip animation
      this.isDoubleJumping = true
      this.lastJumpTime = performance.now()
      localPlayer.emote = Emotes.DOUBLE_JUMP

      // Sync animation with other players
      this.world.network.send('entityModified', {
        id: localPlayer.data.id,
        p: localPlayer.base.position.toArray(),
        q: localPlayer.base.quaternion.toArray(),
        e: Emotes.DOUBLE_JUMP,
      })

      return true
    }
    return false
  }
}
```

## 2. Add the Double Jump Emote

Add the following to `src/core/extras/playerEmotes.js`:

```javascript
export const Emotes = {
  IDLE: 0,
  WALK: 1,
  RUN: 2,
  FLOAT: 3,
  DOUBLE_JUMP: 4,  // Add this line
  // ... other emotes
}

export const emotes = {
  0: 'asset://emote-idle.glb',
  1: 'asset://emote-walk.glb',
  2: 'asset://emote-run.glb',
  3: 'asset://emote-float.glb',
  4: 'asset://emote-flip.glb',  // Add this line
  // ... other emotes
}
```

## 3. Register the System

Add this to your world creation (usually in `createClientWorld.js`):

```javascript
import { DoubleJump } from './systems/DoubleJump'

// In your world creation:
world.register(DoubleJump)
```

## Features

The double jump system provides:
- Double jump ability by pressing space while in the air
- Front flip animation during the double jump
- Network synchronization for multiplayer
- Automatic transition back to floating animation
- State reset upon landing

## Technical Details

- Double jump force is 1.5x the normal jump force (9.75)
- Flip animation plays for 400ms before transitioning to float
- Double jump state is tracked for 800ms to prevent additional jumps
- Uses the existing player physics and animation systems
- Integrates with the network layer for multiplayer support 