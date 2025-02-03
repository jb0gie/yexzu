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
console.log('Starting speaker setup...')

const audio = app.create('audio', {
	src: props.audio?.url,
	volume: props.volume || 0.6,
	group: props.audioType || 'music',
	spatial: true
})

// Get reference to Mesh2 and its material for animation
const speakerBox = app.get('Mesh')
console.log('Speaker object:', speakerBox)
const speakerMaterial = speakerBox?.material
console.log('Speaker material:', speakerMaterial)
const speaker = app.get('Mesh2')

if (!speaker) {
	console.log('Mesh2 not found - speaker animation disabled')
}

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
	backgroundColor: 'black',
	borderRadius: 10,
	padding: 8,
})
ui.position.set(0, 2, 2)
body.add(ui)

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

const time = app.create('uitext', {
	padding: 5,
	textAlign: 'center',
	value: '',
	color: 'white',
	onPointerDown: () => audio.stop(),
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