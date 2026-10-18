import * as THREE from '../extras/three'
import { N8AOPostPass } from 'n8ao'
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAPreset,
  SMAAEffect,
  ToneMappingEffect,
  ToneMappingMode,
  SelectiveBloomEffect,
  BlendFunction,
  Selection,
  BloomEffect,
  KernelSize,
  DepthPass,
  Pass,
  DepthEffect,
} from 'postprocessing'
import { GradeEffect } from './effects/GradeEffect'

import { System } from './System'

const v1 = new THREE.Vector3()

let renderer
function getRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true, // Required for CSS3D WebView occlusion
      // logarithmicDepthBuffer: true,
      // reverseDepthBuffer: true,
    })
  }
  return renderer
}

/**
 * Graphics System
 *
 * - Runs on the client
 * - Supports renderer, shadows, postprocessing, etc
 * - Renders to the viewport
 *
 */
export class ClientGraphics extends System {
  constructor(world) {
    super(world)
  }

  async init({ viewport }) {
    this.viewport = viewport
    this.width = this.viewport.offsetWidth
    this.height = this.viewport.offsetHeight
    this.aspect = this.width / this.height
    this.renderer = getRenderer()
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(0xffffff, 0)
    this.renderer.setPixelRatio(this.world.prefs.dpr)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.NoToneMapping
    this.renderer.toneMappingExposure = 1
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.xr.enabled = true
    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy()
    THREE.Texture.DEFAULT_ANISOTROPY = this.maxAnisotropy
    this.usePostprocessing = this.world.prefs.postprocessing
    const context = this.renderer.getContext()
    const maxMultisampling = context.getParameter(context.MAX_SAMPLES)
    this.composer = new EffectComposer(this.renderer, {
      frameBufferType: THREE.HalfFloatType,
      // multisampling: Math.min(8, maxMultisampling),
    })
    this.renderPass = new RenderPass(this.world.stage.scene, this.world.camera)
    this.composer.addPass(this.renderPass)
    this.aoPass = new N8AOPostPass(this.world.stage.scene, this.world.camera, this.width, this.height)
    this.aoPass.enabled = this.world.settings.ao && this.world.prefs.ao
    // we can't use this as it traverses the scene, but half our objects are in the octree
    this.aoPass.autoDetectTransparency = false
    // full res is pretty expensive
    this.aoPass.configuration.halfRes = true
    // look 1:
    // this.aoPass.configuration.aoRadius = 0.2
    // this.aoPass.configuration.distanceFalloff = 1
    // this.aoPass.configuration.intensity = 2
    // look 2:
    // this.aoPass.configuration.aoRadius = 0.5
    // this.aoPass.configuration.distanceFalloff = 1
    // this.aoPass.configuration.intensity = 2
    // look 3:
    // this.aoPass.configuration.screenSpaceRadius = true
    // this.aoPass.configuration.aoRadius = 32
    // this.aoPass.configuration.distanceFalloff = 1
    // this.aoPass.configuration.intensity = 2
    // look 4:
    this.aoPass.configuration.screenSpaceRadius = true
    this.aoPass.configuration.aoRadius = 64
    this.aoPass.configuration.distanceFalloff = 0.3
    this.aoPass.configuration.intensity = 1
    this.composer.addPass(this.aoPass)
    this.bloom = new BloomEffect({
      blendFunction: BlendFunction.ADD,
      mipmapBlur: true,
      luminanceThreshold: 1,
      luminanceSmoothing: 0.3,
      intensity: 0.5,
      radius: 0.8,
    })
    this.bloomEnabled = this.world.prefs.bloom
    this.smaa = new SMAAEffect({
      preset: SMAAPreset.ULTRA,
    })
    this.tonemapping = new ToneMappingEffect({
      mode: ToneMappingMode.ACES_FILMIC,
    })
    // Floor grade. amount 0 is a no-op, so this ships invisible: it only does something when a
    // world or a floor calls setGrade() - which is how the Spire gives each tier its own mood.
    this.grade = new GradeEffect({
      amount: this.world.prefs.gradeAmount ?? 0,
      saturation: this.world.prefs.gradeSaturation ?? 1,
      contrast: this.world.prefs.gradeContrast ?? 1,
      lift: this.world.prefs.gradeLift ?? 0,
      vignette: this.world.prefs.gradeVignette ?? 0,
      grain: this.world.prefs.gradeGrain ?? 0,
      tint: this.world.prefs.gradeTint ?? [1, 1, 1],
    })
    this.gradeEnabled = this.world.prefs.gradeEnabled !== false
    this.effectPass = new EffectPass(this.world.camera)
    this.updatePostProcessingEffects()
    this.composer.addPass(this.effectPass)
    this.world.prefs.on('change', this.onPrefsChange)
    this.resizer = new ResizeObserver(() => {
      this.resize(this.viewport.offsetWidth, this.viewport.offsetHeight)
    })
    this.viewport.appendChild(this.renderer.domElement)
    // Canvas renders on top via alpha compositing, but pointer events pass through to CSS layer
    this.renderer.domElement.style.position = 'relative'
    this.renderer.domElement.style.pointerEvents = 'none'
    this.resizer.observe(this.viewport)

    this.xrWidth = null
    this.xrHeight = null
    this.xrDimensionsNeeded = false
  }

