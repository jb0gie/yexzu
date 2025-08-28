import { System } from './System'

/**
 * CameraManager System
 * 
 * Manages all camera nodes in the world, tracking which is active
 * and handling transitions between cameras.
 */
export class CameraManager extends System {
  constructor(world) {
    super(world)
    
    // All registered cameras
    this.cameras = new Map()
    
    // Currently active camera
    this.activeCamera = null
    
    // Default/fallback camera (first registered)
    this.defaultCamera = null
    
    // Transition state
    this.isTransitioning = false
    this.transitionFrom = null
    this.transitionTo = null
    this.transitionProgress = 0
    this.transitionDuration = 0
    this.transitionEasing = 'linear'
  }
  
  /**
   * Register a camera node
   */
  registerCamera(camera) {
    if (!camera || !camera.id) {
      console.warn('CameraManager: Invalid camera registration attempt')
      return
    }
    
    this.cameras.set(camera.id, camera)
    
    // Set as default if first camera
    if (!this.defaultCamera) {
      this.defaultCamera = camera
    }
    
    // Activate if marked as active and no other camera is active
    if (camera.active && !this.activeCamera) {
      this.setActiveCamera(camera)
    }
    
    console.log(`CameraManager: Registered camera ${camera.id}`)
  }
  
  /**
   * Unregister a camera node
   */
  unregisterCamera(camera) {
    if (!camera || !camera.id) return
    
    this.cameras.delete(camera.id)
    
    // Handle if this was the active camera
    if (this.activeCamera === camera) {
      this.activeCamera = null
      // Switch to default camera if available
      if (this.defaultCamera && this.defaultCamera !== camera) {
        this.setActiveCamera(this.defaultCamera)
      }
    }
    
    // Handle if this was the default camera
    if (this.defaultCamera === camera) {
      this.defaultCamera = this.cameras.values().next().value || null
    }
    
    console.log(`CameraManager: Unregistered camera ${camera.id}`)
  }
  
  /**
   * Set the active camera
   */
  setActiveCamera(camera, transition = false, duration = 1) {
    if (!camera || !this.cameras.has(camera.id)) {
      console.warn('CameraManager: Attempted to activate unregistered camera')
      return false
    }
    
    // Deactivate current camera
    if (this.activeCamera && this.activeCamera !== camera) {
      this.activeCamera.active = false
    }
    
    // Handle transition
    if (transition && this.activeCamera && this.activeCamera !== camera) {
      this.startTransition(this.activeCamera, camera, duration)
    } else {
      // Immediate switch
      this.activeCamera = camera
      camera.active = true
      this.world.emit('camera-changed', camera)
    }
    
    console.log(`CameraManager: Activated camera ${camera.id}`)
    return true
  }
  
  /**
   * Get camera by ID
   */
  getCamera(id) {
    return this.cameras.get(id)
  }
  
  /**
   * Get all cameras
   */
  getAllCameras() {
    return Array.from(this.cameras.values())
  }
  
  /**
   * Start a camera transition
   */
  startTransition(from, to, duration = 1, easing = 'smooth') {
    this.isTransitioning = true
    this.transitionFrom = from
    this.transitionTo = to
    this.transitionProgress = 0
    this.transitionDuration = duration
    this.transitionEasing = easing
    
    // Mark both cameras as partially active during transition
    from.active = true
    to.active = true
    
    this.world.emit('camera-transition-start', { from, to, duration })
  }
  
  /**
   * Update transition
   */
  updateTransition(delta) {
    if (!this.isTransitioning) return
    
    this.transitionProgress += delta / this.transitionDuration
    
    if (this.transitionProgress >= 1) {
      // Transition complete
      this.completeTransition()
    } else {
      // Apply easing
      let t = this.transitionProgress
      if (this.transitionEasing === 'smooth') {
        t = t * t * (3 - 2 * t) // smoothstep
      } else if (this.transitionEasing === 'ease-in') {
        t = t * t
      } else if (this.transitionEasing === 'ease-out') {
        t = 1 - (1 - t) * (1 - t)
      }
      
      // Emit progress for systems that need to interpolate
      this.world.emit('camera-transition-progress', {
        from: this.transitionFrom,
        to: this.transitionTo,
        progress: t
      })
    }
  }
  
  /**
   * Complete the current transition
   */
  completeTransition() {
    if (!this.isTransitioning) return
    
    // Deactivate old camera
    if (this.transitionFrom) {
      this.transitionFrom.active = false
    }
    
    // Fully activate new camera
    this.activeCamera = this.transitionTo
    if (this.transitionTo) {
      this.transitionTo.active = true
    }
    
    // Clear transition state
    this.isTransitioning = false
    this.transitionFrom = null
    this.transitionTo = null
    this.transitionProgress = 0
    
    this.world.emit('camera-transition-complete', this.activeCamera)
    this.world.emit('camera-changed', this.activeCamera)
  }
  
  /**
   * Update loop
   */
  update(delta) {
    // Update camera transition if in progress
    if (this.isTransitioning) {
      this.updateTransition(delta)
    }
    
    // Update aspect ratios if window resized
    if (this.world.graphics?.resized) {
      const aspect = this.world.graphics.aspect
      this.cameras.forEach(camera => {
        if (camera.aspect !== aspect) {
          camera.setAspect(aspect)
        }
      })
    }
    
    // Update active camera (for autofocus, etc)
    if (this.activeCamera && this.activeCamera.update) {
      this.activeCamera.update(delta)
    }
  }
  
  /**
   * Get the camera to use for rendering
   * Returns active camera's THREE camera, or null
   */
  getRenderCamera() {
    if (this.isTransitioning) {
      // During transition, return the target camera
      // (Graphics system will handle blending if needed)
      return this.transitionTo?.camera || null
    }
    
    return this.activeCamera?.camera || null
  }
  
  /**
   * Check if a camera is currently active
   */
  isActive(camera) {
    return camera === this.activeCamera || 
           (this.isTransitioning && (camera === this.transitionFrom || camera === this.transitionTo))
  }
  
  /**
   * Get camera info for debugging
   */
  getDebugInfo() {
    return {
      totalCameras: this.cameras.size,
      activeCamera: this.activeCamera?.id || 'none',
      defaultCamera: this.defaultCamera?.id || 'none',
      isTransitioning: this.isTransitioning,
      transitionProgress: this.isTransitioning ? `${(this.transitionProgress * 100).toFixed(1)}%` : 'n/a'
    }
  }
}