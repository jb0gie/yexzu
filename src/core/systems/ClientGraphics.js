import * as THREE from '../extras/three'
import {
  EffectComposer,
  EffectPass,
  RenderPass,
} from 'postprocessing'

import { System } from './System'
import { EffectRegistry } from './EffectRegistry'

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
    this.effectRegistry = new EffectRegistry(world)
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
    this.composer = new EffectComposer(this.renderer, {
      frameBufferType: THREE.HalfFloatType,
      // multisampling: Math.min(8, maxMultisampling),
    })
    this.renderPass = new RenderPass(this.world.stage.scene, this.world.camera)
    this.composer.addPass(this.renderPass)

    // Initialize effects using EffectRegistry
    this.effects = {}

    // AO effect (special case - needs world.stage.scene)
    this.effects.ao = this.effectRegistry.createEffect('ao', this.world.camera, this.world)
    if (this.effects.ao) {
      console.log('[ClientGraphics] AO effect created successfully')
      this.composer.addPass(this.effects.ao)
    }

    // Create postprocessing effects
    this.effects.bloom = this.effectRegistry.createEffect('bloom', this.world.camera, this.world)
    if (this.effects.bloom) {
      console.log('[ClientGraphics] Bloom effect created successfully')
    }

    this.effects.smaa = this.effectRegistry.createEffect('smaa', this.world.camera, this.world)
    if (this.effects.smaa) {
      console.log('[ClientGraphics] SMAA effect created successfully')
    }

    this.effects.tonemapping = this.effectRegistry.createEffect('tonemapping', this.world.camera, this.world)
    if (this.effects.tonemapping) {
      console.log('[ClientGraphics] ToneMapping effect created successfully')
    }

    // Create DOF effect if enabled
    if (this.world.prefs.dofEnabled) {
      this.effects.dof = this.effectRegistry.createEffect('dof', this.world.camera, this.world)
      if (this.effects.dof) {
        console.log('[ClientGraphics] DOF effect created successfully')
      }
    }

    // Keep backwards compatibility assignments
    this.smaa = this.effects.smaa
    this.tonemapping = this.effects.tonemapping

    // Create effect pass and add effects
    this.effectPass = new EffectPass(this.world.camera)
    this.updatePostProcessingEffects()
    this.composer.addPass(this.effectPass)

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

    // Update effects using EffectRegistry
    const effectNames = this.effectRegistry.getSupportedEffects('postprocessing')

    for (const effectName of effectNames) {
      // Skip AO as it's handled specially
      if (effectName === 'ao') {
        if (changes.ao && this.effects.ao) {
          this.effects.ao.enabled = changes.ao.value && this.world.settings.ao
        }
        continue
      }

      // Update effect if preferences changed
      if (this.effectRegistry.updateEffectFromPrefs(effectName, changes)) {
        console.log(`[ClientGraphics] Updated ${effectName} from preferences`)
      }
    }

    // Handle bloom enable/disable
    if (changes.bloom !== undefined) {
      this.updatePostProcessingEffects()
    }

    // Handle DOF enable/disable
    if (changes.dofEnabled !== undefined) {
      if (changes.dofEnabled.value && !this.effects.dof) {
        // Enable DOF
        this.effects.dof = this.effectRegistry.createEffect('dof', this.world.camera, this.world)
      } else if (!changes.dofEnabled.value && this.effects.dof) {
        // Disable and remove DOF
        this.effectRegistry.removeEffect('dof')
        this.effects.dof = null
      }
      this.updatePostProcessingEffects()
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
        // _projectionMatrix = views[0].projectionMatrix
        // Extract the relevant factors from the projection matrix
        // This is a simplified approach
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
    if (changes.ao && this.effects.ao) {
      this.effects.ao.enabled = changes.ao.value && this.world.prefs.ao
      console.log(this.effects.ao.enabled)
    }
  }

  updatePostProcessingEffects() {
    const effects = []
    const supportedEffects = this.effectRegistry.getSupportedEffects('postprocessing')

    for (const effectName of supportedEffects) {
      // Skip AO as it's handled separately with its own pass
      if (effectName === 'ao') continue

      const effect = this.effects[effectName]
      if (!effect) continue

      // Check if effect should be enabled
      const config = this.effectRegistry.getEffectConfig(effectName)
      let shouldInclude = true

      // Check enabled preference
      if (config.enabled && this.world.prefs[config.enabled] === false) {
        shouldInclude = false
      }

      if (shouldInclude) {
        effects.push(effect)
        console.log(`[ClientGraphics] Added ${effectName} to effect pass`)
      }
    }

    this.effectPass.setEffects(effects)
    this.effectPass.recompile()
    console.log(`[ClientGraphics] Updated postprocessing effects: ${effects.length} effects active`)
  }

  destroy() {
    // Clean up effects through the registry
    if (this.effectRegistry) {
      this.effectRegistry.destroy()
    }

    this.resizer.disconnect()
    this.viewport.removeChild(this.renderer.domElement)
  }
}
