import moment from 'moment'
import * as THREE from '../extras/three'
import { cloneDeep, isBoolean } from 'lodash-es'

import { System } from './System'

import { hashFile } from '../utils-client'
import { hasRole, uuid } from '../utils'
import { ControlPriorities } from '../extras/ControlPriorities'
import { importApp } from '../extras/appTools'
import { DEG2RAD, RAD2DEG } from '../extras/general'

const FORWARD = new THREE.Vector3(0, 0, -1)
const MAX_UPLOAD_SIZE = parseInt(process.env.PUBLIC_MAX_UPLOAD_SIZE || '100')
const SNAP_DISTANCE = 1
const SNAP_DEGREES = 5
const PROJECT_SPEED = 10
const PROJECT_MIN = 3
const PROJECT_MAX = 50

const v1 = new THREE.Vector3()
const q1 = new THREE.Quaternion()
const e1 = new THREE.Euler()

let gizmo;

class Gizmo {
  constructor(world) {
    this.world = world;

    // Create a group to hold all parts of the gizmo
    this.gizmoGroup = new THREE.Group();

    // X-axis arrow (red)
    const xArrow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    xArrow.rotation.z = -Math.PI / 2; // Rotate to align with X-axis
    xArrow.position.x = 0.5; // Position along X-axis
    this.gizmoGroup.add(xArrow);

    // Y-axis arrow (green)
    const yArrow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    yArrow.position.y = 0.5; // Position along Y-axis
    this.gizmoGroup.add(yArrow);

    // Z-axis arrow (blue)
    const zArrow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1),
      new THREE.MeshBasicMaterial({ color: 0x0000ff })
    );
    zArrow.rotation.x = Math.PI / 2; // Rotate to align with Z-axis
    zArrow.position.z = 0.5; // Position along Z-axis
    this.gizmoGroup.add(zArrow);

    // Add the gizmo group to the scene
    this.world.stage.scene.add(this.gizmoGroup);
    this.gizmoGroup.visible = false;
  }

  update(position) {
    this.gizmoGroup.position.copy(position);
    this.gizmoGroup.visible = true;
  }

  hide() {
    this.gizmoGroup.visible = false;
  }

  dispose() {
    this.world.stage.scene.remove(this.gizmoGroup);
    this.gizmoGroup.children.forEach(child => {
      child.geometry.dispose();
      child.material.dispose();
    });
  }
}

/**
 * Builder System
 *
 * - runs on the client
 * - listens for files being drag and dropped onto the window and handles them
 * - handles build mode
 *
 */
export class ClientBuilder extends System {
  constructor(world) {
    super(world)
    this.enabled = false
    this.gizmoMode = false; // Track whether we're in gizmo mode
    this.selectedAxis = null; // Track the selected axis

    this.selected = null
    this.target = new THREE.Object3D()
    this.target.rotation.reorder('YXZ')
    this.lastMoveSendTime = 0

    this.dropTarget = null
    this.file = null

    if (!gizmo) {
      gizmo = new Gizmo(this.world);
    }
  }

  async init({ viewport }) {
    this.viewport = viewport
    this.viewport.addEventListener('dragover', this.onDragOver)
    this.viewport.addEventListener('dragenter', this.onDragEnter)
    this.viewport.addEventListener('dragleave', this.onDragLeave)
    this.viewport.addEventListener('drop', this.onDrop)
    this.world.on('player', this.onLocalPlayer)
  }

  start() {
    this.control = this.world.controls.bind({ priority: ControlPriorities.BUILDER })
    this.updateActions()
  }

  onLocalPlayer = () => {
    this.updateActions()
  }

  canBuild() {
    return hasRole(this.world.entities.player?.data.roles, 'admin', 'builder')
  }

