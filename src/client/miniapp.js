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

		// Import the Mini App client
		const { MiniAppClient } = await import('./miniapp-client')

		// Configure for Mini App mode
		const wsUrl = (() => {
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
			const host = window.location.host
			return `${protocol}//${host}/ws`
		})()

		function App() {
			return <MiniAppClient
				wsUrl={wsUrl}
				farcasterUser={user}
				miniAppMode={true}
			/>
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