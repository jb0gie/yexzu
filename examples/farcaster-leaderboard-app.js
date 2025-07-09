/*
 * Farcaster Leaderboard App
 * 
 * A social gaming app that demonstrates:
 * - Real-time leaderboards
 * - Achievement sharing to Farcaster
 * - Group challenges with social features
 * - Profile-based scoring
 */

// Game state
let gameState = {
	players: new Map(),
	currentChallenge: null,
	leaderboard: [],
	achievements: new Set()
}

// Initialize the leaderboard system
world.on('auth:success', ({ user, provider }) => {
	if (provider === 'farcaster') {
		initializePlayer(user)
	}
})

async function initializePlayer(user) {
	// Create player entry
	const player = {
		fid: user.fid,
		username: user.username,
		displayName: user.displayName,
		pfpUrl: user.pfpUrl,
		score: 0,
		achievements: [],
		joinedAt: Date.now()
	}

	gameState.players.set(user.fid, player)

	// Create welcome UI
	createWelcomeUI(player)

	// Update leaderboard
	updateLeaderboard()

	// Announce player joined
	announcePlayerJoin(player)
}

function createWelcomeUI(player) {
	// Create main game UI
	const gameUI = app.create('UI', {
		type: 'view',
		width: 400,
		height: 300,
		backgroundColor: '#1a1a2e',
		borderRadius: 15,
		position: new Vector3(0, 2, 2)
	})

	// Player info header
	const header = gameUI.create('UIView', {
		width: 380,
		height: 80,
		backgroundColor: '#16213e',
		borderRadius: 10,
		top: 10,
		left: 10
	})

	const avatarImg = header.create('UIImage', {
		width: 60,
		height: 60,
		borderRadius: 30,
		top: 10,
		left: 10,
		src: player.pfpUrl
	})

	const playerName = header.create('UIText', {
		text: player.displayName,
		fontSize: 20,
		color: '#ffffff',
		fontWeight: 'bold',
		top: 15,
		left: 80
	})

	const playerScore = header.create('UIText', {
		text: `Score: ${player.score}`,
		fontSize: 16,
		color: '#8A63D2',
		top: 40,
		left: 80
	})

	// Action buttons
	createActionButtons(gameUI)

	// Store reference for updates
	player.ui = gameUI
	player.scoreText = playerScore
}

function createActionButtons(parent) {
	const buttonContainer = parent.create('UIView', {
		width: 380,
		height: 120,
		top: 100,
		left: 10
	})

	// Challenge button
	const challengeBtn = buttonContainer.create('UIView', {
		width: 110,
		height: 40,
		backgroundColor: '#e74c3c',
		borderRadius: 8,
		top: 10,
		left: 10
	})

	challengeBtn.create('UIText', {
		text: '🎯 Challenge',
		color: '#ffffff',
		fontSize: 14,
		textAlign: 'center',
		top: 12
	})

	challengeBtn.on('click', () => startChallenge())

	// Share button
	const shareBtn = buttonContainer.create('UIView', {
		width: 110,
		height: 40,
		backgroundColor: '#8A63D2',
		borderRadius: 8,
		top: 10,
		left: 135
	})

	shareBtn.create('UIText', {
		text: '📤 Share',
		color: '#ffffff',
		fontSize: 14,
		textAlign: 'center',
		top: 12
	})

	shareBtn.on('click', () => shareProgress())

	// Group button
	const groupBtn = buttonContainer.create('UIView', {
		width: 110,
		height: 40,
		backgroundColor: '#27ae60',
		borderRadius: 8,
		top: 10,
		left: 260
	})

	groupBtn.create('UIText', {
		text: '👥 Group',
		color: '#ffffff',
		fontSize: 14,
		textAlign: 'center',
		top: 12
	})

	groupBtn.on('click', () => createGroupChallenge())

	// Leaderboard button
	const leaderBtn = buttonContainer.create('UIView', {
		width: 110,
		height: 40,
		backgroundColor: '#f39c12',
		borderRadius: 8,
		top: 60,
		left: 10
	})

	leaderBtn.create('UIText', {
		text: '🏆 Leaders',
		color: '#ffffff',
		fontSize: 14,
		textAlign: 'center',
		top: 12
	})

	leaderBtn.on('click', () => showLeaderboard())
}

