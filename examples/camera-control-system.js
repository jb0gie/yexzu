/**
 * Camera Control System Example
 * 
 * This example demonstrates advanced camera controls in Hyperfy:
 * - Multiple camera creation and management
 * - Camera switching with smooth transitions
 * - Custom camera configurations (DOF, motion, effects)
 * - Input controls for camera manipulation
 * - Camera helper visualization
 */

// Configuration
app.configure([
	{
		type: 'section',
		key: 'cameras',
		label: 'Camera Settings'
	},
	{
		key: 'enableDOF',
		type: 'switch',
		label: 'Enable Depth of Field',
		options: [
			{ value: 'true', label: 'Yes' },
			{ value: 'false', label: 'No' }
		],
		initial: 'true'
	},
	{
		key: 'enableMotion',
		type: 'switch',
		label: 'Enable Camera Motion',
		options: [
			{ value: 'true', label: 'Yes' },
			{ value: 'false', label: 'No' }
		],
		initial: 'true'
	},
	{
		key: 'fov',
		type: 'number',
		label: 'Field of View',
		initial: 50,
		min: 30,
		max: 120
	},
	{
		key: 'fStop',
		type: 'number',
		label: 'F-Stop (DOF)',
		initial: 2.8,
		min: 1.4,
		max: 16
	},
	{
		type: 'section',
		key: 'effects',
		label: 'Post-Processing Effects'
	},
	{
		key: 'enableBloom',
		type: 'switch',
		label: 'Enable Bloom',
		options: [
			{ value: 'true', label: 'Yes' },
			{ value: 'false', label: 'No' }
		],
		initial: 'false'
	},
	{
		key: 'bloomIntensity',
		type: 'number',
		label: 'Bloom Intensity',
		initial: 0.5,
		min: 0,
		max: 2,
		when: [{ key: 'enableBloom', op: 'eq', value: 'true' }]
	}
])

