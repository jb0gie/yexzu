// Ultra minimal - no console.log at all

if (world.isClient) {
  // Silent cartridge
  let connected = false
  let address = null

  // Connection function
  function connect() {
    connected = true
    address = "0x1234567890abcdef"
    return { connected, address }
  }

  // Expose functions globally for testing
  this.connectWallet = connect
  this.disconnectWallet = function() {
    connected = false
    address = null
  }

  this.getWalletState = function() {
    return { connected, address }
  }

} else {
  // Server silent
}

;;null