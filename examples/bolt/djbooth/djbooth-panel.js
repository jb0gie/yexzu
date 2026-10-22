let panel = app.get('Panel')

app.configure([
	{
		key: 'portalDest',
		type: 'text',
		label: 'Portal Destination',
		initial: 'Place Name',
		placeholder: 'Enter Destination',
		hint: 'Where it goes'
	}
])

//#region ServerSide
if (world.isServer) {
	world.on(props.portalDest, (eventData) => {
		if (!eventData || !eventData.position) {
			console.error('Invalid data received for portal position event');
			return;
		}

		const { x, y, z } = eventData.position;
		const position = [x, y, z];

		app.send('position', position);
	});
}
//#endregion

//#region ClientSide
if (world.isClient) {
	let position = null;
	app.on('position', arr => {
		position = new Vector3().fromArray(arr);
	});

	// Create summon action
	const goToBooth = app.create('action')
	goToBooth.label = 'DJ Booth'
	goToBooth.distance = 1.5
	goToBooth.position.y = 0.8
	goToBooth.duration = 0.69
	panel.add(goToBooth)

	// Teleport to booth
	goToBooth.onTrigger = () => {
		const player = world.getPlayer(playerId);
		player.teleport(position); //if your rotation on exit is weird, add , and 1.23 to 3.14 to mess with rotation
	}

}