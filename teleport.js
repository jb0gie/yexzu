app.configure([
	{
		key: 'portalName',
		type: 'text',
		label: 'Portal Name',
		initial: 'Portal'
	},
	{
		key: 'zone1',
		type: 'text',
		label: 'X,Y,Z',
		initial: '0,0,0'
	}
])

// Get the body component which will have our trigger collider
const body = app.get('Portal')

// Create UI label for the trigger
const ui = app.create('ui')
ui.width = 200
ui.height = 50
ui.billboard = 'y'
ui.position.y = 2  // Position above the trigger

const label = app.create('uitext')
label.value = props.portalName
label.fontSize = 20
label.color = '#ffffff'
label.textAlign = 'center'

ui.add(label)
body.add(ui)

// Helper function to convert string coordinates to Vector3
const parseCoords = (coordString) => {
	try {
		const [x, y, z] = coordString.split(',').map(num => parseFloat(num.trim()))
		return new Vector3(x, y, z)
	} catch (err) {
		// console.log('Error parsing coordinates:', coordString)
		return new Vector3(0, 0, 0)
	}
}

// Handle trigger events
body.onTriggerEnter = (triggerResult) => {
	// console.log('Trigger entered by:', triggerResult)
	if (triggerResult.player) {
		const destination = parseCoords(props.zone1)
		// console.log('Teleporting to:', destination)
		triggerResult.player.teleport(destination)
	}
}