async function startChallenge() {
	const challenges = [
		{ name: 'Speed Builder', description: 'Build 5 objects in 60 seconds', points: 100 },
		{ name: 'Creative Master', description: 'Create a unique design', points: 150 },
		{ name: 'Collaboration King', description: 'Work with another player', points: 200 },
		{ name: 'Explorer', description: 'Visit 3 different areas', points: 75 }
	]

	const challenge = challenges[Math.floor(Math.random() * challenges.length)]
	gameState.currentChallenge = challenge

	// Show challenge UI
	showChallengeUI(challenge)

	// Auto-complete for demo (in real app, track actual progress)
	setTimeout(async () => {
		await completeChallenge(challenge)
	}, 5000)
}

function showChallengeUI(challenge) {
	const challengeUI = app.create('UI', {
		type: 'view',
		width: 350,
		height: 200,
		backgroundColor: '#e74c3c',
		borderRadius: 15,
		position: new Vector3(2, 2, 1)
	})

	challengeUI.create('UIText', {
		text: '🎯 CHALLENGE ACTIVE',
		fontSize: 18,
		color: '#ffffff',
		fontWeight: 'bold',
		textAlign: 'center',
		top: 20
	})

	challengeUI.create('UIText', {
		text: challenge.name,
		fontSize: 22,
		color: '#ffffff',
		fontWeight: 'bold',
		textAlign: 'center',
		top: 50
	})

	challengeUI.create('UIText', {
		text: challenge.description,
		fontSize: 16,
		color: '#ffffff',
		textAlign: 'center',
		top: 80
	})

	challengeUI.create('UIText', {
		text: `Reward: ${challenge.points} points`,
		fontSize: 14,
		color: '#ffeb3b',
		textAlign: 'center',
		top: 110
	})

	// Progress bar
	const progressBg = challengeUI.create('UIView', {
		width: 300,
		height: 20,
		backgroundColor: '#c0392b',
		borderRadius: 10,
		top: 140,
		left: 25
	})

	const progressBar = progressBg.create('UIView', {
		width: 0,
		height: 20,
		backgroundColor: '#2ecc71',
		borderRadius: 10
	})

	// Animate progress
	let progress = 0
	const interval = setInterval(() => {
		progress += 20
		progressBar.width = (progress / 100) * 300
		if (progress >= 100) {
			clearInterval(interval)
			setTimeout(() => challengeUI.destroy(), 1000)
		}
	}, 1000)
}

async function completeChallenge(challenge) {
	const user = farcaster.getUser()
	if (!user) return

	const player = gameState.players.get(user.fid)
	if (!player) return

	// Award points
	player.score += challenge.points

	// Update UI
	if (player.scoreText) {
		player.scoreText.text = `Score: ${player.score}`
	}

	// Check for achievements
	checkForAchievements(player)

	// Share achievement
	await farcaster.shareAchievement({
		type: 'challenge_complete',
		name: challenge.name,
		description: `Completed "${challenge.name}" and earned ${challenge.points} points!`
	})

	// Update leaderboard
	updateLeaderboard()

	showNotification(`🎉 Challenge complete! +${challenge.points} points`)
}

async function shareProgress() {
	const user = farcaster.getUser()
	if (!user) return

	const player = gameState.players.get(user.fid)
	if (!player) return

	const rank = getPlayerRank(player)
	const message = `🎮 I'm currently rank #${rank} with ${player.score} points in the Hyperfy leaderboard! \n\nCome challenge me: ${window.location.href}`

	try {
		await farcaster.shareToFarcaster(message)
		showNotification('📤 Progress shared to Farcaster!')
	} catch (error) {
		console.error('Failed to share progress:', error)
	}
}

async function createGroupChallenge() {
	const session = await farcaster.createGroupSession({
		name: "Group Challenge Arena",
		description: "Join our competitive gaming session in Hyperfy!",
		maxParticipants: 8,
		isPublic: true
	})

	if (session) {
		gameState.currentChallenge = {
			name: 'Group Showdown',
			type: 'group',
			session: session,
			points: 300
		}

		showNotification('🎪 Group challenge created! Others can join now.')
	}
}

