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
  DepthOfFieldEffect,
} from 'postprocessing'

import { System } from './System'

const v1 = new THREE.Vector3()

let renderer
function getRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
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
    this.helpers = new Set()
  }

  async init({ viewport }) {
    // console.log('[ClientGraphics] init() called with viewport:', !!viewport)
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
    this.effectPass = new EffectPass(this.world.camera)
    this.updatePostProcessingEffects()
    this.composer.addPass(this.effectPass)

    // Setup DOF if enabled
    if (this.world.prefs.dofEnabled) {
      this.setupDOF()
      this.updatePostProcessingEffects() // Re-run to include DOF
    }

    this.world.prefs.on('change', this.onPrefsChange)
    this.resizer = new ResizeObserver(() => {
      this.resize(this.viewport.offsetWidth, this.viewport.offsetHeight)
    })
    this.viewport.appendChild(this.renderer.domElement)
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
    // Note: css3dRenderer is managed by WebView nodes, not ClientGraphics

    this.emit('resize')
    this.render()
  }

  render() {
    // Render WebGL scene using world.camera
    if (this.renderer.xr.isPresenting || !this.usePostprocessing) {
      this.renderer.render(this.world.stage.scene, this.world.camera)
    } else {
      // Use the default composer (includes DOF effect)
      this.composer.render()
    }
    if (this.xrDimensionsNeeded) {
      this.checkXRDimensions()
    }
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
      console.log(this.aoPass.enabled)
    }
  }

  updatePostProcessingEffects() {
    const effects = []
    if (this.bloomEnabled) {
      effects.push(this.bloom)
    }
    // Add DOF effect if enabled and created
    if (this.world.prefs.dofEnabled && this.dofEffect) {
      effects.push(this.dofEffect)
    }
    effects.push(this.smaa)
    effects.push(this.tonemapping)
    this.effectPass.setEffects(effects)
    this.effectPass.recompile()
  }

  setupDOF() {
    if (!this.world.prefs.dofEnabled) return

    try {
      this.dofEffect = new DepthOfFieldEffect(this.world.camera, {
        blendFunction: BlendFunction.NORMAL,
        focusDistance: (this.world.prefs.dofFocusDistance || 10) / (this.world.camera.far || 1200),
        focalLength: (this.world.prefs.dofFocalLength || 24) * 0.001,
        bokehScale: (this.world.prefs.dofMaxBlur || 0.15) * 100,
        height: 480,
      })

      // Configure DOF uniforms
      const uniforms = this.dofEffect.circleOfConfusionMaterial.uniforms
      uniforms.fStop.value = this.world.prefs.dofFStop || 1.8
      uniforms.maxBlur.value = this.world.prefs.dofMaxBlur || 0.15
      uniforms.luminanceThreshold.value = this.world.prefs.dofLuminanceThreshold || 0.6
      uniforms.luminanceGain.value = this.world.prefs.dofLuminanceGain || 2.5
      uniforms.bias.value = this.world.prefs.dofBias || 0.08
      uniforms.fringe.value = this.world.prefs.dofFringe || 0.8

      // Store uniform references for updates
      this.dofUniforms = uniforms
    } catch (error) {
      console.error('[ClientGraphics] Failed to setup DOF effect:', error)
      this.dofEffect = null
      this.dofUniforms = null
    }
  }

  destroy() {
    this.resizer.disconnect()
    this.viewport.removeChild(this.renderer.domElement)
  }
}
