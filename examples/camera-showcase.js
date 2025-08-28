// Camera System Showcase
// Demonstrates multiple cameras with different cinematic styles
// Controls: Press 1-6 to switch cameras, F to toggle autofocus, D/B/V for effects

console.log('[Camera Showcase] Initializing multiple camera examples...')

// Camera configurations for different cinematic styles
const cameraConfigs = [
  {
    name: 'establishing',
    description: 'Wide establishing shot - Film opening',
    fov: 24,
    position: [20, 15, 20],
    rotation: [-25, 45, 0],
    dof: { enabled: true, fStop: 5.6, focusDistance: 30, maxBlur: 0.01 },
    bloom: { enabled: true, intensity: 0.3 },
    vignette: { enabled: true, offset: 0.4, darkness: 0.3 },
    filmGrain: { enabled: true, intensity: 0.2 }
  },
  {
    name: 'dramatic',
    description: 'Low angle drama - Action cinema',
    fov: 35,
    position: [5, 0.5, 8],
    rotation: [-10, 30, 0],
    dof: { enabled: true, fStop: 1.4, maxBlur: 0.03, pentagon: true, fringe: 1.0 },
    bloom: { enabled: true, intensity: 0.8, luminanceThreshold: 0.7 },
    vignette: { enabled: true, offset: 0.2, darkness: 0.6 }
    // Note: ChromaticAberration temporarily disabled due to effect combination issues
  },
  {
    name: 'portrait',
    description: 'Portrait focus - 50mm character study',
    fov: 50,
    position: [3, 2, 3],
    rotation: [0, 45, 0],
    dof: { enabled: true, fStop: 1.2, maxBlur: 0.05, autofocus: true, autofocusSpeed: 3 },
    bloom: { enabled: true, intensity: 1.2, luminanceThreshold: 0.6 },
    vignette: { enabled: false }
  },
  {
    name: 'documentary',
    description: 'Clean documentary - No effects',
    fov: 35,
    position: [10, 5, 0],
    dof: { enabled: false },
    bloom: { enabled: false },
    vignette: { enabled: false },
    filmGrain: { enabled: false }
  },
  {
    name: 'firstPerson',
    description: 'First-person POV - Immersive',
    fov: 60,
    position: [0, 1.7, 5],
    dof: { enabled: true, fStop: 2.8, autofocus: true, autofocusSpeed: 5, maxBlur: 0.02 },
    bloom: { enabled: true, intensity: 0.4 },
    vignette: { enabled: true, offset: 0.5, darkness: 0.2 },
    filmGrain: { enabled: true, intensity: 0.5 }
  },
  {
    name: 'macro',
    description: 'Macro telephoto - Extreme bokeh',
    fov: 15,
    position: [15, 2, 15],
    dof: { enabled: true, fStop: 0.95, maxBlur: 0.08, pentagon: true, fringe: 0.5 },
    bloom: { enabled: true, intensity: 0.6 }
    // Note: ChromaticAberration temporarily disabled due to effect combination issues
  }
]

// Attempt to create cameras
const cameras = []
let currentCamera = 0

try {
  // Create each camera from config
  cameraConfigs.forEach((config, index) => {
    const camera = app.create('camera', {
      ...config,
      active: index === 0 // First camera is active
    })
    
    app.add(camera)
    cameras.push(camera)
    console.log(`[Camera Showcase] Created ${config.name} camera`)
  })
  
  console.log(`[Camera Showcase] Successfully created ${cameras.length} cameras`)
  
  // Camera switching function
  function switchToCamera(index) {
    if (index < 0 || index >= cameras.length) return
    
    cameras[currentCamera].active = false
    cameras[index].active = true
    currentCamera = index
    
    const config = cameraConfigs[index]
    console.log(`Switched to: ${config.name} - ${config.description}`)
  }
  
  // Keyboard controls - Using keys that don't conflict with native controls
  app.on('keydown', (e) => {
    const key = e.key.toLowerCase()
    
    // Number keys for direct camera access
    if (key >= '1' && key <= '6') {
      const index = parseInt(key) - 1
      if (index < cameras.length) {
        switchToCamera(index)
      }
    }
    
    // , and . for next/previous (safer than C/X which might be used elsewhere)
    else if (key === ',') {
      switchToCamera((currentCamera - 1 + cameras.length) % cameras.length)
    }
    else if (key === '.') {
      switchToCamera((currentCamera + 1) % cameras.length)
    }
    
    // Effect toggles using less common keys
    else if (key === ';' && cameras[currentCamera]) {
      const cam = cameras[currentCamera]
      cam.dof.enabled = !cam.dof.enabled
      cam.setDOF({ enabled: cam.dof.enabled })
      console.log('DOF:', cam.dof.enabled)
    }
    else if (key === 'l' && cameras[currentCamera]) {
      const cam = cameras[currentCamera]
      cam.bloom.enabled = !cam.bloom.enabled
      cam.setBloom({ enabled: cam.bloom.enabled })
      console.log('Bloom:', cam.bloom.enabled)
    }
    else if (key === 'k' && cameras[currentCamera]) {
      const cam = cameras[currentCamera]
      cam.vignette.enabled = !cam.vignette.enabled
      cam.setVignette({ enabled: cam.vignette.enabled })
      console.log('Vignette:', cam.vignette.enabled)
    }
    else if (key === 'o' && cameras[currentCamera]) {
      const cam = cameras[currentCamera]
      if (cam.dof) {
        cam.dof.autofocus = !cam.dof.autofocus
        cam.setDOF({ autofocus: cam.dof.autofocus })
        console.log('Autofocus:', cam.dof.autofocus)
      }
    }
  })
  
  console.log('[Camera Showcase] Controls:')
  console.log('  1-6: Switch to camera by number')
  console.log('  ,/.: Previous/Next camera')
  console.log('  ;: Toggle DOF | L: Toggle Bloom | K: Toggle Vignette | O: Toggle Autofocus')
  
} catch (error) {
  console.log('[Camera Showcase] Camera nodes not available:', error.message)
  console.log('[Camera Showcase] This showcase demonstrates the future camera API')
}