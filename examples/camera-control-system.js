;({
  init() {
    if (!world.isClient) return

    this.control = app.control()
    if (!this.control) return

    this.cameras = []
    this.currentCameraIndex = 0
    this.mouseLookEnabled = false
    this.cameraRotation = new THREE.Euler(0, 0, 0)
    this.velocity = new THREE.Vector3(0, 0, 0)

    app.keepActive = true

    app.configure([
      { type: 'section', key: 'camera', label: 'Camera System' },
      {
        type: 'switch',
        key: 'mode',
        label: 'Camera Mode',
        initial: 'preset',
        options: [
          { value: 'preset', label: 'Preset Cameras' },
          { value: 'free', label: 'Free Camera' },
          { value: 'fps', label: 'First Person' },
        ],
      },
      {
        type: 'number',
        key: 'currentPreset',
        label: 'Current Preset',
        initial: 0,
        min: 0,
        max: 4,
        when: [{ key: 'mode', op: 'eq', value: 'preset' }],
      },
      {
        type: 'number',
        key: 'fov',
        label: 'Field of View',
        initial: 73,
        min: 30,
        max: 120,
      },
      {
        type: 'number',
        key: 'speed',
        label: 'Movement Speed',
        initial: 8,
        min: 1,
        max: 30,
      },
      {
        type: 'switch',
        key: 'dofEnabled',
        label: 'Depth of Field',
        initial: false,
        options: [
          { value: true, label: 'Enabled' },
          { value: false, label: 'Disabled' },
        ],
      },
      {
        type: 'number',
        key: 'fStop',
        label: 'F-Stop',
        initial: 2.8,
        min: 1.4,
        max: 16,
        when: [{ key: 'dofEnabled', op: 'eq', value: true }],
      },
      {
        type: 'number',
        key: 'focusDistance',
        label: 'Focus Distance',
        initial: 10,
        min: 0.1,
        max: 100,
        when: [{ key: 'dofEnabled', op: 'eq', value: true }],
      },
    ])

    this.setupControls()
    this.createPresetCameras()
    this.createFreeCamera()

    app.on('update', delta => this.update(delta))
  },

  setupControls() {
    const controls = [
      'digit1',
      'digit2',
      'digit3',
      'digit4',
      'digit5',
      'bracketLeft',
      'bracketRight',
      'keyC',
      'keyR',
      'keyW',
      'keyA',
      'keyS',
      'keyD',
      'keyQ',
      'keyE',
      'space',
      'shiftLeft',
      'mouseRight',
    ]

    controls.forEach(key => {
      if (this.control[key]) this.control[key].capture = true
    })
  },

  createPresetCameras() {
    const presets = [
      { name: 'Third Person', position: [0, 2, 6], rotation: [-0.15, 0, 0], fov: 73 },
      { name: 'First Person', position: [0, 1.6, 0], rotation: [0, 0, 0], fov: 80 },
      { name: 'Cinematic Wide', position: [12, 4, 12], rotation: [-0.2, 0.785, 0], fov: 35 },
      { name: 'Top Down', position: [0, 15, 1], rotation: [-Math.PI / 2, 0, 0], fov: 60 },
      { name: 'Side View', position: [15, 2, 0], rotation: [0, -Math.PI / 2, 0], fov: 50 },
    ]

    presets.forEach((preset, index) => {
      const camera = app.create('camera', {
        name: `camera-${index}`,
        position: preset.position,
        rotation: preset.rotation,
        fov: preset.fov,
        active: false,
        attachToRig: false,
        isPlayerCamera: false,
        showHelper: true,
      })

      camera.preset = preset
      this.cameras.push(camera)
      app.add(camera)
    })
  },

  createFreeCamera() {
    this.cameraRoot = app.create('group', { position: [0, 2, 0] })

    this.freeCamera = app.create('camera', {
      name: 'free-camera',
      attachToRig: false,
      isPlayerCamera: false,
      active: true,
      fov: app.config.fov,
      dof: {
        enabled: app.config.dofEnabled,
        fStop: app.config.fStop,
        focusDistance: app.config.focusDistance,
        maxBlur: 0.02,
        autofocus: false,
      },
    })

    this.cameraRoot.add(this.freeCamera)
    app.add(this.cameraRoot)
  },

  update(delta) {
    if (!world.isClient || !this.control) return

    this.updateConfig()
    this.handleInput()
    this.updateCameraMovement(delta)
  },

  updateConfig() {
    if (this.freeCamera.fov !== app.config.fov) {
      this.freeCamera.fov = app.config.fov
    }

    const dofEnabled = app.config.dofEnabled
    if (this.freeCamera.dof?.enabled !== dofEnabled) {
      this.freeCamera.dof = {
        enabled: dofEnabled,
        fStop: app.config.fStop,
        focusDistance: app.config.focusDistance,
        maxBlur: 0.02,
        autofocus: false,
      }
    } else if (dofEnabled && this.freeCamera.dof) {
      this.freeCamera.dof.fStop = app.config.fStop
      this.freeCamera.dof.focusDistance = app.config.focusDistance
    }

    const mode = app.config.mode
    if (mode === 'preset') {
      const presetIndex = parseInt(app.config.currentPreset) || 0
      if (presetIndex !== this.currentCameraIndex && this.cameras[presetIndex]) {
        this.switchToPreset(presetIndex)
      }
    } else {
      this.switchToFreeCamera()
    }
  },

  handleInput() {
    if (this.control.digit1?.pressed) this.handlePresetSwitch(0)
    if (this.control.digit2?.pressed) this.handlePresetSwitch(1)
    if (this.control.digit3?.pressed) this.handlePresetSwitch(2)
    if (this.control.digit4?.pressed) this.handlePresetSwitch(3)
    if (this.control.digit5?.pressed) this.handlePresetSwitch(4)

    if (this.control.bracketLeft?.pressed) this.cyclePreset(-1)
    if (this.control.bracketRight?.pressed) this.cyclePreset(1)

    if (this.control.keyC?.pressed) this.toggleMode()
    if (this.control.keyR?.pressed) this.resetPosition()

    const mode = app.config.mode
    if (mode === 'free' || mode === 'fps') {
      if (this.control.mouseRight?.pressed) {
        this.mouseLookEnabled = true
      } else if (this.control.mouseRight?.released) {
        this.mouseLookEnabled = false
      }
    }
  },

  handlePresetSwitch(index) {
    app.config.mode = 'preset'
    app.config.currentPreset = index
  },

  cyclePreset(direction) {
    const newIndex = (this.currentCameraIndex + direction + this.cameras.length) % this.cameras.length
    app.config.mode = 'preset'
    app.config.currentPreset = newIndex
  },

  toggleMode() {
    const modes = ['preset', 'free', 'fps']
    const currentIndex = modes.indexOf(app.config.mode)
    app.config.mode = modes[(currentIndex + 1) % modes.length]
  },

  resetPosition() {
    this.cameraRoot.position.set(0, 2, 0)
    this.cameraRotation.set(0, 0, 0)
    this.velocity.set(0, 0, 0)
  },

  updateCameraMovement(delta) {
    const mode = app.config.mode
    if (mode !== 'free' && mode !== 'fps') return

    if (this.mouseLookEnabled && this.control.mouseMove) {
      this.updateMouseLook()
    }

    this.updateMovement(delta)
    this.applyCameraTransform()
  },

  updateMouseLook() {
    const deltaX = this.control.mouseX - (this.lastMouseX || this.control.mouseX)
    const deltaY = this.control.mouseY - (this.lastMouseY || this.control.mouseY)

    this.cameraRotation.y -= deltaX * 0.002
    this.cameraRotation.x -= deltaY * 0.002
    this.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.x))

    this.lastMouseX = this.control.mouseX
    this.lastMouseY = this.control.mouseY
  },

  updateMovement(delta) {
    const speed = app.config.speed
    const acceleration = speed * 4
    const friction = 8

    let moveX = 0,
      moveY = 0,
      moveZ = 0

    if (this.control.keyW?.down) moveZ -= 1
    if (this.control.keyS?.down) moveZ += 1
    if (this.control.keyA?.down) moveX -= 1
    if (this.control.keyD?.down) moveX += 1
    if (this.control.keyQ?.down) moveY -= 1
    if (this.control.keyE?.down || this.control.space?.down) moveY += 1

    const boost = this.control.shiftLeft?.down ? 2 : 1

    if (moveX !== 0 || moveY !== 0 || moveZ !== 0) {
      const moveVector = this.tempMoveVector || (this.tempMoveVector = new THREE.Vector3())
      moveVector.set(moveX, moveY, moveZ)
      moveVector.normalize()
      moveVector.multiplyScalar(acceleration * delta * boost)
      moveVector.applyEuler(this.cameraRotation)
      this.velocity.add(moveVector)
    }

    this.velocity.multiplyScalar(Math.max(0, 1 - friction * delta))

    if (this.velocity.length() > 0.01) {
      this.cameraRoot.position.add(this.velocity.clone().multiplyScalar(delta))
    }
  },

  applyCameraTransform() {
    this.freeCamera.rotation.set(this.cameraRotation.x, this.cameraRotation.y, 0)

    if (app.config.mode === 'fps') {
      this.cameraRoot.position.y = 1.6
    }
  },

  switchToPreset(index) {
    if (!this.cameras[index] || index === this.currentCameraIndex) return

    this.cameras.forEach(camera => {
      camera.active = false
    })

    this.freeCamera.active = false
    this.cameras[index].active = true
    this.currentCameraIndex = index
  },

  switchToFreeCamera() {
    if (app.config.mode === 'free' || app.config.mode === 'fps') {
      this.cameras.forEach(camera => {
        camera.active = false
      })
      this.freeCamera.active = true
      this.mouseLookEnabled = app.config.mode === 'fps'
    }
  },

  cleanup() {
    if (this.control) {
      Object.keys(this.control).forEach(key => {
        if (this.control[key]?.capture !== undefined) {
          this.control[key].capture = false
        }
      })
    }

    this.cameras.forEach(camera => {
      if (camera) app.remove(camera)
    })

    if (this.cameraRoot) {
      app.remove(this.cameraRoot)
    }
  },
})
