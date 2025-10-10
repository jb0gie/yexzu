# 💰 Coin Collector Game - Complete Example

A fully-functional blockchain game demonstrating Web3 integration in Hyperfy.

## Overview

**Coin Collector** is a 3D multiplayer game where:
- Players walk around collecting floating coins
- Coins respawn automatically across the map
- Collect enough coins to claim rewards on the StarkNet blockchain
- All transactions use Cartridge Controller for wallet management
- Session policies enable gasless, seamless gameplay

## Features

### Game Mechanics
- ✨ **3D Coin Collection**: Walk near coins to collect them automatically
- 🔄 **Auto-Respawn**: Coins respawn when collected or after timeout
- 📊 **Real-time Stats**: Track coins collected and rewards claimed
- 🏆 **On-chain Rewards**: Claim rewards as blockchain transactions
- 👥 **Multiplayer**: See other players' collections in real-time

### Technical Features
- ⚡ **Session Policies**: Gasless transactions for claiming rewards
- 🔒 **Wallet Integration**: Full Cartridge Controller integration
- 🌐 **Client-Server Sync**: Authoritative server with client prediction
- 🎮 **Smooth Animations**: Floating, spinning, pulsing coin effects
- 💾 **Persistent State**: Player stats tracked across sessions

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Deploy Smart Contract (Optional)

If you want on-chain functionality, deploy a simple reward contract to StarkNet:

```cairo
// Example StarkNet contract (Cairo)
#[starknet::interface]
trait IRewardContract {
    fn claim_reward(ref self: TContractState, amount: u256);
}

#[starknet::contract]
mod RewardContract {
    #[storage]
    struct Storage {
        rewards_claimed: LegacyMap<ContractAddress, u256>
    }

    #[abi(embed_v0)]
    impl RewardContract of super::IRewardContract {
        fn claim_reward(ref self: TContractState, amount: u256) {
            let caller = get_caller_address();
            let current = self.rewards_claimed.read(caller);
            self.rewards_claimed.write(caller, current + amount);
            // Emit event, mint NFT, etc.
        }
    }
}
```

### 3. Configure the App

1. Drop a GLB model into your Hyperfy world
2. Attach the `coin-collector-game.js` script
3. In the inspector, configure:
   - **Reward Contract Address**: Your deployed contract address
   - **Coins per Reward**: How many coins needed (default: 10)
   - **Spawn Radius**: Area where coins spawn (default: 20m)
   - **Max Active Coins**: Maximum coins at once (default: 15)
   - **Coin Color**: Customize coin appearance

### 4. Configure Session Policies (Recommended)

For seamless gameplay without wallet popups, configure session policies:

```javascript
// In your world configuration
world.web3.init({
  policies: {
    contracts: {
      "0xYourRewardContract...": {
        name: "Coin Collector",
        methods: [
          { name: "claim_reward", entrypoint: "claim_reward" }
        ]
      }
    }
  },
  defaultChainId: constants.StarknetChainId.SN_SEPOLIA
})
```

## How to Play

### 1. Connect Wallet
- Click **"CONNECT WALLET"** button
- Approve connection in Cartridge Controller popup
- Your wallet address will appear in the UI

### 2. Collect Coins
- Walk around the 3D world
- Get close to floating coins to collect them
- Coins automatically add to your count
- Watch the progress bar fill up

### 3. Claim Rewards
- Collect enough coins (default: 10)
- Click **"CLAIM REWARD ON-CHAIN"**
- Transaction executes on StarkNet blockchain
- Coins deducted, rewards counter increments

### 4. Compete
- See other players' collections in chat
- Compare rewards claimed with friends
- Climb the leaderboard!

## Code Structure

### Server Side (`world.isServer`)
```javascript
// Game state management
app.state = {
  players: {},        // Player stats
  activeCoins: [],    // Coins in world
  leaderboard: [],    // Top players
  totalCoinsCollected: 0
}

// Functions
- spawnCoins()           // Create coins in world
- initPlayer()           // Initialize player data
- updateLeaderboard()    // Sort top players

// Events
- 'coinCollected'        // Player collected coin
- 'rewardClaimed'        // Player claimed reward
- 'requestPlayerData'    // Client requests stats
```

### Client Side (`world.isClient`)
```javascript
// 3D coin system
- createCoin()           // Spawn animated coin
- removeCoin()           // Cleanup coin
- checkCoinCollection()  // Collision detection
- collectCoin()          // Handle collection

// UI system
- createButton()         // Reusable button helper
- updateUI()            // Update all UI elements
- showCollectionFeedback() // Visual feedback

// Wallet functions
- handleConnect()        // Connect wallet
- handleClaim()         // Claim on-chain reward

// Game loop
- update()              // Animate coins, check collisions
```

