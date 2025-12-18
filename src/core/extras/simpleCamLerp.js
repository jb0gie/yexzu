import * as THREE from './three'
import { Layers } from './Layers'

const BACKWARD = new THREE.Vector3(0, 0, 1)

const v1 = new THREE.Vector3()

let sweepGeometry

const smoothing = 20
const MAX_CAM_DISTANCE = 0.4

export function simpleCamLerp(world, camera, target, delta) {
  // interpolate camera rotation
  const alpha = 1.0 - Math.exp(-smoothing * delta)
  camera.quaternion.slerp(target.quaternion, alpha)

  // Store base position (shoulder position from target)
  const basePosition = v1.copy(target.position)

  // Calculate backward direction from camera rotation
  const backward = v1.copy(BACKWARD).applyQuaternion(camera.quaternion)

  // Get target zoom distance and smooth it
  const targetDistance = target.zoom
  if (!camera.zoom || camera.zoom <= 0) {
    camera.zoom = targetDistance
  } else {
    const zoomAlpha = 6 * delta
    camera.zoom += (targetDistance - camera.zoom) * zoomAlpha
  }

  // Calculate desired offset position (move camera backward by zoom distance)
  const desiredPosition = basePosition.clone().add(backward.multiplyScalar(-camera.zoom))

  // raycast from base position backward to check for obstacles
  if (!sweepGeometry) sweepGeometry = new PHYSX.PxSphereGeometry(0.2)
  const layerMask = Layers.camera.mask
  const hit = world.physics.sweep(sweepGeometry, basePosition, backward, camera.zoom, layerMask)

  // Set camera position based on raycast result
  if (hit && hit.distance < camera.zoom) {
    // Hit something - place camera at hit point
    camera.position.copy(basePosition).add(backward.multiplyScalar(-hit.distance))
  } else {
    // No obstacle - use desired position
    camera.position.copy(desiredPosition)
  }
}
