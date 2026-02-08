let SPEED, MIN_HEIGHT, isMoving, isGoingUp, currentHeight, elevator, panel, action

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

SPEED = 2.0
MIN_HEIGHT = 0
isMoving = false
isGoingUp = true
currentHeight = 0

elevator = app.get('SmallElevator')
panel = app.get('Screen')

// Initialize server state
if (world.isServer) {
	app.state.isMoving = isMoving
	app.state.isGoingUp = isGoingUp
	app.state.currentHeight = currentHeight
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

action = app.create('action')
action.label = 'Interact'
action.distance = 2
panel.add(action)
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
			// action.label = 'Down'
		}
	} else {
		currentHeight = Math.max(currentHeight - movement, MIN_HEIGHT)
		elevator.position.y = currentHeight

		// Stop at ground
		if (currentHeight <= MIN_HEIGHT) {
			isMoving = false
			// action.label = 'Up'
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
		currentHeight = data.currentHeight
		elevator.position.y = currentHeight
		// action.label = isGoingUp ? 'Down' : 'Up'
	})

	// Handle position updates
	app.on('pos', height => {
		currentHeight = height
		elevator.position.y = height
	})
}

if (world.isServer) {
	// Handle toggle from clients
	app.on('toggle', (goingUp) => {
		setDirection(goingUp)
	})
}