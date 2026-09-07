import { System } from './System'

import * as THREE from '../extras/three'
import { clamp, num, uuid } from '../utils'
import { LerpVector3 } from '../extras/LerpVector3'
import { LerpQuaternion } from '../extras/LerpQuaternion'
import { Curve } from '../extras/Curve'
import { prng } from '../extras/prng'
import { BufferedLerpVector3 } from '../extras/BufferedLerpVector3'
import { BufferedLerpQuaternion } from '../extras/BufferedLerpQuaternion'

/**
 * Script System
 *
 * - Runs on both the server and client.
 * - Executes scripts inside secure compartments
 *
 */

export class Scripts extends System {
  constructor(world) {
    super(world)
    this.compartment = new Compartment({
      console: {
        log: (...args) => console.log(...args),
        warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args),
        time: (...args) => console.time(...args),
        timeEnd: (...args) => console.timeEnd(...args),
      },
      Date: {
        now: () => Date.now(),
      },
      // PUBLIC_* config (PUBLIC_API_URL, ASSETS_BASE_URL, ...) — loaded for
      // the browser via /env.js onto the outer globalThis; app scripts are in
      // a Compartment and don't see outer globals, so endow a read-only copy.
      // Server-side scripts get a frozen snapshot of process.env PUBLIC_* too.
      env: Object.freeze({
        ...((typeof globalThis !== 'undefined' && globalThis.env) || {}),
        ...Object.fromEntries(
          Object.entries(process?.env || {}).filter(([k]) => k.startsWith('PUBLIC_')),
        ),
      }),
      URL: {
        createObjectURL: blob => URL.createObjectURL(blob),
      },
      Math,
      eval: undefined,
      harden: undefined,
      lockdown: undefined,
      num,
      prng,
      clamp,
      // Layers,
      Object3D: THREE.Object3D,
      Quaternion: THREE.Quaternion,
      Vector3: THREE.Vector3,
      Euler: THREE.Euler,
      Matrix4: THREE.Matrix4,
      LerpVector3, // deprecated - use BufferedLerpVector3
      LerpQuaternion, // deprecated - use BufferedLerpQuaternion
      BufferedLerpVector3,
      BufferedLerpQuaternion,
      // Material: Material,
      Curve,
      // Gradient: Gradient,
      DEG2RAD: Math.PI / 180,
      RAD2DEG: 180 / Math.PI,
      uuid,
      // pause: () => this.world.pause(),
    })
  }

  evaluate(code) {
    let value
    const result = {
      exec: (...args) => {
        if (!value) value = this.compartment.evaluate(wrapRawCode(code))
        return value(...args)
      },
      code,
    }
    return result
  }
}

// NOTE: config is deprecated and renamed to props
function wrapRawCode(code) {
  return `
  (function() {
    const shared = {}
    return (world, app, fetch, props, setTimeout) => {
      const config = props // deprecated
      ${code}
    }
  })()
  `
}
