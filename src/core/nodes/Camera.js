import * as THREE from '../extras/three'
import { Node } from './Node'
import { Layers } from '../extras/Layers'
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  DepthOfFieldEffect,
  BloomEffect,
  ChromaticAberrationEffect,
  VignetteEffect,
  NoiseEffect,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
  BlendFunction,
  KernelSize,
  // optional effects we may or may not use
  LUT3DEffect,
  HueSaturationEffect,
  BrightnessContrastEffect,
  LensDistortionEffect,
  GodRaysEffect,
} from 'postprocessing'

/**
 * Camera Node
 *
 * A cinematic camera with full Three.js settings and postprocessing pipeline.
 * Supports DOF, bloom, vignette, chromatic aberration, and film grain.
 */
export class Camera extends Node {
  constructor(data = {}) {
    super(data)

    this.name = 'camera'
    this.data = data // Store the data for later use

    // Full THREE.js PerspectiveCamera settings
    this.fov = data.fov ?? 35 // Default to cinematic 35mm equivalent
    this.aspect = data.aspect || 1 // Will be updated when added to world
    this.near = data.near ?? 0.1
    this.far = data.far ?? 2000
    this.zoom = data.zoom ?? 1
    this.focus = data.focus ?? 10 // Object distance for focus
    this.filmGauge = data.filmGauge ?? 35 // Film size (mm)
    this.filmOffset = data.filmOffset ?? 0 // Film offset

    // Camera state
    this._active = data.active ?? false // Don't default to true, explicit activation only
    this.priority = data.priority || 0
    this.attachToRig = data.attachToRig ?? false // Default to NOT attaching to rig (world space)
    this.isPlayerCamera = data.isPlayerCamera ?? false // Whether this is the main player camera
    this.freeFlying = data.freeFlying ?? false // Whether this camera can be controlled with WASD/mouse
    // Free-flying body mode: 'noclip' (no physics) or 'capsule' (PhysX)
    this.freeBody = data.freeBody || 'noclip'
    this.freeBodyRadius = data.freeBodyRadius ?? 0.3
    this.freeBodyHeight = data.freeBodyHeight ?? 1.6
    this.freeUseGravity = data.freeUseGravity ?? false
    this.freeAccel = data.freeAccel ?? 40
    this.freeMaxSpeed = data.freeMaxSpeed ?? 12
    this.freeDrag = data.freeDrag ?? 6
    this.freeCollideLayers = data.freeCollideLayers || null // e.g., Layers.environment
    this._debugFreeLogInterval = data.freeLogInterval ?? 0.25
    // Horizontal movement basis: 'camera' (yaw-relative) or 'world' (global X/Z)
    this.freeHorizMode = data.freeHorizMode || 'camera'

    // Free-flying camera controls
    this.flySpeed = data.flySpeed ?? 5 // Movement speed for free-flying cameras
    this.flyBoostMultiplier = data.flyBoostMultiplier ?? 3 // Speed multiplier when shift is held
    this.lookSensitivity = data.lookSensitivity ?? 0.003 // Mouse look sensitivity (higher = more sensitive)
    this.smoothMovement = data.smoothMovement ?? true // Smooth camera movement
    this.controlsCaptured = false // Whether controls are currently captured

    // Camera motion settings - organic movement
    this.motion = {
      enabled: data.motion?.enabled ?? true,
      bobAmount: data.motion?.bobAmount ?? 0.05, // How much the camera bobs
      bobSpeed: data.motion?.bobSpeed ?? 0.15, // Speed of bobbing
      swayAmount: data.motion?.swayAmount ?? 0.02, // Side-to-side sway
      swaySpeed: data.motion?.swaySpeed ?? 0.1, // Speed of swaying
      dampingFactor: data.motion?.dampingFactor ?? 0.85, // Smooth dampening (0-1)
      breathingAmount: data.motion?.breathingAmount ?? 0.01, // Subtle breathing motion
      breathingSpeed: data.motion?.breathingSpeed ?? 0.3, // Slow breathing rhythm
      handheldShake: data.motion?.handheldShake ?? 0.001, // Micro shake like handheld
      velocityInfluence: data.motion?.velocityInfluence ?? 0.3, // How much movement affects camera
    }

    // Motion state tracking
    this.motionState = {
      time: 0,
      velocity: new THREE.Vector3(),
      lastPosition: new THREE.Vector3(),
      offsetPosition: new THREE.Vector3(),
      offsetRotation: new THREE.Euler(),
      smoothVelocity: new THREE.Vector3(),
      isMoving: false,
      basePosition: new THREE.Vector3(), // Store original position for static cameras
      baseRotation: new THREE.Euler(), // Store original rotation
    }

    // Free-flying state
    this.flyState = {
      velocity: new THREE.Vector3(),
      targetVelocity: new THREE.Vector3(),
      euler: new THREE.Euler(0, 0, 0, 'YXZ'),
    }

    // Physics handle for spectator capsule (when freeBody === 'capsule')
    this._freeActor = null
    this._freeLogTimer = 0

    // Ultra-cinematic DOF settings for dramatic bokeh
    this.dof = {
      enabled: data.dof?.enabled ?? true,
      focusDistance: data.dof?.focusDistance ?? 10,
      focalLength: data.dof?.focalLength ?? 35,
      fStop: data.dof?.fStop ?? 0.5, // Ultra shallow DOF (professional cinema lens)
      maxBlur: data.dof?.maxBlur ?? 0.08, // Maximum bokeh blur
      luminanceThreshold: data.dof?.luminanceThreshold ?? 0.2, // Even lower threshold
      luminanceGain: data.dof?.luminanceGain ?? 5, // Strong gain for bright bokeh
      bias: data.dof?.bias ?? 0.05, // Very sharp focus transition
      fringe: data.dof?.fringe ?? 1.5, // Strong chromatic aberration
      dithering: data.dof?.dithering ?? 0.0001,
      pentagon: data.dof?.pentagon ?? true,
      shapeBlur: data.dof?.shapeBlur ?? 2.0, // Maximum bokeh shape
      autofocus: data.dof?.autofocus ?? false, // Default OFF to avoid unexpected focus shifts
      autofocusSpeed: data.dof?.autofocusSpeed ?? 8, // Very fast focus pulls
      autofocusSmoothness: data.dof?.autofocusSmoothness ?? 0.08, // Ultra snappy focus
    }

    // Enhanced bloom for cinematic glow
    this.bloom = {
      enabled: data.bloom?.enabled ?? true,
      intensity: data.bloom?.intensity ?? 0.8, // Stronger bloom
      luminanceThreshold: data.bloom?.luminanceThreshold ?? 0.7, // Lower threshold
      luminanceSmoothing: data.bloom?.luminanceSmoothing ?? 0.4, // Smoother
      radius: data.bloom?.radius ?? 1.0, // Larger radius
      mipmapBlur: data.bloom?.mipmapBlur ?? true,
    }

    // Vignette settings
    this.vignette = {
      enabled: data.vignette?.enabled ?? true,
      offset: data.vignette?.offset ?? 0.35,
      darkness: data.vignette?.darkness ?? 0.4,
    }

    // Stronger chromatic aberration for lens realism
    this.chromaticAberration = {
      enabled: data.chromaticAberration?.enabled ?? true,
      offset: data.chromaticAberration?.offset ?? [0.004, 0.004], // Double the offset
      radialModulation: data.chromaticAberration?.radialModulation ?? true,
      modulationOffset: data.chromaticAberration?.modulationOffset ?? 0.25, // Stronger modulation
    }

    // Film grain settings
    this.filmGrain = {
      enabled: data.filmGrain?.enabled ?? true,
      intensity: data.filmGrain?.intensity ?? 0.35,
      grainScale: data.filmGrain?.grainScale ?? 1.5,
    }

    // Offscreen video feed (render-to-texture)
    this.feed = {
      enabled: data.feed?.enabled ?? false,
      width: data.feed?.width ?? 512,
      height: data.feed?.height ?? 512,
    }
    this.feedRenderTarget = null
    this.feedTexture = null

    // Tone mapping
    this.toneMapping = {
      enabled: data.toneMapping?.enabled ?? true,
      mode: data.toneMapping?.mode ?? ToneMappingMode.ACES_FILMIC,
      exposure: data.toneMapping?.exposure ?? 1.0,
      gamma: data.toneMapping?.gamma ?? 2.2,
    }

    // Optional color grading via 3D LUT
    this.colorLUT = {
      enabled: data.colorLUT?.enabled ?? false,
      url: data.colorLUT?.url ?? null,
      intensity: data.colorLUT?.intensity ?? 1,
    }

    // Hue/Saturation adjustment
    this.hueSaturation = {
      enabled: data.hueSaturation?.enabled ?? false,
      hue: data.hueSaturation?.hue ?? 0,
      saturation: data.hueSaturation?.saturation ?? 0,
    }

    // Brightness/Contrast adjustment
    this.brightnessContrast = {
      enabled: data.brightnessContrast?.enabled ?? false,
      brightness: data.brightnessContrast?.brightness ?? 0,
      contrast: data.brightnessContrast?.contrast ?? 0,
    }

    // Lens distortion
    this.lensDistortion = {
      enabled: data.lensDistortion?.enabled ?? false,
      distortion: data.lensDistortion?.distortion ?? 0,
      cubicDistortion: data.lensDistortion?.cubicDistortion ?? 0,
      offset: data.lensDistortion?.offset ?? [0, 0],
    }

    // God rays (requires a named target object in the scene)
    this.godRays = {
      enabled: data.godRays?.enabled ?? false,
      targetName: data.godRays?.targetName ?? null,
      density: data.godRays?.density ?? 0.96,
      decay: data.godRays?.decay ?? 0.95,
      weight: data.godRays?.weight ?? 0.9,
      exposure: data.godRays?.exposure ?? 0.6,
      samples: data.godRays?.samples ?? 60,
      clampMax: data.godRays?.clampMax ?? 1.0,
    }

    // Camera will be created in mount()
    this.camera = null

    // Initialize postprocessing pipeline (will be set up when activated)
    this.composer = null
    this.effects = {}
    this.autofocusTarget = new THREE.Vector3()
    this._disposed = false
  }

