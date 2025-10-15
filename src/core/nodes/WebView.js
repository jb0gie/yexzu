import { Node } from './Node.js'
import * as THREE from 'three'
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

const defaults = {
  src: null,
  width: 640,           // pixel width
  height: 480,          // pixel height
  worldWidth: 1.6,      // width in meters (default: 1.6m for 640px)
  worldHeight: 1.2,     // height in meters (default: 1.2m for 480px)
  space: 'world',
  billboard: 'none',
  pointerEvents: false, // NEW: configurable pointer events
  visible: true,
  opacity: 1,
}

export class WebView extends Node {
  constructor(data = {}) {
    super('webview', data)

    // Apply defaults
    Object.assign(this, defaults, data)

    // Store original values
    this._src = this.src
    this._width = this.width
    this._height = this.height
    this._worldWidth = this.worldWidth
    this._worldHeight = this.worldHeight
    this._space = this.space
    this._billboard = this.billboard
    this._pointerEvents = this.pointerEvents
    this._visible = this.visible
    this._opacity = this.opacity

    // WebView-specific properties
    this.canvas = null
    this.canvasCtx = null
    this.texture = null
    this.material = null
    this.geometry = null
    this.mesh = null
    this.cssObject = null
    this.iframeElement = null
    this.containerElement = null
    this.updateInterval = null
  }

  get src() {
    return this._src
  }

  set src(value = defaults.src) {
    if (this._src === value) return
    this._src = value
    if (this.ctx && this.ctx.world && !this.ctx.world.network?.isServer) {
      this.createWebView()
    }
  }

  get width() {
    return this._width
  }

  set width(value = defaults.width) {
    if (this._width === value) return
    this._width = value
    if (this.ctx && this.ctx.world && !this.ctx.world.network?.isServer) {
      this.createWebView()
    }
  }

  get height() {
    return this._height
  }

  set height(value = defaults.height) {
    if (this._height === value) return
    this._height = value
    if (this.ctx && this.ctx.world && !this.ctx.world.network?.isServer) {
      this.createWebView()
    }
  }

  get space() {
    return this._space
  }

  set space(value = defaults.space) {
    const validSpaces = ['world', 'screen']
    if (!validSpaces.includes(value)) {
      throw new Error(`[webview] space must be 'world' or 'screen'`)
    }
    if (this._space === value) return
    this._space = value
    if (this.ctx && this.ctx.world && !this.ctx.world.network?.isServer) {
      this.createWebView()
    }
  }

  get size() {
    return this._size
  }

  set size(value = defaults.size) {
    if (this._size === value) return
    this._size = value
    if (this.ctx && this.ctx.world && !this.ctx.world.network?.isServer) {
      this.createWebView()
    }
  }

  get billboard() {
    return this._billboard
  }

  set billboard(value = defaults.billboard) {
    const validBillboards = ['none', 'full', 'y']
    if (!validBillboards.includes(value)) {
      throw new Error(`[webview] billboard must be 'none', 'full', or 'y'`)
    }
    if (this._billboard === value) return
    this._billboard = value
  }

  get worldWidth() {
    return this._worldWidth
  }

  set worldWidth(value = defaults.worldWidth) {
    if (this._worldWidth === value) return
    this._worldWidth = value
    if (this.cssObject && this._space === 'world') {
      const scaleX = (this._worldWidth / this._width) * 0.001
      this.cssObject.scale.x = scaleX
    }
  }

  get worldHeight() {
    return this._worldHeight
  }

  set worldHeight(value = defaults.worldHeight) {
    if (this._worldHeight === value) return
    this._worldHeight = value
    if (this.cssObject && this._space === 'world') {
      const scaleY = (this._worldHeight / this._height) * 0.001
      this.cssObject.scale.y = scaleY
    }
  }

  get pointerEvents() {
    return this._pointerEvents
  }

  set pointerEvents(value = defaults.pointerEvents) {
    if (this._pointerEvents === value) return
    this._pointerEvents = value
    if (this.iframeElement) {
      this.iframeElement.style.pointerEvents = value ? 'auto' : 'none'
    }
    if (this.containerElement) {
      this.containerElement.style.pointerEvents = value ? 'auto' : 'none'
    }
  }

  get visible() {
    return this._visible
  }

