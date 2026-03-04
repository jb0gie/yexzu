// ===== CLIENT VARIABLES AND STATE MANAGEMENT =====
// Client-scoped variables (accessible in all client methods)
const zoomLevels = []
const currentZoomLevelIndex = 0
const currentZoom = 1.5
const targetZoom = 1.5
const isAiming = false
const aimIdleAnimationUrl = null
const currentAnimation = null // Track current additive animation
const animationCooldown = 0 // Prevent rapid animation changes
const ZOOM_TRANSITION_SPEED = 8.0

// Pistol state management for proper transitions
let pistolState = 'unequipped' // 'unequipped', 'equipped', 'aiming', 'firing', 'reloading'

// State transition functions
function setPistolState(newState) {
  console.log(`[pistol] State transition: ${pistolState} → ${newState}`)
  pistolState = newState
}
