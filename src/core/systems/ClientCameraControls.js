import { isNumber } from 'lodash-es'
import { System } from './System'
import { Raycaster, Vector2 } from 'three'

/**
 * Client Camera Controls System
 * 
 * Provides programmatic control over camera settings including:
 * - Depth of Field (DOF) settings
 * - Focal length
 * - Helper visibility
 */
export class ClientCameraControls extends System {
  constructor(world) {
    super(world)
    this.raycaster = new Raycaster()
    this.raycaster.near = 0.1
    this.raycaster.far = 1000
    this.screenCenter = new Vector2(0, 0) // Center of screen
    
    // Master control
    this.enabled = true  // Camera controls ON by default for ADS to work
    
    // Autofocus state
    this.reticleAutofocus = false
    this.playerAutofocus = false
    this.focusSmoothing = true
    this.focusSpeed = 0.1
    this.targetFocusDistance = 10
    this.currentFocusDistance = 10
    this.reticleFocusTimer = 0
    this.reticleFocusDelay = 0.5 // seconds before focusing
    this.lastReticleTarget = null
    
    // Zoom control
    this.zoomSpeed = 5
    this.enableScrollZoom = false  // Off by default
    
    // Dynamic DOF compensation
    this.dynamicDOF = false  // Auto-adjust DOF based on zoom
    this.lastCameraZoom = null
    this.debugDOF = false  // Debug logging
    
    // ADS-style zoom
    this.adsZoomEnabled = true  // Enable ADS by default
    this.isAiming = false
    this.baseFocalLength = 24  // Will be set properly in init()
    this.adsZoomFocalLength = 85  // Zoomed in focal length
    this.currentFocalLength = 24
    this.targetFocalLength = 24
    this.zoomTransitionSpeed = 0.3
    this.adsBokehMultiplier = 2.5  // Increase bokeh when zoomed
    this.normalBokehScale = 1

    // How strongly focus distance grows with camera zoom-out (legacy scalar)
    this.zoomDistanceMultiplier = 3
    this.anchorFocusToPlayer = true
    // Blend player distance with stop-based focus as we zoom out (0..1)
    this.playerFocusBlendMax = 0.15
    this.playerFocusBlendPow = 1.2
    
    // Track observed zoom range so we can normalize stops to user's device
    // Seed with a sensible span so defaults work without manual calibration
    this.zoomObservedMin = 0
    this.zoomObservedMax = 12
    
    // Four-stop profile across normalized zoom t in [0..1]
    this.zoomStopsNormalized = true
    this.zoomStops = [
      { t: 0.00,  focus: 6,   range: 2.0,   bokeh: 1.00 },
      { t: 0.318, focus: 30,  range: 80.0,  bokeh: 0.50 },
      { t: 0.618, focus: 60,  range: 160.0, bokeh: 0.40 },
      { t: 1.00,  focus: 120, range: 240.0, bokeh: 0.35 }
    ]

    // Focus range shaping (shallow when close, deeper when far)
    this.focusRangeCloseFactor = 0.25
    this.focusRangeFarFactor = 3.0

    // One-click autofocus using right mouse (outside build mode)
    this.rightClickAutofocus = true
  }

  init() {
    console.log('ClientCameraControls: Initializing with default settings')
    
    // Use the exact same settings as the reset command
    // These are the defaults that make the camera look correct
    this.baseFocalLength = 24  // Wide landscape preset
    this.adsZoomFocalLength = 85  // Zoomed in focal length for ADS
    this.currentFocalLength = 24
    this.targetFocalLength = 24
    
    // Set all the defaults
    this.enabled = true  // Enable camera controls
    this.adsZoomEnabled = true  // Enable ADS by default
    this.isAiming = false
    this.normalBokehScale = 1
    
    // Autofocus defaults
    this.reticleAutofocus = false
    this.playerAutofocus = false
    this.focusSmoothing = true
    this.focusSpeed = 0.1
    this.reticleFocusDelay = 0.5
    
    // Other defaults
    this.enableScrollZoom = false
    this.zoomSpeed = 5
    this.currentFocusDistance = 10
    this.targetFocusDistance = 10
    
    // Apply settings to prefs
    if (this.world.prefs) {
      this.world.prefs.setFocalLength(24)
      this.world.prefs.setDOFBokehScale(1)
      this.world.prefs.setDOFFocusDistance(10)
      this.world.prefs.setDOFFocusRange(5)
      this.world.prefs.setDOFEnabled(true)
      this.world.prefs.setFocusSmoothing(false)
      
      // Apply the focal length
      this.applyFocalLength(24)
    }
    
    // Bind controls for mouse input
    if (this.world.controls) {
      this.control = this.world.controls.bind({
        priority: 1000, // High priority to capture mouse
      })
    }
    
    // Set up admin console commands if in browser
    if (typeof window !== 'undefined') {
      this.setupConsoleCommands()
    }
  }
  
