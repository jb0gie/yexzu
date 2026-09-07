import * as THREE from '../extras/three'
import { Node } from './Node'
import { isFunction, isString } from 'lodash-es'

const _v1 = new THREE.Vector3()
const _v2 = new THREE.Vector3()
const _q1 = new THREE.Quaternion()
const _m1 = new THREE.Matrix4()
const _m2 = new THREE.Matrix4()

const defaults = {
  enabled: true,
  grabDistance: 5,
  snapDistance: 1,
  snapToPoints: true,
  returnOnRelease: false,
  returnPosition: null,
  returnRotation: null,
  onGrab: null,
  onRelease: null,
  onSnap: null,
  onUnsnap: null,
  snapSignal: null,
  unsnapSignal: null,
  rigidbodyTypeOnSnap: null,
  rigidbodyTypeOnRelease: null,
  outlineColor: '#ffffff',
  outlineEnabled: true,
}

export class Grabbable extends Node {
  constructor(data = {}) {
    super(data)
    this.name = 'grabbable'

    this.enabled = data.enabled
    this.grabDistance = data.grabDistance
    this.snapDistance = data.snapDistance
    this.snapToPoints = data.snapToPoints
    this.returnOnRelease = data.returnOnRelease
    this.returnPosition = data.returnPosition
    this.returnRotation = data.returnRotation
    this.onGrab = data.onGrab
    this.onRelease = data.onRelease
    this.onSnap = data.onSnap
    this.onUnsnap = data.onUnsnap
    this.snapSignal = data.snapSignal
    this.unsnapSignal = data.unsnapSignal
    this.rigidbodyTypeOnSnap = data.rigidbodyTypeOnSnap
    this.rigidbodyTypeOnRelease = data.rigidbodyTypeOnRelease
    this.outlineColor = data.outlineColor
    this.outlineEnabled = data.outlineEnabled

    this.isGrabbed = false
    this.isSnapped = false
    this.grabbedBy = null
    this.snapPoint = null
    this.originalParent = null
    this.originalPosition = new THREE.Vector3()
    this.originalRotation = new THREE.Quaternion()
    this.originalRigidbodyType = null

    this.touchStartTime = 0
    this.touchStartPosition = new THREE.Vector2()
    this.lastTouchTime = 0
    this.touchCount = 0

    this._raycaster = new THREE.Raycaster()
    this._grabOffset = new THREE.Vector3()
    
    this.control = null
    this.outlineEffect = null
    this.outlineEffect = null
  }

  mount() {
    this.originalPosition.copy(this.position)
    this.originalRotation.copy(this.quaternion)
    this.originalParent = this.parent

    const rigidbody = this.findNode(node => node.name === 'rigidbody')
    if (rigidbody) {
      this.originalRigidbodyType = rigidbody.type
    }

    if (this.ctx.world.isClient) {
      this.setupInputHandlers()
      this.setupOutline().catch(err => {
        console.error('[Grabbable] Failed to setup outline:', err)
      })
    }
  }

  async setupOutline() {
    if (!this.outlineEnabled) return
    
    const graphics = this.ctx.world.graphics
    if (!graphics || !graphics.composer) return

    try {
      const { OutlineEffect, BlendFunction } = await import('postprocessing')
      
      this.outlineEffect = new OutlineEffect(this.ctx.world.scene, this.ctx.world.camera, {
        blendFunction: BlendFunction.SCREEN,
        patternTexture: null,
        edgeStrength: 2.5,
        pulseSpeed: 0.0,
        visibleEdgeColor: new THREE.Color(this.outlineColor),
        hiddenEdgeColor: new THREE.Color(0x22090a),
        blur: false,
        xRay: true,
        multisampling: 0
      })
      
      graphics.composer.addPass(new EffectPass(this.ctx.world.camera, this.outlineEffect))
      
      const selection = new Selection()
      selection.add(this)
      this.outlineEffect.selection = selection
      
    } catch (error) {
      console.warn('[Grabbable] Failed to setup outline effect:', error)
    }
  }

