import { useEffect, useRef } from 'react'
import { css } from '@firebolt-dev/css'
import { HeadScreen } from './components/HeadScreen'
import { IdleManager } from './animations/IdleManager'
import { config } from './config'

const styles = {
  container: css`
    position: relative;
    width: 100%;
    height: 100%;
  `
}

export function HyperFone({ world }) {
  const idleManagerRef = useRef(null)

  useEffect(() => {
    const idleManager = new IdleManager(world)
    idleManagerRef.current = idleManager
    const cleanup = idleManager.init()
    return () => cleanup?.()
  }, [world])

  if (!world.avatar?.object) return null

  return (
    <div css={styles.container}>
      <HeadScreen
        world={world}
        player={world.avatar.object}
        content={world.avatar.status || ''}
      />
      {world.players?.map(player => (
        <HeadScreen
          key={player.id}
          world={world}
          player={player.object}
          content={player.status || ''}
        />
      ))}
    </div>
  )
}

export { config } 