# Hyperfy Testing Checklist

**Covers: XR, Animations, Onchain (Dojo/EVM), General Functionality**

## Pre-Deployment Checklist

### Build Verification
```bash
# Run these before building Docker image
npm run lint          # Check for code issues
npm run build         # Verify production build succeeds
npm run world:clean   # Clean unused assets
```

### Docker Build Optimizations
```dockerfile
# Add to Dockerfile for XR testing
ENV NODE_ENV=production
ENV XR_DEBUG=true
ENV XR_SIMULATOR=false
EXPOSE 8080 9229  # Add debug port
```

---

## Docker Deployment Test Protocol

### Phase 1: Container Health (5 minutes)
```bash
# After deployment
docker ps                    # Container running?
docker logs -f <container>   # No errors?
curl http://localhost:8080   # Server responding?
```

### Phase 2: Basic Functionality (10 minutes)
1. **Access the world** - Can you connect?
2. **Desktop test** - Mouse/touch grabbing works?
3. **No XR errors in console** - Check browser dev tools
4. **Performance baseline** - FPS counter visible?

### Phase 3: XR Device Testing (20 minutes)

#### Test 1: Controller Detection
```javascript
// Run in browser console
world.controls.controls.forEach(c => console.log(Object.keys(c.entries)))
```
**Expected**: See `xrLeftGrip`, `xrRightGrip`, etc.

#### Test 2: Pose Tracking
```javascript
// Check pose data
console.log(world.controls.controls[0].entries.xrLeftGripPose)
```
**Expected**: Position/rotation updating in real-time

#### Test 3: Grab Interaction
1. **Approach red cube** - Does it highlight/outline?
2. **Press grip button** - Does it attach to controller?
3. **Move controller** - Does object follow smoothly?
4. **Release grip** - Does it drop/snap?

#### Test 4: Snap Points
1. **Grab cube** - Hold it
2. **Move to snap point** - See visual feedback?
3. **Release near snap** - Does it snap in place?
4. **Check signal** - Did `puzzle:piece1-snapped` fire?

### Phase 3a: Animation System Testing (15 minutes)

#### Test 5: Additive Animation Loading
```javascript
// Test pistol animation loading
const player = world.getPlayer()
player.applyAdditiveAnimation('https://example.com/pistol-idle.hyp', {
  weight: 1.0,
  loop: true
})
```
**Expected**: Animation loads without errors, no console warnings

#### Test 6: No Double-Rotation Bug
1. **Equip pistol** - Play pistol idle animation
2. **Check spine rotation** - Should be natural, not over-rotated
3. **Check arm rotation** - Should match pistol pose, not doubled
4. **Move around** - Animations should blend smoothly

```javascript
// Check bone rotations
const player = world.getPlayer()
console.log('Spine rotation:', player.getBoneTransform('spine').rotation)
console.log('Left arm rotation:', player.getBoneTransform('left-arm').rotation)
```
**Expected**: Rotations look natural, no extreme values (>90° on any axis)

#### Test 7: Locomotion + Additive Blending
1. **Equip pistol** - Play pistol idle
2. **Walk forward** - Should blend walk + pistol
3. **Run** - Should blend run + pistol
4. **Check for clipping** - Arms shouldn't intersect body

**Expected**: Smooth transitions, no visual glitches, natural movement

#### Test 8: Animation Cleanup
```javascript
const player = world.getPlayer()
player.stopAdditiveAnimation('https://example.com/pistol-idle.hyp')
```
**Expected**: Animation fades out cleanly, returns to base locomotion

### Phase 3b: Onchain Features Testing (20 minutes)

#### Test 9: Dojo/Starknet Integration
```javascript
// Check Dojo system is available
console.log('Dojo available:', !!world.dojo)
console.log('World address:', world.dojo.worldAddress)
```
**Expected**: Dojo system initialized, world address logged

#### Test 10: Player Starknet Address
```javascript
const player = world.getPlayer()
console.log('Starknet address:', player.starknet)
```
**Expected**: Returns valid Starknet address format (0x...)

#### Test 11: Dojo Entity Queries
```javascript
// Query player position from Dojo
const position = await world.dojo.getPosition(player.starknet)
console.log('Player position:', position)
```
**Expected**: Returns position data or null if not found

#### Test 12: EVM Integration
```javascript
// Check EVM system is available
console.log('EVM available:', !!world.evm)
console.log('EVM actions:', Object.keys(world.evm.actions || {}))
```
**Expected**: EVM system initialized, wagmi actions available

#### Test 13: Player EVM Address
```javascript
const player = world.getPlayer()
console.log('EVM address:', player.evm)
```
**Expected**: Returns valid Ethereum address format (0x...) or null if not connected

