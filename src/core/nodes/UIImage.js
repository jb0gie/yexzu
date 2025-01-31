import { isNumber } from 'lodash-es'
import { Node } from './Node'
import { Display } from '../extras/yoga'

const defaults = {
  display: 'flex',
  src: null,
  width: null,
  height: null,
  objectFit: 'contain', // contain, cover, fill
  backgroundColor: null,
}

export class UIImage extends Node {
  constructor(data = {}) {
    super(data)
    this.name = 'uiimage'

    this.display = data.display === undefined ? defaults.display : data.display
    this.src = data.src === undefined ? defaults.src : data.src
    this.width = data.width === undefined ? defaults.width : data.width
    this.height = data.height === undefined ? defaults.height : data.height
    this.objectFit = data.objectFit === undefined ? defaults.objectFit : data.objectFit
    this.backgroundColor = data.backgroundColor === undefined ? defaults.backgroundColor : data.backgroundColor

    this.img = null
  }

  draw(ctx, offsetLeft, offsetTop) {
    if (this._display === 'none' || !this.img) return
    const left = offsetLeft + this.yogaNode.getComputedLeft()
    const top = offsetTop + this.yogaNode.getComputedTop()
    const width = this.yogaNode.getComputedWidth()
    const height = this.yogaNode.getComputedHeight()
    ctx.save()
    ctx.beginPath()
    ctx.rect(left, top, width, height)
    ctx.clip()
    if (this._backgroundColor) {
      ctx.fillStyle = this._backgroundColor
      ctx.fillRect(left, top, width, height)
    }
    if (this.img) {
      const drawParams = this.calculateDrawParameters(this.img.width, this.img.height, width, height)
      ctx.drawImage(this.img, left + drawParams.x, top + drawParams.y, drawParams.width, drawParams.height)
    }
    ctx.restore()
    this.box = { left, top, width, height }
  }

  mount() {
    if (this.ctx.world.network.isServer) return
    this.ui = this.parent?.ui
    if (!this.ui) return console.error('uiimage: must be child of ui node')
    this.yogaNode = Yoga.Node.create()
    this.yogaNode.setDisplay(Display[this._display])
    // measure function
    this.yogaNode.setMeasureFunc((width, widthMode, height, heightMode) => {
      // no image? zero size
      if (!this.img) {
        return { width: 0, height: 0 }
      }
      const imgAspectRatio = this.img.width / this.img.height
      let finalWidth
      let finalHeight
      // handle explicitly set dimensions first
      if (this._width !== null && this._height !== null) {
        return {
          width: this._width * this.ui._res,
          height: this._height * this.ui._res,
        }
      }
      // handle cases where one dimension is specified
      if (this._width !== null) {
        finalWidth = this._width * this.ui._res
        finalHeight = finalWidth / imgAspectRatio
      } else if (this._height !== null) {
        finalHeight = this._height * this.ui._res
        finalWidth = finalHeight * imgAspectRatio
      } else {
        // neither dimension specified - use natural size with constraints
        if (widthMode === Yoga.MEASURE_MODE_EXACTLY) {
          finalWidth = width
          finalHeight = width / imgAspectRatio
        } else if (widthMode === Yoga.MEASURE_MODE_AT_MOST) {
          finalWidth = Math.min(this.img.width * this.ui._res, width)
          finalHeight = finalWidth / imgAspectRatio
        } else {
          // use natural size
          finalWidth = this.img.width * this.ui._res
          finalHeight = this.img.height * this.ui._res
        }
        // apply height constraints if any
        if (heightMode === Yoga.MEASURE_MODE_EXACTLY) {
          finalHeight = height
          if (this._objectFit === 'contain') {
            finalWidth = Math.min(finalWidth, height * imgAspectRatio)
          }
        } else if (heightMode === Yoga.MEASURE_MODE_AT_MOST && finalHeight > height) {
          finalHeight = height
          finalWidth = height * imgAspectRatio
        }
      }
      return { width: finalWidth, height: finalHeight }
    })
    this.parent.yogaNode.insertChild(this.yogaNode, this.parent.yogaNode.getChildCount())
    if (this._src && !this.img) {
      this.loadImage(this._src)
    }
  }

