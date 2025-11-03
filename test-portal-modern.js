// Test the modern portal configuration
const portal = app.get('SpiceXPortal')

// Test the particle configuration that was causing issues
const portalParticles = app.create('particles', {
	max: 300,
	rate: 40,
	life: '1.2',
	speed: '2.0',
	size: '0.05~0.15',
	opacity: '0.8~1.0',
	color: '#00ffff',
	emissive: '2',
	shape: ['circle', 0.3, 0, true],
	direction: 0,
	turbulence: 0.5,
	blending: 'additive',
	space: 'world',
	rotate: '0~360',
	gravity: -0.2
})

portal.add(portalParticles)
console.log('Modern portal particles created successfully')
console.log('Particle count:', portalParticles.max)
console.log('Rate:', portalParticles.rate)