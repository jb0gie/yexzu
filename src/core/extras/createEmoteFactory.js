import * as THREE from 'three'

const q1 = new THREE.Quaternion()
const restRotationInverse = new THREE.Quaternion()
const parentRestWorldRotation = new THREE.Quaternion()

function extractBoneName(trackName) {
  const i = trackName.lastIndexOf('.')
  return i > 0 ? trackName.slice(0, i) : trackName
}

function normalizeBoneName(raw) {
  const bare = raw
  let side
  let base = bare
  const sm = bare.match(/[._-]([LlRr])$/)
  if (sm) {
    side = sm[1].toUpperCase()
    base = bare.slice(0, -2)
  }
  base = base.replace(/\.\d+$/, '')
  const camel = base.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  let alias = boneNameAliases[base] || boneNameAliases[camel]
  if (!alias && camel.length > 1 && !isNaN(camel[camel.length - 1])) {
    alias = boneNameAliases[camel.slice(0, -1) + camel[camel.length - 1]]
  }
  if (!alias) return null
  if (typeof alias === 'object') return side ? alias[side] || null : null
  return alias
}

function createDirectEmoteFactory(glb, url, queryParams = {}) {
  const animName = queryParams.name || queryParams.animation
  let clip = glb.animations[0]
  if (animName && glb.animations.length > 1) {
    const found = glb.animations.find(a => a.name === animName)
    if (found) clip = found
  }

  if (!glb.scene.children || glb.scene.children.length === 0) {
    return {
      toClip() { return new THREE.AnimationClip('empty', 0, []) },
    }
  }

  const scale = glb.scene.children[0].scale.x

  return {
    toClip({ rootToHips, version, getBoneName, hasBone }) {
      const height = rootToHips
      const tracks = []

      for (const track of clip.tracks) {
        const i = track.name.lastIndexOf('.')
        const boneName = i > 0 ? track.name.slice(0, i) : track.name
        const propertyName = track.name.slice(i + 1)
        const normName = vrmNormalizedNames.has(boneName) ? boneName : normalizeBoneName(boneName)
        if (!normName) continue

        const mappedName = getBoneName(normName)
        const candidates = [mappedName, boneName, normName].filter(Boolean)
        const vrmNodeName = hasBone
          ? candidates.find(n => hasBone(n)) || mappedName || boneName
          : (mappedName ?? boneName)

        if (hasBone && vrmNodeName !== mappedName && vrmNodeName !== boneName) {
          console.warn(
            `[emote] ${track.name} → mapped ${normName}=${mappedName} fallback ${vrmNodeName}`
          )
        }

        if (track instanceof THREE.QuaternionKeyframeTrack) {
          tracks.push(
            new THREE.QuaternionKeyframeTrack(
              `${vrmNodeName}.${propertyName}`,
              track.times,
              track.values.map((v, i) => (version === '0' && i % 2 === 0 ? -v : v))
            )
          )
        } else if (track instanceof THREE.VectorKeyframeTrack && propertyName === 'position') {
          const scaler = height * scale
          tracks.push(
            new THREE.VectorKeyframeTrack(
              `${vrmNodeName}.${propertyName}`,
              track.times,
              track.values.map((v, i) => {
                return (version === '0' && i % 3 !== 1 ? -v : v) * scaler
              })
            )
          )
        }
      }

      return new THREE.AnimationClip(clip.name, clip.duration, tracks)
    },
  }
}

