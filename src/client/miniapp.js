// Skip SES and lockdown for Mini App to avoid server dependencies
// import 'ses'
// import '../core/lockdown'
import { createRoot } from 'react-dom/client'
import { sdk } from '@farcaster/miniapp-sdk'

async function initMiniApp() {
	try {
		// Call ready() immediately to hide splash screen
		await sdk.actions.ready()
		console.log('Farcaster Mini App ready() called')

		// Get Farcaster context and user info
		const context = await sdk.context
		const user = context.user
		console.log('Farcaster user context:', user)

		// Use the simple world client instead of FarcasterClient
		const { Client } = await import('./world-client')

		// Simple WebSocket URL for Mini App
		const wsUrl = (() => {
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
			const host = window.location.host
			return `${protocol}//${host}/ws`
		})()

		function App() {
			return <Client wsUrl={wsUrl} />
		}

		const root = createRoot(document.getElementById('root'))
		root.render(<App />)

	} catch (error) {
		console.error('Failed to initialize Farcaster Mini App:', error)

		// Try to call ready() even if initialization failed
		try {
			await sdk.actions.ready()
			console.log('Farcaster ready() called in fallback')
		} catch (readyError) {
			console.error('Failed to call ready() in fallback:', readyError)
		}

		// Fallback to regular client
		const { Client } = await import('./world-client')

		const wsUrl = (() => {
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
			const host = window.location.host
			return `${protocol}//${host}/ws`
		})()

		function FallbackApp() {
			return <Client wsUrl={wsUrl} />
		}

		const root = createRoot(document.getElementById('root'))
		root.render(<FallbackApp />)
	}
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initMiniApp)
} else {
	initMiniApp()
} 