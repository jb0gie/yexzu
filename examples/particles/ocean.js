// Hybrid ocean simulation - templates for main surface + modern particles + prims for extras
// Uses original mesh templates (WaterPlane, WaterSpray) for main water surface
// Modern app.create('particles') for all particle effects
// Additional prims for extra spray effects

app.configure([
  {
    key: 'gridSize',
    type: 'range',
    label: 'Grid Size',
    initial: 20,
    min: 10,
    max: 50,
    step: 1
  },
  {
    key: 'segmentSize',
    type: 'range',
    label: 'Segment Size',
    initial: 5.0,
    min: 1.0,
    max: 10.0,
    step: 0.5
  },
  {
    key: 'surfaceHeight',
    type: 'range',
    label: 'Water Surface Height',
    initial: 1.0,
    min: -5.0,
    max: 10.0,
    step: 0.5
  },
  {
    key: 'waveSpeed',
    type: 'range',
    label: 'Wave Speed',
    initial: 0.8,
    min: 0.1,
    max: 3.0,
    step: 0.1
  },
  {
    key: 'waveHeight',
    type: 'range',
    label: 'Wave Height',
    initial: 0.8,
    min: 0.0,
    max: 3.0,
    step: 0.1
  },
  {
    key: 'waveRotation',
    type: 'range',
    label: 'Wave Rotation',
    initial: 0.1,
    min: 0.0,
    max: 0.5,
    step: 0.01
  },
  {
    key: 'waveFrequency',
    type: 'range',
    label: 'Wave Frequency',
    initial: 0.8,
    min: 0.1,
    max: 2.0,
    step: 0.1
  },
  {
    key: 'sprayRate',
    type: 'range',
    label: 'Spray Rate',
    initial: 10,
    min: 0,
    max: 50,
    step: 1
  },
  {
    key: 'sprayLifetime',
    type: 'range',
    label: 'Spray Lifetime',
    initial: 2.0,
    min: 0.5,
    max: 5.0,
    step: 0.1
  },
  {
    key: 'sprayHeight',
    type: 'range',
    label: 'Spray Height',
    initial: 1.0,
    min: 0.0,
    max: 5.0,
    step: 0.1
  },
  {
    key: 'fishSplashEnabled',
    type: 'switch',
    label: 'Fish Splash Effects',
    options: [{ label: 'Enabled', value: 'enabled' },
              { label: 'Disabled', value: 'disabled' }],
    initial: 'enabled'
  },
  {
    key: 'fishSplashMinInterval',
    type: 'range',
    label: 'Min Splash Interval',
    initial: 1,
    min: 0.5,
    max: 10,
    step: 0.5
  },
  {
    key: 'fishSplashMaxInterval',
    type: 'range',
    label: 'Max Splash Interval',
    initial: 1,
    min: 0.5,
    max: 10,
    step: 0.5
  },
  {
    key: 'fishSplashParticles',
    type: 'range',
    label: 'Splash Particles Count',
    initial: 50,
    min: 10,
    max: 100,
    step: 5
  },
  {
    key: 'fishSplashHeight',
    type: 'range',
    label: 'Splash Height',
    initial: 2.0,
    min: 0.5,
    max: 5.0,
    step: 0.1
  },
  {
    key: 'fishSplashSpread',
    type: 'range',
    label: 'Splash Spread',
    initial: 2.0,
    min: 0.5,
    max: 5.0,
    step: 0.1
  },
  {
    key: 'fishSplashLifetime',
    type: 'range',
    label: 'Splash Lifetime',
    initial: 1.5,
    min: 0.5,
    max: 3.0,
    step: 0.1
  },
  {
    key: 'playerTrailEnabled',
    type: 'switch',
    label: 'Player Trail Effects',
    options: [{ label: 'Enabled', value: 'enabled' },
              { label: 'Disabled', value: 'disabled' }],
    initial: 'enabled'
  },
  {
    key: 'playerTrailRate',
    type: 'range',
    label: 'Trail Rate',
    initial: 50,
    min: 10,
    max: 100,
    step: 5
  },
  {
    key: 'playerTrailLifetime',
    type: 'range',
    label: 'Trail Lifetime',
    initial: 0.8,
    min: 0.1,
    max: 2.0,
    step: 0.1
  },
  {
    key: 'playerTrailHeight',
    type: 'range',
    label: 'Trail Height',
    initial: 0.1,
    min: 0.0,
    max: 2.0,
    step: 0.05
  }
])

