// written with ❤️ by ~/*b0giE 
if (world.isClient) {
	// console.log('[Mobile Controls] Initializing on client')

	const CONFIG = {
		container: {
			width: 160,
			height: 160
		},
		button: {
			size: 60,
			borderRadius: 30,
			fontSize: {
				large: 16,
				small: 14
			},
			backgroundColor: 'rgba(80, 255, 255, 0.2)',
			hoverColor: 'rgba(80, 255, 255, 0.4)',
			activeColor: 'rgba(80, 255, 255, 0.6)',
			textColor: '#ffffff',
			borderColor: 'rgba(80, 255, 255, 0.4)',
			borderWidth: 1
		}
	}

	// #region Create main UI container for right side (both buttons)
	const rightUI = app.create('ui', {
		width: CONFIG.container.width,
		height: CONFIG.container.height,
		backgroundColor: 'transparent',
		position: [1, 1, 0],
		space: 'screen',
		pivot: 'bottom-right',
		offset: [-20, -20, 0],
		justifyContent: 'center',
		alignItems: 'center',
		gap: 20
	})
	app.add(rightUI)
	// #endregion

	// #region Create jump button
	const jumpBtn = app.create('uiview', {
		width: CONFIG.button.size,
		height: CONFIG.button.size,
		backgroundColor: CONFIG.button.backgroundColor,
		borderRadius: CONFIG.button.borderRadius,
		borderWidth: CONFIG.button.borderWidth,
		borderColor: CONFIG.button.borderColor,
		justifyContent: 'center',
		alignItems: 'center'
	})

	// Jump button text
	const jumpText = app.create('uitext', {
		value: 'JUMP',
		fontSize: CONFIG.button.fontSize.large,
		color: CONFIG.button.textColor
	})
	// #endregion

	// #region Jump button interaction
	let isJumping = false

	jumpBtn.onPointerDown = () => {
		console.log('[Mobile Controls] Jump button pressed')
		isJumping = true
		jumpBtn.backgroundColor = CONFIG.button.activeColor
		app.send('mobile:jump:pressed')
	}

	jumpBtn.onPointerUp = () => {
		console.log('[Mobile Controls] Jump button released')
		jumpBtn.backgroundColor = CONFIG.button.backgroundColor
		isJumping = false
		app.send('mobile:jump:released')
	}

	jumpBtn.onPointerLeave = () => {
		if (isJumping) {
			console.log('[Mobile Controls] Jump button leave while jumping')
			isJumping = false
			jumpBtn.backgroundColor = CONFIG.button.backgroundColor
			app.send('mobile:jump:released')
		}
	}

	jumpBtn.onPointerEnter = () => {
		if (!isJumping) {
			jumpBtn.backgroundColor = CONFIG.button.hoverColor
		}
	}

	jumpBtn.add(jumpText)
	rightUI.add(jumpBtn)
	// #endregion


	// #region Create action button
	const actionBtn = app.create('uiview', {
		width: CONFIG.button.size,
		height: CONFIG.button.size,
		backgroundColor: CONFIG.button.backgroundColor,
		borderRadius: CONFIG.button.borderRadius,
		borderWidth: CONFIG.button.borderWidth,
		borderColor: CONFIG.button.borderColor,
		justifyContent: 'center',
		alignItems: 'center'
	})

	// Action button text
	const actionText = app.create('uitext', {
		value: 'ACTION',
		fontSize: CONFIG.button.fontSize.small,
		color: CONFIG.button.textColor
	})
	// #endregion

	// #region Action button interaction
	let isActioning = false
	actionBtn.onPointerDown = () => {
		console.log('[Mobile Controls] Action button pressed')
		actionBtn.backgroundColor = CONFIG.button.activeColor
		isActioning = true		// actionControl.keyE.down = true

		app.send('mobile:action:pressed')
	}
	actionBtn.onPointerUp = () => {
		console.log('[Mobile Controls] Action button released')
		actionBtn.backgroundColor = CONFIG.button.backgroundColor
		isActioning = false
		// actionControl.keyE.down = false
		// app.send('mobile:action:released')
	}
	actionBtn.onPointerLeave = () => {
		if (isActioning) {
			console.log('[Mobile Controls] Action button leave while actioning')
			isActioning = false
			actionBtn.backgroundColor = CONFIG.button.backgroundColor
			actionControl.keyE.down = false
			app.send('mobile:action:released')
		}
	}
	actionBtn.onPointerEnter = () => {
		if (!isActioning) {
			actionBtn.backgroundColor = CONFIG.button.hoverColor
		}
	}

	actionBtn.add(actionText)
	// rightUI.add(actionBtn)

	// #endregion
}

