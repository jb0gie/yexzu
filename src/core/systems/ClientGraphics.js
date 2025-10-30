import * as THREE from '../extras/three'
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
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
    this.renderer.xr.setReferenceSpaceType('local-floor')
    this.renderer.xr.setFoveation(1)
    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy()
    THREE.Texture.DEFAULT_ANISOTROPY = this.maxAnisotropy
    this.usePostprocessing = this.world.prefs.postprocessing

    // Initialize CSS3D renderer for WebViews
    this.css3dScene = new THREE.Scene()
    this.css3dRenderer = new CSS3DRenderer()
    this.css3dRenderer.setSize(this.width, this.height)
    this.css3dRenderer.domElement.style.position = 'absolute'
    this.css3dRenderer.domElement.style.top = '0'
    this.css3dRenderer.domElement.style.left = '0'
    this.css3dRenderer.domElement.style.pointerEvents = 'none'
    this.css3dRenderer.domElement.style.zIndex = '1'
    this.viewport.appendChild(this.css3dRenderer.domElement)

    const context = this.renderer.getContext()
    const maxMultisampling = context.getParameter(context.MAX_SAMPLES)
    this.composer = new EffectComposer(this.renderer, {
      frameBufferType: THREE.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: false,
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
    this.aoPass.configuration.screenSpaceRadius = true
    this.aoPass.configuration.aoRadius = 32
    this.aoPass.configuration.distanceFalloff = 1
    this.aoPass.configuration.intensity = 2
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
    // Depth of Field effect (normalize focus inputs by camera.far)
    this.dof = new DepthOfFieldEffect(this.world.camera, {
      blendFunction: BlendFunction.NORMAL,
      focusDistance: (this.world.prefs.dofFocusDistance || 10) / this.world.camera.far,
      focusRange: (this.world.prefs.dofFocusRange || 5) / this.world.camera.far,
      bokehScale: this.world.prefs.dofBokehScale,
      resolutionScale: 1.0, // Full resolution to prevent flickering
      height: 480, // Limit resolution for performance
    })
    this.dofEnabled = this.world.prefs.dofEnabled
    this.smaa = new SMAAEffect({
      preset: SMAAPreset.ULTRA,
    })
    this.tonemapping = new ToneMappingEffect({
      mode: ToneMappingMode.ACES_FILMIC,
    })
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

    // Listen for camera changes from CameraManager
    this.world.on('camera-changed', camera => {
      // Update the render pass with the new camera
      if (this.renderPass && camera?.camera) {
        this.renderPass.camera = camera.camera
        // console.log('ClientGraphics: Updated render pass camera')
      }
    })
  }

  resize(width, height) {
    this.width = width
    this.height = height
    this.aspect = this.width / this.height
    this.world.camera.aspect = this.aspect
    this.world.camera.updateProjectionMatrix()
    this.renderer.setSize(this.width, this.height)
    this.composer.setSize(this.width, this.height)
    this.css3dRenderer.setSize(this.width, this.height)


    this.emit('resize')
    this.render()
  }

  render() {
    // Check if we have an active camera node with its own composer
    const activeCameraNode = this.world.cameraManager?.activeCamera
    const cam = this.world.cameraManager?.getRenderCamera() || this.world.camera

    // Render WebGL scene
    if (this.renderer.xr.isPresenting || !this.usePostprocessing) {
      this.renderer.render(this.world.stage.scene, cam)
    } else if (activeCameraNode?.composer) {
      // Use the camera node's composer if it has one
      activeCameraNode.composer.render()
    } else {
      // Fall back to the default composer
      this.composer.render()
    }

    // Render CSS3D after main scene
    if (this.css3dRenderer && this.css3dScene) {
      const cam = this.world.cameraManager?.getRenderCamera() || this.world.camera
      this.css3dRenderer.render(this.css3dScene, cam)
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
    // depth of field
    if (changes.dofEnabled) {
      this.dofEnabled = changes.dofEnabled.value
      this.updatePostProcessingEffects()
    }
    if (changes.dofFocusDistance) {
      if (this.dof.circleOfConfusionMaterial) {
        this.dof.circleOfConfusionMaterial.uniforms.focusDistance.value =
          changes.dofFocusDistance.value / this.world.camera.far
      }
    }
    if (changes.dofFocusRange) {
      if (this.dof.circleOfConfusionMaterial) {
        this.dof.circleOfConfusionMaterial.uniforms.focusRange.value =
          changes.dofFocusRange.value / this.world.camera.far
      }
    }
    if (changes.dofBokehScale) {
      // Bokeh scale might be on the bokehMaterial
      if (this.dof.bokehMaterial) {
        this.dof.bokehMaterial.uniforms.scale.value = changes.dofBokehScale.value
      }
    }
    // focal length
    if (changes.focalLength) {
      // Convert focal length to FOV
      const sensorHeight = 24 // 35mm sensor height in mm
      const fov = 2 * Math.atan(sensorHeight / (2 * changes.focalLength.value)) * (180 / Math.PI)
      this.world.camera.fov = fov
      this.world.camera.updateProjectionMatrix()
    }
    // helpers
    if (changes.showHelpers) {
      this.updateHelpers(changes.showHelpers.value)
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
      // console.log(this.aoPass.enabled)
    }
  }

  updatePostProcessingEffects() {
    const effects = []
    if (this.dofEnabled) {
      effects.push(this.dof)
    }
    if (this.bloomEnabled) {
      effects.push(this.bloom)
    }
    effects.push(this.smaa)
    effects.push(this.tonemapping)
    this.effectPass.setEffects(effects)
    this.effectPass.recompile()
  }

  updateHelpers(show) {
    if (show) {
      // Add helpers
      if (!this.cameraHelper) {
        this.cameraHelper = new THREE.CameraHelper(this.world.camera)
        this.world.stage.scene.add(this.cameraHelper)
        this.helpers.add(this.cameraHelper)
      }
      if (!this.gridHelper) {
        this.gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x222222)
        this.world.stage.scene.add(this.gridHelper)
        this.helpers.add(this.gridHelper)
      }
      if (!this.axesHelper) {
        this.axesHelper = new THREE.AxesHelper(5)
        this.world.stage.scene.add(this.axesHelper)
        this.helpers.add(this.axesHelper)
      }
    } else {
      // Remove helpers
      this.helpers.forEach(helper => {
        this.world.stage.scene.remove(helper)
        if (helper.dispose) helper.dispose()
      })
      this.helpers.clear()
      this.cameraHelper = null
      this.gridHelper = null
      this.axesHelper = null
    }
  }

  destroy() {
    this.resizer.disconnect()

    if (this.css3dRenderer) {
      this.css3dRenderer.domElement.remove()
      this.css3dRenderer = null
      this.css3dScene = null
    }

    this.viewport.removeChild(this.renderer.domElement)
  }
}