function showLeaderboard() {
	const leaderboardUI = app.create('UI', {
		type: 'view',
		width: 400,
		height: 500,
		backgroundColor: '#1a1a2e',
		borderRadius: 15,
		position: new Vector3(-2, 2, 1)
	})

	leaderboardUI.create('UIText', {
		text: '🏆 LEADERBOARD',
		fontSize: 24,
		color: '#f39c12',
		fontWeight: 'bold',
		textAlign: 'center',
		top: 20
	})

	// List top players
	gameState.leaderboard.slice(0, 10).forEach((player, index) => {
		const y = 70 + (index * 40)

		// Rank badge
		const rankColor = index < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][index] : '#666666'

		const entryBg = leaderboardUI.create('UIView', {
			width: 360,
			height: 35,
			backgroundColor: index % 2 === 0 ? '#16213e' : '#1a1a2e',
			top: y,
			left: 20
		})

		entryBg.create('UIText', {
			text: `#${index + 1}`,
			fontSize: 16,
			color: rankColor,
			fontWeight: 'bold',
			top: 8,
			left: 10
		})

		entryBg.create('UIText', {
			text: player.displayName,
			fontSize: 14,
			color: '#ffffff',
			top: 8,
			left: 50
		})

		entryBg.create('UIText', {
			text: `${player.score}`,
			fontSize: 14,
			color: '#8A63D2',
			textAlign: 'right',
			top: 8,
			right: 10
		})
	})

	// Close button
	const closeBtn = leaderboardUI.create('UIView', {
		width: 100,
		height: 30,
		backgroundColor: '#e74c3c',
		borderRadius: 8,
		bottom: 20,
		right: 20
	})

	closeBtn.create('UIText', {
		text: 'Close',
		color: '#ffffff',
		fontSize: 14,
		textAlign: 'center',
		top: 8
	})

	closeBtn.on('click', () => leaderboardUI.destroy())
}

function updateLeaderboard() {
	// Sort players by score
	gameState.leaderboard = Array.from(gameState.players.values())
		.sort((a, b) => b.score - a.score)
}

function getPlayerRank(player) {
	updateLeaderboard()
	return gameState.leaderboard.findIndex(p => p.fid === player.fid) + 1
}

function checkForAchievements(player) {
	const achievementKey = `${player.fid}_achievements`

	// First points achievement
	if (player.score >= 100 && !gameState.achievements.has(`${player.fid}_first_100`)) {
		gameState.achievements.add(`${player.fid}_first_100`)
		farcaster.shareAchievement({
			type: 'first_milestone',
			name: 'First 100 Points',
			description: 'Reached 100 points milestone!'
		})
	}

	// High scorer achievement  
	if (player.score >= 1000 && !gameState.achievements.has(`${player.fid}_high_scorer`)) {
		gameState.achievements.add(`${player.fid}_high_scorer`)
		farcaster.shareAchievement({
			type: 'high_scorer',
			name: 'High Scorer',
			description: 'Reached 1000 points milestone!'
		})
	}

	// Top 3 achievement
	const rank = getPlayerRank(player)
	if (rank <= 3 && !gameState.achievements.has(`${player.fid}_top_3`)) {
		gameState.achievements.add(`${player.fid}_top_3`)
		farcaster.shareAchievement({
			type: 'top_player',
			name: 'Top 3 Player',
			description: `Reached top 3 on the leaderboard! Current rank: #${rank}`
		})
	}
}

function announcePlayerJoin(player) {
	showNotification(`🎮 ${player.displayName} joined the game!`)

	// If it's a group challenge, announce in Farcaster
	if (gameState.currentChallenge?.type === 'group') {
		farcaster.shareToFarcaster(
			`🎮 ${player.displayName} just joined our group challenge! The competition is heating up!`
		)
	}
}

// Utility function for notifications (reused from gallery app)
function showNotification(message) {
	const notification = app.create('UI', {
		type: 'view',
		width: 300,
		height: 60,
		backgroundColor: '#2a2a2a',
		borderRadius: 8,
		position: new Vector3(0, 4, 1)
	})

	notification.create('UIText', {
		text: message,
		color: '#ffffff',
		fontSize: 16,
		textAlign: 'center',
		top: 20
	})

	setTimeout(() => {
		if (notification.parent) {
			notification.destroy()
		}
	}, 4000)
}

// Listen for player events
world.on('player:joined', ({ player }) => {
	// Auto-add to leaderboard if they're a Farcaster user
	const farcasterUser = farcaster.getUser()
	if (farcasterUser && farcasterUser.fid === player.fid) {
		initializePlayer(farcasterUser)
	}
})

// Auto-initialize if already authenticated
if (farcaster.isAuthenticated()) {
	initializePlayer(farcaster.getUser())
} 