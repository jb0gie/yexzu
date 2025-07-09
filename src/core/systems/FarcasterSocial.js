import { System } from './System.js'
import { sdk } from '@farcaster/miniapp-sdk'

export class FarcasterSocial extends System {
	init() {
		this.isEnabled = false
		this.farcasterUser = null
		this.shareHistory = []
		this.groupSessions = new Map()

		// Listen for authentication events
		this.world.on('auth:success', this.onAuthSuccess)

		// Setup share capabilities
		this.setupSharing()
	}

	onAuthSuccess = ({ user, provider }) => {
		if (provider === 'farcaster') {
			this.isEnabled = true
			this.farcasterUser = user
			this.initializeSocialFeatures()
		}
	}

	initializeSocialFeatures() {
		// Enable social UI elements
		this.world.emit('ui:social:enable', {
			features: ['share', 'invite', 'groups', 'channels']
		})

		// Auto-share join activity if user opts in
		this.maybeShareJoinActivity()
	}

	setupSharing() {
		// Listen for world events that might be worth sharing
		this.world.on('entity:created', this.onEntityCreated)
		this.world.on('world:achievement', this.onAchievement)
		this.world.on('build:complete', this.onBuildComplete)
	}

	// Take and share a screenshot of the current world view
	async shareScreenshot(message = null, includeLocation = true) {
		try {
			// Get the graphics system to capture a screenshot
			const graphics = this.world.getSystem('graphics')
			if (!graphics || !graphics.renderer) {
				throw new Error('Graphics system not available')
			}

			// Capture the current frame
			const canvas = graphics.renderer.domElement
			const dataUrl = canvas.toDataURL('image/png', 0.8)

			// Create share message
			const worldName = this.world.stage?.name || 'Hyperfy World'
			const defaultMessage = `Check out what I built in "${worldName}"! 🏗️✨`
			const shareText = message || defaultMessage

			// Include current location/coordinates if requested
			let locationText = ''
			if (includeLocation) {
				const player = this.world.getSystem('entities')?.getLocalPlayer()
				if (player && player.position) {
					const pos = player.position
					locationText = `\n📍 Position: ${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)}`
				}
			}

			// Upload image to a temporary service (you'd need to implement this)
			const imageUrl = await this.uploadScreenshot(dataUrl)

			// Share to Farcaster
			const success = await this.shareToFarcaster(shareText + locationText, imageUrl)

			if (success) {
				this.shareHistory.push({
					type: 'screenshot',
					message: shareText,
					imageUrl,
					timestamp: Date.now()
				})

				this.world.emit('social:share:success', { type: 'screenshot' })
			}

			return success
		} catch (error) {
			console.error('Failed to share screenshot:', error)
			this.world.emit('social:share:error', { error })
			return false
		}
	}

	// Upload screenshot to a temporary storage service
	async uploadScreenshot(dataUrl) {
		// Convert data URL to blob
		const response = await fetch(dataUrl)
		const blob = await response.blob()

		// In a real implementation, you'd upload to your own service
		// For now, we'll use a placeholder URL
		// You could integrate with services like:
		// - Your own server's upload endpoint
		// - IPFS
		// - Cloudinary
		// - etc.

		return `${window.location.origin}/shared-screenshots/${Date.now()}.png`
	}

	// Share an achievement or milestone
	async shareAchievement(achievement) {
		const messages = {
			'first_build': '🎉 Just completed my first build in Hyperfy!',
			'master_builder': '🏆 Achieved Master Builder status in Hyperfy!',
			'world_complete': '✨ Finished creating an amazing world in Hyperfy!',
			'collaboration': '🤝 Had an amazing collaboration session in Hyperfy!',
			'exploration': '🗺️ Discovered something incredible in Hyperfy!'
		}

		const message = messages[achievement.type] || `🎊 Achieved ${achievement.name} in Hyperfy!`
		return await this.shareToFarcaster(message)
	}