  start() {
    // Listen for pref changes
    this.world.prefs.on('change', this.onPrefsChange)

    // Enable dynamic DOF when using the default/player camera
    this.world.on('camera-changed', (cameraNode) => {
      const isPlayerCam = !!cameraNode?.isPlayerCamera
      this.dynamicDOF = isPlayerCam || this.dynamicDOF
      if (isPlayerCam && this.world.prefs.dofEnabled) {
        // Seed focus immediately based on current zoom level
        const z = Math.abs(this.world.camera?.position?.z || 0)
        const baseFocus = 5 + (z * 1.5)
        this.targetFocusDistance = baseFocus
        this.currentFocusDistance = baseFocus
        this.setDOFFocusDistance(baseFocus)
      }
    })

    // Initialize dynamic DOF state based on current camera
    const currentCam = this.world.cameraManager?.activeCamera || this.world.defaultCameraNode
    this.dynamicDOF = !!currentCam?.isPlayerCamera
  }
  
  
  resetCamera() {
    // Reset focal length to base
    this.baseFocalLength = 24
    this.adsZoomFocalLength = 85
    this.currentFocalLength = this.baseFocalLength
    this.targetFocalLength = this.baseFocalLength
    
    // Reset DOF settings
    this.normalBokehScale = 1
    if (this.world.prefs) {
      this.world.prefs.setFocalLength(this.baseFocalLength)
      this.world.prefs.setDOFBokehScale(this.normalBokehScale)
    }
    
    // Reset ADS state
    this.isAiming = false
    
    // Reset control states
    if (this.control?.mouseRight) {
      this.control.mouseRight.capture = false
    }
  }
  
  destroy() {
    this.world.prefs.off('change', this.onPrefsChange)
    this.control?.release()
    this.control = null
  }
  
  onPrefsChange = (changes) => {
    if (changes.reticleAutofocus) this.reticleAutofocus = changes.reticleAutofocus.value
    if (changes.playerAutofocus) this.playerAutofocus = changes.playerAutofocus.value
    if (changes.focusSmoothing) this.focusSmoothing = changes.focusSmoothing.value
    if (changes.focusSpeed) this.focusSpeed = changes.focusSpeed.value
    if (changes.reticleFocusDelay) this.reticleFocusDelay = changes.reticleFocusDelay.value
    if (changes.scrollZoomEnabled) this.enableScrollZoom = changes.scrollZoomEnabled.value
    if (changes.zoomSpeed) this.zoomSpeed = changes.zoomSpeed.value
  }
  
