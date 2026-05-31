import { System } from './System'
import { isBoolean } from 'lodash-es'

const THRESHOLD = 0.025
const DEBOUNCE = 0.3
const FFT_SIZE = 4096
const CHUNK_INTERVAL = 6

export class ClientP2PVoice extends System {
  constructor(world) {
    super(world)
    this.status = {
      available: false, connected: false, mic: false,
      screenshare: null, level: null,
    }
    this.defaultLevel = null
    this.levels = {}
    this.muted = new Set()
    this.localStream = null
    this.initialized = false
    this.localPCM = null
    this.localSpeaking = false
    this.localTimer = 0
    this.frameCounter = 0
    this.remoteVoices = new Map()
  }

  start() {
    this.defaultLevel = this.world.settings.voice
    this.status.level = this.defaultLevel
    this.world.settings.on('change', this.onSettingsChange)
  }

  onSettingsChange = changes => {
    if (!changes.voice) return
    this.defaultLevel = changes.voice.value
    const myLevel = this.levels[this.world.network.id] || this.defaultLevel
    if (this.status.level !== myLevel) {
      this.status.level = myLevel
      this.emit('status', this.status)
    }
    this.remoteVoices.forEach(v => {
      const level = this.levels[v.playerId] || this.defaultLevel
      v.setLevel(level)
    })
  }

  async deserialize(opts) {
    if (!opts || this.initialized) return
    this.initialized = true
    this.status.available = true
    this.levels = opts.levels || {}
    this.muted = new Set(opts.muted || [])
    this.status.muted = this.muted.has(this.world.network.id)

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.status.mic = true
      this.world.audio.ready(() => this._initLocal())
    } catch (err) {
      console.error('[p2pvoice] mic failed:', err.message)
    }
    this.emit('status', this.status)
    this.status.connected = true
    this.emit('status', this.status)
  }

  _initLocal() {
    const ctx = this.world.audio.ctx
    if (!ctx) return
    const source = ctx.createMediaStreamSource(this.localStream)
    this.localPCM = new Float32Array(FFT_SIZE)
    const processor = ctx.createScriptProcessor(FFT_SIZE, 1, 1)
    processor.onaudioprocess = e => {
      const input = e.inputBuffer.getChannelData(0)
      this.localPCM.set(input)

      let sum = 0
      for (let i = 0; i < input.length; i++) {
        sum += input[i] * input[i]
      }
      const rms = Math.sqrt(sum / input.length)

      if (rms > THRESHOLD) this.localTimer = DEBOUNCE
      else this.localTimer = Math.max(0, this.localTimer - this.localDelta)

      const speaking = this.localTimer > 0
      if (speaking !== this.localSpeaking) {
        this.localSpeaking = speaking
        this.world.entities.player?.setSpeaking(speaking)
        this.world.network.send('voiceSpeaking', { speaking })
        this.emit('speaking', { playerId: this.world.network.id, speaking })
      }

      if (speaking) {
        this.frameCounter++
        if (this.frameCounter % CHUNK_INTERVAL === 0) {
          this.world.network.send('voiceAudio', { pcm: Array.from(input) })
        }
      }
    }
    this._processor = processor
    source.connect(processor)
    const silence = ctx.createGain()
    silence.gain.value = 0
    processor.connect(silence)
    silence.connect(ctx.destination)
  }

  lateUpdate(delta) {
    this.localDelta = delta
    this.remoteVoices.forEach(v => v.update(delta))
  }

  handleSpeaking(data) {
    const { peerId, speaking } = data
    const player = this.world.entities.getPlayer(peerId)
    if (!player) return
    player.setSpeaking(speaking)
    this.emit('speaking', { playerId: peerId, speaking })
  }

  handleAudio(data) {
    const { peerId, pcm } = data
    let voice = this.remoteVoices.get(peerId)
    if (!voice) {
      const player = this.world.entities.getPlayer(peerId)
      if (!player) return
      const level = this.levels[peerId] || this.defaultLevel
      voice = new RemoteVoice(this.world, peerId, player, level, this.muted.has(peerId))
      this.remoteVoices.set(peerId, voice)
    }
    voice.feed(pcm)
  }

  handlePeerJoined(data) {
    const { peerId, peerName } = data
    if (peerId === this.world.network.id) return
    console.warn('[p2pvoice] peer joined:', peerName)
  }

  handlePeerLeft(data) {
    const voice = this.remoteVoices.get(data.peerId)
    if (voice) {
      voice.destroy()
      this.remoteVoices.delete(data.peerId)
    }
  }

  setMicrophoneEnabled(value) {
    if (!this.localStream) return
    value = isBoolean(value) ? value : !this.status.mic
    if (this.status.mic === value) return
    this.localStream.getAudioTracks().forEach(t => { t.enabled = value })
    this.status.mic = value
    this.emit('status', this.status)
  }

  setMuted(playerId, muted) {
    if (muted && this.muted.has(playerId)) return
    if (!muted && !this.muted.has(playerId)) return
    if (muted) this.muted.add(playerId)
    else this.muted.delete(playerId)
    const voice = this.remoteVoices.get(playerId)
    voice?.setMuted(muted)
    this.emit('muted', { playerId, muted })
    if (playerId === this.world.network.id) {
      this.status.muted = muted
      this.emit('status', this.status)
    }
  }

  isMuted(playerId) {
    return this.muted.has(playerId)
  }

  setLevel(playerId, level) {
    this.levels[playerId] = level
    level = level || this.defaultLevel
    if (playerId === this.world.network.id) {
      if (this.status.level !== level) {
        this.status.level = level
        this.emit('status', this.status)
      }
      return
    }
    this.remoteVoices.get(playerId)?.setLevel(level)
  }

  setScreenShareTarget() {}
  registerScreenNode() { return null }
  unregisterScreenNode() {}

  destroy() {
    this.remoteVoices.forEach(v => v.destroy())
    this.remoteVoices.clear()
    if (this._processor) {
      this._processor.disconnect()
      this._processor = null
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop())
      this.localStream = null
    }
  }
}

