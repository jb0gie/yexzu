const fan1 = app.get('Fan1')
const fan2 = app.get('Fan2')
const fan3 = app.get('Fan3')
const fan4 = app.get('Fan4')
const fan5 = app.get('Fan5')
const fan6 = app.get('Fan6')

// Check if all fans exist
if (!fan1 || !fan2 || !fan3 || !fan4 || !fan5 || !fan6) {
	console.error('One or more fans not found in scene')
	return
}

const rotationSpeed = 1 // Rotation speed in radians per second

app.on('update', delta => {
	// Spin fans 1-5 on X axis
	fan1.rotation.x += rotationSpeed * delta
	fan2.rotation.x += rotationSpeed * delta
	fan3.rotation.x += rotationSpeed * delta
	fan4.rotation.x += rotationSpeed * delta
	fan5.rotation.x += rotationSpeed * delta

	// Spin fan 6 on Y axis
	fan6.rotation.y += rotationSpeed * delta
})

