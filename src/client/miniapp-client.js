import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState } from 'react'
import { css } from '@firebolt-dev/css'

import { createMiniAppWorld } from '../core/createMiniAppWorld'
import { CoreUI } from './components/CoreUI'

export function MiniAppClient({ wsUrl, farcasterUser, miniAppMode }) {
	const viewportRef = useRef()
	const uiRef = useRef()
	const world = useMemo(() => createMiniAppWorld(), [])
	const [ui, setUI] = useState(world.ui.state)

	useEffect(() => {
		world.on('ui', setUI)
		return () => {
			world.off('ui', setUI)
		}
	}, [])

	useEffect(() => {
		const init = async () => {
			const viewport = viewportRef.current
			const ui = uiRef.current

			// Optimized environment for Mini App
			const baseEnvironment = {
				model: '/base-environment.glb',
				bg: '/day2-2k.jpg',
				hdr: '/day2.hdr',
				sunDirection: new THREE.Vector3(-1, -2, -2).normalize(),
				sunIntensity: 0.8, // Reduced for embedded mode
				sunColor: 0xffffff,
				fogNear: null,
				fogFar: null,
				fogColor: null,
			}

			if (typeof wsUrl === 'function') {
				wsUrl = wsUrl()
				if (wsUrl instanceof Promise) wsUrl = await wsUrl
			}

			const config = {
				viewport,
				ui,
				wsUrl,
				baseEnvironment,
				// Mini App specific config
				farcasterUser,
				miniAppMode: true,
				performanceProfile: 'balanced'
			}

			world.init(config)
		}
		init()
	}, [wsUrl, farcasterUser, miniAppMode])

	return (
		<div
			className='MiniApp'
			css={css`
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 100vh;
        height: 100dvh;
        .MiniApp__viewport {
          position: absolute;
          inset: 0;
        }
        .MiniApp__ui {
          position: absolute;
          inset: 0;
          pointer-events: none;
          user-select: none;
          display: ${ui.visible ? 'block' : 'none'};
        }
      `}
		>
			<div className='MiniApp__viewport' ref={viewportRef}>
				<div className='MiniApp__ui' ref={uiRef}>
					<CoreUI world={world} />
				</div>
			</div>
		</div>
	)
} 