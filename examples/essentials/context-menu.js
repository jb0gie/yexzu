({ init() {
  if (world.isClient) {
    // custom action buttons in the app pane (inspect this app to see them)
    app.setMenuItems([
      { label: 'Popup', hint: 'Focus the app pane on this app', onClick: () => app.openMenu() },
    ])
    // app.openMenu() opens/focuses this app's pane; app.closeMenu() closes it
  }
  if (world.isServer) {
    // no-op safety: server build must not crash
    app.openMenu()
    app.setMenuItems(null)
  }
} })