  updateActions() {
    const actions = []
    if (!this.enabled) {
      if (this.canBuild()) {
        actions.push({ type: 'tab', label: 'Build Mode' })
      }
    }
    if (this.enabled && !this.selected) {
      actions.push({ type: 'tab', label: 'Exit Build Mode' })
      actions.push({ type: 'space', label: 'Jump / Fly (Double-Tap)' })
      actions.push({ type: 'keyR', label: 'Inspect' })
      actions.push({ type: 'keyU', label: 'Unlink' })
      actions.push({ type: 'keyP', label: 'Pin' })
      actions.push({ type: 'mouseLeft', label: 'Grab' })
      actions.push({ type: 'mouseRight', label: 'Duplicate' })
      actions.push({ type: 'keyX', label: 'Destroy' })
    }
    if (this.enabled && this.selected) {
      actions.push({ type: 'tab', label: 'Exit Build Mode' })
      actions.push({ type: 'space', label: 'Jump / Fly (Double-Tap)' })
      actions.push({ type: 'keyR', label: 'Inspect' })
      actions.push({ type: 'keyU', label: 'Unlink' })
      actions.push({ type: 'keyP', label: 'Pin' })
      actions.push({ type: 'mouseLeft', label: 'Place' })
      actions.push({ type: 'mouseWheel', label: 'Rotate' })
      actions.push({ type: 'mouseRight', label: 'Duplicate' })
      actions.push({ type: 'keyX', label: 'Destroy' })
      actions.push({ type: 'controlLeft', label: 'No Snap (Hold)' })
      actions.push({ type: 'keyF', label: 'Push' })
      actions.push({ type: 'keyC', label: 'Pull' })
    }
    this.control.setActions(actions)
  }

  update(delta) {
    if (this.control.tab.pressed) {
      this.toggle()
    }

    if (!this.enabled) return

    // Toggle gizmo mode with G key
    if (this.control.keyG.pressed) {
      this.gizmoMode = !this.gizmoMode;
      this.world.emit('gizmo-mode', this.gizmoMode);
      console.log(`Gizmo mode: ${this.gizmoMode}`);
    }

    if (!gizmo) {
      gizmo = new Gizmo(this.world);
    }

    const mouse = new THREE.Vector2()
    mouse.x = (this.control.mouseX / window.innerWidth) * 2 - 1
    mouse.y = -(this.control.mouseY / window.innerHeight) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, this.world.camera)

    const intersects = raycaster.intersectObjects(this.world.stage.scene.children, true)

    if (intersects.length > 0) {
      const entityAtReticle = intersects[0].object
      console.log("Entity detected:", entityAtReticle)
    }

    if (this.control.mouseLeft.pressed) {
      if (intersects.length > 0) {
        this.select(intersects[0].object)
        console.log("Picked up entity:", intersects[0].object)
      }
    }

    // Gizmo management
    if (this.gizmoMode && this.selected) {
      if (this.selected.root) {
        gizmo.update(this.selected.root.position)
        gizmo.gizmoGroup.visible = true;

        // Detect axis selection
        if (this.control.mouseLeft.pressed) {
          const gizmoIntersects = raycaster.intersectObjects(gizmo.gizmoGroup.children, true);
          if (gizmoIntersects.length > 0) {
            this.selectedAxis = gizmoIntersects[0].object;
            console.log("Selected axis:", this.selectedAxis);
          }
        }

        // Move along the selected axis
        if (this.selectedAxis) {
          const movement = this.calculateMovementAlongAxis(this.selectedAxis);
          this.selected.root.position.add(movement);
        }
      }
    } else {
      gizmo.hide()
      this.selectedAxis = null; // Reset selected axis when not in gizmo mode
    }