#### Test 14: EVM Wallet Connection
```javascript
const player = world.getPlayer()
await player.connect() // Trigger wallet connection
console.log('Connected:', player.evm)
```
**Expected**: MetaMask/Wallet popup appears, address available after connection

#### Test 15: Contract Read (EVM)
```javascript
// Read token balance
const balance = await world.evm.actions.readContract({
  address: '0x...', // Test token address
  abi: world.evm.abis.erc20,
  functionName: 'balanceOf',
  args: [player.evm]
})
console.log('Token balance:', balance)
```
**Expected**: Returns balance data without errors

#### Test 16: Onchain + Animation Integration
1. **Connect EVM wallet** - Get player.evm address
2. **Equip NFT-based item** - Use NFT ownership to unlock item
3. **Play animation** - Should work with onchain verification
4. **Check both systems work** - No conflicts between Dojo and EVM

```javascript
// Example: NFT-gated pistol
const hasNFT = await checkNFTOwnership(player.evm, '0x...')
if (hasNFT) {
  player.applyAdditiveAnimation('https://example.com/pistol.hyp')
}
```
**Expected**: Onchain data correctly gates/triggers animations

### Phase 4: Stress Testing (15 minutes)
1. **Rapid grab/release** - 20 times fast
2. **Both controllers** - Grab with both hands simultaneously
3. **Multiple objects** - Grab 3+ objects at once
4. **Long session** - 10 minutes continuous use
5. **Animation stress** - Rapidly equip/unequip items 20 times
6. **Onchain stress** - Rapid wallet connections/disconnections
7. **Combined stress** - Grab objects while animations are playing

#### Test 17: Animation Stress Test
```javascript
// Rapidly switch animations
for (let i = 0; i < 20; i++) {
  player.applyAdditiveAnimation('https://example.com/pistol.hyp')
  await new Promise(r => setTimeout(r, 100))
  player.stopAdditiveAnimation('https://example.com/pistol.hyp')
  await new Promise(r => setTimeout(r, 100))
}
```
**Expected**: No memory leaks, no console errors, smooth performance

#### Test 18: Onchain Stress Test
```javascript
// Rapid wallet operations
for (let i = 0; i < 10; i++) {
  await player.connect()
  await new Promise(r => setTimeout(r, 500))
  player.disconnect()
  await new Promise(r => setTimeout(r, 500))
}
```
**Expected**: Clean connections, no hanging promises, no errors

#### Test 19: Combined Stress
1. **Grab object** - Hold it
2. **Equip item** - Play animation while holding
3. **Check wallet** - Query onchain data
4. **Rapid switches** - All systems active simultaneously

**Expected**: No system conflicts, stable FPS, all features work together

---

## Test Results Template

Copy this and fill it out:

```markdown
## Test Results - [Date]

### Environment
- Device: [Quest 2/3, Pico, etc.]
- Browser: [Chrome, Firefox, etc.]
- Connection: [Local/Docker/Remote]
- Build: [Commit hash]

### Phase 1: Container Health
- [ ] Container running
- [ ] No crash loops
- [ ] Logs clean
- [ ] Server responding

### Phase 2: Desktop
- [ ] Can connect to world
- [ ] Mouse grab works
- [ ] Touch grab works
- [ ] FPS: [number]

### Phase 3: XR
#### Controller Detection
- Left controller detected: [Yes/No]
- Right controller detected: [Yes/No]
- Poses updating: [Yes/No]

#### Grab Interaction
- [ ] Object highlights on approach
- [ ] Grip button grabs object
- [ ] Object follows controller
- [ ] Release drops object
- [ ] Smooth movement (no jitter)

#### Snap Points
- [ ] Visual feedback near snap points
- [ ] Snaps when released nearby
- [ ] Signals fire correctly
- [ ] Rigidbody changes type

### Phase 3a: Animation System
- [ ] Additive animations load without errors
- [ ] No double-rotation on spine/arms
- [ ] Pistol pose looks natural
- [ ] Walk + pistol blend smoothly
- [ ] Run + pistol blend smoothly
- [ ] Animation cleanup works
- [ ] No console warnings

### Phase 3b: Onchain Features
- [ ] Dojo system available (`world.dojo`)
- [ ] EVM system available (`world.evm`)
- [ ] Player Starknet address accessible
- [ ] Player EVM address accessible
- [ ] EVM wallet connects successfully
- [ ] Contract reads work
- [ ] Onchain + animation integration works
- [ ] No conflicts between Dojo and EVM

### Phase 4: Stress
- [ ] Rapid grab/release stable
- [ ] Both controllers work
- [ ] Multiple objects stable
- [ ] 10min session comfortable
- [ ] Rapid animation switches stable
- [ ] Rapid wallet connections stable
- [ ] Combined systems stress test passes

### Issues Found
1. [Description]
2. [Description]

### Console Errors
```
Paste any errors here
```

### Animation Issues
- Double-rotation observed: [Yes/No]
- Unnatural poses: [Yes/No]
- Animation loading errors: [Yes/No]
- Blend issues: [Yes/No]

### Onchain Issues
- Dojo connection errors: [Yes/No]
- EVM connection errors: [Yes/No]
- Wallet connection failures: [Yes/No]
- Contract read errors: [Yes/No]
- Dojo/EVM conflicts: [Yes/No]

### Performance
- Average FPS: [number]
- Dropped frames: [number]
- Any stuttering: [Yes/No]
- Animation performance: [Good/Acceptable/Poor]
- Onchain query performance: [Good/Acceptable/Poor]

### Comfort
- Motion sickness: [None/Slight/Moderate/Severe]
- Eye strain: [None/Slight/Moderate/Severe]
- Controller fatigue: [None/Slight/Moderate/Severe]

### Overall
- Grade: [A/B/C/D/F]
- Blockers: [List anything preventing use]
- Ready for others to test: [Yes/No]
```

