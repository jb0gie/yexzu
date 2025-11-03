#!/usr/bin/env node

// Simple test to verify AI functionality
// Run with: npm run test-ai

import { createServerWorld } from './src/core/createServerWorld.js'

console.log('🧪 Testing AI System Configuration...')

// Check environment variables
const requiredEnvVars = {
  AI_PROVIDER: process.env.AI_PROVIDER,
  AI_MODEL: process.env.AI_MODEL,
  AI_API_KEY: process.env.AI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
}

console.log('\n📋 Environment Variables:')
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (value) {
    console.log(`✅ ${key}: ${key === 'AI_API_KEY' ? '***' + value.slice(-4) : value}`)
  } else {
    console.log(`❌ ${key}: NOT SET`)
  }
})

// Test creating the server world to see if AI system initializes
console.log('\n🌐 Testing Server World Creation...')

try {
  const world = createServerWorld()

  console.log('✅ Server world created successfully')
  console.log('📋 Available systems:', Object.keys(world.systems))

  if (world.systems.ai) {
    const aiSystem = world.systems.ai
    console.log('✅ AI system found!')
    console.log('📊 AI System Status:', aiSystem.serialize())
    console.log('🔧 AI System Enabled:', aiSystem.enabled)
  } else {
    console.log('❌ AI system not found in world')
  }

} catch (error) {
  console.error('❌ Error creating server world:', error.message)
  console.error(error.stack)
}

console.log('\n✅ Test complete!')
console.log('\n💡 To test the actual AI functionality:')
console.log('1. Set the required environment variables')
console.log('2. Start the server: npm run dev')
console.log('3. In-game, type: /create make a red bouncing ball')
console.log('4. Check server logs for AI generation progress')