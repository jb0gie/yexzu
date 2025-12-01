# WebView

The `WebView` node embeds a web page in the 3D world.

### `.src`: String

The URL of the web page to display.

### `.width`: Number

The pixel width of the web view. Default is `640`.

### `.height`: Number

The pixel height of the web view. Default is `480`.

### `.size`: Number

The scale factor of the web view in the 3D world (pixels to meters). Default is `0.0025`.

### `.pivot`: String

The pivot point of the web view. Can be `'center'`, `'top-left'`, `'top-right'`, `'bottom-left'`, `'bottom-right'`, `'top-center'`, `'bottom-center'`, `'center-left'`, `'center-right'`. Default is `'center'`.

### `.offset`: Vector3

The offset of the web view from its position.

### `.scaler`: Number

The scaler value for distance-based scaling.

### `.space`: String

The rendering space. Can be `'world'` (3D) or `'screen'` (2D overlay). Default is `'world'`.

### `.billboard`: String

Billboard mode. Can be `'none'`, `'full'` (faces camera), or `'y'` (faces camera on Y axis). Default is `'none'`.

### `.pointerEvents`: Boolean

Whether the web view receives pointer events (clicks, scrolling). Default is `false`.

### `.visible`: Boolean

Whether the web view is visible. Default is `true`.

### `.opacity`: Number

The opacity of the web view container. Default is `1`.
