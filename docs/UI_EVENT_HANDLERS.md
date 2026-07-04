# UI Event Handlers in Hyperfy

## Overview

Hyperfy uses **direct property assignment** for UI event handlers, following a pattern different from standard DOM event listeners. This pattern is enforced by the SES (Secure ECMAScript) sandbox environment.

## The Correct Pattern

### From starknetkit Example (Working)

```javascript
// ✅ CORRECT - Direct property assignment
connectButton.onPointerDown = () => {
  console.log('[Wallet] Connect button clicked')
  connectWallet()
}

connectButton.onPointerOver = () => {
  if (connected) {
    connectButton.backgroundColor = '#dc2626'
  } else {
    connectButton.backgroundColor = '#4f46e5'
  }
}

connectButton.onPointerOut = () => {
  if (connected) {
    connectButton.backgroundColor = '#ef4444'
  } else {
    connectButton.backgroundColor = '#6366f1'
  }
}
```

## Common Mistakes

### ❌ WRONG: Using EventEmitter-style .on()

```javascript
// ❌ DOES NOT WORK in Hyperfy
button.on('click', async () => {
  // Handler code
})
```

**Error**: `button.on is not a function`

### ❌ WRONG: Using onClick instead of onPointerDown

```javascript
// ❌ WORKS but NOT the pattern from working examples
button.onClick = async () => {
  // Handler code
}
```

**Note**: While `onClick` may work, the working examples in `/examples/web3/` use `onPointerDown`.

### ❌ WRONG: Adding event listeners

```javascript
// ❌ DOES NOT WORK in Hyperfy's SES environment
button.addEventListener('click', (event) => {
  // Handler code
})
```

## Available Event Handlers

### Primary: onPointerDown

Used for click/tap actions. This is the **preferred** event handler for buttons.

```javascript
button.onPointerDown = () => {
  console.log('Button clicked!')
  // Your action here
}
```

### Hover Effects: onPointerOver / onPointerOut

Provide visual feedback when user hovers over UI elements.

```javascript
// When mouse/touch enters the element
button.onPointerOver = () => {
  button.backgroundColor = '#008000' // Darker green
}

// When mouse/touch leaves the element
button.onPointerOut = () => {
  button.backgroundColor = '#00a000' // Normal green
}
```

### Other Available Handlers

- `onPointerUp` - When pointer is released
- `onPointerMove` - When pointer moves over element
- `onClick` - Alternative to onPointerDown (but not used in working examples)

## Best Practices

### 1. Follow starknetkit Pattern

The `/examples/web3/starknetkit/wallet-connect.js` example is **proven to work**. Use the same pattern:

```javascript
// Three handlers for complete UX
button.onPointerDown = () => { /* action */ }
button.onPointerOver = () => { /* hover in */ }
button.onPointerOut = () => { /* hover out */ }
```

### 2. Provide Visual Feedback

Always include hover effects to indicate interactivity:

```javascript
button.onPointerOver = () => {
  button.backgroundColor = darkerShade
}

button.onPointerOut = () => {
  button.backgroundColor = normalShade
}
```

### 3. No Async in Handlers (Usually)

```javascript
// ✅ GOOD
button.onPointerDown = () => {
  doSomething()  // Call async function, but handler itself isn't async
}

async function doSomething() {
  await someAsyncOperation()
}
```

```javascript
// ⚠️ UNNECESSARY
button.onPointerDown = async () => {
  await someAsyncOperation()
}
```

### 4. State-Based Styling

Update button appearance based on application state:

```javascript
button.onPointerOver = () => {
  if (connected) {
    button.backgroundColor = '#cc0000' // Darker red
  } else {
    button.backgroundColor = '#008000' // Darker green
  }
}
```

### 5. Always Include All Three

For buttons, implement all three handlers for complete UX:

| Handler | Purpose | Required? |
|---------|---------|-----------|
| `onPointerDown` | Primary action | **Yes** |
| `onPointerOver` | Hover feedback | **Yes** |
| `onPointerOut` | Reset state | **Yes** |

## Complete Working Example

```javascript
// Create button container
const buttonView = app.create('uiview', {
  width: 276,
  height: 36,
  backgroundColor: '#00a000',
  borderRadius: 6,
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer'
})

// Create button text
const buttonText = app.create('uitext', {
  value: 'Connect Wallet',
  color: '#ffffff',
  fontSize: 14,
  fontWeight: 'bold'
})

buttonView.add(buttonText)

// Event handlers (from starknetkit pattern)
buttonView.onPointerDown = () => {
  console.log('[Wallet] Button clicked')

  if (connected) {
    disconnectWallet()
  } else {
    connectWallet()
  }
}

buttonView.onPointerOver = () => {
  if (connected) {
    buttonView.backgroundColor = '#cc0000' // Darker red
  } else {
    buttonView.backgroundColor = '#008000' // Darker green
  }
}

buttonView.onPointerOut = () => {
  if (connected) {
    buttonView.backgroundColor = '#ff4444' // Red
  } else {
    buttonView.backgroundColor = '#00a000' // Green
  }
}
```

## Key Takeaways

1. **Always use direct property assignment**: `element.onPointerDown = fn`
2. **Never use EventEmitter**: No `.on()` or `.addEventListener()`
3. **Follow working examples**: `/examples/web3/starknetkit/wallet-connect.js`
4. **Include all three handlers**: `onPointerDown`, `onPointerOver`, `onPointerOut`
5. **Provide visual feedback**: Change colors on hover
6. **State-aware styling**: Different colors for different states

## Debugging Tips

### Check if handler is set

```javascript
console.log('Handler set:', typeof button.onPointerDown === 'function')
```

### Log all interactions

```javascript
button.onPointerDown = () => {
  console.log('Button clicked!')
  console.log('Current state:', { connected, address })
}
```

### Verify element exists

```javascript
console.log('Button exists:', button !== null)
console.log('Button properties:', Object.keys(button))
```

## Additional Resources

- [WORKING_PATTERN_EXPLAINED.md](./WORKING_PATTERN_EXPLAINED.md) - General pattern explanation
- `/examples/web3/starknetkit/wallet-connect.js` - Working reference implementation
- `/examples/wallet-connect-FINAL.js` - Complete wallet connect example
