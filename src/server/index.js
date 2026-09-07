import 'ses'
import '../core/lockdown'
import './bootstrap'

import fs from 'fs-extra'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import Fastify from 'fastify'
import ws from '@fastify/websocket'
import cors from '@fastify/cors'
import compress from '@fastify/compress'
import statics from '@fastify/static'
import multipart from '@fastify/multipart'

import { createServerWorld } from '../core/createServerWorld'
import { getDB } from './db'
import { Storage } from './Storage'
import { assets } from './assets'
import { collections } from './collections'
import { cleaner } from './cleaner'

const execAsync = promisify(exec)

const rootDir = path.join(__dirname, '../')
const worldDir = path.join(rootDir, process.env.WORLD)
const port = process.env.PORT

// check envs
if (!process.env.WORLD) {
  throw new Error('[envs] WORLD not set')
}
if (!process.env.PORT) {
  throw new Error('[envs] PORT not set')
}
if (!process.env.JWT_SECRET) {
  throw new Error('[envs] JWT_SECRET not set')
}
if (!process.env.ADMIN_CODE) {
  console.warn('[envs] ADMIN_CODE not set - all users will have admin permissions!')
}
if (!process.env.SAVE_INTERVAL) {
  throw new Error('[envs] SAVE_INTERVAL not set')
}
if (!process.env.PUBLIC_MAX_UPLOAD_SIZE) {
  throw new Error('[envs] PUBLIC_MAX_UPLOAD_SIZE not set')
}
if (!process.env.PUBLIC_WS_URL) {
  throw new Error('[envs] PUBLIC_WS_URL not set')
}
if (!process.env.PUBLIC_WS_URL.startsWith('ws')) {
  throw new Error('[envs] PUBLIC_WS_URL must start with ws:// or wss://')
}
if (!process.env.PUBLIC_API_URL) {
  throw new Error('[envs] PUBLIC_API_URL must be set')
}
if (!process.env.ASSETS) {
  throw new Error(`[envs] ASSETS must be set to 'local' or 's3'`)
}
if (!process.env.ASSETS_BASE_URL) {
  throw new Error(`[envs] ASSETS_BASE_URL must be set`)
}
if (process.env.ASSETS === 's3' && !process.env.ASSETS_S3_URI) {
  throw new Error(`[envs] ASSETS_S3_URI must be set when using ASSETS=s3`)
}

const fastify = Fastify({ logger: { level: 'error' } })

// create world folder if needed
await fs.ensureDir(worldDir)

// init assets
await assets.init({ rootDir, worldDir })

// init collections
await collections.init({ rootDir, worldDir })

// init db
const db = await getDB({ worldDir })

// init cleaner
await cleaner.init({ db })

// init storage
const storage = new Storage(path.join(worldDir, '/storage.json'))

// create world
const world = createServerWorld()
await world.init({
  assetsDir: assets.dir,
  assetsUrl: assets.url,
  db,
  assets,
  storage,
  collections: collections.list,
})

fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || true,
})
fastify.register(compress)
fastify.get('/', async (req, reply) => {
  const title = world.settings.title || 'World'
  const desc = world.settings.desc || ''
  const image = world.resolveURL(world.settings.image?.url) || ''
  const url = process.env.ASSETS_BASE_URL
  const filePath = path.join(__dirname, 'public', 'index.html')
  let html = fs.readFileSync(filePath, 'utf-8')
  html = html.replaceAll('{url}', url)
  html = html.replaceAll('{title}', title)
  html = html.replaceAll('{desc}', desc)
  html = html.replaceAll('{image}', image)
  reply.type('text/html').send(html)
})
fastify.register(statics, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
  decorateReply: false,
  setHeaders: res => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
  },
})
if (world.assetsDir) {
  fastify.register(statics, {
    root: world.assetsDir,
    prefix: '/assets/',
    decorateReply: false,
    setHeaders: res => {
      // all assets are hashed & immutable so we can use aggressive caching
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable') // 1 year
      res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString()) // older browsers
    },
  })
}
fastify.register(multipart, {
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },
})
fastify.register(ws)
fastify.register(worldNetwork)

