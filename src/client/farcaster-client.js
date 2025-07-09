import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState } from 'react'
import { css } from '@firebolt-dev/css'
import { sdk } from '@farcaster/miniapp-sdk'

import { createClientWorld } from '../core/createClientWorld'
import { CoreUI } from './components/CoreUI'
import { FarcasterOverlay } from './components/FarcasterOverlay'

export function FarcasterClient({ config }) {
  const viewportRef = useRef()
  const uiRef = useRef()
  const world = useMemo(() => createClientWorld(), [])
  const [ui, setUI] = useState(world.ui.state)
  const [farcasterContext, setFarcasterContext] = useState(null)

  // Listen for UI state changes
  useEffect(() => {
    world.on('ui', setUI)
    return () => {
      world.off('ui', setUI)
    }
  }, [])

  // Get Farcaster context
  useEffect(() => {
    const getFarcasterContext = async () => {
      try {
        const context = await sdk.context
        setFarcasterContext(context)
      } catch (error) {
        console.error('Failed to get Farcaster context:', error)
      }
    }
    getFarcasterContext()
  }, [])

  useEffect(() => {
    const init = async () => {
      const viewport = viewportRef.current
      const ui = uiRef.current
      
      // Base environment optimized for Mini Apps
      const baseEnvironment = {
        model: '/base-environment.glb',
        bg: '/day2-2k.jpg',
        hdr: '/day2.hdr',
        sunDirection: new THREE.Vector3(-1, -2, -2).normalize(),
        sunIntensity: config.miniAppMode ? 0.8 : 1, // Reduced intensity for embedded mode
        sunColor: 0xffffff,
        fogNear: null,
        fogFar: null,
        fogColor: null,
      }

      // Determine WebSocket URL
      let wsUrl = config.wsUrl
      if (typeof wsUrl === 'function') {
        wsUrl = wsUrl()
        if (wsUrl instanceof Promise) wsUrl = await wsUrl
      }

      const worldConfig = {
        viewport,
        ui,
        wsUrl,
        baseEnvironment,
        // Farcaster-specific configuration
        farcasterUser: config.farcasterUser,
        miniAppMode: config.miniAppMode,
        performanceProfile: config.performanceProfile || 'balanced'
      }

      // Initialize the world with Farcaster context
      world.init(worldConfig)

      // Add Farcaster-specific features
      if (farcasterContext) {
        world.emit('farcaster:ready', {
          user: farcasterContext.user,
          client: farcasterContext.client
        })
      }
    }
    
    init()
  }, [farcasterContext])

  return (
    <div
      className='FarcasterApp'
      css={css`
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 100vh;
        height: 100dvh;
        .FarcasterApp__viewport {
          position: absolute;
          inset: 0;
        }
        .FarcasterApp__ui {
          position: absolute;
          inset: 0;
          pointer-events: none;
          user-select: none;
          display: ${ui.visible ? 'block' : 'none'};
        }
        .FarcasterApp__overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          pointer-events: none;
        }
      `}
    >
      <div className='FarcasterApp__viewport' ref={viewportRef}>
        <div className='FarcasterApp__ui' ref={uiRef}>
          <CoreUI world={world} />
        </div>
        <div className='FarcasterApp__overlay'>
          <FarcasterOverlay 
            world={world} 
            farcasterContext={farcasterContext}
            config={config}
          />
        </div>
      </div>
    </div>
  )
} 