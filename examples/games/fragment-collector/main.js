// 🧩 FRAGMENT COLLECTOR - Entity-based Architecture
// Collect fragments → combine → deploy → get blockchain buffs!

app.configure([
  {
    key: 'gameEnabled',
    type: 'toggle',
    label: 'Enable Game',
    trueLabel: 'Playing',
    falseLabel: 'Paused',
    initial: 'playing'
  },
  {
    key: 'spawnRate',
    type: 'range',
    label: 'Fragment Spawn Rate',
    min: 1,
    max: 10,
    step: 1,
    initial: 5
  }
])

// Game state
app.state.fragments = []           // Collected fragments
app.state.activeBuffs = []         // Active blockchain buffs
app.state.fragmentEntities = []    // Active fragment entities
app.state.lastExpirationCheck = 0  // Performance optimization

// Fragment types with their properties
const FRAGMENT_TYPES = {
  speed: {
    name: 'Speed Fragment',
    color: '#ff6b6b',
    buffType: 'speed',
    buffValue: 15,
    rarity: 'common'
  },
  jump: {
    name: 'Jump Fragment',
    color: '#4ecdc4',
    buffType: 'jump',
    buffValue: 25,
    rarity: 'common'
  },
  health: {
    name: 'Health Fragment',
    color: '#95e77e',
    buffType: 'health',
    buffValue: 20,
    rarity: 'common'
  },
  rare: {
    name: 'Rare Fragment',
    color: '#f7b731',
    buffType: 'speed',
    buffValue: 30,
    rarity: 'rare'
  }
}

// 🧩 FRAGMENT ENTITY CLASS
class FragmentEntity {
  constructor(position, typeKey) {
    this.typeKey = typeKey
    this.data = FRAGMENT_TYPES[typeKey]
    this.position = [...position]
    this.floatOffset = 0
    this.collected = false

    this.spawnTime = Date.now()
    this.id = `fragment_${this.spawnTime}_${Math.random().toString(36).substr(2, 9)}`

    this.createVisuals()
    this.createCollision()
  }

  createVisuals() {
    // Create main container
    this.container = app.create('empty', {
      position: this.position
    })

    // Create glowing orb
    this.orb = app.create('sphere', {
      radius: 0.2,
      color: this.data.color,
      emissive: this.data.color,
      emissiveIntensity: 2,
      parent: this.container
    })

    // Create particle effects
    this.particles = app.create('particles', {
      rate: 3,
      speed: 0.5,
      lifetime: 2,
      size: 0.1,
      color: this.data.color,
      parent: this.container
    })

    // Store reference for cleanup
    this.container.entity = this
  }

  createCollision() {
    // Create trigger zone for collection
    this.trigger = app.create('trigger', {
      position: this.position,
      size: [1.5, 1.5, 1.5],
      onEnter: () => this.onCollection()
    })
    this.trigger.entity = this
  }

  update(delta) {
    if (this.collected) return

    // Floating animation
    this.floatOffset += delta * 2
    this.container.position[1] = this.position[1] + Math.sin(this.floatOffset) * 0.2
    this.container.rotation[1] += delta

    // Update trigger position
    this.trigger.position[1] = this.container.position[1]
  }

  onCollection() {
    if (this.collected) return

    this.collected = true
    console.log(`✅ Collected ${this.data.name}!`)

    // Add to inventory
    app.state.fragments.push({
      type: this.typeKey,
      ...this.data,
      id: this.id,
      collectedAt: Date.now()
    })

    // Create collection effect
    EffectManager.createCollectionEffect(this)

    // Remove from world
    this.destroy()

    // Check if player has enough fragments
    if (app.state.fragments.length >= 3) {
      setTimeout(() => {
        console.log('🔧 You have enough fragments! Type app.combinations() to combine...')
      }, 1000)
    }
  }

  destroy() {
    // Clean up all entities
    try {
      app.remove(this.container)
      app.remove(this.trigger)
      app.remove(this.particles)
    } catch (e) {
      // Ignore errors during cleanup
    }

    // Remove from active list
    const index = app.state.fragmentEntities.indexOf(this)
    if (index > -1) {
      app.state.fragmentEntities.splice(index, 1)
    }
  }
}

