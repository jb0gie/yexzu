/**
 * DojoComponent
 *
 * - Component for Hyperfy entities to sync with DojoEngine
 * - Manages onchain state synchronization for individual entities
 * - Handles optimistic updates with blockchain confirmation
 * - Provides automatic error handling and fallbacks
 *
 * Usage:
 *   entity.add('dojo', {
 *     worldAddress: '0x1234...',
 *     syncInterval: 1000,
 *     components: ['Position', 'Health', 'Inventory']
 *   })
 *
 */
export class DojoComponent {
  constructor(world, config = {}) {
    this.world = world
    this.entity = null // Will be set when attached to entity
    this.config = {
      worldAddress: null,
      syncInterval: 1000,
      components: ['Position', 'Rotation'], // Default components to sync
      autoSync: true,
      optimisticUpdates: true,
      maxRetries: 3,
      ...config
    }

    // Dojo integration
    this.dojoEntityId = null
    this.isSynced = false
    this.lastSyncTime = 0
    this.pendingUpdates = new Map()
    this.syncTimer = null

    // Component values cache
    this.componentCache = new Map()

    // State tracking
    this.isDirty = false
    this.networkError = null
  }

  // Called when component is attached to an entity
  attach(entity) {
    this.entity = entity
    console.log(`[DojoComponent] 🔗 Attached to entity: ${entity.data.id}`)

    // Start auto-sync if enabled
    if (this.config.autoSync && this.world.dojo?.isConnected()) {
      this.startAutoSync()
    }

    // Listen for world dojo connection changes
    if (this.world.events) {
      this.world.events.on('dojo:connected', this.onDojoConnected.bind(this))
      this.world.events.on('dojo:disconnected', this.onDojoDisconnected.bind(this))
    }
  }

  // Called when component is detached from entity
  detach() {
    console.log(`[DojoComponent] 🔓 Detached from entity: ${this.entity.data.id}`)

    this.stopAutoSync()
    this.unsyncFromDojo()

    if (this.world.events) {
      this.world.events.off('dojo:connected', this.onDojoConnected)
      this.world.events.off('dojo:disconnected', this.onDojoDisconnected)
    }

    this.entity = null
  }

  // Dojo connection handlers
  onDojoConnected() {
    console.log(`[DojoComponent] 🌐 Dojo connected, syncing entity: ${this.entity.data.id}`)
    this.startAutoSync()
  }

  onDojoDisconnected() {
    console.log(`[DojoComponent] 📴 Dojo disconnected, stopping sync: ${this.entity.data.id}`)
    this.stopAutoSync()
  }

  // Entity synchronization
  async syncToDojo() {
    if (!this.world.dojo?.isConnected()) {
      console.warn(`[DojoComponent] ❌ Dojo not connected, cannot sync entity: ${this.entity.data.id}`)
      return false
    }

    try {
      if (!this.isSynced) {
        // First time sync - create Dojo entity
        this.dojoEntityId = await this.world.dojo.syncEntity(this.entity)
        this.isSynced = true
        console.log(`[DojoComponent] ✅ Entity synced to Dojo: ${this.entity.data.id} -> ${this.dojoEntityId}`)
      }

      // Push current state to Dojo
      await this.pushCurrentState()

      this.lastSyncTime = Date.now()
      this.networkError = null
      return true

    } catch (error) {
      console.error(`[DojoComponent] ❌ Sync failed for entity ${this.entity.data.id}:`, error)
      this.networkError = error.message

      // Retry with exponential backoff
      const retryDelay = Math.min(1000 * Math.pow(2, this.config.maxRetries), 30000)
      setTimeout(() => this.syncToDojo(), retryDelay)

      return false
    }
  }

  async unsyncFromDojo() {
    if (this.isSynced && this.entity) {
      try {
        this.world.dojo.unsyncEntity(this.entity.data.id)
        console.log(`[DojoComponent] 🗑️ Entity unsynced from Dojo: ${this.entity.data.id}`)
      } catch (error) {
        console.error(`[DojoComponent] ❌ Unsync failed:`, error)
      }
    }

    this.isSynced = false
    this.dojoEntityId = null
    this.componentCache.clear()
  }

  // State management
  async pushCurrentState() {
    if (!this.isSynced || !this.dojoEntityId) return

    const updates = {}

    // Collect component values to push
    for (const componentType of this.config.components) {
      const value = this.getComponentValue(componentType)
      if (value !== null) {
        updates[componentType] = value
      }
    }

    // Push updates to Dojo
    for (const [componentType, value] of Object.entries(updates)) {
      try {
        const result = await this.world.dojo.setComponent(this.dojoEntityId, componentType, value)
        this.componentCache.set(componentType, value)

        console.log(`[DojoComponent] 📤 Updated component: ${this.entity.data.id}.${componentType}`, value)
      } catch (error) {
        console.error(`[DojoComponent] ❌ Failed to update component ${componentType}:`, error)
      }
    }
  }

