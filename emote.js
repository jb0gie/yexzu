app.configure(() => {
	return [
		{
			key: 'emotes',
			type: 'section',
			label: 'VRM Emotes',
		},
		{
			key: 'emote0',
			type: 'file',
			kind: 'emote',
			label: 'emote',
		}
	]
})

const vrm = app.get('avatar')
console.log('vrm', vrm)

if (world.isClient) {
	const idleEmoteUrl = config.emote0?.url
	world.attach(vrm)

	let state = app.state
	if (state.ready) {
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

	app.on('emote', url => {
		vrm.setEmote(url)
	})
}

if (world.isServer) {
	// Initial state
	const state = { ready: true }
	app.state = state
	app.send('state', state)

	// Create controller
	const ctrl = app.create('controller')
	ctrl.position.copy(app.position)
	world.add(ctrl)
	ctrl.quaternion.copy(app.quaternion)
	ctrl.add(vrm)

	// Handle emotes
	const emoteUrls = {}
	if (config.emote0?.url) {
		emoteUrls.idle = config.emote0.url
	}

	// Play emote
	function playEmote(name) {
		const url = emoteUrls[name]
		if (url) {
			app.send('emote', url)
		}
	}

	// Start with idle
	playEmote('idle')
}