// ⚡ BUFF INDICATOR ENTITY CLASS
class BuffIndicator {
  constructor(player, buffData) {
    this.player = player
    this.buffData = buffData
    this.active = true

    this.createVisuals()
  }

  createVisuals() {
    const playerPos = this.player.position || [0, 1, 0]
    const buffColor = this.getBuffColor()

    // Create floating indicator sphere
    this.indicator = app.create('sphere', {
      position: [playerPos[0], playerPos[1] + 0.5, playerPos[2]],
      radius: 0.1,
      color: buffColor,
      emissive: buffColor,
      emissiveIntensity: 1
    })

    // Create additional indicator ring using particles
    this.ringParticles = app.create('particles', {
      position: [playerPos[0], playerPos[1] + 0.5, playerPos[2]],
      rate: 2,
      speed: 0.3,
      lifetime: 3,
      size: 0.05,
      color: buffColor
    })
  }

  getBuffColor() {
    switch (this.buffData.buffType) {
      case 'speed': return '#ff6b6b'
      case 'jump': return '#4ecdc4'
      case 'health': return '#95e77e'
      default: return '#f7b731'
    }
  }

  update() {
    if (!this.active || !this.player) return

    // Follow player
    const playerPos = this.player.position || [0, 1, 0]
    this.indicator.position[0] = playerPos[0]
    this.indicator.position[1] = playerPos[1] + 0.5
    this.indicator.position[2] = playerPos[2]

    this.ringParticles.position[0] = playerPos[0]
    this.ringParticles.position[1] = playerPos[1] + 0.5
    this.ringParticles.position[2] = playerPos[2]
  }

  remove() {
    this.active = false
    try {
      app.remove(this.indicator)
      app.remove(this.ringParticles)
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// 🎨 EFFECT MANAGER
const EffectManager = {
  createCollectionEffect(fragment) {
    // Create burst effect at fragment position
    const burst = app.create('particles', {
      position: fragment.container.position,
      rate: 15,
      speed: 2,
      lifetime: 1,
      size: 0.15,
      color: fragment.data.color
    })

    // Create additional visual indicator using multiple bursts
    const indicator = app.create('particles', {
      position: [
        fragment.container.position[0],
        fragment.container.position[1] + 1,
        fragment.container.position[2]
      ],
      rate: 10,
      speed: 1,
      lifetime: 2,
      size: 0.1,
      color: fragment.data.color
    })

    // Clean up effects
    setTimeout(() => {
      try {
        app.remove(burst)
        app.remove(indicator)
      } catch (e) { /* ignore */ }
    }, 1500)
  },

  createDeploymentEffect(contractData) {
    const player = app.getPlayer()
    if (!player) return

    const playerPos = player.position
    const colors = ['#ff6b6b', '#4ecdc4', '#95e77e', '#f7b731', '#a55eea']
    const effectColor = colors[Math.floor(Math.random() * colors.length)]

    // Multiple particle bursts
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const burst = app.create('particles', {
          position: [playerPos[0], playerPos[1] + 1, playerPos[2]],
          rate: 20,
          speed: 2 + i * 0.5,
          lifetime: 2 + i,
          size: 0.1 + i * 0.05,
          color: effectColor
        })

        setTimeout(() => {
          try { app.remove(burst) } catch (e) { /* ignore */ }
        }, (2 + i) * 1000)
      }, i * 200)
    }

    // Create floating contract indicator using particles and light
    const contractIndicator = app.create('sphere', {
      position: [playerPos[0], playerPos[1] + 2, playerPos[2]],
      radius: 0.3,
      color: effectColor,
      emissive: effectColor,
      emissiveIntensity: 3
    })

    // Animated effect
    let floatTime = 0
    const anim = setInterval(() => {
      floatTime += 0.016
      contractIndicator.position[1] = playerPos[1] + 2 + floatTime
      contractIndicator.emissiveIntensity = 3 * (1 - floatTime / 3)

      if (floatTime > 3) {
        clearInterval(anim)
        try { app.remove(contractIndicator) } catch (e) { /* ignore */ }
      }
    }, 16)
  },

