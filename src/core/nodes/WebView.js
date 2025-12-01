import { UI, pivotGeometry, pivotCanvas, getPivotOffset } from './UI'
import * as THREE from '../extras/three'
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

const defaults = {
  src: null,
  width: 640,           // pixel width
  height: 480,          // pixel height
  size: 0.0025,         // scale factor (pixels to meters)
  space: 'world',
  billboard: 'none',
  pointerEvents: false,
  visible: true,
  opacity: 1,
}

export class WebView extends UI {
  constructor(data = {}) {
    super(data)
    this.name = 'webview'

    // Apply defaults (UI handles most, but we have specific defaults)
    this.width = data.width ?? defaults.width
    this.height = data.height ?? defaults.height
    this.size = data.size ?? defaults.size
    this.space = data.space ?? defaults.space
    this.billboard = data.billboard ?? defaults.billboard
    this.pointerEvents = data.pointerEvents ?? defaults.pointerEvents
    this.visible = data.visible ?? defaults.visible
    this.opacity = data.opacity ?? defaults.opacity

    this._src = data.src ?? defaults.src

    // WebView-specific properties
    this.cssObject = null
    this.iframeElement = null
    this.containerElement = null
    this.updateInterval = null
  }

  get src() {
    return this._src
  }

  set src(value) {
    if (this._src === value) return
    this._src = value
    this.rebuild()
  }

  // Override build to create WebView specific elements
  build() {
    if (typeof window === 'undefined') return
    this.unbuild()

    if (this._space === 'world') {
      // Create iframe element
      this.iframeElement = document.createElement('iframe')
      this.iframeElement.src = this._src
      this.iframeElement.width = this._width
      this.iframeElement.height = this._height
      this.iframeElement.style.border = 'none'
      this.iframeElement.style.pointerEvents = this._pointerEvents ? 'auto' : 'none'

      // Create CSS3DObject
      this.cssObject = new CSS3DObject(this.iframeElement)
      this.cssObject.scale.setScalar(this._size)

      // Ensure the CSS3DObject wrapper also allows pointer events
      // (CSS3DObject uses the element passed to it, but let's be safe)
      if (this.cssObject.element) {
        this.cssObject.element.style.pointerEvents = this._pointerEvents ? 'auto' : 'none'
        this.cssObject.element.addEventListener('mouseover', () => console.log('WebView Wrapper: mouseover'))
        this.cssObject.element.addEventListener('click', () => console.log('WebView Wrapper: click'))
      }

      // Apply pivot to CSS object
      // CSS3DObject origin is center, but we want to support pivots
      // We can wrap it in a group or adjust position.
      // UI pivot logic assumes top-left origin for canvas, but CSS3D is center.
      // Actually, let's stick to simple center for now or try to match UI pivot.
      // For now, let's just center it to match the mesh which is pivoted.
      // Wait, UI mesh is pivoted using pivotGeometry.
      // We need to offset the CSS object to match.
      const pivotOffset = getPivotOffset(this._pivot, this._width * this._size, this._height * this._size)
      // pivotOffset is in world units (scaled)
      // CSS3DObject is at (0,0) relative to parent.
      // We need to move it.
      // But wait, CSS3DObject content (iframe) is centered.
      // If we want top-left pivot, we need to move it by half width/height.

      // Let's simplify: just use the mesh for occlusion and attach CSS object to it?
      // No, CSS object needs to be in css3dScene.

      // Let's just follow UI pattern:
      // 1. Create geometry (pivoted)
      this.geometry = new THREE.PlaneGeometry(this._width, this._height)
      this.geometry.scale(this._size, this._size, this._size)
      pivotGeometry(this._pivot, this.geometry, this._width * this._size, this._height * this._size)

      // 2. Create material (cutout / hole puncher)
      // We use CustomBlending to erase the color buffer (set to 0,0,0,0)
      // This punches a hole in the opaque WebGL scene (like Skybox)
      // to reveal the CSS3D content behind the canvas.
      this.material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        opacity: 1,
        transparent: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.ZeroFactor,
        blendDst: THREE.ZeroFactor,
        side: THREE.DoubleSide,
        colorWrite: true,
        depthWrite: true,
      })

      // 3. Create mesh
      this.mesh = new THREE.Mesh(this.geometry, this.material)
      this.mesh.matrixAutoUpdate = false
      this.mesh.matrixWorldAutoUpdate = false
      this.mesh.matrixWorld.copy(this.matrixWorld)
      this.ctx.world.stage.scene.add(this.mesh)

      // Add to octree for raycasting (needed for interaction handling)
      if (this._pointerEvents) {
        this.sItem = {
          matrix: this.mesh.matrixWorld,
          geometry: this.geometry,
          material: this.material,
          getEntity: () => this.ctx.entity,
          node: this,
        }
        this.ctx.world.stage.octree.insert(this.sItem)
      }

      // 4. Add CSS object
      // We need to manually sync its matrix to the mesh
      this.ctx.world.graphics.css3dScene.add(this.cssObject)

