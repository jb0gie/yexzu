# Mobile UI Extraction - Issue Analysis & Fix

## 🚨 **Current Issue: Black Screen on Mobile**

The black screen is caused by our mobile controls apps crashing repeatedly due to SES sandbox violations.

### **Root Causes Identified:**

1. **Server-Side Execution**: Apps are running on server instead of client
2. **SES Sandbox Violations**: Using restricted APIs like `setInterval`, `setTimeout`
3. **Rapid Crash Cycles**: Apps crashing and re-initializing every frame
4. **CoreUI Modification**: Our modification broke the existing mobile UI

## ✅ **Immediate Fix Applied:**

### **Reverted CoreUI.js:**
- Restored original `{ready && isTouch && <TouchBtns world={world} />}`
- Removed `hasMobileControlsApp()` helper function
- **Result**: Original hardcoded mobile UI should work again

## 🔧 **Technical Problems Found:**

### **SES Sandbox Issues:**
```javascript
// ❌ CRASHES: These APIs are not available in SES sandbox
setInterval(callback, 500)
setTimeout(() => {...}, 100)

// ❌ CRASHES: Using restricted world APIs
world.actions.on('change', callback)
```

### **Server vs Client Execution:**
```javascript
// ❌ Apps run on server: "Controls system not available"
if (world && world.controls) {...}

// ✅ Need to check if running on client first
if (world && world.isClient && world.controls) {...}
```

## 💡 **Corrected Extraction Strategy:**

### **Phase 1: Restore Basic Functionality** ✅
1. Revert CoreUI.js to original state
2. Remove problematic mobile apps
3. Verify original mobile UI works

### **Phase 2: Safe Extraction Approach**
1. **Use proper client detection**: `world.isClient`
2. **Avoid restricted APIs**: No `setInterval`, `setTimeout`, `Date.now()`
3. **Use only available APIs**: Stick to documented Hyperfy APIs
4. **Implement proper error handling**: Try-catch everything

### **Phase 3: Gradual UI Replacement**
1. Extract one button at a time
2. Test extensively on real devices
3. Maintain backward compatibility
4. Use feature flags instead of conditional rendering

## 🚫 **What NOT to Do:**
- DON'T use `setInterval/setTimeout`
- DON'T access `window`, `navigator` directly
- DON't rely on `world.actions` events
- DON'T modify CoreUI.js without thorough testing
- DON'T assume client-side execution

## ✅ **Safe Extraction Pattern:**
```javascript
// ✅ SAFE: Client-only execution
if (!world.isClient) {
  console.log('[Mobile] Server-side, skipping')
  return
}

// ✅ SAFE: Use app.on('update') for timing
app.on('update', (delta) => {
  // Frame-based timing instead of setInterval
})

// ✅ SAFE: Proper error handling
try {
  const control = world.controls
  if (control && control.setTouchBtn) {
    control.setTouchBtn('touchA', true)
  }
} catch (e) {
  console.warn('[Mobile] Control error:', e)
}
```

## 📱 **Testing Strategy:**

1. **Step 1**: Verify original mobile UI works again
2. **Step 2**: Test with safe version (`mobile-safe.js`)
3. **Step 3**: Gradually add functionality
4. **Step 4**: Test on real mobile devices only

## 🔄 **Current Status:**

- ✅ CoreUI.js reverted - original mobile UI restored
- ✅ Problematic apps removed from world
- 🔄 Ready to test basic mobile functionality
- ⏳ Need to create safe extraction version

**Next Action**: Test that mobile works again, then implement safe extraction using the corrected approach above.