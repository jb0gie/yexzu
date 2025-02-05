app.configure([
	{
		key: 'audio',
		type: 'file',
		kind: 'audio',
		label: 'Audio'
	},
	{
		key: 'volume',
		type: 'switch',
		label: 'Volume Level',
		options: [
			{ label: 'Low', value: 0.3 },
			{ label: 'Medium', value: 0.6 },
			{ label: 'High', value: 1.0 }
		]
	},
	{
		key: 'audioType',
		type: 'switch',
		label: 'Audio Type',
		options: [
			{ label: 'Music', value: 'music' },
			{ label: 'Sound Effect', value: 'sfx' }
		]
	}
])

// Add debug logging
// console.log('Starting speaker setup...')

const audio = app.create('audio', {
	src: props.audio?.url,
	volume: props.volume || 0.6,
	group: props.audioType || 'music',
	spatial: true
})

// Get reference to Mesh2 and its material for animation
const speakerBox = app.get('Mesh')
// console.log('Speaker object:', speakerBox)
const speakerMaterial = speakerBox?.material
// console.log('Speaker material:', speakerMaterial)
const speaker = app.get('Mesh2')

// More careful initialization of original position
let originalPosition = 0
try {
	originalPosition = speaker?.position?.z ?? 0
	// console.log('Original position:', originalPosition)
} catch (err) {
	console.log('Error getting speaker position:', err)
}

const body = app.get('Body')
body.add(audio)

const ui = app.create('ui', {
	width: 150,
	height: 150,
	backgroundColor: 'rgba(0, 0, 0, 0.85)',
	borderRadius: 10,
	padding: 8,
})
ui.position.set(1, .5, 2)
body.add(ui)

// Playback controls
const btn1 = app.create('uitext', {
	padding: 4,
	textAlign: 'center',
	value: 'Play',
	color: 'white',
	onPointerDown: () => audio.play(),
	onPointerEnter: () => btn1.color = 'purple',
	onPointerLeave: () => btn1.color = 'white',
	cursor: 'pointer'
})
ui.add(btn1)

const btn2 = app.create('uitext', {
	padding: 4,
	textAlign: 'center',
	value: 'Pause',
	color: 'white',
	onPointerDown: () => audio.pause(),
	onPointerEnter: () => btn2.color = 'purple',
	onPointerLeave: () => btn2.color = 'white',
	cursor: 'pointer'
})
ui.add(btn2)

const btn3 = app.create('uitext', {
	padding: 4,
	textAlign: 'center',
	value: 'Stop',
	color: 'white',
	onPointerDown: () => audio.stop(),
	onPointerEnter: () => btn3.color = 'purple',
	onPointerLeave: () => btn3.color = 'white',
	cursor: 'pointer'
})
ui.add(btn3)

// Volume controls
const volumeLabel = app.create('uitext', {
	padding: 4,
	textAlign: 'center',
	value: 'Volume:',
	color: 'white',
	fontSize: 12
})
ui.add(volumeLabel)

// Create a horizontal container for volume controls
const volumeControls = app.create('ui', {
	flexDirection: 'row',
	justifyContent: 'center',
	alignItems: 'center',
	gap: 8,
	padding: 4
})
ui.add(volumeControls)

const volumeDown = app.create('uitext', {
	padding: 4,
	textAlign: 'center',
	value: '🔉',
	color: 'white',
	onPointerDown: () => {
		audio.volume = Math.max(0, audio.volume - 0.1)
		volumeText.value = `${Math.round(audio.volume * 100)}%`
	},
	onPointerEnter: () => volumeDown.color = 'purple',
	onPointerLeave: () => volumeDown.color = 'white',
	cursor: 'pointer'
})
volumeControls.add(volumeDown)

const volumeText = app.create('uitext', {
	padding: 4,
	textAlign: 'center',
	value: '60%',
	color: 'white',
	fontSize: 12,
	width: 40  // Fixed width for percentage
})
volumeControls.add(volumeText)

const volumeUp = app.create('uitext', {
	padding: 4,
	textAlign: 'center',
	value: '🔊',
	color: 'white',
	onPointerDown: () => {
		audio.volume = Math.min(1, audio.volume + 0.1)
		volumeText.value = `${Math.round(audio.volume * 100)}%`
	},
	onPointerEnter: () => volumeUp.color = 'purple',
	onPointerLeave: () => volumeUp.color = 'white',
	cursor: 'pointer'
})
volumeControls.add(volumeUp)

const time = app.create('uitext', {
	padding: 5,
	textAlign: 'center',
	value: '',
	color: 'white',
	fontSize: 12,
})
ui.add(time)

let frameCount = 0

app.on('update', () => {
	try {
		frameCount++
		time.value = audio.currentTime.toFixed(2)
		time.color = audio.isPlaying ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'

		// Animate speaker mesh and material when audio is playing
		if (speaker && speaker.position && audio.isPlaying) {
			// Position animation
			speaker.position.z = originalPosition + Math.sin(frameCount * 0.3) * 0.1

			// Material emission animation
			if (speakerMaterial) {
				speakerMaterial.emissiveIntensity = 1 + Math.sin(frameCount * 0.1) * 0.5
			}
		} else if (speaker && speaker.position) {
			// Reset position and material when not playing
			speaker.position.z = originalPosition
			if (speakerMaterial) {
				speakerMaterial.emissiveIntensity = 1
			}
		}
	} catch (err) {
		console.error('Error in update loop:', err)
	}
})