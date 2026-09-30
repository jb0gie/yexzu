import 'ses'
import '../core/lockdown'
import './bootstrap'

import fs from 'fs-extra'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { pipeline } from 'stream/promises'
import { open as openFileHandle } from 'fs/promises'
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
import { writeWorldZip } from './zipwriter'

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

// ── World backup / restore ─────────────────────────────────────────────────
// Admin-only snapshot + restore of the entire world folder (db + assets +
// collections). Design notes:
// - The zip is built in rootDir/world-backups, OUTSIDE the world folder, so it
//   can never recurse into itself.
// - db.sqlite is snapshotted separately (consistent online copy via VACUUM
//   INTO; checkpoint + file copy as fallback) and appended to the zip, so a
//   backup never captures a half-written database.
// - Restore only STAGES the uploaded zip at rootDir/restore-pending.zip, then
//   exits the process. The docker entrypoint (scripts/docker-entrypoint.sh)
//   applies it on the next boot — restoring inline would clobber the live
//   sqlite file out from under the running server, so never do that.
// - Zip validation runs in-process (central directory parse) so the server has
//   no dependency on an `unzip` binary being on PATH; `zip` is only needed to
//   CREATE backups.
const WORLD_BACKUP_DIR = path.join(rootDir, 'world-backups')
const RESTORE_STAGING_ZIP = path.join(rootDir, 'restore-pending.zip')
let worldBackup = { status: 'idle', startedAt: null, size: null, error: null, zipPath: null }

function isAdminRequest(req) {
  // No ADMIN_CODE on the server = everyone is admin (the engine grants ADMIN
  // rank in that state), so admin routes must accept codeless requests too.
  if (!process.env.ADMIN_CODE) return true
  const code = req.headers['x-admin-code'] || req.query.adminCode
  return code === process.env.ADMIN_CODE
}

async function snapshotDb(snapshotPath) {
  const liveDb = path.join(worldDir, 'db.sqlite')
  if (!(await fs.pathExists(liveDb))) return false
  await fs.remove(snapshotPath).catch(() => {})
  try {
    // consistent online snapshot (SQLite >= 3.27); path is single-quoted in SQL
    await db.raw(`VACUUM INTO '${snapshotPath}'`)
    return true
  } catch (err) {
    console.warn('[backup] VACUUM INTO failed, falling back to file copy:', err.message)
  }
  try {
    await db.raw('PRAGMA wal_checkpoint(TRUNCATE)')
  } catch (err) {
    // best effort — a plain copy of the db is still taken below
  }
  await fs.copyFile(liveDb, snapshotPath)
  return true
}

// Parse the zip central directory straight from the file: verifies the upload
// is a structurally valid zip AND that every entry path stays inside the
// extraction root (no absolute paths, no `..` segments). No subprocess needed.
async function validateZip(filePath) {
  const stat = await fs.stat(filePath)
  if (stat.size < 22) return { ok: false, error: 'file too small to be a zip' }
  const tailLen = Math.min(stat.size, 65557) // 22-byte EOCD + max 64k comment
  const tail = Buffer.alloc(tailLen)
  // native fs/promises handle (fs-extra's open resolves to a numeric fd)
  const tailFh = await openFileHandle(filePath, 'r')
  try {
    await tailFh.read(tail, 0, tailLen, stat.size - tailLen)
  } finally {
    await tailFh.close()
  }
  let eocd = -1
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tail.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd === -1) return { ok: false, error: 'no zip end-of-central-directory record' }
  const entryCount = tail.readUInt16LE(eocd + 10)
  if (entryCount === 0) return { ok: false, error: 'zip contains no entries' }
  const cdSize = tail.readUInt32LE(eocd + 12)
  const cdOffset = tail.readUInt32LE(eocd + 16)
  if (cdOffset + cdSize > stat.size) return { ok: false, error: 'central directory is truncated' }
  const cd = Buffer.alloc(cdSize)
  const cdFh = await openFileHandle(filePath, 'r')
  try {
    await cdFh.read(cd, 0, cdSize, cdOffset)
  } finally {
    await cdFh.close()
  }
  let p = 0
  for (let i = 0; i < entryCount; i++) {
    if (p + 46 > cd.length || cd.readUInt32LE(p) !== 0x02014b50) {
      return { ok: false, error: 'malformed central directory entry' }
    }
    const nameLen = cd.readUInt16LE(p + 28)
    const extraLen = cd.readUInt16LE(p + 30)
    const commentLen = cd.readUInt16LE(p + 32)
    const name = cd.toString('utf8', p + 46, p + 46 + nameLen)
    const normalized = name.replace(/\\/g, '/')
    if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized) || normalized.split('/').includes('..')) {
      return { ok: false, error: `unsafe zip entry: ${name}` }
    }
    p += 46 + nameLen + extraLen + commentLen
  }
  return { ok: true, entries: entryCount }
}