const publicEnvs = {}
for (const key in process.env) {
  if (key.startsWith('PUBLIC_')) {
    const value = process.env[key]
    publicEnvs[key] = value
  }
}
const envsCode = `
  if (!globalThis.env) globalThis.env = {}
  globalThis.env = ${JSON.stringify(publicEnvs)}
`
fastify.get('/env.js', async (req, reply) => {
  reply.type('application/javascript').send(envsCode)
})

fastify.post('/api/upload', async (req, reply) => {
  const mp = await req.file()
  // collect into buffer
  const chunks = []
  for await (const chunk of mp.file) {
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)
  // convert to file
  const file = new File([buffer], mp.filename, {
    type: mp.mimetype || 'application/octet-stream',
  })
  // upload
  await assets.upload(file)
})

fastify.get('/api/upload-check', async (req, reply) => {
  const exists = await assets.exists(req.query.filename)
  return { exists }
})

fastify.get('/api/backup', async (req, reply) => {
  if (!process.env.ADMIN_CODE || req.query.adminCode !== process.env.ADMIN_CODE) {
    return reply.code(401).send({ error: 'Invalid admin code' })
  }
  const zipPath = path.join(rootDir, 'world-backup.zip')
  // remove old zip if exists
  await fs.remove(zipPath)
  // create zip from world directory and wait for it to finish
  await execAsync(`zip -r "${zipPath}" .`, { cwd: worldDir })
  // read the completed file
  const buffer = await fs.readFile(zipPath)
  // clean up
  await fs.remove(zipPath)
  // send it
  reply.type('application/zip')
  reply.header('Content-Disposition', 'attachment; filename="world-backup.zip"')
  return reply.send(buffer)
})

fastify.post('/api/restore', async (req, reply) => {
  if (!process.env.ADMIN_CODE || req.query.adminCode !== process.env.ADMIN_CODE) {
    return reply.code(401).send({ error: 'Invalid admin code' })
  }
  const mp = await req.file()
  const zipPath = path.join(rootDir, 'restore-upload.zip')
  // save uploaded file
  const chunks = []
  for await (const chunk of mp.file) {
    chunks.push(chunk)
  }
  await fs.writeFile(zipPath, Buffer.concat(chunks))
  // clear and restore
  await fs.emptyDir(worldDir)
  await execAsync(`unzip -o "${zipPath}" -d "${worldDir}"`)
  await fs.remove(zipPath)
  return { success: true, message: 'World restored. Restart server to apply changes.' }
})

// audio proxy — re-serve remote audio with OUR origin so the client can pipe
// it into WebAudio (CORS is granted by the serving origin; this route makes
// any direct audio URL same-origin to the world client). Full rig mode for
// any direct stream URL: spatial, clock-synced, reactive.
const ALLOWED_AUDIO_HOSTS = process.env.AUDIO_PROXY_HOSTS
  ? process.env.AUDIO_PROXY_HOSTS.split(',').map(h => h.trim().toLowerCase())
  : null // null = allow all hosts (set a comma list to lock it down)

const AUDIO_PROXY_MAX = 100 * 1024 * 1024 // 100MB response cap