  createBuffNotification(buff) {
    const player = app.getPlayer()
    if (!player) return

    const playerPos = player.position
    const buffColor = buff.buffType === 'speed' ? '#ff6b6b' :
                     buff.buffType === 'jump' ? '#4ecdc4' :
                     buff.buffType === 'health' ? '#95e77e' : '#f7b731'

    // Create visual notification using rings of particles
    const notification = app.create('particles', {
      position: [playerPos[0], playerPos[1] + 1.5, playerPos[2]],
      rate: 15,
      speed: 2,
      lifetime: 3,
      size: 0.2,
      color: buffColor
    })

    // Create a glowing sphere as the main indicator
    const glowSphere = app.create('sphere', {
      position: [playerPos[0], playerPos[1] + 1.5, playerPos[2]],
      radius: 0.2,
      color: buffColor,
      emissive: buffColor,
      emissiveIntensity: 2
    })

    // Float up animation
    let floatTime = 0
    const anim = setInterval(() => {
      floatTime += 0.016
      notification.position[1] = playerPos[1] + 1.5 + (floatTime * 0.5)
      glowSphere.position[1] = playerPos[1] + 1.5 + (floatTime * 0.5)
      glowSphere.emissiveIntensity = 2 * (1 - floatTime / 4)

      if (floatTime > 4) {
        clearInterval(anim)
        try {
          app.remove(notification)
          app.remove(glowSphere)
        } catch (e) { /* ignore */ }
      }
    }, 16)
  },

  createExpirationEffect(expiredBuff) {
    const player = app.getPlayer()
    if (!player) return

    const playerPos = player.position

    // Fading primary particles
    const fadeEffect = app.create('particles', {
      position: [playerPos[0], playerPos[1] + 0.5, playerPos[2]],
      rate: 5,
      speed: 0.5,
      lifetime: 1.5,
      size: 0.1,
      color: '#666666'
    })

    // Expiration indicator using dimming sphere
    const expirationIndicator = app.create('sphere', {
      position: [playerPos[0], playerPos[1] + 1, playerPos[2]],
      radius: 0.15,
      color: '#666666',
      emissive: '#333333',
      emissiveIntensity: 1
    })

    // Dimming animation
    let fadeTime = 0
    const fadeAnim = setInterval(() => {
      fadeTime += 0.016
      expirationIndicator.emissiveIntensity = Math.max(0, 1 - fadeTime / 2)
      expirationIndicator.radius = Math.max(0.05, 0.15 - fadeTime * 0.05)

      if (fadeTime > 2) {
        clearInterval(fadeAnim)
        try {
          app.remove(fadeEffect)
          app.remove(expirationIndicator)
        } catch (e) { /* ignore */ }
      }
    }, 16)
  }
}

