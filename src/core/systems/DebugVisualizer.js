import * as THREE from '../extras/three'
import { System } from './System'
import { Collider } from '../nodes/Collider'
import { Joint } from '../nodes/Joint'
import { RigidBody } from '../nodes/RigidBody'
import { storage } from '../storage'

const SHOW_DISTANCE = 50
const STORAGE_KEY = 'debugPhysics'

// Cached shapes keyed by `type:w:h:d:r` so identical colliders reuse geometry
const _shapeCache = new Map()

function getShape(key, factory) {
  let entry = _shapeCache.get(key)
  if (!entry) {
    const result = factory()
    entry = { geo: result.geo, edges: new THREE.EdgesGeometry(result.geo) }
    if (result.wireframe) entry.wireframe = new THREE.WireframeGeometry(result.geo)
    _shapeCache.set(key, entry)
  }
  return entry
}

function disposeShapeCache() {
  for (const entry of _shapeCache.values()) {
    entry.geo.dispose()
    entry.edges.dispose()
    entry.wireframe?.dispose()
  }
  _shapeCache.clear()
}

/** Debug physics visualization via wireframe overlays.
 *
 * Client-only. Toggle with `/debug physics` in chat.
 * State persists to localStorage so it survives page reloads.
 */
export class DebugVisualizer extends System {
  constructor(world) {
    super(world)
    this.enabled = false
    this.group = new THREE.Group()
    this.group.name = 'debug-physics'
    this.entries = [] // { group, update? }
    this._raycastOrig = null // saved original raycast for monkey-patch
    this._raycastArrow = null // ponytail: one arrow helper to reuse
    this._raycastDot = null // ponytail: one hit-sphere to reuse
    this._pendingRebuild = false // defer rebuild until world is ready
  }

  init() {
    this.world.chat.bindCommand('debug', this.onCommand)
  }

  start() {
    this.group.visible = false
    this.world.stage.scene.add(this.group)
    // ponytail: start disabled by default so new sessions start clean
    this.enabled = false
    this.group.visible = false
    // Monkey-patch physics raycast for debug visualization
    if (this.world.physics) {
      const physics = this.world.physics
      this._raycastOrig = physics.raycast.bind(physics)
      physics.raycast = (origin, direction, maxDistance, layerMask) => {
        const hit = this._raycastOrig(origin, direction, maxDistance, layerMask)
        if (this.enabled) this.showRaycast(origin, direction, maxDistance, hit)
        return hit
      }
    }
    // ponytail: keep debug visuals in sync as entities spawn/despawn
    this.world.entities.on('added', this._onEntityAdded)
    this.world.entities.on('removed', this._onEntityRemoved)
  }

  _onEntityAdded = () => {
    if (this.enabled) this.rebuild()
  }

  _onEntityRemoved = () => {
    if (this.enabled) this.rebuild()
  }

