import * as THREE from '../extras/three'
import { isBoolean, isNumber, isString } from 'lodash-es'
import { Node } from './Node'

const defaults = {
  src: null,
  width: 640,
  height: 480,
  space: 'world', // 'world' or 'screen'
  size: 0.01, // Scale factor for world space (pixels to meters)
  visible: true,
  opacity: 1,
}

// Temporarily allow all URLs for debugging
const ALLOW_ALL_URLS = true

export class WebView extends Node {
  constructor(data = {}) {
    super(data)
    this.name = 'webview'
    
    this.src = data.src
    this.width = data.width
    this.height = data.height
    this.space = data.space
    this.size = data.size
    this.visible = data.visible
    this.opacity = data.opacity
    
    this.containerElement = null
    this.iframeElement = null
  }
  
  mount() {
    if (!this.ctx || !this.ctx.world) return
    if (this.ctx.world.network?.isServer) return
    
    // Register for hot updates if world-space
    if (this._space === 'world') {
      this.ctx.world.setHot(this, true)
    }
    
    // Create the webview immediately
    if (this._src) {
      this.createWebView()
    }
  }
  
  commit(didMove) {
    if (!this.ctx || !this.ctx.world) return
    if (this.ctx.world.network?.isServer) return
    if (!this.containerElement) return
    
    // Update position if moved
    if (didMove) {
      this.updatePosition()
    }
  }
  
  lateUpdate(delta) {
    if (!this.ctx || !this.ctx.world) return
    if (this.ctx.world.network?.isServer) return
    if (!this.containerElement) return
    
    // Always update world-space views to track camera
    if (this._space === 'world') {
      this.updateMatrixWorld()
      this.updatePosition()
    }
  }
  
