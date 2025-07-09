/*
 * Farcaster Gallery App
 * 
 * This example shows how to build a 3D gallery app that integrates with Farcaster:
 * - Shows user's Farcaster profile
 * - Displays NFTs from connected wallets  
 * - Allows sharing creations to Farcaster
 * - Creates group exhibitions
 */

// Gallery state
let gallery = {
	artworks: [],
	visitors: new Map(),
	currentExhibition: null
}

// Initialize when user authenticates
world.on('auth:success', ({ user, provider }) => {
	if (provider === 'farcaster') {
		initializeGallery(user)
	}
})

async function initializeGallery(user) {
	// Display welcome message with user's info
	const welcomeText = app.find('WelcomeText')
	if (welcomeText) {
		welcomeText.text = `Welcome to the Gallery, ${user.displayName}! 🎨`
	}

	// Show user's avatar
	const avatarNode = app.find('UserAvatar')
	if (avatarNode && user.avatar?.pfpUrl) {
		avatarNode.mesh.material.map = await world.assets.load(user.avatar.pfpUrl)
	}

	// Create social info panel
	createSocialInfoPanel(user)

	// Load user's NFT collection (mock for now)
	await loadUserArtworks(user)
}

function createSocialInfoPanel(user) {
	const panel = app.find('SocialPanel')
	if (!panel) return

	const statsText = panel.find('StatsText')
	if (statsText) {
		statsText.text = `👥 ${user.followerCount} followers • 🎯 ${user.followingCount} following`
	}

	// Add share button functionality
	const shareButton = panel.find('ShareButton')
	if (shareButton) {
		shareButton.on('click', async () => {
			await shareGalleryVisit()
		})
	}
}

async function loadUserArtworks(user) {
	// In a real app, you'd fetch NFTs from user's wallet
	// For demo, we'll create some sample artworks
	const artworks = [
		{ name: "Digital Dreams", type: "image", url: "/sample-art-1.jpg" },
		{ name: "Code Poetry", type: "text", content: "Hello Farcaster World!" },
		{ name: "3D Sculpture", type: "model", url: "/sample-model.glb" }
	]

	// Display artworks in 3D space
	artworks.forEach((artwork, index) => {
		createArtworkDisplay(artwork, index)
	})
}

function createArtworkDisplay(artwork, index) {
	const position = new Vector3(index * 3, 1.5, 0)

	// Create artwork frame
	const frame = app.create('Mesh', {
		geometry: 'box',
		material: 'standard',
		scale: new Vector3(2, 2, 0.1),
		position: position
	})

	// Add artwork content based on type
	if (artwork.type === 'image') {
		const artMesh = app.create('Mesh', {
			geometry: 'plane',
			material: 'standard',
			scale: new Vector3(1.8, 1.8, 1),
			position: position.clone().add(new Vector3(0, 0, 0.1))
		})

		// Load and apply texture
		world.assets.load(artwork.url).then(texture => {
			artMesh.mesh.material.map = texture
		})
	}

	// Add interaction
	frame.on('click', () => {
		showArtworkDetails(artwork)
	})

	// Add to gallery collection
	gallery.artworks.push({ node: frame, data: artwork })
}

async function showArtworkDetails(artwork) {
	// Create floating info panel
	const detailPanel = app.create('UI', {
		type: 'view',
		width: 300,
		height: 200,
		backgroundColor: '#1a1a1a',
		borderRadius: 10,
		position: new Vector3(0, 3, 2)
	})

	// Add artwork title
	const titleText = detailPanel.create('UIText', {
		text: artwork.name,
		fontSize: 24,
		color: '#ffffff',
		top: 20,
		left: 20
	})

	// Add share button
	const shareBtn = detailPanel.create('UIView', {
		width: 100,
		height: 40,
		backgroundColor: '#8A63D2',
		borderRadius: 8,
		bottom: 20,
		right: 20
	})

	const shareBtnText = shareBtn.create('UIText', {
		text: 'Share',
		color: '#ffffff',
		textAlign: 'center',
		top: 10
	})

	shareBtn.on('click', async () => {
		await shareArtwork(artwork)
		detailPanel.destroy()
	})

	// Auto-remove after 10 seconds
	setTimeout(() => {
		if (detailPanel.parent) {
			detailPanel.destroy()
		}
	}, 10000)
}

async function shareArtwork(artwork) {
	if (!farcaster.isAuthenticated()) {
		console.log('Please authenticate with Farcaster first!')
		return
	}

	const message = `🎨 Check out "${artwork.name}" in my Hyperfy gallery! \n\nCome visit: ${window.location.href}`

	try {
		await farcaster.shareToFarcaster(message)
		console.log('Artwork shared successfully!')

		// Show success feedback
		showNotification('✅ Shared to Farcaster!')
	} catch (error) {
		console.error('Failed to share artwork:', error)
		showNotification('❌ Failed to share')
	}
}

async function shareGalleryVisit() {
	if (!farcaster.isAuthenticated()) return

	try {
		// Take a screenshot of the current view
		await farcaster.shareScreenshot(
			`🏛️ Exploring an amazing gallery in Hyperfy! \n\n#art #nft #farcaster`
		)

		showNotification('📸 Gallery visit shared!')
	} catch (error) {
		console.error('Failed to share gallery visit:', error)
	}
}

// Create group exhibition feature
async function createGroupExhibition() {
	if (!farcaster.isAuthenticated()) return

	const session = await farcaster.createGroupSession({
		name: "Group Art Exhibition",
		description: "Join our collaborative art exhibition in Hyperfy!",
		maxParticipants: 20,
		isPublic: true
	})

	if (session) {
		gallery.currentExhibition = session
		showNotification(`🎪 Exhibition "${session.name}" created! Share link to invite others.`)
	}
}

// Achievement system
function checkAchievements() {
	const user = farcaster.getUser()
	if (!user) return

	// First artwork achievement
	if (gallery.artworks.length === 1) {
		farcaster.shareAchievement({
			type: 'first_build',
			name: 'First Artwork',
			description: 'Created your first artwork in the gallery!'
		})
	}

	// Gallery master achievement
	if (gallery.artworks.length >= 10) {
		farcaster.shareAchievement({
			type: 'master_builder',
			name: 'Gallery Master',
			description: 'Created 10 artworks in your gallery!'
		})
	}
}

// Utility function for notifications
function showNotification(message) {
	const notification = app.create('UI', {
		type: 'view',
		width: 250,
		height: 60,
		backgroundColor: '#2a2a2a',
		borderRadius: 8,
		position: new Vector3(0, 4, 1)
	})

	const text = notification.create('UIText', {
		text: message,
		color: '#ffffff',
		fontSize: 16,
		textAlign: 'center',
		top: 20
	})

	// Fade out and remove
	setTimeout(() => {
		if (notification.parent) {
			notification.destroy()
		}
	}, 3000)
}

// Listen for other players joining
world.on('player:joined', ({ player }) => {
	if (gallery.currentExhibition) {
		showNotification(`🎨 ${player.name} joined the exhibition!`)
	}
})

// Auto-run when script loads
if (farcaster.isAuthenticated()) {
	initializeGallery(farcaster.getUser())
} 