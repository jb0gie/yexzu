// elevator.js
// elevators in hyperfy

// Default configuration
const ELEVATOR_SPEED = 2.0  // Units per second
const MIN_HEIGHT = 0        // Ground level

// State
let isMoving = false
let isGoingUp = true
let currentHeight = 0

// Get elevator components
const elevator = app.get('Lift')

// Create interact action
const action = app.create('action')
action.label = 'Up'
action.position.set(0.6, 1.4, 0)
action.distance = 3
elevator.add(action)

// Handle interaction
action.onTrigger = () => {
	if (isMoving) return

	// Get max height from config
	const maxHeight = Math.max(parseFloat(app.config.maxHeight) || 10, 1)

	// Toggle direction if at limits
	if (currentHeight >= maxHeight) {
		isGoingUp = false
		action.label = 'Down'
	} else if (currentHeight <= MIN_HEIGHT) {
		isGoingUp = true
		action.label = 'Up'
	}

	isMoving = true
}

// Update movement
app.on('fixedUpdate', dt => {
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
})

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