  setupInputHandlers() {
    if (!this.enabled || !this.ctx.world.isClient) return

    const viewport = this.ctx.world.controls?.viewport
    if (!viewport) return

    this.onPointerDown = this.handlePointerDown.bind(this)
    this.onPointerUp = this.handlePointerUp.bind(this)
    this.onTouchStart = this.handleTouchStart.bind(this)
    this.onTouchEnd = this.handleTouchEnd.bind(this)

    viewport.addEventListener('pointerdown', this.onPointerDown)
    viewport.addEventListener('pointerup', this.onPointerUp)
    viewport.addEventListener('touchstart', this.onTouchStart)
    viewport.addEventListener('touchend', this.onTouchEnd)

    this.control = this.ctx.world.controls.bind({ priority: 50 })
  }

  handlePointerDown(event) {
    if (!this.enabled || event.button !== 0) return

    if (this.isPinned()) return

    const camera = this.ctx.world.camera
    if (!camera) return

    this._raycaster.setFromCamera(
      {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      },
      camera
    )

    const intersects = this._raycaster.intersectObject(this, true)
    if (intersects.length > 0) {
      this.grab(intersects[0].point)
    }
  }

  handlePointerUp(event) {
    if (this.isGrabbed) {
      this.release()
    }
  }

  handleTouchStart(event) {
    if (!this.enabled || event.touches.length !== 1) return

    if (this.isPinned()) return

    const touch = event.touches[0]
    this.touchStartTime = Date.now()
    this.touchStartPosition.set(touch.clientX, touch.clientY)

    const now = Date.now()
    if (now - this.lastTouchTime < 300) {
      this.touchCount++
    } else {
      this.touchCount = 1
    }
    this.lastTouchTime = now

    const camera = this.ctx.world.camera
    if (!camera) return

    this._raycaster.setFromCamera(
      {
        x: (touch.clientX / window.innerWidth) * 2 - 1,
        y: -(touch.clientY / window.innerHeight) * 2 + 1,
      },
      camera
    )

    const intersects = this._raycaster.intersectObject(this, true)
    if (intersects.length > 0) {
      if (this.touchCount >= 2) {
        this.grab(intersects[0].point)
      }
    }
  }

  handleTouchEnd(event) {
    const touchDuration = Date.now() - this.touchStartTime
    const touchDistance = this.touchStartPosition.distanceTo(
      new THREE.Vector2(event.changedTouches[0].clientX, event.changedTouches[0].clientY)
    )

    if (this.isGrabbed && (touchDuration > 500 || touchDistance < 10)) {
      this.release()
    }
  }

  grab(hitPoint) {
    if (this.isGrabbed) return

    const player = this.ctx.entity
    if (!player || !player.isPlayer) return

    const camera = this.ctx.world.camera
    if (!camera) return

    const distance = this.position.distanceTo(camera.position)
    if (distance > this.grabDistance) return

    this.isGrabbed = true
    this.grabbedBy = player

    this._grabOffset.copy(hitPoint).sub(this.position)

    if (this.originalParent) {
      this.originalParent.remove(this)
    }
    this.ctx.world.scene.add(this)

    const rigidbody = this.findNode(node => node.name === 'rigidbody')
    if (rigidbody && rigidbody.type === 'dynamic') {
      rigidbody.type = 'kinematic'
    }

    if (this.onGrab) {
      this.onGrab(this, player)
    }

    this.ctx.world.on('update', this.updateGrabbedPosition)
  }

  update() {
    if (!this.enabled || !this.ctx.world.isClient) return
    
    if (!this.isGrabbed) {
      this.checkForGrabAttempt()
    } else {
      this.updateGrabbedPosition()
      this.checkForRelease()
    }
  }

  checkForGrabAttempt() {
    if (!this.control) return
    
    const leftGrip = this.control.entries.xrLeftGrip
    const rightGrip = this.control.entries.xrRightGrip
    
    if (leftGrip?.pressed && this.isInGrabRange('left')) {
      this.grabWithXR('left')
    } else if (rightGrip?.pressed && this.isInGrabRange('right')) {
      this.grabWithXR('right')
    }
  }