      // Handle pivot for CSS object
      // The mesh geometry is shifted, so the mesh origin remains at the node position.
      // The CSS object origin is its center.
      // If we want the CSS object to align with the mesh, we need to shift it by the pivot offset + half dimensions (since CSS is center-based).
      // Actually, CSS3DObject is just a DOM element transformed.
      // If we set its matrix to match the mesh, it will be at the mesh origin.
      // If the mesh geometry is shifted, the visual plane is shifted.
      // So we need to shift the CSS object too.
      // The pivotOffset from UI.js is what we need.
      // But CSS3DObject doesn't support geometry shifting. We have to shift the object itself relative to the "anchor".
      // Since we can't easily parent CSS3DObject to the mesh (different scenes), we have to apply the offset in the matrix or position.
      // However, `lateUpdate` syncs the matrix.
      // We should probably add the offset to the CSS object's position *local* to the transform.
      // Or simpler: modify the CSS3DObject's element transform? No.

      // Let's try to apply the offset to the CSS object.
      // The pivotOffset is (x, y) in local space.
      // We can't easily apply it if we just copy matrixWorld.
      // We might need a wrapper object or modify the matrix.

      // For now, let's ignore pivot for CSS object to keep it simple, OR
      // assume center pivot which is default.
      // If user changes pivot, CSS might be misaligned.
      // Let's support pivot by adjusting the CSS object's position in `lateUpdate`.

      this.ctx.world.setHot(this, true)

    } else {
      // Screen-space
      this.containerElement = document.createElement('div')
      this.containerElement.style.position = 'absolute'
      this.containerElement.style.width = `${this._width}px`
      this.containerElement.style.height = `${this._height}px`
      this.containerElement.style.pointerEvents = this._pointerEvents ? 'auto' : 'none'
      this.containerElement.style.zIndex = '1000'

      // Apply pivot
      pivotCanvas(this._pivot, this.containerElement, this._width, this._height)

      this.iframeElement = document.createElement('iframe')
      this.iframeElement.src = this._src
      this.iframeElement.style.width = '100%'
      this.iframeElement.style.height = '100%'
      this.iframeElement.style.border = 'none'
      this.iframeElement.style.display = 'block'

      this.containerElement.appendChild(this.iframeElement)
      document.body.appendChild(this.containerElement)

      this.updateScreenPosition()
    }

    this.needsRebuild = false
  }

  unbuild() {
    // We DO NOT call super.unbuild() because UI.unbuild assumes this.texture exists,
    // which causes a crash for WebView since we don't use a texture.

    // Clean up Mesh/Material/Geometry (similar to UI.unbuild but safe)
    if (this.mesh) {
      this.ctx.world.stage.scene.remove(this.mesh)
      if (this.mesh.material) this.mesh.material.dispose()
      if (this.mesh.geometry) this.mesh.geometry.dispose()
      this.mesh = null

      if (this.sItem) {
        this.ctx.world.stage.octree.remove(this.sItem)
        this.sItem = null
      }

      this.ctx.world.setHot(this, false)
    }

    // Clean up CSS3D
    if (this.cssObject) {
      this.ctx.world.graphics.css3dScene.remove(this.cssObject)
      this.cssObject = null
    }

    // Clean up DOM elements
    if (this.iframeElement) {
      this.iframeElement.remove()
      this.iframeElement = null
    }
    if (this.containerElement) {
      this.containerElement.remove()
      this.containerElement = null
    }
  }

  lateUpdate(delta) {
    // UI.lateUpdate handles mesh positioning, billboard, scaler
    super.lateUpdate(delta)

    if (this._space === 'world' && this.cssObject && this.mesh) {
      // Sync CSS3D object to mesh
      // We cannot just copy the matrix because the mesh scale is usually 1,
      // but the CSS object needs to be scaled by this._size to match pixels to meters.

      const pos = new THREE.Vector3()
      const rot = new THREE.Quaternion()
      const scl = new THREE.Vector3()

      this.mesh.matrixWorld.decompose(pos, rot, scl)

      // Apply size scale
      scl.multiplyScalar(this._size)

      this.cssObject.matrix.compose(pos, rot, scl)

      // Apply pivot offset if needed
      if (this._pivot !== 'center') {
        // Calculate offset vector in world space
        // The offset is in meters (already scaled by size in getPivotOffset call in build)
        // But wait, getPivotOffset returns local offset.
        const offset = getPivotOffset(this._pivot, this._width * this._size, this._height * this._size)
        const vOffset = new THREE.Vector3(offset.x, offset.y, 0)
        vOffset.applyQuaternion(rot) // Rotate offset by mesh rotation

        // Add to position
        pos.add(vOffset)
        this.cssObject.matrix.compose(pos, rot, scl)
      }

      this.cssObject.matrix.decompose(
        this.cssObject.position,
        this.cssObject.quaternion,
        this.cssObject.scale
      )
    } else if (this._space === 'screen') {
      this.updateScreenPosition()
    }
  }

  updateScreenPosition() {
    if (!this.containerElement) return
    const x = this.position.x * window.innerWidth
    const y = this.position.y * window.innerHeight
    this.containerElement.style.left = `${x}px`
    this.containerElement.style.top = `${y}px`
  }

  copy(source) {
    super.copy(source)
    this.src = source.src
    return this
  }

  draw() {
    // WebView renders via CSS3D/Iframe, not canvas.
    // We override UI.draw to prevent crash (accessing undefined canvasCtx).
    this.needsRedraw = false
  }

  resolveHit(hit) {
    // UI.resolveHit tries to map the hit to internal UI nodes (children).
    // WebView is a single monolithic node (iframe).
    // We just want to return 'this' so ClientPointer knows we hit the WebView.
    return this
  }
}