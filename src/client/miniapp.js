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

		// Try the full miniapp client first
		try {
			const { MiniAppClient } = await import('./miniapp-client')

			// Simple WebSocket URL for Mini App
			const wsUrl = (() => {
				const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
				const host = window.location.host
				return `${protocol}//${host}/ws`
			})()

			function App() {
				return <MiniAppClient wsUrl={wsUrl} />
			}

			const root = createRoot(document.getElementById('root'))
			root.render(<App />)

		} catch (clientError) {
			console.error('MiniAppClient failed, using simple fallback:', clientError)

			// Ultra-simple fallback for Farcaster context
			function SimpleFallback() {
				return (
					<div style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						color: 'white',
						fontFamily: 'Arial, sans-serif',
						textAlign: 'center',
						padding: '20px'
					}}>
						<h1 style={{ fontSize: '24px', marginBottom: '16px' }}>🎮 farcasterfy</h1>
						<p style={{ fontSize: '16px', marginBottom: '20px', opacity: 0.8 }}>
							Welcome to the 3D social metaverse!
						</p>
						<p style={{ fontSize: '14px', marginBottom: '20px', opacity: 0.6 }}>
							Connected as: {user?.displayName || user?.username || 'Farcaster User'}
						</p>
						<a
							href="https://miniappworld.255242621.xyz"
							target="_blank"
							rel="noopener noreferrer"
							style={{
								background: 'rgba(255,255,255,0.2)',
								border: '2px solid rgba(255,255,255,0.3)',
								borderRadius: '8px',
								padding: '12px 24px',
								color: 'white',
								textDecoration: 'none',
								fontSize: '16px',
								fontWeight: 'bold',
								transition: 'all 0.3s ease'
							}}
						>
							🚀 Open Full World
						</a>
						<p style={{ fontSize: '12px', marginTop: '20px', opacity: 0.5 }}>
							For the full 3D experience, open in your browser
						</p>
					</div>
				)
			}

			const root = createRoot(document.getElementById('root'))
			root.render(<SimpleFallback />)
		}

	} catch (error) {
		console.error('Failed to initialize Farcaster Mini App:', error)

		// Try to call ready() even if initialization failed
		try {
			await sdk.actions.ready()
			console.log('Farcaster ready() called in fallback')
		} catch (readyError) {
			console.error('Failed to call ready() in fallback:', readyError)
		}

		// Ultimate fallback - just a simple message
		function UltimateFallback() {
			return (
				<div style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: '#1a1a1a',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					color: 'white',
					fontFamily: 'Arial, sans-serif',
					textAlign: 'center',
					padding: '20px'
				}}>
					<h1 style={{ fontSize: '24px', marginBottom: '16px' }}>⚠️ Loading Issue</h1>
					<p style={{ fontSize: '16px', marginBottom: '20px', opacity: 0.8 }}>
						The Mini App is having trouble loading in this context.
					</p>
					<a
						href="https://miniappworld.255242621.xyz"
						target="_blank"
						rel="noopener noreferrer"
						style={{
							background: '#4f46e5',
							border: 'none',
							borderRadius: '8px',
							padding: '12px 24px',
							color: 'white',
							textDecoration: 'none',
							fontSize: '16px',
							fontWeight: 'bold'
						}}
					>
						🌐 Open in Browser
					</a>
				</div>
			)
		}

		const root = createRoot(document.getElementById('root'))
		root.render(<UltimateFallback />)
	}
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initMiniApp)
} else {
	initMiniApp()
} 