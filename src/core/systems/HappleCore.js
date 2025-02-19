import { initHappleCore } from '../../client/happle-core'

export class HappleCore {
  constructor(world) {
    this.world = world
    this.cleanup = null
    this.position = { x: 0, y: 0, z: 0 } // Default position
  }

  async init() {
    // Initialize Happle-Core systems
    this.cleanup = initHappleCore(this.world)

    // Register event handlers
    this.world.on('playerJoined', this.handlePlayerJoined)
    this.world.on('playerLeft', this.handlePlayerLeft)
  }

  start() {
    // System is already initialized in init()
  }

  preTick() {
    // Called before each tick
  }

  preFixedUpdate() {
    // Called before fixed update
  }

  fixedUpdate(delta) {
    // Fixed timestep update
  }

  postFixedUpdate(delta) {
    // Called after fixed update
  }

  preUpdate(alpha) {
    // Called before update
  }

  update(delta) {
    // Update logic
  }

  postUpdate(delta) {
    // Called after update
  }

  lateUpdate(delta) {
    // Late update logic
  }

  postLateUpdate(delta) {
    // Called after late update
  }

  commit() {
    // Commit changes
  }

  postTick() {
    // Called after tick
  }

  handlePlayerJoined = (player) => {
    if (!player) return
    // Initialize player's head screen and idle animations
    this.world.emit('happleCore:screenUpdate', {
      playerId: player.id,
      content: player.name || 'Player'
    })
  }

  handlePlayerLeft = (player) => {
    if (!player) return
    // Cleanup player's Happle-Core components
    this.world.emit('happleCore:screenUpdate', {
      playerId: player.id,
      content: null
    })
  }

  destroy() {
    // Cleanup Happle-Core systems
    if (this.cleanup) {
      this.cleanup()
    }

    // Remove event handlers
    this.world.off('playerJoined', this.handlePlayerJoined)
    this.world.off('playerLeft', this.handlePlayerLeft)
  }
} 