# Add Favicon Setting to World Settings

## Problem
Players cannot update the favicon icon from world settings like they can with title and loading screen image.

## Solution
Add favicon support to the world settings system.

## Implementation

### 1. Settings.js (src/core/systems/Settings.js:1-88)
- Add `favicon = null` property in constructor (after line 11)
- Deserialize: `this.favicon = data.favicon` and emit change (line 33)
- Serialize: include `favicon: this.favicon` in returned object (line 57)

### 2. Fields.js (src/client/components/Fields.js:427-432)
- Add `favicon` to `fileKinds` with extensions: jpg, jpeg, png, webp, ico (after image)
- Type 'image', same as image field pattern

### 3. Sidebar.js (src/client/components/Sidebar.js:654-798)
- Add `const [favicon, setFavicon]` useState after image state (line 656)
- Add `if (changes.favicon) setFavicon(changes.favicon.value)` in onChange (line 667)
- Add `FieldFile` component after Image field with kind='favicon' (after line 734)

### 4. Client.js (src/core/systems/Client.js:78-82)
- Add favicon change handler in `onSettingsChange` alongside title
- Dynamically update/create `<link rel="icon">` element in document.head

### 5. cleaner.js (src/server/cleaner.js:40-41)
- Add favicon asset to keep list: `if (settings.favicon) assetsToKeep.add(settings.favicon.url.replace('asset://', ''))`

## Technical Notes
- Favicon uses asset://hash.ext URL structure (consistent with image)
- Client-side dynamic DOM update for runtime favicon changes
- Supports jpg, png, webp, and ico formats
- Server-side cleanup prevents asset orphaning