  start() {
    this.world.on('xrSession', this.onXRSession)
    this.world.settings.on('change', this.onSettingsChange)
  }

  resize(width, height) {
    this.width = width
    this.height = height
    this.aspect = this.width / this.height
    this.world.camera.aspect = this.aspect
    this.world.camera.updateProjectionMatrix()
    this.renderer.setSize(this.width, this.height)
    this.composer.setSize(this.width, this.height)
    this.emit('resize')
    this.render()
  }

  render() {
    // Then render WebGL
    if (this.renderer.xr.isPresenting || !this.usePostprocessing) {
      this.renderer.render(this.world.stage.scene, this.world.camera)
    } else {
      this.composer.render()
    }
    if (this.xrDimensionsNeeded) {
      this.checkXRDimensions()
    }
    this.emit('render')
  }

  commit() {
    this.render()
  }

  preTick() {
    // calc world to screen factor
    const camera = this.world.camera
    const fovRadians = camera.fov * (Math.PI / 180)
    const rendererHeight = this.xrHeight || this.height
    this.worldToScreenFactor = (Math.tan(fovRadians / 2) * 2) / rendererHeight
  }

  onPrefsChange = changes => {
    // pixel ratio
    if (changes.dpr) {
      this.renderer.setPixelRatio(changes.dpr.value)
      this.resize(this.width, this.height)
    }
    // postprocessing
    if (changes.postprocessing) {
      this.usePostprocessing = changes.postprocessing.value
    }
    // bloom
    if (changes.bloom) {
      this.bloomEnabled = changes.bloom.value
      this.updatePostProcessingEffects()
    }
    // ao
    if (changes.ao) {
      this.aoPass.enabled = changes.ao.value && this.world.settings.ao
    }
  }

  onXRSession = session => {
    if (session) {
      this.xrSession = session
      this.xrWidth = null
      this.xrHeight = null
      this.xrDimensionsNeeded = true
    } else {
      this.xrSession = null
      this.xrWidth = null
      this.xrHeight = null
      this.xrDimensionsNeeded = false
    }
  }

  checkXRDimensions = () => {
    // Get the current XR reference space
    const referenceSpace = this.renderer.xr.getReferenceSpace()
    // Get frame information
    const frame = this.renderer.xr.getFrame()
    if (frame && referenceSpace) {
      // Get view information which contains projection matrices
      const views = frame.getViewerPose(referenceSpace)?.views
      if (views && views.length > 0) {
        // Use the first view's projection matrix
        const projectionMatrix = views[0].projectionMatrix
        // Extract the relevant factors from the projection matrix
        // This is a simplified approach
        const fovFactor = projectionMatrix[5] // Approximation of FOV scale
        // You might need to consider the XR display's physical properties
        // which can be accessed via session.renderState
        const renderState = this.xrSession.renderState
        const baseLayer = renderState.baseLayer
        if (baseLayer) {
          // Get the actual resolution being used for rendering
          this.xrWidth = baseLayer.framebufferWidth
          this.xrHeight = baseLayer.framebufferHeight
          this.xrDimensionsNeeded = false
          console.log({ xrWidth: this.xrWidth, xrHeight: this.xrHeight })
        }
      }
    }
  }

  onSettingsChange = changes => {
    if (changes.ao) {
      this.aoPass.enabled = changes.ao.value && this.world.prefs.ao

    }
  }

