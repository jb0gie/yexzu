import { System } from './System'
import { ClientLiveKit } from './ClientLiveKit'
import { ClientP2PVoice } from './ClientP2PVoice'

export class ClientVoiceProvider extends System {
  constructor(world) {
    super(world)
    this.backend = null
    this.status = {
      available: false,
      connected: false,
      mic: false,
      screenshare: null,
      level: null,
    }
  }

  start() {
    // defer to backend
  }

  deserialize(opts) {
    if (!opts) return
    if (opts.type === 'p2p') {
      this.backend = new ClientP2PVoice(this.world)
    } else {
      this.backend = new ClientLiveKit(this.world)
    }
    this.world.systems.push(this.backend)
    this.backend.start()

    const emit = this.emit.bind(this)
    this.backend.on('status', data => {
      Object.assign(this.status, data)
      emit('status', data)
    })
    this.backend.on('speaking', data => emit('speaking', data))
    this.backend.on('muted', data => emit('muted', data))

    this.backend.deserialize(opts)
  }

  handleSpeaking(data) {
    this.backend?.handleSpeaking(data)
  }

  handleAudio(data) {
    this.backend?.handleAudio(data)
  }

  handlePeerJoined(data) {
    this.backend?.handlePeerJoined(data)
  }

  handlePeerLeft(data) {
    this.backend?.handlePeerLeft(data)
  }

  setMuted(playerId, muted) {
    this.backend?.setMuted(playerId, muted)
  }

  isMuted(playerId) {
    return this.backend?.isMuted(playerId) ?? false
  }

  setLevel(playerId, level) {
    this.backend?.setLevel(playerId, level)
  }

  setMicrophoneEnabled(value) {
    this.backend?.setMicrophoneEnabled(value)
  }

  setScreenShareTarget(targetId) {
    this.backend?.setScreenShareTarget(targetId)
  }

  addModifier(playerId, level) {
    return this.backend?.addModifier(playerId, level)
  }

  removeModifier(mod) {
    return this.backend?.removeModifier(mod)
  }

  updateModifier(mod, level) {
    return this.backend?.updateModifier(mod, level)
  }

  registerScreenNode(node) {
    return this.backend?.registerScreenNode(node)
  }

  unregisterScreenNode(node) {
    this.backend?.unregisterScreenNode(node)
  }

  lateUpdate(delta) {
    this.backend?.lateUpdate(delta)
  }

  destroy() {
    this.backend?.destroy()
    this.backend = null
  }
}
