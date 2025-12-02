import * as THREE from '../extras/three'
import { Node } from './Node'
import { isFunction, isString } from 'lodash-es'

const defaults = {
  onSnap: null,
  onUnsnap: null,
  snapSignal: null,
  unsnapSignal: null,
  rigidbodyType: null,
  enabled: true,
}

export class Snap extends Node {
  constructor(data = {}) {
    super(data)
    this.name = 'snap'
    this.worldPosition = new THREE.Vector3()

    this.onSnap = data.onSnap
    this.onUnsnap = data.onUnsnap
    this.snapSignal = data.snapSignal
    this.unsnapSignal = data.unsnapSignal
    this.rigidbodyType = data.rigidbodyType
    this.enabled = data.enabled

    this.occupied = false
    this.occupiedBy = null
  }

  mount() {
    this.worldPosition.setFromMatrixPosition(this.matrixWorld)
    this.handle = this.ctx.world.snaps?.create(this.worldPosition, this.enabled && !this.ctx.moving)
  }

  commit(didMove) {
    if (didMove) {
      this.worldPosition.setFromMatrixPosition(this.matrixWorld)
      this.handle?.move()
    }
  }

  snap(grabbable) {
    if (!this.enabled || this.occupied) return false

    this.occupied = true
    this.occupiedBy = grabbable

    if (this.rigidbodyType && grabbable) {
      const rigidbody = grabbable.findNode(node => node.name === 'rigidbody')
      if (rigidbody) {
        rigidbody.type = this.rigidbodyType
      }
    }

    if (this.snapSignal) {
      this.ctx.world.emit(this.snapSignal, { snap: this, grabbable })
    }

    if (this.onSnap) {
      this.onSnap(this, grabbable)
    }

    return true
  }

  unsnap(grabbable) {
    if (!this.occupied || this.occupiedBy !== grabbable) return false

    this.occupied = false
    this.occupiedBy = null

    if (this.unsnapSignal) {
      this.ctx.world.emit(this.unsnapSignal, { snap: this, grabbable })
    }

    if (this.onUnsnap) {
      this.onUnsnap(this, grabbable)
    }

    return true
  }

  unmount() {
    this.handle?.destroy()
    this.handle = null
  }

  copy(source, recursive) {
    super.copy(source, recursive)
    this.onSnap = source.onSnap
    this.onUnsnap = source.onUnsnap
    this.snapSignal = source.snapSignal
    this.unsnapSignal = source.unsnapSignal
    this.rigidbodyType = source.rigidbodyType
    this.enabled = source.enabled
    return this
  }

  getProxy() {
    if (!this.proxy) {
      const self = this
      let proxy = {
        get occupied() {
          return self.occupied
        },
        get enabled() {
          return self.enabled
        },
        set enabled(value) {
          self.enabled = value
        },
        snap(grabbable) {
          return self.snap(grabbable)
        },
        unsnap(grabbable) {
          return self.unsnap(grabbable)
        },
      }
      proxy = Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(super.getProxy()))
      this.proxy = proxy
    }
    return this.proxy
  }
}
