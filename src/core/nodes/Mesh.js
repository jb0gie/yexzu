import * as THREE from '../extras/three'
import { isBoolean, isNumber } from 'lodash-es'

import { Node } from './Node'

const defaults = {
  type: 'box',
  width: 1,
  height: 1,
  depth: 1,
  radius: 0.5,
  geometry: null,
  linked: true,
  castShadow: true,
  receiveShadow: true,
  visible: true,
}

const types = ['box', 'sphere', 'geometry']

let boxes = {}
const upsertBox = (width, height, depth) => {
  const key = `${width},${height},${depth}`
  if (!boxes[key]) {
    boxes[key] = new THREE.BoxGeometry(width, height, depth)
  }
  return boxes[key]
}

let spheres = {}
const upsertSphere = radius => {
  const key = radius
  if (!spheres[key]) {
    spheres[key] = new THREE.SphereGeometry(radius, 16, 12)
  }
  return spheres[key]
}

export class Mesh extends Node {
  constructor(data = {}) {
    super(data)
    this.name = 'mesh'
    this.type = data.type || defaults.type
    this.width = isNumber(data.width) ? data.width : defaults.width
    this.height = isNumber(data.height) ? data.height : defaults.height
    this.depth = isNumber(data.depth) ? data.depth : defaults.depth
    this.radius = isNumber(data.radius) ? data.radius : defaults.radius
    this.geometry = data.geometry || defaults.geometry
    this.material = data.material || null
    this.linked = isBoolean(data.linked) ? data.linked : defaults.linked
    this.castShadow = isBoolean(data.castShadow) ? data.castShadow : defaults.castShadow
    this.receiveShadow = isBoolean(data.receiveShadow) ? data.receiveShadow : defaults.receiveShadow
    this.visible = isBoolean(data.visible) ? data.visible : defaults.visible
  }

  mount() {
    if (!this.visible) return
    let geometry
    if (this.type === 'box') {
      geometry = upsertBox(this.width, this.height, this.depth)
    } else if (this.type === 'sphere') {
      geometry = upsertSphere(this.radius)
    } else if (this.type === 'geometry') {
      geometry = this.geometry
    }
    this.handle = this.ctx.world.stage.insert({
      geometry,
      material: this.material,
      linked: this.linked,
      castShadow: this.castShadow,
      receiveShadow: this.receiveShadow,
      matrix: this.matrixWorld,
      node: this,
    })
    this.needsRebuild = false
  }

  commit(didMove) {
    if (this.needsRebuild) {
      this.unmount()
      this.mount()
      return
    }
    if (didMove) {
      if (this.handle) {
        this.handle.move(this.matrixWorld)
      }
    }
  }

  unmount() {
    if (this.handle) {
      this.handle.destroy()
      this.handle = null
    }
  }

  setVisible(visible) {
    if (this.visible === visible) return
    this.visible = visible
    this.needsRebuild = true
    this.setDirty()
  }

  copy(source, recursive) {
    super.copy(source, recursive)
    this.type = source.type
    this.width = source.width
    this.height = source.height
    this.depth = source.depth
    this.radius = source.radius
    this.geometry = source.geometry
    this.material = source.material
    this.linked = source.linked
    this.castShadow = source.castShadow
    this.receiveShadow = source.receiveShadow
    this.visible = source.visible
    return this
  }

  getProxy() {
    if (!this.proxy) {
      const self = this
      let proxy = {
        get type() {
          return self.type
        },
        set type(value) {
          if (!types.includes(value)) throw new Error(`[mesh] invalid type: ${value}`)
          self.type = value
          if (self.handle) {
            self.needsRebuild = true
            self.setDirty()
          }
        },
        get width() {
          return self.width
        },
        set width(value) {
          self.width = value
          if (self.handle && self.type === 'box') {
            self.needsRebuild = true
            self.setDirty()
          }
        },
        get height() {
          return self.height
        },
        set height(value) {
          self.height = value
          if (self.handle && self.type === 'box') {
            self.needsRebuild = true
            self.setDirty()
          }
        },
        get depth() {
          return self.depth
        },
        set depth(value) {
          self.depth = value
          if (self.handle && self.type === 'box') {
            self.needsRebuild = true
            self.setDirty()
          }
        },
        setSize(width, height, depth) {
          self.width = width
          self.height = height
          self.depth = depth
          if (self.handle && self.type === 'box') {
            self.needsRebuild = true
            self.setDirty()
          }
        },
        get radius() {
          return self.radius
        },
        set radius(value) {
          self.radius = value
          if (self.handle && self.type === 'sphere') {
            self.needsRebuild = true
            self.setDirty()
          }
        },
        get geometry() {
          return null // TODO: handle?
        },
        set geometry(value) {
          throw new Error('[mesh] cannot set geometry')
        },
        get material() {
          return self.handle.material
        },
        set material(value) {
          // if (!value) throw new Error('[mesh] material cannot be unset')
          // self.ctx.world._allowMaterial = true
          // self.material = value._ref
          // self.ctx.world._allowMaterial = false
          // self.needsRebuild = true
          // self.setDirty()
        },
        get linked() {
          return self.linked
        },
        set linked(value) {
          self.linked = value
          self.needsRebuild = true
          self.setDirty()
        },
        get castShadow() {
          return self.castShadow
        },
        set castShadow(value) {
          self.castShadow = value
          if (self.handle) {
            self.needsRebuild = true
            self.setDirty()
          }
        },
        get receiveShadow() {
          return self.receiveShadow
        },
        set receiveShadow(value) {
          self.receiveShadow = value
          if (self.handle) {
            self.needsRebuild = true
            self.setDirty()
          }
        },
        get visible() {
          return self.visible
        },
        set visible(value) {
          if (self.visible === value) return
          self.visible = value
          self.needsRebuild = true
          self.setDirty()
        },
      }
      proxy = Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(super.getProxy())) // inherit Node properties
      this.proxy = proxy
    }
    return this.proxy
  }
}
