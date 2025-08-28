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
  KernelSize
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
    this._active = data.active || false
    this.priority = data.priority || 0
    
    // Cinematic DOF settings
    this.dof = {
      enabled: data.dof?.enabled ?? true,
      focusDistance: data.dof?.focusDistance ?? 10,
      focalLength: data.dof?.focalLength ?? 35,
      fStop: data.dof?.fStop ?? 1.4,  // Aperture f-stop (lower = more blur)
      maxBlur: data.dof?.maxBlur ?? 0.025,
      luminanceThreshold: data.dof?.luminanceThreshold ?? 0.5,
      luminanceGain: data.dof?.luminanceGain ?? 2,
      bias: data.dof?.bias ?? 0.15,
      fringe: data.dof?.fringe ?? 0.7,
      dithering: data.dof?.dithering ?? 0.0001,
      pentagon: data.dof?.pentagon ?? true,
      shapeBlur: data.dof?.shapeBlur ?? 1,
      autofocus: data.dof?.autofocus ?? false,
      autofocusSpeed: data.dof?.autofocusSpeed ?? 2,
      autofocusSmoothness: data.dof?.autofocusSmoothness ?? 0.25
    }
    
    // Bloom settings
    this.bloom = {
      enabled: data.bloom?.enabled ?? true,
      intensity: data.bloom?.intensity ?? 0.5,
      luminanceThreshold: data.bloom?.luminanceThreshold ?? 0.8,
      luminanceSmoothing: data.bloom?.luminanceSmoothing ?? 0.3,
      radius: data.bloom?.radius ?? 0.8,
      mipmapBlur: data.bloom?.mipmapBlur ?? true
    }
    
    // Vignette settings
    this.vignette = {
      enabled: data.vignette?.enabled ?? true,
      offset: data.vignette?.offset ?? 0.35,
      darkness: data.vignette?.darkness ?? 0.4
    }
    
    // Chromatic aberration settings
    this.chromaticAberration = {
      enabled: data.chromaticAberration?.enabled ?? true,
      offset: data.chromaticAberration?.offset ?? [0.002, 0.002],
      radialModulation: data.chromaticAberration?.radialModulation ?? true,
      modulationOffset: data.chromaticAberration?.modulationOffset ?? 0.15
    }
    
    // Film grain settings
    this.filmGrain = {
      enabled: data.filmGrain?.enabled ?? true,
      intensity: data.filmGrain?.intensity ?? 0.35,
      grainScale: data.filmGrain?.grainScale ?? 1.5
    }
    
    // Tone mapping
    this.toneMapping = {
      enabled: data.toneMapping?.enabled ?? true,
      mode: data.toneMapping?.mode ?? ToneMappingMode.ACES_FILMIC,
      exposure: data.toneMapping?.exposure ?? 1.0,
      gamma: data.toneMapping?.gamma ?? 2.2
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
    
    // Update aspect ratio from graphics
    if (this.ctx?.world?.graphics?.aspect) {
      this.aspect = this.ctx.world.graphics.aspect
      this.camera.aspect = this.aspect
      this.camera.updateProjectionMatrix()
    }
    
    // Copy transform from node
    this.camera.position.copy(this.position)
    this.camera.quaternion.copy(this.quaternion)
    this.camera.scale.copy(this.scale)
    
    // Register with camera manager
    if (this.ctx?.world?.cameraManager) {
      console.log('[Camera] Registering with camera manager')
      this.ctx.world.cameraManager.registerCamera(this)
    } else {
      console.warn('[Camera] No camera manager found in world')
    }
    
    // If marked as active, activate
    if (this._active) {
      console.log('[Camera] Camera marked as active, activating...')
      this.makeActive()
    }
  }
  
  /**
   * Called when node is removed from the scene
   */
  unmount() {
    // Unregister from camera manager
    if (this.ctx?.world?.cameraManager) {
      this.ctx.world.cameraManager.unregisterCamera(this)
    }
    
    // Clean up postprocessing
    if (this.composer) {
      this.composer.dispose()
      this.composer = null
    }
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
    
    if (this.ctx?.world?.cameraManager) {
      this.ctx.world.cameraManager.setActiveCamera(this)
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
      // Smoothly interpolate to new focus distance
      const targetDistance = intersects[0].distance
      const speed = this.dof.autofocusSpeed * delta
      const smoothness = this.dof.autofocusSmoothness
      
      this.dof.focusDistance = THREE.MathUtils.lerp(
        this.dof.focusDistance,
        targetDistance,
        Math.min(1, speed * smoothness)
      )
      
      // Update DOF effect
      if (this.effects.dof) {
        this.effects.dof.circleOfConfusionMaterial.uniforms.focusDistance.value = 
          this.dof.focusDistance / this.far
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
      const uniforms = this.effects.dof.circleOfConfusionMaterial.uniforms
      if (uniforms.focusDistance) {
        uniforms.focusDistance.value = this.dof.focusDistance / this.far
      }
      if (uniforms.focalLength) {
        uniforms.focalLength.value = this.dof.focalLength * 0.001
      }
      if (uniforms.fStop) {
        uniforms.fStop.value = this.dof.fStop
      }
      
      // Update bokeh effect
      this.effects.dof.bokehScale = this.dof.maxBlur * 100
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
    if (this._active && this.dof.autofocus) {
      this.performAutofocus(delta)
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
        
        get bloom() { return { ...self.bloom } },
        setBloom: (settings) => self.setBloom(settings),
        
        get vignette() { return { ...self.vignette } },
        setVignette: (settings) => self.setVignette(settings),
        
        get filmGrain() { return { ...self.filmGrain } },
        setFilmGrain: (settings) => self.setFilmGrain(settings),
        
        get chromaticAberration() { return { ...self.chromaticAberration } },
        setChromaticAberration: (settings) => self.setChromaticAberration(settings),
      }
      
      // Inherit Node properties
      proxy = Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(super.getProxy()))
      this.proxy = proxy
    }
    return this.proxy
  }
}