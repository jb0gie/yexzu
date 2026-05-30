import * as THREE from './three'

const allowedBonePatterns = [
  'upper_arm.R', 'upper_arm.L', 'upperarm.r', 'upperarm.l',
  'lower_arm.R', 'lower_arm.L', 'lowerarm.r', 'lowerarm.l',
  'hand.R', 'hand.L', 'hand.r', 'hand.l',
  'shoulder.R', 'shoulder.L', 'shoulder.r', 'shoulder.l',
  'upperarm.r', 'upperarm.l', 'upper_arm.r', 'upper_arm.l',
  'lowerarm.r', 'lowerarm.l', 'lower_arm.r', 'lower_arm.l',
  'chest', 'spine', 'neck', 'head',
  'leftupperarm', 'left_upper_arm', 'upperarml', 'upper_arml', 'upperarm_l', 'upper_arm_l', 'upperArmL',
  'leftlowerarm', 'left_lower_arm', 'lowerarml', 'lower_arml', 'lowerarm_l', 'lower_arm_l', 'lowerArmL',
  'lefthand', 'left_hand', 'handl', 'hand_l', 'handL', 'leftwrist', 'left_wrist', 'wristl', 'wrist_l', 'wristL',
  'rightupperarm', 'right_upper_arm', 'upperarmr', 'upper_armr', 'upperarm_r', 'upper_arm_r', 'upperArmR',
  'rightlowerarm', 'right_lower_arm', 'lowerarmr', 'lower_armr', 'lowerarm_r', 'lower_arm_r', 'lowerArmR',
  'righthand', 'right_hand', 'handr', 'hand_r', 'handR', 'rightwrist', 'right_wrist', 'wristr', 'wrist_r', 'wristR',
  'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand',
  'leftarm', 'left_arm', 'arml', 'arm_l', 'armL', 'rightarm', 'right_arm', 'armr', 'arm_r', 'armR',
  'leftforearm', 'left_forearm', 'forearml', 'forearm_l', 'forearmL',
  'rightforearm', 'right_forearm', 'forearmr', 'forearm_r', 'forearmR',
  'finger', 'thumb', 'index', 'middle', 'ring', 'pinky',
  'proximal', 'intermediate', 'distal',
  'leftfinger', 'rightfinger', 'leftthumb', 'rightthumb',
  'leftindex', 'rightindex', 'leftmiddle', 'rightmiddle',
  'leftring', 'rightring', 'leftpinky', 'rightpinky',
]

export function getAffectedBones(clip) {
  const affectedBones = new Set()
  for (const track of clip.tracks) {
    const boneName = track.name.split('.')[0]
    affectedBones.add(boneName)
  }
  return affectedBones
}

export function filterWeaponBones(affectedBones) {
  const weaponBones = new Set()
  for (const bone of affectedBones) {
    const boneLower = bone.toLowerCase()
    const isAllowed = allowedBonePatterns.some(
      pattern => boneLower.includes(pattern) || pattern.includes(boneLower)
    )
    if (isAllowed) weaponBones.add(bone)
  }
  return weaponBones
}

function createFilteredClip(originalClip, allowedBones) {
  const filteredTracks = []
  for (const track of originalClip.tracks) {
    const boneName = track.name.split('.')[0]
    if (allowedBones.has(boneName)) {
      filteredTracks.push(track)
    }
  }
  if (filteredTracks.length === 0) {
    console.warn(`[VRM] No tracks remaining after filtering for bones:`, Array.from(allowedBones))
    return originalClip
  }
  return new THREE.AnimationClip(originalClip.name, originalClip.duration, filteredTracks)
}

