/* global AudioEncoder, AudioDecoder, AudioData, EncodedAudioChunk */

import * as THREE from '../extras/three'
import { System } from './System'
import { isBoolean } from 'lodash-es'

const THRESHOLD = 0.025
const DEBOUNCE = 0.3
const FFT_SIZE = 4096
const HEAD_HEIGHT = 1.6

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: { ideal: 1 },
}

const v1 = new THREE.Vector3()
const v2 = new THREE.Vector3()
const q1 = new THREE.Quaternion()

const webCodecsAvailable =
  typeof AudioEncoder !== 'undefined' && typeof AudioDecoder !== 'undefined'

const CAPTURE_WORKLET = URL.createObjectURL(
  new Blob(
    [
      `class CaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]
    if (input && input[0]) {
      this.port.postMessage(
        { pcm: input[0].buffer },
        [input[0].buffer]
      )
    }
    return true
  }
}
registerProcessor('capture-processor', CaptureProcessor)`,
    ],
    { type: 'application/javascript' }
  )
)

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
    this.remoteVoices = new Map()
    this._encoder = null
    this._opusBuffer = new Uint8Array(FFT_SIZE)
    this._encodeTimestamp = 0
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
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
      })
      this.localStream.getAudioTracks().forEach(t => { t.enabled = false })
      this.world.audio.ready(() => this._initLocal())
    } catch (err) {
      console.error('[p2pvoice] mic failed:', err.message)
    }
    this.emit('status', this.status)
    this.status.connected = true
    this.emit('status', this.status)
  }

  async _initLocal() {
    const ctx = this.world.audio.ctx
    if (!ctx) return
    this._sampleRate = ctx.sampleRate
    this._encodeTimestamp = 0
    const source = ctx.createMediaStreamSource(this.localStream)
    this.localPCM = new Float32Array(FFT_SIZE)

    if (webCodecsAvailable) {
      this._initEncoder()
      try {
        await ctx.audioWorklet.addModule(CAPTURE_WORKLET)
        const workletNode = new AudioWorkletNode(ctx, 'capture-processor')
        workletNode.port.onmessage = e => {
          this._onCaptureData(new Float32Array(e.data.pcm))
        }
        source.connect(workletNode)
        this._workletNode = workletNode
      } catch {
        this._fallbackCapture(source)
      }
    } else {
      this._fallbackCapture(source)
    }
  }

  _fallbackCapture(source) {
    const ctx = this.world.audio.ctx
    const processor = ctx.createScriptProcessor(FFT_SIZE, 1, 1)
    processor.onaudioprocess = e => {
      this._onCaptureData(e.inputBuffer.getChannelData(0))
    }
    this._scriptProcessor = processor
    source.connect(processor)
    const silence = ctx.createGain()
    silence.gain.value = 0
    processor.connect(silence)
    silence.connect(ctx.destination)
  }

  _onCaptureData(input) {
    this.localPCM.set(input)

    let sum = 0
    for (let i = 0; i < input.length; i++) {
      sum += input[i] * input[i]
    }
    const rms = Math.sqrt(sum / input.length)
    const delta = this.localDelta || 0.016

    if (rms > THRESHOLD) this.localTimer = DEBOUNCE
    else this.localTimer = Math.max(0, this.localTimer - delta)

    const speaking = this.localTimer > 0
    if (speaking !== this.localSpeaking) {
      this.localSpeaking = speaking
      this.world.entities.player?.setSpeaking(speaking)
      this.world.network.send('voiceSpeaking', { speaking })
      this.emit('speaking', { playerId: this.world.network.id, speaking })
    }

    if (speaking) {
      const frame = new Float32Array(input)
      this._sendAudio(frame)
    }
  }

  _initEncoder() {
    this._encoder = new AudioEncoder({
      output: chunk => {
        const size = chunk.byteLength
        chunk.copyTo(this._opusBuffer)
        const opusArray = new Uint8Array(this._opusBuffer.slice(0, size))
        this.world.network.send('voiceAudio', {
          opus: Array.from(opusArray),
          ts: chunk.timestamp,
          dur: chunk.duration,
        })
      },
      error: e => console.error('[p2pvoice] encode error:', e),
    })
    this._encoder.configure({
      codec: 'opus',
      sampleRate: this._sampleRate,
      numberOfChannels: 1,
      bitrate: 24000,
    })
  }

  _sendAudio(input) {
    if (this._encoder) {
      this._encodeOpus(input)
    } else {
      this.world.network.send('voiceAudio', { pcm: Array.from(input) })
    }
  }

  _encodeOpus(pcm) {
    if (!this._encoder) return
    const frame = new AudioData({
      format: 'f32',
      sampleRate: this._sampleRate,
      numberOfChannels: 1,
      numberOfFrames: pcm.length,
      data: pcm,
      timestamp: this._encodeTimestamp,
    })
    this._encoder.encode(frame)
    frame.close()
    this._encodeTimestamp += (pcm.length / this._sampleRate) * 1_000_000
  }

  lateUpdate(delta) {
    this.localDelta = delta
    this.remoteVoices.forEach(v => v.lateUpdate(delta))
  }

  handleSpeaking(data) {
    const { peerId, speaking } = data
    const player = this.world.entities.getPlayer(peerId)
    if (!player) return
    player.setSpeaking(speaking)
    this.emit('speaking', { playerId: peerId, speaking })
  }

  handleAudio(data) {
    const { peerId } = data
    let voice = this.remoteVoices.get(peerId)
    if (!voice) {
      const player = this.world.entities.getPlayer(peerId)
      if (!player) return
      const level = this.levels[peerId] || this.defaultLevel
      voice = new RemoteVoice(this.world, peerId, player, level, this.muted.has(peerId))
      this.remoteVoices.set(peerId, voice)
    }
    voice.feed(data)
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
    if (this._encoder) {
      this._encoder.close()
      this._encoder = null
    }
    if (this._workletNode) {
      this._workletNode.disconnect()
      this._workletNode = null
    }
    if (this._scriptProcessor) {
      this._scriptProcessor.disconnect()
      this._scriptProcessor = null
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop())
      this.localStream = null
    }
  }
}

