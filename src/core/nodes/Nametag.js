import { Node } from './Node'

const defaults = {
  label: '...',
}

export class Nametag extends Node {
  constructor(data = {}) {
    super(data)
    this.name = 'nametag'

    this._label = data.label || defaults.label
  }

  mount() {
    if (this.ctx.world.nametags) {
      this.handle = this.ctx.world.nametags.add(this.label)
      this.handle?.move(this.matrixWorld)
    }
  }

  commit(didMove) {
    if (didMove) {
      this.handle?.move(this.matrixWorld)
    }
  }

  unmount() {
    this.handle?.destroy()
    this.handle = null
  }

  copy(source, recursive) {
    super.copy(source, recursive)
    this.label = source.label
    return this
  }

  get label() {
    return this._label
  }

  set label(value) {
    if (this._label === value) return
    this._label = value
    this.handle?.rename(value)
  }

  getProxy() {
    var self = this
    if (!this.proxy) {
      let proxy = {
        get label() {
          return self.label
        },
        set label(value) {
          self.label = value
        },
      }
      proxy = Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(super.getProxy())) // inherit Node properties
      this.proxy = proxy
    }
    return this.proxy
  }
}