class RemoteVoice {
  constructor(world, playerId, player, level, muted) {
    this.world = world
    this.playerId = playerId
    this.player = player
    this.level = level
    this.muted = muted
    this.speaking = false
    this.speakingTimer = 0
    this.buffer = []
    this.nextTime = 0
    this.ctx = world.audio.ctx
    this.sampleRate = this.ctx?.sampleRate || 48000
    this.analyser = this.ctx?.createAnalyser()
    this.analyser.fftSize = FFT_SIZE
    this.gain = this.ctx?.createGain()
    if (this.analyser && this.gain) {
      this.analyser.connect(this.gain)
      this.gain.connect(this.ctx.destination)
    }
    this.apply()
  }

  feed(pcm) {
    if (!this.ctx) return
    this.buffer.push(pcm)
    this._schedule()
  }

  _schedule() {
    const ctx = this.ctx
    if (!ctx || this.buffer.length === 0) return
    const now = ctx.currentTime
    if (this.nextTime < now) this.nextTime = now + 0.01
    while (this.buffer.length && this.nextTime < now + 0.5) {
      const data = this.buffer.shift()
      const ab = ctx.createBuffer(1, data.length, this.sampleRate)
      ab.getChannelData(0).set(data)
      const src = ctx.createBufferSource()
      src.buffer = ab
      src.connect(this.analyser)
      src.start(this.nextTime)
      this.nextTime += ab.duration
    }
  }

  update(delta) {
    if (!this.analyser) return
    if (this.buffer.length > 0) this.speakingTimer = DEBOUNCE
    else this.speakingTimer = Math.max(0, this.speakingTimer - delta)
    const speaking = this.speakingTimer > 0
    if (speaking !== this.speaking) {
      this.speaking = speaking
      this.player.setSpeaking(speaking)
      this.world.livekit.emit('speaking', { playerId: this.playerId, speaking })
    }
  }

  setLevel(level) { this.level = level; this.apply() }
  setMuted(muted) { this.muted = muted; this.apply() }

  apply() {
    if (!this.gain) return
    this.gain.gain.value = (this.muted || this.level === 'disabled') ? 0 : 1
  }

  destroy() {
    this.buffer = []
    this.player.setSpeaking(false)
    this.world.livekit.emit('speaking', { playerId: this.playerId, speaking: false })
  }
}