  /**
   * Set the floor grade at runtime. Every key is one dial; anything omitted is left as it is.
   * amount is the master mix - 0 leaves the frame untouched, 1 is the full grade.
   *   graphics.setGrade({ amount: 1, saturation: 0.6, contrast: 1.1, vignette: 0.4, tint: [1, 0.98, 0.94] })
   * Called with no arguments it clears the grade back to neutral.
   */
  setGrade(values = null) {
    if (!this.grade) return
    if (values === null) values = { amount: 0 }
    const uniforms = {
      amount: 'uAmount',
      saturation: 'uSaturation',
      contrast: 'uContrast',
      lift: 'uLift',
      vignette: 'uVignette',
      grain: 'uGrain',
      tint: 'uTint',
    }
    for (const [key, uniformName] of Object.entries(uniforms)) {
      if (values[key] === undefined) continue
      const u = this.grade.uniforms.get(uniformName)
      if (!u) continue
      if (key === 'tint') u.value.set(values[key][0], values[key][1], values[key][2])
      else u.value = values[key]
    }
    this.updatePostProcessingEffects()
  }

  /**
   * Emissive bloom - bloom that plays on what GLOWS, and only on that.
   *
   * Built lazily, on purpose: nothing is constructed until a world asks for it, so a world that
   * never calls this can never be broken by it. Same door as the grade - it joins the effect pass.
   *
   * Selection is by material, not by name, so authors get it by making something emissive:
   *   const e = world.graphics.enableEmissiveBloom()
   *   world.graphics.selectEmissiveObjects(scene)          // everything already glowing
   *   world.graphics.addToEmissiveBloom(myLavaMesh)        // or one at a time
   */
  enableEmissiveBloom({ intensity = 1.6, luminanceThreshold = 0.55, luminanceSmoothing = 0.2, radius = 0.85, mipmapBlur = true } = {}) {
    if (this.emissiveBloom) return this.emissiveBloom
    try {
      this.emissiveBloom = new SelectiveBloomEffect(this.world.stage.scene, this.world.camera, {
        blendFunction: BlendFunction.ADD,
        mipmapBlur,
        luminanceThreshold,
        luminanceSmoothing,
        intensity,
        radius,
        selection: new Selection(),
      })
      this.emissiveBloom.selection = this.emissiveBloom.selection || new Selection()
      this.updatePostProcessingEffects()
      console.log('[ClientGraphics] Emissive bloom on:', intensity)
    } catch (error) {
      console.error('[ClientGraphics] Emissive bloom failed to create:', error)
      this.emissiveBloom = null
    }
    return this.emissiveBloom
  }

  /** Add one object (and its children) to the emissive bloom selection. */
  addToEmissiveBloom(object) {
    const effect = this.emissiveBloom || this.enableEmissiveBloom()
    if (!effect || !object) return 0
    let added = 0
    object.traverse(node => {
      if (node.isMesh || node.isPoints || node.isSprite) {
        effect.selection.add(node)
        added++
      }
    })
    return added
  }

  /** Select everything already glowing: any mesh whose material has an emissive colour set. */
  selectEmissiveObjects(root = null) {
    const scene = root || this.world.stage.scene
    const effect = this.emissiveBloom || this.enableEmissiveBloom()
    if (!effect || !scene) return 0
    let added = 0
    scene.traverse(node => {
      const material = node.material
      if (!material || !(node.isMesh || node.isPoints || node.isSprite)) return
      const emissive = Array.isArray(material) ? material[0].emissive : material.emissive
      const strength = Array.isArray(material) ? material[0].emissiveIntensity : material.emissiveIntensity
      const hasGlow = emissive && (emissive.r > 0.05 || emissive.g > 0.05 || emissive.b > 0.05)
      if (hasGlow && (strength === undefined || strength > 0)) {
        effect.selection.add(node)
        added++
      }
    })
    console.log('[ClientGraphics] Emissive bloom selected', added, 'objects')
    return added
  }

  disableEmissiveBloom() {
    if (!this.emissiveBloom) return
    this.emissiveBloom.dispose()
    this.emissiveBloom = null
    this.updatePostProcessingEffects()
    console.log('[ClientGraphics] Emissive bloom off')
  }

  updatePostProcessingEffects() {
    const effects = []
    if (this.bloomEnabled) {
      effects.push(this.bloom)
    }
    if (this.gradeEnabled && this.grade) {
      effects.push(this.grade)
    }
    if (this.emissiveBloom) {
      this.emissiveBloom.blendMode.opacity.value = 1
      effects.push(this.emissiveBloom)
    }
    effects.push(this.smaa)
    effects.push(this.tonemapping)
    this.effectPass.setEffects(effects)
    this.effectPass.recompile()
  }

  destroy() {
    this.resizer.disconnect()
    this.viewport.removeChild(this.renderer.domElement)
  }
}