  // Listen for new/removed entities to keep debug shapes in sync
  rebuild() {
    this.clear()
    if (!this.world.physics) return
    const seen = new Set()
    // 1 — handles from Physics (RigidBody / Prim actors)
    for (const [ptr, handle] of this.world.physics.handles) {
      const node = handle?.node
      if (!node) continue
      seen.add(node)
      const mat = this.materialFor(node)
      const group = new THREE.Object3D()
      // RigidBody — visualize child colliders
      if (node instanceof RigidBody) {
        // ponytail: position group at the rigidbody's world position
        const pos = new THREE.Vector3()
        const quat = new THREE.Quaternion()
        node.matrixWorld.decompose(pos, quat, new THREE.Vector3())
        group.position.copy(pos)
        group.quaternion.copy(quat)
        group.scale.copy(node.scale)
        for (const child of node.children) {
          if (child instanceof Collider) {
            this.buildColliderShape(child, group, mat, false)
          }
        }
      }
      // Prim with inline physics — visualize its shape
      if (node.name === 'prim' && node.physics) {
        this.buildPrimShape(node, group, mat)
      }
      // Player capsule (local player has direct PhysX capsule)
      if (node.isPlayer && node.isLocal) {
        this.buildPlayerCapsule(node, group, mat)
      }
      if (group.children.length > 0) {
        this.group.add(group)
        const entry = { group, ref: node }
        // Determine update function
        if (node.isPlayer && node.isLocal) {
          // ponytail: PhysX capsule actor's position is at the feet (shape local pose offsets upward).
          // THREE CapsuleGeometry origin is at center, so shift group up so capsule bottom = feet.
          const r = node.capsuleRadius || 0.3
          const h = node.capsuleHeight || 1.6
          const halfHeight = (h - r - r) / 2
          const yOff = halfHeight + r
          entry.update = () => {
            // ponytail: read physics actor pose directly so wireframe never lags behind interpolation
            const pose = node.capsule?.getGlobalPose()
            if (!pose) return
            const p = pose.p
            group.position.set(p.x, p.y + yOff, p.z)
          }
        } else {
          entry.update = node.name === 'rigidbody' && node.type === 'dynamic'
            ? this.velocityUpdater(node, group)
            : null
        }
        this.entries.push(entry)
        // ponytail: sync all non-player debug shapes to world transform each frame (pos/rot/scale)
        if (!(node.isPlayer && node.isLocal)) {
          entry.update = () => {
            const p = new THREE.Vector3()
            const q = new THREE.Quaternion()
            const s = new THREE.Vector3()
            node.matrixWorld.decompose(p, q, s)
            group.position.copy(p)
            group.quaternion.copy(q)
            group.scale.copy(s)
          }
        }
        // ponytail: dynamic/kinematic Prims move via physics interpolation — already covered above
        if (node.name === 'prim' && node.physics && (node.physics === 'dynamic' || node.physics === 'kinematic')) {
          entry.update = () => {
            const p = new THREE.Vector3()
            const q = new THREE.Quaternion()
            const s = new THREE.Vector3()
            node.matrixWorld.decompose(p, q, s)
            group.position.copy(p)
            group.quaternion.copy(q)
            group.scale.copy(s)
          }
        }
      }
    }
    // 2 — traverse all entities for Joints (not in the handles map)
    for (const [id, entity] of this.world.entities.items) {
      // Entities either have root (Apps) or base (Players)
      const treeRoot = entity.root || entity.base
      if (!treeRoot) continue
      this.traverseNode(treeRoot, node => {
        if (seen.has(node)) return
        if (node instanceof Joint) {
          const g = this.buildJointShape(node)
          if (g) {
            this.group.add(g)
            this.entries.push({ group: g, ref: node })
          }
          seen.add(node)
        }
        // Colliders without a RigidBody parent - use world coords for primitives/apps
        if (node instanceof Collider && !seen.has(node)) {
          const mat = this.materialFor(node)
          const g = new THREE.Object3D()
          this.buildColliderShape(node, g, mat, true) // Use world coordinates
          if (g.children.length > 0) {
            this.group.add(g)
            // ponytail: sync orphan collider to world transform each frame (apps can move/scale)
            const entry = { group: g, ref: node }
            entry.update = () => {
              const p = new THREE.Vector3()
              const q = new THREE.Quaternion()
              const s = new THREE.Vector3()
              node.matrixWorld.decompose(p, q, s)
              // wireframe sub is the only child
              for (const sub of g.children) {
                sub.position.copy(p)
                sub.quaternion.copy(q)
                sub.scale.copy(s)
              }
            }
            this.entries.push(entry)
          }
          seen.add(node)
        }
      })
    }
  }

  clear() {
    for (const { group } of this.entries) {
      this.disposeTree(group)
      this.group.remove(group)
    }
    this.entries = []
  }

  // Command handler: /debug physics|redraw|refresh
  onCommand = (msg) => {
    if (msg.value === 'physics') {
      this.enabled = !this.enabled
      this.group.visible = this.enabled
      if (this.enabled) {
        this.rebuild()
      }
      storage.set(STORAGE_KEY, this.enabled)
      this.world.emit('toast', `Physics debug: ${this.enabled ? 'ON' : 'OFF'}`)
      return
    }
    if (msg.value === 'redraw' || msg.value === 'refresh') {
      if (this.enabled) {
        this.rebuild()
        this.world.emit('toast', 'Physics debug refreshed')
      }
      return
    }
  }