fastify.post('/api/world/backup/start', async (req, reply) => {
  if (!isAdminRequest(req)) return reply.code(401).send({ error: 'Invalid admin code' })
  if (worldBackup.status === 'running') return { ok: true, status: 'running' }
  await fs.ensureDir(WORLD_BACKUP_DIR)
  // keep only the latest snapshot in the folder
  for (const name of await fs.readdir(WORLD_BACKUP_DIR)) {
    if (name.endsWith('.zip') || name === 'db.sqlite') await fs.remove(path.join(WORLD_BACKUP_DIR, name))
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const zipPath = path.join(WORLD_BACKUP_DIR, `world-backup-${stamp}.zip`)
  const dbSnapshot = path.join(WORLD_BACKUP_DIR, 'db.sqlite')
  worldBackup = { status: 'running', startedAt: Date.now(), size: null, error: null, zipPath }
  const hadDb = await snapshotDb(dbSnapshot)
  // -x patterns must be relative to the zip working directory (the worldDir)
  const args = ['-q', '-r', `"${zipPath}"`, '.', '-x', '"backups/*"']
  if (hadDb) args.push('-x', '"db.sqlite"') // live db excluded; the consistent snapshot is appended below
  try {
    try {
      await execAsync(`zip ${args.join(' ')}`, { cwd: worldDir, maxBuffer: 16 * 1024 * 1024 })
      if (hadDb) {
        await execAsync(`zip -q -g "${zipPath}" db.sqlite`, { cwd: WORLD_BACKUP_DIR, maxBuffer: 16 * 1024 * 1024 })
      }
    } catch (err) {
      // No system `zip` (Windows dev boxes ship without one) or it failed:
      // fall back to the built-in writer with the same archive layout.
      console.warn('[backup] system zip failed, using built-in writer:', String(err.message).split('\n')[0])
      await writeWorldZip(zipPath, worldDir, {
        skip: rel => rel === 'db.sqlite' || rel.startsWith('backups/'),
        extraFiles: hadDb ? [{ abs: dbSnapshot, name: 'db.sqlite' }] : [],
      })
    }
    const stat = await fs.stat(zipPath)
    worldBackup = { ...worldBackup, status: 'done', size: stat.size }
  } catch (err) {
    worldBackup = { ...worldBackup, status: 'failed', error: err.message }
  }
  return { ok: true, status: 'running' }
})

fastify.get('/api/world/backup/status', async (req, reply) => {
  if (!isAdminRequest(req)) return reply.code(401).send({ error: 'Invalid admin code' })
  return {
    status: worldBackup.status,
    size: worldBackup.size,
    error: worldBackup.error,
    startedAt: worldBackup.startedAt,
    file: worldBackup.zipPath ? path.basename(worldBackup.zipPath) : null,
  }
})

fastify.get('/api/world/backup/download', async (req, reply) => {
  if (!isAdminRequest(req)) return reply.code(401).send({ error: 'Invalid admin code' })
  if (worldBackup.status !== 'done' || !worldBackup.zipPath) {
    return reply.code(409).send({ error: 'no backup ready' })
  }
  const stat = await fs.stat(worldBackup.zipPath)
  reply.header('Content-Type', 'application/zip')
  reply.header('Content-Length', String(stat.size))
  reply.header('Content-Disposition', `attachment; filename="${path.basename(worldBackup.zipPath)}"`)
  return reply.send(fs.createReadStream(worldBackup.zipPath))
})

fastify.post('/api/world/restore', async (req, reply) => {
  if (!isAdminRequest(req)) return reply.code(401).send({ error: 'Invalid admin code' })
  let mp
  try {
    // per-route limit override (4GB) — world zips can be 600MB+
    mp = await req.file({ limits: { fileSize: 4 * 1024 * 1024 * 1024 } })
  } catch (err) {
    return reply.code(400).send({ error: `upload rejected: ${err.message}` })
  }
  if (!mp) return reply.code(400).send({ error: 'missing file part' })
  await pipeline(mp.file, fs.createWriteStream(RESTORE_STAGING_ZIP))
  const cleanup = () => fs.remove(RESTORE_STAGING_ZIP).catch(() => {})
  const result = await validateZip(RESTORE_STAGING_ZIP)
  if (!result.ok) {
    await cleanup()
    return reply.code(400).send({ error: result.error })
  }
  // Apply on next boot (docker entrypoint) — exit so the container restarts.
  // WORLD_RESTORE_AUTO=true is set on the deployed services; without it the
  // zip stays staged and the operator restarts the server manually.
  if (process.env.WORLD_RESTORE_AUTO === 'true') {
    reply.send({ ok: true, note: 'staged — restarting to apply' })
    setTimeout(() => process.exit(0), 1500)
    return
  }
  return { ok: true, note: 'staged — restart the server to apply (WORLD_RESTORE_AUTO is not set)' }
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
    if (target.startsWith('asset://')) {
      const filename = target.slice(8).split('?')[0]
      if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return reply.code(400).send({ error: 'invalid asset' })
      const base = (process.env.ASSETS_BASE_URL || '').replace(/\/$/, '')
      if (!base) return reply.code(400).send({ error: 'ASSETS_BASE_URL missing' })
      parsed = new URL(`${base}/${filename}`)
    } else {
      parsed = new URL(target)
    }
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
      protected: !!process.env.ADMIN_CODE,
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
