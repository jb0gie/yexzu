# Implementing Custom VRM Animations in Hyperfy Apps

This guide explains how to add custom animations to VRM models in your Hyperfy app scripts.

## Method 1: Direct Animation

For simple cases where you just want to play an animation on a VRM:

```javascript
export default {
  name: 'custom-animation',
  
  async init({ world, loadPhysX }) {
    // Preload your animation
    await world.loader.load('emote', 'asset://your-animation.glb')
  },

  spawn() {
    // Your VRM setup code here
    const vrm = // ... your VRM instance
    
    // Play animation directly
    vrm.setEmote('asset://your-animation.glb')
  }
}
```

## Method 2: Using the Emote System

For more complex cases where you want to manage multiple animations:

```javascript
import { Emotes, emotes } from '../core/extras/playerEmotes'

export default {
  name: 'custom-animation-manager',
  
  async init({ world, loadPhysX }) {
    // Preload all animations you'll use
    await Promise.all([
      world.loader.load('emote', 'asset://animation1.glb'),
      world.loader.load('emote', 'asset://animation2.glb')
    ])
  },

  spawn({ entity }) {
    // Your VRM setup code here
    const vrm = // ... your VRM instance
    
    // Add emote property to track current animation
    entity.emote = Emotes.IDLE
    
    // Create update loop to handle animations
    let lastEmote = null
    
    this.update = () => {
      // Only update animation if emote changed
      if (entity.emote !== lastEmote) {
        lastEmote = entity.emote
        vrm.setEmote(emotes[entity.emote])
      }
    }
  }
}
```

## Animation State Management

For complex animation sequences:

```javascript
export default {
  name: 'animation-state-manager',
  
  async init({ world, loadPhysX }) {
    await world.loader.load('emote', 'asset://your-animation.glb')
  },
  
  spawn({ entity }) {
    const vrm = // ... your VRM instance
    
    let currentAnimation = null
    let animationStartTime = 0
    
    this.update = () => {
      const now = performance.now()
      
      // Start new animation
      if (shouldPlayAnimation) {
        currentAnimation = 'your-animation'
        animationStartTime = now
        vrm.setEmote('asset://your-animation.glb')
      }
      
      // Handle animation completion
      if (currentAnimation && now - animationStartTime > 1000) {
        currentAnimation = null
        // Transition to idle or next animation
        vrm.setEmote('asset://idle.glb')
      }
    }
  }
}
```

## Network Synchronization

If you need to sync animations across the network:

```javascript
export default {
  name: 'networked-animation',
  
  spawn({ entity, world }) {
    // Listen for network updates
    world.network.on('entityModified', data => {
      if (data.id === entity.data.id && data.e !== undefined) {
        // Update animation based on network event
        entity.emote = data.e
        entity.avatar?.setEmote(emotes[data.e])
      }
    })
    
    // Send animation updates
    function playNetworkedAnimation(emoteId) {
      entity.emote = emoteId
      entity.avatar?.setEmote(emotes[emoteId])
      
      world.network.send('entityModified', {
        id: entity.data.id,
        e: emoteId
      })
    }
  }
}
```

## Best Practices

1. Always preload animations in `init`
2. Use the emote system for consistent animation management
3. Handle animation transitions smoothly
4. Consider network synchronization for multiplayer experiences
5. Clean up animation states when the entity is destroyed

## Technical Notes

- Animations are loaded from GLB files
- The emote system maps numeric IDs to animation files
- VRMs automatically handle bone transformations
- Network updates should be minimal (just send the emote ID)
- Animation timing can be controlled via `performance.now()` 