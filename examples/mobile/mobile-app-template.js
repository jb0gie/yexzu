({
  configure() {
    app.configure([
      {
        type: 'section',
        label: 'Mobile Controls'
      },
      {
        key: 'showMobileButton',
        type: 'toggle',
        label: 'Show Mobile Button',
        initial: true
      },
      {
        key: 'actionKey',
        type: 'switch',
        label: 'Action Key',
        initial: 'keyF',
        options: [
          { value: 'mouseLeft', label: 'Left Click' },
          { value: 'mouseRight', label: 'Right Click' },
          { value: 'space', label: 'Space' },
          { value: 'keyE', label: 'E' },
          { value: 'keyF', label: 'F' },
          { value: 'keyR', label: 'R' },
          { value: 'keyQ', label: 'Q' }
        ]
      }
    ])
  },

  init() {
    this.player = null
    this.control = null

    if (world.isClient) {
      this.setupControls()
    }
  },

  setupControls() {
    this.control = app.control()
    if (!this.control) return

    const actionKey = config.actionKey || 'keyF'

    if (this.control[actionKey]) {
      this.control[actionKey].capture = true
    }

    if (config.showMobileButton) {
      const btn = app.create('ui', {
        space: 'screen',
        width: 50,
        height: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 25,
        pivot: 'top-right',
        position: [1, 0],
        offset: [-30, 280],
        cursor: 'pointer',
        onPointerDown: () => this.onAction(),
        alignItems: 'center',
        justifyContent: 'center',
      })
      const label = app.create('uitext', {
        value: 'ACTION',
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold'
      })
      btn.add(label)
      app.add(btn)
    }
  },

  update() {
    if (!this.player) this.player = world.getPlayer()
    if (!this.control) this.control = app.control()
    if (!this.control) return

    const actionKey = config.actionKey || 'keyF'

    if (this.control[actionKey]?.pressed) {
      this.onAction()
    }
  },

  onAction() {
    console.log(`[${app.id}] Action triggered!`)
  }
})