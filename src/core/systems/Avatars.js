import { System } from './System'

/**
 * Avatars System
 *
 * - Runs rate checks one avatar per frame (amortization)
 *
 */
export class Avatars extends System {
  constructor(world) {
    super(world)
    this.avatars = []
    this.cursor = 0
  }

  add(avatar) {
    this.avatars.push(avatar)
  }

  remove(avatar) {
    const idx = this.avatars.indexOf(avatar)
    if (idx === -1) return
    this.avatars.splice(idx, 1)
  }

  update() {
    const n = this.avatars.length
    if (!n) return
    for (let i = 0; i < Math.min(3, n); i++) {
      const avatar = this.avatars[this.cursor % n]
      avatar.updateRate()
      this.cursor++
    }
  }

  destroy() {
    this.avatars = []
  }
}
