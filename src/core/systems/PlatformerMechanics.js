import * as THREE from '../extras/three'
import { System } from './System'
import { Layers } from '../extras/Layers'
import { Emotes } from '../extras/playerEmotes'

/**
 * Platformer Mechanics System
 *
 * Implements advanced platformer mechanics including:
 * - Grinding system with THREE.js CatmullRomCurve3
 * - Climbing system with PhysX raycast wall detection
 * - Ledge detection and hanging mechanics
 * - Air diving with momentum-based movement
 * - Wall sliding with modified physics
 */

const PlatformerModes = {
  NONE: 0,
  GRINDING: 1,
  CLIMBING: 2,
  LEDGE_HANGING: 3,
  AIR_DIVING: 4,
  WALL_SLIDING: 5,
}

const StaminaConfig = {
  MAX_STAMINA: 100,
  GRINDING_DRAIN: 1, // per second
  CLIMBING_DRAIN: 2, // per second
  LEDGE_DRAIN: 1, // per second
  WALL_SLIDE_DRAIN: 1, // per second
  REGEN_RATE: 5, // per second when not using mechanics
}

export class PlatformerMechanics extends System {
  constructor(world) {
    super(world)
    this.activePlayers = new Map() // playerId -> platformer state
    this.grindRails = new Map() // railId -> rail data
    this.triggerColliders = new Map() // colliderId -> trigger data
  }

  init() {
    // Register for player events
    this.world.events.on('enter', this.onPlayerEnter.bind(this))
    this.world.events.on('leave', this.onPlayerLeave.bind(this))
  }

  onPlayerEnter({ playerId }) {
    this.activePlayers.set(playerId, {
      mode: PlatformerModes.NONE,
      stamina: StaminaConfig.MAX_STAMINA,
      grindRail: null,
      grindProgress: 0,
      grindSpeed: 0,
      climbWall: null,
      climbDirection: 0, // -1 down, 0 idle, 1 up
      ledgeHanging: false,
      ledgePosition: null,
      airDiving: false,
      diveMomentum: new THREE.Vector3(),
      wallSliding: false,
      wallNormal: new THREE.Vector3(),
      wallSlideSpeed: 0,
      lastUpdateTime: 0,
    })
  }

  onPlayerLeave({ playerId }) {
    this.activePlayers.delete(playerId)
  }

