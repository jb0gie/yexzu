import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from './three'

export const FORWARD = new THREE.Vector3(0, 0, -1)

export const DIST_MIN_RATE = 1 / 5
export const DIST_MAX_RATE = 1 / 60
export const DIST_MIN = 5
export const DIST_MAX = 60

export const MAX_GAZE_DISTANCE = 40

export const material = new THREE.MeshBasicMaterial()

export const AimAxis = {
  X: new THREE.Vector3(1, 0, 0),
  Y: new THREE.Vector3(0, 1, 0),
  Z: new THREE.Vector3(0, 0, 1),
  NEG_X: new THREE.Vector3(-1, 0, 0),
  NEG_Y: new THREE.Vector3(0, -1, 0),
  NEG_Z: new THREE.Vector3(0, 0, -1),
}

export const UpAxis = {
  X: new THREE.Vector3(1, 0, 0),
  Y: new THREE.Vector3(0, 1, 0),
  Z: new THREE.Vector3(0, 0, 1),
  NEG_X: new THREE.Vector3(-1, 0, 0),
  NEG_Y: new THREE.Vector3(0, -1, 0),
  NEG_Z: new THREE.Vector3(0, 0, -1),
}

export const Modes = {
  IDLE: 0,
  WALK: 1,
  RUN: 2,
  JUMP: 3,
  FALL: 4,
  FLY: 5,
  TALK: 6,
  FLIP: 7,
  BACKFLIP: 8,
  SIDEFLIP_LEFT: 9,
  SIDEFLIP_RIGHT: 10,
  STRAFE_JUMP_LEFT: 11,
  STRAFE_JUMP_RIGHT: 12,
  GRINDING: 13,
  CLIMBING: 14,
  LEDGE_HANGING: 15,
  AIR_DIVING: 16,
  WALL_SLIDING: 17,
}

export function cloneGLB(glb) {
  return { ...glb, scene: SkeletonUtils.clone(glb.scene) }
}

export function getSkinnedMeshes(scene) {
  const meshes = []
  scene.traverse(o => {
    if (o.isSkinnedMesh) {
      meshes.push(o)
    }
  })
  return meshes
}

export function createCapsule(radius, height) {
  const fullHeight = radius + height + radius
  const geometry = new THREE.CapsuleGeometry(radius, height)
  geometry.translate(0, fullHeight / 2, 0)
  return geometry
}

const queryParams = {}
export function getQueryParams(url) {
  if (!queryParams[url]) {
    url = new URL(url)
    const params = {}
    for (const [key, value] of url.searchParams.entries()) {
      params[key] = value
    }
    queryParams[url] = params
  }
  return queryParams[url]
}
