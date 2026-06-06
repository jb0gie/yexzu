# Fix Animation Pipeline and Spring Bone Lag

## Problem
1. Locomotion animations broke because `skeleton.bones.forEach(bone => bone.updateMatrixWorld())` was removed. `Skeleton.prototype.update()` only reads `bone.matrixWorld` for GPU — it doesn't propagate quaternion changes.
2. Performance still tanks because `skeleton.update` wasn't set to `noop` at the right point, allowing THREE render loop to call it 3× per SkinnedMesh.
3. Spring bone `m.skeleton.update()` loop was redundant but cheap.

## Changes

### File: `src/core/extras/createVRMFactory.js` (lines 360-454)

Replace the entire `update` function from `let _pf = 0` to `skeleton.update = noop` with:

```js
    let _pf = 0
    const update = delta => {
      let _t1, _t2, _t3, _t4, _t5, _t6, _t7, _t8
      const _t0 = performance.now()

      if (rateCheck && distance > DIST_MAX) {
        if (++_pf % 60 === 0) {
          console.warn(`[VRM] culled (dist=${(distance || 0).toFixed(1)})`)
        }
        return
      }

      elapsed += delta
      const doAnim = rateCheck ? elapsed >= rate : true
      if (doAnim) {
        mixer.update(elapsed)
        _t1 = performance.now()

        additiveAnims.update(delta)
        _t2 = performance.now()

        _t3 = performance.now()

        if (!locomotionDisabled) {
          updateLocomotion(delta)
        }
        _t4 = performance.now()

        if (expr.expressionsEnabled) {
          expr.updateBlink(elapsed)
          expr.updateMouth(elapsed, talking)
          if (exprManager) {
            expr.updateExpressionManager(elapsed)
          } else {
            expr.updateExpressionNodes()
          }
        }
        _t5 = performance.now()

        if (loco.gazeDir && distance < MAX_GAZE_DISTANCE && (currentEmote ? currentEmote.gaze : true)) {
          aimBone('neck', loco.gazeDir, delta, {
            minAngle: -30, maxAngle: 30, smoothing: 0.4, weight: 0.6,
          })
          aimBone('head', loco.gazeDir, delta, {
            minAngle: -30, maxAngle: 30, smoothing: 0.4, weight: 0.6,
          })
        }
        _t6 = performance.now()

        skeleton.bones.forEach(bone => bone.updateMatrixWorld())
        elapsed = 0
      }
      _t7 = performance.now()

      if (!springInit) initSpringBones()
      let didSpring = false
      if (hasSprings && tvrm?.springBoneManager && springLod < 3) {
        springElapsed += delta
        const doSpring = rateCheck ? springElapsed >= springRate : true
        if (doSpring) {
          didSpring = true
          _t8 = performance.now()
          const verticalVelocity = hooks.getVerticalVelocity ? hooks.getVerticalVelocity() : 0
          const velocityFactor = Math.max(-1, Math.min(1, verticalVelocity / 10))
          tvrm.springBoneManager.joints.forEach(joint => {
            joint._skipCollision = springLod > 0
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
          const _t9 = performance.now()
          const physicsDelta = Math.min(delta, springLod === 0 ? 0.033 : 0.05)
          tvrm.update(physicsDelta)
          const _tA = performance.now()
          if (++_pf % 60 === 0) {
            const _s = doAnim ? `anim=${(_t1-_t0).toFixed(1)} add=${(_t2-_t1).toFixed(1)} skel=${(_t3-_t2).toFixed(1)} loco=${(_t4-_t3).toFixed(1)} expr=${(_t5-_t4).toFixed(1)} gaze=${(_t6-_t5).toFixed(1)} ` : ''
            console.warn(`[VRM] ${_s}spring_grav=${(_t9-_t8).toFixed(1)} spring_tvrm=${(_tA-_t9).toFixed(1)} total=${(_tA-_t0).toFixed(1)}ms`)
          }
          springElapsed = 0
        }
      }

      if (doAnim || didSpring) {
        skeleton.update = THREE.Skeleton.prototype.update
        skeleton.update()
      }
      skeleton.update = noop
    }
```

### Key differences from current broken state:

| Aspect | Current (broken) | Fixed |
|--------|-----------------|-------|
| `skeleton.bones.forEach(updateMatrixWorld)` | REMOVED → animations don't render | RESTORED in `doAnim` block (after expressions/gaze) |
| Spring path skeleton update | `skeleton.update()` before springs (wrong place) | REMOVED — not needed (matrixWorld propagated by forEach + tvrm handles own matrix) |
| End-of-frame GPU read | `if (doAnim && !didSpring)` (skips when both fire) | `if (doAnim \|\| didSpring)` (always reads after any change) |
| Render-time noop | Set once at end | Same (correct, prevents 3× re-reads per SkinnedMesh) |
| Culling | Present | Same |
| Amortization (Avatars.js) | 3/frame | Same |

### File: `src/core/systems/Avatars.js` — no change needed (already correct)

## Verification
1. `npm run lint` — should show no new issues
2. Locomotion animations should play on all avatars
3. Spring bones should still work (with LOD + collision skip)
4. Far avatars (>60m) should show `[VRM] culled` in console
5. Profiler should show single `skeleton.update()` per frame with changes
