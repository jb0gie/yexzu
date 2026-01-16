# CLAUDE.md

This file provides technical caveats and gotchas for working with the Hyperfy codebase.

## Core Development Commands

```bash
# Development mode with hot reload
npm run dev

# Production build and start
npm run build
npm start

# Run linting
npm run lint

# Run formatting
npm run format
```

## WebView Technical Caveats

**Critical Discovery**: CSS3D iframes in Three.js do NOT follow normal CSS pointer-events rules.

### How CSS3D iframe Interaction Works

**Normal CSS behavior (DOES NOT apply to CSS3D):**
- Parent `pointer-events: none` → blocks all children
- This is how the DOM normally works

**CSS3D behavior (what actually happens):**
- CSS3DRenderer creates special compositing layers
- iframes in CSS3D BYPASS normal DOM parent-child pointer-events rules
- Parent `pointer-events: none` does NOT block iframe in CSS3D context
- **Only iframe's own pointer-events setting matters**

### Implementation Details

**Agentic-hyperfy toggle approach (working pattern):**
```javascript
// Set parents to none (doesn't block iframe in CSS3D!)
container.style.pointerEvents = 'none'
inner.style.pointerEvents = 'none'

// Toggle ONLY iframe (this controls interaction)
mouseenter → iframe.style.pointerEvents = 'auto'   // ENABLE
mouseleave → iframe.style.pointerEvents = 'none'   // DISABLE

// Mobile: always 'auto' (no pointer lock on mobile)
if (!isDesktop) {
  iframe.style.pointerEvents = 'auto'
}
```

**Canvas pointer-events must also toggle:**
- WebGL canvas renders at z-index:1, CSS3D at z-index:0
- Canvas with `pointer-events: auto` blocks iframe clicks
- Solution: Set canvas to `pointer-events: none` when over WebViews
- Restore to `auto` when not over WebViews

### Usage Requirements

- **Desktop**: Requires `pointerEvents: true` AND pointer unlock (click) before interaction
- **Mobile**: Requires `pointerEvents: true` only (direct touch works)
- **All modes**: Must set `pointerEvents: true` on WebView node

### Performance Notes

- Limit to ~10-20 webviews per scene
- Complex pages reduce FPS
- Mobile may throttle background iframes