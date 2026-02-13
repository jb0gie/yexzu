import * as THREE from '../extras/three'

import { System } from './System'

export class AudioReactivity extends System {
  constructor(world) {
    super(world)
    this.analysers = new Map()
    this.data = new Map()
    this.reactive = new Map()
    this.pendingLinks = new Map() // Links to sources that don't exist yet
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

      // Process any pending links for this source
      this.processPendingLinks(nodeId)
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

      // Process any pending links for this source
      this.processPendingLinks(nodeId)
    } catch (err) {
      console.error('[AudioReactivity] Failed to register media element:', err)
    }
  }

  unregister(nodeId) {
    this.analysers.delete(nodeId)
    this.data.delete(nodeId)

    // Clear active links
    const targets = this.reactive.get(nodeId)
    if (targets) {
      for (const target of targets) {
        delete target.target._audioReactivityLink
      }
      this.reactive.delete(nodeId)
    }

    // Clear pending links
    const pending = this.pendingLinks.get(nodeId)
    if (pending) {
      for (const link of pending) {
        delete link.target._audioReactivityLink
      }
      this.pendingLinks.delete(nodeId)
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
      intensity: options.intensity ?? 1,
      property: options.property || 'intensity',
      targetType: options.targetType || 'light',
      color: options.color,
      from: options.from,
      to: options.to
    }

    // If source doesn't exist yet, queue as pending
    if (!this.data.has(sourceId)) {
      let pending = this.pendingLinks.get(sourceId)
      if (!pending) {
        pending = []
        this.pendingLinks.set(sourceId, pending)
      }
      pending.push(link)
    } else {
      // Source exists, add to active reactive map
      let targets = this.reactive.get(sourceId)
      if (!targets) {
        targets = new Set()
        this.reactive.set(sourceId, targets)
      }
      targets.add(link)
    }

    target._audioReactivityLink = link
  }

  unlink(target) {
    if (!target || !target._audioReactivityLink) return

    const link = target._audioReactivityLink

    // Remove from active reactive map
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

    // Also remove from pending links if present
    const pending = this.pendingLinks.get(link.sourceId)
    if (pending) {
      const idx = pending.indexOf(link)
      if (idx !== -1) {
        pending.splice(idx, 1)
        if (pending.length === 0) {
          this.pendingLinks.delete(link.sourceId)
        }
      }
    }

    delete target._audioReactivityLink
  }

  processPendingLinks(sourceId) {
    const pending = this.pendingLinks.get(sourceId)
    if (!pending) return

    // Move pending links to active reactive map
    let targets = this.reactive.get(sourceId)
    if (!targets) {
      targets = new Set()
      this.reactive.set(sourceId, targets)
    }

    for (const link of pending) {
      targets.add(link)
    }

    this.pendingLinks.delete(sourceId)
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
            // Mesh nodes (from GLB) should use material proxy directly
            // because they don't have uberShader enabled
            if (target.name === 'mesh' && target.handle.material) {
              target.handle.material.emissiveIntensity = val
            }
            // Prim nodes have setEmissiveIntensity method with uberShader
            else if (target.handle.setEmissiveIntensity) {
              target.handle.setEmissiveIntensity(val)
            }
          } else if (link.property === 'emissive' && target.handle) {
            const intensity = Math.min(1, val)
            // Mesh nodes (from GLB) should use material proxy directly
            if (target.name === 'mesh' && target.handle.material) {
              target.handle.material.emissive.setScalar(intensity)
            }
            // Prim nodes have setEmissive method with uberShader
            else if (target.handle.setEmissive) {
              target.handle.setEmissive(intensity, intensity, intensity)
            }
          } else if (link.property === 'emissiveColor' && target.handle) {
            // Only change emissive color, NOT intensity (use emissiveIntensity for that)
            // Normalize val to 0-1 for color selection
            const normalizedVal = Math.min(1, val / Math.max(1, link.scale))
            const color = this.getColorFromOptions(normalizedVal, link)

            // Mesh nodes (from GLB) should use material proxy directly
            if (target.name === 'mesh' && target.handle.material) {
              target.handle.material.emissive = [color.r, color.g, color.b]
            }
            // Prim nodes have setter methods with uberShader
            else if (target.handle.setEmissive) {
              target.handle.setEmissive(color.r, color.g, color.b)
            }
          } else if (link.property === 'color' && target.handle) {
            // val is already scaled, normalize for color (0-1 range)
            const normalizedVal = Math.min(1, val / link.scale)
            const color = this.getColorFromOptions(normalizedVal, link)
            const emissiveIntensity = Math.max(0, Math.min(1, val * link.intensity))

            // Mesh nodes (from GLB) should use material proxy directly
            if (target.name === 'mesh' && target.handle.material) {
              // Change base color
              if (target.handle.material.color) {
                target.handle.material.color.copy(color)
              }
              // Set emissive color via proxy (uses array format [r,g,b])
              target.handle.material.emissive = [color.r, color.g, color.b]
              target.handle.material.emissiveIntensity = emissiveIntensity
            }
            // Prim nodes have setter methods with uberShader
            else if (target.handle.setColor) {
              target.handle.setColor(color.r, color.g, color.b)
              target.handle.setEmissive(color.r, color.g, color.b)
              target.handle.setEmissiveIntensity(emissiveIntensity)
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

  getHeatmapColor(value) {
    const color = new THREE.Color()
    const scaled = Math.max(0, Math.min(1, value))

    if (scaled < 0.25) {
      const t = scaled / 0.25
      color.setRGB(0, t, 1)
    } else if (scaled < 0.5) {
      const t = (scaled - 0.25) / 0.25
      color.setRGB(0, 1, 1 - t)
    } else if (scaled < 0.75) {
      const t = (scaled - 0.5) / 0.25
      color.setRGB(t, 1, 0)
    } else {
      const t = (scaled - 0.75) / 0.25
      color.setRGB(1, 1 - t, 0)
    }

    return color
  }

  getColorFromOptions(val, options) {
    // If from/to colors provided, interpolate between them
    if (options.from && options.to) {
      const fromColor = new THREE.Color(options.from)
      const toColor = new THREE.Color(options.to)
      const scaled = Math.max(0, Math.min(1, val))
      return fromColor.clone().lerp(toColor, scaled)
    }

    // If single color provided, use it directly
    if (options.color) {
      return new THREE.Color(options.color)
    }

    // Default: heatmap gradient
    return this.getHeatmapColor(val)
  }

  destroy() {
    this.analysers.clear()
    this.data.clear()
    this.reactive.clear()
    this.pendingLinks.clear()
  }
}
