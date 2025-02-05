const ZOOM_SPEED = 1
const LOOK_SPEED = 0.5
const WHEEL_RADIUS = 0.37

const FORWARD = new Vector3(0, 0, -1)
const BACKWARD = new Vector3(0, 0, 1)
const UP = new Vector3(0, 1, 0)

const v1 = new Vector3()
const v2 = new Vector3()
const q1 = new Quaternion()
const q2 = new Quaternion()

const body = app.get('RigidBody')
const collider = app.get('Collider')
const wheels = [
	app.get('Wheel1'),
	app.get('Wheel2'),
	app.get('Wheel3'),
	app.get('Wheel4'),
	app.get('Wheel5'),
	app.get('Wheel6'),
]
const base = app.get('Base')
const top = app.get('Top')
const turret = app.get('Turret')
const cam = app.get('Cam')

world.attach(body)
collider.setMaterial(0.9, 0.9, 0.9)

const action = app.create('action')
action.position.y = 2
action.distance = 6
action.label = 'Enter'
action.onTrigger = () => setMode(driving)

body.add(action)

let mode
let control

const setMode = fn => {
	mode?.()
	mode = fn()
}

function driving() {
	body.remove(action)
	body.type = 'dynamic'
	control = app.control({
		onPress: code => {
			if (code === 'KeyE') {
				setMode(observe)
			}
			if (code === 'MouseRight') {
				control.pointer.lock()
			}
			return true
		},
		onRelease: code => {
			if (code === 'MouseRight') {
				control.pointer.unlock()
			}
			return true
		},
		onScroll: () => {
			return true
		},
	})
	control.camera.claim()
	control.camera.zoom = 5
	cam.matrixWorld.decompose(control.camera.position, control.camera.quaternion, v1)
	const velocity = new Vector3()
	const fixedUpdate = delta => {
		body.getLinearVelocity(velocity)
		const speed = velocity.length()
		const maxSpeed = 5
		if (control.buttons.KeyW && speed < maxSpeed) {
			v1.copy(FORWARD)
			v1.applyQuaternion(body.quaternion)
			v1.multiplyScalar(500 * delta)
			body.addForce(v1)
		}
		if (control.buttons.KeyS && speed < maxSpeed) {
			v1.copy(BACKWARD)
			v1.applyQuaternion(body.quaternion)
			v1.multiplyScalar(500 * delta)
			body.addForce(v1)
		}
		if (control.buttons.KeyA) {
			v2.copy(UP)
			v2.multiplyScalar(300 * delta)
			body.addTorque(v2)
		}
		if (control.buttons.KeyD) {
			v2.copy(UP)
			v2.multiplyScalar(-300 * delta)
			body.addTorque(v2)
		}
	}
	const update = delta => {
		const forwardDir = v2.copy(FORWARD).applyQuaternion(body.quaternion)
		const forwardSpeed = velocity.dot(forwardDir)
		const wheelRotationSpeed = (forwardSpeed / WHEEL_RADIUS) * delta
		for (const wheel of wheels) {
			wheel.rotation.x += wheelRotationSpeed
		}
		if (control.pointer.locked) {
			cam.rotation.y += -control.pointer.delta.x * LOOK_SPEED * delta
			cam.rotation.x += -control.pointer.delta.y * LOOK_SPEED * delta
		}
		control.camera.zoom += -control.scroll.delta * ZOOM_SPEED * delta
		control.camera.zoom = clamp(control.camera.zoom, 5, 20)
	}
	const lateUpdate = delta => {
		cam.matrixWorld.decompose(control.camera.position, control.camera.quaternion, v1)
	}
	app.on('fixedUpdate', fixedUpdate)
	app.on('update', update)
	app.on('lateUpdate', lateUpdate)
	return () => {
		app.off('fixedUpdate', fixedUpdate)
		app.off('update', update)
		app.off('lateUpdate', lateUpdate)
	}
}

function observe() {
	if (control) {
		control.release()
		control = null
	}
	body.add(action)
	body.type = 'kinematic'
}
