import { isNumber } from 'lodash-es'
import { Node } from './Node'
import * as THREE from '../extras/three'

// note: defaults can be found in ClientEnvironment.js

export class Sky extends Node {
  constructor(data = {}) {
    super(data)
    this.name = 'sky'
    this.bg = data.bg === undefined ? null : data.bg
    this.hdr = data.hdr === undefined ? null : data.hdr
    this.sunDirection = data.sunDirection === undefined ? null : data.sunDirection
    this.sunIntensity = data.sunIntensity === undefined ? null : data.sunIntensity
  }

  mount() {
    this.handle = this.ctx.world.environment?.addSky(this)
  }

  commit(didMove) {
    if (this.needsRebuild) {
      this.handle?.destroy()
      this.handle = this.ctx.world.environment?.addSky(this)
      this.needsRebuild = false
    }
    if (didMove) {
      // this.worldPos.setFromMatrixPosition(this.matrixWorld)
    }
  }

  unmount() {
    this.handle?.destroy()
  }

  copy(source, recursive) {
    super.copy(source, recursive)
    this._url = source._url
    return this
  }

  get bg() {
    return this._bg
  }

  set bg(value) {
    if (this._bg === value) return
    this._bg = value
    this.needsRebuild = true
    this.setDirty()
  }

  get hdr() {
    return this._hdr
  }

  set hdr(value) {
    if (this._hdr === value) return
    this._hdr = value
    this.needsRebuild = true
    this.setDirty()
  }

  get sunDirection() {
    return this._sunDirection
  }

  set sunDirection(value) {
    if (this._sunDirection === value) return
    this._sunDirection = value?.isVector3 ? value : null
    this.needsRebuild = true
    this.setDirty()
  }

  get sunIntensity() {
    return this._sunIntensity
  }

  set sunIntensity(value) {
    if (this._sunIntensity === value) return
    this._sunIntensity = isNumber(value) ? value : null
    this.needsRebuild = true
    this.setDirty()
  }

  getProxy() {
    var self = this
    if (!this.proxy) {
      let proxy = {
        get bg() {
          return self.bg
        },
        set bg(value) {
          self.bg = value
        },
        get hdr() {
          return self.hdr
        },
        set hdr(value) {
          self.hdr = value
        },
        get sunDirection() {
          return self.sunDirection
        },
        set sunDirection(value) {
          self.sunDirection = value
        },
        get sunIntensity() {
          return self.sunIntensity
        },
        set sunIntensity(value) {
          self.sunIntensity = value
        },
      }
      proxy = Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(super.getProxy())) // inherit Node properties
      this.proxy = proxy
    }
    return this.proxy
  }
}