export function createEmoteFactory(glb, url, queryParams = {}) {
  // console.time('emote-init')

  // Extract animation name from URL parameters
  const animName = queryParams.name || queryParams.animation

  // Find the requested animation, fallback to first
  let clip = glb.animations[0]
  if (animName && glb.animations.length > 1) {
    const found = glb.animations.find(a => a.name === animName)
    if (found) clip = found
  }

  // Auto-detect: if clip uses VRM-standard bone names, skip Mixamo retargeting
  if (clip && clip.tracks.some(t => {
    const n = extractBoneName(t.name)
    return vrmNormalizedNames.has(n)
  })) {
    return createDirectEmoteFactory(glb, url, queryParams)
  }

  // Safety check: ensure GLB has children before accessing scale
  if (!glb.scene.children || glb.scene.children.length === 0) {
    // console.error(`[createEmoteFactory] GLB has no children, cannot process emote. URL: ${url}`)
    // Return a minimal factory that returns empty clips
    return {
      toClip() {
        return new THREE.AnimationClip('empty', 0, [])
      },
    }
  }

  const scale = glb.scene.children[0].scale.x // armature should be here?

  const yOffset = queryParams.y !== undefined ? parseFloat(queryParams.y) : -0.05 / scale

  // we only keep tracks that are:
  // 1. the root position
  // 2. the quaternions
  // scale and other positions are rejected.
  // NOTE: there is a risk that the first position track is not the root but
  // i haven't been able to find one so far.
  let haveRoot

  clip.tracks = clip.tracks.filter(track => {
    if (track instanceof THREE.VectorKeyframeTrack) {
      const [name, type] = track.name.split('.')
      if (type !== 'position') return
      // we need both root and hip bones
      if (name === 'Root') {
        haveRoot = true
        return true
      }
      if (name === 'mixamorigHips') {
        return true
      }
      return false
    }
    return true
  })

  // if (!haveRoot) console.warn(`emote missing root bone: ${url}`)

  // fix new mixamo update normalized bones
  // see: https://github.com/pixiv/three-vrm/pull/1032/files
  let tracked = 0
  clip.tracks.forEach(track => {
    const mixamoRigName = extractBoneName(track.name)
    let mixamoRigNode = glb.scene.getObjectByName(mixamoRigName)
    if (!mixamoRigNode) {
      const altName = mixamoRigName.replace(/\.([LR])$/i, '$1')
      if (altName !== mixamoRigName) {
        mixamoRigNode = glb.scene.getObjectByName(altName)
      }
    }
    if (!mixamoRigNode) {
      return
    }
    tracked++
    mixamoRigNode.getWorldQuaternion(restRotationInverse).invert()
    const parent = mixamoRigNode.parent
    if (!parent) {
      // console.warn(`[createEmoteFactory] Bone ${mixamoRigName} has no parent in ${url}`)
      return
    }
    parent.getWorldQuaternion(parentRestWorldRotation)
    if (track instanceof THREE.QuaternionKeyframeTrack) {
      // Retarget rotation of mixamoRig to NormalizedBone.
      for (let i = 0; i < track.values.length; i += 4) {
        const flatQuaternion = track.values.slice(i, i + 4)
        q1.fromArray(flatQuaternion)
        // 親のレスト時ワールド回転 * トラックの回転 * レスト時ワールド回転の逆
        q1.premultiply(parentRestWorldRotation).multiply(restRotationInverse)
        q1.toArray(flatQuaternion)
        flatQuaternion.forEach((v, index) => {
          track.values[index + i] = v
        })
      }
    } else if (track instanceof THREE.VectorKeyframeTrack) {
      if (yOffset) {
        track.values = track.values.map((v, i) => {
          // if this is Y then offset it
          if (i % 3 === 1) {
            // console.log(v, v + yOffset)
            return v + yOffset
          }
          return v
        })
      }
    }
  })

  console.warn(`[emote] retargeted ${tracked}/${clip.tracks.length} tracks for ${url}`)
  clip.optimize()

  return {
    toClip({ rootToHips, version, getBoneName, hasBone }) {
      const height = rootToHips

      const tracks = []

      clip.tracks.forEach(track => {
        const i = track.name.lastIndexOf('.')
        const ogBoneName = i > 0 ? track.name.slice(0, i) : track.name
        const propertyName = track.name.slice(i + 1)
        const vrmBoneName = normalizedBoneNames[ogBoneName] || normalizeBoneName(ogBoneName)
        const mappedName = getBoneName(vrmBoneName)
        const candidates = [mappedName, ogBoneName, vrmBoneName].filter(Boolean)
        const vrmNodeName = hasBone && mappedName
          ? candidates.find(n => hasBone(n)) || mappedName
          : mappedName

        const scaler = height * scale

        if (vrmNodeName) {

          if (track instanceof THREE.QuaternionKeyframeTrack) {
            tracks.push(
              new THREE.QuaternionKeyframeTrack(
                `${vrmNodeName}.${propertyName}`,
                track.times,
                track.values.map((v, i) => (version === '0' && i % 2 === 0 ? -v : v))
              )
            )
          } else if (track instanceof THREE.VectorKeyframeTrack) {
            tracks.push(
              new THREE.VectorKeyframeTrack(
                `${vrmNodeName}.${propertyName}`,
                track.times,
                track.values.map((v, i) => {
                  return (version === '0' && i % 3 !== 1 ? -v : v) * scaler
                })
              )
            )
          }
        }
      })

      return new THREE.AnimationClip(
        clip.name,
        clip.duration,
        tracks
      )
    },
  }
}

