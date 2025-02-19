import { HyperFone, config } from './HyperFone.jsx'
import { HeadScreen } from './components/HeadScreen.jsx'
import { IdleManager } from './animations/IdleManager'

// Re-export components and utilities
export {
	HyperFone,
	HeadScreen,
	IdleManager,
	config
}

// Initialize Happle-Core
export function initHappleCore(world) {
	// Create idle manager instance
	const idleManager = new IdleManager(world)

	// Initialize systems
	const cleanup = idleManager.init()

	// Return cleanup function
	return () => cleanup?.()
}

// Utility function to update player status
export function updatePlayerStatus(world, playerId, status) {
	world.emit('happleCore:screenUpdate', {
		playerId,
		content: status
	})
}

// Utility function to trigger idle animation manually
export function triggerIdleAnimation(world) {
	world.emit('happleCore:idleStart')
} 