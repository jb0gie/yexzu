import { isBoolean, isNumber, isString } from 'lodash-es'
import * as THREE from '../extras/three'
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

import { Node } from './Node'

const defaults = {
  src: null,
  html: null,
  width: 1,
  height: 1,
  factor: 100,
  doubleside: false,
  space: 'world',
  pointerEvents: false, // Enable to allow iframe interaction
}

const v1 = new THREE.Vector3()

export class WebView extends Node {
  constructor(data = {}) {
    super(data)
    this.name = 'webview'

    this.src = data.src
    this.html = data.html
    this.width = data.width
    this.height = data.height
    this.factor = data.factor
    this.doubleside = data.doubleside
    this.space = data.space
    this.pointerEvents = data.pointerEvents
  }

  copy(source, recursive) {
    super.copy(source, recursive)
    this._src = source._src
    this._html = source._html
    this._width = source._width
    this._height = source._height
    this._factor = source._factor
    this._doubleside = source._doubleside
    this._space = source._space
    this._pointerEvents = source._pointerEvents
    return this
  }

  mount() {
    this.build()
  }

  build() {
    this.needsRebuild = false
    if (this.ctx.world.network.isServer) return
    this.unbuild()

    if (this._space === 'screen') {
      this.buildScreen()
    } else {
      this.buildWorld()
    }
  }

