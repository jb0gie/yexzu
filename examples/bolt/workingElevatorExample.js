// elevator.js
// elevators in hyperfy

// Default configuration
const ELEVATOR_SPEED = 2.0  // Units per second
const MIN_HEIGHT = 0        // Ground level

// State
let isMoving = false
let isGoingUp = true
let currentHeight = 0
let targetHeight = 0  // For smooth interpolation
let playerOnElevator = false

// Smoothing config
const LERP_FACTOR = 0.15  // Higher = snappier, Lower = smoother

// Get elevator components
const elevator = app.get('Elevator')
const actionRef = app.get('ActionRef')
const triggerCollider = app.get('TriggerCollider')

// Create interact action
const action = app.create('action')
action.label = 'Up'
action.distance = 3
actionRef.add(action)

// Initialize server state
if (world.isServer) {
	app.state.isMoving = isMoving
	app.state.isGoingUp = isGoingUp
	app.state.currentHeight = currentHeight
}

// Handle player collision with elevator
if (triggerCollider) {
	triggerCollider.onHit = (e) => {
		if (e.node?.type === 'player') {
			const me = world.getPlayer()
			if (me && e.node.playerId === me.id) {
				playerOnElevator = true
			}
		}
	}

	triggerCollider.onLeave = (e) => {
		if (e.node?.type === 'player') {
			const me = world.getPlayer()
			if (me && e.node.playerId === me.id) {
				playerOnElevator = false
			}
		}
	}
}

function setDirection(goingUp) {
	isGoingUp = goingUp
	isMoving = true
	action.label = isGoingUp ? 'Down' : 'Up'

	if (world.isServer) {
		app.state.isMoving = isMoving
		app.state.isGoingUp = isGoingUp
		app.state.currentHeight = currentHeight
		app.send('sync', { isMoving, isGoingUp, currentHeight })
	}
}

// Handle interaction
action.onTrigger = () => {
	if (isMoving) return

	// Get max height from config
	const maxHeight = Math.max(parseFloat(app.config.maxHeight) || 10, 1)

	// Toggle direction if at limits
	if (currentHeight >= maxHeight) {
		if (world.isClient) {
			app.send('toggle', false) // Going down
		} else {
			setDirection(false)
		}
	} else if (currentHeight <= MIN_HEIGHT) {
		if (world.isClient) {
			app.send('toggle', true) // Going up
		} else {
			setDirection(true)
		}
	}
}

// Update movement
app.on('update', dt => {
	if (!isMoving) return

	// Get config values or use defaults
	const speed = Math.max(parseFloat(app.config.speed) || 2, 0.1)
	const maxHeight = Math.max(parseFloat(app.config.maxHeight) || 10, 1)

	const movement = speed * dt

	if (isGoingUp) {
		currentHeight = Math.min(currentHeight + movement, maxHeight)
		elevator.position.y = currentHeight

		// Stop at max height
		if (currentHeight >= maxHeight) {
			isMoving = false
			action.label = 'Down'
		}
	} else {
		currentHeight = Math.max(currentHeight - movement, MIN_HEIGHT)
		elevator.position.y = currentHeight

		// Stop at ground
		if (currentHeight <= MIN_HEIGHT) {
			isMoving = false
			action.label = 'Up'
		}
	}

	// Sync position on server
	if (world.isServer && isMoving) {
		app.state.currentHeight = currentHeight
		app.send('pos', currentHeight)
	}
})

// Network handlers
if (world.isClient) {
	// Handle toggle from server
	app.on('sync', data => {
		isMoving = data.isMoving
		isGoingUp = data.isGoingUp
		targetHeight = data.currentHeight
		action.label = isGoingUp ? 'Down' : 'Up'
	})

	// Handle position updates - set target, not direct position
	app.on('pos', height => {
		targetHeight = height
	})

	// Smooth interpolation on client
	app.on('update', dt => {
		// Smoothly interpolate current height toward target
		currentHeight += (targetHeight - currentHeight) * LERP_FACTOR
		elevator.position.y = currentHeight
	})
}

if (world.isServer) {
	// Handle toggle from clients
	app.on('toggle', (goingUp) => {
		setDirection(goingUp)
	})
}

// Configure UI
app.configure(() => {
	return [
		{
			key: 'elevator',
			type: 'section',
			label: 'Elevator Settings',
		},
		{
			key: 'maxHeight',
			type: 'text',
			label: 'Maximum Height',
			defaultValue: '10',
		},
		{
			key: 'speed',
			type: 'text',
			label: 'Speed',
			defaultValue: '2',
		}
	]
}) 