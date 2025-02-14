// door.js
// doors in hyperfy

const SEND_RATE = 1 / 8

let isOpen = false
let isMoving = false
let animationDuration = 1.0 // Duration in seconds
let currentPosition = 0
let targetPosition = 0
let lastSent = 0

// Animation configurations
const DOOR_TYPES = {
	SLIDING: 'sliding',
	SALOON: 'saloon'
}

// Add timer constants at the top with other configurations
const DOOR_OPEN_TIME = 3.0  // Time in seconds door stays open

const DOOR_DIRECTIONS = {
	INWARD: 'inward',
	OUTWARD: 'outward'
}

const doorConfig = {
	type: DOOR_TYPES.SLIDING,
	direction: DOOR_DIRECTIONS.OUTWARD,
	slideDistance: 1.8,
	speed: 2,
	rotationSpeed: Math.PI,
	maxRotation: Math.PI / 4
}

// Add timer variable with other state variables
let openTimer = 0

// Component references
let doorFrame = null
let doorL = null
let doorR = null
let action = null

// Initialize components when app is ready
app.on('ready', () => {
	// Get door components
	doorFrame = app.get('Frame')
	doorL = app.get('LeftDoor')
	doorR = app.get('RightDoor')

	if (!doorFrame || !doorL || !doorR) {
		console.error('Door components not found')
		return
	}

	// Create interact action
	action = app.create('action')
	action.label = 'Open'
	action.position.set(0, 1.5, 0)
	action.distance = 3
	action.duration = 0.5 // Add duration for hold-to-interact
	doorFrame.add(action)
})

if (world.isClient) {
	if (app.state.ready) {
		init(app.state)
	} else {
		app.on('state', init)
	}

	function init(state) {
		isOpen = state.isOpen
		currentPosition = state.currentPosition
		targetPosition = state.targetPosition
		if (action) {
			action.label = isOpen ? 'Close' : 'Open'
		}

		app.on('doorUpdate', (state) => {
			isOpen = state.isOpen
			targetPosition = state.targetPosition
			isMoving = true
			if (action) {
				action.label = isOpen ? 'Close' : 'Open'
			}
			openTimer = 0
		})
	}

	// Updated action handlers
	app.on('ready', () => {
		if (action) {
			action.onStart = () => {
				// Visual feedback could be added here
			}

			action.onTrigger = () => {
				if (isMoving) return
				app.send('toggleDoor')
			}

			action.onCancel = () => {
				// Handle interaction cancellation
			}
		}
	})
}

if (world.isServer) {
	// Initialize server state
	app.state.ready = true
	app.state.isOpen = isOpen
	app.state.currentPosition = currentPosition
	app.state.targetPosition = targetPosition
	app.send('state', app.state)

	app.on('toggleDoor', (data, networkId) => {
		if (isMoving) return
		isMoving = true
		isOpen = !isOpen
		targetPosition = isOpen ? 1 : 0
		openTimer = 0

		// Broadcast door state to all clients
		app.send('doorUpdate', {
			isOpen,
			targetPosition
		})
	})
}

// Door config ui
app.configure(() => {
	return [
		{
			key: 'door',
			type: 'section',
			label: 'Door Settings',
		},
		{
			key: 'type',
			type: 'switch',
			label: 'Door Type',
			options: [
				{ label: 'Sliding', value: '1' },
				{ label: 'Swinging', value: '2' },
			],
			defaultValue: '1'
		},
		{
			key: 'slideDistance',
			type: 'textarea',
			label: 'Slide Distance',
			defaultValue: '1.8',
			placeholder: '1.8'
		},
		{
			key: 'maxRotation',
			type: 'textarea',
			label: 'Swing Angle',
			defaultValue: '45',
			placeholder: '45'
		},
		{
			key: 'direction',
			type: 'switch',
			label: 'Direction',
			options: [
				{ label: 'Inward', value: '1' },
				{ label: 'Outward', value: '2' },
			],
			defaultValue: '2'
		},
		//todo: add lock settings
		// 	{
		// 		key: 'lock',
		// 		type: 'section',
		// 		label: 'Lock settings',
		// 	},
	]
})

// Update animation state
app.on('update', dt => {
	// Handle auto-closing timer when door is open
	if (isOpen && !isMoving) {
		openTimer += dt
		if (openTimer >= DOOR_OPEN_TIME) {
			if (world.isServer) {
				isOpen = false
				targetPosition = 0
				isMoving = true
				openTimer = 0
				app.send('doorUpdate', {
					isOpen,
					targetPosition
				})
			}
		}
	}

	if (!isMoving) return

	const movement = doorConfig.speed * dt

	// Get current door type and direction from config
	const isDoorSliding = app.config.type !== '2'
	const directionMultiplier = app.config.direction === '1' ? -1 : 1

	// Get slide distance from config and clamp it
	const slideDistance = Math.min(Math.max(parseFloat(app.config.slideDistance) || 1.8, 0.5), 2.0)
	// Get rotation angle and clamp it (convert to radians)
	const maxRotation = Math.min(Math.max(parseFloat(app.config.maxRotation) || 45, 0), 90) * (Math.PI / 180)

	console.log('Current config type:', app.config.type)
	console.log('Is sliding?', isDoorSliding)

	if (isDoorSliding) {
		// Sliding door animation
		if (isOpen) {
			currentPosition = Math.min(currentPosition + movement, 1)
		} else {
			currentPosition = Math.max(currentPosition - movement, 0)
		}

		// Reset any rotation on the pivot
		doorL.rotation.y = 0
		doorR.rotation.y = 0

		// Move the doors directly and scale them
		// const offset = slideDistance * currentPosition
		// doorL.position.x = offset
		// doorR.position.x = -offset

		// Scale the doors from 1 to 0 on x-axis
		const scale = 1 - currentPosition
		doorL.scale.x = scale
		doorR.scale.x = scale

	} else {
		// Reset door positions and scale when in swing mode
		doorL.position.x = 0
		doorR.position.x = 0
		doorL.scale.x = 1
		doorR.scale.x = 1

		// Saloon door animation
		if (isOpen) {
			currentPosition = Math.min(currentPosition + movement, 1)
		} else {
			currentPosition = Math.max(currentPosition - movement, 0)
		}

		// Rotate the pivot points
		const rotation = maxRotation * currentPosition * directionMultiplier
		doorL.rotation.y = rotation
		doorR.rotation.y = -rotation
	}

	// Check if animation is complete
	if (Math.abs(currentPosition - targetPosition) < 0.001) {
		isMoving = false
		currentPosition = targetPosition
		// Update action label to match door state
		if (action) {
			action.label = isOpen ? 'Close' : 'Open'
		}
	}
})