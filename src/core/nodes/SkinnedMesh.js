import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

import { Node } from './Node'
import * as THREE from '../extras/three'
import { isBoolean } from 'lodash-es'

const defaults = {
  object3d: null,
  animations: [],
  castShadow: true,
  receiveShadow: true,
}

const m1 = new THREE.Matrix4()

const defaultStopOpts = { fade: 0.15 }

export class SkinnedMesh extends Node {
  constructor(data = {}) {
    super(data)
    this.name = 'skinnedmesh'

    this._object3d = data.object3d
    this._animations = data.animations

    this.castShadow = data.castShadow
    this.receiveShadow = data.receiveShadow

    this.clips = {}
    this.actions = {}
    this.bones = null
    this.animNames = []
    this.boneHandles = {}
    this._timeScale = 1.0
  }

  mount() {
    this.clips = {}
    this.actions = {}
    this.bones = null
    this.animNames = []

    this.obj = SkeletonUtils.clone(this._object3d)
    this.obj.matrixWorld.copy(this.matrixWorld)
    this.obj.matrixAutoUpdate = false
    this.obj.matrixWorldAutoUpdate = false
    this.obj.traverse(n => {
      if (n.isMesh) {
        n.castShadow = this._castShadow
        n.receiveShadow = this._receiveShadow
      }
    })
    this.ctx.world.stage.scene.add(this.obj)
    for (const clip of this._animations) {
      this.clips[clip.name] = clip
      this.animNames.push(clip.name)
    }
    this.needsRebuild = false
  }

  commit(didMove) {
    if (this.needsRebuild) {
      this.unmount()
      this.mount()
    }
    if (didMove) {
      if (this.obj) {
        this.obj.matrixWorld.copy(this.matrixWorld)
      }
    }
  }

  unmount() {
    if (this.obj) {
      if (this.mixer) {
        this.mixer.stopAllAction()
        this.mixer.uncacheRoot(this.obj)
        this.mixer = null
        this.ctx.world.setHot(this, false)
        this.clips = {}
        this.actions = {}
      }
      this.ctx.world.stage.scene.remove(this.obj)
      this.obj = null
      this.bones = null
      this.animNames = []
    }
  }

  update(delta) {
    this.mixer?.update(delta)
  }

  copy(source, recursive) {
    super.copy(source, recursive)
    this._object3d = source._object3d
    this._animations = source._animations
    this._castShadow = source._castShadow
    this._receiveShadow = source._receiveShadow
    return this
  }

  get anims() {
    return this.animNames.slice()
  }

  get timeScale() {
    return this._timeScale
  }

  set timeScale(value) {
    this._timeScale = value
    // Update mixer's global timeScale
    if (this.mixer) {
      this.mixer.timeScale = value
    }
    // Also update current action's timeScale if needed
    if (this.action) {
      this.action.timeScale = value
    }
  }

  setActionTimeScale(value) {
    // Set timeScale for current action only (not global mixer)
    if (this.action) {
      this.action.timeScale = value
    }
  }

  get castShadow() {
    return this._castShadow
  }

  set castShadow(value = defaults.castShadow) {
    if (!isBoolean(value)) {
      throw new Error('[skinnedmesh] castShadow not a boolean')
    }
    if (this._castShadow === value) return
    this._castShadow = value
    if (this.handle) {
      this.needsRebuild = true
      this.setDirty()
    }
  }

  get receiveShadow() {
    return this._receiveShadow
  }

  set receiveShadow(value = defaults.receiveShadow) {
    if (!isBoolean(value)) {
      throw new Error('[skinnedmesh] receiveShadow not a boolean')
    }
    if (this._receiveShadow === value) return
    this._receiveShadow = value
    if (this.handle) {
      this.needsRebuild = true
      this.setDirty()
    }
  }

  play({ name, fade = 0.15, speed, loop = true, crossFade = false, warp = true }) {
    if (!this.mixer) {
      this.mixer = new THREE.AnimationMixer(this.obj)
      this.mixer.timeScale = this._timeScale // Apply global timeScale
      this.ctx.world.setHot(this, true)
    }
    if (this.action?._clip.name === name) {
      return
    }

    const prevAction = this.action
    this.action = this.actions[name]
    if (!this.action) {
      const clip = this.clips[name]
      if (!clip) return console.warn(`[skinnedmesh] animation not found: ${name}`)
      this.action = this.mixer.clipAction(clip)
      this.actions[name] = this.action
    }

    // Use provided speed or fall back to global timeScale
    if (speed !== undefined) {
      this.action.timeScale = speed
    } else {
      this.action.timeScale = this._timeScale
    }
    this.action.clampWhenFinished = !loop
    this.action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce)