const normalizedBoneNames = {
  // vrm standard
  hips: 'hips',
  spine: 'spine',
  chest: 'chest',
  upperChest: 'upperChest',
  neck: 'neck',
  head: 'head',
  leftShoulder: 'leftShoulder',
  leftUpperArm: 'leftUpperArm',
  leftLowerArm: 'leftLowerArm',
  leftHand: 'leftHand',
  leftThumbProximal: 'leftThumbProximal',
  leftThumbIntermediate: 'leftThumbIntermediate',
  leftThumbDistal: 'leftThumbDistal',
  leftIndexProximal: 'leftIndexProximal',
  leftIndexIntermediate: 'leftIndexIntermediate',
  leftIndexDistal: 'leftIndexDistal',
  leftMiddleProximal: 'leftMiddleProximal',
  leftMiddleIntermediate: 'leftMiddleIntermediate',
  leftMiddleDistal: 'leftMiddleDistal',
  leftRingProximal: 'leftRingProximal',
  leftRingIntermediate: 'leftRingIntermediate',
  leftRingDistal: 'leftRingDistal',
  leftLittleProximal: 'leftLittleProximal',
  leftLittleIntermediate: 'leftLittleIntermediate',
  leftLittleDistal: 'leftLittleDistal',
  rightShoulder: 'rightShoulder',
  rightUpperArm: 'rightUpperArm',
  rightLowerArm: 'rightLowerArm',
  rightHand: 'rightHand',
  rightLittleProximal: 'rightLittleProximal',
  rightLittleIntermediate: 'rightLittleIntermediate',
  rightLittleDistal: 'rightLittleDistal',
  rightRingProximal: 'rightRingProximal',
  rightRingIntermediate: 'rightRingIntermediate',
  rightRingDistal: 'rightRingDistal',
  rightMiddleProximal: 'rightMiddleProximal',
  rightMiddleIntermediate: 'rightMiddleIntermediate',
  rightMiddleDistal: 'rightMiddleDistal',
  rightIndexProximal: 'rightIndexProximal',
  rightIndexIntermediate: 'rightIndexIntermediate',
  rightIndexDistal: 'rightIndexDistal',
  rightThumbProximal: 'rightThumbProximal',
  rightThumbIntermediate: 'rightThumbIntermediate',
  rightThumbDistal: 'rightThumbDistal',
  leftUpperLeg: 'leftUpperLeg',
  leftLowerLeg: 'leftLowerLeg',
  leftFoot: 'leftFoot',
  leftToes: 'leftToes',
  rightUpperLeg: 'rightUpperLeg',
  rightLowerLeg: 'rightLowerLeg',
  rightFoot: 'rightFoot',
  rightToes: 'rightToes',
  // vrm uploaded to mixamo
  // these are latest mixamo bone names
  Hips: 'hips',
  Spine: 'spine',
  Spine1: 'chest',
  Spine2: 'upperChest',
  Neck: 'neck',
  Head: 'head',
  LeftShoulder: 'leftShoulder',
  LeftArm: 'leftUpperArm',
  LeftForeArm: 'leftLowerArm',
  LeftHand: 'leftHand',
  LeftHandThumb1: 'leftThumbProximal',
  LeftHandThumb2: 'leftThumbIntermediate',
  LeftHandThumb3: 'leftThumbDistal',
  LeftHandIndex1: 'leftIndexProximal',
  LeftHandIndex2: 'leftIndexIntermediate',
  LeftHandIndex3: 'leftIndexDistal',
  LeftHandMiddle1: 'leftMiddleProximal',
  LeftHandMiddle2: 'leftMiddleIntermediate',
  LeftHandMiddle3: 'leftMiddleDistal',
  LeftHandRing1: 'leftRingProximal',
  LeftHandRing2: 'leftRingIntermediate',
  LeftHandRing3: 'leftRingDistal',
  LeftHandPinky1: 'leftLittleProximal',
  LeftHandPinky2: 'leftLittleIntermediate',
  LeftHandPinky3: 'leftLittleDistal',
  RightShoulder: 'rightShoulder',
  RightArm: 'rightUpperArm',
  RightForeArm: 'rightLowerArm',
  RightHand: 'rightHand',
  RightHandPinky1: 'rightLittleProximal',
  RightHandPinky2: 'rightLittleIntermediate',
  RightHandPinky3: 'rightLittleDistal',
  RightHandRing1: 'rightRingProximal',
  RightHandRing2: 'rightRingIntermediate',
  RightHandRing3: 'rightRingDistal',
  RightHandMiddle1: 'rightMiddleProximal',
  RightHandMiddle2: 'rightMiddleIntermediate',
  RightHandMiddle3: 'rightMiddleDistal',
  RightHandIndex1: 'rightIndexProximal',
  RightHandIndex2: 'rightIndexIntermediate',
  RightHandIndex3: 'rightIndexDistal',
  RightHandThumb1: 'rightThumbProximal',
  RightHandThumb2: 'rightThumbIntermediate',
  RightHandThumb3: 'rightThumbDistal',
  LeftUpLeg: 'leftUpperLeg',
  LeftLeg: 'leftLowerLeg',
  LeftFoot: 'leftFoot',
  LeftToeBase: 'leftToes',
  RightUpLeg: 'rightUpperLeg',
  RightLeg: 'rightLowerLeg',
  RightFoot: 'rightFoot',
  RightToeBase: 'rightToes',
  // additional variations to above, eg unity fbx
  Chest: 'chest',
  UpperChest: 'upperChest',
  LeftUpperLeg: 'leftUpperLeg',
  LeftLowerLeg: 'leftLowerLeg',
  LeftUpperArm: 'leftUpperArm',
  LeftLowerArm: 'leftLowerArm',
  RightUpperLeg: 'rightUpperLeg',
  RightLowerLeg: 'rightLowerLeg',
  RightUpperArm: 'rightUpperArm',
  RightLowerArm: 'rightLowerArm',
  // these must be old mixamo names, prefixed with "mixamo"
  mixamorigHips: 'hips',
  mixamorigSpine: 'spine',
  mixamorigSpine1: 'chest',
  mixamorigSpine2: 'upperChest',
  mixamorigNeck: 'neck',
  mixamorigHead: 'head',
  mixamorigLeftShoulder: 'leftShoulder',
  mixamorigLeftArm: 'leftUpperArm',
  mixamorigLeftForeArm: 'leftLowerArm',
  mixamorigLeftHand: 'leftHand',
  mixamorigLeftHandThumb1: 'leftThumbProximal',
  mixamorigLeftHandThumb2: 'leftThumbIntermediate',
  mixamorigLeftHandThumb3: 'leftThumbDistal',
  mixamorigLeftHandIndex1: 'leftIndexProximal',
  mixamorigLeftHandIndex2: 'leftIndexIntermediate',
  mixamorigLeftHandIndex3: 'leftIndexDistal',
  mixamorigLeftHandMiddle1: 'leftMiddleProximal',
  mixamorigLeftHandMiddle2: 'leftMiddleIntermediate',
  mixamorigLeftHandMiddle3: 'leftMiddleDistal',
  mixamorigLeftHandRing1: 'leftRingProximal',
  mixamorigLeftHandRing2: 'leftRingIntermediate',
  mixamorigLeftHandRing3: 'leftRingDistal',
  mixamorigLeftHandPinky1: 'leftLittleProximal',
  mixamorigLeftHandPinky2: 'leftLittleIntermediate',
  mixamorigLeftHandPinky3: 'leftLittleDistal',
  mixamorigRightShoulder: 'rightShoulder',
  mixamorigRightArm: 'rightUpperArm',
  mixamorigRightForeArm: 'rightLowerArm',
  mixamorigRightHand: 'rightHand',
  mixamorigRightHandPinky1: 'rightLittleProximal',
  mixamorigRightHandPinky2: 'rightLittleIntermediate',
  mixamorigRightHandPinky3: 'rightLittleDistal',
  mixamorigRightHandRing1: 'rightRingProximal',
  mixamorigRightHandRing2: 'rightRingIntermediate',
  mixamorigRightHandRing3: 'rightRingDistal',
  mixamorigRightHandMiddle1: 'rightMiddleProximal',
  mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
  mixamorigRightHandMiddle3: 'rightMiddleDistal',
  mixamorigRightHandIndex1: 'rightIndexProximal',
  mixamorigRightHandIndex2: 'rightIndexIntermediate',
  mixamorigRightHandIndex3: 'rightIndexDistal',
  mixamorigRightHandThumb1: 'rightThumbProximal',
  mixamorigRightHandThumb2: 'rightThumbIntermediate',
  mixamorigRightHandThumb3: 'rightThumbDistal',
  mixamorigLeftUpLeg: 'leftUpperLeg',
  mixamorigLeftLeg: 'leftLowerLeg',
  mixamorigLeftFoot: 'leftFoot',
  mixamorigLeftToeBase: 'leftToes',
  mixamorigRightUpLeg: 'rightUpperLeg',
  mixamorigRightLeg: 'rightLowerLeg',
  mixamorigRightFoot: 'rightFoot',
  mixamorigRightToeBase: 'rightToes',
}

const boneNameAliases = {
  spine:        'spine',
  spine1:       'chest',
  spine2:       'upperChest',
  chest:        'chest',
  chest2:       'upperChest',
  chest_end:    'upperChest',
  upperChest:   'upperChest',
  neck:         'neck',
  head:         'head',
  shoulder:     { L: 'leftShoulder', R: 'rightShoulder' },
  upperArm:     { L: 'leftUpperArm', R: 'rightUpperArm' },
  lowerArm:     { L: 'leftLowerArm', R: 'rightLowerArm' },
  forearm:      { L: 'leftLowerArm', R: 'rightLowerArm' },
  hand:         { L: 'leftHand',     R: 'rightHand' },
  upperLeg:     { L: 'leftUpperLeg', R: 'rightUpperLeg' },
  thigh:        { L: 'leftUpperLeg', R: 'rightUpperLeg' },
  lowerLeg:     { L: 'leftLowerLeg', R: 'rightLowerLeg' },
  shin:         { L: 'leftLowerLeg', R: 'rightLowerLeg' },
  foot:         { L: 'leftFoot',     R: 'rightFoot' },
  toe:          { L: 'leftToes',     R: 'rightToes' },
}

const vrmNormalizedNames = new Set(Object.values(normalizedBoneNames))
