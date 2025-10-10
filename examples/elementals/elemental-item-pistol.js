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
  let ammo = 0 // Current ammo in loaded magazine
  let isLoaded = false // Track if pistol has a loaded magazine
  const projectiles = new Map() // Track active bullets
  const projectileUpdateHandlers = new Map() // Track update handlers for cleanup

  // Helper function to check if player has ammunition available
  function checkHasAmmunition() {
    // Player can only fire if pistol is loaded with ammo
    if (!isLoaded) {
      console.log('[pistol] Pistol not loaded - equip magazine first!')
      return false
    }

    if (ammo > 0) {
      return true // Has ammo in current magazine
    }

    console.log('[pistol] Pistol empty - reload to continue firing!')
    return false // Pistol loaded but empty
  }

  // Helper function to load magazine into pistol
  function loadMagazine() {
    if (isLoaded) {
      console.log('[pistol] Pistol already has magazine loaded')
      return
    }

    isLoaded = true
    ammo = props.magazineSize || 15
    console.log('[pistol] Magazine loaded into pistol! Ammo:', ammo)

    // Make magazine visible in pistol with animation
    if (magazineMesh) {
      magazineMesh.visible = true
      // Add a brief scale pulse to show loading
      const originalScale = magazineMesh.scale.x
      magazineMesh.scale.setScalar(originalScale * 1.3)
      setTimeout(() => {
        if (magazineMesh) {
          magazineMesh.scale.setScalar(originalScale)
        }
      }, 300)
    }

    // Visual feedback on pistol model
    if (pistolSkin) {
      const originalScale = pistolSkin.scale.x
      pistolSkin.scale.setScalar(originalScale * 1.1)
      setTimeout(() => {
        if (pistolSkin) {
          pistolSkin.scale.setScalar(originalScale)
        }
      }, 200)
    }

    // Send ammo count to magazine item
    app.emit('pistol:ammo-count', {
      playerId: player.id,
      ammo: ammo,
      maxAmmo: props.magazineSize || 15,
    })

    // Play reload animation
    const reloadUrl = getAnimationUrl('reload')
    if (reloadUrl) {
      console.log('[pistol] Playing reload animation for magazine loading')
      playAnimation(reloadUrl, {
        duration: 1.0,
        loop: false,
        fadeDuration: 0.3,
      })
    } else {
      console.log('[pistol] No reload animation configured - using visual feedback only')
    }

    // Emit sound effect (optional, if configured)
    app.emit('pistol:reload-sound', {
      playerId: player.id,
    })

    // Notify server of ammo state
    app.emit('pistol:loaded', {
      playerId: player.id,
      ammo: ammo,
    })
  }

  // Helper function to get animation URL based on configuration
  function getAnimationUrl(animType) {
    const emoteKey = `${animType}Emote`
    if (props[emoteKey] && props[emoteKey].url) {
      const url = props[emoteKey].url

      // Validate URL to prevent crashes in VRM system
      try {
        // Check if URL is valid by attempting to construct it
        if (typeof url === 'string' && url.trim() && url.startsWith('http')) {
          new URL(url)
          console.log(`[pistol] Found valid ${animType} animation:`, url)
          return url
        }
      } catch (error) {
        console.warn(`[pistol] Invalid animation URL for ${animType}:`, url, error)
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

  // Helper function to eject magazine with physics
  function ejectMagazine() {
    if (!pistolSkin || !gripBone) return

    // Clone the entire pistol skinned mesh to get the magazine
    const ejectedMag = pistolSkin.clone(true)

    // Hide everything except the magazine (WAPClip bone/mesh)
    ejectedMag.traverse(child => {
      if (child.isMesh || child.isSkinnedMesh) {
        // Hide all meshes except magazine
        child.visible = false
      }
    })

    // Try to find and show only the magazine part
    if (magazineMesh && magazineMesh.visible !== undefined) {
      // If magazineMesh is a visible bone, make sure the clone shows it
      const clonedMagMesh = ejectedMag.getBone && ejectedMag.getBone('WAPClip')
      if (clonedMagMesh && clonedMagMesh.visible !== undefined) {
        clonedMagMesh.visible = true
      }
    }

    // Get the grip bone position as the ejection origin
    const ejectionOrigin = v1.setFromMatrixPosition(gripBone.matrixWorld)

    // Create a rigidbody for the ejected magazine
    const magBody = app.create('rigidbody')
    magBody.type = 'dynamic'
    magBody.mass = 0.05 // Light magazine
    magBody.position.copy(ejectionOrigin)

    // Add collider to the magazine - make it dynamic
    const magCollider = app.create('collider')
    magCollider.type = 'box'
    magCollider.setSize(0.02, 0.05, 0.01) // Magazine dimensions
    magCollider.isTrigger = false // Make it solid for physics
    magBody.add(magCollider)

    // Add the visual mesh to the rigidbody
    magBody.add(ejectedMag)

    // Add to world
    world.add(magBody)

    // Apply ejection force (downward and slightly left)
    const ejectForce = props.ejectForce || 2
    const ejectTorque = props.ejectTorque || 5

    // Get player's left direction
    const leftDir = v2.set(-1, -0.5, 0).applyQuaternion(player.quaternion).normalize()
    leftDir.multiplyScalar(ejectForce)

    // Apply impulse
    magBody.applyImpulse(leftDir, ejectionOrigin)

    // Apply random spin
    const torque = v3.set(
      (Math.random() - 0.5) * ejectTorque,
      (Math.random() - 0.5) * ejectTorque,
      (Math.random() - 0.5) * ejectTorque
    )
    magBody.setAngularVelocity(torque)

    // Schedule despawn with cleanup
    const despawnTime = props.despawnTime || 5
    let elapsed = 0
    const despawnUpdate = dt => {
      elapsed += dt
      if (elapsed >= despawnTime) {
        // Clean up physics body and visual mesh
        if (magBody.physics) {
          magBody.physics.destroy()
        }
        world.remove(magBody)
        app.off('update', despawnUpdate)
        console.log('[pistol] Magazine despawned after', despawnTime, 'seconds')
      }
    }
    app.on('update', despawnUpdate)

    console.log('[pistol] Magazine ejected - will despawn in', despawnTime, 'seconds')
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

        // Initialize ammo and magazines
        // Initialize ammo state - pistol starts empty
        ammo = 0
        console.log(`[pistol] Pistol initialized - needs magazine to load`)

        // Get control handle for local player
        control = player.local ? app.control() : null

        // ===== SIGNAL LISTENERS =====
        // Listen for magazine equip signals to load pistol
        app.on('magazine:equipped', data => {
          if (data.playerId === player.id) {
            console.log('[pistol] Magazine equipped signal received - checking if pistol can be loaded!')

            // Check if this pistol is currently active/equipped
            // If so, load the magazine immediately
            if (pistolSkin && pistolSkin.parent) {
              loadMagazine()
            } else {
              console.log('[pistol] Pistol not currently active - magazine ready for when pistol is equipped')
              // Signal that we have a magazine ready
              app.emit('pistol:magazine-ready', {
                playerId: player.id,
                magazineId: data.magazineId,
              })
            }
          }
        })

        // Listen for when this pistol is equipped to check for ready magazine
        app.on('pistol:equipped', data => {
          if (data.playerId === player.id) {
            console.log('[pistol] Pistol equipped - checking for ready magazine')

            // Signal that we're looking for a magazine
            app.emit('pistol:need-magazine', {
              playerId: player.id,
              pistolId: props.id || 'pistol',
            })
          }
        })

        // Listen for magazine ready response
        app.on('magazine:ready-response', data => {
          if (data.playerId === player.id) {
            console.log('[pistol] Magazine ready response received - loading pistol!')
            loadMagazine()
          }
        })

        // Listen for magazine unequip signals
        app.on('magazine:unequipped', data => {
          if (data.playerId === player.id) {
            console.log('[pistol] Magazine unequipped signal received')
            // Don't automatically unload - pistol keeps its magazine
          }
        })

        // Play equip animation with crossfade
        const equipUrl = getAnimationUrl('equip')
        if (equipUrl) {
          console.log('[pistol] Playing equip animation for pistol equipped')
          playAnimation(equipUrl, {
            duration: 0.5,
            loop: false,
            fadeDuration: 0.3, // Smooth equip transition
          })
        } else {
          console.log('[pistol] No equip animation configured')
        }

        // Apply idle animation override when pistol is equipped
        const idleUrl = getAnimationUrl('idle')
        if (idleUrl) {
          console.log('[pistol] Playing idle animation for pistol equipped')
          playAnimation(idleUrl, {
            loop: true,
            duration: 0, // Continuous
            fadeDuration: 0.5, // Longer crossfade for idle
          })
        } else {
          console.log('[pistol] No idle animation configured')
        }

        // Emit pistol equipped signal
        console.log('[pistol] Emitting pistol:equipped signal')
        app.emit('pistol:equipped', {
          playerId: player.id,
          pistolId: props.id || 'pistol',
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
            // Get firing direction from camera
            const e1 = new Euler(0, 0, 0, 'YXZ')
            e1.setFromQuaternion(control.camera.quaternion)
            e1.x = 0
            e1.z = 0 // Zero out pitch/roll for horizontal aim
            const q1 = new Quaternion()
            q1.setFromEuler(e1)
            const dir = v1.set(0, 0, -1).applyQuaternion(q1)

            // Get muzzle position from bone (not hardcoded offset)
            let origin = player.position.clone()
            origin.y += 1.5 // Fallback height

            if (muzzleBone && muzzleBone.matrixWorld) {
              origin.setFromMatrixPosition(muzzleBone.matrixWorld)
            }

            // Send fire event to server
            hooks.call('fire', {
              origin: origin.toArray(),
              dir: dir.toArray(),
              ammo,
            })
            lastFireTime = now

            // Visual feedback
            const remainingAmmo = ammo - 1
            console.log(`[pistol] BANG! Ammo: ${remainingAmmo}/${props.magazineSize || 15}`)

            // Play fire animation with quick crossfade
            const fireUrl = getAnimationUrl('fire')
            if (fireUrl) {
              console.log('[pistol] Playing fire animation')
              playAnimation(fireUrl, {
                duration: 0.2,
                loop: false,
                fadeDuration: 0.1, // Quick transition for firing
              })
            } else {
              console.log('[pistol] No fire animation configured')
            }

            // Local ammo decrement (will be synced by server)
            ammo -= 1

            // Send updated ammo count to magazine
            app.emit('pistol:ammo-count', {
              playerId: player.id,
              ammo: ammo,
              maxAmmo: props.magazineSize || 15,
            })

            // Check if magazine is empty and notify
            if (ammo === 0) {
              app.emit('pistol:ammo-empty', {
                playerId: player.id,
                ammo: 0,
              })
              console.log('[pistol] Magazine empty - signal sent to magazine')
            }
          }
        }

        // ===== TASK 6: Reload with configurable button =====
        const reloadInput = control[reloadButton]
        if (reloadInput && reloadInput.pressed) {
          // Check if pistol needs reloading (empty or not loaded)
          if (!isLoaded || ammo <= 0) {
            console.log('[pistol] Reload pressed - attempting to load magazine!')

            // Signal that we need a magazine
            app.emit('pistol:need-magazine', {
              playerId: player.id,
              pistolId: props.id || 'pistol',
            })

            // Visual feedback - shake pistol to indicate no magazine
            if (pistolSkin) {
              const originalPos = pistolSkin.position.clone()
              let shakeCount = 0
              const shakeInterval = setInterval(() => {
                shakeCount++
                if (shakeCount >= 6) {
                  clearInterval(shakeInterval)
                  pistolSkin.position.copy(originalPos)
                  return
                }
                const shakeAmount = 0.02
                pistolSkin.position.x = originalPos.x + (Math.random() - 0.5) * shakeAmount
                pistolSkin.position.y = originalPos.y + (Math.random() - 0.5) * shakeAmount
              }, 50)
            }

            console.log('[pistol] No magazine available - equip magazine first!')
          } else {
            console.log(`[pistol] Pistol already loaded with ${ammo} ammo`)
          }
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
        console.log(`[pistol] Reloaded: ${ammo} rounds in magazine`)
      },

      destroy() {
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
        // Initialize server-side ammo tracking - pistol starts empty
        ammo = 0

        // Listen for magazine loaded signals
        app.on('pistol:loaded', data => {
          if (data.playerId === player.id) {
            console.log(`[pistol] Server: Magazine loaded - setting ammo to ${data.ammo}`)
            ammo = data.ammo
          }
        })
      },

      fire(data) {
        if (ammo <= 0) return // No ammo server-side check

        const origin = v1.fromArray(data.origin)
        const dir = v2.fromArray(data.dir).normalize()
        const layerMask = world.createLayerMask('player', 'environment')

        // ===== TASK 5: Authoritative raycast for hit detection =====
        const hit = world.raycast(origin, dir, RANGE, layerMask)
        const targetPos = hit ? hit.point : origin.clone().add(dir.multiplyScalar(RANGE))

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

        // Schedule bullet update with proper cleanup tracking
        const updateHandler = delta => updateProjectile(projectileId, delta)
        app.on('update', updateHandler)
        projectileUpdateHandlers.set(projectileId, updateHandler)
      },

      reload(data) {
        // Reload is now handled by signal-based magazine loading system
        // This method is kept for compatibility but ammo loading is managed by loadMagazine()
        console.log(`[pistol] Server reload called - ammo management handled by signals`)
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

    if (distanceToTarget < 1) {
      // Hit
      const players = world.getPlayers()
      for (const p of players) {
        if (p.id !== proj.owner && p.position.distanceTo(proj.position) < 2) {
          let amount = num(MIN_DMG, MAX_DMG)
          if (num(0, 1) < CRIT_CHANCE) amount *= CRIT_MULTIPLIER
          hooks.damage(p, amount, amount > MAX_DMG)
          break
        }
      }
      // Clean up update handler when projectile hits
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

  // ===== Ammo & Magazine Settings =====
  { type: 'section', key: 'ammoSection', label: 'Ammo & Magazines' },
  { key: 'magazineSize', type: 'number', label: 'Magazine Size', initial: 15, hint: 'Rounds per magazine' },
  { key: 'startingMags', type: 'number', label: 'Starting Magazines', initial: 3, hint: 'Number of extra magazines' },

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

  // ===== Magazine Ejection =====
  { type: 'section', key: 'ejectionSection', label: 'Magazine Ejection' },
  {
    key: 'ejectForce',
    type: 'number',
    label: 'Eject Force',
    initial: 2,
    dp: 1,
    step: 0.5,
    hint: 'Impulse force when ejected',
  },
  { key: 'ejectTorque', type: 'number', label: 'Eject Torque', initial: 5, dp: 1, step: 0.5, hint: 'Rotational force' },
  {
    key: 'despawnTime',
    type: 'number',
    label: 'Despawn Time',
    initial: 5,
    hint: 'Seconds before ejected mag despawns',
  },

  // ===== Animation Files (One GLB per animation) =====
  { type: 'section', key: 'animSection', label: 'Animations' },

  // Individual animation files
  { key: 'equipEmote', type: 'file', kind: 'emote', label: 'Equip Animation (GLB)' },
  { key: 'idleEmote', type: 'file', kind: 'emote', label: 'Idle Animation (GLB)' },
  { key: 'fireEmote', type: 'file', kind: 'emote', label: 'Fire Animation (GLB)' },
  { key: 'reloadEmote', type: 'file', kind: 'emote', label: 'Reload Animation (GLB)' },
  { key: 'walkEmote', type: 'file', kind: 'emote', label: 'Walk Animation (GLB)' },
  { key: 'runEmote', type: 'file', kind: 'emote', label: 'Run Animation (GLB)' },
  { key: 'walkFireEmote', type: 'file', kind: 'emote', label: 'Walk+Fire Animation (GLB)' },
  { key: 'runFireEmote', type: 'file', kind: 'emote', label: 'Run+Fire Animation (GLB)' },
  { key: 'aimDownEmote', type: 'file', kind: 'emote', label: 'Aim Down Animation (GLB)' },
  { key: 'aimUpEmote', type: 'file', kind: 'emote', label: 'Aim Up Animation (GLB)' },

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
            player.damage(amount)
            app.send('dmg', [player.id, amount, crit])
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
      const instance = instances.get(playerId)
      if (!instance) return console.error('[item] error 1')
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
