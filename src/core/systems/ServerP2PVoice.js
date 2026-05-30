import { System } from './System'

const levels = ['disabled', 'spatial', 'global']
const levelPriorities = {
  disabled: 1,
  spatial: 2,
  global: 3,
}

export class ServerP2PVoice extends System {
  constructor(world) {
    super(world)
    this.peers = new Map() // playerId -> { id, name }
    this.modifiers = {}
    this.levels = {}
    this.muted = new Set()
  }

  async serialize(playerId) {
    return {
      type: 'p2p',
      peers: this.getPeersFor(playerId),
      levels: this.levels,
      muted: Array.from(this.muted),
    }
  }

  setMuted(playerId, muted) {
    if (muted && !this.muted.has(playerId)) {
      this.muted.add(playerId)
      this.world.network.send('mute', { playerId, muted })
      return
    }
    if (!muted && this.muted.has(playerId)) {
      this.muted.delete(playerId)
      this.world.network.send('mute', { playerId, muted })
    }
  }

  addModifier(playerId, level) {
    if (!levels.includes(level)) return console.error(`[p2pvoice] invalid level: ${level}`)
    let modifiers = this.modifiers[playerId]
    if (!modifiers) {
      modifiers = new Set()
      this.modifiers[playerId] = modifiers
    }
    const mod = { playerId, level }
    modifiers.add(mod)
    this.checkLevel(playerId)
    return mod
  }

  updateModifier(mod, level) {
    if (!levels.includes(level)) return console.error(`[p2pvoice] invalid level: ${level}`)
    const playerId = mod.playerId
    const modifiers = this.modifiers[playerId]
    if (!modifiers) return
    if (!modifiers.has(mod)) return console.error('updateModifier: mod not found')
    mod.level = level
    this.checkLevel(playerId)
    return mod
  }

  removeModifier(mod) {
    const playerId = mod.playerId
    const modifiers = this.modifiers[playerId]
    if (!modifiers) return
    modifiers.delete(mod)
    this.checkLevel(playerId)
    return null
  }

  clearModifiers(playerId) {
    delete this.modifiers[playerId]
    this.checkLevel(playerId)
  }

  checkLevel(playerId) {
    const modifiers = this.modifiers[playerId]
    let level = null
    if (modifiers) {
      for (const mod of modifiers) {
        const currPriority = levelPriorities[level] || 0
        const modPriority = levelPriorities[mod.level]
        if (modPriority > currPriority) {
          level = mod.level
        }
      }
    }
    if (this.levels[playerId] === level) return
    this.levels[playerId] = level
    this.world.network.send('liveKitLevel', { playerId, level })
  }

  addPeer(playerId, name) {
    this.peers.set(playerId, { id: playerId, name })
    this.world.network.send('voicePeerJoined', { peerId: playerId, peerName: name }, playerId)
  }

  removePeer(playerId) {
    this.peers.delete(playerId)
    this.world.network.send('voicePeerLeft', { peerId: playerId }, playerId)
  }

  getPeers() {
    return Array.from(this.peers.values())
  }

  getPeersFor(playerId) {
    return this.getPeers().filter(p => p.id !== playerId)
  }
}
