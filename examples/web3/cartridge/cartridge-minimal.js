// Cartridge implementation - following working wallet-connect.js pattern

({
  init() {
    if (!world.isClient) return

    // Cartridge state
    this.connected = false
    this.address = null

    console.log('[Cartridge] Initialized')
  },

  // Connection function
  connect() {
    this.connected = true
    this.address = "0x1234567890abcdef"
    console.log('[Cartridge] Connected:', this.address)
    return { connected: this.connected, address: this.address }
  },

  // Disconnect function
  disconnect() {
    this.connected = false
    this.address = null
    console.log('[Cartridge] Disconnected')
  },

  // Get state function
  getState() {
    return { connected: this.connected, address: this.address }
  },

  // Expose functions to global scope properly
  connectWallet() {
    return this.connect()
  },

  disconnectWallet() {
    this.disconnect()
  },

  getWalletState() {
    return this.getState()
  }
})