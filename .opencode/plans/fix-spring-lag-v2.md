# Fix Spring Bone CPU Spike

## Root Cause
1. Spring rate at close range evaluates to ~0.017 (60fps) — every single frame
2. Double joint iteration: gravity loop visits all joints, then `tvrm.update()` visits all joints again
3. Gravity adjustments run even at LOD 1+ where they're invisible

## Changes

### File: `src/core/extras/createVRMFactory.js`

#### Change 1: Cap close-range spring rate (line 305)

```js
// Before:
springRate = Math.min(rate * (1 + normalizedDistance * 2), 0.5)
// After:
springRate = Math.max(0.05, Math.min(rate * (1 + normalizedDistance * 2), 0.5))
```

Effect: springRate floor of 0.05s = 20fps max. Close-range drops from 60fps → 20fps.

| Distance | Before | After |
|----------|--------|-------|
| 5m | 60fps | 20fps |
| 10m | 25fps | 20fps |
| 15m | 15fps | 15fps (unchanged) |
| 30m | 6fps | 6fps |
| 60m | 2fps | 2fps |

#### Change 2: Eliminate double joint iteration (lines 418-446)

Move `_skipCollision` and gravity into separate LOD-gated blocks. At LOD 1+, skip the gravity loop entirely — just set `_skipCollision`:

```js
// Inside the doSpring block, replace current joint iteration code:
if (springLod === 0) {
  const verticalVelocity = hooks.getVerticalVelocity ? hooks.getVerticalVelocity() : 0
  const velocityFactor = Math.max(-1, Math.min(1, verticalVelocity / 10))
  tvrm.springBoneManager.joints.forEach(joint => {
    joint._skipCollision = false
    if (joint.settings) {
      const origins = springBoneOrigins.get(joint)
      if (origins) {
        const baseGravityY = origins.gravityDir.y
        const adjustedGravityY = baseGravityY - velocityFactor
        joint.settings.gravityDir.set(0, adjustedGravityY, 0).normalize()
        joint.settings.gravityPower = origins.gravityPower * (1 + Math.abs(velocityFactor) * 0.5)
      }
    }
  })
} else {
  tvrm.springBoneManager.joints.forEach(joint => { joint._skipCollision = true })
}
```

Then continue with `tvrm.update(physicsDelta)` as before.

#### Change 3: Mark `_skipCollision = false` at LOD 0 transition

Need to ensure when transitioning from LOD 1+ back to LOD 0, collision gets re-enabled. The `springLod === 0` branch already sets it to `false` for all joints, so this is handled automatically.

## Verification
1. `npm run lint` — should show no new issues
2. Springs should still animate smoothly at close range (20fps is imperceptible vs 60fps for secondary animation)
3. Springs at LOD 1+ should still work but without gravity tuning
4. Profiler shows ~67% fewer spring updates at close range