// Water surface grid using original templates
if (world.isClient) {
  // Initialize required template objects
  const waterSegment = app.get('WaterPlane')
  const sprayParticle = app.get('WaterSpray')
  
  if (!waterSegment || !sprayParticle) {
    console.error('Required templates not found - please add WaterPlane and WaterSpray entities')
    return
  }
  
  // Hide original templates
  waterSegment.visible = false
  sprayParticle.visible = false
  
  // Create water surface grid
  const segments = []
  const GRID_SIZE = app.props.gridSize || 20
  const SEGMENT_SIZE = app.props.segmentSize || 5.0
  const SURFACE_HEIGHT = app.props.surfaceHeight || 1.0
  
  for (let z = 0; z < GRID_SIZE; z++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const segment = waterSegment.clone(true)
      segment.visible = true
      
      // Position in grid
      const posX = (x - GRID_SIZE / 2) * SEGMENT_SIZE
      const posZ = (z - GRID_SIZE / 2) * SEGMENT_SIZE
      segment.position.set(posX, SURFACE_HEIGHT, posZ)
      
      // Add wave phase offset based on distance from center
      const distFromCenter = Math.sqrt(posX * posX + posZ * posZ)
      segment.timeOffset = num(0, Math.PI * 2, 2) + distFromCenter * (app.props.waveFrequency || 0.8)
      
      segments.push(segment)
      world.add(segment)
    }
  }
  
  // Modern particle system for all effects
  const sprayParticles = app.create('particles', {
    shape: ['sphere', 0.1],
    direction: 0.3,
    rate: app.props.sprayRate || 10,
    loop: true,
    life: String(app.props.sprayLifetime || 2.0),
    speed: '1~2',
    size: '0.05~0.1',
    color: '#a8d8ff',
    alpha: '0.7~1.0',
    force: new Vector3(0, -2, 0),
    space: 'world',
    blending: 'additive'
  })
  app.add(sprayParticles)
  
  // Additional prim effects - extra spray rings
  const extraSprayRings = []
  const RING_COUNT = 5
  
  for (let i = 0; i < RING_COUNT; i++) {
    const ring = app.create('prim', 'torus')
    ring.scale.set(2, 2, 2)
    ring.material = {
      color: 0x88ccff,
      transparent: true,
      opacity: 0.3,
      emissive: 0x4488ff
    }
    ring.visible = false
    extraSprayRings.push(ring)
    app.add(ring)
  }
  
  // Player trail particle system
  const trailParticles = app.create('particles', {
    shape: ['sphere', 0.05],
    direction: 0.1,
    rate: 0,
    loop: true,
    life: '0.8',
    speed: '0.5~1',
    size: '0.02~0.05',
    color: '#88ccff',
    alpha: '0.5~0.8',
    force: new Vector3(0, -1, 0),
    space: 'world',
    blending: 'additive'
  })
  app.add(trailParticles)
  
  let timeSinceLastTrail = 0
  let lastPlayerPos = null
  
  // Fish splash timing
  let fishSplashTimer = 0
  let nextFishSplash = num(app.props.fishSplashMinInterval || 1, app.props.fishSplashMaxInterval || 1, 2)
  
  app.on('update', delta => {
    const WAVE_SPEED = app.props.waveSpeed || 0.8
    const WAVE_HEIGHT = app.props.waveHeight || 0.8
    const WAVE_ROTATION = app.props.waveRotation || 0.1
    const WAVE_FREQUENCY = app.props.waveFrequency || 0.8
    
    // Update water surface wave animation (original mesh approach)
    const time = Date.now() / 1000
    for (const segment of segments) {
      const posX = segment.position.x
      const posZ = segment.position.z
      
      // Combine multiple wave patterns
      const wave1 = Math.sin(time * WAVE_SPEED + segment.timeOffset)
      const wave2 = Math.sin(time * WAVE_SPEED * 0.7 + posX * WAVE_FREQUENCY)
      const wave3 = Math.sin(time * WAVE_SPEED * 0.5 + posZ * WAVE_FREQUENCY)
      const wave4 = Math.sin(time * WAVE_SPEED * 0.9 + (posX + posZ) * WAVE_FREQUENCY * 0.5)
      
      const height = ((wave1 + wave2 + wave3 + wave4) * WAVE_HEIGHT) / 4
      segment.position.y = SURFACE_HEIGHT + height
      
      // Apply wave-based rotation
      segment.rotation.z = (wave2 - wave1) * WAVE_ROTATION
      segment.rotation.x = (wave3 - wave1) * WAVE_ROTATION
    }
    
    // Move spray particles across water surface
    if (segments.length > 0) {
      const randomSegment = segments[Math.floor(num(0, segments.length - 1, 0))]
      sprayParticles.position.copy(randomSegment.position)
      sprayParticles.position.y += 0.1
    }
    
    // Extra spray ring effects using prims
    for (let i = 0; i < extraSprayRings.length; i++) {
      const ring = extraSprayRings[i]
      if (Math.random() < 0.01) { // Occasionally show rings
        const segment = segments[Math.floor(num(0, segments.length - 1, 0))]
        ring.position.copy(segment.position)
        ring.position.y += 0.5
        ring.visible = true
        
        // Animate ring
        ring.scale.x = ring.scale.y = ring.scale.z = 0.1
        const animateRing = () => {
          ring.scale.multiplyScalar(1.1)
          ring.material.opacity *= 0.95
          
          if (ring.scale.x < 3) {
            setTimeout(animateRing, 50)
          } else {
            ring.visible = false
            ring.material.opacity = 0.3
            ring.scale.set(0.2, 0.2, 0.2)
          }
        }
        animateRing()
      }
    }
    
    // Fish splash effects with modern particle bursts
    if (app.props.fishSplashEnabled === 'enabled') {
      fishSplashTimer += delta
      if (fishSplashTimer >= nextFishSplash) {
        fishSplashTimer = 0
        nextFishSplash = num(app.props.fishSplashMinInterval || 1, app.props.fishSplashMaxInterval || 1, 2)
        
        const splashPos = segments[Math.floor(num(0, segments.length - 1, 0))].position.clone()
        splashPos.x += num(-0.3, 0.3, 2)
        splashPos.z += num(-0.3, 0.3, 2)
        
        // Create burst of particles
        const splash = app.create('particles', {
          shape: ['sphere', 0.1],
          direction: 1,
          rate: 0,
          max: app.props.fishSplashParticles || 50,
          bursts: [{ time: 0, count: app.props.fishSplashParticles || 50 }],
          life: '1~2',
          speed: '2~4',
          size: '0.1~0.3',
          color: '#ffffff~#a8d8ff',
          alpha: '0.8~1.0',
          force: new Vector3(0, -9.8, 0),
          space: 'world',
          blending: 'additive'
        })
        splash.position.copy(splashPos)
        app.add(splash)
        
        // Auto-remove after burst
        setTimeout(() => app.remove(splash), 3000)
      }
    }
    
    // Player movement trail with modern particles
    if (app.props.playerTrailEnabled === 'enabled') {
      const player = world.getPlayer()
      const playerPos = player?.position
      
      if (playerPos) {
        if (!lastPlayerPos) {
          lastPlayerPos = playerPos.clone()
        }
        
        const moveDistance = lastPlayerPos.distanceTo(playerPos)
        if (moveDistance > 0.1) {
          timeSinceLastTrail += delta
          const trailRate = app.props.playerTrailRate || 50
          
          if (timeSinceLastTrail >= 1 / trailRate) {
            timeSinceLastTrail = 0
            
            // Emit a burst of trail particles
            const burst = app.create('particles', {
              shape: ['sphere', 0.02],
              direction: 0.05,
              rate: 0,
              max: 3,
              bursts: [{ time: 0, count: 3 }],
              life: '0.8',
              speed: '0.2~0.5',
              size: '0.01~0.03',
              color: '#88ccff',
              alpha: '0.4~0.6',
              force: new Vector3(0, -2, 0),
              space: 'world',
              blending: 'additive'
            })
            
            burst.position.copy(playerPos)
            burst.position.y = SURFACE_HEIGHT + 0.05
            app.add(burst)
            
            setTimeout(() => app.remove(burst), 1500)
          }
          
          lastPlayerPos.copy(playerPos)
        }
      }
    }
  })
}
