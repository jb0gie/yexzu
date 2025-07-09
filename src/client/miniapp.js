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

		// Check if we're in a sandboxed environment (Farcaster iframe)
		const isSandboxed = (() => {
			try {
				// Test if pointer lock would be available
				return !document.body.requestPointerLock ||
					window.location !== window.parent.location ||
					window.self !== window.top
			} catch (e) {
				return true
			}
		})()

		if (isSandboxed) {
			console.log('Detected sandboxed environment - showing browser redirect interface')

			// Show interface that directs to full browser experience
			function FarcasterMiniApp() {
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
								farcasterfy
							</h1>
							<p style={{
								fontSize: '16px',
								marginBottom: '20px',
								opacity: 0.9,
								lineHeight: '1.5',
								margin: '0 0 20px 0'
							}}>
								Experience the the living web.
							</p>

							{user && (
								<p style={{
									fontSize: '14px',
									marginBottom: '24px',
									opacity: 0.7,
									background: 'rgba(255,255,255,0.1)',
									padding: '8px 16px',
									borderRadius: '12px',
									margin: '0 0 24px 0'
								}}>
									Welcome, {user.displayName || user.username || 'Farcaster User'}! 👋
								</p>
							)}

							<a
								href="https://miniappworld.255242621.xyz?full=true"
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
									boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
									marginBottom: '16px'
								}}
							>
								🚀 Enter Full World
							</a>

							<p style={{
								fontSize: '12px',
								marginTop: '16px',
								opacity: 0.6,
								lineHeight: '1.4',
								margin: '16px 0 0 0'
							}}>
								Full 3D controls, camera movement, and building tools available in browser
							</p>
						</div>
					</div>
				)
			}

			const root = createRoot(document.getElementById('root'))
			root.render(<FarcasterMiniApp />)

		} else {
			console.log('Full environment detected - loading complete Hyperfy client')

			// Load the full Hyperfy client only if not sandboxed
			const { Client } = await import('./world-client')

			function HyperfyMiniApp() {
				return <Client wsUrl={env.PUBLIC_WS_URL} />
			}

			const root = createRoot(document.getElementById('root'))
			root.render(<HyperfyMiniApp />)
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

		// Simple fallback interface if everything fails
		function ErrorFallback() {
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
					fontFamily: 'system-ui, sans-serif',
					textAlign: 'center',
					padding: '20px'
				}}>
					<div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
					<h1 style={{ fontSize: '24px', marginBottom: '16px', margin: '0 0 16px 0' }}>
						Loading Issue
					</h1>
					<p style={{ fontSize: '16px', marginBottom: '20px', opacity: 0.8, margin: '0 0 20px 0' }}>
						Having trouble loading the app.
					</p>
					<a
						href="https://miniappworld.255242621.xyz?full=true"
						target="_blank"
						rel="noopener noreferrer"
						style={{
							background: '#4f46e5',
							color: 'white',
							border: 'none',
							borderRadius: '8px',
							padding: '12px 24px',
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
		root.render(<ErrorFallback />)
	}
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initMiniApp)
} else {
	initMiniApp()
} 