## Customization

### Coin Appearance

Modify the coin creation:

```javascript
const geometry = new THREE.TorusGeometry(0.3, 0.1, 8, 16)
const material = new THREE.MeshStandardMaterial({
  color: '#FF00FF',      // Purple coins
  metalness: 1.0,        // More metallic
  roughness: 0.1,        // Shinier
  emissiveIntensity: 1.0 // Brighter glow
})
```

### Spawn Pattern

Change spawn locations:

```javascript
// Spawn in a grid
const x = (i % 5) * 4 - 10
const z = Math.floor(i / 5) * 4 - 10
const y = 1

// Spawn in a circle
const angle = (i / maxCoins) * Math.PI * 2
const radius = 15
const x = Math.cos(angle) * radius
const z = Math.sin(angle) * radius
```

### Reward Requirements

Modify in configuration or code:

```javascript
// Progressive difficulty
const needed = Math.floor(10 * Math.pow(1.5, rewardsClaimed))

// Time-based bonuses
const timeBonus = Date.now() < endTime ? 2 : 1
const needed = 10 / timeBonus
```

### Additional Features

Add power-ups:

```javascript
// Speed boost coin
if (coin.type === 'speed') {
  player.speed *= 2
  setTimeout(() => player.speed /= 2, 5000)
}

// Double points coin
if (coin.type === 'double') {
  playerCoins += 2
} else {
  playerCoins += 1
}
```

## Troubleshooting

### Coins Not Appearing
- Check server console for spawn messages
- Verify `maxCoins` and `spawnRadius` settings
- Ensure client receives spawn events

### Can't Collect Coins
- Reduce `collectRadius` in `checkCoinCollection()`
- Check player position is updating
- Verify collision detection runs in update loop

### Claim Button Disabled
- Verify wallet is connected
- Check you have enough coins
- Ensure contract address is configured
- Look for errors in browser console

### Transaction Failing
- Verify contract address is correct
- Check wallet has gas/balance
- Ensure network matches contract deployment
- Verify session policies if configured

## Performance Tips

### Optimize Coin Count
```javascript
// Fewer coins for mobile
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
const maxCoins = isMobile ? 8 : 15
```

### Reduce Update Frequency
```javascript
let collectionCheckTimer = 0
app.on('update', (delta) => {
  collectionCheckTimer += delta
  if (collectionCheckTimer > 0.1) { // Check every 100ms
    checkCoinCollection()
    collectionCheckTimer = 0
  }
})
```

### Simplify Animations
```javascript
// Disable pulse on low-end devices
if (performanceLevel === 'low') {
  // Skip scale animation
} else {
  const scale = 1 + Math.sin(time * 3) * 0.1
  mesh.scale.set(scale, scale, scale)
}
```

## Extending the Game

### Add Leaderboard UI
```javascript
const leaderboard = app.create('uitext')
leaderboard.value = 'TOP PLAYERS:\n' + 
  app.state.leaderboard
    .map((p, i) => `${i+1}. ${getPlayerName(p.id)}: ${p.rewardsClaimed}`)
    .join('\n')
```

### Time-Limited Events
```javascript
const eventEndTime = Date.now() + 300000 // 5 minutes
app.on('update', () => {
  if (Date.now() > eventEndTime) {
    statusMsg.value = 'Event ended!'
    spawnCoins(0) // Stop spawning
  }
})
```

### Different Coin Types
```javascript
const coinTypes = {
  bronze: { value: 1, color: '#CD7F32' },
  silver: { value: 5, color: '#C0C0C0' },
  gold: { value: 10, color: '#FFD700' }
}
```

### Achievement System
```javascript
const achievements = {
  first: playerCoins >= 1,
  collector: playerCoins >= 50,
  master: rewardsClaimed >= 10
}
```

## Next Steps

1. **Deploy to Production**: Deploy your contract to StarkNet mainnet
2. **Add NFT Rewards**: Mint unique NFTs for top players
3. **Create Seasons**: Time-limited competitive seasons
4. **Add More Features**: Power-ups, obstacles, team modes
5. **Polish Graphics**: Custom coin models, particle effects
6. **Add Sound**: Coin collection sounds, background music

## Resources

- [Cartridge Controller Docs](https://docs.cartridge.gg/)
- [StarkNet Cairo Docs](https://docs.starknet.io/cairo/)
- [Hyperfy Examples](https://github.com/hyperfy-xyz/hyperfy)
- [THREE.js Documentation](https://threejs.org/docs/)

---

**Have fun building on-chain games with Hyperfy! 🎮⛓️**

