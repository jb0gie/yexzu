import { World } from './World'

import { Client } from './systems/Client'
import { ClientPointer } from './systems/ClientPointer'
import { ClientPrefs } from './systems/ClientPrefs'
import { ClientControls } from './systems/ClientControls'
import { ClientNetwork } from './systems/ClientNetwork'
import { ClientLoader } from './systems/ClientLoader'
import { ClientGraphics } from './systems/ClientGraphics'
import { ClientEnvironment } from './systems/ClientEnvironment'
import { ClientAudio } from './systems/ClientAudio'
import { ClientStats } from './systems/ClientStats'
import { ClientBuilder } from './systems/ClientBuilder'
import { ClientActions } from './systems/ClientActions'
import { ClientTarget } from './systems/ClientTarget'
import { ClientUI } from './systems/ClientUI'
import { LODs } from './systems/LODs'
import { Nametags } from './systems/Nametags'
import { Particles } from './systems/Particles'
import { Snaps } from './systems/Snaps'
import { Wind } from './systems/Wind'

// Minimal LiveKit stub for Mini Apps
class MiniAppLiveKit {
	constructor(world) {
		this.world = world
		this.status = {
			available: false,
			connected: false,
			mic: false,
			screenshare: null,
		}
	}

	async deserialize(opts) {
		console.log('[MiniAppLiveKit] Disabled for Mini App mode')
	}

	lateUpdate(delta) { }
	setMicrophoneEnabled(value) { }
	setScreenShareTarget(targetId = null) { }
	registerScreenNode(node) { return null }
	unregisterScreenNode(node) { }
	destroy() { }

	emit(event, data) { }
	on(event, callback) { }
	off(event, callback) { }
}

export function createMiniAppWorld() {
	const world = new World()
	world.register('client', Client)
	world.register('livekit', MiniAppLiveKit) // Stub instead of real LiveKit
	world.register('pointer', ClientPointer)
	world.register('prefs', ClientPrefs)
	world.register('controls', ClientControls)
	world.register('network', ClientNetwork)
	world.register('loader', ClientLoader)
	world.register('graphics', ClientGraphics)
	world.register('environment', ClientEnvironment)
	world.register('audio', ClientAudio)
	world.register('stats', ClientStats)
	world.register('builder', ClientBuilder)
	world.register('actions', ClientActions)
	world.register('target', ClientTarget)
	world.register('ui', ClientUI)
	world.register('lods', LODs)
	world.register('nametags', Nametags)
	world.register('particles', Particles)
	world.register('snaps', Snaps)
	world.register('wind', Wind)
	// Note: Excluding XR for Mini Apps to avoid complexity
	return world
} 