  checkForRelease() {
    if (!this.control) return
    
    const leftGrip = this.control.entries.xrLeftGrip
    const rightGrip = this.control.entries.xrRightGrip
    
    if ((this.grabbedBy === 'xr-left' && leftGrip?.released) ||
        (this.grabbedBy === 'xr-right' && rightGrip?.released)) {
      this.release()
    }
  }

  updateGrabbedPosition() {
    if (!this.isGrabbed || !this.grabbedBy) return

    if (this.grabbedBy === 'xr-left') {
      this.updateFromXRController('left')
    } else if (this.grabbedBy === 'xr-right') {
      this.updateFromXRController('right')
    } else {
      this.updateFromCamera()
    }
  }

  updateFromCamera() {
    const camera = this.ctx.world.camera
    if (!camera) return

    _v1.set(0, 0, -1).applyQuaternion(camera.quaternion)
    _v1.multiplyScalar(this.grabDistance * 0.8)
    _v1.add(camera.position)
    _v1.sub(this._grabOffset)

    this.position.copy(_v1)
    this.quaternion.copy(camera.quaternion)
  }

  updateFromXRController(hand) {
    if (!this.control) return

    const poseKey = hand === 'left' ? 'xrLeftGripPose' : 'xrRightGripPose'
    const pose = this.control.entries[poseKey]
    
    if (!pose) return

    _m1.compose(pose.position, pose.quaternion, _v2.set(1, 1, 1))
    _v1.set(0, 0, -0.1).applyMatrix4(_m1)
    
    this.position.copy(_v1)
    this.quaternion.copy(pose.quaternion)
  }

  isInGrabRange(hand) {
    if (!this.control) return false

    const poseKey = hand === 'left' ? 'xrLeftGripPose' : 'xrRightGripPose'
    const pose = this.control.entries[poseKey]
    
    if (!pose) return false

    const distance = this.position.distanceTo(pose.position)
    return distance <= this.grabDistance
  }

  grabWithXR(hand) {
    if (this.isGrabbed) return

    this.isGrabbed = true
    this.grabbedBy = `xr-${hand}`

    if (this.originalParent) {
      this.originalParent.remove(this)
    }
    this.ctx.world.scene.add(this)

    const rigidbody = this.findNode(node => node.name === 'rigidbody')
    if (rigidbody && rigidbody.type === 'dynamic') {
      rigidbody.type = 'kinematic'
    }

    if (this.onGrab) {
      this.onGrab(this, null)
    }
  }

  release() {
    if (!this.isGrabbed) return

    const player = this.grabbedBy

    this.isGrabbed = false
    this.grabbedBy = null

    this.ctx.world.off('update', this.updateGrabbedPosition)

    if (this.snapToPoints && this.ctx.world.snaps) {
      const snapResult = this.findNearestSnapPoint()
      if (snapResult) {
        this.snapToPoint(snapResult.position)
        return
      }
    }

    this.unsnap()

    if (this.onRelease) {
      this.onRelease(this, player)
    }
  }

  findNearestSnapPoint() {
    const results = this.ctx.world.snaps.octree.query(this.position, this.snapDistance)
    return results.length > 0 ? results[0] : null
  }

  snapToPoint(snapPosition) {
    if (this.isSnapped && this.snapPoint) {
      this.unsnap()
    }

    this.position.copy(snapPosition)
    this.isSnapped = true
    this.snapPoint = snapPosition

    if (this.rigidbodyTypeOnSnap) {
      const rigidbody = this.findNode(node => node.name === 'rigidbody')
      if (rigidbody) {
        rigidbody.type = this.rigidbodyTypeOnSnap
      }
    }

    if (this.snapSignal) {
      this.ctx.world.emit(this.snapSignal, { grabbable: this, snapPoint: snapPosition })
    }

    if (this.onSnap) {
      this.onSnap(this, snapPosition)
    }
  }

