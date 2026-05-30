# Add P2P Voice as Alternative to LiveKit

## Summary
Add serverless P2P WebRTC voice chat as an alternative to LiveKit. When `LIVEKIT_API_KEY` is set, use LiveKit (existing behavior). When not set, use P2P mesh voice (free, no keys).

## Architecture

Both backends share the same `world.livekit.*` API. A thin `ClientVoiceProvider` adapter selects the backend at `deserialize()` time based on `voiceType` in the snapshot.

```
Server config: LIVEKIT_API_KEY set? → ServerLiveKit : ServerP2PVoice
Snapshot includes: voiceType: 'livekit' | 'p2p'
Client: ClientVoiceProvider.deserialize() reads voiceType → initializes correct backend
```

## Files to create/modify

### 1. `src/core/packets.js` — Add 5 new packet names
Insert after `'pong'`:
```js
'voiceOffer',
'voiceAnswer',
'voiceIce',
'voicePeerJoined',
'voicePeerLeft',
```

### 2. NEW: `src/core/systems/ServerP2PVoice.js`
Same API surface as `ServerLiveKit`:
- `constructor(world)` — tracks voice peers, levels, mutes, modifiers
- `serialize(playerId)` — returns `{ type: 'p2p', peers: [...], levels, muted }`
- `setMuted(playerId, muted)` — sends `mute` packet to all
- `addModifier/updateModifier/removeModifier/clearModifiers` — same level priority logic
- `checkLevel(playerId)` — same priority logic, sends `liveKitLevel` packet
- `addPeer(playerId, name) / removePeer(playerId)` — notifies all via `voicePeerJoined`/`voicePeerLeft`
- `getPeers()` — returns current peers list
- `getPeersFor(playerId)` — returns peers visible to this player (all except self)

### 3. NEW: `src/core/systems/ClientP2PVoice.js`
WebRTC mesh voice client. Same public API as `ClientLiveKit`:
- **Mic**: `getUserMedia` → local stream via `RTCPeerConnection.addTrack()`
- **WebRTC**: Full mesh — each peer connects to every other via `RTCPeerConnection`
- **Signaling**: SDP offers/answers + ICE candidates relayed through Hyperfy WebSocket
- **Spatial audio**: Same `PlayerVoice` pattern (PannerNode + GainNode) from LiveKit
- **Speaking detection**: `AnalyserNode` on received audio → `setSpeaking(bool)`
- **Late update**: Same spatial position tracking
- **Events**: `status`, `speaking`, `muted` — same as `ClientLiveKit`

Signaling flow:
1. Snapshot arrives → server sends `voiceConfig` with `voiceType: 'p2p'` + peer list
2. For each remote peer, create `RTCPeerConnection`:
   - Send `voiceOffer` to server → server relays `voiceOffer` to target
   - Receive `voiceAnswer` from server → set remote description
   - Exchange `voiceIce` candidates bidirectionally
3. On `voicePeerJoined` → initiate connection to new peer
4. On `voicePeerLeft` → close connection, destroy voice instance

### 4. NEW: `src/core/systems/ClientVoiceProvider.js`
Thin adapter that wraps both backends:

```js
class ClientVoiceProvider extends System {
  deserialize(opts) {
    if (!opts) return
    if (opts.type === 'p2p') {
      this.backend = new ClientP2PVoice(this.world)
      this.backend.deserialize(opts)
    } else {
      this.backend = new ClientLiveKit(this.world)
      this.backend.deserialize(opts)
    }
    // Copy status, events
    this.backend.on('status', data => this.emit('status', data))
    this.backend.on('speaking', data => this.emit('speaking', data))
    this.backend.on('muted', data => this.emit('muted', data))
  }
  // Proxy all public methods to backend
  get status() { return this.backend?.status }
  setMuted(...args) { this.backend?.setMuted(...args) }
  isMuted(...args) { return this.backend?.isMuted(...args) }
  setLevel(...args) { this.backend?.setLevel(...args) }
  setMicrophoneEnabled(...args) { this.backend?.setMicrophoneEnabled(...args) }
  addModifier(...args) { return this.backend?.addModifier(...args) }
  removeModifier(...args) { return this.backend?.removeModifier(...args) }
  updateModifier(...args) { return this.backend?.updateModifier(...args) }
  setScreenShareTarget(...args) { this.backend?.setScreenShareTarget(...args) }
  registerScreenNode(...args) { return this.backend?.registerScreenNode(...args) }
  unregisterScreenNode(...args) { this.backend?.unregisterScreenNode(...args) }
  lateUpdate(delta) { this.backend?.lateUpdate(delta) }
  destroy() { this.backend?.destroy() }
  start() { /* defer to deserialize */ }
}
```

