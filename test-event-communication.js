// Test script to verify event communication between romDash and stamina-system

app.configure([
  {
    key: 'staminaCost',
    type: 'number',
    label: 'Stamina Cost',
    initial: 30,
  },
  {
    key: 'debugMode',
    type: 'toggle',
    label: 'Debug Mode',
    initial: true,
  },
])

function debugLog(...args) {
  if (config.debugMode) {
    console.log('[EVENT TEST]', ...args)
  }
}

debugLog('=== EVENT COMMUNICATION TEST ===')

if (world.isClient) {
  const player = world.getPlayer()
  const playerId = player.id
  let currentStamina = 100

  debugLog('Player ID:', playerId)
  debugLog('Testing event communication...')

  // Test 1: Listen for ALL stamina events to see if anything fires
  debugLog('\n--- Test 1: Listening for all stamina events ---')

  const allEventHandler = (eventName, data) => {
    debugLog('EVENT RECEIVED:', eventName, data)
  }

  // Listen for all stamina-related events
  world.on('stamina:changed', allEventHandler.bind(null, 'stamina:changed'))
  world.on(`stamina:consume-reply:${playerId}`, (data) => {
    debugLog('REPLY RECEIVED: stamina:consume-reply (no requestId)', data)
  })
  world.on(`stamina:try-consume-reply:${playerId}`, (data) => {
    debugLog('REPLY RECEIVED: stamina:try-consume-reply (no requestId)', data)
  })

  // Test 2: Manually query stamina
  debugLog('\n--- Test 2: Querying stamina ---')
  const queryRequestId = Math.random().toString(36).substr(2, 9)
  debugLog('Emitting stamina:query with requestId:', queryRequestId)

  const queryReplyHandler = (data) => {
    debugLog('QUERY REPLY RECEIVED:', data)
    currentStamina = data.stamina
  }

  world.on(`stamina:query-reply:${playerId}:${queryRequestId}`, queryReplyHandler)
  world.emit(`stamina:query:${playerId}`, { requestId: queryRequestId })

  // Test 3: Try to consume stamina
  setTimeout(() => {
    debugLog('\n--- Test 3: Trying to consume stamina ---')
    const consumeRequestId = Math.random().toString(36).substr(2, 9)
    const staminaCost = config.staminaCost || 30

    debugLog('Current stamina:', currentStamina)
    debugLog('Attempting to consume:', staminaCost)
    debugLog('Emitting stamina:try-consume with requestId:', consumeRequestId)

    const consumeReplyHandler = (data) => {
      debugLog('CONSUME REPLY RECEIVED:', data)
      if (data.success) {
        debugLog('✓ Consumption successful!')
        currentStamina = data.remaining
      } else {
        debugLog('✗ Consumption failed!')
      }
    }

    world.on(`stamina:try-consume-reply:${playerId}:${consumeRequestId}`, consumeReplyHandler)
    world.emit(`stamina:try-consume:${playerId}`, {
      amount: staminaCost,
      requestId: consumeRequestId,
      source: 'test',
    })

    // Test 4: Check stamina after a delay
    setTimeout(() => {
      debugLog('\n--- Test 4: Checking stamina after consumption ---')
      const checkRequestId = Math.random().toString(36).substr(2, 9)

      const checkReplyHandler = (data) => {
        debugLog('CHECK REPLY RECEIVED:', data)
        debugLog('Final stamina:', data.stamina)
      }

      world.on(`stamina:query-reply:${playerId}:${checkRequestId}`, checkReplyHandler)
      world.emit(`stamina:query:${playerId}`, { requestId: checkRequestId })
    }, 1000)
  }, 2000)
}

debugLog('Test script loaded - check console for output')