    // Use crossFadeTo if requested and there's a previous action
    if (crossFade && prevAction && prevAction.isRunning()) {
      console.log(`[SkinnedMesh] Using crossFadeTo from ${prevAction._clip.name} to ${name} (duration: ${fade}s)`)
      this.action.reset()
      this.action.play()
      prevAction.crossFadeTo(this.action, fade, warp)
    } else {
      // Fall back to original fade behavior
      if (prevAction) {
        prevAction.fadeOut(fade)
      }
      this.action.reset().fadeIn(fade).play()
    }
  }

  stop(opts = defaultStopOpts) {
    if (!this.action) return
    this.action.fadeOut(opts.fade)
    this.action = null
  }

  readBone(name) {
    if (!this.obj) return null
    if (!this.bones) {
      this.bones = {}
      this.obj.traverse(obj => {
        if (obj.isBone) {
          this.bones[obj.name] = obj
        }
      })
    }
    const bone = this.bones[name]
    if (!bone) {
      console.warn(`[skinnedmesh] bone not found: ${name}`)
      return null
    }
    return bone
  }

  // Add bone rotation offset (for procedural aiming, IK, etc.)
  addBoneRotation(boneName, euler) {
    const bone = this.readBone(boneName)
    if (!bone) {
      console.warn(`[skinnedmesh] addBoneRotation failed: bone '${boneName}' not found`)
      return false
    }

    // Store original rotation if not already stored
    if (!bone.userData.originalRotation) {
      bone.userData.originalRotation = bone.rotation.clone()
      console.log(`[skinnedmesh] Stored original rotation for bone '${boneName}':`, bone.userData.originalRotation)
    }

    // Apply additive rotation
    bone.rotation.x = bone.userData.originalRotation.x + euler.x
    bone.rotation.y = bone.userData.originalRotation.y + euler.y
    bone.rotation.z = bone.userData.originalRotation.z + euler.z

    console.log(`[skinnedmesh] Applied rotation to bone '${boneName}':`, bone.rotation.x, bone.rotation.y, bone.rotation.z)
    return true
  }

  // Reset bone rotation to original
  resetBoneRotation(boneName) {
    const bone = this.readBone(boneName)
    if (!bone || !bone.userData.originalRotation) return false

    bone.rotation.copy(bone.userData.originalRotation)
    return true
  }

  // Reset all bone rotations
  resetAllBoneRotations() {
    if (!this.bones) return
    for (const boneName in this.bones) {
      this.resetBoneRotation(boneName)
    }
  }

  getBone(name) {
    let handle = this.boneHandles[name]
    if (!handle) {
      const self = this
      handle = {
        get position() {
          return self.readBone(name)?.position
        },
        get quaternion() {
          return self.readBone(name)?.quaternion
        },
        get rotation() {
          return self.readBone(name)?.rotation
        },
        get scale() {
          return self.readBone(name)?.scale
        },
        get matrixWorld() {
          const bone = self.readBone(name)
          if (!bone) return null
          if (self.isDirty) self.clean()
          bone.updateMatrixWorld(true)
          return bone.matrixWorld
        },
        set matrixWorld(mat) {
          const bone = self.readBone(name)
          if (!bone) return
          bone.matrixAutoUpdate = false
          bone.matrixWorldAutoUpdate = false
          bone.matrixWorld.copy(mat)
        },
      }
      this.boneHandles[name] = handle
    }
    return handle
  }

  // deprecated: use getBone(name).matrixWorld
  getBoneTransform(name) {
    const bone = this.readBone(name)
    if (!bone) return null
    // combine the skinned mesh's world matrix with the bone's world matrix
    // return m1.multiplyMatrices(this.matrixWorld, bone.matrixWorld)
    bone.updateMatrixWorld(true)
    return m1.copy(bone.matrixWorld)
  }

  getProxy() {
    var self = this
    if (!this.proxy) {
      let proxy = {
        get anims() {
          return self.anims
        },
        get timeScale() {
          return self.timeScale
        },
        set timeScale(value) {
          self.timeScale = value
        },
        setActionTimeScale(value) {
          self.setActionTimeScale(value)
        },
        get castShadow() {
          return self.castShadow
        },
        set castShadow(value) {
          self.castShadow = value
        },
        get receiveShadow() {
          return self.receiveShadow
        },
        set receiveShadow(value) {
          self.receiveShadow = value
        },
        play(opts) {
          self.play(opts)
        },
        crossFadeTo(name, duration = 0.15, warp = true) {
          self.play({ name, fade: duration, crossFade: true, warp })
        },
        stop(opts) {
          self.stop(opts)
        },
        getBone(name) {
          return self.getBone(name)
        },
        getBoneTransform(name) {
          return self.getBoneTransform(name)
        },
      }
      proxy = Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(super.getProxy())) // inherit Node properties
      this.proxy = proxy
    }
    return this.proxy
  }
}
