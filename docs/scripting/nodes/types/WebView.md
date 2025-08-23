# WebView

Displays web content as an iframe that can exist in either world space (positioned in 3D) or screen space (HUD/overlay).

```jsx
// World-space webview
const tvScreen = app.create('webview', {
  src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  width: 1920,
  height: 1080,
  space: 'world',
  size: 0.002, // Scale factor for world space
})
tvScreen.position.set(0, 3, -8)
app.add(tvScreen)

// Screen-space webview (HUD)
const hudInfo = app.create('webview', {
  src: 'https://example.com/info',
  width: 300,
  height: 200,
  space: 'screen'
})
hudInfo.position.set(0.9, 0.1, 0) // Top-right corner
app.add(hudInfo)
```

## Spaces

### World Space (`space: 'world'`)
- WebView is positioned in 3D world coordinates
- Scales with distance from camera
- Follows parent transforms
- Good for: TVs, monitors, information panels in the world

### Screen Space (`space: 'screen'`)
- WebView is fixed to the screen/camera
- Position uses viewport coordinates (0-1)
- Always renders on top
- Good for: HUD elements, overlays, UI panels

## Properties

### `.src`: String

The URL of the web content to display.
Defaults to `null`.

### `.width`: Number

The width of the webview in pixels.
Defaults to `640`.

### `.height`: Number

The height of the webview in pixels.
Defaults to `480`.

### `.space`: String

The rendering space for the webview. Options are `'world'` or `'screen'`.
Defaults to `'world'`.

### `.size`: Number

Scale factor for world-space webviews (pixels to meters conversion).
Only applies when `space: 'world'`.
Defaults to `0.01`.

### `.visible`: Boolean

Whether the webview is visible.
Defaults to `true`.

### `.opacity`: Number

The opacity of the webview (0-1).
Defaults to `1`.

### `.{...Node}`

Inherits all [Node](/docs/scripting/nodes/Node.md) properties including position, rotation, scale, etc.

## Examples

### YouTube Video Screen

```jsx
const tvScreen = app.create('webview', {
  src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  width: 1920,
  height: 1080,
  space: 'world',
  size: 0.002
})
tvScreen.position.set(0, 3, -8)
app.add(tvScreen)
```

### HUD Mini-Map

```jsx
const minimap = app.create('webview', {
  src: 'https://example.com/minimap',
  width: 200,
  height: 200,
  space: 'screen',
  opacity: 0.8
})
// Position in top-right corner
minimap.position.set(0.85, 0.15, 0)
app.add(minimap)
```

### Information Panel

```jsx
const infoPanel = app.create('webview', {
  src: 'https://example.com/info',
  width: 600,
  height: 400,
  space: 'world',
  size: 0.005
})
infoPanel.position.set(5, 2, 0)
app.add(infoPanel)
```

## Current Limitations

1. **Overlay Rendering**: WebViews render as DOM overlays on top of the 3D scene
2. **No Depth Testing**: WebViews appear on top of all 3D objects
3. **Performance**: Multiple webviews may impact performance
4. **Mobile Support**: May have limited functionality on mobile devices
5. **Interaction**: Direct mouse/touch interaction (not reticle-based in world space)

## Security

Currently all URLs are allowed for development. In production, consider implementing:
- Domain allowlisting
- HTTPS-only content
- Sandbox attributes for iframes
- Content Security Policy (CSP)