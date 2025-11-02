app.configure([
  { type: 'section', label: 'Extended Mobile Controls' },
  {
    type: 'toggle',
    key: 'enabled',
    label: 'Enable Extended Controls',
    initial: true
  },
  {
    type: 'toggle',
    key: 'showADS',
    label: 'Show ADS Button',
    initial: true
  },
  {
    type: 'toggle',
    key: 'showCamera',
    label: 'Show Camera Cycle Button',
    initial: true
  }
])

console.log('[ExtendedMobileControlsV2] INITIALIZING - FRESH VERSION')

let buttons = {}
let adsToggled = false
let cameraMode = 0

// Simple touch detection
function isTouchDevice() {
  try {
    return typeof ontouchstart !== 'undefined' && navigator.maxTouchPoints > 0
  } catch (e) {
    return false
  }
}

// Initialize after a brief delay to ensure world is ready
let initWaitTime = 0
app.on('update', (delta) => {
  initWaitTime++

  if (initWaitTime === 30) { // Wait ~0.5 seconds
    console.log('[ExtendedMobileControlsV2] Creating extended mobile UI')
    createExtendedControls()
  }
})

function createExtendedControls() {
  if (!app.props.enabled || !isTouchDevice()) {
    console.log('[ExtendedMobileControlsV2] Extended controls disabled or not a touch device')
    return
  }

  console.log('[ExtendedMobileControlsV2] CREATING EXTENDED UI NOW!')

  try {
    // Create ADS button
    if (app.props.showADS) {
      buttons.ads = app.create('ui', {
        position: [0, 0, 0],
        width: 60,
        height: 60,
        style: {
          position: 'absolute',
          bottom: '150px',
          right: '20px',
          background: adsToggled ? 'rgba(0, 255, 170, 0.6)' : 'rgba(255, 0, 0, 0.6)',
          border: adsToggled ? '2px solid rgba(0, 255, 170, 0.8)' : '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          touchAction: 'none',
          pointerEvents: 'auto'
        },
        text: adsToggled ? 'ADS\nON' : 'ADS'
      })

      if (buttons.ads && buttons.ads.element) {
        buttons.ads.element.addEventListener('touchstart', (e) => {
          e.preventDefault()
          adsToggled = !adsToggled

          // Update visual
          buttons.ads.style.background = adsToggled ? 'rgba(0, 255, 170, 0.6)' : 'rgba(255, 0, 0, 0.6)'
          buttons.ads.style.borderColor = adsToggled ? 'rgba(0, 255, 170, 0.8)' : 'rgba(255, 255, 255, 0.3)'
          buttons.ads.text = adsToggled ? 'ADS\nON' : 'ADS'

          try {
            if (world.controls && world.controls.simulateButton) {
              world.controls.simulateButton('mouseRight', adsToggled)
            }
          } catch (err) {
            console.warn('[ExtendedMobileControlsV2] Failed to toggle ADS:', err)
          }
        })
      }
    }

    // Create Camera Cycle button
    if (app.props.showCamera) {
      buttons.camera = app.create('ui', {
        position: [0, 0, 0],
        width: 50,
        height: 50,
        style: {
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(100, 200, 255, 0.4)',
          border: '2px solid rgba(100, 200, 255, 0.6)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '10px',
          touchAction: 'none',
          pointerEvents: 'auto',
          opacity: '0.8'
        },
        text: 'CAM\nMED'
      })

      if (buttons.camera && buttons.camera.element) {
        buttons.camera.element.addEventListener('touchstart', (e) => {
          e.preventDefault()

          // Cycle camera mode
          cameraMode = (cameraMode + 1) % 4

          // Update camera
          try {
            const player = world.entities.player
            if (player && player.cam) {
              const zoomLevels = [5.0, 1.0, 0, 7.0]
              player.cam.zoom = zoomLevels[cameraMode]

              if (player.avatar) {
                player.avatar.visible = cameraMode !== 2
              }
            }
          } catch (err) {
            console.warn('[ExtendedMobileControlsV2] Failed to update camera:', err)
          }

          // Update visual
          const colors = ['rgba(100, 200, 255, 0.4)', 'rgba(100, 255, 100, 0.4)', 'rgba(255, 100, 100, 0.4)', 'rgba(200, 200, 255, 0.4)']
          const labels = ['CAM\nMED', 'CAM\nCLOSE', 'CAM\nFP', 'CAM\nFAR']
          buttons.camera.style.background = colors[cameraMode]
          buttons.camera.text = labels[cameraMode]
        })
      }
    }

    console.log('[ExtendedMobileControlsV2] Extended controls created successfully!')

  } catch (e) {
    console.error('[ExtendedMobileControlsV2] Failed to create extended controls:', e)
  }
}

// Handle configuration changes
app.on('change', () => {
  console.log('[ExtendedMobileControlsV2] Configuration changed, recreating extended UI')
  // Destroy existing buttons
  Object.values(buttons).forEach(btn => {
    if (btn) btn.destroy()
  })
  buttons = {}

  // Recreate with new settings
  initWaitTime = 0 // Reset init timer
})

// Cleanup
app.on('destroy', () => {
  console.log('[ExtendedMobileControlsV2] Cleaning up')
  Object.values(buttons).forEach(btn => {
    if (btn) btn.destroy()
  })
})

console.log('[ExtendedMobileControlsV2] Extended mobile controls script loaded successfully')