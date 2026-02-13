import { System } from './System'

export class AudioReactivity extends System {
  constructor(world) {
    super(world)
    this.analysers = new Map()
    this.data = new Map()
    this.reactive = new Map()
    this.smoothing = 0.6
  }

  async init() {
  }

  start() {
  }

  registerAudioNode(nodeId, audioNode) {
    if (typeof window === 'undefined') return
    if (!audioNode) return

    const audio = this.world.audio
    if (!audio || !audio.ctx) return

    try {
      const analyser = audio.ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8

      audioNode.connect(analyser)

      this.analysers.set(nodeId, analyser)
      this.data.set(nodeId, {
        volume: 0,
        bass: 0,
        mid: 0,
        treble: 0,
        raw: new Uint8Array(128),
        prevVolume: 0
      })
    } catch (err) {
      console.error('[AudioReactivity] Failed to register audio node:', err)
    }
  }

  registerMediaElement(nodeId, mediaElement) {
    if (typeof window === 'undefined') return
    if (!mediaElement) return

    const audio = this.world.audio
    if (!audio || !audio.ctx) return

    try {
      const source = audio.ctx.createMediaElementSource(mediaElement)
      const analyser = audio.ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8

      source.connect(analyser)

      this.analysers.set(nodeId, analyser)
      this.data.set(nodeId, {
        volume: 0,
        bass: 0,
        mid: 0,
        treble: 0,
        raw: new Uint8Array(128),
        prevVolume: 0
      })
    } catch (err) {
      console.error('[AudioReactivity] Failed to register media element:', err)
    }
  }

  unregister(nodeId) {
    this.analysers.delete(nodeId)
    this.data.delete(nodeId)

    const targets = this.reactive.get(nodeId)
    if (targets) {
      for (const target of targets) {
        this.unlink(target.target)
      }
      this.reactive.delete(nodeId)
    }
  }

  link(target, sourceId, options = {}) {
    if (!target) return

    const link = {
      target,
      sourceId,
      band: options.band || 'volume',
      scale: options.scale ?? 1,
      offset: options.offset ?? 0,
      property: options.property || 'intensity',
      targetType: options.targetType || 'light'
    }

    let targets = this.reactive.get(sourceId)
    if (!targets) {
      targets = new Set()
      this.reactive.set(sourceId, targets)
    }
    targets.add(link)

    target._audioReactivityLink = link
  }

  unlink(target) {
    if (!target || !target._audioReactivityLink) return

    const link = target._audioReactivityLink
    const targets = this.reactive.get(link.sourceId)
    if (targets) {
      for (const t of targets) {
        if (t.target === target) {
          targets.delete(t)
          break
        }
      }
      if (targets.size === 0) {
        this.reactive.delete(link.sourceId)
      }
    }

    delete target._audioReactivityLink
  }

  update(delta) {
    if (typeof window === 'undefined') return

    for (const [nodeId, analyser] of this.analysers) {
      const freq = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(freq)

      const d = this.data.get(nodeId)
      if (!d) continue

      d.raw = freq

      const avg = freq.reduce((a, b) => a + b, 0) / freq.length / 255
      d.volume = d.prevVolume * this.smoothing + avg * (1 - this.smoothing)
      d.prevVolume = d.volume

      d.bass = freq.slice(0, 10).reduce((a, b) => a + b, 0) / 10 / 255
      d.mid = freq.slice(10, 40).reduce((a, b) => a + b, 0) / 30 / 255
      d.treble = freq.slice(40).reduce((a, b) => a + b, 0) / (freq.length - 40) / 255
    }

    for (const [sourceId, targets] of this.reactive) {
      const srcData = this.data.get(sourceId)
      if (!srcData) continue

      for (const link of targets) {
        let val = srcData[link.band] ?? srcData.volume
        val = Math.max(0, link.offset + val * link.scale)

        const target = link.target
        if (!target) continue

        if (link.targetType === 'light') {
          if (link.property === 'intensity' && target.light) {
            target.light.intensity = val
          }
        } else if (link.targetType === 'material') {
          if (link.property === 'emissiveIntensity' && target.handle) {
            // Prim nodes have setEmissiveIntensity method
            if (target.handle.setEmissiveIntensity) {
              target.handle.setEmissiveIntensity(val)
            }
            // Mesh nodes have material.proxy with emissiveIntensity property
            else if (target.handle.material) {
              target.handle.material.emissiveIntensity = val
            }
          } else if (link.property === 'emissive' && target.handle) {
            const intensity = Math.min(1, val)
            // Prim nodes have setEmissive method
            if (target.handle.setEmissive) {
              target.handle.setEmissive(intensity, intensity, intensity)
            }
            // Mesh nodes have material.proxy with emissive property
            else if (target.handle.material) {
              target.handle.material.emissive.setScalar(intensity)
            }
          }
        }
      }
    }
  }

  getBands(nodeId) {
    return this.data.get(nodeId) || null
  }

  getMediaNodes() {
    const nodes = []
    for (const [id, data] of this.data) {
      nodes.push({ id, ...data })
    }
    return nodes
  }

  destroy() {
    this.analysers.clear()
    this.data.clear()
    this.reactive.clear()
  }
}
