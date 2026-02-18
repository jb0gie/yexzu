import { Node } from './Node'

export class Group extends Node {
  constructor(data = {}) {
    super(data)
    this.name = 'group'
    this._audioReactiveMeshes = null
  }

  linkAudioReactivity(sourceId, options = {}) {
    if (!this.ctx.world.audioReactivity) return

    this.unlinkAudioReactivity()

    const meshes = []
    this.traverse(node => {
      if (node.name === 'mesh' && node.linkAudioReactivity) {
        node.linkAudioReactivity(sourceId, options)
        meshes.push(node)
      }
    })

    this._audioReactiveMeshes = meshes
  }

  unlinkAudioReactivity() {
    if (!this.ctx.world.audioReactivity) return

    if (this._audioReactiveMeshes) {
      for (const mesh of this._audioReactiveMeshes) {
        if (mesh.unlinkAudioReactivity) {
          mesh.unlinkAudioReactivity()
        }
      }
      this._audioReactiveMeshes = null
    }
  }

  copy(source, recursive) {
    super.copy(source, recursive)
    return this
  }

  getProxy() {
    if (!this.proxy) {
      const self = this
      let proxy = {
        linkAudioReactivity(sourceId, options) {
          self.linkAudioReactivity(sourceId, options)
        },
        unlinkAudioReactivity() {
          self.unlinkAudioReactivity()
        },
      }
      proxy = Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(super.getProxy())) // inherit Node properties
      this.proxy = proxy
    }
    return this.proxy
  }
}
