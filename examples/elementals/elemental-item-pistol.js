// Projectile-based Pistol Item for @elementals/
const MIN_DMG = 20
const MAX_DMG = 40
const CRIT_CHANCE = 0.2
const CRIT_MULTIPLIER = 1.8
const PROJECTILE_SPEED = 50 // Faster for "bullet" feel
const PROJECTILE_LIFETIME = 3 // Shorter lifetime for bullets
const RANGE = 100 // Longer range for a pistol
const FIRE_RATE = 0.5 // Cooldown in seconds between shots

const v1 = new Vector3()
const v2 = new Vector3()
const v3 = new Vector3()

createItem(({ player, hooks }) => {
  // ===== CLIENT & SERVER SHARED =====
  let pistolSkin // The main SkinnedMesh (CombatPistolSkin)
  let magazineMesh // Magazine mesh (WAPClip bone/mesh)
  let muzzleBone // Gun_Muzzle bone for muzzle flash position
  let gripBone // Gun_GripR bone for hand attachment
  let gripOffset = new Vector3() // Cached grip bone offset (local space)

  let control
  let lastFireTime = 0
  let ammo = props.maxAmmo || 100 // Start with full ammo
  const projectiles = new Map() // Track active bullets
  const projectileUpdateHandlers = new Map() // Track update handlers for cleanup


  // Helper function to check if player has ammunition available
  function checkHasAmmunition() {
    if (ammo > 0) {
      return true
    }
    console.log('[pistol] Out of ammo!')
    return false
  }

  // Reload function - restore ammo
  function reloadPistol() {
    const maxAmmo = props.maxAmmo || 100
    if (ammo >= maxAmmo) {
      console.log('[pistol] Already at max ammo')
      return
    }

    ammo = maxAmmo
    console.log(`[pistol] Reloaded! Ammo: ${ammo}/${maxAmmo}`)

    // Play BOTH pistol model animation AND player animation
    playPistolAnimation('EmoteReload')
    playSound('reloadSound')

    const reloadUrl = getAnimationUrl('reload')
    if (reloadUrl) {
      console.log('[pistol] Playing reload animation')
      playAnimation(reloadUrl, {
        duration: props.reloadDuration || 0.917,
        loop: false,
        fadeDuration: 0.1,
      })
    }

    // Notify server
    hooks.call('reload', { ammo })
  }

  // Helper function to get animation URL based on configuration
  function getAnimationUrl(animType) {
    const emoteKey = `${animType}Emote`
    console.log(`[pistol] Looking for ${animType} animation with key: ${emoteKey}`)
    console.log(`[pistol] ${emoteKey} value:`, props[emoteKey])

    if (props[emoteKey] && props[emoteKey].url) {
      const url = props[emoteKey].url
      console.log(`[pistol] ${animType} animation URL:`, url)

      // Validate URL to prevent crashes in VRM system
      try {
        // Check if URL is valid - support both asset:// and http:// URLs
        if (typeof url === 'string' && url.trim() && (url.startsWith('asset://') || url.startsWith('http'))) {
          console.log(`[pistol] Found valid ${animType} animation:`, url)
          return url
        } else {
          console.warn(`[pistol] Invalid ${animType} animation URL format:`, url)
        }
      } catch (error) {
        console.warn(`[pistol] Invalid ${animType} animation URL:`, url, error)
      }
    } else {
      console.log(`[pistol] No ${animType} animation configured`)
    }

    return null
  }

  // Helper function to play animation with crossfade support
  function playAnimation(animUrl, options = {}) {
    if (!animUrl) {
      console.log(`[pistol] No animation URL provided, skipping animation`)
      return
    }

    console.log(`[pistol] Playing animation: ${animUrl} with options:`, options)

    // Apply the emote with standard player.applyEffect (fallback)
    player.applyEffect({
      emote: animUrl,
      duration: options.duration || 0,
      cancellable: false,
      loop: options.loop || false,
      priority: options.priority || 1,
    })

    // Try to use enhanced crossfade via VRM system for smoother transitions
    try {
      const avatar = player.avatar?.instance
      if (avatar && avatar.setEmote) {
        const fadeDuration = options.fadeDuration || 0.2 // Default 0.2s for smooth transitions
        avatar.setEmote(animUrl, {
          crossFade: true,
          fadeDuration: fadeDuration,
          warp: true,
        })
        console.log(`[pistol] Enhanced crossfade animation: ${animUrl} (${fadeDuration}s fade)`)
      }
    } catch (error) {
      // Silently fall back to standard player.applyEffect
      console.log(`[pistol] Standard animation (crossfade unavailable): ${animUrl}`)
    }
  }

  // Helper function to play pistol model animations
  function playPistolAnimation(animName, loop = false) {
    console.log(`[pistol] Attempting to play pistol animation: ${animName}, loop: ${loop}`)

    // Play on the ORIGINAL app nodes (animations don't work on clones in Hyperfy)
    let foundAnim = false
    app.traverse(node => {
      if (node.anims && node.anims.includes(animName)) {
        console.log(`[pistol] Found animation '${animName}' on node: ${node.id}`)
        node.play({ name: animName, loop: loop, fade: 0.1 })
        foundAnim = true
      }
    })

    if (!foundAnim) {
      console.warn(`[pistol] Animation '${animName}' not found on pistol model`)
      console.log('[pistol] Available animations on app:')
      app.traverse(node => {
        if (node.anims && node.anims.length > 0) {
          console.log(`  - Node ${node.id}:`, node.anims)
        }
      })
    } else {
      console.log(`[pistol] Successfully started pistol animation: ${animName}`)
    }
  }

  // Helper function to play sound effects
  function playSound(soundType) {
    const soundUrl = props[soundType]?.url
    if (!soundUrl) return

    const audio = app.create('audio')
    audio.src = soundUrl
    audio.spatial = true
    audio.volume = 0.8
    audio.group = 'sfx'

    // Position at muzzle if available, otherwise at pistol position
    if (muzzleBone && muzzleBone.matrixWorld && world.isClient) {
      const muzzlePos = new Vector3()
      muzzlePos.setFromMatrixPosition(muzzleBone.matrixWorld)
      audio.position.copy(muzzlePos)
    } else if (pistolSkin) {
      audio.position.copy(pistolSkin.position)
    }

    world.add(audio)
    audio.play()

    // Auto-cleanup after sound finishes
    setTimeout(() => {
      world.remove(audio)
    }, 2000)
  }

  // Helper function to create muzzle flash burst
  function createMuzzleFlash() {
    if (!props.enableParticles || !muzzleBone || !muzzleBone.matrixWorld) return

    const muzzleFlash = app.create('particles', {
      shape: ['sphere', 0.1, 1],
      direction: 1,
      rate: 0,
      max: 30,
      bursts: [
        { time: 0, count: 30 }
      ],
      color: props.muzzleFlashColor || '#ffaa00',
      size: '0.05~0.15',
      alphaOverLife: '1,1|1,0',
      emissive: '10',
      speed: '2~5',
      life: '0.1~0.3'
    })

    // Position at muzzle bone
    const muzzlePos = new Vector3()
    muzzlePos.setFromMatrixPosition(muzzleBone.matrixWorld)
    muzzleFlash.position.copy(muzzlePos)

    world.add(muzzleFlash)

    // Remove after particles fade
    setTimeout(() => {
      world.remove(muzzleFlash)
    }, 500)
  }

  // Helper function to create bullet trail particle
  function createBulletTrail(startPos, direction) {
    if (!props.enableParticles) return null

    const trail = app.create('particles', {
      shape: ['sphere', 0.05, 1],
      direction: 1,
      rate: 0,
      color: props.bulletTrailColor || '#ffff00',
      rateOverDistance: 50,
      life: '0.05~0.15',
      size: '0.03~0.08',
      alphaOverLife: '1,1|1,0',
      emissive: '8'
    })

    trail.position.copy(startPos)
    world.add(trail)

    return trail
  }

  // Helper function to create impact spark effect
  function createImpactSparks(position) {
    if (!props.enableParticles) return

    const sparks = app.create('particles', {
      shape: ['sphere', 0.1, 1],
      direction: 1,
      rate: 0,
      max: 15,
      bursts: [
        { time: 0, count: 15 }
      ],
      color: props.impactSparkColor || '#ff8800',
      size: '0.02~0.08',
      alphaOverLife: '1,1|1,0',
      emissive: '10',
      speed: '1~4',
      life: '0.1~0.3',
      force: new Vector3(0, -5, 0)
    })

    sparks.position.copy(position)
    world.add(sparks)

    // Play impact sound
    playSound('impactSound')

    // Remove after particles fade
    setTimeout(() => {
      world.remove(sparks)
    }, 400)
  }


  return {
    client: {
      init() {
        // ===== TASK 1: Get SkinnedMesh and bones from GLB =====
        // The app's model IS the pistol GLB, so we clone the entire app hierarchy
        console.log('[pistol] Initializing pistol for player:', player.name)

        // Try multiple possible node names from your GLB structure
        const possibleNames = [
          'CombatPistolSkin',
          'CombatPistol',
          'Pistol',
          'PistolSkin',
          // If none found, we'll just clone the whole app
        ]

        // Search for the skinned mesh node
        let foundNode = null
        for (const name of possibleNames) {
          foundNode = app.get(name)
          if (foundNode) {
            console.log(`[pistol] Found mesh node: ${name}`)
            break
          }
        }

        // If no specific node found, clone the entire app's model
        if (!foundNode) {
          console.warn('[pistol] No specific mesh found, cloning entire app model')
          // Clone the whole app hierarchy as fallback
          pistolSkin = app.clone(true)
        } else {
          pistolSkin = foundNode.clone(true)
        }

        // Safety check
        if (!pistolSkin) {
          console.error('[pistol] CRITICAL: Could not create pistol instance!')
          console.error(
            '[pistol] App children:',
            app.children.map(c => c.id)
          )
          return
        }

        world.add(pistolSkin)
        console.log('[pistol] Pistol instance created and added to world')

        // ===== DEBUG: Check for animations on pistol model =====
        console.log('[pistol] Checking for animations on pistol model...')
        let hasAnimations = false
        app.traverse(node => {
          if (node.anims && node.anims.length > 0) {
            console.log(`[pistol] Found node with animations: ${node.id}`, node.anims)
            hasAnimations = true
          }
        })
        if (!hasAnimations) {
          console.warn('[pistol] No animations found on pistol model - check your GLB has animations')
        }

        // ===== Get bone references for positioning =====
        // Note: getBone returns { position, quaternion, rotation, scale, matrixWorld }
        // These might be null if not a SkinnedMesh, which is okay
        if (pistolSkin.getBone) {
          muzzleBone = pistolSkin.getBone('Gun_Muzzle')
          gripBone = pistolSkin.getBone('Gun_GripR')
          magazineMesh = pistolSkin.getBone('WAPClip')

          if (!muzzleBone) console.warn('[pistol] Gun_Muzzle bone not found - will use fallback positioning')
          if (!gripBone) console.warn('[pistol] Gun_GripR bone not found - will use fallback positioning')
          if (!magazineMesh) console.warn("[pistol] WAPClip bone not found - magazine won't be visible")

          // ===== Calculate grip offset ONCE during init =====
          // This offset is in the pistol's local space and won't change
          if (gripBone && gripBone.position) {
            gripOffset.copy(gripBone.position)
            console.log('[pistol] Grip offset calculated:', gripOffset.toArray())
          }
        } else {
          console.warn("[pistol] Not a SkinnedMesh - bone animations won't work")
        }

        // Initialize ammo
        ammo = props.maxAmmo || 100
        console.log(`[pistol] Pistol initialized with ${ammo} rounds`)

        // Get control handle for local player
        control = player.local ? app.control() : null

        // Play equip animation (non-looping action)
        const equipUrl = getAnimationUrl('equip')
        if (equipUrl) {
          playAnimation(equipUrl, {
            duration: props.equipDuration || 0.5,
            loop: false,
            fadeDuration: 0.3,
          })
        }

        console.log('[pistol] Pistol equipped - natural locomotion preserved')

        // Debug: List all configured animations
        console.log('[pistol] Configured targeted action animations:')
        console.log('  - equip:', props.equipEmote?.url || 'not configured')
        console.log('  - fire:', props.fireEmote?.url || 'not configured')
        console.log('  - reload:', props.reloadEmote?.url || 'not configured')
        console.log('[pistol] Natural locomotion preserved - no overrides needed!')

        // Handle projectile visual effects from server
        app.on('projectile', (data) => {
          const startPos = new Vector3().fromArray(data.start)
          const dir = new Vector3().fromArray(data.direction)

          // Create bullet trail
          const trail = createBulletTrail(startPos, dir)
          if (!trail) return

          // Animate bullet travel
          const distance = data.distance
          const speed = PROJECTILE_SPEED
          let traveled = 0

          const updateHandler = (delta) => {
            const step = speed * delta
            traveled += step

            v1.copy(dir).multiplyScalar(step)
            trail.position.add(v1)

            // Check if reached target
            if (traveled >= distance) {
              // Create impact effect
              if (data.hit) {
                const impactPos = new Vector3().fromArray(data.hit.position)
                createImpactSparks(impactPos)
              }

              // Cleanup
              world.remove(trail)
              app.off('update', updateHandler)
            }
          }

          app.on('update', updateHandler)
        })
      },

      update(delta) {
        if (!control) return


        // ===== Get configurable keybinds =====
        const fireButton = props.fireButton || 'mouseLeft'
        const reloadButton = props.reloadButton || 'keyR'
        const requirePointerLock = props.requirePointerLock !== false // Default true

        // ===== TASK 4: Fire weapon with configurable button =====
        const fireInput = control[fireButton]
        const pointerLocked = control.pointer?.locked
        const canFire = requirePointerLock ? pointerLocked : true

        if (fireInput && fireInput.pressed && canFire) {
          const now = world.getTime()
          if (now - lastFireTime > FIRE_RATE) {
            // Check if player has ammunition available
            if (!checkHasAmmunition()) {
              return
            }
            // Get firing direction from camera (like tackle.js)
            const e1 = new Euler(0, 0, 0, 'YXZ')
            if (control.camera && control.camera.quaternion) {
              e1.setFromQuaternion(control.camera.quaternion)
            } else {
              // Fallback to player rotation if camera not available
              e1.setFromQuaternion(player.quaternion)
            }
            e1.x = 0 // Zero out pitch for horizontal aim
            e1.z = 0 // Zero out roll for horizontal aim
            const q1 = new Quaternion()
            q1.setFromEuler(e1)
            const dir = v1.set(0, 0, -1).applyQuaternion(q1)

            // Get muzzle position from bone (like tackle.js - project forward to avoid self-hits)
            let origin = player.position.clone()
            origin.y += 1.5 // Fallback height

            if (muzzleBone && muzzleBone.matrixWorld) {
              origin.setFromMatrixPosition(muzzleBone.matrixWorld)
              // Project origin slightly forward to avoid self-hits in third person
              const forwardOffset = dir.clone().multiplyScalar(0.3)
              origin.add(forwardOffset)
            }

            // Send fire event to server
            console.log(`[pistol] CLIENT: Sending fire event to server - ammo: ${ammo}`)
            hooks.call('fire', {
              origin: origin.toArray(),
              dir: dir.toArray(),
              ammo,
            })
            lastFireTime = now
            console.log(`[pistol] CLIENT: Fire event sent`)

            // Visual feedback
            ammo -= 1
            console.log(`[pistol] BANG! Ammo: ${ammo}/${props.maxAmmo || 100}`)

            // Play BOTH pistol model animation AND player animation
            playPistolAnimation('EmoteShoot')

            // Add sound and particle effects
            playSound('fireSound')
            createMuzzleFlash()

            // Play shooting animation (arm movement)
            const fireUrl = getAnimationUrl('fire')
            if (fireUrl) {
              playAnimation(fireUrl, {
                duration: props.fireDuration || 0.3,
                loop: false,
                fadeDuration: 0.1,
              })
            }
          }
        }

        // ===== Reload with configurable button =====
        const reloadInput = control[reloadButton]
        if (reloadInput && reloadInput.pressed) {
          reloadPistol()
        }
      },

      lateUpdate(delta) {
        // ===== TASK 2: Anchor pistol grip bone to player's right hand =====
        if (!pistolSkin) return
        if (!pistolSkin.position) {
          console.error('[pistol] pistolSkin has no position property!')
          return
        }

        // Get player's right hand bone transform (world space)
        const handMatrix = player.getBoneTransform('rightHand')
        if (!handMatrix) {
          // Fallback: position at player's right side
          pistolSkin.position.copy(player.position)
          pistolSkin.position.x += 0.3 // Right side
          pistolSkin.position.y += 1.3 // Hand height
          pistolSkin.quaternion.copy(player.quaternion)
          return
        }

        // ===== SMART ANCHORING: Use grip bone as anchor point =====
        // Step 1: Get hand position and rotation from matrix
        pistolSkin.position.setFromMatrixPosition(handMatrix)
        pistolSkin.quaternion.setFromRotationMatrix(handMatrix)

        // Step 2: If we have a grip bone offset, apply it
        if (gripOffset.lengthSq() > 0) {
          // Transform the grip offset from pistol local space to world space
          const worldGripOffset = v1.copy(gripOffset)
          worldGripOffset.applyQuaternion(pistolSkin.quaternion)

          // Subtract the grip offset so the grip bone aligns with the hand
          pistolSkin.position.sub(worldGripOffset)
        }

        // ===== Apply configurable offsets and scale =====
        // Scale (from props)
        const scale = props.scale || 1
        pistolSkin.scale.setScalar(scale)

        // Position offsets (from props)
        const offsetX = props.offsetX || 0
        const offsetY = props.offsetY || 0
        const offsetZ = props.offsetZ || 0

        if (offsetX !== 0 || offsetY !== 0 || offsetZ !== 0) {
          // Apply offsets in local space (relative to hand orientation)
          const offset = v2.set(offsetX, offsetY, offsetZ)
          offset.applyQuaternion(pistolSkin.quaternion)
          pistolSkin.position.add(offset)
        }

        // Rotation offsets (from props)
        const rotX = props.rotationX || 0
        const rotY = props.rotationY || 0
        const rotZ = props.rotationZ || 0

        if (rotX !== 0 || rotY !== 0 || rotZ !== 0) {
          // Apply additional rotation in local space
          const additionalRotation = new Euler(rotX, rotY, rotZ, 'XYZ')
          const rotQuat = new Quaternion().setFromEuler(additionalRotation)
          pistolSkin.quaternion.multiply(rotQuat)
        }

        // ===== TASK 3: Show/hide magazine based on ammo =====
        // If magazine mesh exists, hide it when empty (optional visual)
        if (magazineMesh && magazineMesh.visible !== undefined) {
          magazineMesh.visible = ammo > 0
        }
      },

      // Called when server confirms fire
      fire(data) {
        // Update local ammo count from server
        ammo = data.ammo
      },

      // Called when server confirms reload
      reload(data) {
        ammo = data.ammo
        console.log(`[pistol] Server confirmed reload: ${ammo} rounds`)
      },

      destroy() {
        // Clean up pistol resources

        if (pistolSkin) {
          world.remove(pistolSkin)
          pistolSkin = null
        }
        control?.release()

        // Clean up all active projectiles to prevent memory leaks
        for (const [projectileId, projectile] of projectiles) {
          // Remove any world objects (like flash effects)
          if (projectile.flash) {
            world.remove(projectile.flash)
          }

          // Remove the update handler to prevent infinite loops
          const updateHandler = projectileUpdateHandlers.get(projectileId)
          if (updateHandler) {
            app.off('update', updateHandler)
          }
        }
        projectiles.clear()
        projectileUpdateHandlers.clear()

        // Don't call player.applyEffect during destruction - can cause freezes
        // The system will automatically clear effects when item is unequipped
      },

    },
    server: {
      init() {
        // Initialize server-side ammo tracking
        ammo = props.maxAmmo || 100
        console.log(`[pistol] Server: Pistol initialized with ${ammo} rounds`)
      },

      fire(data) {
        console.log(`[pistol] ========== FIRE START ==========`)
        console.log(`[pistol] server.fire() called - player: ${player.id}, ammo: ${ammo}, player.health: ${player.health}`)
        if (ammo <= 0) {
          console.log('[pistol] server.fire() - no ammo, returning')
          return
        }

        try {
          const origin = v1.fromArray(data.origin)
          const dir = v2.fromArray(data.dir).normalize()
          const layerMask = world.createLayerMask('player', 'environment')

          // ===== TASK 5: Authoritative raycast for hit detection =====
          const hit = world.raycast(origin, dir, RANGE, layerMask)
          const targetPos = hit ? hit.point : origin.clone().add(dir.multiplyScalar(RANGE))

          console.log(`[pistol] Raycast from:`, origin.toArray(), 'direction:', dir.toArray(), 'range:', RANGE)
          console.log(`[pistol] Raycast hit:`, hit ? 'HIT!' : 'no hit')
          if (hit) {
            console.log(`[pistol] Hit result properties:`, Object.keys(hit))
            console.log(`[pistol] Hit details:`, {
              playerId: hit.playerId,
              tag: hit.tag,
              entityId: hit.entityId,
              point: hit.point?.toArray(),
              distance: hit.distance
            })

            // Check if we hit a player (prevent self-hits like tackle.js)
            if (hit.playerId && hit.playerId !== player.id) {
              console.log(`[pistol] Hit detected - playerId: ${hit.playerId}, shooter: ${player.id}`)
              const playerB = world.getPlayer(hit.playerId)
              console.log(`[pistol] Got player object:`, !!playerB, 'has health:', !!playerB?.health, 'health value:', playerB?.health)

              // Additional safety checks to prevent self-hits
              if (playerB && playerB.id === player.id) {
                console.log(`[pistol] Preventing self-hit - same player ID detected`)
                return
              }

              // Prevent hits that are too close (likely self-hits in third person)
              if (hit.distance < 0.5) {
                console.log(`[pistol] Preventing close-range hit - distance: ${hit.distance}`)
                return
              }

              if (playerB && playerB.health !== undefined) {
                let amount = num(MIN_DMG, MAX_DMG)
                let crit = false
                if (playerB.health > amount) {
                  crit = num(0, 1, 1) < CRIT_CHANCE
                  if (crit) amount *= CRIT_MULTIPLIER
                }
                if (amount > playerB.health) amount = playerB.health

                console.log(`[pistol] Calling hooks.damage for player ${playerB.id} - amount: ${amount}, crit: ${crit}`)
                console.log(`[pistol] Player health before damage:`, playerB.health)
                hooks.damage(playerB, amount, crit)
                console.log(`[pistol] Player health after damage:`, playerB.health)
              } else {
                console.warn(`[pistol] Cannot damage player - playerB:`, !!playerB, 'health:', playerB?.health)
              }
            }
            // Check if we hit a mob
            else if (hit.tag?.startsWith('elemental-mob:')) {
              try {
                const mobInstanceId = hit.tag.split(':')[1]
                let amount = num(MIN_DMG, MAX_DMG)
                const crit = num(0, 1) < CRIT_CHANCE
                if (crit) amount *= CRIT_MULTIPLIER

                console.log(`[pistol] Hit mob ${mobInstanceId} for ${amount} damage (crit: ${crit})`)
                app.emit('elemental-mob:hit', [mobInstanceId, player.id, amount, crit])
                console.log(`[pistol] Successfully emitted mob hit event (via app.emit)`)
              } catch (error) {
                console.error('[pistol] Error handling mob hit:', error)
              }
            }
          }

          // Consume ammo server-side (authoritative)
          ammo -= 1

          // Send updated ammo back to client
          hooks.call('fire', { ammo })

          // ===== Launch bullet projectile =====
          const projectileId = `bullet_${Date.now()}_${Math.random()}`
          const projectile = {
            id: projectileId,
            position: origin.clone(),
            target: targetPos,
            velocity: dir.clone().multiplyScalar(PROJECTILE_SPEED),
            lifetime: 0,
            owner: player.id,
          }
          projectiles.set(projectileId, projectile)

          console.log(`[pistol] Created projectile ${projectileId} with origin:`, origin.toArray(), 'target:', targetPos.toArray(), 'velocity:', dir.toArray(), 'speed:', PROJECTILE_SPEED)

          console.log(`[pistol] Created projectile ${projectileId}`)
          console.log(`[pistol] Origin:`, origin.toArray())
          console.log(`[pistol] Target:`, targetPos.toArray())
          console.log(`[pistol] Direction:`, dir.toArray())
          console.log(`[pistol] Velocity:`, projectile.velocity.toArray())
          console.log(`[pistol] Hit result:`, hit ? `hit ${hit.object?.id} at ${hit.point.toArray()}` : 'no hit')

          // Send projectile data to clients for visual trail
          app.send('projectile', {
            id: `${player.id}-${Date.now()}`,
            start: origin.toArray(),
            direction: dir.toArray(),
            distance: hit ? hit.distance : RANGE,
            hit: hit ? {
              position: hit.point.toArray(),
              playerId: hit.playerId,
              entityId: hit.entityId
            } : null
          })

          // ===== TASK 5: Muzzle flash at correct bone position =====
          // Note: On server we don't have visual bones, so this would be
          // better handled client-side or as a particle effect
          // For now, create a temporary marker for debugging
          const flash = app.create('prim', {
            type: 'sphere',
            size: [0.1],
            color: '#ffaa00',
            emissive: '#ffaa00',
            emissiveIntensity: 5,
          })
          flash.position.copy(origin)
          world.add(flash)

          let flashTime = 0
          function flashUpdate(dt) {
            flashTime += dt
            if (flashTime > 0.05) {
              world.remove(flash)
              app.off('update', flashUpdate)
            }
          }
          app.on('update', flashUpdate)

          // Don't use projectile damage system - we already did instant raycast damage above
          // The projectile is just for visual effect, not for hit detection
          // Schedule bullet update with proper cleanup tracking
          const updateHandler = delta => updateProjectile(projectileId, delta)
          app.on('update', updateHandler)
          projectileUpdateHandlers.set(projectileId, updateHandler)

          console.log(`[pistol] ========== FIRE END ==========`)
        } catch (error) {
          console.error('[pistol] ERROR in server.fire():', error)
          console.error('[pistol] Error stack:', error.stack)
        }
      },

      reload(data) {
        // Restore ammo to max
        const maxAmmo = props.maxAmmo || 100
        ammo = maxAmmo
        console.log(`[pistol] Server: Reloaded to ${ammo} rounds`)

        // Send updated ammo to client
        hooks.call('reload', { ammo })
      },
    },
  }

  function updateProjectile(id, delta) {
    const proj = projectiles.get(id)
    if (!proj) return

    proj.lifetime += delta
    if (proj.lifetime > PROJECTILE_LIFETIME) {
      // Clean up update handler before removing projectile
      const updateHandler = projectileUpdateHandlers.get(id)
      if (updateHandler) {
        app.off('update', updateHandler)
        projectileUpdateHandlers.delete(id)
      }
      projectiles.delete(id)
      return
    }

    // Move bullet
    proj.position.add(proj.velocity.clone().multiplyScalar(delta))
    const distanceToTarget = proj.position.distanceTo(proj.target)

    console.log(`[pistol] Projectile ${id} at position:`, proj.position.toArray(), 'distance to target:', distanceToTarget.toFixed(2))

    if (distanceToTarget < 1) {
      console.log(`[pistol] Projectile ${id} reached target - cleaning up (damage already applied by raycast)`)

      // Damage was already applied by instant raycast in server.fire()
      // This projectile is just for visual effect
      // Clean up the projectile
      const updateHandler = projectileUpdateHandlers.get(id)
      if (updateHandler) {
        app.off('update', updateHandler)
        projectileUpdateHandlers.delete(id)
      }
      projectiles.delete(id)
    }
  }
})

