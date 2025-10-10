import { System } from './System'
import { loadPhysX } from '../loadPhysX'
import { extendThreePhysX } from '../extras/extendThreePhysX'

/**
 * ClientPhysicsExtensions System
 *
 * Loads PhysX on the client side to extend THREE.js objects with physics methods
 * This is needed for entities like PlayerLocal that use physics methods
 */
export class ClientPhysicsExtensions extends System {
  constructor() {
    super()
    this.initialized = false
  }

  async init() {
    if (typeof window === 'undefined') return // Server-only

    try {
      // Load PhysX on client to get THREE.js extensions
      await loadPhysX()

      // Extend THREE.js objects with physics methods
      extendThreePhysX()

      this.initialized = true
      console.log('[ClientPhysicsExtensions] PhysX loaded and THREE.js extended')
    } catch (error) {
      console.warn('[ClientPhysicsExtensions] Failed to load PhysX:', error)
      // Even if PhysX fails, we need to add stub methods to prevent errors
      this.addStubs()
    }
  }

  addStubs() {
    // Add stub methods to prevent toPxVec3 errors if PhysX fails to load
    if (typeof THREE !== 'undefined' && THREE.Vector3 && !THREE.Vector3.prototype.toPxVec3) {
      THREE.Vector3.prototype.toPxVec3 = function (pxVec3) {
        console.warn('toPxVec3 called but PhysX not available')
        return null
      }
    }
  }

  start() {
    // Ensure extensions are loaded before other systems start
    if (!this.initialized && typeof window !== 'undefined') {
      this.addStubs()
    }
  }
}
