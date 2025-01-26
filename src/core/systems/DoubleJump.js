import { System } from './System'
import * as THREE from '../extras/three'
import { Emotes, emotes } from '../extras/playerEmotes'

const UP = new THREE.Vector3(0, 1, 0)
const v1 = new THREE.Vector3()

export class DoubleJump extends System {
	constructor(world) {
		super(world)
		this.lastJumpTime = 0
		this.DOUBLE_JUMP_FORCE = 9.75
		this.initialized = false
		this.PHYSX = null
		this.control = null
		this.isDoubleJumping = false
		this.initCheckInterval = null
	}

	async init({ loadPhysX }) {
		this.PHYSX = await loadPhysX()
		// Preload the flip animation
		await this.world.loader.load('emote', emotes[Emotes.DOUBLE_JUMP])
	}

	start() {
		if (!this.world.controls) {
			console.error('[DoubleJump System] No controls system found!')
			return
		}
		this.control = this.world.controls.bind({
			priority: 0,
			onPress: code => this.handleKeyPress(code)
		})

		// Start checking for player initialization
		this.initCheckInterval = setInterval(() => {
			const localPlayer = this.getLocalPlayer()
			if (localPlayer && this.PHYSX && !this.initialized) {
				this.initialized = true
				clearInterval(this.initCheckInterval)
			}
		}, 100)
	}

	stop() {
		if (this.control) {
			this.control.release()
			this.control = null
		}
		if (this.initCheckInterval) {
			clearInterval(this.initCheckInterval)
			this.initCheckInterval = null
		}
	}

	getLocalPlayer() {
		return Array.from(this.world.entities.items.values())
			.find(entity => entity.isPlayer && entity.constructor.name === 'PlayerLocal')
	}

	update() {
		const localPlayer = this.getLocalPlayer()
		if (!localPlayer) return

		// Handle double jump animation state
		if (this.isDoubleJumping) {
			const now = performance.now()
			const timeSinceLastJump = now - this.lastJumpTime

			// Play flip animation for 800ms, then switch back to float
			if (timeSinceLastJump > 800) {
				this.isDoubleJumping = false
				localPlayer.emote = Emotes.FLOAT
			} else if (timeSinceLastJump > 400) {
				// After half the animation time, switch back to float
				// This ensures we only play the flip once
				localPlayer.emote = Emotes.FLOAT
			}
		}

		// Reset state when landing
		if (localPlayer.grounded) {
			this.isDoubleJumping = false
			this.lastJumpTime = 0
		}
	}

	fixedUpdate(delta) {
		const localPlayer = this.getLocalPlayer()
		if (!localPlayer) return

		// Track when the first jump starts
		if (localPlayer.jumped && !this.lastJumpTime) {
			console.log('[DoubleJump System] First jump detected, setting lastJumpTime')
			this.lastJumpTime = performance.now()
		}

		// Log player state in fixed update
		if (localPlayer.jumped || localPlayer.jumping) {
			console.log('[DoubleJump System] Player jump state:', {
				jumped: localPlayer.jumped,
				jumping: localPlayer.jumping,
				grounded: localPlayer.grounded,
				jumpCount: this.jumpCount,
				isDoubleJumping: this.isDoubleJumping,
				timeSinceLastJump: performance.now() - this.lastJumpTime
			})
		}

		// Reset jump tracking when landing
		if (localPlayer.grounded) {
			this.jumpCount = 0
			this.isDoubleJumping = false
			this.lastJumpTime = 0
		}
	}

	handleKeyPress(code) {
		if (code !== 'Space') return false

		const localPlayer = this.getLocalPlayer()
		if (!localPlayer) {
			console.log('[DoubleJump System] No local player found')
			return false
		}

		// Only handle the second jump when:
		// 1. Player is in the air (jumping/falling)
		// 2. Not already double jumping
		// 3. Not grounded
		if (!localPlayer.grounded && !this.isDoubleJumping && (localPlayer.jumping || localPlayer.falling)) {
			console.log('[DoubleJump System] Performing double jump')
			const currentVel = localPlayer.capsule.getLinearVelocity()
			v1.copy(currentVel)
			v1.y = this.DOUBLE_JUMP_FORCE
			localPlayer.capsule.setLinearVelocity(v1.toPxVec3())

			// Start double jump animation
			this.isDoubleJumping = true
			this.lastJumpTime = performance.now()
			localPlayer.emote = Emotes.DOUBLE_JUMP

			// Send network update for the emote
			this.world.network.send('entityModified', {
				id: localPlayer.data.id,
				p: localPlayer.base.position.toArray(),
				q: localPlayer.base.quaternion.toArray(),
				e: Emotes.DOUBLE_JUMP,
			})

			return true
		}

		return false
	}
}