// 💎 GAME MANAGER
const GameManager = {
  spawnFragment() {
    if (!app.props.gameEnabled || app.state.fragmentEntities.length >= 10) return

    // Random fragment type
    const types = Object.keys(FRAGMENT_TYPES)
    const typeKey = types[Math.floor(Math.random() * types.length)]

    // Random position around player
    const angle = Math.random() * Math.PI * 2
    const distance = 3 + Math.random() * 7
    const position = [
      Math.sin(angle) * distance,
      1 + Math.random() * 2,
      Math.cos(angle) * distance
    ]

    // Create fragment entity
    const fragment = new FragmentEntity(position, typeKey)
    app.state.fragmentEntities.push(fragment)

    console.log(`💎 Spawned ${fragment.data.name}`)
  },

  async combineFragments() {
    if (app.state.fragments.length < 3) {
      console.log('❌ Need at least 3 fragments to combine!')
      return
    }

    console.log('🔧 COMBINING FRAGMENTS...')

    // Take first 3 fragments
    const used = app.state.fragments.splice(0, 3)

    // Create contract data
    const contractData = {
      id: Date.now(),
      fragments: used,
      combinedAt: Date.now(),
      buffType: used[0].buffType,
      buffValue: Math.round(used.reduce((sum, f) => sum + f.buffValue, 0) / used.length),
      duration: 7 * 24 * 60 * 60, // 7 days
      deployed: false
    }

    console.log('📜 Contract Created:')
    console.log(`   Type: ${contractData.buffType}`)
    console.log(`   Value: ${contractData.buffValue}%`)
    console.log(`   Duration: 7 days`)

    // Deploy contract
    await this.deployContract(contractData)
    return contractData
  },

  async deployContract(contractData) {
    console.log('⛓️ Deploying to blockchain...')
    console.log(`📜 Contract: ${contractData.buffType} Boost (${contractData.buffValue}%)`)

    const deploymentSteps = [
      { delay: 500, message: '🔍 Validating contract bytecode...' },
      { delay: 800, message: '⛽ Estimating gas fees...' },
      { delay: 600, message: '📤 Submitting transaction...' },
      { delay: 1000, message: '⏳ Waiting for block confirmation...' },
      { delay: 700, message: '✅ Transaction confirmed!' },
      { delay: 400, message: '🎯 Contract deployed successfully!' }
    ]

    // Execute deployment steps
    for (const step of deploymentSteps) {
      await new Promise(resolve => setTimeout(resolve, step.delay))
      console.log(step.message)
    }

    // Generate contract details
    const contractAddress = this.generateContractAddress(contractData)
    const transactionHash = this.generateTransactionHash()

    console.log(`📍 Contract Address: ${contractAddress}`)
    console.log(`🔗 Transaction: ${transactionHash}`)
    console.log(`🕐 Block: ${Math.floor(Math.random() * 1000000) + 4000000}`)

    // Try real blockchain deployment if available
    let deployedOnChain = false
    if (world.dojo && world.dojo.isConnected?.()) {
      try {
        console.log('🚀 Attempting real Dojo deployment...')
        await world.dojo.execute({
          contract: 'FragmentBuff',
          method: 'createBuff',
          args: [contractData.buffType, contractData.buffValue]
        })
        deployedOnChain = true
        console.log('✅ Real blockchain deployment successful!')
      } catch (realError) {
        console.log('⚠️ Real deployment failed, using simulation:', realError.message)
      }
    }

    // Store complete contract information
    const deployedContract = {
      ...contractData,
      address: contractAddress,
      transactionHash,
      blockNumber: Date.now(),
      deployedOnChain,
      createdAt: Date.now()
    }

    // Apply buff to player
    this.applyBuff(deployedContract)

    // Create deployment celebration
    EffectManager.createDeploymentEffect(deployedContract)

    return deployedContract
  },

  generateContractAddress(contractData) {
    const timestamp = Date.now().toString(16)
    const type = contractData.buffType.slice(0, 4).toUpperCase()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `0x${type}${timestamp.slice(-8)}${random}`
  },

  generateTransactionHash() {
    const timestamp = Date.now().toString(16)
    const random1 = Math.random().toString(36).substring(2, 12)
    const random2 = Math.random().toString(36).substring(2, 8)
    return `0x${timestamp.slice(-6)}${random1}${random2}`.toUpperCase()
  },

  applyBuff(contractData) {
    const player = app.getPlayer()
    if (!player) {
      console.log('⚠️ Cannot apply buff - no player found')
      return
    }

    const buff = {
      ...contractData,
      startTime: Date.now(),
      endTime: Date.now() + (contractData.duration * 1000),
      active: true,
      originalValues: {}
    }

    // Store original values
    if (player.moveSpeed) buff.originalValues.moveSpeed = player.moveSpeed
    if (player.jumpForce) buff.originalValues.jumpForce = player.jumpForce
    if (player.maxHealth) buff.originalValues.maxHealth = player.maxHealth
    if (player.health !== undefined) buff.originalValues.health = player.health

    // Apply buff effects
    switch (contractData.buffType) {
      case 'speed':
        const speedMult = 1 + (contractData.buffValue / 100)
        player.moveSpeed = (buff.originalValues.moveSpeed || 5) * speedMult
        console.log(`🏃 Speed increased to ${player.moveSpeed.toFixed(2)} (${speedMult.toFixed(2)}x)`)
        break

      case 'jump':
        const jumpMult = 1 + (contractData.buffValue / 100)
        player.jumpForce = (buff.originalValues.jumpForce || 10) * jumpMult
        console.log(`🦘 Jump force increased to ${player.jumpForce.toFixed(2)} (${jumpMult.toFixed(2)}x)`)
        break

      case 'health':
        const healthMult = 1 + (contractData.buffValue / 100)
        player.maxHealth = (buff.originalValues.maxHealth || 100) * healthMult
        if (player.health !== undefined) {
          player.health = Math.min(player.health * healthMult, player.maxHealth)
        }
        console.log(`❤️ Health increased to ${player.maxHealth.toFixed(2)} (${healthMult.toFixed(2)}x)`)
        break
    }

    app.state.activeBuffs.push(buff)

    console.log(`🎉 ${contractData.buffType} buff active for 7 days!`)
    console.log(`📊 Total active buffs: ${app.state.activeBuffs.length}`)

    // Create visual feedback
    buff.indicator = new BuffIndicator(player, buff)
    EffectManager.createBuffNotification(buff)
  },

  removeExpiredBuffs() {
    const now = Date.now()
    const player = app.getPlayer()
    if (!player) return

    const expiredBuffs = app.state.activeBuffs.filter(buff => buff.endTime < now)

    expiredBuffs.forEach(buff => {
      console.log(`⏰ ${buff.buffType} buff expired!`)

      // Restore original values
      if (buff.originalValues.moveSpeed && player.moveSpeed) {
        player.moveSpeed = buff.originalValues.moveSpeed
        console.log(`🏃 Speed restored to ${player.moveSpeed}`)
      }

      if (buff.originalValues.jumpForce && player.jumpForce) {
        player.jumpForce = buff.originalValues.jumpForce
        console.log(`🦘 Jump force restored to ${player.jumpForce}`)
      }

      if (buff.originalValues.maxHealth && player.maxHealth) {
        player.maxHealth = buff.originalValues.maxHealth
        if (player.health !== undefined && player.health > player.maxHealth) {
          player.health = player.maxHealth
        }
        console.log(`❤️ Health restored to ${player.maxHealth}`)
      }

      // Remove visual indicator
      if (buff.indicator) {
        buff.indicator.remove()
      }

      // Create expiration effect
      EffectManager.createExpirationEffect(buff)
    })

    // Remove expired buffs
    app.state.activeBuffs = app.state.activeBuffs.filter(buff => buff.endTime >= now)

    if (expiredBuffs.length > 0) {
      console.log(`📊 Remaining active buffs: ${app.state.activeBuffs.length}`)
    }
  },

  update(delta) {
    if (!app.props.gameEnabled) return

    // Update fragment entities
    app.state.fragmentEntities.forEach(fragment => {
      fragment.update(delta)
    })

    // Update buff indicators
    app.state.activeBuffs.forEach(buff => {
      if (buff.indicator) {
        buff.indicator.update()
      }
    })

    // Spawn new fragments
    if (Math.random() < 0.001 * app.props.spawnRate) {
      this.spawnFragment()
    }

    // Check buff expiration
    const now = Date.now()
    if (!app.state.lastExpirationCheck || now - app.state.lastExpirationCheck > 5000) {
      this.removeExpiredBuffs()
      app.state.lastExpirationCheck = now
    }
  }
}

// 🚀 INITIALIZATION
console.log('🧩 FRAGMENT COLLECTOR LOADED!')
console.log('💎 Walk near glowing fragments to collect them!')
console.log('💡 Tip: Type app.combinations() when you have 3+ fragments')

// Periodic stats update via console instead of UI
setInterval(() => {
  console.log(`📊 Stats: 💎 ${app.state.fragments.length} fragments | ⚡ ${app.state.activeBuffs.length} active buffs`)
}, 30000) // Every 30 seconds

// Game update loop
app.on('tick', GameManager.update.bind(GameManager))

// Expose combine function
app.combinations = GameManager.combineFragments.bind(GameManager)

// Auto-save inventory
setInterval(() => {
  try {
    const saveData = {
      fragments: app.state.fragments,
      activeBuffs: app.state.activeBuffs,
      lastSaved: Date.now()
    }
    localStorage.setItem('fragmentCollectorSave', JSON.stringify(saveData))
  } catch (e) {
    // Ignore save errors
  }
}, 10000)

console.log('🎮 Game ready! Walk near glowing orbs to collect fragments!')
console.log('💡 Tip: Type app.combinations() when you have 3+ fragments')