  commit() {
    // ...
  }

  unmount() {
    if (this.ctx.world.network.isServer) return
    if (this.yogaNode) {
      this.parent.yogaNode?.removeChild(this.yogaNode)
      this.yogaNode.free()
      this.yogaNode = null
      this.box = null
      this.img = null
      this.ui?.redraw()
    }
  }

  loadImage(src) {
    return new Promise(async (resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        if (!this.ui) return
        this.img = img
        this.yogaNode?.markDirty()
        this.ui?.redraw()
        resolve(img)
      }
      img.onerror = error => {
        console.error('uiimage: failed to load:', error)
        reject(error)
      }
      img.src = src
    })
  }

  calculateDrawParameters(imgWidth, imgHeight, containerWidth, containerHeight) {
    const aspectRatio = imgWidth / imgHeight
    switch (this._objectFit) {
      case 'cover': {
        // Scale to cover entire container while maintaining aspect ratio
        if (containerWidth / containerHeight > aspectRatio) {
          const width = containerWidth
          const height = width / aspectRatio
          return {
            width,
            height,
            x: 0,
            y: (containerHeight - height) / 2,
          }
        } else {
          const height = containerHeight
          const width = height * aspectRatio
          return {
            width,
            height,
            x: (containerWidth - width) / 2,
            y: 0,
          }
        }
      }
      case 'contain': {
        // Scale to fit within container while maintaining aspect ratio
        if (containerWidth / containerHeight > aspectRatio) {
          const height = containerHeight
          const width = height * aspectRatio
          return {
            width,
            height,
            x: (containerWidth - width) / 2,
            y: 0,
          }
        } else {
          const width = containerWidth
          const height = width / aspectRatio
          return {
            width,
            height,
            x: 0,
            y: (containerHeight - height) / 2,
          }
        }
      }
      case 'fill':
      default:
        // Stretch to fill container
        return {
          width: containerWidth,
          height: containerHeight,
          x: 0,
          y: 0,
        }
    }
  }

  get display() {
    return this._display
  }

  set display(value) {
    if (this._display === value) return
    this._display = value
    this.yogaNode?.setDisplay(Display[this._display])
    this.ui?.redraw()
  }

  get src() {
    return this._src
  }

  set src(value) {
    if (this._src === value) return
    this._src = value || defaults.src
    if (this._src) {
      this.loadImage(this._src)
    } else {
      this.img = null
      this.ui?.redraw()
    }
  }

  get width() {
    return this._width
  }

  set width(value) {
    if (this._width === value) return
    this._width = isNumber(value) ? value : defaults.width
    this.yogaNode?.markDirty()
    this.ui?.redraw()
  }

  get height() {
    return this._height
  }

  set height(value) {
    if (this._height === value) return
    this._height = isNumber(value) ? value : defaults.height
    this.yogaNode?.markDirty()
    this.ui?.redraw()
  }

  get objectFit() {
    return this._objectFit
  }

  set objectFit(value) {
    if (this._objectFit === value) return
    this._objectFit = value || defaults.objectFit
    this.ui?.redraw()
  }

  get backgroundColor() {
    return this._backgroundColor
  }

  set backgroundColor(value) {
    if (this._backgroundColor === value) return
    this._backgroundColor = value || defaults.backgroundColor
    this.ui?.redraw()
  }

  getProxy() {
    if (!this.proxy) {
      const self = this
      let proxy = {
        get display() {
          return self.display
        },
        set display(value) {
          self.display = value
        },
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
        get objectFit() {
          return self.objectFit
        },
        set objectFit(value) {
          self.objectFit = value
        },
        get backgroundColor() {
          return self.backgroundColor
        },
        set backgroundColor(value) {
          self.backgroundColor = value
        },
      }
      proxy = Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(super.getProxy())) // inherit Node properties
      this.proxy = proxy
    }
    return this.proxy
  }
}
