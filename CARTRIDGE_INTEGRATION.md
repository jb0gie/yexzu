# Cartridge Controller Integration for Hyperfy

## Quick Start

This guide will help you integrate Cartridge Controller (StarkNet wallet) into your Hyperfy world.

## Installation

1. **Install Dependencies**

```bash
npm install
```

The following packages have been added:
- `@cartridge/controller@^0.10.3` - Cartridge Controller SDK
- `starknet@^8.1.2` - StarkNet JavaScript SDK

2. **System Setup**

The `ClientWeb3` system is automatically registered and available in all worlds.

## Usage in Apps

### Basic Connection

```javascript
if (world.isClient) {
  // Connect to wallet
  const result = await world.web3.connect()
  console.log('Connected:', result.address)

  // Check connection status
  const isConnected = world.web3.isConnected()

  // Get wallet info
  const address = world.web3.getAddress()
  const chainId = world.web3.getNetworkId()

  // Disconnect
  await world.web3.disconnect()
}
```

### Execute Transactions

```javascript
if (world.isClient) {
  // Simple transaction
  const result = await world.web3.execute({
    contractAddress: '0x1234...',
    entrypoint: 'transfer',
    calldata: [recipientAddress, amount, 0]
  })

  console.log('Transaction hash:', result.transaction_hash)
}
```

### Listen to Events

```javascript
if (world.isClient) {
  // Wallet connected
  world.web3.on('connected', (data) => {
    console.log('Wallet connected:', data.address)
    world.chat('Wallet connected!', true)
  })

  // Wallet disconnected
  world.web3.on('disconnected', () => {
    console.log('Wallet disconnected')
  })

  // Transaction executed
  world.web3.on('transaction', (data) => {
    console.log('Transaction:', data.result)
  })

  // Error occurred
  world.web3.on('error', (error) => {
    console.error('Web3 error:', error)
  })
}
```

## Session Policies for Games

Session policies enable gasless, pre-approved transactions - perfect for games where frequent transactions are needed:

```javascript
// Initialize with session policies (in world configuration)
world.web3.init({
  policies: {
    contracts: {
      "0xYourGameContract...": {
        name: "My Game",
        methods: [
          { name: "move_player", entrypoint: "move_player" },
          { name: "attack", entrypoint: "attack" },
          { name: "claim_reward", entrypoint: "claim_reward" }
        ]
      }
    }
  }
})

// Now these transactions won't require approval!
await world.web3.execute({
  contractAddress: "0xYourGameContract...",
  entrypoint: "move_player",
  calldata: [x, y]
})
```

## Examples

Check out the `/examples/web3/` directory for complete examples:

1. **basic-wallet-connect.js** - Simple wallet connection with UI
2. **execute-transaction.js** - Transaction execution with configuration
3. **game-session-integration.js** - Full game integration with session policies
4. **coin-collector-game.js** - Complete blockchain game example

## Architecture

### System Structure

```
src/
├── core/
│   ├── systems/
│   │   └── ClientWeb3.js          # New Web3 system
│   └── createClientWorld.js        # Registers Web3 system
├── examples/
│   └── web3/
│       ├── README.md               # Detailed documentation
│       ├── basic-wallet-connect.js
│       ├── execute-transaction.js
│       ├── game-session-integration.js
│       ├── coin-collector-game.js
│       └── COIN_COLLECTOR_GUIDE.md
```

### How It Works

1. **ClientWeb3 System**: A new client-side system that manages Cartridge Controller
2. **Global API**: Exposes `world.web3` in all app scripts
3. **Event System**: Provides event listeners for wallet state changes
4. **Session Management**: Handles session policies for gasless transactions

### Client-Only Architecture

Web3 functionality is **client-only** by design:
- Each player connects their own wallet
- Transactions are executed from their browser
- Server can track results via app messaging

```javascript
// Client: Execute and notify server
if (world.isClient) {
  const result = await world.web3.execute(call)
  app.send('txComplete', { hash: result.transaction_hash })
}

// Server: Track player actions
if (world.isServer) {
  app.on('txComplete', (data, networkId) => {
    const player = world.getPlayer(networkId)
    console.log(`${player.name} tx: ${data.hash}`)
  })
}
```

## Configuration Options

When initializing the world, you can configure the Web3 system:

```javascript
world.web3.init({
  // Session policies (optional)
  policies: {
    contracts: {
      [contractAddress]: {
        name: "Contract Name",
        methods: [
          { name: "method1", entrypoint: "method1" }
        ]
      }
    }
  },

  // Custom RPC endpoints (optional)
  chains: [
    { rpcUrl: "https://api.cartridge.gg/x/starknet/sepolia" },
    { rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet" }
  ],

  // Default chain (optional)
  defaultChainId: constants.StarknetChainId.SN_SEPOLIA,

  // Custom keychain URL (optional)
  keychainUrl: "https://x.cartridge.gg"
})
```

## Best Practices

### 1. Always Check Connection State

```javascript
if (!world.web3.isConnected()) {
  world.chat('Please connect wallet first', true)
  return
}
```

### 2. Handle Errors Gracefully

```javascript
try {
  const result = await world.web3.execute(call)
  world.chat('Transaction successful!', true)
} catch (error) {
  console.error('Transaction failed:', error)
  world.chat(`Error: ${error.message}`, true)
}
```

### 3. Provide User Feedback

```javascript
// Show loading state
statusText.value = 'Processing...'
statusText.color = '#ffaa00'

// Execute transaction
const result = await world.web3.execute(call)

// Show success
statusText.value = 'Success!'
statusText.color = '#00ff00'
```

### 4. Use Session Policies for Games

For game mechanics that require frequent transactions, always use session policies to avoid interrupting gameplay with approval popups.

## Testing

### Local Development

```bash
npm run dev
```

### Testing with Production APIs

```bash
npm run dev:live
```

This connects to production StarkNet endpoints while running locally.

## Troubleshooting

### "Controller is not defined"
- Ensure dependencies are installed: `npm install`
- Restart the server after installation

### Wallet not connecting
- Check you're running on HTTPS (required for wallet security)
- Verify browser console for errors
- Try different browser if issues persist

### Transactions failing
- Verify wallet has sufficient balance
- Check contract address is correct
- Ensure network matches contract deployment
- Verify session policies if using pre-approved transactions

## Resources

- [Cartridge Controller Documentation](https://docs.cartridge.gg/controller/getting-started)
- [StarkNet Documentation](https://docs.starknet.io/)
- [Hyperfy Documentation](https://docs.hyperfy.io/)
- [Examples Directory](/examples/web3/)

## Support

- **Cartridge**: [Discord](https://discord.gg/cartridge)
- **Hyperfy**: [Discord](https://discord.gg/hyperfy)
- **StarkNet**: [Discord](https://discord.gg/starknet)

---

## Next Steps

1. Install dependencies: `npm install`
2. Check examples: `cd examples/web3`
3. Try basic wallet connection example
4. Build your first Web3-enabled game!

