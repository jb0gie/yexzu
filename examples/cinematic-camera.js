// Cinematic Camera Example
// Demonstrates camera node with cinematic postprocessing effects
// Note: Camera node API may not be available in current build

console.log('[Cinematic Camera] Attempting to create camera node...')

try {
  const cinematicCamera = app.create('camera', {
    name: 'cinematic',
    fov: 35,  // 35mm equivalent
    near: 0.1,
    far: 2000,
    position: [5, 3, 5],
    rotation: [-20, 45, 0],
    active: true,
    
    // Depth of field settings
    dof: {
      enabled: true,
      fStop: 1.4,
      focusDistance: 7,
      maxBlur: 0.025,
      autofocus: true,
      autofocusSpeed: 2,
      pentagon: true
    },
    
    // Bloom effect
    bloom: {
      enabled: true,
      intensity: 0.5,
      luminanceThreshold: 0.8,
      luminanceSmoothing: 0.3
    },
    
    // Vignette effect
    vignette: {
      enabled: true,
      offset: 0.35,
      darkness: 0.4
    },
    
    // Film grain
    filmGrain: {
      enabled: true,
      intensity: 0.35
    },
    
    // Chromatic aberration (temporarily disabled due to effect combination issues)
    // chromaticAberration: {
    //   enabled: true,
    //   offset: [0.002, 0.002]
    // }
  })
  
  app.add(cinematicCamera)
  console.log('[Cinematic Camera] Camera created successfully!')
  
  // Store effect states locally since we can't read back from the node
  let dofEnabled = true
  let autofocusEnabled = true
  let bloomEnabled = true
  let vignetteEnabled = true
  let grainEnabled = true
  
  // Keyboard controls - Using keys that don't conflict with native controls
  app.on('keydown', (e) => {
    switch(e.key.toLowerCase()) {
      case 'o':  // O for autOfocus
        autofocusEnabled = !autofocusEnabled
        cinematicCamera.setDOF({ autofocus: autofocusEnabled })
        console.log('Autofocus:', autofocusEnabled)
        break
        
      case ';':  // Semicolon for DOF
        dofEnabled = !dofEnabled
        cinematicCamera.setDOF({ enabled: dofEnabled })
        console.log('DOF:', dofEnabled)
        break
        
      case 'l':  // L for bLoom
        bloomEnabled = !bloomEnabled
        cinematicCamera.setBloom({ enabled: bloomEnabled })
        console.log('Bloom:', bloomEnabled)
        break
        
      case 'k':  // K for vignette
        vignetteEnabled = !vignetteEnabled
        cinematicCamera.setVignette({ enabled: vignetteEnabled })
        console.log('Vignette:', vignetteEnabled)
        break
        
      case 'p':  // P for film grain (Picture noise)
        grainEnabled = !grainEnabled
        cinematicCamera.setFilmGrain({ enabled: grainEnabled })
        console.log('Film grain:', grainEnabled)
        break
    }
  })
  
  console.log('[Cinematic Camera] Controls: O=Autofocus, ;=DOF, L=Bloom, K=Vignette, P=Grain')
  
} catch (error) {
  console.log('[Cinematic Camera] Camera node not available:', error.message)
  console.log('[Cinematic Camera] Camera API will be available in a future update')
}