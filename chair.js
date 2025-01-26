// chair.js - Take a load off

const config = app.config
const vrm = app.get('avatar')

// SERVER
if (world.isServer) {
	// send initial state
	const state = {
		ready: true,
	}
	app.state = state
	app.send('state', state)

	// Get chair components
	const chair = app.get('Chair')
	const sitMarker = app.get('SitMarker')

	if (chair && sitMarker) {
		// Create interact action
		const action = app.create('action')
		action.label = 'Sit'
		action.position.copy(sitMarker.position)
		action.distance = 2
		chair.add(action)

		// Track sitting state
		let isSitting = false

		// Handle sitting/standing
		action.onTrigger = () => {
			isSitting = !isSitting
			action.label = isSitting ? 'Stand' : 'Sit'

			// Send emote state to clients
			if (isSitting) {
				app.send('sit', sitMarker.matrixWorld.toArray())
			} else {
				app.send('stand')
			}
		}

		// Update interaction distance from config
		app.on('config', () => {
			const distance = parseFloat(config.distance) || 2
			action.distance = Math.min(Math.max(distance, 1), 4)
		})
	}
}

// CLIENT
if (world.isClient) {
	const sitEmoteUrl = config.sitEmote?.url
	const idleEmoteUrl = config.idleEmote?.url

	world.attach(vrm)
	let state = app.state

	if (state?.ready) {
		init()
	} else {
		world.remove(vrm)
		app.on('state', _state => {
			state = _state
			init()
		})
	}

	function init() {
		world.add(vrm)
		if (idleEmoteUrl) {
			vrm.setEmote(idleEmoteUrl)
		}
	}

	// Handle sit/stand events
	app.on('sit', (matrixData) => {
		// Move to sit position
		const matrix = new THREE.Matrix4()
		matrix.fromArray(matrixData)
		vrm.matrix.copy(matrix)

		// Play sit animation
		if (sitEmoteUrl) {
			vrm.setEmote(sitEmoteUrl)
		}
	})

	app.on('stand', () => {
		// Return to idle animation
		if (idleEmoteUrl) {
			vrm.setEmote(idleEmoteUrl)
		} else {
			vrm.setEmote(null)
		}
	})
}

// Chair config UI
app.configure(() => {
	return [
		{
			key: 'chair',
			type: 'section',
			label: 'Chair Settings',
		},
		{
			key: 'distance',
			type: 'textarea',
			label: 'Interaction Distance',
			defaultValue: '2',
			placeholder: '2'
		},
		{
			key: 'emotes',
			type: 'section',
			label: 'Emotes',
		},
		{
			key: 'sitEmote',
			type: 'file',
			kind: 'emote',
			label: 'Sit Animation',
		},
		{
			key: 'idleEmote',
			type: 'file',
			kind: 'emote',
			label: 'Idle Animation (Optional)',
		}
	]
})

