import 'ses'
import '../core/lockdown'
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

		// Load the full Hyperfy client
		const { Client } = await import('./world-client')

		function HyperfyMiniApp() {
			return <Client wsUrl={env.PUBLIC_WS_URL} />
		}

		const root = createRoot(document.getElementById('root'))
		root.render(<HyperfyMiniApp />)

	} catch (error) {
		console.error('Failed to initialize Farcaster Mini App:', error)

		// Try to call ready() even if initialization failed
		try {
			await sdk.actions.ready()
			console.log('Farcaster ready() called in fallback')
		} catch (readyError) {
			console.error('Failed to call ready() in fallback:', readyError)
		}

		// Simple fallback interface if the full client fails
		function YexzuFallback() {
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
					fontFamily: 'system-ui, -apple-system, sans-serif',
					textAlign: 'center',
					padding: '20px',
					minHeight: '100vh'
				}}>
					<div style={{
						background: 'rgba(255,255,255,0.1)',
						borderRadius: '20px',
						padding: '40px',
						maxWidth: '400px',
						width: '100%',
						backdropFilter: 'blur(10px)',
						border: '1px solid rgba(255,255,255,0.2)'
					}}>
						<div style={{ fontSize: '48px', marginBottom: '20px' }}>🌍</div>
						<h1 style={{
							fontSize: '28px',
							marginBottom: '16px',
							fontWeight: 'bold',
							margin: '0 0 16px 0'
						}}>
							Yexzu World
						</h1>
						<p style={{
							fontSize: '16px',
							marginBottom: '20px',
							opacity: 0.9,
							lineHeight: '1.5',
							margin: '0 0 20px 0'
						}}>
							Loading the full 3D experience...
						</p>

						<a
							href="https://miniappworld.255242621.xyz"
							target="_blank"
							rel="noopener noreferrer"
							style={{
								display: 'inline-block',
								background: 'rgba(255,255,255,0.9)',
								color: '#4c1d95',
								border: 'none',
								borderRadius: '12px',
								padding: '16px 32px',
								textDecoration: 'none',
								fontSize: '16px',
								fontWeight: 'bold',
								cursor: 'pointer',
								transition: 'all 0.3s ease',
								boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
							}}
						>
							🚀 Try Full Browser Version
						</a>

						<p style={{
							fontSize: '12px',
							marginTop: '20px',
							opacity: 0.6,
							lineHeight: '1.4',
							margin: '20px 0 0 0'
						}}>
							If loading takes too long, try the browser version
						</p>
					</div>
				</div>
			)
		}

		const root = createRoot(document.getElementById('root'))
		root.render(<YexzuFallback />)
	}
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initMiniApp)
} else {
	initMiniApp()
} 