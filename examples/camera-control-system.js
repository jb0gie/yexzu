;({
  init() {
    // Only run on client
    if (!world.isClient) return

    // Get control interface
    this.control = app.control()
    if (!this.control) {
      console.warn('No control interface available')
      return
    }

    // Capture necessary controls
    this.control.keyW.capture = true
    this.control.keyA.capture = true
    this.control.keyS.capture = true
    this.control.keyD.capture = true
    this.control.keyQ.capture = true
    this.control.keyE.capture = true
    this.control.space.capture = true
    this.control.mouseLeft.capture = true
    this.control.mouseRight.capture = true

    // Create capsule rigidbody for physics-based movement
    this.capsule = app.create('rigidbody', {
      type: 'dynamic',
      mass: 1,
      linearDamping: 0.9,
      angularDamping: 0.9,
      gravity: [0, 0, 0], // No gravity for flying
      position: [0, 2, 0],
    })

    // Add capsule collider
    this.collider = app.create('collider', {
      shape: 'capsule',
      radius: 0.5,
      height: 1.8,
      center: [0, 0, 0],
    })
    this.capsule.add(this.collider)

    // Create camera attached to capsule
    this.camera = app.create('camera', {
      name: 'free-flying-camera',
      attachToRig: false, // World space, not attached to player
      isPlayerCamera: false,
      active: true,
      fov: 75,
      near: 0.1,
      far: 1000,
      position: [0, 0, 0], // Will be positioned relative to capsule
      rotation: [0, 0, 0],
    })

    // Add camera to capsule so it moves with it
    this.capsule.add(this.camera)

    // Movement settings
    this.moveSpeed = 10
    this.lookSensitivity = 0.002

    // Mouse look state
    this.mouseLookEnabled = false
    this.lastMouseX = 0
    this.lastMouseY = 0

    // Store initial rotation for relative movement
    this.cameraRotation = new THREE.Euler(0, 0, 0, 'YXZ')

    // Add to scene
    app.add(this.capsule)

    console.log('Free-flying camera system initialized')
  },

  update(delta) {
    if (!world.isClient || !this.control || !this.capsule || !this.camera) return

    // Handle mouse look toggle (right mouse button)
    if (this.control.mouseRight && this.control.mouseRight.pressed) {
      this.mouseLookEnabled = !this.mouseLookEnabled
      if (this.mouseLookEnabled) {
        this.lastMouseX = this.control.mouseX
        this.lastMouseY = this.control.mouseY
        this.control.mouseMove.capture = true
      } else {
        this.control.mouseMove.capture = false
      }
    }

    // Mouse look
    if (this.mouseLookEnabled && this.control.mouseMove) {
      const deltaX = this.control.mouseX - this.lastMouseX
      const deltaY = this.control.mouseY - this.lastMouseY

      this.cameraRotation.y -= deltaX * this.lookSensitivity
      this.cameraRotation.x -= deltaY * this.lookSensitivity
      this.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.x))

      this.camera.rotation = [this.cameraRotation.x, this.cameraRotation.y, this.cameraRotation.z]

      this.lastMouseX = this.control.mouseX
      this.lastMouseY = this.control.mouseY
    }

    // Movement input
    const moveVector = new THREE.Vector3()

    // Forward/backward (W/S)
    if (this.control.keyW && this.control.keyW.down) {
      moveVector.z -= 1
    }
    if (this.control.keyS && this.control.keyS.down) {
      moveVector.z += 1
    }

    // Left/right (A/D)
    if (this.control.keyA && this.control.keyA.down) {
      moveVector.x -= 1
    }
    if (this.control.keyD && this.control.keyD.down) {
      moveVector.x += 1
    }

    // Up/down (Q/E or Space)
    if (this.control.keyQ && this.control.keyQ.down) {
      moveVector.y -= 1
    }
    if (this.control.keyE && this.control.keyE.down) {
      moveVector.y += 1
    }
    if (this.control.space && this.control.space.down) {
      moveVector.y += 1
    }

    // Normalize and apply camera rotation to movement
    if (moveVector.length() > 0) {
      moveVector.normalize()
      moveVector.applyEuler(this.cameraRotation)
      moveVector.multiplyScalar(this.moveSpeed * delta)

      // Apply force to rigidbody
      this.capsule.applyForce([moveVector.x, moveVector.y, moveVector.z])
    }
  },

  cleanup() {
    // Release controls
    if (this.control) {
      this.control.keyW.capture = false
      this.control.keyA.capture = false
      this.control.keyS.capture = false
      this.control.keyD.capture = false
      this.control.keyQ.capture = false
      this.control.keyE.capture = false
      this.control.space.capture = false
      this.control.mouseLeft.capture = false
      this.control.mouseRight.capture = false
      this.control.mouseMove.capture = false
    }

    // Remove nodes
    if (this.capsule) {
      app.remove(this.capsule)
    }

    console.log('Free-flying camera system cleaned up')
  },
})
