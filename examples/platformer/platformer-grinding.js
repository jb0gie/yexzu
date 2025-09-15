({
  init() {
    // Grinding system as an app
    this.grindRails = new Map()
    this.activePlayers = new Map()
    
    // Create example grind rail
    this.createExampleRail()
    
    console.log('[PlatformerGrinding] App initialized')
  },

  createExampleRail() {
    // Define points for a curved grind rail
    const railPoints = [
      [0, 2, 0],      // Start point
      [5, 3, 0],      // First curve point
      [10, 2, 5],     // Second curve point
      [15, 4, 10],    // Third curve point
      [20, 2, 15],    // End point
    ]

    const railId = this.createGrindRail(railPoints, {
      speed: 8,
      friction: 0.95,
      triggerRadius: 2,
      animation: 'asset://mp-grinding.glb?s=1.0'
    })

    console.log(`[PlatformerGrinding] Created grind rail: ${railId}`)
  },

  createGrindRail(points, options = {}) {
    const railId = `rail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create CatmullRomCurve3 for smooth rail following
    const curve = new THREE.CatmullRomCurve3(
      points.map(p => new THREE.Vector3(p[0], p[1], p[2])),
      options.closed || false,
      options.curveType || 'catmullrom',
      options.tension || 0.5
    )
    
    const railData = {
      id: railId,
      curve,
      points,
      speed: options.speed || 8,
      friction: options.friction || 0.95,
      triggerRadius: options.triggerRadius || 2,
      animation: options.animation || 'asset://mp-grinding.glb?s=1.0',
      active: true,
    }

    this.grindRails.set(railId, railData)
    
    // Create trigger collider for activation
    this.createGrindTrigger(railData)
    
    return railId
  },

  createGrindTrigger(railData) {
    const triggerId = `grind_trigger_${railData.id}`
    
    // Create sphere trigger collider at start of rail
    const trigger = app.create('collider', {
      type: 'sphere',
      radius: railData.triggerRadius,
      trigger: true,
      layer: 'prop',
      position: railData.points[0],
      tag: 'grind_trigger'
    })

    // Add trigger to app
    app.add(trigger)
    
    // Set up trigger events
    trigger.onContactStart = (other) => {
      if (other.playerId) {
        this.attemptGrindStart(other.playerId, railData.id)
      }
    }
    
    return triggerId
  },

  attemptGrindStart(playerId, railId) {
    const player = world.entities.get(playerId)
    if (!player || !player.isLocal) return
    
    const rail = this.grindRails.get(railId)
    if (!rail || !rail.active) return
    
    // Check if player is moving fast enough
    const velocity = player.capsule?.getLinearVelocity()
    if (!velocity) return
    
    const speed = new THREE.Vector3(velocity.x, velocity.y, velocity.z).length()
    if (speed < 3) return // Need minimum speed to start grinding
    
    // Start grinding
    this.startGrinding(playerId, railId)
  },

  startGrinding(playerId, railId) {
    const player = world.entities.get(playerId)
    const rail = this.grindRails.get(railId)
    
    if (!player || !rail) return
    
    // Set grinding state
    this.activePlayers.set(playerId, {
      railId,
      progress: 0,
      speed: rail.speed,
      stamina: 100
    })
    
    // Disable physics simulation for grinding
    if (player.capsule) {
      player.capsule.setActorFlag(PHYSX.PxActorFlagEnum.eDISABLE_SIMULATION, true)
    }
    
    // Set grinding animation
    if (player.avatar) {
      player.avatar.setEmote(rail.animation)
    }
    
    console.log(`[PlatformerGrinding] Player ${playerId} started grinding on rail ${railId}`)
  },

  updateGrinding(playerId, delta) {
    const player = world.entities.get(playerId)
    const state = this.activePlayers.get(playerId)
    
    if (!player || !state) return
    
    const rail = this.grindRails.get(state.railId)
    if (!rail) {
      this.stopGrinding(playerId)
      return
    }
    
    // Drain stamina
    state.stamina -= 1 * delta // 1 per second
    if (state.stamina <= 0) {
      this.stopGrinding(playerId)
      return
    }
    
    // Update grind progress along curve
    const curveLength = rail.curve.getLength()
    const progressDelta = (state.speed * delta) / curveLength
    state.progress += progressDelta
    
    // Check if reached end of rail
    if (state.progress >= 1) {
      this.stopGrinding(playerId)
      return
    }
    
    // Get position and tangent from curve
    const position = rail.curve.getPointAt(state.progress)
    const tangent = rail.curve.getTangentAt(state.progress)
    
    // Update player position
    player.base.position.copy(position)
    
    // Orient player to face movement direction
    if (tangent.length() > 0) {
      const lookDirection = tangent.clone().normalize()
      const angle = Math.atan2(lookDirection.x, lookDirection.z)
      player.base.rotation.y = angle
    }
    
    // Apply friction to speed
    state.speed *= rail.friction
    
    // Check for input to jump off rail
    if (player.jumpPressed) {
      this.stopGrinding(playerId)
      // Apply jump force in tangent direction
      const jumpForce = tangent.clone().normalize().multiplyScalar(state.speed * 0.5)
      jumpForce.y = 8 // Add upward component
      player.pushForce = jumpForce
    }
  },

  stopGrinding(playerId) {
    const player = world.entities.get(playerId)
    if (!player) return
    
    // Re-enable physics simulation
    if (player.capsule) {
      player.capsule.setActorFlag(PHYSX.PxActorFlagEnum.eDISABLE_SIMULATION, false)
    }
    
    // Clear grinding state
    this.activePlayers.delete(playerId)
    
    // Clear animation
    if (player.avatar) {
      player.avatar.setEmote(null)
    }
    
    console.log(`[PlatformerGrinding] Player ${playerId} stopped grinding`)
  },

  update(delta) {
    // Update all active grinding players
    for (const [playerId, state] of this.activePlayers) {
      this.updateGrinding(playerId, delta)
    }
  },

  cleanup() {
    // Clean up all grinding states
    for (const playerId of this.activePlayers.keys()) {
      this.stopGrinding(playerId)
    }
    this.activePlayers.clear()
    this.grindRails.clear()
  }
})