  updateMatrixWorld() {
    // First update local matrix from position, rotation, scale
    this.matrix.compose(this.position, this.quaternion, this.scale)
    
    // Then update world matrix based on parent hierarchy
    if (this.parent && this.parent.matrixWorld) {
      this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)
    } else {
      this.matrixWorld.copy(this.matrix)
    }
  }
  
  unmount() {
    if (!this.ctx || !this.ctx.world) return
    if (this.ctx.world.network?.isServer) return
    
    // Unregister from hot updates
    if (this._space === 'world') {
      this.ctx.world.setHot(this, false)
    }
    
    this.destroyWebView()
  }
  
  createWebView() {
    this.destroyWebView()
    
    // Create container
    this.containerElement = document.createElement('div')
    this.containerElement.style.width = `${this._width}px`
    this.containerElement.style.height = `${this._height}px`
    this.containerElement.style.backgroundColor = 'white'
    this.containerElement.style.overflow = 'hidden'
    this.containerElement.style.pointerEvents = 'auto'
    this.containerElement.style.userSelect = 'auto'
    this.containerElement.style.opacity = this._opacity
    this.containerElement.style.position = 'fixed'
    this.containerElement.style.borderRadius = '8px'
    this.containerElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
    this.containerElement.style.zIndex = '1000'
    
    // Create iframe
    this.iframeElement = document.createElement('iframe')
    this.iframeElement.src = this._src
    this.iframeElement.style.width = '100%'
    this.iframeElement.style.height = '100%'
    this.iframeElement.style.border = 'none'
    this.iframeElement.style.backgroundColor = 'transparent'
    
    this.containerElement.appendChild(this.iframeElement)
    document.body.appendChild(this.containerElement)
    
    // Update initial position
    this.updatePosition()
    
    console.log(`webview: Created ${this._space}-space view with URL:`, this._src)
  }
  
  destroyWebView() {
    if (this.containerElement) {
      this.containerElement.remove()
      this.containerElement = null
    }
    this.iframeElement = null
  }
  
  updatePosition() {
    if (!this.containerElement) return
    if (!this.ctx || !this.ctx.world) return
    
    const world = this.ctx.world
    const camera = world.camera
    const canvas = world.graphics?.renderer?.domElement
    
    if (!canvas) return
    
    if (this._space === 'world') {
      // World space - position in 3D
      const worldPos = new THREE.Vector3()
      worldPos.setFromMatrixPosition(this.matrixWorld)
      
      // Project to screen coordinates
      const vector = worldPos.clone()
      vector.project(camera)
      
      // Convert to screen coordinates
      const rect = canvas.getBoundingClientRect()
      const widthHalf = rect.width / 2
      const heightHalf = rect.height / 2
      
      const x = (vector.x * widthHalf) + widthHalf + rect.left
      const y = -(vector.y * heightHalf) + heightHalf + rect.top
      
      // Apply scaling based on distance
      const cameraPos = new THREE.Vector3()
      cameraPos.setFromMatrixPosition(camera.matrixWorld)
      const distance = cameraPos.distanceTo(worldPos)
      const scale = this._size * 100 / distance
      const scaledWidth = this._width * scale
      const scaledHeight = this._height * scale
      
      // Update container
      this.containerElement.style.left = `${x - scaledWidth / 2}px`
      this.containerElement.style.top = `${y - scaledHeight / 2}px`
      this.containerElement.style.width = `${scaledWidth}px`
      this.containerElement.style.height = `${scaledHeight}px`
      this.containerElement.style.display = this._visible ? 'block' : 'none'
    } else {
      // Screen space - fixed position relative to viewport
      const x = this.position.x * window.innerWidth
      const y = this.position.y * window.innerHeight
      
      this.containerElement.style.left = `${x - this._width / 2}px`
      this.containerElement.style.top = `${y - this._height / 2}px`
      this.containerElement.style.width = `${this._width}px`
      this.containerElement.style.height = `${this._height}px`
      this.containerElement.style.display = this._visible ? 'block' : 'none'
    }
  }
  
  copy(source, recursive) {
    super.copy(source, recursive)
    this._src = source._src
    this._width = source._width
    this._height = source._height
    this._space = source._space
    this._size = source._size
    this._visible = source._visible
    this._opacity = source._opacity
    return this
  }
  
  get src() {
    return this._src
  }
  
  set src(value = defaults.src) {
    if (value !== null && !isString(value)) {
      throw new Error(`[webview] src not a string`)
    }
    if (this._src === value) return
    this._src = value
    
    if (this.ctx && this.ctx.world) {
      if (this._src) {
        this.createWebView()
      } else {
        this.destroyWebView()
      }
    }
  }
  
  get width() {
    return this._width
  }
  
  set width(value = defaults.width) {
    if (!isNumber(value)) {
      throw new Error(`[webview] width not a number`)
    }
    if (this._width === value) return
    this._width = value
    if (this.containerElement) {
      this.updatePosition()
    }
  }
  
  get height() {
    return this._height
  }
  
  set height(value = defaults.height) {
    if (!isNumber(value)) {
      throw new Error(`[webview] height not a number`)
    }
    if (this._height === value) return
    this._height = value
    if (this.containerElement) {
      this.updatePosition()
    }
  }
  
  get space() {
    return this._space
  }
  
  set space(value = defaults.space) {
    if (!isString(value) || !['world', 'screen'].includes(value)) {
      throw new Error(`[webview] space must be 'world' or 'screen'`)
    }
    if (this._space === value) return
    this._space = value
    if (this.containerElement && this._src) {
      this.createWebView()
    }
  }
  
  get size() {
    return this._size
  }
  
  set size(value = defaults.size) {
    if (!isNumber(value)) {
      throw new Error(`[webview] size not a number`)
    }
    if (this._size === value) return
    this._size = value
    if (this.containerElement && this._space === 'world') {
      this.updatePosition()
    }
  }
  
  get visible() {
    return this._visible
  }
  
  set visible(value = defaults.visible) {
    if (!isBoolean(value)) {
      throw new Error(`[webview] visible not a boolean`)
    }
    if (this._visible === value) return
    this._visible = value
    if (this.containerElement) {
      this.updatePosition()
    }
  }
  
  get opacity() {
    return this._opacity
  }
  
  set opacity(value = defaults.opacity) {
    if (!isNumber(value) || value < 0 || value > 1) {
      throw new Error(`[webview] opacity must be a number between 0 and 1`)
    }
    if (this._opacity === value) return
    this._opacity = value
    if (this.containerElement) {
      this.containerElement.style.opacity = this._opacity
    }
  }
  
  getProxy() {
    if (!this.proxy) {
      const self = this
      let proxy = {
        get src() {
          return self.src
        },
        set src(value) {
          self.src = value
        },
        get width() {
          return self.width
        },
        set width(value) {
          self.width = value
        },
        get height() {
          return self.height
        },
        set height(value) {
          self.height = value
        },
        get space() {
          return self.space
        },
        set space(value) {
          self.space = value
        },
        get size() {
          return self.size
        },
        set size(value) {
          self.size = value
        },
        get visible() {
          return self.visible
        },
        set visible(value) {
          self.visible = value
        },
        get opacity() {
          return self.opacity
        },
        set opacity(value) {
          self.opacity = value
        },
      }
      proxy = Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(super.getProxy())) // inherit Node properties
      this.proxy = proxy
    }
    return this.proxy
  }
}