    // deselect if dead
    if (this.selected?.dead) {
      this.select(null)
    }
    // deselect if stolen
    if (this.selected && this.selected?.data.mover !== this.world.network.id) {
      this.select(null)
    }
    // inspect
    if (this.control.keyR.pressed) {
      const entity = this.getEntityAtReticle()
      if (entity) {
        this.select(null)
        this.control.pointer.unlock()
        this.world.emit('inspect', entity)
      }
    }
    // unlink
    if (this.control.keyU.pressed) {
      const entity = this.getEntityAtReticle()
      if (entity?.isApp) {
        this.select(null)
        // duplicate the blueprint
        const blueprint = {
          id: uuid(),
          version: 0,
          name: entity.blueprint.name,
          image: entity.blueprint.image,
          author: entity.blueprint.author,
          url: entity.blueprint.url,
          desc: entity.blueprint.desc,
          model: entity.blueprint.model,
          script: entity.blueprint.script,
          props: cloneDeep(entity.blueprint.props),
          preload: entity.blueprint.preload,
          public: entity.blueprint.public,
          locked: entity.blueprint.locked,
          frozen: entity.blueprint.frozen,
          unique: entity.blueprint.unique,
        }
        this.world.blueprints.add(blueprint, true)
        // assign new blueprint
        entity.modify({ blueprint: blueprint.id })
        this.world.network.send('entityModified', { id: entity.data.id, blueprint: blueprint.id })
        // toast
        this.world.emit('toast', 'Unlinked')
      }
    }
    // pin/unpin
    if (this.control.keyP.pressed) {
      const entity = this.getEntityAtReticle()
      if (entity?.isApp) {
        entity.data.pinned = !entity.data.pinned
        this.world.network.send('entityModified', {
          id: entity.data.id,
          pinned: entity.data.pinned,
        })
        this.world.emit('toast', entity.data.pinned ? 'Pinned' : 'Un-pinned')
      }
    }
    // grab
    if (this.control.pointer.locked && this.control.mouseLeft.pressed && !this.selected) {
      const entity = this.getEntityAtReticle()
      if (entity?.isApp && !entity.data.pinned) {
        this.select(entity)
      }
    }
    // place
    else if (this.control.pointer.locked && this.control.mouseLeft.pressed && this.selected) {
      this.select(null)
    }
    // duplicate
    if (this.control.pointer.locked && this.control.mouseRight.pressed) {
      const entity = this.selected || this.getEntityAtReticle()
      if (entity?.isApp) {
        let blueprintId = entity.data.blueprint
        // if unique, we also duplicate the blueprint
        if (entity.blueprint.unique) {
          const blueprint = {
            id: uuid(),
            version: 0,
            name: entity.blueprint.name,
            image: entity.blueprint.image,
            author: entity.blueprint.author,
            url: entity.blueprint.url,
            desc: entity.blueprint.desc,
            model: entity.blueprint.model,
            script: entity.blueprint.script,
            props: cloneDeep(entity.blueprint.props),
            preload: entity.blueprint.preload,
            public: entity.blueprint.public,
            locked: entity.blueprint.locked,
            frozen: entity.blueprint.frozen,
            unique: entity.blueprint.unique,
          }
          this.world.blueprints.add(blueprint, true)
          blueprintId = blueprint.id
        }
        const data = {
          id: uuid(),
          type: 'app',
          blueprint: blueprintId,
          position: entity.root.position.toArray(),
          quaternion: entity.root.quaternion.toArray(),
          mover: this.world.network.id,
          uploader: null,
          pinned: false,
          state: {},
        }
        const dup = this.world.entities.add(data, true)
        this.select(dup)
      }
    }
    // destroy
    if (this.control.keyX.pressed) {
      const entity = this.selected || this.getEntityAtReticle()
      if (entity?.isApp && !entity.data.pinned) {
        this.select(null)
        entity?.destroy(true)
      }
    }
    // TODO: move up/down
    // this.selected.position.y -= this.control.pointer.delta.y * delta * 0.5
    if (this.selected) {
      const app = this.selected
      const hit = this.getHitAtReticle(app, true)
      // place at distance
      const camPos = this.world.rig.position
      const camDir = v1.copy(FORWARD).applyQuaternion(this.world.rig.quaternion)
      const hitDistance = hit ? hit.point.distanceTo(camPos) : 0
      if (hit && hitDistance < this.target.limit) {
        // within range, use hit point
        this.target.position.copy(hit.point)
      } else {
        // no hit, project to limit
        this.target.position.copy(camPos).add(camDir.multiplyScalar(this.target.limit))
      }
      // if holding F/C then push or pull
      let project = this.control.keyF.down ? 1 : this.control.keyC.down ? -1 : null
      if (project) {
        const multiplier = this.control.shiftLeft.down ? 4 : 1
        this.target.limit += project * PROJECT_SPEED * delta * multiplier
        if (this.target.limit < PROJECT_MIN) this.target.limit = PROJECT_MIN
        if (hitDistance && this.target.limit > hitDistance) this.target.limit = hitDistance
      }
      // if not holding shift, mouse wheel rotates
      this.target.rotation.y += this.control.scrollDelta.value * 0.1 * delta
      // apply movement
      app.root.position.copy(this.target.position)
      app.root.quaternion.copy(this.target.quaternion)
      // snap rotation to degrees
      if (!this.control.controlLeft.down) {
        const newY = this.target.rotation.y
        const degrees = newY / DEG2RAD
        const snappedDegrees = Math.round(degrees / SNAP_DEGREES) * SNAP_DEGREES
        app.root.rotation.y = snappedDegrees * DEG2RAD
      }
      // update matrix
      app.root.clean()
      // and snap to any nearby points
      if (!this.control.controlLeft.down) {
        for (const pos of app.snaps) {
          const result = this.world.snaps.octree.query(pos, SNAP_DISTANCE)[0]
          if (result) {
            const offset = v1.copy(result.position).sub(pos)
            app.root.position.add(offset)
            break
          }
        }
      }

      // periodically send updates
      this.lastMoveSendTime += delta
      if (this.lastMoveSendTime > this.world.networkRate) {
        this.world.network.send('entityModified', {
          id: app.data.id,
          position: app.root.position.toArray(),
          quaternion: app.root.quaternion.toArray(),
        })
        this.lastMoveSendTime = 0
      }
    }
  }

  calculateMovementAlongAxis(axis) {
    const movementVector = new THREE.Vector3();
    const movementAmount = this.control.mouseDelta.x * 0.01; // Example movement amount

    if (axis === gizmo.gizmoGroup.children[0]) { // X-axis
      movementVector.set(movementAmount, 0, 0);
    } else if (axis === gizmo.gizmoGroup.children[1]) { // Y-axis
      movementVector.set(0, movementAmount, 0);
    } else if (axis === gizmo.gizmoGroup.children[2]) { // Z-axis
      movementVector.set(0, 0, movementAmount);
    }

    return movementVector;
  }

  toggle(enabled) {
    if (!this.canBuild()) return;
    enabled = typeof enabled === 'boolean' ? enabled : !this.enabled;
    if (this.enabled === enabled) return;
    this.enabled = enabled;

    if (!this.enabled) {
      this.select(null); // Deselect any selected entity
      if (gizmo) {
        gizmo.hide(); // Hide the gizmo when exiting build mode
      }
    }

    this.updateActions();
  }

  select(app) {
    // do nothing if not changed
    if (this.selected === app) return
    // deselect existing
    if (this.selected) {
      if (!this.selected.dead && this.selected.data.mover === this.world.network.id) {
        const app = this.selected
        app.data.mover = null
        app.data.position = app.root.position.toArray()
        app.data.quaternion = app.root.quaternion.toArray()
        app.data.state = {}
        this.world.network.send('entityModified', {
          id: app.data.id,
          mover: null,
          position: app.data.position,
          quaternion: app.data.quaternion,
          state: app.data.state,
        })
        app.build()
      }
      this.selected = null
      this.control.keyC.capture = false
      this.control.scrollDelta.capture = false
    }
    // select new (if any)
    if (app) {
      if (app.data.mover !== this.world.network.id) {
        app.data.mover = this.world.network.id
        app.build()
        this.world.network.send('entityModified', { id: app.data.id, mover: app.data.mover })
      }
      this.selected = app
      this.control.keyC.capture = true
      this.control.scrollDelta.capture = true
      this.target.position.copy(app.root.position)
      this.target.quaternion.copy(app.root.quaternion)
      this.target.limit = PROJECT_MAX
    }
    // update actions
    this.updateActions()
  }

  getEntityAtReticle() {
    const hits = this.world.stage.raycastReticle()
    let entity
    for (const hit of hits) {
      entity = hit.getEntity?.()
      if (entity) break
    }
    return entity
  }

  getHitAtReticle(ignoreEntity, ignorePlayers) {
    const hits = this.world.stage.raycastReticle()
    let hit
    for (const _hit of hits) {
      const entity = _hit.getEntity?.()
      if (entity === ignoreEntity || (entity?.isPlayer && ignorePlayers)) continue
      hit = _hit
      break
    }
    return hit
  }

  onDragOver = e => {
    e.preventDefault()
  }

  onDragEnter = e => {
    this.dropTarget = e.target
    this.dropping = true
    this.file = null
  }

  onDragLeave = e => {
    if (e.target === this.dropTarget) {
      this.dropping = false
    }
  }

  onDrop = async e => {
    e.preventDefault()
    this.dropping = false
    // ensure we have admin/builder role
    if (!this.canBuild()) {
      this.world.chat.add({
        id: uuid(),
        from: null,
        fromId: null,
        body: `You don't have permission to do that.`,
        createdAt: moment().toISOString(),
      })
      return
    }
    // handle drop
    let file
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const item = e.dataTransfer.items[0]
      if (item.kind === 'file') {
        file = item.getAsFile()
      }
      // Handle multiple MIME types for URLs
      if (item.type === 'text/uri-list' || item.type === 'text/plain' || item.type === 'text/html') {
        const text = await getAsString(item)
        // Extract URL from the text (especially important for text/html type)
        const url = text.trim().split('\n')[0] // Take first line in case of multiple
        if (url.startsWith('http')) {
          // Basic URL validation
          const resp = await fetch(url)
          const blob = await resp.blob()
          file = new File([blob], new URL(url).pathname.split('/').pop(), { type: resp.headers.get('content-type') })
        }
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      file = e.dataTransfer.files[0]
    }
    if (!file) return
    // slight delay to ensure we get updated pointer position from window focus
    await new Promise(resolve => setTimeout(resolve, 100))
    // ensure we in build mode
    this.toggle(true)
    // add it!
    const maxSize = MAX_UPLOAD_SIZE * 1024 * 1024
    if (file.size > maxSize) {
      this.world.chat.add({
        id: uuid(),
        from: null,
        fromId: null,
        body: `File size too large (>${MAX_UPLOAD_SIZE}mb)`,
        createdAt: moment().toISOString(),
      })
      console.error(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`)
      return
    }
    const transform = this.getSpawnTransform()
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'hyp') {
      this.addApp(file, transform)
    }
    if (ext === 'glb') {
      this.addModel(file, transform)
    }
    if (ext === 'vrm') {
      this.addAvatar(file, transform)
    }
  }

  async addApp(file, transform) {
    const info = await importApp(file)
    for (const asset of info.assets) {
      this.world.loader.insert(asset.type, asset.url, asset.file)
    }
    const blueprint = {
      id: uuid(),
      version: 0,
      name: info.blueprint.name,
      image: info.blueprint.image,
      author: info.blueprint.author,
      url: info.blueprint.url,
      desc: info.blueprint.desc,
      model: info.blueprint.model,
      script: info.blueprint.script,
      props: info.blueprint.props,
      preload: info.blueprint.preload,
      public: info.blueprint.public,
      locked: info.blueprint.locked,
      frozen: info.blueprint.frozen,
      unique: info.blueprint.unique,
    }
    this.world.blueprints.add(blueprint, true)
    const data = {
      id: uuid(),
      type: 'app',
      blueprint: blueprint.id,
      position: transform.position,
      quaternion: transform.quaternion,
      mover: null,
      uploader: this.world.network.id,
      pinned: false,
      state: {},
    }
    const app = this.world.entities.add(data, true)
    const promises = info.assets.map(asset => {
      return this.world.network.upload(asset.file)
    })
    try {
      await Promise.all(promises)
      app.onUploaded()
    } catch (err) {
      console.error('failed to upload .hyp assets')
      console.error(err)
      app.destroy()
    }
  }

  async addModel(file, transform) {
    // immutable hash the file
    const hash = await hashFile(file)
    // use hash as glb filename
    const filename = `${hash}.glb`
    // canonical url to this file
    const url = `asset://${filename}`
    // cache file locally so this client can insta-load it
    this.world.loader.insert('model', url, file)
    // make blueprint
    const blueprint = {
      id: uuid(),
      version: 0,
      name: file.name,
      image: null,
      author: null,
      url: null,
      desc: null,
      model: url,
      script: null,
      props: {},
      preload: false,
      public: false,
      locked: false,
      unique: false,
    }
    // register blueprint
    this.world.blueprints.add(blueprint, true)
    // spawn the app moving
    // - mover: follows this clients cursor until placed
    // - uploader: other clients see a loading indicator until its fully uploaded
    const data = {
      id: uuid(),
      type: 'app',
      blueprint: blueprint.id,
      position: transform.position,
      quaternion: transform.quaternion,
      mover: null,
      uploader: this.world.network.id,
      pinned: false,
      state: {},
    }
    const app = this.world.entities.add(data, true)
    // upload the glb
    await this.world.network.upload(file)
    // mark as uploaded so other clients can load it in
    app.onUploaded()
  }

  async addAvatar(file, transform) {
    // immutable hash the file
    const hash = await hashFile(file)
    // use hash as vrm filename
    const filename = `${hash}.vrm`
    // canonical url to this file
    const url = `asset://${filename}`
    // cache file locally so this client can insta-load it
    this.world.loader.insert('avatar', url, file)
    this.world.emit('avatar', {
      file,
      url,
      hash,
      onPlace: async () => {
        // close pane
        this.world.emit('avatar', null)
        // make blueprint
        const blueprint = {
          id: uuid(),
          version: 0,
          name: file.name,
          image: null,
          author: null,
          url: null,
          desc: null,
          model: url,
          script: null,
          props: {},
          preload: false,
          public: false,
          locked: false,
          unique: false,
        }
        // register blueprint
        this.world.blueprints.add(blueprint, true)
        // spawn the app moving
        // - mover: follows this clients cursor until placed
        // - uploader: other clients see a loading indicator until its fully uploaded
        const data = {
          id: uuid(),
          type: 'app',
          blueprint: blueprint.id,
          position: transform.position,
          quaternion: transform.quaternion,
          mover: null,
          uploader: this.world.network.id,
          pinned: false,
          state: {},
        }
        const app = this.world.entities.add(data, true)
        // upload the glb
        await this.world.network.upload(file)
        // mark as uploaded so other clients can load it in
        app.onUploaded()
      },
      onEquip: async () => {
        // close pane
        this.world.emit('avatar', null)
        // prep new user data
        const player = this.world.entities.player
        const prevUrl = player.data.avatar
        // update locally
        player.modify({ avatar: url, sessionAvatar: null })
        // upload
        try {
          await this.world.network.upload(file)
        } catch (err) {
          console.error(err)
          // revert
          player.modify({ avatar: prevUrl })
          return
        }
        // update for everyone
        this.world.network.send('entityModified', {
          id: player.data.id,
          avatar: url,
        })
      },
    })
  }

  getSpawnTransform() {
    const hit = this.world.stage.raycastPointer(this.control.pointer.position)[0]
    const position = hit ? hit.point.toArray() : [0, 0, 0]
    let quaternion
    if (hit) {
      e1.copy(this.world.rig.rotation).reorder('YXZ')
      e1.x = 0
      e1.z = 0
      const degrees = e1.y * RAD2DEG
      const snappedDegrees = Math.round(degrees / SNAP_DEGREES) * SNAP_DEGREES
      e1.y = snappedDegrees * DEG2RAD
      q1.setFromEuler(e1)
      quaternion = q1.toArray()
    } else {
      quaternion = [0, 0, 0, 1]
    }
    return { position, quaternion }
  }
}

function getAsString(item) {
  return new Promise(resolve => {
    item.getAsString(resolve)
  })
}
