// Skip SES and lockdown for Mini App to avoid server dependencies
// import 'ses'
// import '../core/lockdown'
import { createRoot } from 'react-dom/client'
import { sdk } from '@farcaster/miniapp-sdk'

import { FarcasterClient } from './farcaster-client'

async function initMiniApp() {
	try {
		// Get Farcaster context and user info
		const context = await sdk.context
		const user = context.user

		// Configure the Mini App for embedded mode
		const config = {
			// Use relative WebSocket URL since Mini Apps run in embedded context
			wsUrl: () => {
				const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
				const host = window.location.host
				return `${protocol}//${host}/ws`
			},
			// Pass Farcaster user context
			farcasterUser: user,
			// Enable Mini App optimizations
			miniAppMode: true,
			// Reduced quality for embedded context
			performanceProfile: 'balanced'
		}

		function App() {
			return <FarcasterClient config={config} />
		}

		const root = createRoot(document.getElementById('root'))
		root.render(<App />)

		// Notify Farcaster that the Mini App is ready
		await sdk.actions.ready()

	} catch (error) {
		console.error('Failed to initialize Farcaster Mini App:', error)
		// Fallback to regular client if Farcaster context unavailable
		const { Client } = await import('./world-client')

		function FallbackApp() {
			return <Client wsUrl={env.PUBLIC_WS_URL} />
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