  set visible(value = defaults.visible) {
    if (this._visible === value) return
    this._visible = value
    if (this.mesh) {
      this.mesh.visible = value
    }
    if (this.containerElement) {
      this.containerElement.style.display = value ? 'block' : 'none'
    }
  }

  get opacity() {
    return this._opacity
  }

  set opacity(value = defaults.opacity) {
    if (this._opacity === value) return
    this._opacity = value
    if (this.material) {
      this.material.opacity = value
    }
    if (this.containerElement) {
      this.containerElement.style.opacity = value
    }
  }

  mount() {
    if (!this.ctx || !this.ctx.world) return
    if (this.ctx.world.network?.isServer) return

    // Add global click debugging (only once)
    if (!window.webviewClickDebugAdded) {
      window.webviewClickDebugAdded = true
      document.addEventListener('click', (e) => {
        console.log('[WebView] Global click detected:', e.target, 'src:', e.target.src || 'no src')
        if (e.target.src && e.target.src.includes('camera-webgi')) {
          console.log('[WebView] ALERT: Click on camera-webgi iframe detected!', e.target.src)
        }
      }, true) // Use capture phase
    }

    if (this._src) {
      this.createWebView()
    }
  }

  commit(didMove) {
    if (!this.ctx || !this.ctx.world) return
    if (this.ctx.world.network?.isServer) return

    if (this._space === 'world' && this.mesh && this.cssObject) {
      if (didMove) {
        this.mesh.matrixWorld.copy(this.matrixWorld)
      }
      // Always sync CSS3D to mesh (handles billboard too)
      this.cssObject.matrix.copy(this.mesh.matrixWorld)
      this.cssObject.matrix.decompose(
        this.cssObject.position,
        this.cssObject.quaternion,
        this.cssObject.scale
      )
    }

    if (this._space === 'screen' && didMove) {
      this.updateScreenPosition()
    }
  }

  lateUpdate(delta) {
    if (!this.ctx || !this.ctx.world) return
    if (this.ctx.world.network?.isServer) return
    if (this._space !== 'world' || !this.mesh) return

    // Apply billboard to mesh (same as before)
    if (this._billboard === 'full') {
      const world = this.ctx.world
      const pos = new THREE.Vector3()
      const qua = new THREE.Quaternion()
      const sca = new THREE.Vector3()
      this.matrixWorld.decompose(pos, qua, sca)
      qua.copy(world.rig.quaternion)
      this.mesh.matrixWorld.compose(pos, qua, sca)
    } else if (this._billboard === 'y') {
      const world = this.ctx.world
      const pos = new THREE.Vector3()
      const qua = new THREE.Quaternion()
      const sca = new THREE.Vector3()
      this.matrixWorld.decompose(pos, qua, sca)
      const euler = new THREE.Euler()
      euler.setFromQuaternion(world.rig.quaternion)
      euler.x = 0
      euler.z = 0
      qua.setFromEuler(euler)
      this.mesh.matrixWorld.compose(pos, qua, sca)
    } else {
      this.mesh.matrixWorld.copy(this.matrixWorld)
    }

    // Sync CSS3D object to mesh position
    if (this.cssObject) {
      this.cssObject.matrix.copy(this.mesh.matrixWorld)
      this.cssObject.matrix.decompose(
        this.cssObject.position,
        this.cssObject.quaternion,
        this.cssObject.scale
      )
    }
  }

  unmount() {
    if (!this.ctx || !this.ctx.world) return
    if (this.ctx.world.network?.isServer) return

    // Clean up CSS3D
    if (this.cssObject) {
      this.ctx.world.graphics.css3dScene.remove(this.cssObject)
      this.cssObject = null
    }

    // Clean up mesh
    if (this.mesh) {
      this.ctx.world.stage.scene.remove(this.mesh)
      this.material?.dispose()
      this.geometry?.dispose()
      this.mesh = null
      this.ctx.world.setHot(this, false)
    }

    // Clean up iframe
    if (this.iframeElement) {
      this.iframeElement.remove()
      this.iframeElement = null
    }

    // Clean up screen-space
    if (this.containerElement) {
      this.containerElement.remove()
      this.containerElement = null
    }

    // Clear update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }

    this.canvas = null
    this.canvasCtx = null
  }

