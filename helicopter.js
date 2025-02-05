const body = app.get('Body')
const rotors = [
	app.get('RoterB'),
	app.get('RoterF'),
]
const wheels = [
	app.get('WheelsF'),
	app.get('WheelsB'),
]
const doors = [
	app.get('CockpitDoor'),
	app.get('BackDoor'),
]

// Add debug logging to check which objects were found
console.log('Helicopter parts found:', {
	body: !!body,
	rotors: rotors.map(r => !!r),
	wheels: wheels.map(w => !!w),
	doors: doors.map(d => !!d)
})

const actionLabel = 'Interact'

const ROTOR_SPEED = 5  // Rotations per second
const DOOR_ROTATION = Math.PI / 6  // 30 degrees in radians
const WHEEL_ROTATION = Math.PI / 2 // 90 degrees in radians

let isEngineOn = false
let isBackDoorOpen = false
let isCockpitDoorOpen = false
let isAirborne = false

if (world.isClient) {
	let actionsCreated = false
	let backdoorAction, cockpitdoorAction, engineAction

	function setupActions() {
		if (actionsCreated) return

		// Create actions and attach them to specific parts
		backdoorAction = app.create('action')
		backdoorAction.label = 'Open Back Door'
		backdoorAction.position.set(0, 1, 1)
		backdoorAction.onTrigger = () => {
			app.send('backdoor:toggle')
		}
		if (doors[1]) doors[1].add(backdoorAction)

		cockpitdoorAction = app.create('action')
		cockpitdoorAction.label = 'Open Cockpit'
		cockpitdoorAction.position.set(0, 1, -1)
		cockpitdoorAction.onTrigger = () => {
			app.send('cockpitdoor:toggle')
		}
		if (doors[0]) doors[0].add(cockpitdoorAction)

		engineAction = app.create('action')
		engineAction.label = 'Start Engine'
		engineAction.position.set(0, 1.5, 0)
		engineAction.onTrigger = () => {
			app.send('engine:toggle')
		}
		if (body) body.add(engineAction)

		actionsCreated = true
	}

	// Set up actions once
	setupActions()

	// Handle door state updates
	app.on('backdoor:update', (isOpen) => {
		if (doors[1] && doors[1].rotation) {
			doors[1].rotation.z = isOpen ? DOOR_ROTATION : 0
		}
	})

	app.on('cockpitdoor:update', (isOpen) => {
		if (doors[0] && doors[0].rotation) {
			doors[0].rotation.z = isOpen ? DOOR_ROTATION : 0
		}
	})

	// Handle engine and wheel states
	app.on('engine:update', (engineState) => {
		isEngineOn = engineState
		if (engineAction) {
			engineAction.label = isEngineOn ? 'Stop Engine' : 'Start Engine'
		}
	})

	app.on('airborne:update', (airborneState) => {
		isAirborne = airborneState
		wheels.forEach(wheel => {
			if (wheel && wheel.rotation) {
				wheel.rotation.x = isAirborne ? WHEEL_ROTATION : 0
			}
		})
	})

	// Rotor animation
	app.on('update', (delta) => {
		if (isEngineOn) {
			rotors.forEach(rotor => {
				if (rotor && rotor.rotation) {
					rotor.rotation.y += ROTOR_SPEED * delta * Math.PI * 2
				}
			})
		}
	})

	// Clean up function
	app.on('destroy', () => {
		if (backdoorAction && doors[1]) doors[1].remove(backdoorAction)
		if (cockpitdoorAction && doors[0]) doors[0].remove(cockpitdoorAction)
		if (engineAction && body) body.remove(engineAction)
		actionsCreated = false
	})
}

if (world.isServer) {
	app.on('backdoor:toggle', () => {
		isBackDoorOpen = !isBackDoorOpen
		app.send('backdoor:update', isBackDoorOpen)
	})

	app.on('cockpitdoor:toggle', () => {
		isCockpitDoorOpen = !isCockpitDoorOpen
		app.send('cockpitdoor:update', isCockpitDoorOpen)
	})

	app.on('engine:toggle', () => {
		isEngineOn = !isEngineOn
		app.send('engine:update', isEngineOn)
	})

	// Example of how to trigger airborne state (you'll need to implement your own logic)
	app.on('helicopter:takeoff', () => {
		isAirborne = true
		app.send('airborne:update', isAirborne)
	})

	app.on('helicopter:land', () => {
		isAirborne = false
		app.send('airborne:update', isAirborne)
	})
}

let mode
const setMode = fn => {
	mode?.()
	mode = fn()
}

// console.log('v', app.version)