// Item Configuration (Props for Customization)
app.configure([
  // ===== Basic Item Properties =====
  { key: 'id', type: 'text', label: 'ID', initial: 'pistol' },
  { key: 'icon', type: 'file', kind: 'texture', label: 'Icon' },
  { key: 'name', type: 'text', label: 'Name', initial: 'Combat Pistol' },
  { key: 'desc', type: 'textarea', label: 'Desc', initial: 'Semi-automatic sidearm. Uses magazines for reload.' },
  { key: 'stack', type: 'number', label: 'Stack', initial: 1 },
  {
    key: 'droppable',
    type: 'switch',
    label: 'Droppable',
    options: [
      { label: 'No', value: false },
      { label: 'Yes', value: true },
    ],
    initial: false,
  },

  // ===== Ammo Settings =====
  { type: 'section', key: 'ammoSection', label: 'Ammo' },
  { key: 'maxAmmo', type: 'number', label: 'Max Ammo', initial: 100, hint: 'Total rounds available' },

  // ===== Visual Adjustments =====
  { type: 'section', key: 'visualSection', label: 'Position & Scale' },
  { key: 'scale', type: 'number', label: 'Scale', initial: 1, dp: 2, step: 0.1, hint: 'Overall size multiplier' },
  { key: 'offsetX', type: 'number', label: 'Offset X', initial: 0, dp: 3, step: 0.01, hint: 'Left/Right offset' },
  { key: 'offsetY', type: 'number', label: 'Offset Y', initial: 0, dp: 3, step: 0.01, hint: 'Up/Down offset' },
  { key: 'offsetZ', type: 'number', label: 'Offset Z', initial: 0, dp: 3, step: 0.01, hint: 'Forward/Back offset' },
  { key: 'rotationX', type: 'number', label: 'Rotation X', initial: 0, dp: 2, step: 0.1, hint: 'Pitch (radians)' },
  { key: 'rotationY', type: 'number', label: 'Rotation Y', initial: 0, dp: 2, step: 0.1, hint: 'Yaw (radians)' },
  { key: 'rotationZ', type: 'number', label: 'Rotation Z', initial: 0, dp: 2, step: 0.1, hint: 'Roll (radians)' },

  // ===== Keybinds =====
  { type: 'section', key: 'keybindSection', label: 'Keybinds' },
  {
    key: 'fireButton',
    type: 'switch',
    label: 'Fire Button',
    initial: 'mouseLeft',
    options: [
      { label: 'Left Mouse', value: 'mouseLeft' },
      { label: 'Right Mouse', value: 'mouseRight' },
      { label: 'Middle Mouse', value: 'mouseMiddle' },
      { label: 'Space', value: 'space' },
      { label: 'E Key', value: 'keyE' },
      { label: 'F Key', value: 'keyF' },
    ],
    hint: 'Button to fire weapon',
  },
  {
    key: 'reloadButton',
    type: 'switch',
    label: 'Reload Button',
    initial: 'keyR',
    options: [
      { label: 'R Key', value: 'keyR' },
      { label: 'E Key', value: 'keyE' },
      { label: 'F Key', value: 'keyF' },
      { label: 'Q Key', value: 'keyQ' },
      { label: 'X Key', value: 'keyX' },
    ],
    hint: 'Button to reload weapon',
  },
  {
    key: 'requirePointerLock',
    type: 'switch',
    label: 'Require Pointer Lock',
    initial: true,
    options: [
      { label: 'No', value: false },
      { label: 'Yes', value: true },
    ],
    hint: 'Require mouse to be locked to fire',
  },

  // ===== Targeted Action Animations =====
  { type: 'section', key: 'animSection', label: 'Targeted Action Animations (Short GLB Emotes)' },

  // Short, targeted animations that layer over natural locomotion
  // These should be designed to work as additive layers over natural movement
  { key: 'equipEmote', type: 'file', kind: 'emote', label: 'Equip Animation (Short GLB)' },
  { key: 'fireEmote', type: 'file', kind: 'emote', label: 'Fire Animation (Short GLB - Arm Recoil)' },
  { key: 'reloadEmote', type: 'file', kind: 'emote', label: 'Reload Animation (Short GLB - Arm Movement)' },

  // Animation timing controls
  { key: 'equipDuration', type: 'number', label: 'Equip Duration (seconds)', initial: 0.5, min: 0.1, max: 3, step: 0.1, dp: 1 },
  { key: 'fireDuration', type: 'number', label: 'Fire Duration (seconds)', initial: 0.3, min: 0.1, max: 2, step: 0.05, dp: 2 },
  { key: 'reloadDuration', type: 'number', label: 'Reload Duration (seconds)', initial: 0.917, min: 0.1, max: 5, step: 0.01, dp: 3 },

  // ===== Sound Effects =====
  { type: 'section', key: 'soundSection', label: 'Sound Effects' },
  { key: 'fireSound', type: 'file', kind: 'audio', label: 'Fire Sound' },
  { key: 'reloadSound', type: 'file', kind: 'audio', label: 'Reload Sound' },
  { key: 'impactSound', type: 'file', kind: 'audio', label: 'Impact Sound' },

  // ===== Particle Effects =====
  { type: 'section', key: 'particleSection', label: 'Particle Effects' },
  { key: 'muzzleFlashColor', type: 'color', label: 'Muzzle Flash Color', initial: '#ffaa00' },
  { key: 'bulletTrailColor', type: 'color', label: 'Bullet Trail Color', initial: '#ffff00' },
  { key: 'impactSparkColor', type: 'color', label: 'Impact Spark Color', initial: '#ff8800' },
  {
    key: 'enableParticles', type: 'switch', label: 'Enable Particles', initial: true, options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false }
    ]
  },

  // ===== Admin Tools =====
  { type: 'section', key: 'adminSection', label: 'Admin' },
  {
    key: 'give',
    type: 'button',
    label: 'Give to Local Player',
    onClick: () => {
      const p = world.getPlayer()
      app.send('give', p.id)
    },
  },
])