  createWebView() {
    this.destroyWebView()

    if (this._space === 'world') {
      // Create iframe element
      this.iframeElement = document.createElement('iframe')
      this.iframeElement.src = this._src
      this.iframeElement.width = this._width
      this.iframeElement.height = this._height
      this.iframeElement.style.border = 'none'
      this.iframeElement.style.pointerEvents = this._pointerEvents ? 'auto' : 'none'

      // Create CSS3DObject with proper scaling
      this.cssObject = new CSS3DObject(this.iframeElement)
      // CSS3DObject scaling is different - we need much smaller values
      // Convert world dimensions to appropriate CSS3D scale (roughly 1/1000 scale factor)
      const scaleX = (this._worldWidth / this._width) * 0.001
      const scaleY = (this._worldHeight / this._height) * 0.001
      this.cssObject.scale.set(scaleX, scaleY, 1)

      // Debug logging
      console.log('[WebView] Created world-space WebView:', {
        src: this._src,
        width: this._width,
        height: this._height,
        worldWidth: this._worldWidth,
        worldHeight: this._worldHeight,
        scaleX,
        scaleY,
        finalScale: { x: scaleX, y: scaleY, z: 1 }
      })

      // Create geometry and material for collision detection
      this.geometry = new THREE.PlaneGeometry(this._worldWidth, this._worldHeight)
      this.material = new THREE.MeshBasicMaterial({
        opacity: 0,
        transparent: true,
        side: THREE.DoubleSide
      })

      // Create mesh for collision detection
      this.mesh = new THREE.Mesh(this.geometry, this.material)
      this.mesh.matrixAutoUpdate = false
      this.mesh.matrixWorldAutoUpdate = false
      this.mesh.matrixWorld.copy(this.matrixWorld)

      // Add to scenes
      this.ctx.world.stage.scene.add(this.mesh)
      this.ctx.world.graphics.css3dScene.add(this.cssObject)

      this.ctx.world.setHot(this, true)

    } else {
      // Screen-space WebView
      this.containerElement = document.createElement('div')
      this.containerElement.style.position = 'absolute'
      this.containerElement.style.width = `${this._width}px`
      this.containerElement.style.height = `${this._height}px`
      this.containerElement.style.maxWidth = `${this._width}px`
      this.containerElement.style.maxHeight = `${this._height}px`
      this.containerElement.style.overflow = 'hidden'
      this.containerElement.style.pointerEvents = this._pointerEvents ? 'auto' : 'none'
      this.containerElement.style.zIndex = '1000'

      this.iframeElement = document.createElement('iframe')
      this.iframeElement.src = this._src
      this.iframeElement.style.width = '100%'
      this.iframeElement.style.height = '100%'
      this.iframeElement.style.border = 'none'
      this.iframeElement.style.display = 'block'
      this.iframeElement.style.pointerEvents = this._pointerEvents ? 'auto' : 'none'

      this.containerElement.appendChild(this.iframeElement)
      document.body.appendChild(this.containerElement)

      this.updateScreenPosition()
    }
  }


  updateScreenPosition() {
    if (!this.containerElement) return

    // Convert normalized position to screen coordinates
    const x = this.position.x * window.innerWidth
    const y = this.position.y * window.innerHeight

    this.containerElement.style.left = `${x}px`
    this.containerElement.style.top = `${y}px`

    // Ensure the container doesn't exceed screen bounds
    this.containerElement.style.maxWidth = `${this._width}px`
    this.containerElement.style.maxHeight = `${this._height}px`
    this.containerElement.style.overflow = 'hidden'
  }

  destroyWebView() {
    // Clear update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }

    // Clean up world-space mesh
    if (this.mesh) {
      this.ctx.world.stage.scene.remove(this.mesh)
      this.texture?.dispose()
      this.material?.dispose()
      this.geometry?.dispose()
      this.mesh = null
      this.ctx.world.setHot(this, false)
    }

    // Clean up DOM elements
    if (this.iframeElement) {
      this.iframeElement.remove()
      this.iframeElement = null
    }

    if (this.containerElement) {
      this.containerElement.remove()
      this.containerElement = null
    }

    this.canvas = null
    this.canvasCtx = null
  }

  copy(source) {
    super.copy(source)
    this.src = source.src
    this.width = source.width
    this.height = source.height
    this.worldWidth = source.worldWidth
    this.worldHeight = source.worldHeight
    this.space = source.space
    this.billboard = source.billboard
    this.pointerEvents = source.pointerEvents
    this.visible = source.visible
    this.opacity = source.opacity
    return this
  }
}