class RingBuffer {
  constructor(capacity) {
    this.buffer = new Float32Array(capacity)
    this.capacity = capacity
    this.writePos = 0
    this.readPos = 0
    this.available = 0
  }

  write(samples) {
    for (let i = 0; i < samples.length; i++) {
      this.buffer[this.writePos] = samples[i]
      this.writePos = (this.writePos + 1) % this.capacity
      if (this.available < this.capacity) {
        this.available++
      } else {
        this.readPos = (this.readPos + 1) % this.capacity
      }
    }
  }

  read() {
    if (this.available === 0) return null
    const value = this.buffer[this.readPos]
    this.readPos = (this.readPos + 1) % this.capacity
    this.available--
    return value
  }

  reset() {
    this.writePos = 0
    this.readPos = 0
    this.available = 0
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
    this.ctx = world.audio.ctx
    this._sampleRate = this.ctx?.sampleRate || 48000
    this._decoder = null
    this._ringBuffer = null
    this._playbackProcessor = null

    this.analyser = this.ctx?.createAnalyser()
    this.analyser.fftSize = FFT_SIZE
    this.gain = this.ctx?.createGain()
    this.panner = this.ctx?.createPanner()

    if (this.panner) {
      this.panner.panningModel = 'HRTF'
      this.panner.distanceModel = 'inverse'
      this.panner.refDistance = 1
      this.panner.maxDistance = 40
      this.panner.rolloffFactor = 3
      this.panner.coneInnerAngle = 360
      this.panner.coneOuterAngle = 360
      this.panner.coneOuterGain = 0
    }

    if (this.analyser && this.gain && this.panner) {
      this.analyser.connect(this.gain)
      this.gain.connect(this.panner)
      this.panner.connect(this.ctx.destination)
    }

    this._initPlayback()
    this.apply()
  }

