/**
 * Execute Transaction Example
 *
 * This example demonstrates how to:
 * - Execute transactions on StarkNet
 * - Handle transaction results
 * - Show transaction status
 * - Use contract calls
 */

// Configuration - update these with your contract details
app.configure([
  {
    type: 'section',
    key: 'contract',
    label: 'Contract Configuration',
  },
  {
    key: 'contractAddress',
    type: 'text',
    label: 'Contract Address',
    placeholder: '0x...',
    initial: '',
  },
  {
    key: 'entrypoint',
    type: 'text',
    label: 'Function Name',
    placeholder: 'transfer',
    initial: 'transfer',
  },
  {
    key: 'recipient',
    type: 'text',
    label: 'Recipient Address',
    placeholder: '0x...',
    initial: '',
  },
  {
    key: 'amount',
    type: 'number',
    label: 'Amount',
    initial: 1,
    min: 0,
  },
])

// Only run on client
if (world.isClient) {
  let isExecuting = false

  // Create UI
  const ui = app.create('ui')
  ui.width = 450
  ui.height = 400
  ui.backgroundColor = 'rgba(0, 15, 30, 0.9)'
  ui.borderRadius = 20
  ui.padding = 20
  ui.billboard = 'full'
  ui.pivot = 'center'
  ui.justifyContent = 'center'
  ui.alignItems = 'center'
  ui.gap = 15
  ui.position.y = 2
  app.add(ui)

  // Title
  const title = app.create('uitext')
  title.value = 'EXECUTE TRANSACTION'
  title.color = '#00ffaa'
  title.fontSize = 24
  title.fontWeight = 'bold'
  ui.add(title)

  // Connection status
  const connectionStatus = app.create('uitext')
  connectionStatus.value = 'Wallet: Not Connected'
  connectionStatus.color = '#ff0000'
  connectionStatus.fontSize = 14
  ui.add(connectionStatus)

  // Transaction info
  const txInfo = app.create('uitext')
  txInfo.value = 'Configure transaction in inspector'
  txInfo.color = '#ffffff'
  txInfo.fontSize = 14
  txInfo.padding = 10
  txInfo.backgroundColor = 'rgba(0, 0, 0, 0.3)'
  txInfo.borderRadius = 5
  ui.add(txInfo)

  // Status text
  const status = app.create('uitext')
  status.value = 'Ready'
  status.color = '#ffffff'
  status.fontSize = 16
  ui.add(status)

  // Transaction hash display
  const txHash = app.create('uitext')
  txHash.value = ''
  txHash.color = '#00ffaa'
  txHash.fontSize = 12
  txHash.active = false
  ui.add(txHash)

  // Connect button
  const connectBtn = app.create('uitext')
  connectBtn.value = '[ CONNECT WALLET ]'
  connectBtn.color = '#00ffaa'
  connectBtn.fontSize = 16
  connectBtn.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  connectBtn.padding = 10
  connectBtn.borderRadius = 6

  connectBtn.onPointerUp = async () => {
    if (!world.web3.isConnected()) {
      try {
        await world.web3.connect()
      } catch (error) {
        console.error('Connection failed:', error)
      }
    }
  }

  ui.add(connectBtn)

  // Execute button
  const executeBtn = app.create('uitext')
  executeBtn.value = '[ EXECUTE TRANSACTION ]'
  executeBtn.color = '#00ffaa'
  executeBtn.fontSize = 18
  executeBtn.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  executeBtn.padding = 12
  executeBtn.borderRadius = 8
  executeBtn.fontWeight = 'bold'
  executeBtn.active = false

  executeBtn.onPointerOver = () => {
    if (!isExecuting) {
      executeBtn.backgroundColor = 'rgba(0, 30, 60, 0.8)'
    }
  }

  executeBtn.onPointerOut = () => {
    executeBtn.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  }

  executeBtn.onPointerDown = () => {
    if (!isExecuting) {
      executeBtn.color = '#ffffff'
    }
  }

  executeBtn.onPointerUp = async () => {
    executeBtn.color = '#00ffaa'

    if (!isExecuting) {
      await executeTransaction()
    }
  }

  ui.add(executeBtn)

  // Execute transaction
  async function executeTransaction() {
    if (!world.web3.isConnected()) {
      status.value = 'Please connect wallet first'
      status.color = '#ff0000'
      return
    }

    if (!props.contractAddress || !props.entrypoint) {
      status.value = 'Please configure contract details'
      status.color = '#ff0000'
      return
    }

    isExecuting = true
    executeBtn.color = '#666666'
    status.value = 'Executing...'
    status.color = '#ffaa00'
    txHash.active = false

    try {
      // Build the transaction call
      const call = {
        contractAddress: props.contractAddress,
        entrypoint: props.entrypoint,
        calldata: [
          props.recipient || '0x0',
          props.amount || 1,
          0, // uint256 high bits (for amounts < 2^128)
        ],
      }

      console.log('Executing transaction:', call)

      // Execute the transaction
      const result = await world.web3.execute(call)

      console.log('Transaction result:', result)

      // Show success
      status.value = 'Transaction Successful!'
      status.color = '#00ff00'

      if (result.transaction_hash) {
        const shortHash = `${result.transaction_hash.slice(0, 10)}...${result.transaction_hash.slice(-8)}`
        txHash.value = `TX: ${shortHash}`
        txHash.active = true
      }

      world.chat('Transaction executed successfully!', true)
    } catch (error) {
      console.error('Transaction failed:', error)
      status.value = 'Transaction Failed'
      status.color = '#ff0000'
      world.chat(`Transaction failed: ${error.message}`, true)
    } finally {
      isExecuting = false
      executeBtn.color = '#00ffaa'
    }
  }

  // Update UI based on connection state
  function updateConnectionUI() {
    if (world.web3.isConnected()) {
      const addr = world.web3.getAddress()
      const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`
      connectionStatus.value = `Wallet: ${shortAddr}`
      connectionStatus.color = '#00ff00'
      connectBtn.active = false
      executeBtn.active = true
    } else {
      connectionStatus.value = 'Wallet: Not Connected'
      connectionStatus.color = '#ff0000'
      connectBtn.active = true
      executeBtn.active = false
    }
  }

  // Update transaction info display
  function updateTxInfo() {
    if (props.contractAddress && props.entrypoint) {
      const shortAddr = `${props.contractAddress.slice(0, 8)}...`
      txInfo.value = `${props.entrypoint}(${shortAddr})\nAmount: ${props.amount}`
    } else {
      txInfo.value = 'Configure transaction in inspector'
    }
  }

  // Listen for wallet events
  world.web3.on('connected', () => {
    updateConnectionUI()
  })

  world.web3.on('disconnected', () => {
    updateConnectionUI()
  })

  world.web3.on('transaction', data => {
    console.log('Transaction event:', data)
  })

  // Listen for config changes
  app.on('config', () => {
    updateTxInfo()
  })

  // Initial setup
  updateConnectionUI()
  updateTxInfo()
}