  update(delta) {
    // Handle ADS-style zoom (right mouse button)
    // Disable ADS if in build mode since right-click is used for building
    const inBuildMode = this.world.builder?.enabled === true
    
    // If we were aiming but entered build mode, stop aiming immediately
    if (inBuildMode && this.isAiming) {
      this.isAiming = false
      this.targetFocalLength = this.baseFocalLength
      this.world.prefs.setDOFBokehScale(this.normalBokehScale)
      if (this.control?.mouseRight?.capture !== undefined) {
        this.control.mouseRight.capture = false
      }
      if (this.debugDOF) {
        console.log('ADS: Disabled due to build mode')
      }
    }
    
    // Right-click autofocus (when not in build mode)
    if (this.enabled && this.rightClickAutofocus && this.control && !inBuildMode) {
      const rightPressed = this.control?.mouseRight?.pressed === true
      if (rightPressed) {
        // Capture to avoid context menu
        if (this.control.mouseRight.capture !== undefined) this.control.mouseRight.capture = true
        const distance = this.raycastFocusDistance() || this.getFocusDistanceToPlayer() || 10
        this.targetFocusDistance = distance
        // Snap focus faster for explicit autofocus
        this.currentFocusDistance = distance
        this.setDOFFocusDistance(distance)
        if (this.debugDOF) console.log(`Right-click autofocus: ${distance.toFixed(2)}`)
      }
    }

    // Only process ADS if not in build mode
    if (this.enabled && this.adsZoomEnabled && this.control && !inBuildMode) {
      // Check if right mouse button is currently down (not pressed/released)
      // Make sure it's explicitly true, not undefined or truthy
      const rightMouseDown = this.control?.mouseRight?.down === true
      
      // Check if aiming state changed
      if (rightMouseDown && !this.isAiming) {
        // Start aiming
        this.isAiming = true
        this.targetFocalLength = this.adsZoomFocalLength
        
        // Save current bokeh and enhance it
        this.normalBokehScale = this.world.prefs.dofBokehScale || 1
        this.world.prefs.setDOFBokehScale(this.normalBokehScale * this.adsBokehMultiplier)
        
        // Do not auto-enable DOF; leave to user preference
        
        // Capture right mouse to prevent context menu
        if (this.control.mouseRight.capture !== undefined) {
          this.control.mouseRight.capture = true
        }
        
        if (this.debugDOF) {
          console.log('ADS: Zooming in')
        }
      } else if (!rightMouseDown && this.isAiming) {
        // Stop aiming
        this.isAiming = false
        this.targetFocalLength = this.baseFocalLength
        
        // Restore normal bokeh
        this.world.prefs.setDOFBokehScale(this.normalBokehScale)
        
        // Release capture
        if (this.control.mouseRight.capture !== undefined) {
          this.control.mouseRight.capture = false
        }
        
        if (this.debugDOF) {
          console.log('ADS: Zooming out')
        }
      }
    }
    
    // Smooth focal length transition (only if not in build mode or if zooming out)
    if (!inBuildMode || this.targetFocalLength === this.baseFocalLength) {
      if (Math.abs(this.targetFocalLength - this.currentFocalLength) > 0.1) {
        this.currentFocalLength += (this.targetFocalLength - this.currentFocalLength) * this.zoomTransitionSpeed
        this.setFocalLength(this.currentFocalLength)
      } else if (this.currentFocalLength !== this.targetFocalLength) {
        // Snap to target if very close
        this.currentFocalLength = this.targetFocalLength
        this.setFocalLength(this.currentFocalLength)
      }
    }
    
    // Removed scroll zoom to avoid conflicting with native camera controls
    // Use ADS zoom (right-click) instead for focal length adjustment
    
    // Only run DOF updates if master control is enabled AND DOF is enabled
    if (!this.enabled || !this.world.prefs.dofEnabled) return
    
    // Dynamic DOF compensation based on camera zoom (mouse scroll distance)
    if (this.dynamicDOF && this.world.camera) {
      // Calculate focus based on camera distance from player (zoom level)
      // In first person (z=0), focus close. In third person, focus further
      const cameraZoom = Math.abs(this.world.camera.position.z)
      const camFar = this.world.camera.far || 1200

      // Track zoom change to react instantly when user scroll-zooms
      const prevZoom = this.lastCameraZoom
      const zoomDelta = prevZoom == null ? 0 : Math.abs(cameraZoom - prevZoom)
      this.lastCameraZoom = cameraZoom
      
      // Update observed zoom range
      this.zoomObservedMin = this.zoomObservedMin === null ? cameraZoom : Math.min(this.zoomObservedMin, cameraZoom)
      this.zoomObservedMax = this.zoomObservedMax === null ? cameraZoom : Math.max(this.zoomObservedMax, cameraZoom)
      const zoomSpan = Math.max(1e-6, this.zoomObservedMax - this.zoomObservedMin)
      const tZoom = Math.min(1, Math.max(0, (cameraZoom - this.zoomObservedMin) / zoomSpan))

      // Evaluate four-stop zoom profile (piecewise linear) in normalized space
      const stops = (this.zoomStops && this.zoomStops.length >= 2) ? this.zoomStops : [
        { t: 0, focus: 3, range: 1.0, bokeh: 1.0 },
        { t: 1, focus: Math.min(60, camFar * 0.5), range: Math.min(18, camFar * 0.4), bokeh: 0.5 }
      ]
      let s0 = stops[0]
      let s1 = stops[stops.length - 1]
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i]
        const b = stops[i + 1]
        if (tZoom >= a.t && tZoom <= b.t) { s0 = a; s1 = b; break }
        if (tZoom < stops[0].t) { s0 = stops[0]; s1 = stops[1]; break }
        if (tZoom > stops[stops.length - 2].t) { s0 = stops[stops.length - 2]; s1 = stops[stops.length - 1]; }
      }
      const denom = Math.max(1e-6, (s1.t - s0.t))
      const t = Math.min(1, Math.max(0, (tZoom - s0.t) / denom))
      const lerp = (a, b, u) => a + (b - a) * u
      const baseFocus = Math.min(camFar * 0.5, lerp(s0.focus, s1.focus, t))
      const baseRange = Math.min(camFar * 0.45, lerp(s0.range, s1.range, t))
      const baseBokeh = Math.max(0.2, Math.min(2.0, lerp(s0.bokeh, s1.bokeh, t)))

      // Choose focus center
      let playerDist = this.getFocusDistanceToPlayer()
      if (this.anchorFocusToPlayer && playerDist !== null && isFinite(playerDist)) {
        // Blend between player distance and stop-based focus according to zoom
        const blend = Math.max(0, Math.min(1, Math.pow(tZoom, this.playerFocusBlendPow) * this.playerFocusBlendMax))
        this.targetFocusDistance = (playerDist * (1 - blend)) + (baseFocus * blend)
      } else {
        // Blend with reticle raycast if available (low influence to avoid jumpiness)
        let raycastDistance = this.raycastFocusDistance()
        if (raycastDistance !== null && isFinite(raycastDistance) && raycastDistance > 0.5) {
          this.targetFocusDistance = (raycastDistance * 0.25) + (baseFocus * 0.75)
        } else {
          this.targetFocusDistance = baseFocus
        }
      }

      // Apply shaped focus range and bokeh
      let rangeUsed = baseRange
      // Ensure the player's plane remains within focus range if we blended away
      if (playerDist !== null && isFinite(playerDist)) {
        const extra = Math.abs(this.targetFocusDistance - playerDist) * 1.25
        if (extra > rangeUsed) rangeUsed = Math.min(camFar * 0.45, extra)
      }
      this.world.prefs.setDOFFocusRange(rangeUsed)
      this.world.prefs.setDOFBokehScale(baseBokeh)
      