// Only run on client
if (world.isClient) {
	let cameras = []
	let currentCameraIndex = 0
	let isTransitioning = false

	// Get control interface
	const control = app.control()
	if (!control) {
		console.warn('No control interface available')
		return
	}

	// Capture keys for camera controls
	control.key1.capture = true
	control.key2.capture = true
	control.key3.capture = true
	control.key4.capture = true
	control.keyC.capture = true

	// Create UI
	const ui = app.create('ui')
	ui.width = 400
	ui.height = 350
	ui.backgroundColor = 'rgba(0, 15, 30, 0.9)'
	ui.borderRadius = 20
	ui.padding = 20
	ui.billboard = 'full'
	ui.pivot = 'top-left'
	ui.justifyContent = 'flex-start'
	ui.alignItems = 'stretch'
	ui.gap = 12
	ui.position.set(-8, 2, 0)
	app.add(ui)

	// Title
	const title = app.create('uitext')
	title.value = '📷 CAMERA CONTROL SYSTEM'
	title.color = '#00ffaa'
	title.fontSize = 24
	title.fontWeight = 'bold'
	title.textAlign = 'center'
	ui.add(title)

	// Camera status
	const cameraStatus = app.create('uitext')
	cameraStatus.value = 'Active Camera: Default'
	cameraStatus.color = '#ffffff'
	cameraStatus.fontSize = 16
	cameraStatus.textAlign = 'center'
	cameraStatus.backgroundColor = 'rgba(0, 0, 0, 0.3)'
	cameraStatus.padding = 10
	cameraStatus.borderRadius = 8
	ui.add(cameraStatus)

	// Controls info
	const controlsInfo = app.create('uitext')
	controlsInfo.value = 'Controls:\n1-4: Switch cameras\nC: Toggle camera helpers\n\nMouse: Look around\nWASD: Move'
	controlsInfo.color = '#888888'
	controlsInfo.fontSize = 12
	controlsInfo.lineHeight = 1.4
	ui.add(controlsInfo)

	// Camera info display
	const cameraInfo = app.create('uitext')
	cameraInfo.value = 'Camera Settings:\nFOV: 50°\nDOF: Enabled\nMotion: Enabled'
	cameraInfo.color = '#00ffaa'
	cameraInfo.fontSize = 14
	cameraInfo.lineHeight = 1.3
	cameraInfo.backgroundColor = 'rgba(0, 0, 0, 0.3)'
	cameraInfo.padding = 10
	cameraInfo.borderRadius = 8
	ui.add(cameraInfo)

	// Create multiple cameras
	function createCameras() {
		// Camera 1: Overhead view
		const overheadCamera = app.create('camera', {
			name: 'overhead',
			position: [0, 15, 0],
			rotation: [-Math.PI / 2, 0, 0],
			fov: props.fov || 50,
			near: 0.1,
			far: 2000,
			active: false,
			attachToRig: false,
			showHelper: false,

			dof: {
				enabled: props.enableDOF === 'true',
				fStop: props.fStop || 2.8,
				focusDistance: 10,
				maxBlur: 0.03,
				autofocus: false
			},

			motion: {
				enabled: props.enableMotion === 'true',
				bobAmount: 0.001,
				bobSpeed: 0.01,
				swayAmount: 0.0005,
				swaySpeed: 0.005,
				dampingFactor: 0.95
			},

			bloom: {
				enabled: props.enableBloom === 'true',
				intensity: props.bloomIntensity || 0.5
			}
		})

		// Camera 2: Cinematic angle
		const cinematicCamera = app.create('camera', {
			name: 'cinematic',
			position: [10, 5, 10],
			rotation: [-0.3, 0.785, 0],
			fov: props.fov || 50,
			near: 0.1,
			far: 2000,
			active: false,
			attachToRig: false,
			showHelper: false,

			dof: {
				enabled: props.enableDOF === 'true',
				fStop: props.fStop || 2.8,
				focusDistance: 15,
				maxBlur: 0.05,
				autofocus: true
			},

			motion: {
				enabled: props.enableMotion === 'true',
				bobAmount: 0.002,
				bobSpeed: 0.02,
				swayAmount: 0.001,
				swaySpeed: 0.01,
				dampingFactor: 0.98
			},

			bloom: {
				enabled: props.enableBloom === 'true',
				intensity: props.bloomIntensity || 0.5
			},

			vignette: {
				enabled: true,
				offset: 0.35,
				darkness: 0.4
			},

			filmGrain: {
				enabled: true,
				intensity: 0.25
			}
		})

		// Camera 3: First person close
		const closeCamera = app.create('camera', {
			name: 'close',
			position: [0, 2, 5],
			rotation: [0, Math.PI, 0],
			fov: props.fov || 50,
			near: 0.1,
			far: 2000,
			active: false,
			attachToRig: false,
			showHelper: false,

			dof: {
				enabled: props.enableDOF === 'true',
				fStop: 1.4,
				focusDistance: 5,
				maxBlur: 0.08,
				autofocus: false
			},

			motion: {
				enabled: props.enableMotion === 'true',
				bobAmount: 0.003,
				bobSpeed: 0.03,
				swayAmount: 0.002,
				swaySpeed: 0.02,
				dampingFactor: 0.99
			}
		})

		// Camera 4: Wide angle
		const wideCamera = app.create('camera', {
			name: 'wide',
			position: [0, 8, 20],
			rotation: [-0.2, 0, 0],
			fov: 75,
			near: 0.1,
			far: 2000,
			active: false,
			attachToRig: false,
			showHelper: false,

			dof: {
				enabled: props.enableDOF === 'true',
				fStop: 5.6,
				focusDistance: 20,
				maxBlur: 0.02,
				autofocus: false
			},

			motion: {
				enabled: props.enableMotion === 'true',
				bobAmount: 0.0005,
				bobSpeed: 0.005,
				swayAmount: 0.0002,
				swaySpeed: 0.002,
				dampingFactor: 0.9
			}
		})

		cameras = [overheadCamera, cinematicCamera, closeCamera, wideCamera]

		// Add all cameras to scene
		cameras.forEach(camera => {
			app.add(camera)
		})

		console.log('[CameraSystem] Created', cameras.length, 'cameras')
	}

	// Switch to camera by index
	function switchCamera(index) {
		if (isTransitioning || index < 0 || index >= cameras.length) return

		isTransitioning = true
		currentCameraIndex = index

		// Deactivate current camera
		cameras.forEach(camera => {
			camera.active = false
		})

		// Activate new camera
		cameras[index].active = true

		// Update UI
		const cameraNames = ['Overhead', 'Cinematic', 'Close-up', 'Wide']
		cameraStatus.value = `Active Camera: ${cameraNames[index]}`

		// Show transition effect
		cameraStatus.color = '#ffaa00'
		setTimeout(() => {
			cameraStatus.color = '#ffffff'
			isTransitioning = false
		}, 500)

		console.log('[CameraSystem] Switched to camera:', cameraNames[index])
	}

	// Toggle camera helpers
	function toggleCameraHelpers() {
		cameras.forEach(camera => {
			camera.showHelper = !camera.showHelper
		})

		const status = cameras[0].showHelper ? 'ON' : 'OFF'
		console.log('[CameraSystem] Camera helpers:', status)
	}

	// Update camera info display
	function updateCameraInfo() {
		const dofStatus = props.enableDOF === 'true' ? 'Enabled' : 'Disabled'
		const motionStatus = props.enableMotion === 'true' ? 'Enabled' : 'Disabled'
		const bloomStatus = props.enableBloom === 'true' ? 'Enabled' : 'Disabled'

		cameraInfo.value = `Camera Settings:
FOV: ${props.fov || 50}°
DOF: ${dofStatus} (f/${props.fStop || 2.8})
Motion: ${motionStatus}
Bloom: ${bloomStatus}${props.enableBloom === 'true' ? ` (${props.bloomIntensity || 0.5})` : ''}`
	}

	// Initialize cameras
	createCameras()

	// Listen for input
	app.on('update', () => {
		// Camera switching
		if (control.key1 && control.key1.pressed) {
			switchCamera(0)
		}
		if (control.key2 && control.key2.pressed) {
			switchCamera(1)
		}
		if (control.key3 && control.key3.pressed) {
			switchCamera(2)
		}
		if (control.key4 && control.key4.pressed) {
			switchCamera(3)
		}

		// Toggle camera helpers
		if (control.keyC && control.keyC.pressed) {
			toggleCameraHelpers()
		}
	})

	// Listen for config changes
	app.on('config', () => {
		updateCameraInfo()

		// Update camera settings
		cameras.forEach(camera => {
			camera.fov = props.fov || 50

			if (camera.dof) {
				camera.dof.enabled = props.enableDOF === 'true'
				camera.dof.fStop = props.fStop || 2.8
			}

			if (camera.motion) {
				camera.motion.enabled = props.enableMotion === 'true'
			}

			if (camera.bloom) {
				camera.bloom.enabled = props.enableBloom === 'true'
				camera.bloom.intensity = props.bloomIntensity || 0.5
			}
		})
	})

	// Initial setup
	updateCameraInfo()

	// Set default camera (overhead)
	switchCamera(0)

	console.log('[CameraSystem] Camera control system initialized')
	console.log('[CameraSystem] Use keys 1-4 to switch cameras, C to toggle helpers')
}