  getComponentValue(componentType) {
    if (!this.entity) return null

    try {
      switch (componentType) {
        case 'Position': {
          const pos = this.entity.position || [0, 0, 0]
          return { x: pos[0], y: pos[1], z: pos[2] }
        }

        case 'Rotation': {
          const rot = this.entity.rotation || [0, 0, 0]
          return { x: rot[0], y: rot[1], z: rot[2] }
        }

        case 'Scale': {
          const scale = this.entity.scale || [1, 1, 1]
          return { x: scale[0], y: scale[1], z: scale[2] }
        }

        case 'Health': {
          // Bridge with existing Hyperfy health system
          let current = 100
          let max = 100

          // Check if it's a player with existing health system
          if (this.entity.isPlayer && this.entity.playerProxy) {
            current = this.entity.playerProxy.health || 100
            max = 100 // HEALTH_MAX constant from createPlayerProxy.js
          }
          // Fallback for regular entities
          else if (this.entity.health !== undefined) {
            current = this.entity.health
            max = this.entity.maxHealth || 100
          }

          return { current, max }
        }

        case 'Owner': {
          return {
            address: this.entity.owner || this.world.web3?.getAddress() || null
          }
        }

        case 'Inventory': {
          return {
            items: this.entity.inventory || [],
            capacity: this.entity.inventoryCapacity || 20
          }
        }

        case 'Velocity': {
          const vel = this.entity.velocity || [0, 0, 0]
          return { x: vel[0], y: vel[1], z: vel[2] }
        }

        default:
          // Try to get custom component
          if (this.entity[componentType] !== undefined) {
            return this.entity[componentType]
          }
          console.warn(`[DojoComponent] Unknown component type: ${componentType}`)
          return null
      }
    } catch (error) {
      console.error(`[DojoComponent] Error getting component value ${componentType}:`, error)
      return null
    }
  }

  // Apply onchain updates to the entity
  async applyOnchainUpdates(updates) {
    if (!this.entity) return

    console.log(`[DojoComponent] 📥 Applying onchain updates to entity: ${this.entity.data.id}`, updates)

    for (const [componentType, value] of Object.entries(updates)) {
      try {
        this.applyComponentUpdate(componentType, value)
        this.componentCache.set(componentType, value)
      } catch (error) {
        console.error(`[DojoComponent] ❌ Failed to apply ${componentType} update:`, error)
      }
    }
  }

  applyComponentUpdate(componentType, value) {
    if (!this.entity) return

    switch (componentType) {
      case 'Position':
        if (value.x !== undefined && value.y !== undefined && value.z !== undefined) {
          this.entity.position = [value.x, value.y, value.z]
        }
        break

      case 'Rotation':
        if (value.x !== undefined && value.y !== undefined && value.z !== undefined) {
          this.entity.rotation = [value.x, value.y, value.z]
        }
        break

      case 'Scale':
        if (value.x !== undefined && value.y !== undefined && value.z !== undefined) {
          this.entity.scale = [value.x, value.y, value.z]
        }
        break

      case 'Health':
        // Bridge with existing Hyperfy health system
        if (this.entity.isPlayer && this.entity.playerProxy) {
          // Use Hyperfy's built-in player health system
          if (value.current !== undefined) {
            const healthDiff = value.current - this.entity.playerProxy.health
            if (healthDiff > 0) {
              this.entity.playerProxy.heal(healthDiff)
            } else if (healthDiff < 0) {
              this.entity.playerProxy.damage(-healthDiff)
            }
          }
        } else {
          // Handle regular entities
          if (value.current !== undefined) {
            this.entity.health = value.current
          }
          if (value.max !== undefined) {
            this.entity.maxHealth = value.max
          }
        }
        break

      case 'Owner':
        if (value.address) {
          this.entity.owner = value.address
        }
        break

      case 'Inventory':
        if (Array.isArray(value.items)) {
          this.entity.inventory = value.items
        }
        if (value.capacity !== undefined) {
          this.entity.inventoryCapacity = value.capacity
        }
        break

      case 'Velocity':
        if (value.x !== undefined && value.y !== undefined && value.z !== undefined) {
          this.entity.velocity = [value.x, value.y, value.z]
        }
        break

      default:
        // Try to set custom component
        this.entity[componentType] = value
        console.log(`[DojoComponent] 📝 Set custom component: ${componentType}`, value)
    }
  }

  // Auto-sync management
  startAutoSync() {
    if (this.syncTimer || !this.config.autoSync) return

    console.log(`[DojoComponent] 🔄 Starting auto-sync for entity: ${this.entity.data.id}`)
    this.syncTimer = setInterval(() => {
      this.syncToDojo()
    }, this.config.syncInterval)

    // Initial sync
    this.syncToDojo()
  }

  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
      console.log(`[DojoComponent] ⏹️ Stopped auto-sync for entity: ${this.entity.data.id}`)
    }
  }

  // Transaction optimization
  async executeOnchainTransaction(calls) {
    if (!this.isSynced) {
      throw new Error('Entity not synced to Dojo - call syncToDojo() first')
    }

    try {
      const result = await this.world.dojo.execute(calls)
      console.log(`[DojoComponent] 💰 Onchain transaction executed for entity ${this.entity.data.id}:`, result.transaction_hash)
      return result
    } catch (error) {
      console.error(`[DojoComponent] ❌ Onchain transaction failed for entity ${this.entity.data.id}:`, error)
      throw error
    }
  }

  // State and debugging
  getStatus() {
    return {
      isSynced: this.isSynced,
      dojoEntityId: this.dojoEntityId,
      lastSyncTime: this.lastSyncTime,
      autoSync: this.config.autoSync,
      components: this.config.components,
      networkError: this.networkError,
      pendingUpdates: this.pendingUpdates.size
    }
  }

  forceSync() {
    return this.syncToDojo()
  }

  markDirty() {
    this.isDirty = true
    // Trigger immediate sync if auto-sync is enabled
    if (this.config.autoSync && this.isSynced) {
      this.syncToDojo()
    }
  }

  // Cleanup
  destroy() {
    this.stopAutoSync()
    this.unsyncFromDojo()
    this.pendingUpdates.clear()
    this.componentCache.clear()
  }
}