  // Grinding System
  createGrindRail(points, options = {}) {
    const railId = `rail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create CatmullRomCurve3 for smooth rail following
    const curve = new THREE.CatmullRomCurve3(
      points,
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
      animation: options.animation || Emotes.GRINDING,
      active: true,
    }

    this.grindRails.set(railId, railData)

    // Create trigger collider for activation
    this.createGrindTrigger(railData)

    return railId
  }

  createGrindTrigger(railData) {
    const triggerId = `grind_trigger_${railData.id}`

    // Create sphere trigger collider at start of rail
    const geometry = new PHYSX.PxSphereGeometry(railData.triggerRadius)
    const material = this.world.physics.physics.createMaterial(0, 0, 0)
    const flags = new PHYSX.PxShapeFlags(
      PHYSX.PxShapeFlagEnum.eSCENE_QUERY_SHAPE | PHYSX.PxShapeFlagEnum.eTRIGGER_SHAPE
    )
    const shape = this.world.physics.physics.createShape(geometry, material, true, flags)

    const filterData = new PHYSX.PxFilterData(
      Layers.prop.group,
      Layers.player.mask,
      PHYSX.PxPairFlagEnum.eNOTIFY_TOUCH_FOUND | PHYSX.PxPairFlagEnum.eNOTIFY_TOUCH_LOST,
      0
    )
    shape.setQueryFilterData(filterData)
    shape.setSimulationFilterData(filterData)

    const transform = new PHYSX.PxTransform(PHYSX.PxIDENTITYEnum.PxIdentity)
    railData.points[0].toPxTransform(transform)

    const trigger = this.world.physics.physics.createRigidStatic(transform)
    trigger.attachShape(shape)

    const triggerData = {
      id: triggerId,
      railId: railData.id,
      actor: trigger,
      shape,
    }

    this.triggerColliders.set(triggerId, triggerData)
    this.world.physics.addActor(trigger, {
      tag: 'grind_trigger',
      railId: railData.id,
      onTouchFound: otherHandle => {
        if (otherHandle.playerId) {
          this.attemptGrindStart(otherHandle.playerId, railData.id)
        }
      },
    })

    return triggerId
  }

  attemptGrindStart(playerId, railId) {
    const player = this.world.entities.get(playerId)
    if (!player || !player.isLocal) return

    const state = this.activePlayers.get(playerId)
    if (!state || state.mode !== PlatformerModes.NONE) return

    const rail = this.grindRails.get(railId)
    if (!rail || !rail.active) return

    // Check if player is moving fast enough and in the right direction
    const velocity = player.capsule.getLinearVelocity()
    const speed = new THREE.Vector3(velocity.x, velocity.y, velocity.z).length()

    if (speed < 3) return // Need minimum speed to start grinding

    // Start grinding
    this.startGrinding(playerId, railId)
  }

  startGrinding(playerId, railId) {
    const state = this.activePlayers.get(playerId)
    const player = this.world.entities.get(playerId)
    const rail = this.grindRails.get(railId)

    if (!state || !player || !rail) return

    state.mode = PlatformerModes.GRINDING
    state.grindRail = rail
    state.grindProgress = 0
    state.grindSpeed = rail.speed

    // Set platformer mode on player
    player.setPlatformerMode(PlatformerModes.GRINDING)

    // Disable physics simulation for grinding
    player.capsule.setActorFlag(PHYSX.PxActorFlagEnum.eDISABLE_SIMULATION, true)

    // Set animation
    if (player.avatar) {
      player.avatar.setEmote(rail.animation)
    }

    console.log(`[PlatformerMechanics] Player ${playerId} started grinding on rail ${railId}`)
  }

  updateGrinding(playerId, delta) {
    const state = this.activePlayers.get(playerId)
    const player = this.world.entities.get(playerId)

    if (!state || !player || state.mode !== PlatformerModes.GRINDING) return

    const rail = state.grindRail
    if (!rail) {
      this.stopGrinding(playerId)
      return
    }

    // Drain stamina
    state.stamina -= StaminaConfig.GRINDING_DRAIN * delta
    if (state.stamina <= 0) {
      this.stopGrinding(playerId)
      return
    }

    // Update grind progress along curve
    const curveLength = rail.curve.getLength()
    const progressDelta = (state.grindSpeed * delta) / curveLength
    state.grindProgress += progressDelta

    // Check if reached end of rail
    if (state.grindProgress >= 1) {
      this.stopGrinding(playerId)
      return
    }

    // Get position and tangent from curve
    const position = rail.curve.getPointAt(state.grindProgress)
    const tangent = rail.curve.getTangentAt(state.grindProgress)

    // Update player position
    player.base.position.copy(position)

    // Orient player to face movement direction
    if (tangent.length() > 0) {
      const lookDirection = tangent.clone().normalize()
      const angle = Math.atan2(lookDirection.x, lookDirection.z)
      player.base.rotation.y = angle
    }

    // Apply friction to speed
    state.grindSpeed *= rail.friction

    // Check for input to jump off rail
    if (player.jumpPressed) {
      this.stopGrinding(playerId)
      // Apply jump force in tangent direction
      const jumpForce = tangent
        .clone()
        .normalize()
        .multiplyScalar(state.grindSpeed * 0.5)
      jumpForce.y = 8 // Add upward component
      player.pushForce = jumpForce
    }
  }

  stopGrinding(playerId) {
    const state = this.activePlayers.get(playerId)
    const player = this.world.entities.get(playerId)

    if (!state || !player || state.mode !== PlatformerModes.GRINDING) return

    // Re-enable physics simulation
    player.capsule.setActorFlag(PHYSX.PxActorFlagEnum.eDISABLE_SIMULATION, false)

    // Clear grinding state
    state.mode = PlatformerModes.NONE
    state.grindRail = null
    state.grindProgress = 0
    state.grindSpeed = 0

    // Reset platformer mode on player
    player.setPlatformerMode(PlatformerModes.NONE)

    // Clear animation
    if (player.avatar) {
      player.avatar.setEmote(null)
    }

    console.log(`[PlatformerMechanics] Player ${playerId} stopped grinding`)
  }

  // Climbing System
  updateClimbing(playerId, delta) {
    const state = this.activePlayers.get(playerId)
    const player = this.world.entities.get(playerId)

    if (!state || !player || state.mode !== PlatformerModes.CLIMBING) return

    // Drain stamina
    state.stamina -= StaminaConfig.CLIMBING_DRAIN * delta
    if (state.stamina <= 0) {
      this.stopClimbing(playerId)
      return
    }

    // Check for wall in front
    const wallHit = this.checkWallInFront(player)
    if (!wallHit) {
      this.stopClimbing(playerId)
      return
    }

    // Handle climbing movement
    if (state.climbDirection !== 0) {
      const climbSpeed = 3
      const climbDirection = new THREE.Vector3(0, state.climbDirection, 0)
      const climbForce = climbDirection.multiplyScalar(climbSpeed * 10)

      // Apply climbing force
      player.capsule.addForce(climbForce.toPxVec3(), PHYSX.PxForceModeEnum.eFORCE, true)

      // Set animation based on direction
      let animation = Emotes.CLIMB_IDLE
      if (state.climbDirection > 0) {
        animation = Emotes.CLIMB_UP
      } else if (state.climbDirection < 0) {
        animation = Emotes.CLIMB_DOWN
      }

      if (player.avatar) {
        player.avatar.setEmote(animation)
      }
    }
  }

  checkWallInFront(player) {
    const pose = player.capsule.getGlobalPose()
    const origin = new THREE.Vector3(pose.p.x, pose.p.y, pose.p.z)

    // Cast ray forward from player
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.base.quaternion)
    const hitMask = Layers.environment.group | Layers.prop.group

    return this.world.physics.raycast(origin, forward, 1.5, hitMask)
  }

  attemptClimbStart(playerId) {
    const state = this.activePlayers.get(playerId)
    const player = this.world.entities.get(playerId)

    if (!state || !player || state.mode !== PlatformerModes.NONE) return
    if (state.stamina < 10) return // Need minimum stamina

    // Check for wall in front
    const wallHit = this.checkWallInFront(player)
    if (!wallHit) return

    // Check if wall is climbable (not too steep)
    const wallAngle = Math.acos(wallHit.normal.y) * (180 / Math.PI)
    if (wallAngle > 45) return // Too steep to climb

    // Start climbing
    state.mode = PlatformerModes.CLIMBING
    state.climbWall = wallHit
    state.climbDirection = 0

    // Set platformer mode on player
    player.setPlatformerMode(PlatformerModes.CLIMBING)

    console.log(`[PlatformerMechanics] Player ${playerId} started climbing`)
  }

  stopClimbing(playerId) {
    const state = this.activePlayers.get(playerId)
    const player = this.world.entities.get(playerId)

    if (!state || !player || state.mode !== PlatformerModes.CLIMBING) return

    state.mode = PlatformerModes.NONE
    state.climbWall = null
    state.climbDirection = 0

    // Reset platformer mode on player
    player.setPlatformerMode(PlatformerModes.NONE)

    // Clear animation
    if (player.avatar) {
      player.avatar.setEmote(null)
    }

    console.log(`[PlatformerMechanics] Player ${playerId} stopped climbing`)
  }

  // Ledge Detection System
  updateLedgeHanging(playerId, delta) {
    const state = this.activePlayers.get(playerId)
    const player = this.world.entities.get(playerId)

    if (!state || !player || state.mode !== PlatformerModes.LEDGE_HANGING) return

    // Drain stamina
    state.stamina -= StaminaConfig.LEDGE_DRAIN * delta
    if (state.stamina <= 0) {
      this.stopLedgeHanging(playerId)
      return
    }

    // Check if still hanging on ledge
    if (!this.checkLedgeStillValid(player, state.ledgePosition)) {
      this.stopLedgeHanging(playerId)
      return
    }

    // Handle ledge movement
    if (state.climbDirection !== 0) {
      const ledgeSpeed = 2
      const moveDirection = new THREE.Vector3(state.climbDirection, 0, 0)
      const moveForce = moveDirection.multiplyScalar(ledgeSpeed * 10)

      // Apply horizontal movement force
      player.capsule.addForce(moveForce.toPxVec3(), PHYSX.PxForceModeEnum.eFORCE, true)

      // Set animation
      const animation = state.climbDirection !== 0 ? Emotes.LEDGE_HANGING_MOVING : Emotes.LEDGE_HANGING_IDLE
      if (player.avatar) {
        player.avatar.setEmote(animation)
      }
    }
  }

  checkLedgeStillValid(player, ledgePosition) {
    if (!ledgePosition) return false

    // Check if player is still near the ledge
    const distance = player.base.position.distanceTo(ledgePosition)
    return distance < 1.5
  }

  attemptLedgeGrab(playerId) {
    const state = this.activePlayers.get(playerId)
    const player = this.world.entities.get(playerId)

    if (!state || !player || state.mode !== PlatformerModes.NONE) return
    if (state.stamina < 10) return

    // Check for ledge below player
    const ledgeHit = this.checkLedgeBelow(player)
    if (!ledgeHit) return

    // Start ledge hanging
    state.mode = PlatformerModes.LEDGE_HANGING
    state.ledgePosition = ledgeHit.point.clone()
    state.climbDirection = 0

    // Set platformer mode on player
    player.setPlatformerMode(PlatformerModes.LEDGE_HANGING)

    // Position player at ledge
    player.base.position.copy(ledgeHit.point)
    player.base.position.y += 0.5 // Adjust height

    console.log(`[PlatformerMechanics] Player ${playerId} grabbed ledge`)
  }

  checkLedgeBelow(player) {
    const pose = player.capsule.getGlobalPose()
    const origin = new THREE.Vector3(pose.p.x, pose.p.y - 1, pose.p.z)

    // Cast ray downward
    const down = new THREE.Vector3(0, -1, 0)
    const hitMask = Layers.environment.group | Layers.prop.group

    return this.world.physics.raycast(origin, down, 2, hitMask)
  }

  stopLedgeHanging(playerId) {
    const state = this.activePlayers.get(playerId)
    const player = this.world.entities.get(playerId)

    if (!state || !player || state.mode !== PlatformerModes.LEDGE_HANGING) return

    state.mode = PlatformerModes.NONE
    state.ledgePosition = null
    state.climbDirection = 0

    // Reset platformer mode on player
    player.setPlatformerMode(PlatformerModes.NONE)

    // Clear animation
    if (player.avatar) {
      player.avatar.setEmote(null)
    }

    console.log(`[PlatformerMechanics] Player ${playerId} released ledge`)
  }

  // Air Diving System
  updateAirDiving(playerId, delta) {
    const state = this.activePlayers.get(playerId)
    const player = this.world.entities.get(playerId)

    if (!state || !player || state.mode !== PlatformerModes.AIR_DIVING) return

    // Apply dive momentum
    if (state.diveMomentum.length() > 0) {
      const diveForce = state.diveMomentum.clone().multiplyScalar(10)
      player.capsule.addForce(diveForce.toPxVec3(), PHYSX.PxForceModeEnum.eFORCE, true)

      // Apply friction to momentum
      state.diveMomentum.multiplyScalar(0.95)

      // Stop diving when momentum is low
      if (state.diveMomentum.length() < 0.1) {
        this.stopAirDiving(playerId)
      }
    }
  }

  attemptAirDive(playerId) {
    const state = this.activePlayers.get(playerId)
    const player = this.world.entities.get(playerId)

    if (!state || !player || state.mode !== PlatformerModes.NONE) return
    if (player.grounded) return // Must be in air

    // Get current velocity
    const velocity = player.capsule.getLinearVelocity()
    const currentVelocity = new THREE.Vector3(velocity.x, velocity.y, velocity.z)

    // Calculate dive direction (forward + down)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.base.quaternion)
    const diveDirection = forward
      .clone()
      .multiplyScalar(0.7)
      .add(new THREE.Vector3(0, -0.3, 0))

    // Start air diving
    state.mode = PlatformerModes.AIR_DIVING
    state.diveMomentum = diveDirection.multiplyScalar(15) // Initial dive force

    // Set platformer mode on player
    player.setPlatformerMode(PlatformerModes.AIR_DIVING)

    // Set animation
    if (player.avatar) {
      player.avatar.setEmote(Emotes.AIR_DIVE)
    }

    console.log(`[PlatformerMechanics] Player ${playerId} started air diving`)
  }

  stopAirDiving(playerId) {
    const state = this.activePlayers.get(playerId)
    const player = this.world.entities.get(playerId)

    if (!state || !player || state.mode !== PlatformerModes.AIR_DIVING) return

    state.mode = PlatformerModes.NONE
    state.diveMomentum.set(0, 0, 0)

    // Reset platformer mode on player
    player.setPlatformerMode(PlatformerModes.NONE)

    // Clear animation
    if (player.avatar) {
      player.avatar.setEmote(null)
    }

    console.log(`[PlatformerMechanics] Player ${playerId} stopped air diving`)
  }

  // Wall Sliding System
  updateWallSliding(playerId, delta) {
    const state = this.activePlayers.get(playerId)
    const player = this.world.entities.get(playerId)

    if (!state || !player || state.mode !== PlatformerModes.WALL_SLIDING) return

    // Drain stamina
    state.stamina -= StaminaConfig.WALL_SLIDE_DRAIN * delta
    if (state.stamina <= 0) {
      this.stopWallSliding(playerId)
      return
    }

    // Check if still against wall
    const wallHit = this.checkWallInFront(player)
    if (!wallHit) {
      this.stopWallSliding(playerId)
      return
    }

    // Apply wall slide physics
    const velocity = player.capsule.getLinearVelocity()
    const currentVelocity = new THREE.Vector3(velocity.x, velocity.y, velocity.z)

    // Reduce downward velocity for wall sliding
    const slideVelocity = currentVelocity.clone()
    slideVelocity.y = Math.max(slideVelocity.y, -3) // Cap fall speed

    // Apply wall slide force
    const slideForce = new THREE.Vector3(0, -2, 0) // Gentle downward force
    player.capsule.addForce(slideForce.toPxVec3(), PHYSX.PxForceModeEnum.eFORCE, true)

    // Set animation
    if (player.avatar) {
      player.avatar.setEmote(Emotes.WALL_SLIDE)
    }
  }

  attemptWallSlide(playerId) {
    const state = this.activePlayers.get(playerId)
    const player = this.world.entities.get(playerId)

    if (!state || !player || state.mode !== PlatformerModes.NONE) return
    if (player.grounded) return // Must be in air

    // Check for wall in front
    const wallHit = this.checkWallInFront(player)
    if (!wallHit) return

    // Check if wall is slideable (not too steep)
    const wallAngle = Math.acos(wallHit.normal.y) * (180 / Math.PI)
    if (wallAngle < 30) return // Too flat to slide

    // Start wall sliding
    state.mode = PlatformerModes.WALL_SLIDING
    state.wallNormal = wallHit.normal.clone()
    state.wallSlideSpeed = 0

    // Set platformer mode on player
    player.setPlatformerMode(PlatformerModes.WALL_SLIDING)

    console.log(`[PlatformerMechanics] Player ${playerId} started wall sliding`)
  }

  stopWallSliding(playerId) {
    const state = this.activePlayers.get(playerId)
    const player = this.world.entities.get(playerId)

    if (!state || !player || state.mode !== PlatformerModes.WALL_SLIDING) return

    state.mode = PlatformerModes.NONE
    state.wallNormal.set(0, 0, 0)
    state.wallSlideSpeed = 0

    // Reset platformer mode on player
    player.setPlatformerMode(PlatformerModes.NONE)

    // Clear animation
    if (player.avatar) {
      player.avatar.setEmote(null)
    }

    console.log(`[PlatformerMechanics] Player ${playerId} stopped wall sliding`)
  }

  // Input handling
  handlePlayerInput(playerId, input) {
    const state = this.activePlayers.get(playerId)
    if (!state) return

    switch (state.mode) {
      case PlatformerModes.CLIMBING:
        if (input.climbUp) state.climbDirection = 1
        else if (input.climbDown) state.climbDirection = -1
        else state.climbDirection = 0
        break

      case PlatformerModes.LEDGE_HANGING:
        if (input.moveLeft) state.climbDirection = -1
        else if (input.moveRight) state.climbDirection = 1
        else state.climbDirection = 0
        break
    }
  }

  // Stamina regeneration
  updateStamina(playerId, delta) {
    const state = this.activePlayers.get(playerId)
    if (!state) return

    // Regenerate stamina when not using mechanics
    if (state.mode === PlatformerModes.NONE && state.stamina < StaminaConfig.MAX_STAMINA) {
      state.stamina = Math.min(StaminaConfig.MAX_STAMINA, state.stamina + StaminaConfig.REGEN_RATE * delta)
    }
  }

  // Main update loop
  fixedUpdate(delta) {
    for (const [playerId, state] of this.activePlayers) {
      this.updateStamina(playerId, delta)

      switch (state.mode) {
        case PlatformerModes.GRINDING:
          this.updateGrinding(playerId, delta)
          break
        case PlatformerModes.CLIMBING:
          this.updateClimbing(playerId, delta)
          break
        case PlatformerModes.LEDGE_HANGING:
          this.updateLedgeHanging(playerId, delta)
          break
        case PlatformerModes.AIR_DIVING:
          this.updateAirDiving(playerId, delta)
          break
        case PlatformerModes.WALL_SLIDING:
          this.updateWallSliding(playerId, delta)
          break
      }

      // Send network updates for platformer state
      this.sendPlatformerState(playerId, state)
    }
  }

  // Network synchronization
  sendPlatformerState(playerId, state) {
    if (!this.world.network) return

    const player = this.world.entities.get(playerId)
    if (!player || !player.isLocal) return

    // Only send if state has changed significantly
    const now = this.world.time
    if (now - state.lastUpdateTime < 0.1) return // Throttle updates

    const platformerData = {
      playerId,
      mode: state.mode,
      stamina: Math.round(state.stamina),
      grindProgress: state.grindProgress,
      grindSpeed: state.grindSpeed,
      climbDirection: state.climbDirection,
      diveMomentum: state.diveMomentum.toArray(),
      wallSlideSpeed: state.wallSlideSpeed,
    }

    this.world.network.send('platformerState', platformerData)
    state.lastUpdateTime = now
  }

  onPlatformerState(data) {
    const { playerId, mode, stamina, grindProgress, grindSpeed, climbDirection, diveMomentum, wallSlideSpeed } = data

    const state = this.activePlayers.get(playerId)
    if (!state) return

    // Update remote player state
    state.mode = mode
    state.stamina = stamina
    state.grindProgress = grindProgress
    state.grindSpeed = grindSpeed
    state.climbDirection = climbDirection
    state.diveMomentum.fromArray(diveMomentum)
    state.wallSlideSpeed = wallSlideSpeed

    // Update player entity
    const player = this.world.entities.get(playerId)
    if (player) {
      player.setPlatformerMode(mode)
      player.setStamina(stamina)
    }
  }

  onPlatformerAction(data) {
    const { playerId, action, params } = data

    switch (action) {
      case 'startGrinding':
        this.startGrinding(playerId, params.railId)
        break
      case 'stopGrinding':
        this.stopGrinding(playerId)
        break
      case 'startClimbing':
        this.attemptClimbStart(playerId)
        break
      case 'stopClimbing':
        this.stopClimbing(playerId)
        break
      case 'startLedgeHanging':
        this.attemptLedgeGrab(playerId)
        break
      case 'stopLedgeHanging':
        this.stopLedgeHanging(playerId)
        break
      case 'startAirDiving':
        this.attemptAirDive(playerId)
        break
      case 'stopAirDiving':
        this.stopAirDiving(playerId)
        break
      case 'startWallSliding':
        this.attemptWallSlide(playerId)
        break
      case 'stopWallSliding':
        this.stopWallSliding(playerId)
        break
    }
  }

  // Cleanup
  destroy() {
    this.world.events.off('enter', this.onPlayerEnter.bind(this))
    this.world.events.off('leave', this.onPlayerLeave.bind(this))

    // Clean up grind rails and triggers
    for (const [triggerId, triggerData] of this.triggerColliders) {
      this.world.physics.removeActor(triggerData.actor)
    }

    this.activePlayers.clear()
    this.grindRails.clear()
    this.triggerColliders.clear()
  }
}