      if (this.debugDOF) {
        console.log(`DOF: Focus=${this.targetFocusDistance.toFixed(2)} Range=${rangeUsed.toFixed(2)} Zoom=${cameraZoom.toFixed(2)} tZoom=${tZoom.toFixed(2)} segT=${t.toFixed(2)} anchor=${this.anchorFocusToPlayer}`)
      }

      // When the user changes zoom, snap focus to prevent temporary blur
      if (zoomDelta > 0.05) {
        this.currentFocusDistance = this.targetFocusDistance
        this.setDOFFocusDistance(this.currentFocusDistance)
      }
    }
    
    // Smooth focus transition
    if (this.focusSmoothing && Math.abs(this.targetFocusDistance - this.currentFocusDistance) > 0.01) {
      this.currentFocusDistance += (this.targetFocusDistance - this.currentFocusDistance) * this.focusSpeed
      this.setDOFFocusDistance(this.currentFocusDistance)
    } else if (!this.focusSmoothing && this.targetFocusDistance !== this.currentFocusDistance) {
      this.currentFocusDistance = this.targetFocusDistance
      this.setDOFFocusDistance(this.currentFocusDistance)
    }
    
    // Reticle autofocus (use head raycast for consistency)
    if (this.reticleAutofocus && !this.dynamicDOF) {
      const raycastDist = this.raycastFromPlayerHead() || this.raycastFocusDistance()
      
      if (raycastDist !== null) {
        // Check if we're looking at a new target
        if (Math.abs(raycastDist - (this.lastReticleTarget || 0)) > 0.5) {
          // New target, reset timer
          this.reticleFocusTimer = 0
          this.lastReticleTarget = raycastDist
        } else {
          // Same target, increment timer
          this.reticleFocusTimer += delta
          
          // After delay, start focusing
          if (this.reticleFocusTimer >= this.reticleFocusDelay) {
            this.targetFocusDistance = raycastDist
          }
        }
      }
    }
    
    // Player autofocus (overrides reticle if both are enabled)
    if (this.playerAutofocus && !this.dynamicDOF) {
      const distance = this.getFocusDistanceToPlayer()
      if (distance !== null) {
        this.targetFocusDistance = distance
      }
    }
  }

  // Depth of Field Controls
  enableDOF() {
    this.world.prefs.setDOFEnabled(true)
  }

  disableDOF() {
    this.world.prefs.setDOFEnabled(false)
  }

  setDOFFocusDistance(distance) {
    if (!isNumber(distance) || distance < 0) {
      console.warn('DOF focus distance must be a positive number')
      return
    }
    this.world.prefs.setDOFFocusDistance(distance)
  }

  setDOFFocusRange(range) {
    if (!isNumber(range) || range < 0) {
      console.warn('DOF focus range must be a positive number')
      return
    }
    this.world.prefs.setDOFFocusRange(range)
  }

  setDOFBokehScale(scale) {
    if (!isNumber(scale) || scale < 0) {
      console.warn('DOF bokeh scale must be a positive number')
      return
    }
    this.world.prefs.setDOFBokehScale(scale)
  }

  // Focal Length Control
  setFocalLength(focalLength) {
    if (!isNumber(focalLength) || focalLength < 1 || focalLength > 200) {
      console.warn('Focal length must be a number between 1 and 200')
      return
    }
    this.world.prefs.setFocalLength(focalLength)
    this.applyFocalLength(focalLength)
  }

  applyFocalLength(focalLength) {
    if (this.world.camera) {
      // Convert focal length to FOV
      // Using standard 35mm film equivalent calculation
      const sensorHeight = 24 // 35mm sensor height in mm
      const fov = 2 * Math.atan(sensorHeight / (2 * focalLength)) * (180 / Math.PI)
      this.world.camera.fov = fov
      
      // Dynamically adjust far plane based on focal length to optimize performance
      // Wide angle (low focal length) = see far, Telephoto (high focal length) = see less far
      const baseFar = 1200 // Default far plane
      let dynamicFar
      
      if (focalLength <= 50) {
        // Wide to normal: full range
        dynamicFar = baseFar
      } else if (focalLength <= 85) {
        // Portrait range: slight reduction
        dynamicFar = baseFar * 0.95 // 1140 - keep skybox visible
      } else if (focalLength <= 135) {
        // Telephoto: moderate reduction
        dynamicFar = baseFar * 0.85 // 1020 - still see skybox
      } else {
        // Super telephoto: more reduction but keep skybox
        dynamicFar = baseFar * 0.75 // 900 - minimum for skybox
      }
      
      this.world.camera.far = dynamicFar
      this.world.camera.updateProjectionMatrix()
      
      if (this.debugDOF) {
        console.log(`Focal length: ${focalLength}mm, FOV: ${fov.toFixed(1)}°, Far: ${dynamicFar}`)
      }
    }
  }

  getFocalLength() {
    return this.world.prefs.focalLength
  }

  // Helper Controls
  showHelpers() {
    this.world.prefs.setShowHelpers(true)
  }

  hideHelpers() {
    this.world.prefs.setShowHelpers(false)
  }

  toggleHelpers() {
    this.world.prefs.setShowHelpers(!this.world.prefs.showHelpers)
  }

  // Get current settings
  getCameraSettings() {
    return {
      dof: {
        enabled: this.world.prefs.dofEnabled,
        focusDistance: this.world.prefs.dofFocusDistance,
        focusRange: this.world.prefs.dofFocusRange,
        bokehScale: this.world.prefs.dofBokehScale,
      },
      focalLength: this.world.prefs.focalLength,
      fov: this.world.camera.fov,
      showHelpers: this.world.prefs.showHelpers,
    }
  }

  // Auto-focus on target position
  autoFocus(targetPosition) {
    if (!targetPosition) {
      console.warn('Target position required for auto-focus')
      return
    }
    
    const distance = this.world.camera.position.distanceTo(targetPosition)
    this.setDOFFocusDistance(distance)
  }
  
  // Raycast from camera center to get focus distance
  raycastFocusDistance() {
    if (!this.world.camera || !this.world.stage) {
      if (this.debugDOF) {
        console.log('DOF Debug: Camera or stage not ready')
      }
      return null
    }
    
    // Check if viewport is ready (required for raycast)
    if (!this.world.stage.viewport) {
      if (this.debugDOF) {
        console.log('DOF Debug: Stage viewport not ready')
      }
      return null
    }
    
    // Use Stage raycast which properly uses the octree
    try {
      const hits = this.world.stage.raycastReticle()
      if (hits && hits.length > 0) {
        // Filter out very close hits (likely the player)
        const validHits = hits.filter(hit => hit.distance > 0.5)
        if (validHits.length > 0) {
          const distance = validHits[0].distance
          if (this.debugDOF) {
            console.log(`DOF Debug: Raycast hit at distance ${distance.toFixed(2)}, object:`, validHits[0].object?.name || 'unknown')
          }
          return distance
        } else if (this.debugDOF) {
          console.log('DOF Debug: All hits were too close (< 0.5)')
        }
      } else if (this.debugDOF) {
        console.log('DOF Debug: No octree hits')
      }
    } catch (err) {
      if (this.debugDOF) {
        console.log('DOF Debug: Stage raycast error:', err.message)
      }
    }
    
    // No fallback to manual scene traversal since objects are in the octree
    return null
  }
  
  // Auto-focus using raycast
  autoFocusRaycast() {
    const distance = this.raycastFocusDistance()
    if (distance !== null) {
      this.setDOFFocusDistance(distance)
      return distance
    }
    return null
  }
  
  // Get focus distance to player
  getFocusDistanceToPlayer() {
    if (!this.world.entities?.player || !this.world.camera) {
      return null
    }
    
    const player = this.world.entities.player
    
    // Try to get player head position for more accurate focus
    let playerPos
    if (player.entity?.position) {
      playerPos = player.entity.position.clone()
      // Add approximate head height offset
      playerPos.y += 1.6  // Standard eye height offset
    } else {
      return null
    }
    
    // Get actual camera world position (accounting for rig)
    const cameraWorldPos = new THREE.Vector3()
    this.world.camera.getWorldPosition(cameraWorldPos)
    
    // Calculate distance from camera to player head
    return cameraWorldPos.distanceTo(playerPos)
  }
  
  // Raycast from player head position towards camera look direction
  raycastFromPlayerHead() {
    if (!this.world.entities?.player || !this.world.camera || !this.world.scene) {
      return null
    }
    
    const player = this.world.entities.player
    if (!player.entity?.position) return null
    
    // Get player head position
    const headPos = player.entity.position.clone()
    headPos.y += 1.6  // Standard eye height
    
    // Get camera direction
    const cameraDir = new THREE.Vector3()
    this.world.camera.getWorldDirection(cameraDir)
    
    // Set up raycaster from player head in camera direction
    this.raycaster.set(headPos, cameraDir)
    
    // Get all meshes in the scene
    const intersectables = []
    this.world.scene.traverse((object) => {
      if (object.isMesh && object.visible && object !== player.entity) {
        intersectables.push(object)
      }
    })
    
    // Perform raycast
    const intersects = this.raycaster.intersectObjects(intersectables, false)
    
    if (intersects.length > 0) {
      // Return distance from camera to intersection
      const cameraWorldPos = new THREE.Vector3()
      this.world.camera.getWorldPosition(cameraWorldPos)
      return cameraWorldPos.distanceTo(intersects[0].point)
    }
    
    return null
  }
  
  // Auto-focus on player
  autoFocusPlayer() {
    const distance = this.getFocusDistanceToPlayer()
    if (distance !== null) {
      this.setDOFFocusDistance(distance)
      return distance
    }
    return null
  }
  
  // Master enable/disable
  enable() {
    this.enabled = true
    console.log('Camera controls system: ENABLED')
  }
  
  disable() {
    this.enabled = false
    // Reset autofocus when disabling
    this.reticleAutofocus = false
    this.playerAutofocus = false
    this.enableScrollZoom = false
    console.log('Camera controls system: DISABLED')
  }
  
  setEnabled(enabled) {
    if (enabled) {
      this.enable()
    } else {
      this.disable()
    }
  }
  
  // Enable/disable autofocus modes
  setReticleAutofocus(enabled) {
    this.reticleAutofocus = enabled
    this.world.prefs.setReticleAutofocus(enabled)
    if (!enabled) {
      this.reticleFocusTimer = 0
      this.lastReticleTarget = null
    }
  }
  
  setPlayerAutofocus(enabled) {
    this.playerAutofocus = enabled
    this.world.prefs.setPlayerAutofocus(enabled)
  }
  
  setFocusSmoothing(enabled) {
    this.focusSmoothing = enabled
    this.world.prefs.setFocusSmoothing(enabled)
  }
  
  setFocusSpeed(speed) {
    this.focusSpeed = Math.max(0.01, Math.min(1, speed))
    this.world.prefs.setFocusSpeed(this.focusSpeed)
  }
  
  setReticleFocusDelay(delay) {
    this.reticleFocusDelay = Math.max(0, delay)
    this.world.prefs.setReticleFocusDelay(this.reticleFocusDelay)
  }
  
  // Zoom control
  setZoomSpeed(speed) {
    this.zoomSpeed = Math.max(1, Math.min(50, speed))
    this.world.prefs.setZoomSpeed(this.zoomSpeed)
  }
  
  setScrollZoomEnabled(enabled) {
    this.enableScrollZoom = enabled
    this.world.prefs.setScrollZoomEnabled(enabled)
  }
  
  // Handle scroll wheel zoom (focal length only, not camera distance)
  handleScrollZoom(delta) {
    if (!this.enableScrollZoom) return
    
    // Only adjust focal length, let Hyperfy handle camera distance
    const currentFocalLength = this.world.prefs.focalLength || 50
    const change = -delta * this.zoomSpeed
    const newFocalLength = Math.max(10, Math.min(200, currentFocalLength + change))
    
    this.setFocalLength(newFocalLength)
    
    if (this.debugDOF) {
      console.log(`Focal length zoom: ${newFocalLength.toFixed(0)}mm`)
    }
  }

  // Preset camera settings
  applyPreset(presetName) {
    const presets = {
      portrait: {
        focalLength: 85,
        dofEnabled: true,
        dofFocusDistance: 5,
        dofFocusRange: 2,
        dofBokehScale: 1.5,
      },
      landscape: {
        focalLength: 24,
        dofEnabled: false,
        dofFocusDistance: 20,
        dofFocusRange: 10,
        dofBokehScale: 0.5,
      },
      macro: {
        focalLength: 100,
        dofEnabled: true,
        dofFocusDistance: 1,
        dofFocusRange: 0.5,
        dofBokehScale: 2,
      },
      standard: {
        focalLength: 50,
        dofEnabled: false,
        dofFocusDistance: 10,
        dofFocusRange: 5,
        dofBokehScale: 0.5,
      }
    }

    const preset = presets[presetName]
    if (!preset) {
      console.warn(`Unknown camera preset: ${presetName}. Available presets: ${Object.keys(presets).join(', ')}`)
      return
    }

    this.setFocalLength(preset.focalLength)
    this.world.prefs.setDOFEnabled(preset.dofEnabled)
    this.setDOFFocusDistance(preset.dofFocusDistance)
    this.setDOFFocusRange(preset.dofFocusRange)
    this.setDOFBokehScale(preset.dofBokehScale)
  }
  
  // Check if current player is admin
  isPlayerAdmin() {
    const player = this.world.entities?.player
    return player && player.isAdmin && player.isAdmin()
  }
  
  // Check if current player is builder
  isPlayerBuilder() {
    const player = this.world.entities?.player
    return player && player.isBuilder && player.isBuilder()
  }
  
  // Setup console commands for admins
  setupConsoleCommands() {
    window.cam = {
      // Enable/disable master control
      enable: () => {
        if (!this.isPlayerAdmin()) {
          console.warn('Camera controls are admin-only')
          return false
        }
        this.enable()
        return true
      },
      
      disable: () => {
        if (!this.isPlayerAdmin()) {
          console.warn('Camera controls are admin-only')
          return false
        }
        this.disable()
        return true
      },
      
      // DOF controls
      dof: {
        enable: () => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.enabled = true
          this.enableDOF()
          console.log('DOF enabled')
          return true
        },
        
        disable: () => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.disableDOF()
          console.log('DOF disabled')
          return true
        },
        
        setFocus: (distance) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.enabled = true
          this.setDOFFocusDistance(distance)
          console.log(`DOF focus distance set to ${distance}`)
          return true
        },
        
        setRange: (range) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.enabled = true
          this.setDOFFocusRange(range)
          console.log(`DOF focus range set to ${range}`)
          return true
        },
        
        setBokeh: (scale) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.enabled = true
          this.setDOFBokehScale(scale)
          console.log(`DOF bokeh scale set to ${scale}`)
          return true
        }
      },
      
      // Focal length control
      setFocalLength: (length) => {
        if (!this.isPlayerAdmin()) {
          console.warn('Camera controls are admin-only')
          return false
        }
        this.enabled = true
        this.setFocalLength(length)
        console.log(`Focal length set to ${length}mm`)
        return true
      },
      
      // Autofocus controls
      autofocus: {
        reticle: (enable) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.enabled = true
          this.setReticleAutofocus(enable)
          console.log(`Reticle autofocus ${enable ? 'enabled' : 'disabled'}`)
          return true
        },
        
        player: (enable) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.enabled = true
          this.setPlayerAutofocus(enable)
          console.log(`Player autofocus ${enable ? 'enabled' : 'disabled'}`)
          return true
        },
        
        dynamic: (enable) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.enabled = true
          this.dynamicDOF = enable
          console.log(`Dynamic DOF ${enable ? 'enabled' : 'disabled'} - DOF auto-adjusts with camera zoom`)
          if (enable) {
            // Disable other autofocus modes when dynamic is enabled
            this.reticleAutofocus = false
            this.playerAutofocus = false
          }
          return true
        },
        
        smoothing: (enable) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.enabled = true
          this.setFocusSmoothing(enable)
          console.log(`Focus smoothing ${enable ? 'enabled' : 'disabled'}`)
          return true
        },
        
        speed: (speed) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.enabled = true
          this.setFocusSpeed(speed)
          console.log(`Focus speed set to ${speed}`)
          return true
        }
      },
      
      // Zoom control
      zoom: {
        enable: () => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.enabled = true
          this.setScrollZoomEnabled(true)
          console.log('Scroll zoom enabled')
          return true
        },
        
        disable: () => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.setScrollZoomEnabled(false)
          console.log('Scroll zoom disabled')
          return true
        },
        
        setSpeed: (speed) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.setZoomSpeed(speed)
          console.log(`Zoom speed set to ${speed}`)
          return true
        }
      },
      
      // ADS (Aim Down Sights) style zoom
      ads: {
        enable: () => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.enabled = true
          this.adsZoomEnabled = true
          console.log('ADS zoom enabled - hold right mouse to zoom')
          return true
        },
        
        disable: () => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.adsZoomEnabled = false
          console.log('ADS zoom disabled')
          return true
        },
        
        setZoom: (focalLength) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.adsZoomFocalLength = focalLength
          console.log(`ADS zoom focal length set to ${focalLength}mm`)
          return true
        },
        
        setBokeh: (multiplier) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.adsBokehMultiplier = multiplier
          console.log(`ADS bokeh multiplier set to ${multiplier}x`)
          return true
        },
        
        setSpeed: (speed) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.zoomTransitionSpeed = speed
          console.log(`ADS transition speed set to ${speed}`)
          return true
        }
      },
      
      // Dynamic DOF tuning
      dynamicDOF: {
        setZoomFactor: (multiplier) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          const value = Number(multiplier)
          if (!isFinite(value) || value <= 0) {
            console.warn('Zoom factor must be a positive number')
            return false
          }
          this.zoomDistanceMultiplier = value
          console.log(`Dynamic DOF zoom factor set to ${value}`)
          return true
        },
        setStops: (stops) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          if (!Array.isArray(stops) || stops.length < 2) {
            console.warn('Provide an array of at least 2 stops: [{ t:0..1, focus, range, bokeh }, ...]')
            return false
          }
          const clamped = stops.map(s => ({
            t: Math.max(0, Math.min(1, Number(s.t))),
            focus: Math.max(0.01, Number(s.focus)),
            range: Math.max(0.01, Number(s.range)),
            bokeh: Math.max(0.1, Math.min(3.0, Number(s.bokeh)))
          }))
          clamped.sort((a,b) => a.t - b.t)
          this.zoomStops = clamped
          console.log('Dynamic DOF stops set:', clamped)
          return true
        },
        resetStops: () => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.zoomStops = [
            { t: 0.00, focus: 3,  range: 0.8,  bokeh: 1.00 },
            { t: 0.33, focus: 12, range: 3.0,  bokeh: 0.80 },
            { t: 0.66, focus: 28, range: 9.0,  bokeh: 0.60 },
            { t: 1.00, focus: 60, range: 18.0, bokeh: 0.45 }
          ]
          console.log('Dynamic DOF stops reset to default')
          return true
        },
        resetObserved: () => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.zoomObservedMin = null
          this.zoomObservedMax = null
          console.log('Dynamic DOF observed zoom span reset')
          return true
        },
        setPlayerBlend: (max, pow = 1.0) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          const m = Number(max)
          const p = Number(pow)
          if (!isFinite(m) || m < 0 || m > 1) {
            console.warn('max must be in [0..1]')
            return false
          }
          if (!isFinite(p) || p <= 0) {
            console.warn('pow must be > 0')
            return false
          }
          this.playerFocusBlendMax = m
          this.playerFocusBlendPow = p
          console.log(`Dynamic DOF player blend set: max=${m}, pow=${p}`)
          return true
        },
        anchorPlayer: (enable) => {
          if (!this.isPlayerAdmin()) {
            console.warn('Camera controls are admin-only')
            return false
          }
          this.anchorFocusToPlayer = !!enable
          console.log(`Dynamic DOF anchor to player ${this.anchorFocusToPlayer ? 'ENABLED' : 'DISABLED'}`)
          return true
        }
      },
      
      // Presets
      preset: (name) => {
        if (!this.isPlayerAdmin()) {
          console.warn('Camera controls are admin-only')
          return false
        }
        this.enabled = true
        this.applyPreset(name)
        console.log(`Applied preset: ${name}`)
        return true
      },
      
      // Reset to default Hyperfy camera settings
      reset: () => {
        if (!this.isPlayerAdmin()) {
          console.warn('Camera controls are admin-only')
          return false
        }
        console.log('Resetting camera to wide landscape preset...')
        
        // Use the new resetCamera method
        this.resetCamera()
        
        // Re-enable ADS after reset
        this.adsZoomEnabled = true
        
        // Apply the reset
        this.applyFocalLength(this.baseFocalLength)
        
        // Reset autofocus settings
        this.reticleAutofocus = false
        this.playerAutofocus = false
        this.dynamicDOF = false
        this.focusSmoothing = true
        this.focusSpeed = 0.1
        
        // Save reset state
        this.world.prefs.persist()
        
        console.log('Camera reset to wide landscape preset:')
        console.log('- FOV: 73° (24mm focal length)')
        console.log('- DOF: Disabled')
        console.log('- Scroll zoom: Disabled')
        console.log('- ADS zoom: Disabled')
        console.log('- All autofocus: Disabled')
        return true
      },
      
      // Get current settings
      settings: () => {
        if (!this.isPlayerAdmin()) {
          console.warn('Camera controls are admin-only')
          return null
        }
        const settings = this.getCameraSettings()
        console.log('Camera Settings:', settings)
        console.log('Dynamic DOF:', this.dynamicDOF)
        console.log('Current Focus Distance:', this.currentFocusDistance)
        console.log('Target Focus Distance:', this.targetFocusDistance)
        return settings
      },
      
      // Toggle debug mode
      debug: (enable) => {
        if (!this.isPlayerAdmin()) {
          console.warn('Camera controls are admin-only')
          return false
        }
        this.debugDOF = enable !== undefined ? enable : !this.debugDOF
        console.log(`DOF Debug: ${this.debugDOF ? 'ON' : 'OFF'}`)
        return this.debugDOF
      },
      
      // Help
      help: () => {
        if (!this.isPlayerAdmin()) {
          console.warn('Camera controls are admin-only')
          return
        }
        console.log(`
Camera Controls (Admin Only):
=========================
cam.enable() - Enable camera controls
cam.disable() - Disable camera controls

DOF Controls:
cam.dof.enable() - Enable depth of field
cam.dof.disable() - Disable depth of field  
cam.dof.setFocus(distance) - Set focus distance (e.g., 10)
cam.dof.setRange(range) - Set focus range (e.g., 5)
cam.dof.setBokeh(scale) - Set bokeh scale (e.g., 2)

Focal Length:
cam.setFocalLength(mm) - Set focal length (e.g., 50)

Autofocus:
cam.autofocus.reticle(true/false) - Enable/disable reticle autofocus
cam.autofocus.player(true/false) - Enable/disable player autofocus
cam.autofocus.dynamic(true/false) - Enable/disable dynamic DOF (auto-adjusts with zoom)
cam.autofocus.smoothing(true/false) - Enable/disable focus smoothing
cam.autofocus.speed(0.1) - Set focus transition speed (0.01-1)

 Dynamic DOF (stops):
 cam.dynamicDOF.setZoomFactor(3) - Overall focus growth with zoom
 cam.dynamicDOF.setStops([{t,focus,range,bokeh}, ...]) - Override 4-stop curve (t in 0..1)
 cam.dynamicDOF.resetStops() - Restore default stops
 cam.dynamicDOF.resetObserved() - Relearn min/max zoom span
 cam.dynamicDOF.setPlayerBlend(max, pow) - Blend player→stops with zoom (0..1, >0)
 cam.dynamicDOF.anchorPlayer(true/false) - Anchor focus to player distance

Zoom:
cam.zoom.enable() - Enable scroll wheel zoom
cam.zoom.disable() - Disable scroll wheel zoom
cam.zoom.setSpeed(5) - Set zoom speed (1-50)

ADS Zoom (Right-Click):
cam.ads.enable() - Enable right-click zoom
cam.ads.disable() - Disable right-click zoom
cam.ads.setZoom(100) - Set zoom focal length (50-200mm)
cam.ads.setBokeh(2.5) - Set bokeh multiplier when zoomed
cam.ads.setSpeed(0.3) - Set zoom transition speed

Presets:
cam.preset('portrait') - Apply portrait preset
cam.preset('landscape') - Apply landscape preset
cam.preset('macro') - Apply macro preset
cam.preset('standard') - Apply standard preset

Info:
cam.settings() - Show current camera settings
cam.reset() - Reset to default Hyperfy camera
cam.help() - Show this help message
        `)
      }
    }
    
    console.log('Camera controls ready for admins. Type cam.help() for commands.')
  }
}