import * as THREE from './three'

export function createVRMExpressions({ exprManager, vrm, origVRM, skinnedMeshes, skeleton }) {
  const expressionsByName = (() => {
    const map = new Map()
    for (const child of vrm.scene.children) {
      if (child && child.type === 'VRMExpression') {
        let exprName = child.expressionName
        if (!exprName && typeof child.name === 'string' && child.name.startsWith('VRMExpression_')) {
          exprName = child.name.substring('VRMExpression_'.length)
        }
        if (exprName) map.set(exprName, child)
      }
    }
    return map
  })()

  const expressionWeights = {
    blink: 0,
    blinkLeft: 0,
    blinkRight: 0,
    aa: 0,
    ee: 0,
    ih: 0,
    oh: 0,
    ou: 0,
  }

  const expressionsEnabled = !!exprManager || expressionsByName.size > 0

  const resolveName = (...candidates) => {
    for (const c of candidates) {
      const v = exprManager?.getValue?.(c)
      if (v !== null && v !== undefined) return c
    }
    for (const c of candidates) {
      if (expressionsByName.has(c)) return c
    }
    return null
  }

  const nameMap = {
    blink: resolveName('blink', 'Blink', 'BLINK'),
    aa: resolveName('aa', 'A'),
    ee: resolveName('ee', 'E'),
    ih: resolveName('ih', 'I'),
    oh: resolveName('oh', 'O'),
    ou: resolveName('ou', 'U'),
  }

  let blinkingEnabled = true
  let blinkCooldown = 0
  let blinkPhase = 0
  let blinkTime = 0

  const BLINK_INTERVAL_MIN = 2.5
  const BLINK_INTERVAL_MAX = 5.0
  const BLINK_CLOSE_DURATION = 0.06
  const BLINK_OPEN_DURATION = 0.12

  function resetBlinkCooldown() {
    blinkCooldown = THREE.MathUtils.lerp(BLINK_INTERVAL_MIN, BLINK_INTERVAL_MAX, Math.random())
  }
  resetBlinkCooldown()

  const visemes = ['aa', 'ih', 'oh', 'ee', 'ou']
  let currentViseme = 'aa'
  let visemeTimer = 0
  let visemeSwitchInterval = 0.18 + Math.random() * 0.12
  let mouthTime = 0

  function setExpression(name, weight) {
    if (!expressionsEnabled) return
    if (expressionWeights[name] === undefined) return
    const clamped = THREE.MathUtils.clamp(weight, 0, 1)
    expressionWeights[name] = clamped
    const actual = nameMap[name] || name
    exprManager?.setValue?.(actual, clamped)
  }

  function clearMouth() {
    setExpression('aa', 0)
    setExpression('ee', 0)
    setExpression('ih', 0)
    setExpression('oh', 0)
    setExpression('ou', 0)
  }

  function updateBlink(delta) {
    if (!expressionsEnabled || !blinkingEnabled) return
    if (blinkPhase === 0) {
      blinkCooldown -= delta
      if (blinkCooldown <= 0) {
        blinkPhase = 1
        blinkTime = 0
      }
    }
    if (blinkPhase === 1) {
      blinkTime += delta
      const t = THREE.MathUtils.clamp(blinkTime / BLINK_CLOSE_DURATION, 0, 1)
      setExpression('blink', t)
      if (t >= 1) {
        blinkPhase = 2
        blinkTime = 0
      }
    } else if (blinkPhase === 2) {
      blinkTime += delta
      const t = THREE.MathUtils.clamp(blinkTime / BLINK_OPEN_DURATION, 0, 1)
      setExpression('blink', 1 - t)
      if (t >= 1) {
        blinkPhase = 0
        resetBlinkCooldown()
      }
    }
  }

  function updateMouth(delta, isTalking) {
    if (!expressionsEnabled) return
    if (!isTalking) {
      clearMouth()
      return
    }
    mouthTime += delta
    visemeTimer += delta
    if (visemeTimer >= visemeSwitchInterval) {
      visemeTimer = 0
      visemeSwitchInterval = 0.18 + Math.random() * 0.12
      currentViseme = visemes[(Math.random() * visemes.length) | 0]
    }
    const oscillation = (Math.sin(mouthTime * 12 + Math.random() * 0.5) + 1) * 0.5
    const weight = 0.4 + 0.6 * oscillation
    clearMouth()
    setExpression(currentViseme, weight)
  }

  let morphMirrorInit = false
  const morphPairs = []
  function initMorphMirror() {
    if (morphMirrorInit) return
    if (!origVRM?.scene) return
    const src = []
    const dst = []
    origVRM.scene.traverse(o => {
      if (o.isSkinnedMesh && o.morphTargetInfluences) src.push(o)
    })
    vrm.scene.traverse(o => {
      if (o.isSkinnedMesh && o.morphTargetInfluences) dst.push(o)
    })
    for (let i = 0; i < src.length; i++) {
      const s = src[i]
      const d = dst.find(x => x.name === s.name) || dst[i]
      if (d) morphPairs.push([s, d])
    }
    morphMirrorInit = true
  }

  function updateMorphMirror() {
    if (!morphMirrorInit) initMorphMirror()
    for (const [s, d] of morphPairs) {
      const a = s.morphTargetInfluences
      const b = d.morphTargetInfluences
      if (!a || !b) continue
      const len = Math.min(a.length, b.length)
      for (let j = 0; j < len; j++) b[j] = a[j]
    }
  }

  function updateExpressionManager(elapsed) {
    if (!exprManager) return
    for (const [canon, weight] of Object.entries(expressionWeights)) {
      const actual = nameMap[canon] || canon
      exprManager.setValue(actual, weight)
    }
    exprManager.update()
    updateMorphMirror()
  }

  function updateExpressionNodes() {
    expressionsByName.forEach(expr => expr.clearAppliedWeight())
    for (const [canon, weight] of Object.entries(expressionWeights)) {
      const actual = nameMap[canon] || canon
      const expr = expressionsByName.get(actual)
      if (!expr) continue
      expr.weight = weight
      if (weight > 0) expr.applyWeight({ multiplier: 1.0 })
    }
  }

  return {
    expressionsEnabled,
    expressionWeights,
    nameMap,
    setExpression,
    clearMouth,
    updateBlink,
    updateMouth,
    updateExpressionManager,
    updateExpressionNodes,
    setBlinkEnabled(active) {
      blinkingEnabled = !!active
    },
  }
}