  _initPlayback() {
    if (!this.ctx) return
    this._ringBuffer = new RingBuffer(Math.ceil(this._sampleRate * 0.3))
    this._playbackProcessor = this.ctx.createScriptProcessor(FFT_SIZE, 0, 1)
    this._playbackProcessor.onaudioprocess = e => {
      const output = e.outputBuffer.getChannelData(0)
      for (let i = 0; i < output.length; i++) {
        const sample = this._ringBuffer.read()
        output[i] = sample !== null ? sample : 0
      }
    }
    this._playbackProcessor.connect(this.analyser)
  }

  feed(data) {
    if (data.opus) {
      this._feedOpus(data.opus, data.ts, data.dur)
    } else if (data.pcm) {
      this._ringBuffer.write(new Float32Array(data.pcm))
    }
  }

  _feedOpus(opusData, timestamp, duration) {
    if (!this._decoder) {
      if (!webCodecsAvailable) return
      this._initDecoder()
    }
    const chunk = new EncodedAudioChunk({
      type: 'key',
      timestamp,
      duration,
      data: new Uint8Array(opusData),
    })
    this._decoder.decode(chunk)
  }

  _initDecoder() {
    this._decoder = new AudioDecoder({
      output: audioData => {
        const pcm = new Float32Array(audioData.numberOfFrames)
        audioData.copyTo(pcm, { planeIndex: 0 })
        this._ringBuffer.write(pcm)
        audioData.close()
      },
      error: e => console.error('[p2pvoice] decode error:', e),
    })
    this._decoder.configure({
      codec: 'opus',
      sampleRate: this._sampleRate,
      numberOfChannels: 1,
    })
  }

  lateUpdate(delta) {
    if (!this.analyser) return
    if (this._ringBuffer && this._ringBuffer.available > 0) {
      this.speakingTimer = DEBOUNCE
    } else {
      this.speakingTimer = Math.max(0, this.speakingTimer - delta)
    }
    const speaking = this.speakingTimer > 0
    if (speaking !== this.speaking) {
      this.speaking = speaking
      this.player.setSpeaking(speaking)
      this.world.livekit.emit('speaking', { playerId: this.playerId, speaking })
    }

    if (this.level === 'spatial' && this.panner && this.player.base) {
      const matrix = this.player.base.matrixWorld
      const pos = v1.setFromMatrixPosition(matrix)
      pos.y += HEAD_HEIGHT
      const qua = q1.setFromRotationMatrix(matrix)
      const dir = v2.set(0, 0, -1).applyQuaternion(qua)
      const audio = this.world.audio
      if (this.panner.positionX) {
        const endTime = audio.ctx.currentTime + audio.lastDelta
        this.panner.positionX.linearRampToValueAtTime(pos.x, endTime)
        this.panner.positionY.linearRampToValueAtTime(pos.y, endTime)
        this.panner.positionZ.linearRampToValueAtTime(pos.z, endTime)
        this.panner.orientationX.linearRampToValueAtTime(dir.x, endTime)
        this.panner.orientationY.linearRampToValueAtTime(dir.y, endTime)
        this.panner.orientationZ.linearRampToValueAtTime(dir.z, endTime)
      } else {
        this.panner.setPosition(pos.x, pos.y, pos.z)
        this.panner.setOrientation(dir.x, dir.y, dir.z)
      }
    }
  }

  setLevel(level) { this.level = level; this.apply() }
  setMuted(muted) { this.muted = muted; this.apply() }

  apply() {
    if (!this.gain) return
    this.gain.gain.value = (this.muted || this.level === 'disabled') ? 0 : 1
  }

  destroy() {
    if (this._decoder) {
      this._decoder.close()
      this._decoder = null
    }
    if (this._playbackProcessor) {
      this._playbackProcessor.disconnect()
      this._playbackProcessor = null
    }
    if (this.panner) {
      this.panner.disconnect()
      this.panner = null
    }
    if (this.gain) {
      this.gain.disconnect()
      this.gain = null
    }
    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }
    if (this._ringBuffer) {
      this._ringBuffer.reset()
      this._ringBuffer = null
    }
    this.player.setSpeaking(false)
    this.world.livekit.emit('speaking', { playerId: this.playerId, speaking: false })
  }
}
