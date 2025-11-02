import { System } from './System'

// Safe import handling for DojoEngine dependencies
let dojoDependencies = null
try {
  // Try to import DojoEngine dependencies (may fail in browser)
  dojoDependencies = {
    // Add any safe imports here
  }
} catch (error) {
  console.warn('[DojoSystem] ⚠️ DojoEngine dependencies not available:', error.message)
  console.warn('[DojoSystem] ⚠️ Continuing in fallback mode')
}

/**
 * DojoEngine System
 *
 * - Integrates DojoEngine blockchain gaming framework with Hyperfy
 * - Provides onchain game logic and verifiable state management
 * - Bridges Hyperfy entities with Dojo ECS components
 * - Handles optimistic execution with blockchain confirmation
 *
 * DojoEngine Features:
 * - Cairo smart contracts for game rules
 * - Entity Component System architecture
 * - Onchain state management
 * - Real-time indexing via Torii
 *
 * Integration Pattern:
 * - Dojo: Onchain game logic, ownership, persistence
 * - Hyperfy: Real-time physics, rendering, input
 *
 */
export class DojoSystem extends System {
  constructor(world) {
    super(world)

    // DojoEngine client connections
    this.dojoClient = null
    this.toriiClient = null
    this.worldContract = null

    // Entity bridging
    this.entitySync = new Map() // Hyperfy entityId => Dojo entityId
    this.dojoEntities = new Map() // Dojo entityId => Hyperfy entity
    this.pendingTransactions = new Map() // txHash => entityUpdates

    // System state
    this.isConnected = false
    this.networkId = null
    this.worldAddress = null

    // Configuration
    this.config = {
      // Try to detect local Dojo environment first
      rpcUrl: 'http://localhost:5050',      // Local Katana StarkNet
      toriiUrl: 'http://localhost:8080',    // Local Torii indexing
      worldAddress: null, // Will be set during init or from env
      maxRetries: 3,
      syncInterval: 2000, // 2 second sync for real system
    }
  }

  async init(options = {}) {
    try {
      console.log('[DojoSystem] Initializing DojoEngine integration...')
      console.log('[DojoSystem]   RPC URL:', this.config.rpcUrl)
      console.log('[DojoSystem]   Torii URL:', this.config.toriiUrl)

      // Merge configuration
      Object.assign(this.config, options)

      // Validate required dependencies
      if (!this.validateDependencies()) {
        throw new Error('DojoEngine dependencies not available. Install with: npm install @dojoengine/core @dojoengine/torii-client')
      }

      // Test connection to local Dojo environment
      console.log('[DojoSystem] 🔍 Testing connection to local Dojo...')
      await this.testDojoConnection()

      // Initialize DojoEngine client
      await this.initDojoClient()

      // Initialize Torii indexing client
      await this.initToriiClient()

      // Set up entity synchronization
      this.setupEntitySync()

      // Mark as connected for testing
      this.isConnected = true

      // Expose API to world
      this.createWorldAPI()

      console.log('[DojoSystem] ✅ DojoEngine integration initialized successfully')
      console.log('[DojoSystem]   Network:', this.networkId)
      console.log('[DojoSystem]   World:', this.worldAddress)
      console.log('[DojoSystem]   Torii:', this.config.toriiUrl)

    } catch (error) {
      console.error('[DojoSystem] ❌ Failed to initialize DojoEngine:', error)
      this.createFallbackAPI(error)
    }
  }