  /**
   * Called when node is added to the scene
   */
  mount() {
    console.log('[Camera] Mounting camera node:', this.name)

    // Create THREE.js camera with full settings
    this.camera = new THREE.PerspectiveCamera(this.fov, this.aspect, this.near, this.far)

    // Apply additional camera settings
    this.camera.zoom = this.zoom
    this.camera.focus = this.focus
    this.camera.filmGauge = this.filmGauge
    this.camera.filmOffset = this.filmOffset
    this.camera.updateProjectionMatrix()

    // Ensure camera can see all layers (including helpers)
    this.camera.layers.enableAll()

    // Update aspect ratio from graphics
    if (this.ctx?.world?.graphics?.aspect) {
      this.aspect = this.ctx.world.graphics.aspect
      this.camera.aspect = this.aspect
      this.camera.updateProjectionMatrix()
    }

    // If this is a player camera, attach to rig like legacy camera
    if (this.attachToRig && this.ctx?.world?.rig) {
      // Add camera to rig - it will move with the rig automatically
      this.ctx.world.rig.add(this.camera)
      // Set local position relative to rig (for third person offset)
      this.camera.position.set(this.position[0] || 0, this.position[1] || 0, this.position[2] || 0)
      if (this.isPlayerCamera) {
        // Player camera should be at rig center with only Z offset for zoom
        this.camera.position.set(0, 0, this.position[2] || 1.5)
      }
    } else {
      // Non-rig cameras: Check if we should attach to app/entity
      // First set position from data
      this.camera.position.set(this.position.x, this.position.y, this.position.z)

      // Store base position for motion offsets
      this.motionState.basePosition.copy(this.camera.position)

      // Handle rotation if provided in data
      if (this.data?.rotation) {
        const rot = this.data.rotation
        this.camera.rotation.set(rot[0], rot[1], rot[2], 'YXZ')
        // Initialize flyState euler from THREE.js camera rotation for free-flying cameras
        if (this.freeFlying) {
          this.flyState.euler.setFromQuaternion(this.camera.quaternion, 'YXZ')
        }
      } else {
        this.camera.quaternion.copy(this.quaternion)
        // Initialize flyState euler from THREE.js camera rotation for free-flying cameras
        if (this.freeFlying) {
          this.flyState.euler.setFromQuaternion(this.camera.quaternion, 'YXZ')
        }
      }

      // Store base rotation for motion offsets
      this.motionState.baseRotation.copy(this.camera.rotation)

      this.camera.scale.copy(this.scale)

      // CRITICAL: Free-flying cameras MUST be added directly to the scene (no parent)
      // because they handle movement in world space
      if (this.freeFlying) {
        // Always add free-flying cameras directly to the scene
        if (this.ctx?.world?.stage?.scene) {
          this.ctx.world.stage.scene.add(this.camera)
          console.log('[Camera] Free-flying camera added directly to world scene')
        }
      } else {
        // Non-free-flying cameras can be attached to app/entity
        // This makes the camera move with the app/GLB
        if (this.ctx?.entity?.object3D) {
          // Attach to the entity's object3D (app root)
          this.ctx.entity.object3D.add(this.camera)
          console.log('[Camera] Attached to app entity:', this.ctx.entity.name)
        } else if (this.ctx?.world?.stage?.scene) {
          // Fallback: Add to scene for standalone cameras
          this.ctx.world.stage.scene.add(this.camera)
          console.log('[Camera] Added to world scene')
        }
      }
    }

    // Create camera helper for visualization (if not the main player camera)
    if (!this.isPlayerCamera && this.data?.showHelper) {
      this.cameraHelper = new THREE.CameraHelper(this.camera)
      this.cameraHelper.visible = true
      this.cameraHelper.frustumCulled = false
      // Visually reduce helper size so frustum isn't overwhelming
      const helperScale = this.data?.helperScale ?? 0.3
      this.cameraHelper.scale.setScalar(helperScale)
      // Set the helper to render on all layers so it's visible from any camera
      this.cameraHelper.layers.enableAll()
      // Make sure the helper renders on top for visibility
      this.cameraHelper.material.depthTest = false
      this.cameraHelper.material.depthWrite = false
      this.cameraHelper.material.transparent = true
      this.cameraHelper.renderOrder = 0 // Normal render order
      // Update the helper's line material
      if (this.cameraHelper.material) {
        this.cameraHelper.material.color = new THREE.Color(0xffffff)
        this.cameraHelper.material.linewidth = 1
      }
      // Always add to the main scene so it's visible from all cameras
      if (this.ctx?.world?.stage?.scene) {
        this.ctx.world.stage.scene.add(this.cameraHelper)
        console.log('[Camera] Added camera helper to scene for camera:', this.name)
      } else {
        console.warn('[Camera] No scene available to add camera helper')
      }
    }

    // Register with camera manager
    if (this.ctx?.world?.cameraManager) {
      console.log('[Camera] Registering with camera manager')
      this.ctx.world.cameraManager.registerCamera(this)
    } else {
      console.warn('[Camera] No camera manager found in world')
    }

    // Initialize feed target if enabled
    if (this.feed.enabled) {
      this.ensureFeedTarget()
    }

    // Listen for global prefs changes to update helper visibility
    if (this.ctx?.world?.prefs) {
      this.onPrefsChange = changes => {
        if (changes.showHelpers) {
          // Update helper visibility immediately
          if (this.cameraHelper) {
            const globalShow = this.ctx.world.prefs.showHelpers
            const localShow = this.data?.showHelper !== false
            this.cameraHelper.visible = localShow && globalShow !== false
          }
        }
      }
      this.ctx.world.prefs.on('change', this.onPrefsChange)
    }

    // If marked as active, only auto-activate render camera when appropriate
    // - Player camera should auto-activate
    // - Non-player cameras only auto-activate if explicitly requested via data.autoActivate
    if (this._active && (this.isPlayerCamera || this.data?.autoActivate === true)) {
      console.log('[Camera] Camera marked as active, activating...')
      // Ensure registration before activation
      if (this.ctx?.world?.cameraManager && !this.ctx.world.cameraManager.cameras.has(this.id)) {
        this.ctx.world.cameraManager.registerCamera(this)
      }
      this.ctx?.world?.cameraManager?.setActiveCamera?.(this)
    }
  }