	// Create a group session that others can join
	async createGroupSession(options = {}) {
		const sessionId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

		const session = {
			id: sessionId,
			creator: this.farcasterUser.fid,
			createdAt: Date.now(),
			name: options.name || `${this.farcasterUser.displayName}'s Session`,
			description: options.description || 'Join me in Hyperfy!',
			worldUrl: window.location.href,
			participants: [this.farcasterUser.fid],
			isPublic: options.isPublic !== false,
			maxParticipants: options.maxParticipants || 10
		}

		this.groupSessions.set(sessionId, session)

		// Share the group session
		if (session.isPublic) {
			await this.shareGroupInvite(session)
		}

		this.world.emit('social:group:created', { session })
		return session
	}

	// Share a group session invite
	async shareGroupInvite(session) {
		const inviteUrl = `${window.location.origin}/join/${session.id}`
		const message = `🎮 Join me in "${session.name}"!\n\n${session.description}\n\n🔗 ${inviteUrl}`

		return await this.shareToFarcaster(message)
	}

	// Join a group session
	async joinGroupSession(sessionId) {
		try {
			const session = this.groupSessions.get(sessionId)
			if (!session) {
				throw new Error('Session not found')
			}

			if (session.participants.length >= session.maxParticipants) {
				throw new Error('Session is full')
			}

			if (!session.participants.includes(this.farcasterUser.fid)) {
				session.participants.push(this.farcasterUser.fid)
				this.world.emit('social:group:joined', { session, user: this.farcasterUser })
			}

			return session
		} catch (error) {
			console.error('Failed to join group session:', error)
			throw error
		}
	}

	// Share to a specific Farcaster channel
	async shareToChannel(channelId, message, imageUrl = null) {
		try {
			const shareUrl = new URL('https://warpcast.com/~/compose')
			shareUrl.searchParams.set('text', `${message}\n\n/hyperfy`)
			shareUrl.searchParams.set('channelKey', channelId)

			if (imageUrl) {
				shareUrl.searchParams.set('embeds[]', imageUrl)
			}

			await sdk.actions.openUrl(shareUrl.toString())
			return true
		} catch (error) {
			console.error('Failed to share to channel:', error)
			return false
		}
	}

	// Share general content to Farcaster
	async shareToFarcaster(message, imageUrl = null) {
		const auth = this.world.getSystem('farcasterAuth')
		if (auth && auth.shareToFarcaster) {
			return await auth.shareToFarcaster(message, imageUrl)
		}
		return false
	}

	// Auto-share join activity (with user consent)
	async maybeShareJoinActivity() {
		// Check if user has enabled auto-sharing in preferences
		const prefs = this.world.getSystem('prefs')
		const autoShare = prefs?.get('farcaster.autoShareJoins', false)

		if (autoShare) {
			const worldName = this.world.stage?.name || 'a Hyperfy world'
			const message = `🌍 Just joined "${worldName}" - an interactive 3D experience!`
			await this.shareToFarcaster(message)
		}
	}

	// Event handlers
	onEntityCreated = (event) => {
		// Could auto-share significant creations
		if (event.entity.isSignificant && this.shouldAutoShare('creations')) {
			this.shareAchievement({ type: 'first_build', name: 'First Creation' })
		}
	}

	onAchievement = (event) => {
		this.shareAchievement(event.achievement)
	}

	onBuildComplete = (event) => {
		if (this.shouldAutoShare('builds')) {
			this.shareScreenshot(`🏗️ Just finished building "${event.name}"!`)
		}
	}

	shouldAutoShare(type) {
		const prefs = this.world.getSystem('prefs')
		return prefs?.get(`farcaster.autoShare.${type}`, false)
	}

	// Get user's social stats
	getSocialStats() {
		return {
			sharesCount: this.shareHistory.length,
			groupSessionsCreated: Array.from(this.groupSessions.values()).filter(s => s.creator === this.farcasterUser?.fid).length,
			isConnected: this.isEnabled,
			lastShare: this.shareHistory[this.shareHistory.length - 1]
		}
	}

	destroy() {
		this.world.off('auth:success', this.onAuthSuccess)
		this.world.off('entity:created', this.onEntityCreated)
		this.world.off('world:achievement', this.onAchievement)
		this.world.off('build:complete', this.onBuildComplete)
		super.destroy()
	}
} 