  unsnap() {
    if (!this.isSnapped) {
      if (this.returnOnRelease) {
        this.returnToOriginal()
      }
      return
    }

    this.isSnapped = false
    this.snapPoint = null

    if (this.rigidbodyTypeOnRelease && this.originalRigidbodyType) {
      const rigidbody = this.findNode(node => node.name === 'rigidbody')
      if (rigidbody) {
        rigidbody.type = this.rigidbodyTypeOnRelease
      }
    } else if (this.originalRigidbodyType) {
      const rigidbody = this.findNode(node => node.name === 'rigidbody')
      if (rigidbody) {
        rigidbody.type = this.originalRigidbodyType
      }
    }

    if (this.unsnapSignal) {
      this.ctx.world.emit(this.unsnapSignal, { grabbable: this })
    }

    if (this.onUnsnap) {
      this.onUnsnap(this)
    }

    if (this.returnOnRelease) {
      this.returnToOriginal()
    }
  }

  returnToOriginal() {
    this.ctx.world.scene.remove(this)

    if (this.originalParent) {
      this.originalParent.add(this)
    }

    this.position.copy(this.originalPosition)
    this.quaternion.copy(this.originalRotation)
  }

  unmount() {
    if (this.isGrabbed) {
      this.release()
    }

    const viewport = this.ctx.world.controls?.viewport
    if (viewport) {
      viewport.removeEventListener('pointerdown', this.onPointerDown)
      viewport.removeEventListener('pointerup', this.onPointerUp)
      viewport.removeEventListener('touchstart', this.onTouchStart)
      viewport.removeEventListener('touchend', this.onTouchEnd)
    }

    if (this.control) {
      this.control.api.release()
      this.control = null
    }

    this.ctx.world.off('update', this.updateGrabbedPosition)
  }

  isPinned() {
    const app = this.findNode(node => node.isApp)
    return app?.data?.pinned === true
  }

  copy(source, recursive) {
    super.copy(source, recursive)
    this.enabled = source.enabled
    this.grabDistance = source.grabDistance
    this.snapDistance = source.snapDistance
    this.snapToPoints = source.snapToPoints
    this.returnOnRelease = source.returnOnRelease
    this.returnPosition = source.returnPosition
    this.returnRotation = source.returnRotation
    this.onGrab = source.onGrab
    this.onRelease = source.onRelease
    this.onSnap = source.onSnap
    this.onUnsnap = source.onUnsnap
    this.snapSignal = source.snapSignal
    this.unsnapSignal = source.unsnapSignal
    this.rigidbodyTypeOnSnap = source.rigidbodyTypeOnSnap
    this.rigidbodyTypeOnRelease = source.rigidbodyTypeOnRelease
    return this
  }

  getProxy() {
    if (!this.proxy) {
      const self = this
      let proxy = {
        get enabled() {
          return self.enabled
        },
        set enabled(value) {
          self.enabled = value
        },
        get grabDistance() {
          return self.grabDistance
        },
        set grabDistance(value) {
          self.grabDistance = value
        },
        get snapDistance() {
          return self.snapDistance
        },
        set snapDistance(value) {
          self.snapDistance = value
        },
        get snapToPoints() {
          return self.snapToPoints
        },
        set snapToPoints(value) {
          self.snapToPoints = value
        },
        get returnOnRelease() {
          return self.returnOnRelease
        },
        set returnOnRelease(value) {
          self.returnOnRelease = value
        },
        get isGrabbed() {
          return self.isGrabbed
        },
        get isSnapped() {
          return self.isSnapped
        },
        grab() {
          self.grab()
        },
        release() {
          self.release()
        },
        snapToPoint(position) {
          self.snapToPoint(position)
        },
        unsnap() {
          self.unsnap()
        },
      }
      proxy = Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(super.getProxy()))
      this.proxy = proxy
    }
    return this.proxy
  }
}
