console.log('[Additive Animation Test] Initializing')

// Configuration for additive animation
app.configure([
  {
    key: 'animationUrl',
    type: 'text',
    label: 'Animation URL',
    initial: 'https://hyperfy.io/animations/pistol-idle.hyp',
    placeholder: 'https://hyperfy.io/animations/pistol-idle.hyp',
    description: 'URL of the additive animation to apply',
  },
  {
    key: 'animationWeight',
    type: 'number',
    label: 'Animation Weight',
    initial: 1.0,
    min: 0.0,
    max: 2.0,
    dp: 2,
    description: 'Influence of the additive animation (0.0 = none, 1.0 = full, 2.0 = double)',
  },
  {
    key: 'fadeDuration',
    type: 'number',
    label: 'Fade Duration',
    initial: 0.15,
    min: 0.0,
    max: 2.0,
    dp: 2,
    description: 'Time in seconds to fade the animation in/out',
  },
])

let currentAnimation = null
let animationActive = false

// Create UI for controlling the animation
if (world.isClient) {
  const ui = app.create('ui', {
    width: 300,
    height: 200,
    backgroundColor: 'rgba(0, 15, 30, 0.8)',
    borderRadius: 20,
    padding: 15,
    billboard: 'full',
    pivot: 'center',
    position: [0, 2, 0],
    size: 0.005,
  })

  const title = app.create('uitext', {
    value: 'Additive Animation Control',
    color: '#00ffaa',
    fontSize: 18,
    padding: 10,
    textAlign: 'center',
  })
  ui.add(title)

  const statusText = app.create('uitext', {
    value: 'Status: Idle',
    color: '#ffffff',
    fontSize: 14,
    padding: 5,
  })
  ui.add(statusText)

  const weightText = app.create('uitext', {
    value: `Weight: ${props.animationWeight || 1.0}`,
    color: '#ffffff',
    fontSize: 14,
    padding: 5,
  })
  ui.add(weightText)

  const toggleButton = app.create('uitext', {
    value: 'Play Animation',
    color: '#00ffaa',
    fontSize: 16,
    padding: 10,
    backgroundColor: 'rgba(0, 255, 170, 0.2)',
    borderRadius: 10,
    textAlign: 'center',
  })

  toggleButton.onPointerDown = () => {
    if (animationActive) {
      stopAnimation()
    } else {
      playAnimation()
    }
  }
  ui.add(toggleButton)

  app.add(ui)

  // Update UI text
  function updateUI() {
    if (statusText) {
      statusText.value = `Status: ${animationActive ? 'Playing' : 'Idle'}`
    }
    if (weightText) {
      weightText.value = `Weight: ${props.animationWeight || 1.0}`
    }
    if (toggleButton) {
      toggleButton.value = animationActive ? 'Stop Animation' : 'Play Animation'
    }
  }

  // Play additive animation
  function playAnimation() {
    const player = world.getPlayer()
    if (!player) {
      console.warn('No player found')
      return
    }

    const url = props.animationUrl || 'https://hyperfy.io/animations/pistol-idle.hyp'
    const weight = props.animationWeight || 1.0
    const fadeDuration = props.fadeDuration || 0.15

    console.log(`[Additive Animation] Playing ${url} with weight ${weight}`)

    try {
      player.applyAdditiveAnimation(url, {
        weight: weight,
        fadeDuration: fadeDuration,
        loop: true,
      })
      currentAnimation = url
      animationActive = true
      updateUI()
      console.log('[Additive Animation] Animation started successfully')
    } catch (error) {
      console.error('[Additive Animation] Failed to play animation:', error)
    }
  }

  // Stop additive animation
  function stopAnimation() {
    const player = world.getPlayer()
    if (!player || !currentAnimation) {
      animationActive = false
      updateUI()
      return
    }

    console.log(`[Additive Animation] Stopping ${currentAnimation}`)

    try {
      player.stopAdditiveAnimation(currentAnimation, props.fadeDuration || 0.15)
      currentAnimation = null
      animationActive = false
      updateUI()
      console.log('[Additive Animation] Animation stopped successfully')
    } catch (error) {
      console.error('[Additive Animation] Failed to stop animation:', error)
    }
  }

  // Handle configuration changes
  app.on('update', () => {
    // If animation is active and weight changed, update it
    if (animationActive && currentAnimation) {
      const player = world.getPlayer()
      if (player) {
        try {
          player.applyAdditiveAnimation(currentAnimation, {
            weight: props.animationWeight || 1.0,
            fadeDuration: 0.1, // Quick fade for weight changes
            loop: true,
          })
        } catch (error) {
          console.error('[Additive Animation] Failed to update weight:', error)
        }
      }
    }

    updateUI()
  })

  // Cleanup
  app.on('destroy', () => {
    console.log('[Additive Animation Test] Cleaning up')
    if (animationActive && currentAnimation) {
      const player = world.getPlayer()
      if (player) {
        try {
          player.stopAdditiveAnimation(currentAnimation, 0.1)
        } catch (error) {
          console.error('[Additive Animation] Cleanup error:', error)
        }
      }
    }
  })
}

console.log('[Additive Animation Test] Setup complete')