### 5. `src/core/createServerWorld.js`
Replace hardcoded `ServerLiveKit` with conditional:

```js
import { ServerLiveKit } from './systems/ServerLiveKit'
import { ServerP2PVoice } from './systems/ServerP2PVoice'

// In createServerWorld():
world.register('livekit', process.env.LIVEKIT_API_KEY ? ServerLiveKit : ServerP2PVoice)
```

### 6. `src/core/createClientWorld.js`
Replace `ClientLiveKit` with `ClientVoiceProvider`:

```js
import { ClientVoiceProvider } from './systems/ClientVoiceProvider'
// Replace: world.register('livekit', ClientLiveKit)
world.register('livekit', ClientVoiceProvider)
```

### 7. `src/core/systems/ClientNetwork.js`
Add handler for voice signaling relay packets. Add to the packet handlers:

```js
onVoiceOffer = data => {
  this.world.livekit.handleOffer(data)
}
onVoiceAnswer = data => {
  this.world.livekit.handleAnswer(data)
}
onVoiceIce = data => {
  this.world.livekit.handleIce(data)
}
onVoicePeerJoined = data => {
  this.world.livekit.handlePeerJoined(data)
}
onVoicePeerLeft = data => {
  this.world.livekit.handlePeerLeft(data)
}
```

Also replace `onLiveKitLevel` and `onMute` references — these still go through `world.livekit.setLevel/setMuted` so no changes needed.

### 8. `src/core/systems/ServerNetwork.js`
Add signaling relay handlers. In the `flush()` dispatcher, add:

```js
onVoiceOffer = (socket, data) => {
  this.sendTo(data.toId, 'voiceOffer', { fromId: socket.id, offer: data.offer })
}
onVoiceAnswer = (socket, data) => {
  this.sendTo(data.toId, 'voiceAnswer', { fromId: socket.id, answer: data.answer })
}
onVoiceIce = (socket, data) => {
  this.sendTo(data.toId, 'voiceIce', { fromId: socket.id, candidate: data.candidate })
}
```

Also on disconnect, call `this.world.livekit.removePeer(socket.id)` for P2P mode.

## VRM Expression Chain (unchanged)
```
ClientP2PVoice → player.setSpeaking(bool)
  → AvatarNode.setSpeaking(active)
    → createVRMFactory.setSpeaking(value)
      → updateMouth(delta, talking) — viseme cycle
```
No changes needed. The VRM expression system is fully decoupled from the voice backend.

## Files that need NO changes
- `Sidebar.js` — uses `world.livekit.status`, `.on('status')`, `.on('speaking')`, `.on('muted')`, `.setMicrophoneEnabled()` — same API
- `PlayerLocal.js`, `PlayerRemote.js` — uses `world.livekit.isMuted()` — same API
- `createPlayerProxy.js` — uses `world.livekit.addModifier/removeModifier/updateModifier/setScreenShareTarget` — same API
- `Video.js` — uses `world.livekit.registerScreenNode/unregisterScreenNode` — same API
- `CoreUI.js` — commented out references only
- `package.json` — keep `livekit-client` and `livekit-server-sdk`

## Testing
1. Start server without `LIVEKIT_API_KEY` → P2P voice should activate
2. Connect two clients → WebRTC mesh should establish between them
3. Verify microphone → other client hears audio
4. Verify spatial audio (mute/setLevel/spatial positioning)
5. Verify VRM mouth movement when speaking
6. Verify mute/modifier/admin controls
7. Start server WITH `LIVEKIT_API_KEY` → LiveKit should work as before
