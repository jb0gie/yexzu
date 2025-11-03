#!/usr/bin/env node

// Test OpenRouter connectivity
import { OpenAI } from 'openai'

console.log('🌐 Testing OpenRouter API Connection...')

// Use your current environment configuration
const client = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

console.log('📋 Configuration:')
console.log('  Provider:', process.env.AI_PROVIDER)
console.log('  Model:', process.env.AI_MODEL)
console.log('  Base URL:', process.env.OPENAI_BASE_URL)

async function testConnection() {
  try {
    console.log('\n🧪 Testing Chat Completions API...')

    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL,
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from OpenRouter" and nothing else.'
        }
      ],
      max_tokens: 50,
    })

    console.log('✅ Connection successful!')
    console.log('📝 Response:', response.choices[0].message.content)
    console.log('🔤 Model used:', response.model)

  } catch (error) {
    console.error('❌ Connection failed!')
    console.error('Error:', error.message)
    if (error.status) console.error('HTTP Status:', error.status)
    if (error.code) console.error('Error Code:', error.code)
  }
}

testConnection()