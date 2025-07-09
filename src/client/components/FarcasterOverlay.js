import { useState, useEffect } from 'react'
import { css } from '@firebolt-dev/css'
import { sdk } from '@farcaster/miniapp-sdk'
import { Share, User, Home, ExternalLink } from 'lucide-react'

export function FarcasterOverlay({ world, farcasterContext, config }) {
	const [isVisible, setIsVisible] = useState(true)
	const [canShare, setCanShare] = useState(false)

	useEffect(() => {
		// Check if sharing is available
		const checkShareCapability = async () => {
			try {
				await sdk.actions.openUrl('https://example.com')
				setCanShare(true)
			} catch {
				setCanShare(false)
			}
		}
		checkShareCapability()
	}, [])

	const handleShare = async () => {
		try {
			// Create a shareable cast about the current world experience
			const worldName = world?.stage?.name || 'Hyperfy World'
			const shareText = `Just joined "${worldName}" - an interactive 3D virtual world on Hyperfy! 🌍✨`

			// Open Farcaster composer with pre-filled text
			await sdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`)
		} catch (error) {
			console.error('Failed to share:', error)
		}
	}

	const handleOpenFullApp = async () => {
		try {
			// Open the full Hyperfy app
			const currentUrl = window.location.origin
			await sdk.actions.openUrl(currentUrl)
		} catch (error) {
			console.error('Failed to open full app:', error)
		}
	}

	if (!isVisible || !farcasterContext) return null

	return (
		<div
			css={css`
        position: absolute;
        top: 16px;
        right: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 1000;
      `}
		>
			{/* User Identity Badge */}
			<div
				css={css`
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 8px 12px;
          color: white;
          font-size: 14px;
          pointer-events: auto;
        `}
			>
				<User size={16} />
				<span>{farcasterContext.user?.displayName || farcasterContext.user?.username || 'Anonymous'}</span>
			</div>

			{/* Action Buttons */}
			<div
				css={css`
          display: flex;
          gap: 8px;
        `}
			>
				{/* Share Button */}
				{canShare && (
					<button
						onClick={handleShare}
						css={css`
              display: flex;
              align-items: center;
              justify-content: center;
              width: 40px;
              height: 40px;
              background: rgba(139, 69, 19, 0.9);
              border: none;
              border-radius: 20px;
              color: white;
              cursor: pointer;
              backdrop-filter: blur(10px);
              pointer-events: auto;
              transition: all 0.2s ease;
              
              &:hover {
                background: rgba(139, 69, 19, 1);
                transform: translateY(-1px);
              }
              
              &:active {
                transform: translateY(0);
              }
            `}
						title="Share this world"
					>
						<Share size={18} />
					</button>
				)}

				{/* Open Full App Button */}
				<button
					onClick={handleOpenFullApp}
					css={css`
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            background: rgba(88, 101, 242, 0.9);
            border: none;
            border-radius: 20px;
            color: white;
            cursor: pointer;
            backdrop-filter: blur(10px);
            pointer-events: auto;
            transition: all 0.2s ease;
            
            &:hover {
              background: rgba(88, 101, 242, 1);
              transform: translateY(-1px);
            }
            
            &:active {
              transform: translateY(0);
            }
          `}
					title="Open full Hyperfy app"
				>
					<ExternalLink size={18} />
				</button>
			</div>

			{/* Mini App Badge */}
			<div
				css={css`
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 4px 8px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 11px;
          text-align: center;
          pointer-events: none;
          user-select: none;
        `}
			>
				Hyperfy Mini App
			</div>
		</div>
	)
} 