function convertToDeltaClip(clip, skeleton) {
  const deltaTracks = []
  for (const track of clip.tracks) {
    const trackName = track.name
    const boneName = trackName.split('.')[0]
    const propertyName = trackName.split('.')[1]
    const bone = skeleton.getBoneByName(boneName)
    if (!bone) {
      console.warn(`[VRM] Bone not found for delta conversion: ${boneName}`)
      deltaTracks.push(track.clone())
      continue
    }
    if (propertyName === 'quaternion' && track instanceof THREE.QuaternionKeyframeTrack) {
      const bindRotation = bone.quaternion.clone()
      const deltaValues = new Float32Array(track.values.length)
      for (let i = 0; i < track.values.length; i += 4) {
        const keyframeQuat = new THREE.Quaternion(
          track.values[i], track.values[i + 1], track.values[i + 2], track.values[i + 3]
        )
        const deltaQuat = keyframeQuat.premultiply(bindRotation.clone().invert())
        deltaValues[i] = deltaQuat.x
        deltaValues[i + 1] = deltaQuat.y
        deltaValues[i + 2] = deltaQuat.z
        deltaValues[i + 3] = deltaQuat.w
      }
      const deltaTrack = new THREE.QuaternionKeyframeTrack(trackName, track.times, deltaValues)
      deltaTracks.push(deltaTrack)
    } else {
      deltaTracks.push(track.clone())
    }
  }
  return new THREE.AnimationClip(clip.name + '_delta', clip.duration, deltaTracks)
}

export function createVRMAdditiveAnimations({ mixer, hooks, skeleton, rootToHips, version, getBoneName }) {
  const additiveAnimations = {}
  const currentAdditiveAnims = new Map()

  function loadAdditiveAnimation(url, options = {}) {
    const { fadeDuration = 0.15, weight = 1.0 } = options

    if (additiveAnimations[url]) {
      const anim = additiveAnimations[url]
      anim.targetWeight = weight
      anim.fadeSpeed = 1 / fadeDuration
      currentAdditiveAnims.set(url, anim)
      return Promise.resolve(anim)
    }

    return hooks.loader
      .load('emote', url)
      .then(emo => {
        const originalClip = emo.toClip({
          rootToHips,
          version,
          getBoneName,
        })
        const allAffectedBones = getAffectedBones(originalClip)
        const filteredBones = filterWeaponBones(allAffectedBones)
        const filteredClip = createFilteredClip(originalClip, filteredBones)
        const deltaClip = convertToDeltaClip(filteredClip, skeleton)
        const action = mixer.clipAction(deltaClip)
        action.blendMode = THREE.AdditiveAnimationBlendMode
        action.setLoop(options.loop !== false ? THREE.LoopRepeat : THREE.LoopOnce)
        action.weight = 0
        action.enabled = true
        action.clampWhenFinished = false
        action.play()
        const anim = {
          url,
          action,
          affectedBones: filteredBones,
          weight: 0,
          targetWeight: weight,
          fadeSpeed: 1 / fadeDuration,
        }
        additiveAnimations[url] = anim
        currentAdditiveAnims.set(url, anim)
        return anim
      })
      .catch(error => {
        console.error(`[VRM] Failed to load additive animation: ${url}`, error)
        throw error
      })
  }

  function stopAdditiveAnimation(url, fadeDuration = 0.15) {
    const anim = additiveAnimations[url]
    if (!anim) return
    anim.targetWeight = 0
    anim.fadeSpeed = 1 / fadeDuration
    currentAdditiveAnims.delete(url)
  }

  function update(delta) {
    for (const [url, anim] of currentAdditiveAnims) {
      const weightDiff = anim.targetWeight - anim.weight
      if (Math.abs(weightDiff) > 0.01) {
        anim.weight += weightDiff * anim.fadeSpeed * delta
        anim.action.weight = anim.weight
      } else {
        anim.weight = anim.targetWeight
        anim.action.weight = anim.weight
      }
      if (anim.weight > 0.01) {
        anim.action.enabled = true
        if (!anim.action.isRunning()) {
          anim.action.play()
        }
      }
      if (anim.weight <= 0.01 && anim.targetWeight === 0) {
        anim.action.enabled = false
        anim.action.stop()
        currentAdditiveAnims.delete(url)
      }
    }
  }

  return {
    currentAdditiveAnims,
    loadAdditiveAnimation,
    stopAdditiveAnimation,
    update,
    getAdditiveAnimations() {
      return Array.from(currentAdditiveAnims.keys())
    },
  }
}
