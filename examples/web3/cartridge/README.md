# Cartridge Controller Integration for Hyperfy

This directory contains examples and documentation for integrating [Cartridge Controller](https://docs.cartridge.gg/controller/getting-started) into Hyperfy worlds, enabling StarkNet wallet functionality and blockchain interactions within your 3D multiplayer experiences.

## Overview

The Cartridge Controller integration provides:
- **Wallet Connection**: Connect players to their StarkNet wallets
- **Transaction Execution**: Execute blockchain transactions from within your world
- **Session Policies**: Enable gasless, pre-approved transactions for seamless gameplay
- **Event System**: Listen for wallet and transaction events
- **Multi-chain Support**: Support for StarkNet mainnet and testnets

## Installation

1. Install dependencies:
```bash
npm install
```

The following packages are already included:
- `@cartridge/controller@^0.10.3`
- `starknet@^8.1.2`

2. The `ClientWeb3` system is automatically initialized when you start the server.

## Configuration

The Web3 system can be configured during world initialization. Edit your world configuration to customize:

```javascript
// In your world initialization code
world.web3.init({
  // Optional: Define session policies for gasless transactions
  policies: {
    contracts: {
      "0x1234...": {
        name: "My Game Contract",
        methods: [
          { name: "move_player", entrypoint: "move_player" },
          { name: "claim_reward", entrypoint: "claim_reward" }
        ]
      }
    }
  },
  
  // Optional: Custom RPC endpoints
  chains: [
    { rpcUrl: "https://api.cartridge.gg/x/starknet/sepolia" },
    { rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet" }
  ],
  
  // Optional: Default chain
  defaultChainId: constants.StarknetChainId.SN_SEPOLIA,
  
  // Optional: Custom keychain URL
  keychainUrl: "https://x.cartridge.gg"
})
```

## API Reference

### world.web3

The Web3 API is available through `world.web3` in your app scripts:

#### Connection Methods

**`world.web3.connect()`**
- Connects to the player's wallet
- Returns: `Promise<{ address: string, chainId: string, account: Account }>`
- Opens Cartridge Controller UI for authentication

**`world.web3.disconnect()`**
- Disconnects the current wallet
- Returns: `Promise<void>`

**`world.web3.isConnected()`**
- Check if wallet is connected
- Returns: `boolean`

#### Account Information

**`world.web3.getAddress()`**
- Get the connected wallet address
- Returns: `string | null`

**`world.web3.getNetworkId()`**
- Get the current network/chain ID
- Returns: `string | null`

**`world.web3.getAccount()`**
- Get the full account object
- Returns: `Account | null`

#### Transaction Execution

**`world.web3.execute(calls, options)`**
- Execute a transaction on StarkNet
- Parameters:
  - `calls`: Transaction call or array of calls
  - `options`: Optional execution options
- Returns: `Promise<TransactionResult>`

Example:
```javascript
const result = await world.web3.execute({
  contractAddress: '0x1234...',
  entrypoint: 'transfer',
  calldata: [recipientAddress, amount, 0]
})
```

#### Event Listeners

**`world.web3.on(event, callback)`**
- Subscribe to Web3 events
- Events:
  - `'connected'`: Wallet connected
  - `'disconnected'`: Wallet disconnected
  - `'transaction'`: Transaction executed
  - `'error'`: Error occurred

**`world.web3.off(event, callback)`**
- Unsubscribe from Web3 events

Example:
```javascript
world.web3.on('connected', (data) => {
  console.log('Wallet connected:', data.address)
})

world.web3.on('transaction', (data) => {
  console.log('Transaction:', data.result.transaction_hash)
})

world.web3.on('error', (error) => {
  console.error('Web3 error:', error)
})
```

#### Advanced Access

**`world.web3.getController()`**
- Get direct access to the Cartridge Controller instance
- Returns: `Controller`
- Use for advanced features not covered by the standard API

## Examples

### 1. Basic Wallet Connection
**File**: `basic-wallet-connect.js`

A simple example showing:
- Wallet connection UI
- Connection status display
- Address display
- Event handling

Perfect for learning the basics!

### 2. Transaction Execution
**File**: `execute-transaction.js`

Demonstrates:
- Configurable transaction parameters
- Transaction execution
- Result display
- Error handling

Great for understanding contract interactions!

### 3. Game Session Integration
**File**: `game-session-integration.js`

Shows how to use:
- Session policies setup
- Gasless transactions
- Game state synchronization
- Multi-player interactions

Ideal for understanding session-based gameplay!

### 4. 💰 Coin Collector Game (Complete Game)
**File**: `coin-collector-game.js`
**Guide**: `COIN_COLLECTOR_GUIDE.md`

A **fully-functional blockchain game** featuring:
- 🎮 3D coin collection mechanics
- ⚡ Animated floating coins
- 🔄 Auto-respawning system
- 🏆 On-chain reward claiming
- 👥 Multiplayer synchronization
- 📊 Real-time leaderboard
- 💾 Persistent player stats

**Perfect starter template** for building your own Web3 game!

See `COIN_COLLECTOR_GUIDE.md` for complete documentation, customization options, and deployment guide.

## Usage Patterns

### Client-Only Usage

Most Web3 interactions should be client-side only:

```javascript
if (world.isClient) {
  // Connect wallet
  const connectBtn = app.create('uitext')
  connectBtn.value = '[ CONNECT WALLET ]'
  
  connectBtn.onPointerUp = async () => {
    try {
      await world.web3.connect()
      world.chat('Wallet connected!', true)
    } catch (error) {
      console.error('Connection failed:', error)
    }
  }
}
```

### Client-Server Communication

For multiplayer games, use app messaging:

```javascript
// Client: Execute transaction and notify server
if (world.isClient) {
  async function performAction() {
    const result = await world.web3.execute(call)
    app.send('actionPerformed', { 
      txHash: result.transaction_hash 
    })
  }
}

// Server: Track player actions
if (world.isServer) {
  app.on('actionPerformed', (data, networkId) => {
    const player = world.getPlayer(networkId)
    console.log(`${player.name} performed action: ${data.txHash}`)
    
    // Broadcast to all clients
    app.send('actionBroadcast', {
      playerName: player.name,
      txHash: data.txHash
    })
  })
}
```

### Session Policies for Games

Session policies enable gasless, pre-approved transactions:

```javascript
// Define which methods can be called without approval
const policies = {
  contracts: {
    [gameContract]: {
      name: "My Game",
      methods: [
        { name: "move", entrypoint: "move_player" },
        { name: "attack", entrypoint: "attack_enemy" },
        { name: "claim", entrypoint: "claim_reward" }
      ]
    }
  }
}

// These transactions will not require manual approval
await world.web3.execute({
  contractAddress: gameContract,
  entrypoint: 'move_player',
  calldata: [x, y]
})
```

## Best Practices

### 1. Error Handling

Always wrap Web3 calls in try-catch blocks:

```javascript
try {
  const result = await world.web3.execute(call)
  // Handle success
} catch (error) {
  console.error('Transaction failed:', error)
  world.chat(`Error: ${error.message}`, true)
}
```

### 2. Connection State Management

Check connection state before executing transactions:

```javascript
if (!world.web3.isConnected()) {
  world.chat('Please connect your wallet first', true)
  return
}

// Proceed with transaction
await world.web3.execute(call)
```

### 3. User Feedback

Provide clear feedback during async operations:

```javascript
status.value = 'Connecting...'
status.color = '#ffaa00'

try {
  await world.web3.connect()
  status.value = 'Connected!'
  status.color = '#00ff00'
} catch (error) {
  status.value = 'Connection failed'
  status.color = '#ff0000'
}
```

### 4. Session Management

Use session policies for frequently-called game actions:

```javascript
// ✅ Good: Frequent actions with session policy
await world.web3.execute({
  contractAddress: gameContract,
  entrypoint: 'move_player', // Pre-approved in session
  calldata: [x, y]
})

// ❌ Avoid: Frequent transactions without session
// This would require approval each time
```

### 5. Transaction Display

Show shortened transaction hashes for better UX:

```javascript
const txHash = result.transaction_hash
const shortHash = `${txHash.slice(0, 10)}...${txHash.slice(-8)}`
txDisplay.value = `TX: ${shortHash}`
```

## Troubleshooting

### Wallet Not Connecting
- Ensure you're running on HTTPS (required for wallet security)
- Check browser console for errors
- Verify the keychain URL is accessible

### Transactions Failing
- Check wallet has sufficient balance
- Verify contract address is correct
- Ensure session policies match contract methods
- Check network/chain ID matches contract deployment

### Session Policies Not Working
- Verify policies are configured before connecting
- Check method names match contract entrypoints exactly
- Ensure contract address is correct

## Security Considerations

1. **Session Policies**: Only add methods that are safe for pre-approval
2. **Amount Limits**: Consider adding amount limits in session policies
3. **Contract Verification**: Always verify contract addresses
4. **User Education**: Inform users about what transactions they're approving

## Additional Resources

- [Cartridge Controller Docs](https://docs.cartridge.gg/controller/getting-started)
- [StarkNet Documentation](https://docs.starknet.io/)
- [Hyperfy Documentation](https://docs.hyperfy.io/)

## Support

For issues related to:
- **Cartridge Controller**: [Cartridge Discord](https://discord.gg/cartridge)
- **Hyperfy Integration**: [Hyperfy Discord](https://discord.gg/hyperfy)
- **StarkNet**: [StarkNet Discord](https://discord.gg/starknet)