function createItem(createInstance) {
  // Safely access props to prevent crashes during item destruction
  let id = null
  let icon = null
  let name = null
  let desc = null
  let stack = 1
  let droppable = false

  try {
    if (props && typeof props === 'object') {
      id = props.id || null
      name = props.name || null
      desc = props.desc || null
      stack = props.stack || 1
      droppable = props.droppable || false

      // Safely get icon URL
      if (props.icon && typeof props.icon === 'object' && props.icon.url && typeof props.icon.url === 'string') {
        icon = props.icon.url
      }
    }
  } catch (error) {
    console.warn('[pistol] Error accessing props during item creation:', error)
    return
  }

  // each item must have an id
  if (!id) return console.error(`item does not have an id`)
  // and the id must be unique in the world
  let unique = true
  world.on(`elemental-item:check:${id}`, instanceId => {
    if (app.instanceId === instanceId) return
    app.emit(`elemental-item:check:${id}:reply`)
  })
  world.on(`elemental-item:check:${id}:reply`, () => {
    unique = false
  })
  app.emit(`elemental-item:check:${id}`, app.instanceId)
  if (!unique) return console.error(`item with id '${id}' exists more than once in the world`)

  if (world.isServer) {
    const state = app.state
    state.active = new Set()
    state.ready = true
    const instances = new Map() // playerId -> instance
    app.send('init', state)
    app.on('give', playerId => {
      app.emit('elemental-item:give', [playerId, id, 1])
    })
    world.on(`elemental-shop:request-spec:${id}`, () => {
      app.emit('elemental-item:spec', { id, icon, name, desc, stack })
    })
    world.on('elemental-core:request-specs', () => {
      app.emit('elemental-item:spec', { id, icon, name, desc, stack })
    })
    world.on(`elemental-shop:purchase:${id}`, playerId => {
      app.emit('elemental-item:give', [playerId, id, 1])
    })
    world.on(`elemental-core:activate:${id}`, playerId => {
      if (state.active.has(playerId)) {
        return console.warn(`${id} activate: already active`)
      }
      const player = world.getPlayer(playerId)
      if (!player) {
        return console.warn(`${id} activate: player not found`)
      }
      state.active.add(playerId)
      const instance = createInstance({
        player,
        hooks: {
          call(method, data) {
            app.send('call', [playerId, method, data])
          },
          take(qty) {
            app.emit('elemental-item:take', [playerId, id, qty])
          },
          damage(player, amount, crit) {
            console.log(`[pistol hooks.damage] Called with player ${player.id}, amount: ${amount}, health before: ${player.health}`)
            player.damage(amount)
            console.log(`[pistol hooks.damage] Health after damage: ${player.health}`)
            app.send('dmg', [player.id, amount, crit])
            // Emit health event for elemental-combat to handle death/respawn
            console.log(`[pistol hooks.damage] Emitting health event`)
            app.emit('health', { playerId: player.id, health: player.health })
          },
        },
      })
      instances.set(playerId, instance)
      instance.server?.init?.()
      app.send('activate', playerId)
    })
    world.on(`elemental-core:deactivate:${id}`, playerId => {
      if (!state.active.has(playerId)) {
        return console.warn(`${id} deactivate: player not active`)
      }
      state.active.delete(playerId)
      instances.get(playerId).server.destroy?.()
      instances.delete(playerId)
      app.send('deactivate', playerId)
    })
    world.on(`elemental-core:drop:${id}`, playerId => {
      if (!droppable) return
      if (!state.active.has(playerId)) {
        return console.warn(`${id} drop: player not active`)
      }
      // instance could control this in future
      app.emit('elemental-item:take', [playerId, id, 1])
    })
    app.on('call', ([method, data], playerId) => {
      console.log(`[pistol] Server received call: method=${method}, playerId=${playerId}`)
      const instance = instances.get(playerId)
      if (!instance) {
        console.error('[pistol] No instance found for player:', playerId)
        console.error('[pistol] Available instances:', Array.from(instances.keys()))
        return
      }
      console.log(`[pistol] Instance found, calling server.${method}`)
      instance.server?.[method]?.(data)
    })
    world.on('leave', e => {
      if (!state.active.has(e.playerId)) return
      state.active.delete(e.playerId)
      instances.get(e.playerId).server.destroy?.()
      instances.delete(e.playerId)
      app.send('deactivate', e.playerId)
    })
    app.on('fixedUpdate', delta => {
      instances.forEach(instance => {
        instance.server?.fixedUpdate?.(delta)
      })
    })
    app.on('update', delta => {
      instances.forEach(instance => {
        instance.server?.update?.(delta)
      })
    })
    app.on('lateUpdate', delta => {
      instances.forEach(instance => {
        instance.server?.lateUpdate?.(delta)
      })
    })
    // broadcast item existence and metadata
    app.emit('elemental-item:spec', { id, icon, name, desc, stack })
  }

  if (world.isClient) {
    const localPlayer = world.getPlayer()

    let state = app.state
    if (state.ready) {
      init(state)
    } else {
      app.on('init', init)
    }
    function init(_state) {
      state = _state
      const instances = new Map()
      function activate(playerId) {
        const player = world.getPlayer(playerId)
        const instance = createInstance({
          player,
          hooks: {
            call(method, data) {
              app.send('call', [method, data])
            },
            take(qty) {
              console.error('[item] hooks.take() not available on the client')
            },
            damage(player, amount, crit) {
              console.error('[item] hooks.damage() not available on the client')
            },
          },
        })
        instances.set(playerId, instance)
        instance.client?.init?.()
      }
      for (const playerId of state.active) {
        activate(playerId)
      }
      app.on('activate', playerId => {
        activate(playerId)
      })
      app.on('call', ([playerId, method, data]) => {
        const instance = instances.get(playerId)
        if (!instance) return console.error('[item] error 1')
        instance.client?.[method]?.(data)
      })
      app.on('deactivate', playerId => {
        const instance = instances.get(playerId)
        instance.client?.destroy?.()
        instances.delete(playerId)
      })
      app.on('fixedUpdate', delta => {
        instances.forEach(instance => {
          instance.client?.fixedUpdate?.(delta)
        })
      })
      app.on('update', delta => {
        instances.forEach(instance => {
          instance.client?.update?.(delta)
        })
      })
      app.on('lateUpdate', delta => {
        instances.forEach(instance => {
          instance.client?.lateUpdate?.(delta)
        })
      })
      app.on('dmg', data => {
        app.emit('elemental-item:dmg', data)
      })
    }
  }
}
