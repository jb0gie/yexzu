import * as THREE from '../extras/three'
import { Node } from './Node'
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
  GodRaysEffect
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
    this.data = data  // Store the data for later use
    
    // Full THREE.js PerspectiveCamera settings
    this.fov = data.fov ?? 35  // Default to cinematic 35mm equivalent
    this.aspect = data.aspect || 1  // Will be updated when added to world
    this.near = data.near ?? 0.1
    this.far = data.far ?? 2000
    this.zoom = data.zoom ?? 1
    this.focus = data.focus ?? 10  // Object distance for focus
    this.filmGauge = data.filmGauge ?? 35  // Film size (mm)
    this.filmOffset = data.filmOffset ?? 0  // Film offset
    
    // Camera state
    this._active = data.active ?? false  // Don't default to true, explicit activation only
    this.priority = data.priority || 0
    this.attachToRig = data.attachToRig ?? false  // Default to NOT attaching to rig (world space)
    this.isPlayerCamera = data.isPlayerCamera ?? false  // Whether this is the main player camera
    
    // Camera motion settings - organic movement
    this.motion = {
      enabled: data.motion?.enabled ?? true,
      bobAmount: data.motion?.bobAmount ?? 0.05,  // How much the camera bobs
      bobSpeed: data.motion?.bobSpeed ?? 0.15,  // Speed of bobbing
      swayAmount: data.motion?.swayAmount ?? 0.02,  // Side-to-side sway
      swaySpeed: data.motion?.swaySpeed ?? 0.1,  // Speed of swaying
      dampingFactor: data.motion?.dampingFactor ?? 0.85,  // Smooth dampening (0-1)
      breathingAmount: data.motion?.breathingAmount ?? 0.01,  // Subtle breathing motion
      breathingSpeed: data.motion?.breathingSpeed ?? 0.3,  // Slow breathing rhythm
      handheldShake: data.motion?.handheldShake ?? 0.001,  // Micro shake like handheld
      velocityInfluence: data.motion?.velocityInfluence ?? 0.3  // How much movement affects camera
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
      basePosition: new THREE.Vector3(),  // Store original position for static cameras
      baseRotation: new THREE.Euler()  // Store original rotation
    }
    
    // Ultra-cinematic DOF settings for dramatic bokeh
    this.dof = {
      enabled: data.dof?.enabled ?? true,
      focusDistance: data.dof?.focusDistance ?? 10,
      focalLength: data.dof?.focalLength ?? 35,
      fStop: data.dof?.fStop ?? 0.5,  // Ultra shallow DOF (professional cinema lens)
      maxBlur: data.dof?.maxBlur ?? 0.08,  // Maximum bokeh blur
      luminanceThreshold: data.dof?.luminanceThreshold ?? 0.2,  // Even lower threshold
      luminanceGain: data.dof?.luminanceGain ?? 5,  // Strong gain for bright bokeh
      bias: data.dof?.bias ?? 0.05,  // Very sharp focus transition
      fringe: data.dof?.fringe ?? 1.5,  // Strong chromatic aberration
      dithering: data.dof?.dithering ?? 0.0001,
      pentagon: data.dof?.pentagon ?? true,
      shapeBlur: data.dof?.shapeBlur ?? 2.0,  // Maximum bokeh shape
      autofocus: data.dof?.autofocus ?? false,  // Default OFF to avoid unexpected focus shifts
      autofocusSpeed: data.dof?.autofocusSpeed ?? 8,  // Very fast focus pulls
      autofocusSmoothness: data.dof?.autofocusSmoothness ?? 0.08  // Ultra snappy focus
    }
    
    // Enhanced bloom for cinematic glow
    this.bloom = {
      enabled: data.bloom?.enabled ?? true,
      intensity: data.bloom?.intensity ?? 0.8,  // Stronger bloom
      luminanceThreshold: data.bloom?.luminanceThreshold ?? 0.7,  // Lower threshold
      luminanceSmoothing: data.bloom?.luminanceSmoothing ?? 0.4,  // Smoother
      radius: data.bloom?.radius ?? 1.0,  // Larger radius
      mipmapBlur: data.bloom?.mipmapBlur ?? true
    }
    
    // Vignette settings
    this.vignette = {
      enabled: data.vignette?.enabled ?? true,
      offset: data.vignette?.offset ?? 0.35,
      darkness: data.vignette?.darkness ?? 0.4
    }
    
    // Stronger chromatic aberration for lens realism
    this.chromaticAberration = {
      enabled: data.chromaticAberration?.enabled ?? true,
      offset: data.chromaticAberration?.offset ?? [0.004, 0.004],  // Double the offset
      radialModulation: data.chromaticAberration?.radialModulation ?? true,
      modulationOffset: data.chromaticAberration?.modulationOffset ?? 0.25  // Stronger modulation
    }
    
    // Film grain settings
    this.filmGrain = {
      enabled: data.filmGrain?.enabled ?? true,
      intensity: data.filmGrain?.intensity ?? 0.35,
      grainScale: data.filmGrain?.grainScale ?? 1.5
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
      gamma: data.toneMapping?.gamma ?? 2.2
    }

    // Optional color grading via 3D LUT
    this.colorLUT = {
      enabled: data.colorLUT?.enabled ?? false,
      url: data.colorLUT?.url ?? null,
      intensity: data.colorLUT?.intensity ?? 1
    }

    // Hue/Saturation adjustment
    this.hueSaturation = {
      enabled: data.hueSaturation?.enabled ?? false,
      hue: data.hueSaturation?.hue ?? 0,
      saturation: data.hueSaturation?.saturation ?? 0
    }

    // Brightness/Contrast adjustment
    this.brightnessContrast = {
      enabled: data.brightnessContrast?.enabled ?? false,
      brightness: data.brightnessContrast?.brightness ?? 0,
      contrast: data.brightnessContrast?.contrast ?? 0
    }

    // Lens distortion
    this.lensDistortion = {
      enabled: data.lensDistortion?.enabled ?? false,
      distortion: data.lensDistortion?.distortion ?? 0,
      cubicDistortion: data.lensDistortion?.cubicDistortion ?? 0,
      offset: data.lensDistortion?.offset ?? [0, 0]
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
      clampMax: data.godRays?.clampMax ?? 1.0
    }
    
    // Camera will be created in mount()
    this.camera = null
    
    // Initialize postprocessing pipeline (will be set up when activated)
    this.composer = null
    this.effects = {}
    this.autofocusTarget = new THREE.Vector3()
  }
  
  /**
   * Called when node is added to the scene
   */
  mount() {
    console.log('[Camera] Mounting camera node:', this.name)
    
    // Create THREE.js camera with full settings
    this.camera = new THREE.PerspectiveCamera(
      this.fov,
      this.aspect,
      this.near,
      this.far
    )
    
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
      this.camera.position.set(
        this.position[0] || 0,
        this.position[1] || 0,
        this.position[2] || 0
      )
      if (this.isPlayerCamera) {
        // Player camera should be at rig center with only Z offset for zoom
        this.camera.position.set(0, 0, this.position[2] || 1.5)
      }
    } else {
      // Non-rig cameras: Check if we should attach to app/entity
      // First set position from data
      this.camera.position.set(
        this.position.x,
        this.position.y,
        this.position.z
      )
      
      // Store base position for motion offsets
      this.motionState.basePosition.copy(this.camera.position)
      
      // Handle rotation if provided in data
      if (this.data?.rotation) {
        const rot = this.data.rotation
        this.camera.rotation.set(rot[0], rot[1], rot[2], 'YXZ')
      } else {
        this.camera.quaternion.copy(this.quaternion)
      }
      
      // Store base rotation for motion offsets
      this.motionState.baseRotation.copy(this.camera.rotation)
      
      this.camera.scale.copy(this.scale)
      
      // If camera is created by an app, attach to the app's object3D
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
      this.onPrefsChange = (changes) => {
        if (changes.showHelpers) {
          // Update helper visibility immediately
          if (this.cameraHelper) {
            const globalShow = this.ctx.world.prefs.showHelpers
            const localShow = this.data?.showHelper !== false
            this.cameraHelper.visible = localShow && (globalShow !== false)
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
      stencilBuffer: false
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
          saturation: this.hueSaturation.saturation
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
          contrast: this.brightnessContrast.contrast
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
          principalPoint: new THREE.Vector2(off[0] || 0, off[1] || 0)
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
        focusDistance: this.dof.focusDistance / this.far,  // Normalize to 0-1
        focalLength: this.dof.focalLength * 0.001,  // Convert mm to Three.js units
        bokehScale: this.dof.maxBlur * 100,  // Scale for visibility
        height: 480  // Resolution for DOF
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
        kernelSize: KernelSize.LARGE
      })
      enabledEffects.push(this.effects.bloom)
    }
    
    // Chromatic Aberration
    if (this.chromaticAberration.enabled) {
      this.effects.chromaticAberration = new ChromaticAberrationEffect({
        blendFunction: BlendFunction.NORMAL,
        offset: new THREE.Vector2(...this.chromaticAberration.offset),
        radialModulation: this.chromaticAberration.radialModulation,
        modulationOffset: this.chromaticAberration.modulationOffset
      })
      enabledEffects.push(this.effects.chromaticAberration)
    }
    
    // Vignette
    if (this.vignette.enabled) {
      this.effects.vignette = new VignetteEffect({
        blendFunction: BlendFunction.NORMAL,
        offset: this.vignette.offset,
        darkness: this.vignette.darkness
      })
      enabledEffects.push(this.effects.vignette)
    }
    
    // Film Grain
    if (this.filmGrain.enabled) {
      this.effects.filmGrain = new NoiseEffect({
        blendFunction: BlendFunction.SCREEN,
        intensity: this.filmGrain.intensity
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
            clampMax: this.godRays.clampMax
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
        adaptationRate: 1.0
      })
      enabledEffects.push(this.effects.toneMapping)
    }
    
    // SMAA antialiasing
    this.effects.smaa = new SMAAEffect({
      preset: SMAAPreset.HIGH
    })
    enabledEffects.push(this.effects.smaa)
    
    // Separate convolution effects from regular effects
    const convolutionEffects = []
    const regularEffects = []
    
    for (const effect of enabledEffects) {
      // ChromaticAberration and certain other effects are convolution-based
      if (effect === this.effects.chromaticAberration || 
          effect === this.effects.dof) {
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
    if (!this.dof.autofocus || !this.effects.dof) return
    
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
      const speed = this.dof.autofocusSpeed * delta * 3  // Triple the speed for instant response
      const smoothness = this.dof.autofocusSmoothness
      
      // Use aggressive exponential smoothing for instant focus snaps
      const lerpFactor = 1 - Math.exp(-speed * (2 + smoothness))
      
      // Add overshoot for more dramatic focus pulls
      const overshoot = 1.05  // 5% overshoot
      const newDistance = THREE.MathUtils.lerp(
        this.dof.focusDistance,
        targetDistance * overshoot,
        lerpFactor
      )
      
      // Clamp back to target for final value
      this.dof.focusDistance = THREE.MathUtils.lerp(
        newDistance,
        targetDistance,
        0.1
      )
      
      // Update DOF effect with ultra-aggressive focus
      if (this.effects.dof) {
        const uniforms = this.effects.dof.circleOfConfusionMaterial?.uniforms
        if (uniforms) {
          // Update focus distance
          if (uniforms.focusDistance) {
            uniforms.focusDistance.value = this.dof.focusDistance / this.far
          }
          
          // Also adjust f-stop dynamically for more dramatic effect
          const distanceNormalized = Math.min(targetDistance / 15, 1)  // Closer range
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
    if (this.effects.dof) {
      const uniforms = this.effects.dof.circleOfConfusionMaterial?.uniforms
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
    // Make sure camera is initialized
    if (!this.camera) return
    
    // If attached to rig, the rig handles position/rotation automatically
    // We only need to handle zoom for player camera
    if (this.attachToRig && this.isPlayerCamera) {
      // Update zoom like legacy camera
      const localPlayer = this.ctx?.world?.entities?.getLocalPlayer?.()
      if (localPlayer?.cam?.zoom !== undefined) {
        this.camera.position.z = localPlayer.cam.zoom
      }
    }
    
    // Apply organic camera motion
    if (this.motion.enabled && this._active) {
      this.updateCameraMotion(delta)
    }
    
    // Update camera helper if it exists
    if (this.cameraHelper) {
      // Make sure the helper visibility respects both local and global prefs
      const globalShow = this.ctx?.world?.prefs?.showHelpers
      const localShow = this.data?.showHelper !== false
      this.cameraHelper.visible = localShow && (globalShow !== false)
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
      const baseZ = this.isPlayerCamera ? (this.camera.position.z || 1.5) : this.position.z
      this.camera.position.set(
        state.offsetPosition.x,
        state.offsetPosition.y,
        baseZ + state.offsetPosition.z
      )
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
      toneMapping: { ...this.toneMapping }
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
        get fov() { return self.fov },
        set fov(v) { self.setFOV(v) },
        
        get near() { return self.near },
        get far() { return self.far },
        setClippingPlanes: (near, far) => self.setClippingPlanes(near, far),
        
        get focalLength() { return self.getFocalLength() },
        set focalLength(v) { self.setFocalLength(v) },
        
        get active() { return self._active },
        activate: () => self.makeActive(),
        deactivate: () => self.makeInactive(),
        
        lookAt: (target) => self.lookAt(target),
        
        // Effect controls
        get dof() { return { ...self.dof } },
        setDOF: (settings) => self.setDOF(settings),
        
        // Motion controls
        get motion() { return { ...self.motion } },
        setMotion: (settings) => self.setMotion(settings),
        setMotionEnabled: (enabled) => self.setMotionEnabled(enabled),

        get bloom() { return { ...self.bloom } },
        setBloom: (settings) => self.setBloom(settings),
        
        get vignette() { return { ...self.vignette } },
        setVignette: (settings) => self.setVignette(settings),
        
        get filmGrain() { return { ...self.filmGrain } },
        setFilmGrain: (settings) => self.setFilmGrain(settings),
        
        get chromaticAberration() { return { ...self.chromaticAberration } },
        setChromaticAberration: (settings) => self.setChromaticAberration(settings),
        
        // Feed (video window) controls
        get feed() { return { ...self.feed } },
        setFeed: (settings) => self.setFeed(settings),
        setFeedEnabled: (enabled) => self.setFeedEnabled(enabled),
        setFeedSize: (width, height) => self.setFeedSize(width, height),
        getFeedTexture: () => self.getFeedTexture(),
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
    const needsCreate = !this.feedRenderTarget || this.feedRenderTarget.width !== w || this.feedRenderTarget.height !== h
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