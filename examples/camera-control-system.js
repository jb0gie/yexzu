({
  init() {
    // Initialize platformer mechanics system
    this.setupPlatformerMechanics()
    
    // Create example grind rail
    this.createExampleGrindRail()
    
    // Setup UI for platformer mechanics
    this.setupPlatformerUI()
    
    console.log('[CameraControlSystem] Platformer mechanics initialized')
  },

  setupPlatformerMechanics() {
    // Access the platformer mechanics system
    this.platformerMechanics = world.platformerMechanics
    
    if (!this.platformerMechanics) {
      console.warn('[CameraControlSystem] PlatformerMechanics system not available')
      return
    }

    // Create a simple grind rail for demonstration
    this.createGrindRail()
  },

  createGrindRail() {
    // Define points for a curved grind rail
    const railPoints = [
      new THREE.Vector3(0, 2, 0),      // Start point
      new THREE.Vector3(5, 3, 0),      // First curve point
      new THREE.Vector3(10, 2, 5),     // Second curve point
      new THREE.Vector3(15, 4, 10),    // Third curve point
      new THREE.Vector3(20, 2, 15),    // End point
    ]

    // Create the grind rail
    const railId = this.platformerMechanics.createGrindRail(railPoints, {
      speed: 8,
      friction: 0.95,
      triggerRadius: 2,
      animation: 'asset://mp-grinding.glb?s=1.0',
      closed: false,
      curveType: 'catmullrom',
      tension: 0.5
    })

    console.log(`[CameraControlSystem] Created grind rail: ${railId}`)
    
    // Store rail ID for reference
    this.grindRailId = railId
  },

  createExampleGrindRail() {
    // Create a more complex example rail
    const examplePoints = [
      new THREE.Vector3(-10, 1, 0),
      new THREE.Vector3(-5, 3, 0),
      new THREE.Vector3(0, 5, 0),
      new THREE.Vector3(5, 3, 0),
      new THREE.Vector3(10, 1, 0),
      new THREE.Vector3(15, 2, 5),
      new THREE.Vector3(20, 1, 10),
    ]

    const exampleRailId = this.platformerMechanics.createGrindRail(examplePoints, {
      speed: 10,
      friction: 0.9,
      triggerRadius: 2.5,
      animation: 'asset://mp-grinding.glb?s=1.0',
    })

    console.log(`[CameraControlSystem] Created example grind rail: ${exampleRailId}`)
    this.exampleRailId = exampleRailId
  },

  setupPlatformerUI() {
    // Create UI to show platformer mechanics status
    this.platformerUI = app.create('ui', {
      width: 350,
      height: 250,
      backgroundColor: 'rgba(0, 15, 30, 0.8)',
      borderRadius: 15,
      padding: 15,
      billboard: 'full',
      pivot: 'top-left',
      position: [-8, 3, 0],
      size: 0.005
    })

    // Title
    const title = app.create('uitext', {
      value: 'Platformer Mechanics',
      color: '#00ffaa',
      fontSize: 18,
      fontWeight: 'bold',
      padding: [0, 0, 10, 0]
    })

    // Desktop Instructions
    const desktopInstructions = app.create('uitext', {
      value: 'Desktop Controls:\nF - Climb walls\nG - Grab ledges\nH - Air dive\nAuto - Wall slide',
      color: '#ffffff',
      fontSize: 12,
      lineHeight: 1.3,
      padding: [0, 0, 5, 0]
    })

    // Mobile Instructions
    const mobileInstructions = app.create('uitext', {
      value: 'Mobile Controls:\nCLIMB - Climb walls\nLEDGE - Grab ledges\nDIVE - Air dive\nAuto - Wall slide',
      color: '#00ffaa',
      fontSize: 12,
      lineHeight: 1.3,
      padding: [0, 0, 10, 0]
    })

    // Status display
    this.statusText = app.create('uitext', {
      value: 'Status: Ready',
      color: '#ffff00',
      fontSize: 14,
      padding: [0, 0, 5, 0]
    })

    // Stamina display
    this.staminaText = app.create('uitext', {
      value: 'Stamina: 100%',
      color: '#00ff00',
      fontSize: 14,
      padding: [0, 0, 5, 0]
    })

    // Add all elements to UI
    this.platformerUI.add(title)
    this.platformerUI.add(desktopInstructions)
    this.platformerUI.add(mobileInstructions)
    this.platformerUI.add(this.statusText)
    this.platformerUI.add(this.staminaText)

    app.add(this.platformerUI)
  },

  update(delta) {
    // Update platformer mechanics status display
    this.updatePlatformerStatus()
  },

  updatePlatformerStatus() {
    if (!this.statusText || !this.staminaText) return

    // Get local player
    const localPlayer = world.entities.getLocalPlayer()
    if (!localPlayer) return

    // Update status based on platformer mode
    let statusText = 'Status: Ready'
    let statusColor = '#ffff00'

    switch (localPlayer.platformerMode) {
      case 9: // GRINDING
        statusText = 'Status: Grinding'
        statusColor = '#00ffaa'
        break
      case 10: // CLIMBING
        statusText = 'Status: Climbing'
        statusColor = '#ff8800'
        break
      case 11: // LEDGE_HANGING
        statusText = 'Status: Hanging'
        statusColor = '#ff4400'
        break
      case 12: // AIR_DIVING
        statusText = 'Status: Air Diving'
        statusColor = '#8800ff'
        break
      case 13: // WALL_SLIDING
        statusText = 'Status: Wall Sliding'
        statusColor = '#ff0088'
        break
    }

    this.statusText.value = statusText
    this.statusText.color = statusColor

    // Update stamina display
    const stamina = localPlayer.getStamina()
    const staminaPercent = Math.round(stamina)
    this.staminaText.value = `Stamina: ${staminaPercent}%`
    
    // Change color based on stamina level
    if (stamina > 70) {
      this.staminaText.color = '#00ff00'
    } else if (stamina > 30) {
      this.staminaText.color = '#ffff00'
    } else {
      this.staminaText.color = '#ff0000'
    }
  },

  cleanup() {
    // Clean up UI elements
    if (this.platformerUI) {
      this.platformerUI.deactivate()
    }
  }
})