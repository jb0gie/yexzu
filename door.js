// door.js
// doors in hyperfy

let isOpen = false
let isMoving = false
let animationDuration = 1.0 // Duration in seconds

const config = app.config

// Animation configurations
const DOOR_TYPES = {
	SLIDING: 'sliding',
	SALOON: 'saloon'
}

const DOOR_DIRECTIONS = {
	INWARD: 'inward',
	OUTWARD: 'outward'
}

const doorConfig = {
	type: DOOR_TYPES.SLIDING,
	direction: DOOR_DIRECTIONS.OUTWARD, // Change to INWARD for inward-opening doors
	slideDistance: 1.8,
	speed: 2,
	rotationSpeed: Math.PI,
	maxRotation: Math.PI / 4
}

let currentPosition = 0
let targetPosition = 0

// Get door components
const doorFrame = app.get('Frame')
const doorL = app.get('LeftDoor')
const doorR = app.get('RightDoor')


// Create interact action
const action = app.create('action')
action.label = 'Open'
action.position.set(0, 1.5, 0)
action.distance = 3
doorFrame.add(action)

// Simple toggle action
action.onTrigger = () => {
	if (isMoving) return

	isOpen = !isOpen
	action.label = isOpen ? 'Close' : 'Open'
	targetPosition = isOpen ? 1 : 0
	isMoving = true
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

		{
			key: 'lock',
			type: 'section',
			label: 'Lock settings',
		},
	]
})

// Update animation state
app.on('update', dt => {
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
		// Move doors with direction and clamped distance
		const offset = slideDistance * currentPosition * directionMultiplier
		doorL.position.x = -offset
		doorR.position.x = offset
	} else {
		// Saloon door animation
		if (isOpen) {
			currentPosition = Math.min(currentPosition + movement, 1)
		} else {
			currentPosition = Math.max(currentPosition - movement, 0)
		}
		// Rotate doors with direction and clamped rotation
		const rotation = maxRotation * currentPosition * directionMultiplier
		doorL.rotation.y = rotation
		doorR.rotation.y = -rotation
	}

	// Check if animation is complete
	if (Math.abs(currentPosition - targetPosition) < 0.001) {
		isMoving = false
		currentPosition = targetPosition
	}
})