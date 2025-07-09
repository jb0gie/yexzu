import { System } from './System.js'
import { sdk } from '@farcaster/miniapp-sdk'

export class FarcasterAuth extends System {
	init() {
		this.farcasterUser = null
		this.isAuthenticated = false
		this.authToken = null

		// Listen for Farcaster events
		this.world.on('farcaster:ready', this.onFarcasterReady)
	}

	onFarcasterReady = async ({ user, client }) => {
		try {
			this.farcasterUser = user

			// Create a Hyperfy identity from Farcaster user
			const hyperfyUser = await this.createHyperfyUser(user)

			// Authenticate with the server using Farcaster identity
			await this.authenticateWithServer(hyperfyUser)

			this.isAuthenticated = true

			// Emit authentication success
			this.world.emit('auth:success', {
				user: hyperfyUser,
				provider: 'farcaster'
			})

		} catch (error) {
			console.error('Farcaster authentication failed:', error)
			this.world.emit('auth:error', { error, provider: 'farcaster' })
		}
	}

	async createHyperfyUser(farcasterUser) {
		// Map Farcaster user to Hyperfy user format
		const hyperfyUser = {
			id: `farcaster:${farcasterUser.fid}`,
			fid: farcasterUser.fid,
			username: farcasterUser.username,
			displayName: farcasterUser.displayName || farcasterUser.username,
			bio: farcasterUser.bio || '',
			pfpUrl: farcasterUser.pfpUrl,
			followerCount: farcasterUser.followerCount || 0,
			followingCount: farcasterUser.followingCount || 0,
			verifications: farcasterUser.verifications || [],
			provider: 'farcaster',
			// Generate avatar preferences based on Farcaster profile
			avatar: await this.generateAvatarFromProfile(farcasterUser)
		}

		return hyperfyUser
	}

	async generateAvatarFromProfile(farcasterUser) {
		// Generate default avatar settings based on user's profile
		// This could be enhanced to use their actual PFP or create a procedural avatar
		return {
			type: 'default',
			// Use their profile picture if available
			pfpUrl: farcasterUser.pfpUrl,
			// Generate colors based on username hash
			primaryColor: this.generateColorFromString(farcasterUser.username || farcasterUser.fid.toString()),
			secondaryColor: this.generateColorFromString((farcasterUser.username || farcasterUser.fid.toString()).split('').reverse().join('')),
			// Default customizations
			style: 'modern',
			accessories: []
		}
	}

	generateColorFromString(str) {
		let hash = 0
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i)
			hash = ((hash << 5) - hash) + char
			hash = hash & hash // Convert to 32bit integer
		}

		// Generate a pleasant color from the hash
		const hue = Math.abs(hash) % 360
		const saturation = 60 + (Math.abs(hash) % 40) // 60-100%
		const lightness = 45 + (Math.abs(hash) % 20)  // 45-65%

		return `hsl(${hue}, ${saturation}%, ${lightness}%)`
	}

	async authenticateWithServer(user) {
		// Send authentication request to server with Farcaster user data
		const authData = {
			provider: 'farcaster',
			user: user,
			timestamp: Date.now()
		}

		// In a real implementation, this would involve:
		// 1. Creating a JWT token signed by the client
		// 2. Sending it to the server for verification
		// 3. Getting back a session token

		// For now, we'll simulate the authentication
		this.authToken = `farcaster_${user.fid}_${Date.now()}`

		// Store in world context for other systems to use
		this.world.farcasterAuth = {
			user: user,
			token: this.authToken,
			isAuthenticated: true
		}
	}

	// Public methods for other systems to use
	getUser() {
		return this.farcasterUser
	}

	isAuth() {
		return this.isAuthenticated
	}

	getToken() {
		return this.authToken
	}

	// Share current world experience to Farcaster
	async shareToFarcaster(message, imageUrl = null) {
		try {
			const shareUrl = new URL('https://warpcast.com/~/compose')
			shareUrl.searchParams.set('text', message)

			if (imageUrl) {
				shareUrl.searchParams.set('embeds[]', imageUrl)
			}

			// Open the composer
			await sdk.actions.openUrl(shareUrl.toString())

			return true
		} catch (error) {
			console.error('Failed to share to Farcaster:', error)
			return false
		}
	}

	// Get notification permissions
	async requestNotificationPermission() {
		try {
			// Check if notifications are supported in the Mini App context
			const canNotify = await sdk.actions.ready() // This confirms SDK is available
			return canNotify
		} catch (error) {
			console.error('Notifications not available:', error)
			return false
		}
	}

	destroy() {
		this.world.off('farcaster:ready', this.onFarcasterReady)
		super.destroy()
	}
} 