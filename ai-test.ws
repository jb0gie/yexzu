// WebSocket test for AI functionality
// Open browser console and run this to test AI:

const ws = new WebSocket('ws://localhost:3012')
ws.onopen = () => {
  console.log('Connected to server')

  // Send initial connection packet
  ws.send(JSON.stringify({
    name: 'params',
    data: {
      name: 'TestUser',
      authToken: null
    }
  }))

  setTimeout(() => {
    // Test AI create command
    console.log('Sending AI create command...')
    ws.send(JSON.stringify({
      name: 'command',
      data: {
        args: ['/create', 'make', 'a', 'red', 'bouncing', 'ball']
      }
    }))
  }, 1000)
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Received:', data)
}

ws.onerror = (error) => {
  console.error('WebSocket error:', error)
}