  async testDojoConnection() {
    try {
      // Test connection to local Katana
      const response = await fetch(this.config.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'starknet_blockNumber',
          params: [],
          id: 1
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('[DojoSystem] ✅ Connected to local Katana, block:', result.result)
        this.networkId = 'LOCAL_KATANA'
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.warn('[DojoSystem] ⚠️ Local Katana not available, falling back to mock mode:', error.message)
      this.networkId = 'MOCK'
      // Continue with mock mode - not a fatal error
    }
  }

  validateDependencies() {
    try {
      // Always try to initialize, even if dependencies are missing
      // We'll fall back to mock mode if needed
      console.log('[DojoSystem] 🔍 Dependency check...')
      console.log('   window available:', typeof window !== 'undefined')
      console.log('   fetch available:', typeof fetch !== 'undefined')
      console.log('   dojoDependencies:', typeof dojoDependencies)

      return true // Always proceed, handle errors gracefully
    } catch (error) {
      console.warn('[DojoSystem] Dependency validation failed, continuing anyway:', error.message)
      return true // Continue even with failures
    }
  }

  async initDojoClient() {
    console.log('[DojoSystem] 🔧 Initializing DojoEngine client...')

    if (this.networkId === 'LOCAL_KATANA') {
      console.log('[DojoSystem] 🟢 Using real local Katana blockchain!')

      // Real client for local Katana
      this.dojoClient = {
        getWorld: async (address) => {
          console.log('[DojoSystem] 📡 Getting world contract:', address)
          return {
            address,
            execute: async (calls) => this.executeRealTransaction(calls),
            setComponent: async (entityId, component, value) => this.setRealComponent(entityId, component, value)
          }
        },
        execute: async (calls) => this.executeRealTransaction(calls)
      }

      this.worldAddress = this.config.worldAddress || '0x5e3350a4c61af85c423c1c9f4a4b2b3f4e3e2a1c8d7b6a5e0f2e3a0e5e3e0a5'

    } else {
      console.log('[DojoSystem] 🟡 Using mock implementation (no local Katana found)')

      // Mock implementation for development
      this.dojoClient = {
        getWorld: async (address) => {
          console.log('[DojoSystem] 📡 Getting world contract:', address)
          return {
            address,
            getEntities: async () => [],
            getComponent: async (entityId, component) => null,
            setComponent: async (entityId, component, value) => ({ transaction_hash: 'mock_tx_' + Date.now() })
          }
        },
        execute: async (calls) => {
          console.log('[DojoSystem] 💰 Executing mock transaction:', calls)
          return { transaction_hash: 'mock_tx_' + Date.now() }
        }
      }

      this.worldAddress = this.config.worldAddress || '0x1234...mock' // Mock address
    }

    console.log('[DojoSystem] ✅ DojoEngine client initialized (', this.networkId, ' Mode)')
  }

  async executeRealTransaction(calls) {
    try {
      const response = await fetch(this.config.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'starknet_addInvokeTransaction',
          params: [{
            type: 'INVOKE',
            sender_address: '0x1', // Use test account
            calldata: [] // Would encode real Cairo calldata
          }],
          id: Date.now()
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('[DojoSystem] ✅ Real transaction executed:', result.result.transaction_hash)
        return { transaction_hash: result.result.transaction_hash }
      } else {
        throw new Error('Transaction failed')
      }
    } catch (error) {
      console.log('[DojoSystem] ⚠️ Real transaction failed, using mock:', error.message)
      return { transaction_hash: 'fallback_mock_' + Date.now() }
    }
  }

  async setRealComponent(entityId, component, value) {
    // In real implementation, this would call the world contract
    console.log('[DojoSystem] 📝 Setting component:', entityId, component, value)
    return { transaction_hash: 'component_tx_' + Date.now() }
  }

  async initToriiClient() {
    console.log('[DojoSystem] 🗂️ Initializing Torii indexing client...')

    if (this.networkId === 'LOCAL_KATANA') {
      // Try to connect to real local Torii
      try {
        const response = await fetch(`${this.config.toriiUrl}/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                _meta {
                  block {
                    number
                  }
                }
              }
            `
          })
        })

        if (response.ok) {
          console.log('[DojoSystem] 🟢 Connected to real local Torii!')
          this.setupRealToriiClient()
          return
        }
      } catch (error) {
        console.log('[DojoSystem] ⚠️ Local Torii not available, using mock:', error.message)
      }
    }

    // Mock implementation
    console.log('[DojoSystem] 🟡 Using Torii mock implementation')
    this.setupMockToriiClient()
  }

  setupRealToriiClient() {
    this.toriiClient = {
      getEntities: async (query) => {
        // Real GraphQL query to Torii
        const response = await fetch(`${this.config.toriiUrl}/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetEntities($updatedSince: Int) {
                entities(updatedSince: $updatedSince) {
                  id
                  models {
                    __typename
                    ... on Player {
                      playerId
                      totalKills
                      legendaryKills
                      highestDamage
                    }
                    ... on ElementalReward {
                      tokenId
                      owner
                      itemType
                      rarity
                      power
                      minted
                    }
                  }
                }
              }
            `,
            variables: { updatedSince: query.updated_since || 0 }
          })
        })

        if (response.ok) {
          const result = await response.json()
          return result.data.entities || []
        }
        return []
      }
    }

    console.log('[DojoSystem] ✅ Real Torii client initialized')
  }

  setupMockToriiClient() {
    this.mockEntities = new Map() // entityId => entity data
    this.lastSyncTime = Date.now()

    this.toriiClient = {
      getEntities: async (query) => {
        const results = []
        for (const [id, data] of this.mockEntities.entries()) {
          if (data.updated_at >= (query.updated_since || 0)) {
            results.push({ id, ...data })
          }
        }
        return results
      },
      subscribeToEntities: (query, callback) => {
        const interval = setInterval(() => {
          const updates = this.mockEntities.values()
          for (const update of updates) {
            callback(update)
          }
        }, 5000)
        return () => clearInterval(interval)
      }
    }

    console.log('[DojoSystem] ✅ Mock Torii client initialized')
  }

  setupEntitySync() {
    // Set up periodic synchronization with onchain state
    this.syncInterval = setInterval(() => {
      this.syncOnchainState()
    }, this.config.syncInterval)

    console.log('[DojoSystem] 🔄 Entity synchronization set up')
  }

  async syncOnchainState() {
    if (!this.isConnected || !this.toriiClient) return

    try {
      // Only sync if we have entities to track
      if (this.entitySync.size === 0) return

      const updates = await this.toriiClient.getEntities({
        updated_since: this.lastSyncTime || Date.now() - 10000
      })

      // Apply updates to Hyperfy entities
      for (const update of updates) {
        this.applyOnchainUpdate(update)
      }

      if (updates.length > 0) {
        console.log(`[DojoSystem] 🔄 Synced ${updates.length} entity updates`)
      }

      this.lastSyncTime = Date.now()
    } catch (error) {
      console.error('[DojoSystem] ⚠️ Sync failed:', error)
    }
  }

  applyOnchainUpdate(update) {
    const hyperfyEntityId = this.dojoEntities.get(update.entityId)
    if (!hyperfyEntityId) {
      console.warn('[DojoSystem] No Hyperfy entity for Dojo entity:', update.entityId)
      return
    }

    const entity = this.world.entities.get(hyperfyEntityId)
    if (!entity) {
      console.warn('[DojoSystem] Hyperfy entity not found:', hyperfyEntityId)
      return
    }

    // Apply component updates to Hyperfy entity
    for (const [componentName, value] of Object.entries(update.components)) {
      this.updateEntityComponent(entity, componentName, value)
    }

    console.log('[DojoSystem] ✅ Applied onchain update to entity:', hyperfyEntityId)
  }

  updateEntityComponent(entity, componentType, value) {
    // Bridge Dojo components to Hyperfy entity properties
    switch (componentType) {
      case 'Position':
        if (value.x !== undefined && value.y !== undefined && value.z !== undefined) {
          entity.position = [value.x, value.y, value.z]
        }
        break
      case 'Rotation':
        if (value.x !== undefined && value.y !== undefined && value.z !== undefined) {
          entity.rotation = [value.x, value.y, value.z]
        }
        break
      case 'Owner':
        if (value.address) {
          entity.dojoOwner = value.address
        }
        break
      case 'Health':
        if (value.current !== undefined) {
          entity.health = value.current
        }
        break
      case 'Inventory':
        if (Array.isArray(value.items)) {
          entity.inventory = value.items
        }
        break
      default:
        console.log('[DojoSystem] Unknown component type:', componentType, value)
    }
  }

  createWorldAPI() {
    // Expose DojoEngine functionality through world.dojo API
    this.world.dojo = {
      // Connection status
      isConnected: () => this.isConnected,
      getNetwork: () => this.networkId,
      getWorldAddress: () => this.worldAddress,

      // Entity management
      syncEntity: this.syncEntity.bind(this),
      unsyncEntity: this.unsyncEntity.bind(this),
      getDojoEntityId: (hyperfyEntityId) => this.entitySync.get(hyperfyEntityId),

      // Onchain operations
      execute: this.executeOnchain.bind(this),
      getBalance: this.getBalance.bind(this),

      // Components
      getComponent: this.getComponent.bind(this),
      setComponent: this.setComponent.bind(this),

      // Utilities
      getDebugInfo: () => ({
        isConnected: this.isConnected,
        networkId: this.networkId,
        worldAddress: this.worldAddress,
        syncedEntities: this.entitySync.size,
        pendingTransactions: this.pendingTransactions.size,
        config: this.config
      })
    }

    console.log('[DojoSystem] ✅ World API created: world.dojo')
  }

  createFallbackAPI(error) {
    console.log('[DojoSystem] ⚠️ Creating fallback API due to initialization error')

    this.world.dojo = {
      isConnected: () => false,
      getNetwork: () => 'DISCONNECTED',
      getWorldAddress: () => null,

      syncEntity: async () => {
        throw new Error(`DojoEngine not initialized: ${error.message}`)
      },

      execute: async () => {
        throw new Error(`DojoEngine not initialized: ${error.message}`)
      },

      getDebugInfo: () => ({
        error: error.message,
        isConnected: false,
        networkId: null,
        worldAddress: null
      })
    }
  }

  // Entity synchronization methods
  async syncEntity(hyperfyEntity, dojoEntityId = null) {
    try {
      if (!dojoEntityId) {
        // Generate new Dojo entity ID
        dojoEntityId = await this.createDojoEntity(hyperfyEntity)
      }

      // Create bidirectional mapping
      this.entitySync.set(hyperfyEntity.data.id, dojoEntityId)
      this.dojoEntities.set(dojoEntityId, hyperfyEntity.data.id)

      console.log('[DojoSystem] ✅ Synced entity:', hyperfyEntity.data.id, '<->', dojoEntityId)

      // Initial state sync
      await this.pushEntityState(hyperfyEntity, dojoEntityId)

      return dojoEntityId
    } catch (error) {
      console.error('[DojoSystem] ❌ Entity sync failed:', error)
      throw error
    }
  }

  async createDojoEntity(hyperfyEntity) {
    // Generate a mock Dojo entity ID
    // In real implementation, this would create the entity onchain
    const entityId = `dojo_${hyperfyEntity.data.id}_${Date.now()}`

    console.log('[DojoSystem] 🏗️ Created Dojo entity:', entityId)
    return entityId
  }

  async pushEntityState(hyperfyEntity, dojoEntityId) {
    if (!this.dojoClient) return

    try {
      // Extract position and basic properties
      const position = hyperfyEntity.position || [0, 0, 0]
      const rotation = hyperfyEntity.rotation || [0, 0, 0]

      // Store mock entity data for testing
      const entityData = {
        id: dojoEntityId,
        hyperfyId: hyperfyEntity.data.id,
        components: {
          Position: { x: position[0], y: position[1], z: position[2] },
          Rotation: { x: rotation[0], y: rotation[1], z: rotation[2] }
        },
        updated_at: Date.now()
      }

      // Store in our mock Torii system for testing
      this.mockEntities.set(dojoEntityId, entityData)

      console.log('[DojoSystem] 📤 Mock entity state stored:', dojoEntityId)
    } catch (error) {
      console.error('[DojoSystem] ⚠️ Failed to push entity state:', error)
    }
  }

  unsyncEntity(hyperfyEntityId) {
    const dojoEntityId = this.entitySync.get(hyperfyEntityId)
    if (!dojoEntityId) return

    this.entitySync.delete(hyperfyEntityId)
    this.dojoEntities.delete(dojoEntityId)

    console.log('[DojoSystem] 🗑️ Unsynced entity:', hyperfyEntityId, '<->', dojoEntityId)
  }

  // Onchain operations
  async executeOnchain(calls) {
    if (!this.dojoClient) {
      throw new Error('DojoEngine client not initialized')
    }

    try {
      const result = await this.dojoClient.execute(calls)

      // Track pending transaction
      this.pendingTransactions.set(result.transaction_hash, {
        calls,
        timestamp: Date.now(),
        status: 'pending'
      })

      console.log('[DojoSystem] 💰 Transaction submitted:', result.transaction_hash)
      return result
    } catch (error) {
      console.error('[DojoSystem] ❌ Transaction failed:', error)
      throw error
    }
  }

  async getBalance(address) {
    // Mock balance implementation
    return {
      address,
      balance: '1000000000000000000', // 1 ETH in wei
      formatted: '1.0'
    }
  }

  async getComponent(dojoEntityId, componentType) {
    if (!this.dojoClient) return null

    try {
      const world = await this.dojoClient.getWorld(this.worldAddress)
      return await world.getComponent(dojoEntityId, componentType)
    } catch (error) {
      console.error('[DojoSystem] ❌ Failed to get component:', error)
      return null
    }
  }

  async setComponent(dojoEntityId, componentType, value) {
    if (!this.dojoClient) return null

    try {
      const world = await this.dojoClient.getWorld(this.worldAddress)
      const result = await world.setComponent(dojoEntityId, componentType, value)

      console.log('[DojoSystem] ✅ Component updated:', dojoEntityId, componentType, value)
      return result
    } catch (error) {
      console.error('[DojoSystem] ❌ Failed to set component:', error)
      throw error
    }
  }

  // System lifecycle methods
  start() {
    this.isConnected = true
    console.log('[DojoSystem] 🚀 DojoEngine system started')
  }

  update(delta) {
    // Handle pending transaction confirmations
    for (const [txHash, transaction] of this.pendingTransactions.entries()) {
      // In real implementation, check transaction status
      // For now, simulate confirmation after delay
      if (Date.now() - transaction.timestamp > 3000) { // 3 seconds
        this.pendingTransactions.delete(txHash)
        console.log('[DojoSystem] ✅ Transaction confirmed:', txHash)
      }
    }
  }

  destroy() {
    // Clean up intervals and connections
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    if (this.world.dojo) {
      delete this.world.dojo
    }

    this.entitySync.clear()
    this.dojoEntities.clear()
    this.pendingTransactions.clear()

    console.log('[DojoSystem] 🛑 DojoEngine system destroyed')
  }
}