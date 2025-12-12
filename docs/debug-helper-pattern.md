# Debug Helper Pattern

A reusable pattern for adding configurable debug logging to Hyperfy apps.

## Implementation

### 1. Add Configuration Option

Add this to your `app.configure()` array:

```javascript
{
  type: 'section',
  label: 'Debug',
},
{
  key: 'debugLogs',
  type: 'toggle',
  label: 'Enable Debug Logs',
  initial: false,
  hint: 'Show detailed console logs for debugging',
}
```

### 2. Add Debug Helper Function

Place this at the top of your app logic (after `app.configure()`):

```javascript
// ===== DEBUG HELPER =====
function debugLog(...args) {
  if (props.debugLogs) {
    console.log('[your-app-name]', ...args)
  }
}
```

Note: Replace `[your-app-name]` with a descriptive prefix for your app.

### 3. Use in Your Code

Replace `console.log()` calls with `debugLog()`:

```javascript
// Before:
console.log('Player jumped:', height)

// After:
debugLog('Player jumped:', height)
```

Leave `console.error()` and `console.warn()` unchanged - errors should always be visible.

## Best Practices

1. **Prefix with app name**: Use `[app-name]` prefix to easily filter logs
2. **Default to off**: Set `initial: false` to avoid spam in production
3. **Use for diagnostics**: Log state changes, event triggers, and important calculations
4. **Avoid in hot paths**: Don't use in update loops that run every frame (unless debugging performance)
5. **Keep error logs**: Never hide errors or warnings behind debug flags

## Example

```javascript
app.configure([
  // ... your config options ...
  {
    type: 'section',
    label: 'Debug',
  },
  {
    key: 'debugLogs',
    type: 'toggle',
    label: 'Enable Debug Logs',
    initial: false,
    hint: 'Show detailed console logs for debugging',
  },
])

if (world.isClient) {
  // ===== DEBUG HELPER =====
  function debugLog(...args) {
    if (props.debugLogs) {
      console.log('[my-app]', ...args)
    }
  }

  // Use it in your code
  app.on('update', delta => {
    const player = world.getPlayer()
    debugLog('Player position:', player.position.toArray())

    // Errors should always show
    if (!player) {
      console.error('Player not found!')
    }
  })
}
```

## Benefits

- Clean console output in production
- Easy debugging when needed
- No code changes required to toggle logs
- Consistent pattern across apps