  // 3 — Raycast visualization
  showRaycast(origin, direction, maxDistance, hit) {
    // ponytail: reuse one arrow helper instead of allocating a new one per frame
    if (!this._raycastArrow) {
      this._raycastArrow = new THREE.ArrowHelper(
        new THREE.Vector3(),
        new THREE.Vector3(),
        0, 0xffffff, 0.2, 0.1
      )
    }
    const originV = new THREE.Vector3().copy(origin)
    const dirV = new THREE.Vector3().copy(direction).normalize()
    const len = hit ? hit.distance : Math.min(maxDistance || 50, 50)
    const color = hit ? 0xff4444 : 0xffffff
    this._raycastArrow.position.copy(originV)
    this._raycastArrow.setDirection(dirV)
    this._raycastArrow.setLength(len, 0.2, 0.1)
    this._raycastArrow.setColor(color)
    this._raycastArrow.visible = this.enabled && this.group.visible
    this.group.add(this._raycastArrow)
    // Hit sphere
    if (hit) {
      if (!this._raycastDot) {
        this._raycastDot = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff4444 })
        )
      }
      this._raycastDot.position.copy(hit.point)
      this._raycastDot.visible = true
      this.group.add(this._raycastDot)
      // Normal line (still fresh each time — rare enough not to matter)
      const nLen = 0.3
      const normalHelper = new THREE.ArrowHelper(
        hit.normal.clone().normalize(),
        hit.point.clone(),
        nLen,
        0xffaa00,
        0.1,
        0.05
      )
      this.group.add(normalHelper)
      this._cleanupLater(normalHelper, 2000)
    }
    this._cleanupLater(this._raycastArrow, 3000)
  }

  _cleanupLater(obj, ms) {
    setTimeout(() => {
      this.group.remove(obj)
      if (obj !== this._raycastArrow && obj !== this._raycastDot) {
        this.disposeTree(obj)
      }
    }, ms)
  }

  // 4 — PreUpdate: update positions each frame
  preUpdate() {
    if (!this.enabled) return
    if (this._pendingRebuild) {
      this._pendingRebuild = false
      this.rebuild()
    }
    const cam = this.world.camera
    for (const entry of this.entries) {
      if (entry.group) {
        const dist = cam.position.distanceTo(entry.group.position)
        entry.group.visible = dist < SHOW_DISTANCE
      }
      if (entry.update) entry.update()
    }
  }

  // 5 — Joint break flash
  onJointBreak() {
    // Flash a red pulse at a random nearby position
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshBasicMaterial({
        color: 0xff0000, transparent: true, opacity: 0.9,
      })
    )
    // Place near camera for visibility
    if (this.world.camera) {
      const dir = new THREE.Vector3(0, 0, -2)
      dir.applyQuaternion(this.world.camera.quaternion)
      flash.position.copy(this.world.camera.position).add(dir)
    }
    this.group.add(flash)
    const start = performance.now()
    const anim = () => {
      const elapsed = (performance.now() - start) / 1000
      if (elapsed > 1.2) {
        this.group.remove(flash)
        this.disposeTree(flash)
        return
      }
      flash.material.opacity = Math.max(0, 1 - elapsed)
      flash.scale.setScalar(1 + elapsed * 2)
      requestAnimationFrame(anim)
    }
    anim()
  }

  // Shape builders
  buildColliderShape(node, parent, mat, useWorld = false) {
    const sub = new THREE.Object3D()
    if (node.type === 'box') {
      const w = node.width || 1; const h = node.height || 1; const d = node.depth || 1
      const cached = getShape(`box:${w}:${h}:${d}`, () => ({
        geo: new THREE.BoxGeometry(w, h, d),
      }))
      if (node.trigger) sub.add(new THREE.Mesh(cached.geo, this.triggerMat()))
      sub.add(new THREE.LineSegments(cached.edges, mat))
      if (useWorld) {
        const pos = new THREE.Vector3()
        const quat = new THREE.Quaternion()
        node.matrixWorld.decompose(pos, quat, new THREE.Vector3())
        sub.position.copy(pos)
        sub.quaternion.copy(quat)
      } else {
        this.applyNodeTransform(sub, node)
      }
    } else if (node.type === 'sphere') {
      const r = node.radius || 0.5
      const cached = getShape(`sphere:${r}`, () => ({
        geo: new THREE.SphereGeometry(r, 16, 12),
      }))
      if (node.trigger) sub.add(new THREE.Mesh(cached.geo, this.triggerMat()))
      sub.add(new THREE.LineSegments(cached.wireframe || cached.edges, mat))
      if (useWorld) {
        const pos = new THREE.Vector3()
        const quat = new THREE.Quaternion()
        node.matrixWorld.decompose(pos, quat, new THREE.Vector3())
        sub.position.copy(pos)
        sub.quaternion.copy(quat)
      } else {
        this.applyNodeTransform(sub, node)
      }
    } else if (node.type === 'geometry' && node._geometry) {
      const g = node._geometry.clone()
      if (node.trigger) sub.add(new THREE.Mesh(g, this.triggerMat()))
      sub.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), mat))
      if (useWorld) {
        const pos = new THREE.Vector3()
        const quat = new THREE.Quaternion()
        node.matrixWorld.decompose(pos, quat, new THREE.Vector3())
        sub.position.copy(pos)
        sub.quaternion.copy(quat)
      } else {
        this.applyNodeTransform(sub, node)
      }
    }
    if (sub.children.length > 0) parent.add(sub)
  }

  buildPrimShape(node, parent, mat) {
    // ponytail: physics actor is at world position (from matrixWorldOffset), so use world coords
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    node.matrixWorld.decompose(pos, quat, new THREE.Vector3())
    parent.position.copy(pos)
    parent.quaternion.copy(quat)
    const size = node.size || [1, 1, 1]
    const type = node.type || 'box'
    let key, geo
    switch (type) {
      case 'box': {
        const [w, h, d] = size; key = `box:${w}:${h}:${d}`
        const cached = getShape(key, () => ({ geo: new THREE.BoxGeometry(w, h, d) }))
        geo = cached.geo
        if (node.trigger) parent.add(new THREE.Mesh(geo, this.triggerMat()))
        parent.add(new THREE.LineSegments(cached.edges, mat))
        break
      }
      case 'sphere': {
        const [r] = size; key = `sphere:${r}`
        const cached = getShape(key, () => ({ geo: new THREE.SphereGeometry(r, 16, 12) }))
        geo = cached.geo
        if (node.trigger) parent.add(new THREE.Mesh(geo, this.triggerMat()))
        parent.add(new THREE.LineSegments(cached.wireframe || cached.edges, mat))
        break
      }
      case 'cylinder': {
        const [rt, rb, h] = size; key = `cyl:${rt}:${rb}:${h}`
        const cached = getShape(key, () => ({ geo: new THREE.CylinderGeometry(rt || 0.5, rb || 0.5, h || 1, 16) }))
        geo = cached.geo
        if (node.trigger) parent.add(new THREE.Mesh(geo, this.triggerMat()))
        parent.add(new THREE.LineSegments(cached.edges, mat))
        break
      }
      case 'cone': {
        const [r, h] = size; key = `cone:${r}:${h}`
        const cached = getShape(key, () => ({ geo: new THREE.ConeGeometry(r || 0.5, h || 1, 16) }))
        geo = cached.geo
        if (node.trigger) parent.add(new THREE.Mesh(geo, this.triggerMat()))
        parent.add(new THREE.LineSegments(cached.edges, mat))
        break
      }
      case 'torus': {
        const [r, t] = size; key = `torus:${r}:${t}`
        const cached = getShape(key, () => ({ geo: new THREE.TorusGeometry(r || 0.4, t || 0.1, 12, 24) }))
        geo = cached.geo
        if (node.trigger) parent.add(new THREE.Mesh(geo, this.triggerMat()))
        parent.add(new THREE.LineSegments(cached.edges, mat))
        break
      }
      default: {
        const cached = getShape('box:1:1:1', () => ({ geo: new THREE.BoxGeometry(1, 1, 1) }))
        geo = cached.geo
        parent.add(new THREE.LineSegments(cached.edges, mat))
      }
    }
  }

  buildPlayerCapsule(node, parent, mat) {
    // ponytail: (unused mat arg — kept for signature consistency with other builders)
    const r = node.capsuleRadius || 0.3
    const h = node.capsuleHeight || 1.6
    const inner = h - r * 2
    const key = `capsule:${r}:${inner}`
    const cached = getShape(key, () => ({
      geo: new THREE.CapsuleGeometry(r, Math.max(inner, 0.01), 8, 12),
    }))
    parent.add(new THREE.LineSegments(
      new THREE.WireframeGeometry(cached.geo),
      new THREE.LineBasicMaterial({ color: 0x00ff88, depthTest: true, transparent: true, opacity: 0.7 })
    ))
    // ponytail: initial position from physics actor; preUpdate overwrites each frame
    const pose = node.capsule?.getGlobalPose()
    const yOff = (inner / 2) + r
    if (pose) {
      parent.position.set(pose.p.x, pose.p.y + yOff, pose.p.z)
    }
  }

  buildJointShape(node) {
    const body0 = node.body0
    const body1 = node.body1
    if (!body0 && !body1) return null
    const pos0 = new THREE.Vector3()
    const pos1 = new THREE.Vector3()
    const quat0 = new THREE.Quaternion()
    const quat1 = new THREE.Quaternion()
    if (body0) body0.matrixWorld.decompose(pos0, quat0, new THREE.Vector3())
    if (body1) body1.matrixWorld.decompose(pos1, quat1, new THREE.Vector3())
    const g = new THREE.Object3D()
    if (body0 && body1) {
      const pts = [pos0.clone(), pos1.clone()]
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts)
      g.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
        color: 0xffff00, depthTest: true,
      })))
      // Cone limit for socket joints
      if (node.type === 'socket' && (node.limitY || node.limitZ)) {
        const axis = node.axis.clone().normalize()
        const dist = pos0.distanceTo(pos1) * 0.5 || 1
        const angle = Math.max(node.limitY || 10, node.limitZ || 10) * (Math.PI / 180)
        const coneR = dist * Math.tan(angle)
        if (coneR > 0.01) {
          const coneGeo = new THREE.ConeGeometry(coneR, dist, 16, 1, true)
          const coneMat = new THREE.LineBasicMaterial({
            color: 0xffaa00, transparent: true, opacity: 0.3, depthTest: true,
          })
          const cone = new THREE.LineSegments(new THREE.EdgesGeometry(coneGeo), coneMat)
          const holder = new THREE.Object3D()
          const up = new THREE.Vector3(0, 1, 0)
          holder.quaternion.setFromUnitVectors(up, axis)
          holder.position.copy(pos0).add(axis.clone().multiplyScalar(dist * 0.5))
          holder.add(cone)
          g.add(holder)
        }
      }
    }
    g.position.copy(pos0)
    return g.children.length > 0 ? g : null
  }

  // Utilities
  applyNodeTransform(obj, node) {
    obj.position.copy(node.position)
    obj.quaternion.copy(node.quaternion)
    obj.scale.copy(node.scale)
  }
  materialFor(node) {
    let color = 0x00ff00 // static green
    if (node instanceof RigidBody) {
      if (node.type === 'dynamic') color = 0xff8800
      else if (node.type === 'kinematic') color = 0x00ccff
    } else if (node instanceof Collider) {
      const p = node.parent
      if (p instanceof RigidBody) {
        if (p.type === 'dynamic') color = 0xff8800
        else if (p.type === 'kinematic') color = 0x00ccff
      }
    }
    return new THREE.LineBasicMaterial({
      color, depthTest: true, transparent: true, opacity: 0.8,
    })
  }
  triggerMat() {
    if (!this._triggerMat) {
      this._triggerMat = new THREE.MeshBasicMaterial({
        color: 0x00aaff, transparent: true, opacity: 0.15,
        depthWrite: false, side: THREE.DoubleSide,
      })
    }
    return this._triggerMat
  }
  velocityUpdater(node, group) {
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, 0xff8800,
    )
    group.add(arrow)
    return () => {
      try {
        const vel = node.getLinearVelocity(new THREE.Vector3())
        const len = vel.length()
        if (len > 0.05) {
          arrow.setDirection(vel.clone().normalize())
          arrow.setLength(Math.min(len * 0.3, 5), 0.2, 0.1)
          arrow.visible = true
        } else {
          arrow.visible = false
        }
      } catch {
        arrow.visible = false
      }
    }
  }
  traverseNode(node, fn) {
    if (!node) return
    fn(node)
    for (const child of node.children) {
      this.traverseNode(child, fn)
    }
  }
  disposeTree(obj) {
    if (obj.geometry && !_shapeCache.has(obj.geometry.uuid)) obj.geometry.dispose()
    if (obj.material) obj.material.dispose()
    for (const child of [...obj.children]) {
      this.disposeTree(child)
    }
  }
  destroy() {
    this.clear()
    // ponytail: remove entity listeners
    this.world.entities.off('added', this._onEntityAdded)
    this.world.entities.off('removed', this._onEntityRemoved)
    // Unpatch raycast
    if (this._raycastOrig && this.world.physics) {
      this.world.physics.raycast = this._raycastOrig
    }
    this.world.stage.scene.remove(this.group)
    this._triggerMat?.dispose()
    disposeShapeCache()
  }
}