import { isEqual, merge } from 'lodash-es'
import { System } from './System'

/**
 * Events System
 *
 * - Runs on both the server and client.
 * - Used to notify apps of world events like player enter/leave
 *
 */
export class Events extends System {
  constructor(world) {
    super(world)
    this.listeners = {}
  }

  on(name, callback) {
    if (!this.listeners[name]) {
      this.listeners[name] = new Set()
    }
    this.listeners[name].add(callback)
  }

  off(name, callback) {
    if (!this.listeners[name]) return
    this.listeners[name].delete(callback)
  }

  emit(name, a1, a2) {
    if (!this.listeners[name]) return
    for (const callback of this.listeners[name]) {
      try {
        callback(a1, a2)
      } catch (err) {
        console.error(`[Events] Error in '${name}' event handler:`, err)
        // Try to identify the callback source
        if (callback.toString) {
          const fnStr = callback.toString().slice(0, 100)
          console.error(`[Events] Handler source: ${fnStr}...`)
        }
      }
    }
  }

  destroy() {
    this.listeners = {}
  }
}
