// Skip SES and lockdown for Mini App to avoid server dependencies
// import 'ses'
// import '../core/lockdown'
import { createRoot } from 'react-dom/client'
import { sdk } from '@farcaster/miniapp-sdk'

async function initMiniApp() {
	try {
		// Get Farcaster context and user info
		const context = await sdk.context
		const user = context.user

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

		// Notify Farcaster that the Mini App is ready
		await sdk.actions.ready()

	} catch (error) {
		console.error('Failed to initialize Farcaster Mini App:', error)
		// Fallback to regular client
		const { Client } = await import('./world-client')

		function FallbackApp() {
			return <Client wsUrl={window.env?.PUBLIC_WS_URL || 'ws://localhost:3000/ws'} />
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