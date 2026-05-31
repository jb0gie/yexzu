import { World } from './World'

import { Server } from './systems/Server'
import { ServerLiveKit } from './systems/ServerLiveKit'
import { ServerP2PVoice } from './systems/ServerP2PVoice'
import { ServerNetwork } from './systems/ServerNetwork'
import { ServerLoader } from './systems/ServerLoader'
import { ServerEnvironment } from './systems/ServerEnvironment'
import { ServerMonitor } from './systems/ServerMonitor'
import { ServerAI } from './systems/ServerAI'

export function createServerWorld() {
  const world = new World()
  world.register('server', Server)
  world.register('livekit', process.env.LIVEKIT_API_KEY ? ServerLiveKit : ServerP2PVoice)
  world.register('network', ServerNetwork)
  world.register('loader', ServerLoader)
  world.register('environment', ServerEnvironment)
  world.register('monitor', ServerMonitor)
  world.register('ai', ServerAI)
  return world
}