fastify.get('/api/audio-proxy', async (req, reply) => {
  const target = req.query.url
  if (!target) return reply.code(400).send({ error: 'missing ?url=' })
  let parsed
  try {
    parsed = new URL(target)
  } catch {
    return reply.code(400).send({ error: 'invalid url' })
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return reply.code(400).send({ error: 'only http/https' })
  }
  // block private ranges — an open proxy into 169.254.169.254 etc is an SSRF hole
  const host = parsed.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return reply.code(403).send({ error: 'private hosts not allowed' })
  }
  if (ALLOWED_AUDIO_HOSTS && !ALLOWED_AUDIO_HOSTS.includes(host)) {
    return reply.code(403).send({ error: `host not allowed (AUDIO_PROXY_HOSTS)` })
  }
  try {
    const upstream = await fetch(parsed, {
      headers: { Range: req.headers.range || 'bytes=0-' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })
    if (!upstream.ok && upstream.status !== 206) {
      return reply.code(upstream.status).send({ error: `upstream ${upstream.status}` })
    }
    const headers = {
      // the whole point: same-origin + readable for WebAudio
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Accept-Ranges': upstream.headers.get('accept-ranges') || 'bytes',
      'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
    }
    const cr = upstream.headers.get('content-range')
    if (cr) headers['Content-Range'] = cr
    const cl = upstream.headers.get('content-length')
    if (cl && Number(cl) <= AUDIO_PROXY_MAX) headers['Content-Length'] = cl
    reply.code(upstream.status).headers(headers)
    return reply.send(upstream.body)
  } catch (err) {
    return reply.code(502).send({ error: `upstream failed: ${err.message}` })
  }
})

// audio metadata — ID3/Vorbis tags via music-metadata (server-side; app
// scripts are SES and cannot import()). Pairs with /api/audio-proxy: this
// grants the WORLD the track, this grants the RIG the tags.
const metadataCache = new Map() // url -> { title, artist, album } | null

fastify.get('/api/audio-meta', async (req, reply) => {
  const target = req.query.url
  if (!target) return reply.code(400).send({ error: 'missing ?url=' })
  let parsed
  try {
    parsed = new URL(target)
  } catch {
    return reply.code(400).send({ error: 'invalid url' })
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return reply.code(400).send({ error: 'only http/https' })
  }
  if (metadataCache.has(target)) {
    return reply.send(metadataCache.get(target))
  }
  try {
    const mm = await import('music-metadata')
    const resp = await fetch(parsed, { signal: AbortSignal.timeout(10000) })
    if (!resp.ok) throw new Error(`upstream ${resp.status}`)
    const buf = Buffer.from(await resp.arrayBuffer())
    const meta = await mm.parseBuffer(buf, undefined, { duration: false })
    const out = {
      title: meta.common.title?.trim() || null,
      artist: meta.common.artist?.trim() || null,
      album: meta.common.album?.trim() || null,
    }
    metadataCache.set(target, out)
    reply.send(out)
  } catch (err) {
    const out = { title: null, artist: null, album: null, error: err.message }
    metadataCache.set(target, out)
    reply.send(out)
  }
})

fastify.get('/health', async (request, reply) => {
  try {
    // Basic health check
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }

    return reply.code(200).send(health)
  } catch (error) {
    console.error('Health check failed:', error)
    return reply.code(503).send({
      status: 'error',
      timestamp: new Date().toISOString(),
    })
  }
})

fastify.get('/status', async (request, reply) => {
  try {
    const status = {
      uptime: Math.round(world.time),
      protected: process.env.ADMIN_CODE !== undefined ? true : false,
      connectedUsers: [],
      commitHash: process.env.COMMIT_HASH,
    }
    for (const socket of world.network.sockets.values()) {
      status.connectedUsers.push({
        id: socket.player.data.userId,
        position: socket.player.position.value.toArray(),
        name: socket.player.data.name,
      })
    }

    return reply.code(200).send(status)
  } catch (error) {
    console.error('Status failed:', error)
    return reply.code(503).send({
      status: 'error',
      timestamp: new Date().toISOString(),
    })
  }
})

fastify.setErrorHandler((err, req, reply) => {
  console.error(err)
  reply.status(500).send()
})

try {
  await fastify.listen({ port, host: '0.0.0.0' })
} catch (err) {
  console.error(err)
  console.error(`failed to launch on port ${port}`)
  process.exit(1)
}

async function worldNetwork(fastify) {
  fastify.get('/ws', { websocket: true }, (ws, req) => {
    world.network.onConnection(ws, req.query)
  })
}

console.log(`server listening on port ${port}`)

// Graceful shutdown
process.on('SIGINT', async () => {
  await fastify.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await fastify.close()
  process.exit(0)
})