  /**
   * Called when node is removed from the scene
   */
  unmount() {
    console.log('[Camera] Unmounting camera node:', this.name)

    // Mark as disposed to prevent further updates
    this._disposed = true

    // If this camera is active, deactivate it first
    if (this._active) {
      this.makeInactive()

      // If camera manager exists and this was the active camera,
      // it should switch to default or another camera
      if (this.ctx?.world?.cameraManager?.activeCamera === this) {
        console.log('[Camera] Active camera being removed, camera manager will switch to default')
      }
    }

    // Remove camera from rig or scene
    if (this.attachToRig && this.camera && this.camera.parent === this.ctx?.world?.rig) {
      console.log(`[Camera] Removing camera ${this.name} from rig`)
      this.ctx.world.rig.remove(this.camera)
    } else if (this.camera && this.camera.parent) {
      // Remove from scene if it was added there
      this.camera.parent.remove(this.camera)
    }

    // Remove camera helper if it exists
    if (this.cameraHelper) {
      if (this.cameraHelper.parent) {
        this.cameraHelper.parent.remove(this.cameraHelper)
      }
      this.cameraHelper.dispose()
      this.cameraHelper = null
    }

    // Unsubscribe prefs listener
    if (this.onPrefsChange && this.ctx?.world?.prefs) {
      this.ctx.world.prefs.off('change', this.onPrefsChange)
      this.onPrefsChange = null
    }

    // Unregister from camera manager
    if (this.ctx?.world?.cameraManager) {
      this.ctx.world.cameraManager.unregisterCamera(this)
    }

    // Clean up postprocessing
    if (this.composer) {
      this.composer.dispose()
      this.composer = null
    }

    // Clean up effects
    for (const effect of Object.values(this.effects)) {
      if (effect && effect.dispose) {
        effect.dispose()
      }
    }
    this.effects = {}

    // Clean up THREE.js camera
    if (this.camera) {
      // Only remove from parent if it hasn't already been removed
      if (this.camera.parent && !this.attachToRig) {
        // Only remove non-rig-attached cameras from their parents
        this.camera.parent.remove(this.camera)
      }
      // Note: Rig-attached cameras were already removed above
      this.camera = null
    }

    console.log('[Camera] Camera cleanup complete')
  }

  /**
   * Make this camera the active camera
   */
  makeActive() {
    this._active = true

    // Capture controls if this is a free-flying camera
    if (this.freeFlying && !this.controlsCaptured) {
      this.captureControls()

      // CRITICAL: Set camera.write = true to take manual control (like legacy freecam)
      // This tells ClientControls to copy OUR camera position to the rig, not vice versa
      console.log('[Camera] control:', !!this.control, 'control.camera:', !!this.control?.camera)
      if (this.control && this.control.camera) {
        this.control.camera.write = true
        console.log('[Camera] ✓ Set control.camera.write = true for free-flying control')
      } else {
        console.warn('[Camera] ⚠️ Cannot set camera.write - control or control.camera missing!')
      }
    }

    // Create spectator capsule if requested
    if (this.freeFlying && this.freeBody === 'capsule' && !this._freeActor && this.ctx?.world?.physics) {
      try {
        const radius = this.freeBodyRadius
        const halfHeight = (this.freeBodyHeight - radius - radius) / 2
        const geometry = new PHYSX.PxCapsuleGeometry(radius, Math.max(0, halfHeight))
        const material = this.ctx.world.physics.physics.createMaterial(0, 0, 0)
        const shapeFlags = new PHYSX.PxShapeFlags()
        if (this.freeCollideLayers) {
          shapeFlags.raise(PHYSX.PxShapeFlagEnum.eSCENE_QUERY_SHAPE | PHYSX.PxShapeFlagEnum.eSIMULATION_SHAPE)
        } else {
          // no collisions: no sim, no scene query
        }
        const shape = this.ctx.world.physics.physics.createShape(geometry, material, true, shapeFlags)
        if (this.freeCollideLayers) {
          const layer = this.freeCollideLayers
          const pairFlags = PHYSX.PxPairFlagEnum.eNOTIFY_TOUCH_FOUND | PHYSX.PxPairFlagEnum.eNOTIFY_TOUCH_LOST
          const filterData = new PHYSX.PxFilterData(layer.group, layer.mask, pairFlags, 0)
          shape.setQueryFilterData(filterData)
          shape.setSimulationFilterData(filterData)
        }
        // Align capsule upright and offset so base sits at 0
        const localPose = new PHYSX.PxTransform(PHYSX.PxIDENTITYEnum.PxIdentity)
        const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)
        rot.toPxTransform?.(localPose)
        const offset = new THREE.Vector3(0, halfHeight + radius, 0)
        offset.toPxTransform?.(localPose)
        shape.setLocalPose(localPose)

        const transform = new PHYSX.PxTransform(PHYSX.PxIDENTITYEnum.PxIdentity)
        const start = this.camera?.position || new THREE.Vector3()
        start.toPxTransform(transform)
        const actor = this.ctx.world.physics.physics.createRigidDynamic(transform)
        actor.setMass?.(1)
        actor.setRigidDynamicLockFlag(PHYSX.PxRigidDynamicLockFlagEnum.eLOCK_ANGULAR_X, true)
        actor.setRigidDynamicLockFlag(PHYSX.PxRigidDynamicLockFlagEnum.eLOCK_ANGULAR_Y, true)
        actor.setRigidDynamicLockFlag(PHYSX.PxRigidDynamicLockFlagEnum.eLOCK_ANGULAR_Z, true)
        actor.setActorFlag(PHYSX.PxActorFlagEnum.eDISABLE_GRAVITY, !this.freeUseGravity)
        actor.attachShape(shape)
        this._freeActor = this.ctx.world.physics.addActor(actor, { node: this })
      } catch (e) {
        console.warn('[Camera] Failed to create spectator capsule:', e)
      }
    }

