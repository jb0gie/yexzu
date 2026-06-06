import * as THREE from './three'
import { DEG2RAD } from './general'
import { getTrianglesFromGeometry } from './getTrianglesFromGeometry'
import { getTextureBytesFromMaterial } from './getTextureBytesFromMaterial'
import { Emotes } from './playerEmotes'
import {
  FORWARD, DIST_MIN_RATE, DIST_MAX_RATE, DIST_MIN, DIST_MAX, MAX_GAZE_DISTANCE,
  material, AimAxis, UpAxis, Modes,
  cloneGLB, getSkinnedMeshes, createCapsule, getQueryParams,
} from './vrmHelpers'
import { createVRMExpressions } from './createVRMExpressions'
import { createVRMAdditiveAnimations } from './createVRMAdditiveAnimations'

const v1 = new THREE.Vector3()
const v2 = new THREE.Vector3()
const q1 = new THREE.Quaternion()
const m1 = new THREE.Matrix4()

export function createVRMFactory(glb, setupMaterial) {
  glb.scene.matrixAutoUpdate = false
  glb.scene.matrixWorldAutoUpdate = false
  const expressionManager = glb.userData.vrmExpressionManager
  const vrmHumanoidRigs = glb.scene.children.filter(n => n.name === 'VRMHumanoidRig')
  for (const node of vrmHumanoidRigs) node.removeFromParent()

  glb.scene.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true
      obj.receiveShadow = true
    }
  })

  const bones = glb.userData.vrm.humanoid._rawHumanBones.humanBones
  const hipsPosition = v1.setFromMatrixPosition(bones.hips.node.matrixWorld)
  const rootPosition = v2.set(0, 0, 0)
  const rootToHips = hipsPosition.y - rootPosition.y
  const version = glb.userData.vrm.meta?.metaVersion

  const skinnedMeshes = []
  glb.scene.traverse(node => {
    if (node.isSkinnedMesh) {
      node.bindMode = THREE.DetachedBindMode
      node.bindMatrix.copy(node.matrixWorld)
      node.bindMatrixInverse.copy(node.bindMatrix).invert()
      skinnedMeshes.push(node)
    }
    if (node.isMesh) {
      node.geometry.computeBoundsTree()
      node.material.shadowSide = THREE.BackSide
      setupMaterial(node.material)
    }
  })

  const skeleton = skinnedMeshes[0].skeleton

  const normBones = glb.userData.vrm.humanoid._normalizedHumanBones.humanBones
  const leftArm = normBones.leftUpperArm.node
  leftArm.rotation.z = 75 * DEG2RAD
  const rightArm = normBones.rightUpperArm.node
  rightArm.rotation.z = -75 * DEG2RAD
  glb.userData.vrm.humanoid.update(0)
  skeleton.update()

  let height = 0.5
  for (const mesh of skinnedMeshes) {
    if (!mesh.boundingBox) mesh.computeBoundingBox()
    if (height < mesh.boundingBox.max.y) {
      height = mesh.boundingBox.max.y
    }
  }

  const headPos = normBones.head.node.getWorldPosition(new THREE.Vector3())
  const headToHeight = height - headPos.y

  const getBoneName = vrmBoneName => {
    if (!vrmBoneName) return
    const humanoid = glb.userData.vrm.humanoid
    const rawNode = humanoid.getRawBoneNode(vrmBoneName)
    if (rawNode) return rawNode.name
    const bones = humanoid._rawHumanBones?.humanBones
    if (bones) {
      const altKey = Object.keys(bones).find(k => k.toLowerCase() === vrmBoneName.toLowerCase())
      if (altKey) return bones[altKey].node?.name
    }
  }

  const noop = () => {}

  return {
    create: (matrix, hooks, node) => create(matrix, hooks, node, expressionManager),
    applyStats(stats) {
      glb.scene.traverse(obj => {
        if (obj.geometry && !stats.geometries.has(obj.geometry.uuid)) {
          stats.geometries.add(obj.geometry.uuid)
          stats.triangles += getTrianglesFromGeometry(obj.geometry)
        }
        if (obj.material && !stats.materials.has(obj.material.uuid)) {
          stats.materials.add(obj.material.uuid)
          stats.textureBytes += getTextureBytesFromMaterial(obj.material)
        }
      })
    },
  }

  function create(matrix, hooks, node, expressionManager) {
    const vrm = cloneGLB(glb)
    const tvrm = vrm.userData.vrm
    const exprManager = vrm.userData.vrmExpressionManager || expressionManager
    const skinnedMeshes = getSkinnedMeshes(vrm.scene)
    const skeleton = skinnedMeshes[0].skeleton
    const hasBone = name => !!skeleton.getBoneByName(name)



    try {
      const springManager = tvrm?.springBoneManager
      if (springManager?.joints && skeleton) {
        springManager.joints.forEach(joint => {
          if (joint.bone?.name) {
            const clonedBone = skeleton.getBoneByName(joint.bone.name)
            if (clonedBone) joint.bone = clonedBone
          }
          if (joint.colliderGroups) {
            joint.colliderGroups.forEach(group => {
              if (group.bone?.name) {
                const clonedGroupBone = skeleton.getBoneByName(group.bone.name)
                if (clonedGroupBone) group.bone = clonedGroupBone
              }
            })
          }
        })
      }
    } catch (e) {
      console.warn('[VRM] Spring bone rewiring failed:', e)
    }

    const rootBone = skeleton.bones[0]
    rootBone.parent.remove(rootBone)
    rootBone.updateMatrixWorld(true)
    vrm.scene.matrix = matrix
    vrm.scene.matrixWorld = matrix
    hooks.scene.add(vrm.scene)

    const getEntity = () => node?.ctx.entity

    const cRadius = 0.3
    const sItem = {
      matrix,
      geometry: createCapsule(cRadius, height - cRadius * 2),
      material,
      getEntity,
    }
    hooks.octree?.insert(sItem)

    vrm.scene.traverse(o => {
      o.getEntity = getEntity
    })

    const mixer = new THREE.AnimationMixer(skinnedMeshes[0])

    const bonesByName = {}
    const findBone = name => {
      if (!bonesByName[name]) {
        const actualName = glb.userData.vrm.humanoid.getRawBoneNode(name)?.name
        bonesByName[name] = skeleton.getBoneByName(actualName)
      }
      return bonesByName[name]
    }

    const mt = new THREE.Matrix4()
    const getBoneTransform = boneName => {
      const bone = findBone(boneName)
      if (!bone) return null
      return mt.multiplyMatrices(vrm.scene.matrixWorld, bone.matrixWorld)
    }

    const origVRM = glb.userData.vrm
    const expr = createVRMExpressions({ exprManager, vrm, origVRM, skinnedMeshes, skeleton })
    const additiveAnims = createVRMAdditiveAnimations({ mixer, hooks, skeleton, rootToHips, version, getBoneName })

    const loco = {
      mode: Modes.IDLE,
      axis: new THREE.Vector3(),
      gazeDir: null,
    }
    const setLocomotion = (mode, axis, gazeDir) => {
      loco.mode = mode
      loco.axis = axis
      loco.gazeDir = gazeDir
    }

    let talking = false
    const setSpeaking = value => {
      talking = !!value
    }

    const emotes = {}
    let currentEmote
    let locomotionDisabled = false

    mixer.addEventListener('finished', e => {
      if (!currentEmote) return
      if (e?.action === currentEmote.action) {
        if (!currentEmote.loop) {
          try {
            currentEmote.action?.fadeOut?.(0.15)
          } catch (_) {}
          currentEmote = null
          locomotionDisabled = false
          setSpeaking(false)
        }
      }
    })

    const setEmote = (url, options = {}) => {
      const { crossFade = true, fadeDuration = 0.15, warp = true } = options

      if (currentEmote?.url === url) return

      const prevEmote = currentEmote

      if (prevEmote?.url === Emotes.TALK && url !== Emotes.TALK) {
        setSpeaking(false)
      }

      if (!url) {
        if (currentEmote) {
          currentEmote.action?.fadeOut(fadeDuration)
          currentEmote = null
        }
        locomotionDisabled = false
        setSpeaking(false)
        return
      }

      const opts = getQueryParams(url)
      const loop = opts.l !== '0'
      const speed = parseFloat(opts.s || 1)
      const gaze = opts.g == '1'

      if (emotes[url]) {
        currentEmote = emotes[url]
        if (currentEmote.action) {
          currentEmote.loop = loop
          currentEmote.action.clampWhenFinished = !loop
          currentEmote.action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce)
          if (crossFade && prevEmote?.action?.isRunning()) {
            currentEmote.action.reset().play()
            prevEmote.action.crossFadeTo(currentEmote.action, fadeDuration, warp)
          } else {
            if (prevEmote) prevEmote.action?.fadeOut(fadeDuration)
            currentEmote.action.reset().fadeIn(fadeDuration).play()
          }
          locomotionDisabled = true
          clearLocomotion()
          if (url === Emotes.TALK) setSpeaking(true)
        }
      } else {
        const emote = { url, loading: true, action: null, gaze, loop }
        emotes[url] = emote
        currentEmote = emote
        hooks.loader
          .load('emote', url)
          .then(emo => {
            const clip = emo.toClip({ rootToHips, version, getBoneName, hasBone })
            const action = mixer.clipAction(clip)
            action.timeScale = speed
            emote.action = action
            if (currentEmote === emote) {
              action.clampWhenFinished = !loop
              action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce)
              locomotionDisabled = true
              if (crossFade && prevEmote?.action?.isRunning()) {
                action.play()
                prevEmote.action.crossFadeTo(action, fadeDuration, warp)
              } else {
                if (prevEmote?.action) prevEmote.action.fadeOut(fadeDuration)
                action.fadeIn(fadeDuration).play()
              }
              clearLocomotion()
              if (url === Emotes.TALK) setSpeaking(true)
            }
          })
          .catch(error => {
            console.error('Failed to load emote:', url, error)
          })
      }
    }

    let elapsed = 0
    let rate = 0
    let rateCheck = true
    let distance
    let springElapsed = 0
    let springRate = 0
    let springLod = 0

    const updateRate = () => {
      const vrmPos = v1.setFromMatrixPosition(vrm.scene.matrix)
      const camPos = v2.setFromMatrixPosition(hooks.camera.matrixWorld)
      distance = vrmPos.distanceTo(camPos)
      const clampedDistance = Math.max(distance - DIST_MIN, 0)
      const normalizedDistance = Math.min(clampedDistance / (DIST_MAX - DIST_MIN), 1)
      rate = DIST_MAX_RATE + normalizedDistance * (DIST_MIN_RATE - DIST_MAX_RATE)
      springRate = Math.max(0.05, Math.min(rate * (1 + normalizedDistance * 2), 0.5))
      if (distance > 50) springLod = 3
      else if (distance > 30) springLod = 2
      else if (distance > 15) springLod = 1
      else springLod = 0
    }

    let springInit = false
    let hasSprings = false
    const springBoneOrigins = new Map()
    function initSpringBones() {
      if (springInit) return
      const spring = tvrm?.springBoneManager
      if (!spring) {
        springInit = true
        return
      }
      try {
        hasSprings = spring.joints && spring.joints.size > 0
        if (!hasSprings) {
          springInit = true
          return
        }
        const tuning = hooks.springTuning || {
          stiffness: 1.2, dragForce: 1.0, gravityPower: 1.0, hitRadius: 1.0,
        }
        const tuned = new WeakSet()
        spring.joints.forEach(joint => {
          const s = joint.settings
          if (!s) return
          if (!tuned.has(s)) {
            tuned.add(s)
            if (tuning.stiffness != null) s.stiffness *= tuning.stiffness
            if (tuning.dragForce != null) s.dragForce *= tuning.dragForce
            if (tuning.gravityPower != null) s.gravityPower *= tuning.gravityPower
            if (tuning.hitRadius != null) s.hitRadius *= tuning.hitRadius
            const boneName = joint.bone?.name?.toLowerCase() || ''
            if (boneName.includes('hair') || boneName.includes('tail')) s.stiffness *= 1.05
            s.stiffness = Math.max(s.stiffness, 0.5)
            s.dragForce = Math.max(s.dragForce, 0.1)
            s.gravityPower = Math.max(s.gravityPower, 0.1)
          }
          if (hooks.disableSpringColliders === true) joint.colliderGroups = []
          springBoneOrigins.set(joint, {
            gravityDir: s.gravityDir.clone(),
            gravityPower: s.gravityPower,
          })
        })
        spring.setInitState()
        const boneToJoint = new Map()
        tvrm.springBoneManager.joints.forEach(j => boneToJoint.set(j.bone, j))
        tvrm.springBoneManager.joints.forEach(j => {
          const childJoint = boneToJoint.get(j.child)
          if (childJoint) {
            j._isChainTip = false
            j._chainChild = childJoint
          }
        })
      } catch (e) {
        console.warn('[VRM] Spring bone init failed:', e)
      }
      springInit = true
    }

    const update = delta => {
      if (rateCheck && distance > DIST_MAX) {
        return
      }

      elapsed += delta
      const doAnim = rateCheck ? elapsed >= rate : true
      if (doAnim) {
        mixer.update(elapsed)

        additiveAnims.update(delta)

        if (!locomotionDisabled) {
          updateLocomotion(delta)
        }

        if (expr.expressionsEnabled) {
          expr.updateBlink(elapsed)
          expr.updateMouth(elapsed, talking)
          if (exprManager) {
            expr.updateExpressionManager(elapsed)
          } else {
            expr.updateExpressionNodes()
          }
        }

        if (loco.gazeDir && distance < MAX_GAZE_DISTANCE && (currentEmote ? currentEmote.gaze : true)) {
          aimBone('neck', loco.gazeDir, delta, {
            minAngle: -30, maxAngle: 30, smoothing: 0.4, weight: 0.6,
          })
          aimBone('head', loco.gazeDir, delta, {
            minAngle: -30, maxAngle: 30, smoothing: 0.4, weight: 0.6,
          })
        }

        skeleton.bones.forEach(bone => bone.updateMatrixWorld())
        elapsed = 0
      }

      if (!springInit) initSpringBones()
      let didSpring = false
      if (hasSprings && tvrm?.springBoneManager && springLod === 0) {
        springElapsed += delta
        const doSpring = rateCheck ? springElapsed >= springRate : true
        if (doSpring) {
          didSpring = true
          const verticalVelocity = hooks.getVerticalVelocity ? hooks.getVerticalVelocity() : 0
          const velocityFactor = Math.max(-1, Math.min(1, verticalVelocity / 10))
          tvrm.springBoneManager.joints.forEach(joint => {
            joint._skipCollision = false
            if (joint.settings) {
              const origins = springBoneOrigins.get(joint)
              if (origins) {
                const baseGravityY = origins.gravityDir.y
                const adjustedGravityY = baseGravityY - velocityFactor
                joint.settings.gravityDir.set(0, adjustedGravityY, 0).normalize()
                joint.settings.gravityPower = origins.gravityPower * (1 + Math.abs(velocityFactor) * 0.5)
              }
            }
          })
          const physicsDelta = Math.min(delta, 0.033)
          tvrm.update(physicsDelta)
          springElapsed = 0
        }
      }

      if (doAnim || didSpring) {
        skeleton.update = THREE.Skeleton.prototype.update
        skeleton.update()
      }
      skeleton.update = noop
    }

    const aimBone = (() => {
      const smoothedRotations = new Map()
      const normalizedDir = new THREE.Vector3()
      const parentWorldMatrix = new THREE.Matrix4()
      const parentWorldRotationInverse = new THREE.Quaternion()
      const localDir = new THREE.Vector3()
      const currentAimDir = new THREE.Vector3()
      const rot = new THREE.Quaternion()
      const worldUp = new THREE.Vector3()
      const localUp = new THREE.Vector3()
      const rotatedUp = new THREE.Vector3()
      const projectedUp = new THREE.Vector3()
      const upCorrection = new THREE.Quaternion()
      const cross = new THREE.Vector3()
      const targetRotation = new THREE.Quaternion()
      const restToTarget = new THREE.Quaternion()

      return function aimBone(boneName, targetDir, delta, options = {}) {
        const {
          aimAxis = AimAxis.NEG_Z,
          upAxis = UpAxis.Y,
          smoothing = 0.3,
          weight = 1.0,
          maintainOffset = false,
          minAngle = -180,
          maxAngle = 180,
        } = options
        const bone = findBone(boneName)
        const parentBone = glb.userData.vrm.humanoid.humanBones[boneName].node.parent
        if (!bone) return console.warn(`aimBone: missing bone (${boneName})`)
        if (!parentBone) return console.warn(`aimBone: no parent bone`)

        const boneId = bone.uuid
        if (!smoothedRotations.has(boneId)) {
          smoothedRotations.set(boneId, {
            current: bone.quaternion.clone(),
            target: new THREE.Quaternion(),
          })
        }
        const smoothState = smoothedRotations.get(boneId)

        normalizedDir.copy(targetDir).normalize()
        parentWorldMatrix.multiplyMatrices(vrm.scene.matrixWorld, parentBone.matrixWorld)
        parentWorldMatrix.decompose(v1, parentWorldRotationInverse, v2)
        parentWorldRotationInverse.invert()
        localDir.copy(normalizedDir).applyQuaternion(parentWorldRotationInverse)

        if (maintainOffset && !bone.userData.initialRotationOffset) {
          bone.userData.initialRotationOffset = bone.quaternion.clone()
        }

        currentAimDir.copy(aimAxis)
        if (maintainOffset && bone.userData.initialRotationOffset) {
          currentAimDir.applyQuaternion(bone.userData.initialRotationOffset)
        }

        rot.setFromUnitVectors(aimAxis, localDir)

        worldUp.copy(upAxis)
        localUp.copy(worldUp).applyQuaternion(parentWorldRotationInverse)
        rotatedUp.copy(upAxis).applyQuaternion(rot)
        projectedUp.copy(localUp)
        projectedUp.sub(v1.copy(localDir).multiplyScalar(localDir.dot(localUp)))
        projectedUp.normalize()
        if (projectedUp.lengthSq() > 0.001) {
          upCorrection.setFromUnitVectors(rotatedUp, projectedUp)
          const angle = rotatedUp.angleTo(projectedUp)
          cross.crossVectors(rotatedUp, projectedUp)
          if (cross.dot(localDir) < 0) {
            upCorrection.setFromAxisAngle(localDir, -angle)
          } else {
            upCorrection.setFromAxisAngle(localDir, angle)
          }
          rot.premultiply(upCorrection)
        }

        targetRotation.copy(rot)
        if (maintainOffset && bone.userData.initialRotationOffset) {
          targetRotation.multiply(bone.userData.initialRotationOffset)
        }

        if (minAngle > -180 || maxAngle < 180) {
          if (!bone.userData.restRotation) {
            bone.userData.restRotation = bone.quaternion.clone()
          }
          restToTarget.copy(bone.userData.restRotation).invert().multiply(targetRotation)
          const w = restToTarget.w
          const angle = 2 * Math.acos(Math.min(Math.max(w, -1), 1))
          const angleDeg = THREE.MathUtils.radToDeg(angle)
          if (angleDeg > maxAngle || angleDeg < minAngle) {
            const clampedAngleDeg = THREE.MathUtils.clamp(angleDeg, minAngle, maxAngle)
            const clampedAngleRad = THREE.MathUtils.degToRad(clampedAngleDeg)
            const scale = clampedAngleRad / angle
            q1.copy(targetRotation)
            targetRotation.slerpQuaternions(bone.userData.restRotation, q1, scale)
          }
        }

        if (weight < 1.0) {
          targetRotation.slerp(bone.quaternion, 1.0 - weight)
        }

        smoothState.target.copy(targetRotation)
        smoothState.current.slerp(smoothState.target, smoothing)
        bone.quaternion.copy(smoothState.current)
        bone.updateMatrixWorld(true)
      }
    })()

    const aimBoneDir = new THREE.Vector3()
    function aimBoneAt(boneName, targetPos, delta, options = {}) {
      const bone = findBone(boneName)
      if (!bone) return console.warn(`aimBone: missing bone (${boneName})`)
      const boneWorldMatrix = getBoneTransform(boneName)
      const boneWorldPos = v1.setFromMatrixPosition(boneWorldMatrix)
      aimBoneDir.subVectors(targetPos, boneWorldPos).normalize()
      aimBone(boneName, aimBoneDir, delta, options)
    }

    const poses = {}
    function addPose(key, url) {
      const pose = {
        loading: false,
        active: false,
        action: null,
        weight: 0,
        target: 0,
        setWeight: value => {
          pose.weight = value
          if (pose.action) {
            pose.action.weight = value
            if (!pose.active) {
              pose.action.reset().fadeIn(0.15).play()
              pose.active = true
            }
          }
        },
        crossFadeTo: (targetPose, duration = 0.15, warp = true) => {
          if (pose.action && targetPose.action && pose.active) {
            pose.action.crossFadeTo(targetPose.action, duration, warp)
            pose.active = false
            targetPose.active = true
          }
        },
        fadeOut: () => {
          pose.weight = 0
          pose.action?.fadeOut(0.15)
          pose.active = false
        },
      }
      pose.loading = true
      const opts = getQueryParams(url)
      const speed = parseFloat(opts.s || 1)
      hooks.loader.load('emote', url).then(emo => {
        const clip = emo.toClip({ rootToHips, version, getBoneName, hasBone })
        pose.action = mixer.clipAction(clip)
        pose.action.timeScale = speed
        pose.action.weight = pose.weight
        pose.action.play()
        pose.loading = false
      })
      poses[key] = pose
    }
    addPose('idle', Emotes.IDLE)
    addPose('walk', Emotes.WALK)
    addPose('walkLeft', Emotes.WALK_LEFT)
    addPose('walkBack', Emotes.WALK_BACK)
    addPose('walkRight', Emotes.WALK_RIGHT)
    addPose('walkBackLeft', Emotes.WALK_BACK_LEFT)
    addPose('walkBackRight', Emotes.WALK_BACK_RIGHT)
    addPose('run', Emotes.RUN)
    addPose('runLeft', Emotes.RUN_LEFT)
    addPose('runBack', Emotes.RUN_BACK)
    addPose('runRight', Emotes.RUN_RIGHT)
    addPose('runBackLeft', Emotes.RUN_BACK_LEFT)
    addPose('runBackRight', Emotes.RUN_BACK_RIGHT)
    addPose('jump', Emotes.JUMP)
    addPose('fall', Emotes.FALL)
    addPose('fly', Emotes.FLY)
    addPose('talk', Emotes.TALK)
    addPose('grinding', Emotes.GRINDING)
    addPose('climbIdle', Emotes.CLIMB_IDLE)
    addPose('climbUp', Emotes.CLIMB_UP)
    addPose('climbDown', Emotes.CLIMB_DOWN)
    addPose('ledgeHangingIdle', Emotes.LEDGE_HANGING_IDLE)
    addPose('ledgeHangingMoving', Emotes.LEDGE_HANGING_MOVING)
    addPose('airDive', Emotes.AIR_DIVE)
    addPose('wallSlide', Emotes.WALL_SLIDE)

    function clearLocomotion() {
      for (const key in poses) {
        poses[key].fadeOut()
      }
    }

    function updateLocomotion(delta) {
      const { mode, axis } = loco
      for (const key in poses) {
        poses[key].target = 0
      }
      if (mode === Modes.IDLE) {
        const hasAdditiveAnimations = additiveAnims.currentAdditiveAnims.size > 0
        let shouldDisableIdle = false
        if (hasAdditiveAnimations) {
          for (const [url, anim] of additiveAnims.currentAdditiveAnims) {
            if (anim.disableEngineIdle === true) {
              shouldDisableIdle = true
              break
            }
          }
        }
        if (!shouldDisableIdle) {
          poses.idle.target = 1
        } else {
          poses.idle.target = 0
        }
      } else if (mode === Modes.WALK || mode === Modes.RUN) {
        const angle = Math.atan2(axis.x, -axis.z)
        const angleDeg = ((angle * 180) / Math.PI + 360) % 360
        const prefix = mode === Modes.RUN ? 'run' : 'walk'
        const forwardKey = prefix
        const leftKey = `${prefix}Left`
        const backKey = `${prefix}Back`
        const rightKey = `${prefix}Right`
        const backLeftKey = `${prefix}BackLeft`
        const backRightKey = `${prefix}BackRight`
        if (axis.length() > 0.01) {
          if (angleDeg >= 337.5 || angleDeg < 22.5) {
            poses[forwardKey].target = 1
          } else if (angleDeg >= 22.5 && angleDeg < 67.5) {
            const blend = (angleDeg - 22.5) / 45
            poses[forwardKey].target = 1 - blend
            poses[rightKey].target = blend
          } else if (angleDeg >= 67.5 && angleDeg < 112.5) {
            poses[rightKey].target = 1
          } else if (angleDeg >= 112.5 && angleDeg < 157.5) {
            poses[backLeftKey].target = 1
          } else if (angleDeg >= 157.5 && angleDeg < 202.5) {
            poses[backKey].target = 1
          } else if (angleDeg >= 202.5 && angleDeg < 247.5) {
            poses[backRightKey].target = 1
          } else if (angleDeg >= 247.5 && angleDeg < 292.5) {
            poses[leftKey].target = 1
          } else if (angleDeg >= 292.5 && angleDeg < 337.5) {
            const blend = (angleDeg - 292.5) / 45
            poses[leftKey].target = 1 - blend
            poses[forwardKey].target = blend
          }
        }
      } else if (mode === Modes.JUMP) {
        poses.jump.target = 1
      } else if (mode === Modes.FALL) {
        poses.fall.target = 1
      } else if (mode === Modes.FLY) {
        poses.fly.target = 1
      } else if (mode === Modes.TALK) {
        poses.talk.target = 1
      } else if (mode === Modes.FLIP) {
        setEmote(Emotes.FLIP)
      } else if (mode === Modes.BACKFLIP) {
        setEmote(Emotes.BACKFLIP)
      } else if (mode === Modes.SIDEFLIP_LEFT) {
        setEmote(Emotes.STRAFE_LEFT_FLIP)
      } else if (mode === Modes.SIDEFLIP_RIGHT) {
        setEmote(Emotes.STRAFE_RIGHT_FLIP)
      } else if (mode === Modes.STRAFE_JUMP_LEFT) {
        setEmote(Emotes.STRAFE_JUMP_LEFT)
      } else if (mode === Modes.STRAFE_JUMP_RIGHT) {
        setEmote(Emotes.STRAFE_JUMP_RIGHT)
      } else if (mode === Modes.GRINDING) {
        poses.grinding.target = 1
      } else if (mode === Modes.CLIMBING) {
        poses.climbIdle.target = 1
      } else if (mode === Modes.LEDGE_HANGING) {
        poses.ledgeHangingIdle.target = 1
      } else if (mode === Modes.AIR_DIVING) {
        poses.airDive.target = 1
      } else if (mode === Modes.WALL_SLIDING) {
        poses.wallSlide.target = 1
      }
      const lerpSpeed = 16
      for (const key in poses) {
        const pose = poses[key]
        const weight = THREE.MathUtils.lerp(pose.weight, pose.target, 1 - Math.exp(-lerpSpeed * delta))
        pose.setWeight(weight)
      }
    }

    let firstPersonActive = false
    const setFirstPerson = active => {
      if (firstPersonActive === active) return
      const head = findBone('neck')
      head.scale.setScalar(active ? 0 : 1)
      firstPersonActive = active
    }

    let bonesVisible = false
    const boneHelpers = new Map()
    const boneLines = new Map()

    const setBonesVisible = visible => {
      if (bonesVisible === visible) return
      bonesVisible = visible
      if (visible) {
        skeleton.bones.forEach(bone => {
          if (!bone) return
          if (!boneHelpers.has(bone)) {
            const geometry = new THREE.SphereGeometry(0.03, 6, 4)
            const material = new THREE.MeshBasicMaterial({
              color: 0x00ff00, depthTest: false, depthWrite: false,
              transparent: true, opacity: 0.9,
            })
            const helper = new THREE.Mesh(geometry, material)
            helper.matrixAutoUpdate = false
            helper.renderOrder = 9999
            boneHelpers.set(bone, helper)
          }
          const helper = boneHelpers.get(bone)
          helper.matrix.copy(bone.matrixWorld)
          helper.visible = true
          vrm.scene.add(helper)
          if (bone.parent && bone.parent.isBone && !boneLines.has(bone)) {
            const lineGeometry = new THREE.BufferGeometry()
            const lineMaterial = new THREE.LineBasicMaterial({
              color: 0xffff00, depthTest: false, depthWrite: false,
              transparent: true, opacity: 0.6,
            })
            const line = new THREE.Line(lineGeometry, lineMaterial)
            line.renderOrder = 9998
            line.matrixAutoUpdate = false
            boneLines.set(bone, line)
          }
          const line = boneLines.get(bone)
          if (line) {
            const positions = new Float32Array(6)
            const bonePos = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld)
            const parentPos = new THREE.Vector3().setFromMatrixPosition(bone.parent.matrixWorld)
            positions[0] = parentPos.x; positions[1] = parentPos.y; positions[2] = parentPos.z
            positions[3] = bonePos.x; positions[4] = bonePos.y; positions[5] = bonePos.z
            line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
            line.visible = true
            vrm.scene.add(line)
          }
        })
      } else {
        boneHelpers.forEach(helper => vrm.scene.remove(helper))
        boneLines.forEach(line => vrm.scene.remove(line))
      }
    }

    const updateBoneHelpers = () => {
      if (!bonesVisible) return
      boneHelpers.forEach((helper, bone) => {
        if (bone && helper) helper.matrix.copy(bone.matrixWorld)
      })
      boneLines.forEach((line, bone) => {
        if (bone && line && bone.parent && bone.parent.isBone) {
          const positions = new Float32Array(6)
          const bonePos = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld)
          const parentPos = new THREE.Vector3().setFromMatrixPosition(bone.parent.matrixWorld)
          positions[0] = parentPos.x; positions[1] = parentPos.y; positions[2] = parentPos.z
          positions[3] = bonePos.x; positions[4] = bonePos.y; positions[5] = bonePos.z
          line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        }
      })
    }

    return {
      raw: vrm,
      height,
      headToHeight,
      setEmote,
      setAdditiveAnimation(url, options = {}) {
        if (!url) {
          for (const [animUrl, anim] of additiveAnims.currentAdditiveAnims) {
            anim.targetWeight = 0
            anim.fadeSpeed = 1 / (options.fadeDuration || 0.1)
            anim.action.stop()
          }
          additiveAnims.currentAdditiveAnims.clear()
          return
        }
        return additiveAnims.loadAdditiveAnimation(url, options)
      },
      stopAdditiveAnimation(url, fadeDuration) {
        additiveAnims.stopAdditiveAnimation(url, fadeDuration)
      },
      getAdditiveAnimations() {
        return additiveAnims.getAdditiveAnimations()
      },
      setSpeaking,
      setExpression(name, weight) {
        expr.setExpression(name, weight)
      },
      setBlinkEnabled(active) {
        expr.setBlinkEnabled(active)
      },
      setFirstPerson,
      setBonesVisible,
      update,
      updateRate,
      getBoneTransform,
      setLocomotion,
      addBoneRotation(boneName, euler) {
        if (!skeleton || !skeleton.bones) {
          console.warn('[VRM] No skeleton available for bone rotation')
          return false
        }
        const bone = skeleton.getBoneByName(boneName)
        if (!bone) {
          console.warn(`[VRM] Bone not found: ${boneName}`)
          return false
        }
        const rotationQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(euler.x, euler.y, euler.z))
        bone.quaternion.multiply(rotationQuat)
        bone.updateMatrixWorld()
        return true
      },
      resetBoneRotation(boneName) {
        if (!skeleton || !skeleton.bones) {
          console.warn('[VRM] No skeleton available for bone reset')
          return false
        }
        const bone = skeleton.getBoneByName(boneName)
        if (!bone) {
          console.warn(`[VRM] Bone not found: ${boneName}`)
          return false
        }
        bone.quaternion.set(0, 0, 0, 1)
        bone.updateMatrixWorld()
        return true
      },
      resetAllBoneRotations() {
        if (!skeleton || !skeleton.bones) {
          console.warn('[VRM] No skeleton available for bone reset')
          return false
        }
        skeleton.bones.forEach(bone => {
          bone.quaternion.set(0, 0, 0, 1)
          bone.updateMatrixWorld()
        })
        return true
      },
      setVisible(visible) {
        vrm.scene.traverse(o => { o.visible = visible })
      },
      move(_matrix) {
        matrix.copy(_matrix)
        vrm.scene.matrix.copy(_matrix)
        vrm.scene.matrixWorld.copy(_matrix)
        hooks.octree?.move(sItem)
      },
      disableRateCheck() {
        rateCheck = false
      },
      destroy() {
        boneHelpers.forEach(helper => vrm.scene.remove(helper))
        boneHelpers.clear()
        boneLines.forEach(line => vrm.scene.remove(line))
        boneLines.clear()
        hooks.scene.remove(vrm.scene)
        hooks.octree?.remove(sItem)
      },
    }
  }
}