---

## Automated Test Suite (Add Later)

```javascript
// test/xr/grabbable.test.js
describe('XR Grabbable', () => {
  it('detects controllers on connect', async () => {
    // Simulate XR session start
    // Verify controller entries exist
  })
  
  it('grabs on grip press', async () => {
    // Mock grip button press
    // Verify object attaches to controller pose
  })
  
  it('releases on grip release', async () => {
    // Mock grip button release
    // Verify object drops/snap
  })
  
  it('respects grab distance', async () => {
    // Place object far away
    // Press grip
    // Verify no grab occurs
  })
})
```

---

## Quick Debug Commands

Run these in browser console when testing:

```javascript
// Check XR support
console.log('XR Supported:', !!navigator.xr)
console.log('Session:', world.controls.xrSession)

// Force XR mode for testing
world.controls.simulateXRSession()

// Visualize grab ranges
world.entities.forEach(e => {
  if (e.name === 'grabbable') {
    // Add debug sphere
  }
})

// Log all button states
setInterval(() => {
  console.log('Left Grip:', world.controls.controls[0].entries.xrLeftGrip)
}, 1000)

// Check animation systems
console.log('Player avatar:', world.entities.player.avatar)
console.log('Additive anims:', world.entities.player.avatar?.instance?.currentAdditiveAnims)

// Check onchain systems
console.log('Dojo available:', !!world.dojo)
console.log('EVM available:', !!world.evm)
console.log('Player Starknet:', world.entities.player.starknet)
console.log('Player EVM:', world.entities.player.evm)

// Test animation loading
world.entities.player.applyAdditiveAnimation('https://example.com/test.hyp')

// Test EVM connection
world.entities.player.connect()
```

---

## Red Flags to Watch For

**Critical Issues** (Stop testing, report immediately):
- Crash on XR session start
- No controller detection
- Extreme lag (>500ms)
- Motion sickness within 1 minute

**Major Issues** (Note but continue):
- Jittery tracking
- Grab unreliability (>20% failure rate)
- Visual glitches
- Audio problems

**Minor Issues** (Log for later):
- Slight lag
- Occasional missed grabs
- Minor visual artifacts

---

## Performance Targets

| Metric | Minimum | Target | Ideal |
|--------|---------|--------|-------|
| FPS | 60 | 72 | 90+ |
| Frame Time | 16.6ms | 13.8ms | 11.1ms |
| Input Lag | 100ms | 50ms | 20ms |
| Tracking Loss | <5% | <1% | 0% |

---

## Next Steps After Testing

Based on your test results:

**If everything works**:
- Share test world with others
- Create video demo
- Write "Building XR Apps" guide

**If minor issues**:
- Fix bugs iteratively
- You test each fix
- Regress until smooth

**If major issues**:
- Revert to stable version
- Debug in small pieces
- Focus on one issue at a time

**If critical issues**:
- Emergency fix session
- Pair debug with screen share
- Priority on stability

---

## Communication Plan

**During Testing**:
- Use Discord/Slack for real-time issues
- Screenshot/video problems
- Share console logs
- Quick "works/doesn't work" updates

**After Testing**:
- Fill out full results template
- File GitHub issues for bugs
- Document unexpected behaviors
- Suggest improvements

---

## Quick Start Testing Command

```bash
# One-liner to test everything
git pull && npm run build && docker build -t hyperfy-xr-test . && docker run -p 8080:8080 hyperfy-xr-test
```

Then open browser on your XR device and test!

---

**Ready to deploy and test?** The checklist is ready to use.
