// Test script to verify integration between romDash and stamina-system
// This script loads both and tests them together

debugLog('=== INTEGRATION TEST STARTING ===')

// Check if we're in the right environment
if (!world.isClient) {
  debugLog('Not running on client - test cannot proceed')
  return
}

const player = world.getPlayer()
debugLog('Player:', player)
debugLog('Player ID:', player?.id)

// Test the integration
debugLog('\n=== TESTING INTEGRATION ===')

// First, check if stamina system is loaded
debugLog('Checking for stamina system...')

// Query stamina system
const requestId = Math.random().toString(36).substr(2, 9)
debugLog('Sending test query with requestId:', requestId)

const replyHandler = (data) => {
  debugLog('Query reply received:', data)
  world.off(`stamina:query-reply:${player.id}:${requestId}`, replyHandler)

  if (data && data.stamina !== undefined) {
    debugLog('✅ Stamina system is responding!')
    debugLog('Current stamina:', data.stamina)
    debugLog('Max stamina:', data.maxStamina)
  } else {
    debugLog('❌ Stamina system replied but with invalid data')
  }
}

world.on(`stamina:query-reply:${player.id}:${requestId}`, replyHandler)
world.emit(`stamina:query:${player.id}`, { requestId })

// Try to consume stamina
debugLog('\nTesting stamina consumption in 2 seconds...')

setTimeout(() => {
  debugLog('\n=== TESTING STAMINA CONSUMPTION ===')

  const consumeRequestId = Math.random().toString(36).substr(2, 9)
  const testAmount = 10

  debugLog('Attempting to consume:', testAmount)
  debugLog('Request ID:', consumeRequestId)

  const consumeReplyHandler = (data) => {
    debugLog('\n=== CONSUME REPLY RECEIVED ===')
    debugLog('Full data:', data)

    if (!data) {
      debugLog('❌ ERROR: No data in reply!')
      return
    }

    debugLog('Success:', data.success)
    debugLog('Remaining:', data.remaining)

    if (data.success) {
      debugLog('✅ Consumption successful!')
    } else {
      debugLog('❌ Consumption failed - not enough stamina')
    }

    // Check stamina again after consumption
    setTimeout(() => {
      debugLog('\n=== CHECKING STAMINA AFTER CONSUMPTION ===')
      const checkRequestId = Math.random().toString(36).substr(2, 9)

      const checkReplyHandler = (checkData) => {
        debugLog('Stamina after consumption:', checkData.stamina)
      }

      world.on(`stamina:query-reply:${player.id}:${checkRequestId}`, checkReplyHandler)
      world.emit(`stamina:query:${player.id}`, { requestId: checkRequestId })
    }, 1000)
  }

  world.on(`stamina:try-consume-reply:${player.id}:${consumeRequestId}`, consumeReplyHandler)
  world.emit(`stamina:try-consume:${player.id}`, {
    amount: testAmount,
    requestId: consumeRequestId,
    source: 'integration-test'
  })

  debugLog('Consume event emitted - waiting for reply...')
}, 2000)

debugLog('\n=== TEST SCRIPT LOADED ===')
debugLog('Monitor console output to see if events are being received and replied to')