  buildWorld() {
    const hasContent = this._src || this._html

    // Create the black mesh (cutout)
    const geometry = new THREE.PlaneGeometry(this._width, this._height)
    const material = new THREE.MeshBasicMaterial({
      opacity: 0,
      color: new THREE.Color('black'),
      blending: hasContent ? THREE.NoBlending : THREE.NormalBlending,
      side: this._doubleside ? THREE.DoubleSide : THREE.FrontSide,
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.matrixWorld.copy(this.matrixWorld)
    this.mesh.matrixAutoUpdate = false
    this.mesh.matrixWorldAutoUpdate = false
    this.ctx.world.stage.scene.add(this.mesh)

    // Add to octree for raycasting
    this.sItem = {
      matrix: this.matrixWorld,
      geometry,
      material,
      getEntity: () => this.ctx.entity,
      node: this,
    }
    this.ctx.world.stage.octree.insert(this.sItem)

    // Create the CSS3D iframe (only if we have content)
    if (hasContent) {
      const widthPx = `${this._width * this._factor}px`
      const heightPx = `${this._height * this._factor}px`

      // Container
      const container = document.createElement('div')
      container.style.width = widthPx
      container.style.height = heightPx

      // Inner wrapper (for mouse events)
      const inner = document.createElement('div')
      inner.style.width = widthPx
      inner.style.height = heightPx
      inner.style.backgroundColor = '#000'
      inner.style.pointerEvents = 'auto'

      // Iframe
      const iframe = document.createElement('iframe')
      iframe.frameBorder = '0'
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      iframe.scrolling = 'yes'
      iframe.style.overflow = 'auto'
      iframe.allowFullscreen = true
      iframe.style.width = widthPx
      iframe.style.height = heightPx
      iframe.style.border = '0px'
      iframe.style.pointerEvents = 'none'
      if (this._html) {
        iframe.srcdoc = this._html
      } else {
        iframe.src = this._src
      }

      container.appendChild(inner)
      inner.appendChild(iframe)

      // Create CSS3DObject
      this.objectCSS = new CSS3DObject(container)
      this.objectCSS.target = this.mesh // important: the mesh to follow
      this.mesh.updateMatrixWorld()
      this.mesh.matrixWorld.decompose(this.objectCSS.position, this.objectCSS.quaternion, v1)
      this.objectCSS.scale.setScalar(1 / this._factor)

      // Store references
      this.iframe = iframe
      this.inner = inner

      // Set pointer events based on property (desktop only)
      // For mobile, always enable pointer events
      const isDesktop = !this.ctx.world.network.isServer &&
        this.ctx.world.controls &&
        !/iPhone|iPad|iPod|Android/i.test(globalThis.navigator?.userAgent || '')

      if (!isDesktop) {
        iframe.style.pointerEvents = 'auto'
      }

      container.style.pointerEvents = 'auto'
      // ULTIMATE SIMPLIFIED: Just set pointer-events on iframe
      // Canvas alpha compositing lets events pass through to CSS3D layer
      // No event listeners needed - let browser handle it naturally
      if (this._pointerEvents) {
        iframe.style.pointerEvents = 'auto'
        console.log('WebView: pointer-events set to auto (natural interaction)')
      }

      // Store cleanup function
      this.cleanup = () => {
        // Reset iframe pointer events
        if (this.iframe) this.iframe.style.pointerEvents = 'none'
      }

      this.ctx.world.css.add(this.objectCSS)
    }

    this.ctx.world.setHot(this, true)
  }

  buildScreen() {
    const widthPx = `${this._width * this._factor}px`
    const heightPx = `${this._height * this._factor}px`

    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.width = widthPx
    container.style.height = heightPx

    const inner = document.createElement('div')
    inner.style.width = widthPx
    inner.style.height = heightPx

    const iframe = document.createElement('iframe')
    iframe.frameBorder = '0'
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    iframe.allowFullscreen = true
    iframe.style.width = widthPx
    iframe.style.height = heightPx
    iframe.style.border = '0px'
    if (this._html) {
      iframe.srcdoc = this._html
    } else {
      iframe.src = this._src
    }

    container.appendChild(inner)
    inner.appendChild(iframe)

    this.ctx.world.ui.appendChild(container)
    this.container = container
    this.iframe = iframe
  }

  commit(didMove) {
    if (this.needsRebuild) {
      this.build()
      return
    }
    if (didMove) {
      if (this.mesh) {
        this.mesh.matrixWorld.copy(this.matrixWorld)
      }
      if (this.sItem) {
        this.ctx.world.stage.octree.move(this.sItem)
      }
    }
  }

  unmount() {
    this.unbuild()
  }

  unbuild() {
    // Clean up CSS3D object
    if (this.objectCSS) {
      this.ctx.world.css.remove(this.objectCSS)
      this.objectCSS = null
    }

    // Clean up iframe
    if (this.iframe) {
      this.iframe.remove()
      this.iframe = null
    }

    // Clean up container div
    if (this.container) {
      this.container.remove()
      this.container = null
    }

    // Clean up screen-space elements
    if (this.inner) {
      this.inner.remove()
      this.inner = null
    }

    // Clean up mesh
    if (this.mesh) {
      this.ctx.world.stage.scene.remove(this.mesh)
      if (this.sItem) {
        this.ctx.world.stage.octree.remove(this.sItem)
        this.sItem = null
      }
      this.mesh.geometry.dispose()
      this.mesh.material.dispose()
      this.mesh = null
    }

    this.ctx.world.setHot(this, false)
  }

  set src(value) {
    if (this._src === value) return
    this._src = isString(value) ? value : null
    this.needsRebuild = true
    this.setDirty()
  }
  get src() {
    return this._src
  }

  set html(value) {
    if (this._html === value) return
    this._html = isString(value) ? value : null
    this.needsRebuild = true
    this.setDirty()
  }
  get html() {
    return this._html
  }

  set width(value) {
    if (this._width === value) return
    this._width = isNumber(value) ? value : defaults.width
    this.needsRebuild = true
    this.setDirty()
  }
  get width() {
    return this._width
  }

  set height(value) {
    if (this._height === value) return
    this._height = isNumber(value) ? value : defaults.height
    this.needsRebuild = true
    this.setDirty()
  }
  get height() {
    return this._height
  }

  set factor(value) {
    if (this._factor === value) return
    this._factor = isNumber(value) ? value : defaults.factor
    this.needsRebuild = true
    this.setDirty()
  }
  get factor() {
    return this._factor
  }

  set doubleside(value) {
    if (this._doubleside === value) return
    this._doubleside = isBoolean(value) ? value : defaults.doubleside
    this.needsRebuild = true
    this.setDirty()
  }
  get doubleside() {
    return this._doubleside
  }

  set space(value) {
    if (this._space === value) return
    this._space = value === 'screen' || value === 'world' ? value : defaults.space
    this.needsRebuild = true
    this.setDirty()
  }
  get space() {
    return this._space
  }

  set pointerEvents(value) {
    if (this._pointerEvents === value) return
    this._pointerEvents = isBoolean(value) ? value : defaults.pointerEvents
    this.needsRebuild = true
    this.setDirty()
  }
  get pointerEvents() {
    return this._pointerEvents
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
        get html() {
          return self.html
        },
        set html(value) {
          self.html = value
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
        get factor() {
          return self.factor
        },
        set factor(value) {
          self.factor = value
        },
        get doubleside() {
          return self.doubleside
        },
        set doubleside(value) {
          self.doubleside = value
        },
        get space() {
          return self.space
        },
        set space(value) {
          self.space = value
        },
      }
      proxy = Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(super.getProxy()))
      this.proxy = proxy
    }
    return this.proxy
  }
}