    // Set up postprocessing if not already done
    if (!this.composer && this.ctx?.world?.graphics) {
      try {
        this.setupPostprocessing()
      } catch (error) {
        console.error('[Camera] Failed to setup postprocessing:', error.message)
        // Continue without postprocessing rather than breaking
      }
    }
  }

  /**
   * Make this camera inactive
   */
  makeInactive() {
    this._active = false

    // Release controls when camera becomes inactive
    if (this.freeFlying && this.controlsCaptured) {
      // Release camera.write flag to return control to normal system
      if (this.control && this.control.camera) {
        this.control.camera.write = false
        console.log('[Camera] Set control.camera.write = false (returning control)')
      }

      this.releaseControls()
    }

    // Destroy spectator capsule if exists
    if (this._freeActor) {
      try { this._freeActor.destroy() } catch (e) { }
      this._freeActor = null
    }
  }

  /**
   * Capture controls for free-flying camera
   */
  captureControls() {
    if (!this.freeFlying) {
      console.log(`[Camera] captureControls called but freeFlying is false for: ${this.name}`)
      return
    }

    if (!this.ctx?.world?.controls) {
      console.warn(`[Camera] Cannot capture controls - no world.controls available for: ${this.name}`)
      return
    }

    // CRITICAL: Use priority -1 to be HIGHER priority than player (0)
    // Lower number = higher priority in the control system!
    const control = this.ctx.world.controls.bind({ priority: 10000 })

    if (!control) {
      console.warn(`[Camera] Failed to bind controls for: ${this.name}`)
      return
    }

    console.log('[FREE] Bound controls with priority -1. Keys:', {
      W: !!control.keyW,
      A: !!control.keyA,
      S: !!control.keyS,
      D: !!control.keyD,
    })

    // Capture movement keys
    if (control.keyW) control.keyW.capture = true
    if (control.keyA) control.keyA.capture = true
    if (control.keyS) control.keyS.capture = true
    if (control.keyD) control.keyD.capture = true
    if (control.keyQ) control.keyQ.capture = true
    if (control.keyE) control.keyE.capture = true
    if (control.space) control.space.capture = true
    if (control.shiftLeft) control.shiftLeft.capture = true
    if (control.shiftRight) control.shiftRight.capture = true

    // Capture scroll to prevent zoom changes
    if (control.scrollDelta) control.scrollDelta.capture = true

    // Capture escape to return to player camera
    if (control.escape) control.escape.capture = true

    this.control = control
    this.controlsCaptured = true

    console.log(`[Camera] ✅ Captured controls for free-flying camera: ${this.name}`)
    console.log(`[Camera] Control keys available:`, {
      W: !!control.keyW,
      A: !!control.keyA,
      S: !!control.keyS,
      D: !!control.keyD,
      Q: !!control.keyQ,
      E: !!control.keyE,
      Space: !!control.space,
      Shift: !!control.shiftLeft,
      Scroll: !!control.scrollDelta,
      Escape: !!control.escape,
    })
  }

  /**
   * Release controls for free-flying camera
   */
  releaseControls() {
    if (!this.control) return

    // Release movement keys
    if (this.control.keyW) this.control.keyW.capture = false
    if (this.control.keyA) this.control.keyA.capture = false
    if (this.control.keyS) this.control.keyS.capture = false
    if (this.control.keyD) this.control.keyD.capture = false
    if (this.control.keyQ) this.control.keyQ.capture = false
    if (this.control.keyE) this.control.keyE.capture = false
    if (this.control.space) this.control.space.capture = false
    if (this.control.shiftLeft) this.control.shiftLeft.capture = false
    if (this.control.shiftRight) this.control.shiftRight.capture = false

    // Release scroll
    if (this.control.scrollDelta) this.control.scrollDelta.capture = false

    // Release escape
    if (this.control.escape) this.control.escape.capture = false

    this.control = null
    this.controlsCaptured = false

    console.log(`[Camera] Released controls for camera: ${this.name}`)
  }

  /**
   * Update camera aspect ratio
   */
  setAspect(aspect) {
    this.aspect = aspect
    if (this.camera) {
      this.camera.aspect = aspect
      this.camera.updateProjectionMatrix()
    }
  }

  /**
   * Update field of view
   */
  setFOV(fov) {
    this.fov = fov
    if (this.camera) {
      this.camera.fov = fov
      this.camera.updateProjectionMatrix()
    }
  }

  /**
   * Update near/far planes
   */
  setClippingPlanes(near, far) {
    this.near = near || this.near
    this.far = far || this.far
    if (this.camera) {
      this.camera.near = this.near
      this.camera.far = this.far
      this.camera.updateProjectionMatrix()
    }
  }

  /**
   * Set focal length (affects FOV)
   */
  setFocalLength(focalLength) {
    if (this.camera) {
      this.camera.setFocalLength(focalLength)
      this.fov = this.camera.fov
    }
    this.dof.focalLength = focalLength
  }

  /**
   * Get focal length from current FOV
   */
  getFocalLength() {
    return this.camera ? this.camera.getFocalLength() : 35
  }

  /**
   * Set up postprocessing pipeline for this camera
   */
  setupPostprocessing() {
    if (!this.ctx?.world?.graphics?.renderer) return

    const renderer = this.ctx.world.graphics.renderer
    const scene = this.ctx?.world?.stage?.scene
    if (!scene) return

    // Create composer for this camera
    this.composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: false,
    })

    // Add render pass
    const renderPass = new RenderPass(scene, this.camera)
    this.composer.addPass(renderPass)

    // Create effects based on settings
    const enabledEffects = []

    // Color grading via 3D LUT: loader not bundled by default. If you have
    // a pre-created LUT texture, plug it in via a plugin. We skip URL loading here.
    if (this.colorLUT.enabled && this.colorLUT.url && typeof LUT3DEffect !== 'undefined') {
      console.warn('[Camera] LUT URL loading not supported in core build. Provide LUT via plugin or disable colorLUT.')
    }

    // Hue/Saturation
    if (this.hueSaturation.enabled && typeof HueSaturationEffect !== 'undefined') {
      try {
        this.effects.hueSat = new HueSaturationEffect({
          hue: this.hueSaturation.hue,
          saturation: this.hueSaturation.saturation,
        })
        enabledEffects.push(this.effects.hueSat)
      } catch (e) {
        console.warn('[Camera] HueSaturation effect unavailable:', e?.message)
      }
    }

    // Brightness/Contrast
    if (this.brightnessContrast.enabled && typeof BrightnessContrastEffect !== 'undefined') {
      try {
        this.effects.bc = new BrightnessContrastEffect({
          brightness: this.brightnessContrast.brightness,
          contrast: this.brightnessContrast.contrast,
        })
        enabledEffects.push(this.effects.bc)
      } catch (e) {
        console.warn('[Camera] BrightnessContrast effect unavailable:', e?.message)
      }
    }

    // Lens distortion
    if (this.lensDistortion.enabled && typeof LensDistortionEffect !== 'undefined') {
      try {
        const off = this.lensDistortion.offset
        this.effects.lens = new LensDistortionEffect({
          distortion: this.lensDistortion.distortion,
          cubicDistortion: this.lensDistortion.cubicDistortion,
          principalPoint: new THREE.Vector2(off[0] || 0, off[1] || 0),
        })
        enabledEffects.push(this.effects.lens)
      } catch (e) {
        console.warn('[Camera] LensDistortion effect unavailable:', e?.message)
      }
    }

    // Depth of Field with cinematic settings
    if (this.dof.enabled) {
      this.effects.dof = new DepthOfFieldEffect(this.camera, {
        blendFunction: BlendFunction.NORMAL,
        focusDistance: this.dof.focusDistance / this.far, // Normalize to 0-1
        focalLength: this.dof.focalLength * 0.001, // Convert mm to Three.js units
        bokehScale: this.dof.maxBlur * 100, // Scale for visibility
        height: 480, // Resolution for DOF
      })

      // Configure DOF effect
      const uniforms = this.effects.dof.circleOfConfusionMaterial.uniforms
      if (uniforms.fStop) uniforms.fStop.value = this.dof.fStop

      enabledEffects.push(this.effects.dof)
    }

    // Bloom
    if (this.bloom.enabled) {
      this.effects.bloom = new BloomEffect({
        blendFunction: BlendFunction.ADD,
        mipmapBlur: this.bloom.mipmapBlur,
        luminanceThreshold: this.bloom.luminanceThreshold,
        luminanceSmoothing: this.bloom.luminanceSmoothing,
        intensity: this.bloom.intensity,
        radius: this.bloom.radius,
        kernelSize: KernelSize.LARGE,
      })
      enabledEffects.push(this.effects.bloom)
    }

    // Chromatic Aberration
    if (this.chromaticAberration.enabled) {
      this.effects.chromaticAberration = new ChromaticAberrationEffect({
        blendFunction: BlendFunction.NORMAL,
        offset: new THREE.Vector2(...this.chromaticAberration.offset),
        radialModulation: this.chromaticAberration.radialModulation,
        modulationOffset: this.chromaticAberration.modulationOffset,
      })
      enabledEffects.push(this.effects.chromaticAberration)
    }

    // Vignette
    if (this.vignette.enabled) {
      this.effects.vignette = new VignetteEffect({
        blendFunction: BlendFunction.NORMAL,
        offset: this.vignette.offset,
        darkness: this.vignette.darkness,
      })
      enabledEffects.push(this.effects.vignette)
    }

    // Film Grain
    if (this.filmGrain.enabled) {
      this.effects.filmGrain = new NoiseEffect({
        blendFunction: BlendFunction.SCREEN,
        intensity: this.filmGrain.intensity,
      })
      enabledEffects.push(this.effects.filmGrain)
    }

    // God Rays (requires a target mesh/light in the scene)
    if (this.godRays.enabled && typeof GodRaysEffect !== 'undefined') {
      try {
        let lightSource = null
        if (this.godRays.targetName && scene) {
          lightSource = scene.getObjectByName(this.godRays.targetName)
        }
        if (lightSource) {
          this.effects.godRays = new GodRaysEffect(this.camera, lightSource, {
            density: this.godRays.density,
            decay: this.godRays.decay,
            weight: this.godRays.weight,
            exposure: this.godRays.exposure,
            samples: this.godRays.samples,
            clampMax: this.godRays.clampMax,
          })
          enabledEffects.push(this.effects.godRays)
        } else if (this.godRays.targetName) {
          console.warn('[Camera] GodRays target not found:', this.godRays.targetName)
        }
      } catch (e) {
        console.warn('[Camera] GodRays effect unavailable:', e?.message)
      }
    }

    // Tone Mapping
    if (this.toneMapping.enabled) {
      this.effects.toneMapping = new ToneMappingEffect({
        mode: this.toneMapping.mode,
        resolution: 256,
        whitePoint: 4.0,
        middleGrey: 0.6,
        minLuminance: 0.01,
        averageLuminance: 1.0,
        adaptationRate: 1.0,
      })
      enabledEffects.push(this.effects.toneMapping)
    }

    // SMAA antialiasing
    this.effects.smaa = new SMAAEffect({
      preset: SMAAPreset.HIGH,
    })
    enabledEffects.push(this.effects.smaa)

    // Separate convolution effects from regular effects
    const convolutionEffects = []
    const regularEffects = []

    for (const effect of enabledEffects) {
      // ChromaticAberration and certain other effects are convolution-based
      if (effect === this.effects.chromaticAberration || effect === this.effects.dof) {
        convolutionEffects.push(effect)
      } else {
        regularEffects.push(effect)
      }
    }

    // Add regular effects in one pass
    if (regularEffects.length > 0) {
      const effectPass = new EffectPass(this.camera, ...regularEffects)
      this.composer.addPass(effectPass)
    }

    // Add convolution effects in separate passes
    for (const effect of convolutionEffects) {
      const effectPass = new EffectPass(this.camera, effect)
      this.composer.addPass(effectPass)
    }
  }

  /**
   * Perform autofocus
   */
  performAutofocus(delta) {
    // Early exit if camera is disposed or DOF is not available
    if (this._disposed || !this.dof.autofocus || !this.effects.dof) return

    // Safety check: ensure effect hasn't been disposed
    if (!this.effects.dof.circleOfConfusionMaterial) return

    // Get center of screen target
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera)

    // Cast ray into scene
    const scene = this.ctx?.world?.stage?.scene
    if (!scene) return

    const intersects = raycaster.intersectObjects(scene.children, true)

    if (intersects.length > 0) {
      // Ultra-responsive autofocus with dramatic focus pulls
      const targetDistance = intersects[0].distance
      const speed = this.dof.autofocusSpeed * delta * 3 // Triple the speed for instant response
      const smoothness = this.dof.autofocusSmoothness

      // Use aggressive exponential smoothing for instant focus snaps
      const lerpFactor = 1 - Math.exp(-speed * (2 + smoothness))

      // Add overshoot for more dramatic focus pulls
      const overshoot = 1.05 // 5% overshoot
      const newDistance = THREE.MathUtils.lerp(this.dof.focusDistance, targetDistance * overshoot, lerpFactor)

      // Clamp back to target for final value
      this.dof.focusDistance = THREE.MathUtils.lerp(newDistance, targetDistance, 0.1)

      // Update DOF effect with ultra-aggressive focus
      if (this.effects.dof && this.effects.dof.circleOfConfusionMaterial) {
        const uniforms = this.effects.dof.circleOfConfusionMaterial.uniforms
        if (uniforms) {
          // Update focus distance
          if (uniforms.focusDistance) {
            uniforms.focusDistance.value = this.dof.focusDistance / this.far
          }

          // Also adjust f-stop dynamically for more dramatic effect
          const distanceNormalized = Math.min(targetDistance / 15, 1) // Closer range
          const dynamicFStop = this.dof.fStop * (0.5 + distanceNormalized * 0.5)
          if (uniforms.fStop) {
            uniforms.fStop.value = dynamicFStop
          }
        }

        // Update bokeh scale if supported
        if (this.effects.dof.bokehScale !== undefined) {
          const distanceNormalized = Math.min(targetDistance / 15, 1)
          const dynamicBokeh = this.dof.maxBlur * (1 + (1 - distanceNormalized) * 1.0)
          this.effects.dof.bokehScale = dynamicBokeh * 120
        }
      }
    }
  }

  /**
   * Look at a target position or node
   */
  lookAt(target) {
    if (!this.camera) return
    if (target.isVector3) {
      this.camera.lookAt(target)
    } else if (target.position) {
      this.camera.lookAt(target.position)
    } else if (Array.isArray(target)) {
      this.camera.lookAt(target[0], target[1], target[2])
    }
  }

  /**
   * Update DOF settings
   */
  setDOF(settings) {
    Object.assign(this.dof, settings)

    // Update DOF effect if it exists
    if (this.effects.dof && this.effects.dof.circleOfConfusionMaterial) {
      const uniforms = this.effects.dof.circleOfConfusionMaterial.uniforms
      if (uniforms) {
        if (uniforms.focusDistance) {
          uniforms.focusDistance.value = this.dof.focusDistance / this.far
        }
        if (uniforms.focalLength) {
          uniforms.focalLength.value = this.dof.focalLength * 0.001
        }
        if (uniforms.fStop) {
          uniforms.fStop.value = this.dof.fStop
        }
      }

      // Update bokeh effect if supported
      if (this.effects.dof.bokehScale !== undefined) {
        this.effects.dof.bokehScale = this.dof.maxBlur * 100
      }
    }
  }

  /**
   * Update bloom settings
   */
  setBloom(settings) {
    Object.assign(this.bloom, settings)

    if (this.effects.bloom) {
      this.effects.bloom.intensity = this.bloom.intensity
      this.effects.bloom.luminanceThreshold = this.bloom.luminanceThreshold
      this.effects.bloom.luminanceSmoothing = this.bloom.luminanceSmoothing
    }
  }

  /**
   * Update vignette settings
   */
  setVignette(settings) {
    Object.assign(this.vignette, settings)

    if (this.effects.vignette) {
      this.effects.vignette.uniforms.get('offset').value = this.vignette.offset
      this.effects.vignette.uniforms.get('darkness').value = this.vignette.darkness
    }
  }

  setHelperVisible(visible) {
    // Persist preference so update() doesn't immediately override
    this.data = this.data || {}
    this.data.showHelper = !!visible
    if (this.cameraHelper) this.cameraHelper.visible = !!visible
  }

  /**
   * Update chromatic aberration settings
   */
  setChromaticAberration(settings) {
    Object.assign(this.chromaticAberration, settings)

    if (this.effects.chromaticAberration) {
      this.effects.chromaticAberration.offset.set(...this.chromaticAberration.offset)
      this.effects.chromaticAberration.radialModulation = this.chromaticAberration.radialModulation
      this.effects.chromaticAberration.modulationOffset = this.chromaticAberration.modulationOffset
    }
  }

  /**
   * Update film grain settings
   */
  setFilmGrain(settings) {
    Object.assign(this.filmGrain, settings)

    if (this.effects.filmGrain) {
      this.effects.filmGrain.uniforms.get('intensity').value = this.filmGrain.intensity
    }
  }

  /**
   * Update method for autofocus and other dynamic features
   */
  update(delta) {
    // Early exit if camera is disposed
    if (this._disposed) return

    // Make sure camera is initialized
    if (!this.camera) return

    // Handle free-flying camera controls
    if (this.freeFlying && this._active && !this.attachToRig) {
      // CRITICAL: Check if position was reset since last frame
      if (this._lastFreePos) {
        const dist = this.camera.position.distanceTo(this._lastFreePos)
        if (dist > 0.01) {
          console.log('[FREE] ⚠️ POSITION WAS RESET! Distance:', dist.toFixed(3),
            'From:', this._lastFreePos.x.toFixed(2), this._lastFreePos.y.toFixed(2), this._lastFreePos.z.toFixed(2),
            'To:', this.camera.position.x.toFixed(2), this.camera.position.y.toFixed(2), this.camera.position.z.toFixed(2))
          console.log('[FREE] Parent:', this.camera.parent?.type || 'none',
            '| This.parent:', this.parent?.name || 'none',
            '| attachToRig:', this.attachToRig)
        }
      }

      this.updateFreeFlying(delta)

      // Simple debug: Log position when any movement key is held (throttled to ~10 times per second)
      const isMoving = this.control?.keyW?.down || this.control?.keyA?.down ||
        this.control?.keyS?.down || this.control?.keyD?.down ||
        this.control?.keyQ?.down || this.control?.keyE?.down ||
        this.control?.space?.down
      if (isMoving) {
        this._freeLogTimer = (this._freeLogTimer || 0) + delta
        if (this._freeLogTimer >= 0.1) {
          this._freeLogTimer = 0
          const p = this.camera.position
          const keys = []
          if (this.control.keyW?.down) keys.push('W')
          if (this.control.keyA?.down) keys.push('A')
          if (this.control.keyS?.down) keys.push('S')
          if (this.control.keyD?.down) keys.push('D')
          if (this.control.keyQ?.down) keys.push('Q')
          if (this.control.keyE?.down) keys.push('E')
          if (this.control.space?.down) keys.push('SPACE')
          console.log('[FreeCam]', keys.join('+'), '→', p.x.toFixed(3), p.y.toFixed(3), p.z.toFixed(3))
        }
      }

      // CRITICAL: Store position at END of free-flying update
      this._lastFreePos = this.camera.position.clone()

      // IMPORTANT: Return early to prevent other systems from modifying the camera
      // Free-flying cameras handle their own transform completely
      if (this.dof.autofocus) {
        this.performAutofocus(delta)
      }
      return
    }

    // If attached to rig, the rig handles position/rotation automatically
    // We only need to handle zoom for player camera
    if (this.attachToRig && this.isPlayerCamera) {
      // Update zoom like legacy camera
      const localPlayer = this.ctx?.world?.entities?.getLocalPlayer?.()
      if (localPlayer?.cam?.zoom !== undefined) {
        this.camera.position.z = localPlayer.cam.zoom
      }
    }

    // Apply organic camera motion (only if not free-flying, as it has its own movement)
    if (this.motion.enabled && this._active && !this.freeFlying) {
      this.updateCameraMotion(delta)
    }

    // Update camera helper if it exists
    if (this.cameraHelper) {
      // Make sure the helper visibility respects both local and global prefs
      const globalShow = this.ctx?.world?.prefs?.showHelpers
      const localShow = this.data?.showHelper !== false
      this.cameraHelper.visible = localShow && globalShow !== false
      this.cameraHelper.update()

      // Shrink helper frustum visually by moving vertices toward camera position
      const scale = Math.max(0.01, Math.min(1, this.data?.helperScale ?? 0.3))
      if (scale !== 1) {
        const camPos = new THREE.Vector3()
        this.camera.getWorldPosition(camPos)
        const posAttr = this.cameraHelper.geometry.getAttribute('position')
        const arr = posAttr.array
        for (let i = 0; i < arr.length; i += 3) {
          const dx = arr[i] - camPos.x
          const dy = arr[i + 1] - camPos.y
          const dz = arr[i + 2] - camPos.z
          arr[i] = camPos.x + dx * scale
          arr[i + 1] = camPos.y + dy * scale
          arr[i + 2] = camPos.z + dz * scale
        }
        posAttr.needsUpdate = true
        this.cameraHelper.geometry.computeBoundingSphere()
      }

      // Force update the helper's matrix to ensure it's in sync
      this.cameraHelper.matrixWorldNeedsUpdate = true
    }

    if (this._active && this.dof.autofocus) {
      this.performAutofocus(delta)
    }
  }

  /**
   * Update organic camera motion
   */
  updateCameraMotion(delta) {
    if (!this.camera) return

    const state = this.motionState
    const motion = this.motion

    // Update time
    state.time += delta

    // Only track player velocity for cameras that follow the player
    if (this.attachToRig) {
      const localPlayer = this.ctx?.world?.entities?.getLocalPlayer?.()
      if (localPlayer?.rig?.position) {
        // Calculate velocity from position change
        const playerVelocity = new THREE.Vector3()
        playerVelocity.subVectors(localPlayer.rig.position, state.lastPosition)
        playerVelocity.divideScalar(delta || 0.016)
        state.lastPosition.copy(localPlayer.rig.position)

        // Smooth the velocity
        state.smoothVelocity.lerp(playerVelocity, 1 - motion.dampingFactor)
        state.isMoving = state.smoothVelocity.length() > 0.1
      }
    } else {
      // Static cameras don't track player movement
      state.isMoving = false
      state.smoothVelocity.set(0, 0, 0)
    }

    // Reset offsets
    state.offsetPosition.set(0, 0, 0)
    state.offsetRotation.set(0, 0, 0)

    // Walking bob (vertical)
    if (state.isMoving) {
      const bobIntensity = Math.min(state.smoothVelocity.length() * motion.velocityInfluence, 1)
      state.offsetPosition.y += Math.sin(state.time * motion.bobSpeed * 10) * motion.bobAmount * bobIntensity

      // Side-to-side sway
      state.offsetPosition.x += Math.sin(state.time * motion.swaySpeed * 10) * motion.swayAmount * bobIntensity

      // Rotation sway
      state.offsetRotation.z = Math.sin(state.time * motion.swaySpeed * 10) * 0.002 * bobIntensity
      state.offsetRotation.x = Math.sin(state.time * motion.bobSpeed * 10) * 0.001 * bobIntensity
    }

    // Breathing motion (always active, subtle)
    state.offsetPosition.y += Math.sin(state.time * motion.breathingSpeed) * motion.breathingAmount
    state.offsetPosition.z += Math.cos(state.time * motion.breathingSpeed * 0.5) * motion.breathingAmount * 0.5

    // Handheld micro-shake
    if (motion.handheldShake > 0) {
      const shake = motion.handheldShake
      state.offsetPosition.x += (Math.random() - 0.5) * shake
      state.offsetPosition.y += (Math.random() - 0.5) * shake
      state.offsetRotation.x += (Math.random() - 0.5) * shake * 0.1
      state.offsetRotation.y += (Math.random() - 0.5) * shake * 0.1
    }

    // Apply offsets to camera with dampening
    const dampedOffset = new THREE.Vector3()
    dampedOffset.lerpVectors(
      this.camera.position,
      this.camera.position.clone().add(state.offsetPosition),
      1 - motion.dampingFactor
    )

    // Apply position offset
    if (this.attachToRig) {
      // For rig-attached cameras, modify local position
      const baseZ = this.isPlayerCamera ? this.camera.position.z || 1.5 : this.position.z
      this.camera.position.set(state.offsetPosition.x, state.offsetPosition.y, baseZ + state.offsetPosition.z)
    } else {
      // For static/app cameras, apply offsets relative to base position
      // This keeps the camera centered around its original position
      this.camera.position.copy(state.basePosition)
      this.camera.position.add(state.offsetPosition)

      // Reset rotation to base before applying offsets
      this.camera.rotation.copy(state.baseRotation)
    }

    // Apply rotation offset
    this.camera.rotation.x += state.offsetRotation.x
    this.camera.rotation.y += state.offsetRotation.y
    this.camera.rotation.z += state.offsetRotation.z
  }

  /**
   * Update free-flying camera movement and look
   */
  updateFreeFlying(delta) {
    if (!this.control) {
      // Try to capture controls if we don't have them yet
      if (!this.controlsCaptured && this.freeFlying) {
        console.log(`[Camera] updateFreeFlying: No control handle, attempting to capture for: ${this.name}`)
        this.captureControls()
      }
      return
    }

    // Only log when keys are actually pressed
    const anyKeyPressed = this.control.keyW?.down || this.control.keyA?.down || this.control.keyS?.down || this.control.keyD?.down
    if (anyKeyPressed) {
      console.log('[FREE] Key pressed:', {
        W: this.control.keyW?.down,
        A: this.control.keyA?.down,
        S: this.control.keyS?.down,
        D: this.control.keyD?.down,
      })
    }

    // Handle Escape to return to player camera
    if (this.control.escape && this.control.escape.pressed) {
      this.ctx.world.activateDefaultCamera?.()
      console.log('[Free-Flying Camera] Returned to player camera')
    }

    // Handle mouse look FIRST (only when pointer is locked)
    if (this.control.pointer && this.control.pointer.locked && this.control.pointer.delta) {
      const dx = this.control.pointer.delta.x
      const dy = this.control.pointer.delta.y

      // Apply rotation directly to flyState.euler
      this.flyState.euler.y -= dx * this.lookSensitivity
      this.flyState.euler.x -= dy * this.lookSensitivity

      // Clamp pitch to avoid gimbal lock
      this.flyState.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.flyState.euler.x))

      // Update THREE.js camera rotation from euler (camera is directly in scene, not under this node)
      this.camera.quaternion.setFromEuler(this.flyState.euler)
    }

    // Get speed multiplier (boost with shift)
    const isBoost = this.control.shiftLeft?.down || this.control.shiftRight?.down
    const speed = this.flySpeed * (isBoost ? this.flyBoostMultiplier : 1)

    // Calculate movement direction based on camera orientation
    // TRUE 6DOF: Get camera's local axes (includes pitch/yaw/roll)
    // W/S moves EXACTLY where camera points (including up/down)

    // Most efficient approach: extract axes directly from rotation matrix
    const matrix = new THREE.Matrix4().makeRotationFromEuler(this.flyState.euler)
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()
    const up = new THREE.Vector3()

    // Extract basis vectors from matrix (columns are the local axes)
    right.setFromMatrixColumn(matrix, 0)      // X axis = right
    up.setFromMatrixColumn(matrix, 1)         // Y axis = up
    forward.setFromMatrixColumn(matrix, 2).negate() // -Z axis = forward

    // Debug: Log the vectors when moving
    if (this.control.keyA?.down || this.control.keyD?.down) {
      console.log('[FREE] Strafe vectors:', {
        right: `${right.x.toFixed(3)}, ${right.y.toFixed(3)}, ${right.z.toFixed(3)}`,
        forward: `${forward.x.toFixed(3)}, ${forward.y.toFixed(3)}, ${forward.z.toFixed(3)}`,
        up: `${up.x.toFixed(3)}, ${up.y.toFixed(3)}, ${up.z.toFixed(3)}`
      })
    }

    // Calculate target velocity directly from key presses
    this.flyState.targetVelocity.set(0, 0, 0)

    // Forward/backward - moves in EXACT camera direction (TRUE 6DOF)
    if (this.control.keyW?.down) {
      console.log('[FREE] W KEY DETECTED! Moving forward with speed:', speed)
      this.flyState.targetVelocity.addScaledVector(forward, speed)
    }
    if (this.control.keyS?.down) {
      this.flyState.targetVelocity.addScaledVector(forward, -speed)
    }

    // Left/right strafing - camera's local right
    if (this.control.keyA?.down) {
      this.flyState.targetVelocity.addScaledVector(right, -speed)
    }
    if (this.control.keyD?.down) {
      this.flyState.targetVelocity.addScaledVector(right, speed)
    }

    // Vertical movement - camera's local up
    if (this.control.keyQ?.down || this.control.space?.down) {
      this.flyState.targetVelocity.addScaledVector(up, speed)
    }
    if (this.control.keyE?.down) {
      this.flyState.targetVelocity.addScaledVector(up, -speed)
    }

    // Debug: Log target velocity after all inputs
    if (anyKeyPressed) {
      const tv = this.flyState.targetVelocity
      console.log('[FREE] Target velocity:', `${tv.x.toFixed(3)}, ${tv.y.toFixed(3)}, ${tv.z.toFixed(3)}`)
    }

    // Apply smooth or instant movement
    if (this.smoothMovement) {
      // Smooth acceleration/deceleration
      this.flyState.velocity.lerp(this.flyState.targetVelocity, 10 * delta)
    } else {
      // Instant movement
      this.flyState.velocity.copy(this.flyState.targetVelocity)
    }

    if (this.freeBody === 'capsule' && this._freeActor?.actor) {
      // Drive PhysX capsule and read back pose
      const actor = this._freeActor.actor
      // Accel/drag integration
      const desired = this.flyState.targetVelocity.clone()
      const vel = this.flyState.velocity
      const accel = this.freeAccel
      const drag = this.freeDrag
      // approach desired
      vel.addScaledVector(desired.clone().sub(vel), Math.min(1, accel * delta))
      // drag
      vel.multiplyScalar(Math.max(0, 1 - drag * delta))
      // clamp
      const speed = vel.length()
      const max = this.freeMaxSpeed
      if (speed > max) vel.multiplyScalar(max / speed)
      // apply as velocity
      const v = vel.toPxVec3?.() || vel // bridge util available on Vector3 extension
      actor.setLinearVelocity(v)

      // Debug: Log actual velocity sent to PhysX when any key is pressed
      if (anyKeyPressed) {
        console.log('[FREE] PhysX velocity:', `${vel.x.toFixed(3)}, ${vel.y.toFixed(3)}, ${vel.z.toFixed(3)}`)
      }

      // read pose back
      const pose = actor.getGlobalPose()
      this.camera.position.copy(pose.p)

      // CRITICAL: Also update control.camera so ClientControls can copy it to the rig
      if (this.control?.camera) {
        this.control.camera.position.copy(this.camera.position)
        this.control.camera.quaternion.copy(this.camera.quaternion)
      }
    } else {
      // Noclip: directly move camera
      const oldPos = this.camera.position.clone()
      this.camera.position.addScaledVector(this.flyState.velocity, delta)
      const newPos = this.camera.position.clone()

      // CRITICAL: Also update control.camera so ClientControls can copy it to the rig
      if (this.control?.camera) {
        this.control.camera.position.copy(this.camera.position)
        this.control.camera.quaternion.copy(this.camera.quaternion)
      }

      if (this.control.keyW?.down) {
        console.log('[FREE] Position update:', {
          old: `${oldPos.x.toFixed(2)},${oldPos.y.toFixed(2)},${oldPos.z.toFixed(2)}`,
          new: `${newPos.x.toFixed(2)},${newPos.y.toFixed(2)},${newPos.z.toFixed(2)}`,
          velocity: `${this.flyState.velocity.x.toFixed(2)},${this.flyState.velocity.y.toFixed(2)},${this.flyState.velocity.z.toFixed(2)}`,
          delta: delta.toFixed(3)
        })
      }
    }

    // Detailed debug (orientation and velocity)
    if (this._debugFreeLogInterval > 0) {
      const pitch = this.flyState.euler.x * 180 / Math.PI
      const yaw = this.flyState.euler.y * 180 / Math.PI
      const v = this.flyState.velocity
      const tv = this.flyState.targetVelocity
      console.log('[FreeCam 6DOF]',
        'pitch', pitch.toFixed(1),
        'yaw', yaw.toFixed(1),
        '| fwd', `[${forward.x.toFixed(2)},${forward.y.toFixed(2)},${forward.z.toFixed(2)}]`,
        '| tgtVel', `[${tv.x.toFixed(2)},${tv.y.toFixed(2)},${tv.z.toFixed(2)}]`,
        '| vel', `[${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}]`,
        '| W?', this.control.keyW?.down ? 'Y' : 'N')
    }
  }

  /**
   * Set camera zoom (for player camera mode)
   */
  setZoom(zoom) {
    if (this.isPlayerCamera && this.camera) {
      this.camera.position.z = zoom
    }
  }

  /**
   * Get camera settings for serialization
   */
  toJSON() {
    return {
      ...super.toJSON(),
      fov: this.fov,
      aspect: this.aspect,
      near: this.near,
      far: this.far,
      zoom: this.zoom,
      focus: this.focus,
      filmGauge: this.filmGauge,
      filmOffset: this.filmOffset,
      active: this._active,
      priority: this.priority,
      dof: { ...this.dof },
      bloom: { ...this.bloom },
      vignette: { ...this.vignette },
      chromaticAberration: { ...this.chromaticAberration },
      filmGrain: { ...this.filmGrain },
      toneMapping: { ...this.toneMapping },
    }
  }

  /**
   * Update from JSON data
   */
  fromJSON(data) {
    super.fromJSON(data)
    if (data.fov !== undefined) this.setFOV(data.fov)
    if (data.near !== undefined || data.far !== undefined) {
      this.setClippingPlanes(data.near, data.far)
    }
    if (data.active !== undefined) this._active = data.active
    if (data.priority !== undefined) this.priority = data.priority
    if (data.dof) this.setDOF(data.dof)
    return this
  }

  /**
   * Copy from another camera
   */
  copy(source, recursive) {
    super.copy(source, recursive)

    this.fov = source.fov
    this.near = source.near
    this.far = source.far
    this.aspect = source.aspect
    this._active = source._active
    this.priority = source.priority
    this.dof = { ...source.dof }

    if (this.camera && source.camera) {
      this.camera.fov = source.camera.fov
      this.camera.near = source.camera.near
      this.camera.far = source.camera.far
      this.camera.aspect = source.camera.aspect
      this.camera.updateProjectionMatrix()
    }

    return this
  }

  /**
   * Clean up when removed
   */
  destroy() {
    // Mark as disposed to prevent further updates
    this._disposed = true

    // Unregister from camera manager
    if (this.ctx?.world?.cameraManager) {
      this.ctx.world.cameraManager.unregisterCamera(this)
    }

    // Clean up postprocessing
    if (this.composer) {
      this.composer.dispose()
      this.composer = null
    }

    // Clean up effects
    for (const effect of Object.values(this.effects)) {
      if (effect.dispose) effect.dispose()
    }
    this.effects = {}

    // Clean up THREE.js camera
    if (this.camera) {
      this.remove(this.camera)
      this.camera = null
    }

    // Dispose feed resources
    if (this.feedRenderTarget) {
      this.feedRenderTarget.dispose()
      this.feedRenderTarget = null
      this.feedTexture = null
    }

    super.destroy()
  }

  /**
   * Get proxy object for app access
   */
  getProxy() {
    if (!this.proxy) {
      const self = this
      let proxy = {
        get fov() {
          return self.fov
        },
        set fov(v) {
          self.setFOV(v)
        },

        get near() {
          return self.near
        },
        get far() {
          return self.far
        },
        setClippingPlanes: (near, far) => self.setClippingPlanes(near, far),

        get focalLength() {
          return self.getFocalLength()
        },
        set focalLength(v) {
          self.setFocalLength(v)
        },

        get active() {
          return self._active
        },
        set active(v) {
          const next = !!v
          if (next) {
            self.makeActive()
            self.ctx?.world?.cameraManager?.setActiveCamera?.(self)
          } else {
            self.makeInactive()
          }
        },
        activate: () => {
          self.makeActive()
          self.ctx?.world?.cameraManager?.setActiveCamera?.(self)
        },
        deactivate: () => self.makeInactive(),

        lookAt: target => self.lookAt(target),

        // Effect controls
        get dof() {
          return { ...self.dof }
        },
        setDOF: settings => self.setDOF(settings),

        // Motion controls
        get motion() {
          return { ...self.motion }
        },
        setMotion: settings => self.setMotion(settings),
        setMotionEnabled: enabled => self.setMotionEnabled(enabled),

        get bloom() {
          return { ...self.bloom }
        },
        setBloom: settings => self.setBloom(settings),

        get vignette() {
          return { ...self.vignette }
        },
        setVignette: settings => self.setVignette(settings),

        get filmGrain() {
          return { ...self.filmGrain }
        },
        setFilmGrain: settings => self.setFilmGrain(settings),

        get chromaticAberration() {
          return { ...self.chromaticAberration }
        },
        setChromaticAberration: settings => self.setChromaticAberration(settings),

        // Feed (video window) controls
        get feed() {
          return { ...self.feed }
        },
        setFeed: settings => self.setFeed(settings),
        setFeedEnabled: enabled => self.setFeedEnabled(enabled),
        setFeedSize: (width, height) => self.setFeedSize(width, height),
        getFeedTexture: () => self.getFeedTexture(),

        // Helper visibility
        setHelperVisible: visible => self.setHelperVisible(!!visible),

        // Free-flying controls
        get freeFlying() {
          return self.freeFlying
        },
        set freeFlying(v) {
          self.freeFlying = !!v
        },
        get flySpeed() {
          return self.flySpeed
        },
        set flySpeed(v) {
          self.flySpeed = v
        },
        get lookSensitivity() {
          return self.lookSensitivity
        },
        set lookSensitivity(v) {
          self.lookSensitivity = v
        },
        captureControls: () => self.captureControls(),
        releaseControls: () => self.releaseControls(),
      }

      // Inherit Node properties
      proxy = Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(super.getProxy()))
      this.proxy = proxy
    }
    return this.proxy
  }

  /**
   * Update motion settings
   */
  setMotion(settings) {
    if (!settings || typeof settings !== 'object') return
    Object.assign(this.motion, settings)
  }

  setMotionEnabled(enabled) {
    this.motion.enabled = !!enabled
  }

  /**
   * Ensure the feed render target exists and matches size
   */
  ensureFeedTarget() {
    if (!this.ctx?.world?.graphics?.renderer) return
    const w = Math.max(1, Math.floor(this.feed.width || 1))
    const h = Math.max(1, Math.floor(this.feed.height || 1))
    const needsCreate =
      !this.feedRenderTarget || this.feedRenderTarget.width !== w || this.feedRenderTarget.height !== h
    if (needsCreate) {
      if (this.feedRenderTarget) this.feedRenderTarget.dispose()
      this.feedRenderTarget = new THREE.WebGLRenderTarget(w, h, {
        depthBuffer: true,
        stencilBuffer: false,
      })
      this.feedRenderTarget.texture.colorSpace = THREE.SRGBColorSpace
      this.feedTexture = this.feedRenderTarget.texture
    }
  }

  /**
   * Update the feed texture (renders scene from this camera to RT)
   */
  updateFeed(delta) {
    if (!this.feed.enabled) return
    if (!this.camera) return
    const renderer = this.ctx?.world?.graphics?.renderer
    const scene = this.ctx?.world?.stage?.scene
    if (!renderer || !scene) return
    this.ensureFeedTarget()
    if (!this.feedRenderTarget) return
    const prevTarget = renderer.getRenderTarget()
    const prevAutoClear = renderer.autoClear
    // Render
    renderer.setRenderTarget(this.feedRenderTarget)
    renderer.autoClear = true
    renderer.clear()
    renderer.render(scene, this.camera)
    // Restore
    renderer.setRenderTarget(prevTarget)
    renderer.autoClear = prevAutoClear
  }

  setFeedEnabled(enabled) {
    const next = !!enabled
    if (this.feed.enabled === next) return
    this.feed.enabled = next
    if (next) this.ensureFeedTarget()
  }

  setFeedSize(width, height) {
    if (typeof width === 'number') this.feed.width = width
    if (typeof height === 'number') this.feed.height = height
    if (this.feed.enabled) this.ensureFeedTarget()
  }

  setFeed(settings = {}) {
    if (!settings || typeof settings !== 'object') return
    if (settings.enabled !== undefined) this.setFeedEnabled(!!settings.enabled)
    if (settings.width !== undefined || settings.height !== undefined) {
      this.setFeedSize(settings.width ?? this.feed.width, settings.height ?? this.feed.height)
    }
  }

  getFeedTexture() {
    return this.feedTexture || this.feedRenderTarget?.texture || null
  }
}
