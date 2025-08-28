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
    this.enabled = false  // Camera controls OFF by default
    
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
    this.adsZoomEnabled = false
    this.isAiming = false
    this.baseFocalLength = 50
    this.adsZoomFocalLength = 85  // Zoomed in focal length
    this.currentFocalLength = 50
    this.targetFocalLength = 50
    this.zoomTransitionSpeed = 0.3
    this.adsBokehMultiplier = 2.5  // Increase bokeh when zoomed
    this.normalBokehScale = 1
  }

  init() {
    // Initialize camera with current settings
    if (this.world.prefs) {
      this.applyFocalLength(this.world.prefs.focalLength)
      this.baseFocalLength = this.world.prefs.focalLength || 50
      this.currentFocalLength = this.baseFocalLength
      
      // Initialize autofocus settings from prefs - default to OFF
      this.reticleAutofocus = this.world.prefs.reticleAutofocus || false
      this.playerAutofocus = this.world.prefs.playerAutofocus || false
      this.focusSmoothing = this.world.prefs.focusSmoothing !== false  // Default true
      this.focusSpeed = this.world.prefs.focusSpeed || 0.1
      this.reticleFocusDelay = this.world.prefs.reticleFocusDelay || 0.5
      this.enableScrollZoom = this.world.prefs.scrollZoomEnabled || false  // Default false
      this.zoomSpeed = this.world.prefs.zoomSpeed || 5
      this.currentFocusDistance = this.world.prefs.dofFocusDistance || 10
      this.targetFocusDistance = this.world.prefs.dofFocusDistance || 10
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
    if (this.enabled && this.adsZoomEnabled && this.control) {
      // Check if right mouse button is currently down (not pressed/released)
      const rightMouseDown = this.control?.mouseRight?.down
      
      // Check if aiming state changed
      if (rightMouseDown && !this.isAiming) {
        // Start aiming
        this.isAiming = true
        this.targetFocalLength = this.adsZoomFocalLength
        
        // Save current bokeh and enhance it
        this.normalBokehScale = this.world.prefs.dofBokehScale || 1
        this.world.prefs.setDOFBokehScale(this.normalBokehScale * this.adsBokehMultiplier)
        
        // Enable DOF if not already
        if (!this.world.prefs.dofEnabled) {
          this.world.prefs.setDOFEnabled(true)
        }
        
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
      
      // Smooth focal length transition
      if (Math.abs(this.targetFocalLength - this.currentFocalLength) > 0.1) {
        this.currentFocalLength += (this.targetFocalLength - this.currentFocalLength) * this.zoomTransitionSpeed
        this.setFocalLength(this.currentFocalLength)
      }
    }
    
    // Removed scroll zoom to avoid conflicting with native camera controls
    // Use ADS zoom (right-click) instead for focal length adjustment
    
    // Only run DOF updates if master control is enabled AND DOF is enabled
    if (!this.enabled || !this.world.prefs.dofEnabled) return
    
    // Dynamic DOF compensation based on camera zoom
    if (this.dynamicDOF && this.world.camera) {
      // Calculate focus based on camera distance from player (zoom level)
      // In first person (z=0), focus close. In third person, focus further
      const cameraZoom = Math.abs(this.world.camera.position.z)
      
      // Base focus distance that scales with zoom
      // First person: 3-5 units, Third person: scales up to 20+ units
      const baseFocus = 5 + (cameraZoom * 1.5)
      
      // Try to get more accurate distance with raycast
      let raycastDistance = this.raycastFocusDistance()
      
      if (raycastDistance !== null) {
        // Use raycast but blend with expected distance
        this.targetFocusDistance = (raycastDistance * 0.7) + (baseFocus * 0.3)
        
        if (this.debugDOF) {
          console.log(`DOF: Raycast=${raycastDistance.toFixed(2)}, Base=${baseFocus.toFixed(2)}, Final=${this.targetFocusDistance.toFixed(2)}`)
        }
      } else {
        // No raycast hit - use camera zoom-based estimation
        this.targetFocusDistance = baseFocus
        
        if (this.debugDOF) {
          console.log(`DOF: Using zoom-based focus=${baseFocus.toFixed(2)} (zoom=${cameraZoom.toFixed(2)})`)
        }
      }
      
      // Adjust focus range based on distance for better depth perception
      // Closer = tighter focus, farther = wider range
      const dynamicRange = Math.min(15, Math.max(1, this.targetFocusDistance * 0.25))
      this.world.prefs.setDOFFocusRange(dynamicRange)
      
      if (this.debugDOF) {
        console.log(`DOF: Focus range=${dynamicRange.toFixed(2)}`)
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
cam.help() - Show this help message
        `)
      }
    }
    
    console.log('Camera controls ready for admins. Type cam.help() for commands.')
  }
}