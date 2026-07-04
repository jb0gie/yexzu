# EVM Wallet Disconnect - How It Works

## 🎯 Understanding Wallet Disconnect in Web3

### The Disconnect Misconception

When users click "Disconnect" in a dApp, they often expect:
> "My wallet will be completely disconnected from this site"

**But this is not how Web3 wallets work!** 🔑

### How Web3 Wallets Actually Work

#### 1. MetaMask Connection Model
- MetaMask maintains a **site connection** list
- When you connect, you approve the site to see your address
- This approval persists **even after dApp "disconnect"**
- MetaMask auto-reconnects to approved sites on return

#### 2. What wagmi's `disconnect()` Actually Does

```javascript
// This does NOT disconnect from MetaMask site settings
await disconnect()

// It only:
// ✅ Clears the connected account from React state
// ✅ Removes connection from localStorage
// ✅ Triggers UI updates
// ❌ Does NOT remove site from MetaMask's approved list
```

#### 3. Why Auto-Reconnect Happens

```javascript
// By default, wagmi saves connection to localStorage
const config = createConfig({
  storage: createStorage({  // ← This saves connection
    storage: window.localStorage
  })
})

// On page reload, wagmi automatically reconnects
// This is a "feature" not a bug!
```

## ✅ Our Solution

### 1. Disable Connection Persistence

```javascript
// In EVM.js
export const Providers = ({ children }) => (
  <WagmiProvider
    config={createConfig({
      storage: null,  // ← Prevents saving connection
    })}
  >
    {children}
  </WagmiProvider>
)
```

### 2. Clear All States on Disconnect

```javascript
// In EVMClient.disconnect()
async disconnect() {
  await this.connection.disconnect()  // Clear wagmi state

  // Reset EVMClient state
  this.connected = false

  // Reset React data
  if (this._reactData) {
    this._reactData.isConnected = false
    this._reactData.address = null
  }
}
```

### 3. Provide Clear User Feedback

```javascript
// In wallet app
statusText.value = '🌐 Disconnected'
// Button changes from "Disconnect" to "Connect Wallet"
```

## 🧪 Expected Behavior

### First Visit (Never Connected)
1. Click "Connect Wallet" → MetaMask prompts
2. Approve → Shows "Connected: 0x1234..."
3. Click "Disconnect" → Shows "Disconnected"
4. Click "Connect Wallet" → MetaMask prompts again

### After Page Reload (Was Connected)
1. Shows "Disconnected" (no auto-connect)
2. Click "Connect Wallet" → MetaMask prompts
3. Approve → Shows "Connected: 0x1234..."

### After Disconnect
1. Shows "Disconnected"
2. MetaMask may still show site as "connected" (in its UI)
3. But dApp shows as disconnected (address cleared)
4. Must click "Connect" to re-establish dApp connection

## 🎯 Key Points

### What Our Disconnect Does:
- ✅ Clears the address from UI
- ✅ Resets connection state
- ✅ Prevents auto-reconnect
- ✅ Requires fresh connection on return

### What It Does NOT Do:
- ❌ Remove site from MetaMask's "Connected sites" list
- ❌ Prevent MetaMask from auto-connecting (wagmi handles this)
- ❌ Revoke on-chain permissions (there are none for basic connect)

### Why This Is Standard:

**Security**: Sites can't programmatically disconnect users
**User Control**: Only users can manage MetaMask's connection list
**UX**: Prevents malicious sites from forcing disconnects

## 🔧 Manual Full Disconnect (User Action)

If users want COMPLETE disconnection:

1. Click dApp's "Disconnect" button
2. Open MetaMask
3. Go to "Connected sites"
4. Click "Disconnect" next to the site
5. This fully revokes the connection

## 📊 Code Flow

```
User clicks "Disconnect"
  ↓
disconnectWallet() called
  ↓
world.evm.disconnect() called
  ↓
EVMClient.disconnect() called
  ↓
this.connection.disconnect() (wagmi) called
  ↓
wagmi clears connection state
  ↓
React useEffect runs with isConnected: false
  ↓
EVMClient.bind() updates states
  ↓
UI updates to "Disconnected"
  ↓
Done! ✅
```

## ✅ Testing Checklist

- [ ] Click Connect → MetaMask prompts → Approve → Shows address
- [ ] Click Disconnect → Shows "Disconnected"
- [ ] Click Connect again → MetaMask prompts again (not auto)
- [ ] Reload page → Still shows "Disconnected"
- [ ] Can reconnect after reload → Works normally

## 🎉 The "Disconnect" Button

The button now works correctly! It:
1. Clears the dApp connection state
2. Updates the UI appropriately
3. Prevents auto-reconnect
4. Requires fresh connection on next click

**This is the standard behavior for Web3 dApps!**
