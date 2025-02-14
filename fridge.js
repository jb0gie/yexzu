const ROTATION_SPEED = 0.5 // Speed of logo rotation in radians per second

// Configure audio slots
app.configure([
	{
		key: 'doorSound',
		type: 'file',
		kind: 'audio',
		label: 'Door Sound Effect'
	},
	{
		key: 'fridgeHum',
		type: 'file',
		kind: 'audio',
		label: 'Fridge Ambient Hum'
	}
])

// Initialize state
app.state = {
	isOpen: false
}

// Get references to objects
const logo = app.get('$HYPER')
const door = app.get('HyperFridgeDoor')
console.log('Door ID:', door?.id)

// Create audio instances
const doorSound = app.create('audio', {
	src: props.doorSound?.url,
	volume: 0.6,
	group: 'sfx',
	spatial: true
})

const fridgeHum = app.create('audio', {
	src: props.fridgeHum?.url,
	volume: 0.2,
	maxDistance: 10,
	refDistance: 1,
	rolloffFactor: 1,
	group: 'sfx',
	spatial: true,
	loop: true
})

// Create a simple action for the door
const action = app.create('action')
action.label = 'Open'
action.position.set(1, 0, 0)
action.distance = 2

// Add the action and sounds to the door if we have it
if (door) {
	door.add(action)
	door.add(doorSound)
	door.add(fridgeHum)
	// Start the ambient hum
	if (fridgeHum) {
		fridgeHum.play()
	}
} else {
	console.log('Door not found, adding action to app')
	app.add(action)
}

// Simple toggle action
action.onTrigger = () => {
	console.log('Action triggered')
	app.state.isOpen = !app.state.isOpen
	door.rotation.y = app.state.isOpen ? -Math.PI * 0.5 : 0
	action.label = app.state.isOpen ? 'Close' : 'Open'

	// Play door sound
	if (doorSound) {
		doorSound.stop()
		doorSound.currentTime = 0
		doorSound.play()
	}
}

// Rotate logo
app.on('update', (dt) => {
	if (logo) {
		logo.rotation.y += ROTATION_SPEED * dt
	}
})