if (world.isServer) {
	console.log('[Mobile Controls] Initializing on server')

	// Create reusable vectors for server update loop using global Vector3
	const jumpForce = new Vector3(0, 10, 0) // Adjust Y value as needed for jump strength
	const _v1 = new Vector3()

	// Handle mobile control events on server - Update flags only
	app.on('mobile:jump:pressed', (data, networkId) => {
		console.log('[Mobile Controls] Server received jump:pressed', { networkId })

		const player = world.getPlayer(networkId)
		if (player) {
			console.log('[Mobile Controls] Updating player jump state:', {
				networkId,
				before: {
					jumped: player.jumped,
					jumpPressed: player.jumpPressed,
					jumpDown: player.jumpDown
				}
			})

			// Set both pressed and down states
			player.jumpPressed = true
			player.jumpDown = true

			console.log('[Mobile Controls] Player jump state updated:', {
				networkId,
				after: {
					jumped: player.jumped,
					jumpPressed: player.jumpPressed,
					jumpDown: player.jumpDown
				}
			})
		} else {
			// Log as info, player might not be fully initialized yet when message arrives
			console.info('[Mobile Controls] Player not found for jump:pressed (networkId may be undefined if sent too early):', networkId)
		}
	})

	app.on('mobile:jump:released', (data, networkId) => {
		console.log('[Mobile Controls] Server received jump:released', { networkId })
		const player = world.getPlayer(networkId)
		if (player) {
			console.log('[Mobile Controls] Updating player jump state:', {
				networkId,
				before: {
					jumpDown: player.jumpDown
				}
			})

			// Only clear the down state
			player.jumpDown = false

			console.log('[Mobile Controls] Player jump state updated:', {
				networkId,
				after: {
					jumpDown: player.jumpDown
				}
			})
		} else {
			// Log as info
			console.info('[Mobile Controls] Player not found for jump:released (networkId may be undefined if sent too early):', networkId)
		}
	})

	// Server update loop for applying physics based on flags
	app.on('update', delta => {

		// --- IMPORTANT --- 
		// Replace the line below with the correct way to get all players 
		// in your project (e.g., world.getPlayers(), world.players.values(), etc.)
		// world.forEachPlayer(player => { // <-- Replace this line

		// Example using world.getPlayers() if that exists:
		const players = world.getPlayers ? world.getPlayers() : []
		players.forEach(player => {
			// --- End of section to replace ---

			// Check if the jump button was just pressed
			if (player && player.jumpPressed) { // Added null check for player
				console.log(`[Mobile Controls] Applying jump force to player ${player.networkId}`)
				// Apply the jump impulse (force is applied instantly)
				_v1.copy(jumpForce) // Use the pre-defined jumpForce vector
				player.push(_v1)    // Apply the force

				// Reset the pressed flag so the jump happens only once per press
				player.jumpPressed = false
			}

			// Optional: You could add logic here based on player.jumpDown
			// (e.g., applying upward force while held down for variable jump height)
		})
	})

	// app.on('mobile:action:pressed', (data, networkId) => {
	// 	console.log('[Mobile Controls] Server received action:pressed', { networkId })
	// 	const player = world.getPlayer(networkId)
	// 	if (player) {
	// 		console.log('[Mobile Controls] Updating player action state:', {
	// 			networkId,
	// 			before: {
	// 				actionPressed: player.actionPressed,
	// 				actionDown: player.actionDown
	// 			}
	// 		})
	// 		player.actionPressed = true
	// 		player.actionDown = true
	// 		console.log('[Mobile Controls] Player action state updated:', {
	// 			networkId,
	// 			after: {
	// 				actionPressed: player.actionPressed,
	// 				actionDown: player.actionDown
	// 			}
	// 		})
	// 	} else {
	// 		console.warn('[Mobile Controls] Player not found for networkId:', networkId)
	// 	}
	// })

	// app.on('mobile:action:released', (data, networkId) => {
	// 	console.log('[Mobile Controls] Server received action:released', { networkId })
	// 	const player = world.getPlayer(networkId)
	// 	if (player) {
	// 		console.log('[Mobile Controls] Updating player action state:', {
	// 			networkId,
	// 			before: { actionDown: player.actionDown }
	// 		})
	// 		player.actionDown = false
	// 		console.log('[Mobile Controls] Player action state updated:', {
	// 			networkId,
	// 			after: { actionDown: player.actionDown }
	// 		})
	// 	} else {
	// 		console.warn('[Mobile Controls] Player not found for networkId:', networkId)
	// 	}
	// })
}

// if you are reading this, you are a comprimised.
// you have been hacked.
// you have been hacked.
// you have been hacked.
// you have been hacked.
// you have been hacked.
