# BoltGame.js Improvement Plan

## Current State
- Basic DDR gameplay with auto-teleport to zones
- Score/combo tracking with rating system (Perfect/Great/Good/Okay/Miss)
- Audio reactivity support for 9 meshes
- Test mode and Play Song modes
- Exit/quit functionality

## Proposed Improvements

### Phase 1: Gameplay Enhancements

#### 1.1 Difficulty System
- **Easy**: Slower arrows, wider hit windows, more forgiving timing
- **Normal**: Current settings
- **Hard**: Faster arrows, tighter windows, combo breaks on miss
- **Expert**: Very fast, strict timing, no health recovery

```javascript
const DIFFICULTIES = {
  EASY: { speed: 1.5, windows: { PERFECT: 0.15, GREAT: 0.3, GOOD: 0.5, OKAY: 0.7 } },
  NORMAL: { speed: 2.0, windows: { PERFECT: 0.1, GREAT: 0.2, GOOD: 0.35, OKAY: 0.5 } },
  HARD: { speed: 2.5, windows: { PERFECT: 0.08, GREAT: 0.15, GOOD: 0.25, OKAY: 0.4 } },
  EXPERT: { speed: 3.0, windows: { PERFECT: 0.05, GREAT: 0.1, GOOD: 0.2, OKAY: 0.3 } },
}
```

#### 1.2 Health/Lives System
- Start with 100% health or 3 lives
- Misses reduce health
- Game over when health reaches 0
- Health recovery on Perfect/Great hits

#### 1.3 Arrow Patterns (Instead of Random)
- Predefined patterns for songs
- Sequential spawning based on audio analysis
- Pattern editor for custom songs
- Support for holds (long arrows) and mines (avoid)

### Phase 2: Audio & Visual Improvements

#### 2.1 Better Audio Reactivity
- React to beat detection instead of frequency bands
- Sync arrow spawn to actual beats
- Visual pulsing of the platform to the beat
- Particle effects that react to music

#### 2.2 Sound Effects
- Hit sounds (different for each rating)
- Miss sound
- Combo milestone sounds
- Game start/end sounds

#### 2.3 Enhanced Visual Feedback
- Arrow trail effects
- Screen flash on Perfect
- Combo counter animations
- Health bar visualization
- Rating text animations (scale up/fade)

### Phase 3: Multiplayer & Social

#### 3.1 Multiplayer Support
- Multiple players on same platform
- Competitive mode (highest score wins)
- Cooperative mode (combined score)
- Spectator mode

#### 3.2 Leaderboard
- Local high scores
- Server-side leaderboard
- Player name entry
- Score replay system

#### 3.3 Replay System
- Record gameplay
- Playback with ghost arrows
- Share replays

### Phase 4: Configuration & Accessibility

#### 4.1 More Configuration Options
```javascript
// Arrow settings
arrowSpeed: range(1-5)
arrowSize: range(0.5-2)
arrowTrail: switch

// Timing windows (custom)
perfectWindow: range(0.05-0.2)
greatWindow: range(0.1-0.4)
// etc

// Audio
hitSounds: switch
missSound: switch
backgroundMusicVolume: range(0-1)
sfxVolume: range(0-1)

// Visual
particleEffects: switch
screenFlash: switch
arrowColors: color[]
```

#### 4.2 Accessibility
- Colorblind mode (different arrow shapes)
- Visual-only mode (no audio required)
- Audio-only mode (for visually impaired)
- Adjustable input delay
- Custom key bindings

### Phase 5: Song Management

#### 5.1 Song Library
- Multiple song support
- Song metadata (title, artist, BPM)
- Difficulty ratings per song
- Preview songs before playing

#### 5.2 Pattern Editor
- In-world pattern creation
- Step editor (like StepMania)
- Save/load patterns
- Share patterns

### Phase 6: Performance & Polish

#### 6.1 Performance
- Object pooling for arrows
- LOD for particle effects
- Framerate-independent timing
- Memory leak prevention

#### 6.2 UI/UX Improvements
- Better menu system
- Song select screen
- Results screen with statistics
- Loading screens
- Tutorial mode

## Implementation Priority

### High Priority (Immediate)
1. Difficulty system
2. Health/lives system
3. Better arrow patterns
4. Sound effects

### Medium Priority (Next)
5. Enhanced visual feedback
6. More configuration options
7. Song library support
8. Leaderboard

### Low Priority (Future)
9. Multiplayer
10. Replay system
11. Pattern editor
12. Accessibility features

## Technical Considerations

### Arrow Pooling
```javascript
const arrowPool = []
const MAX_ARROWS = 50

function getArrowFromPool() {
  return arrowPool.find(a => !a.active) || createNewArrow()
}

function returnArrowToPool(arrow) {
  arrow.active = false
  arrow.node.visible = false
}
```

### Beat Detection
```javascript
// Use onsets instead of frequency bands
function detectBeat(audioData) {
  const currentVolume = audioData.volume
  const isBeat = currentVolume > previousVolume * 1.5 && currentVolume > 0.3
  previousVolume = currentVolume
  return isBeat
}
```

### Pattern System
```javascript
const pattern = [
  { time: 0, dir: 'LEFT' },
  { time: 0.5, dir: 'DOWN' },
  { time: 1.0, dir: 'UP' },
  { time: 1.5, dir: 'RIGHT' },
  // ...
]
```

## Files to Modify
- `/home/blank/hyperfy/examples/bolt/game/boltGame.js` - Main game logic
- Create `/home/blank/hyperfy/examples/bolt/game/boltPatterns.js` - Pattern definitions
- Create `/home/blank/hyperfy/examples/bolt/game/boltAudio.js` - Audio analysis utilities
