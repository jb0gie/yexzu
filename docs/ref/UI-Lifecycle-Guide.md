# UI Lifecycle Management Guide

## Core Principles

1. **UI inherits from Node** - Use Node's `.add()` and `.remove()` methods for parent-child relationships
2. **World manages top-level UI** - Use `world.add()` and `world.remove()` for UI elements in world space
3. **Always clean up children** - Remove child elements before removing parent containers
4. **Set references to null** - Prevent memory leaks by clearing references

## Proper Disposal Patterns

### 1. Removing UI from World
```javascript
// Add UI to world
const myUI = app.create('ui', { /* properties */ });
world.add(myUI);

// Later, remove UI from world
world.remove(myUI);
myUI = null; // Clear reference
```

### 2. Clearing Child Elements
```javascript
// Clear all children from a container (like the playerlist example)
while (container.children.length > 0) {
    container.remove(container.children[0]);
}
```

### 3. Managing UI State with References
```javascript
// Track open UI to prevent multiple instances
let currentUI = null;

function showUI() {
    // Clean up existing UI first
    if (currentUI) {
        world.remove(currentUI);
        currentUI = null;
    }
    
    // Create new UI
    currentUI = app.create('ui', { /* properties */ });
    world.add(currentUI);
}

function hideUI() {
    if (currentUI) {
        world.remove(currentUI);
        currentUI = null;
    }
}
```

### 4. Nested UI Cleanup
```javascript
// For complex UI with many nested elements
function cleanupComplexUI(uiElement) {
    // Remove from world first
    world.remove(uiElement);
    
    // Clear any tracked references
    if (app.openDetailsUI === uiElement) {
        app.openDetailsUI = null;
    }
    
    // The UI hierarchy will be automatically cleaned up
    // when the parent is removed from world
}
```

## Common Mistakes

### ❌ Wrong - Just creating new UI without cleanup
```javascript
function showPlayerList() {
    const ui = app.create('ui');
    world.add(ui); // Old UI still exists!
}
```

### ❌ Wrong - Not removing from parent
```javascript
// This doesn't remove from world
const ui = app.create('ui');
world.add(ui);
ui = null; // UI still exists in world!
```

### ✅ Correct - Proper cleanup
```javascript
let playerListUI = null;

function showPlayerList() {
    // Clean up existing UI
    if (playerListUI) {
        world.remove(playerListUI);
    }
    
    // Create new UI
    playerListUI = app.create('ui');
    world.add(playerListUI);
}

function hidePlayerList() {
    if (playerListUI) {
        world.remove(playerListUI);
        playerListUI = null;
    }
}
```

## Working Example Pattern (from playerlist.js)

```javascript
// Global reference to track UI
let currentDetailsUI = null;

function createPlayerDetailsUI(player) {
    // Remove existing details UI if it exists
    if (currentDetailsUI) {
        world.remove(currentDetailsUI);
        currentDetailsUI = null;
    }

    // Remove main UI temporarily
    if (playerListUI) {
        world.remove(playerListUI);
    }

    // Create new UI
    const detailsUI = app.create('ui', {
        // UI properties
    });
    
    // Add close button functionality
    closeButton.onPointerDown = () => {
        world.remove(detailsUI);
        currentDetailsUI = null;
        // Add back the main UI
        world.add(playerListUI);
    };

    // Track and add to world
    world.add(detailsUI);
    currentDetailsUI = detailsUI;
}
```

## Key Takeaways

1. **Always use `world.remove()`** for UI added with `world.add()`
2. **Always use `parent.remove(child)`** for nested elements
3. **Track UI references** to prevent multiple instances
4. **Clear references after removal** to prevent memory leaks
5. **Remove children before parents** when doing complex cleanup 