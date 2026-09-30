// Minimal streaming ZIP writer — used when the system `zip` binary is missing.
//
// Production images install Info-ZIP (`zip`/`unzip`); Windows dev boxes have
// neither, so /api/world/backup/start falls back to this. The archive layout
// mirrors `zip -q -r <out>.zip . -x backups/* -x db.sqlite` plus the appended
// db snapshot (see the backup route in index.js):
//   - deflateRaw entries, data descriptors (GP flag bit 3) so files stream
//     without buffering, then a normal central directory + EOCD
//   - no zip64: refuses archives beyond 4 GB (worlds are far below)
// Output is standard enough for Info-ZIP, busybox unzip and python zipfile.

import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import { Transform, Writable } from 'stream'
import { pipeline } from 'stream/promises'
import { createDeflateRaw } from 'zlib'

const LOCAL_SIG = 0x04034b50
const DESCRIPTOR_SIG = 0x08074b50
const CENTRAL_SIG = 0x02014b50
const EOCD_SIG = 0x06054b50
const FLAG_DATA_DESCRIPTOR = 0x0008
const FLAG_UTF8 = 0x0800
const METHOD_DEFLATE = 8
const VERSION = 20
const U32_MAX = 0xffffffff
const MAX_ENTRIES = 0xffff
// 2026-01-01 — a fixed, sane timestamp; entries don't carry real mtimes
const DOS_TIME = 0
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1

const CRC_TABLE = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c
}

// Passes chunks through, accumulating a CRC-32 and the uncompressed size.
class CrcCounter extends Transform {
  constructor() {
    super()
    this._crc = 0xffffffff
    this.size = 0
  }
  _transform(chunk, _enc, cb) {
    let crc = this._crc
    for (let i = 0; i < chunk.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ chunk[i]) & 0xff]
    this._crc = crc
    this.size += chunk.length
    cb(null, chunk)
  }
  get value() {
    return (this._crc ^ 0xffffffff) >>> 0
  }
}

class ByteCounter extends Transform {
  constructor() {
    super()
    this.size = 0
  }
  _transform(chunk, _enc, cb) {
    this.size += chunk.length
    cb(null, chunk)
  }
}

// Writable that forwards to the shared output stream WITHOUT ending it, so
// each entry's pipeline can finish while the archive stream stays open.
class OpenEnd extends Writable {
  constructor(out) {
    super()
    this.out = out
  }
  _write(chunk, enc, cb) {
    this.out.write(chunk, enc, cb)
  }
}

function writeBuf(out, buf) {
  return new Promise((resolve, reject) => out.write(buf, err => (err ? reject(err) : resolve())))
}

function localHeader(nameBuf) {
  const b = Buffer.alloc(30 + nameBuf.length)
  b.writeUInt32LE(LOCAL_SIG, 0)
  b.writeUInt16LE(VERSION, 4)
  b.writeUInt16LE(FLAG_DATA_DESCRIPTOR | FLAG_UTF8, 6)
  b.writeUInt16LE(METHOD_DEFLATE, 8)
  b.writeUInt16LE(DOS_TIME, 10)
  b.writeUInt16LE(DOS_DATE, 12)
  // crc / compressed / uncompressed sizes stay 0 — the descriptor carries them
  b.writeUInt16LE(nameBuf.length, 26)
  nameBuf.copy(b, 30)
  return b
}

function dataDescriptor(crc, csize, usize) {
  const b = Buffer.alloc(16)
  b.writeUInt32LE(DESCRIPTOR_SIG, 0)
  b.writeUInt32LE(crc, 4)
  b.writeUInt32LE(csize, 8)
  b.writeUInt32LE(usize, 12)
  return b
}

function centralEntry(nameBuf, crc, csize, usize, offset) {
  const b = Buffer.alloc(46 + nameBuf.length)
  b.writeUInt32LE(CENTRAL_SIG, 0)
  b.writeUInt16LE(VERSION, 4)
  b.writeUInt16LE(VERSION, 6)
  b.writeUInt16LE(FLAG_DATA_DESCRIPTOR | FLAG_UTF8, 8)
  b.writeUInt16LE(METHOD_DEFLATE, 10)
  b.writeUInt16LE(DOS_TIME, 12)
  b.writeUInt16LE(DOS_DATE, 14)
  b.writeUInt32LE(crc, 16)
  b.writeUInt32LE(csize, 20)
  b.writeUInt32LE(usize, 24)
  b.writeUInt16LE(nameBuf.length, 28)
  b.writeUInt32LE(offset, 42)
  nameBuf.copy(b, 46)
  return b
}

function endRecord(count, cdSize, cdOffset) {
  const b = Buffer.alloc(22)
  b.writeUInt32LE(EOCD_SIG, 0)
  b.writeUInt16LE(count, 8)
  b.writeUInt16LE(count, 10)
  b.writeUInt32LE(cdSize, 12)
  b.writeUInt32LE(cdOffset, 16)
  return b
}

// Recursively collect files under `dir`, posix-style relative names.
async function collect(dir, skip, extraFiles, entries) {
  const walk = async (absDir, prefix) => {
    const items = await fsp.readdir(absDir, { withFileTypes: true })
    items.sort((a, b) => (a.name < b.name ? -1 : 1))
    for (const item of items) {
      const abs = path.join(absDir, item.name)
      const rel = prefix ? `${prefix}/${item.name}` : item.name
      if (skip && skip(rel)) continue
      if (item.isDirectory()) await walk(abs, rel)
      else if (item.isFile()) entries.push({ abs, name: rel })
    }
  }
  await walk(dir, '')
  for (const file of extraFiles) entries.push(file)
}

export async function writeWorldZip(zipPath, dir, { skip, extraFiles = [] } = {}) {
  const entries = []
  await collect(dir, skip, extraFiles, entries)
  if (entries.length > MAX_ENTRIES) {
    throw new Error(`world has ${entries.length} files — more than a zip32 archive supports`)
  }
  const out = fs.createWriteStream(zipPath)
  const central = []
  try {
    for (const entry of entries) {
      const nameBuf = Buffer.from(entry.name, 'utf8')
      if (out.bytesWritten + 30 + nameBuf.length > U32_MAX) {
        throw new Error('archive exceeds 4GB — zip64 is not supported')
      }
      const offset = out.bytesWritten
      await writeBuf(out, localHeader(nameBuf))
      const crc = new CrcCounter()
      const bytes = new ByteCounter()
      await pipeline(fs.createReadStream(entry.abs), crc, createDeflateRaw(), bytes, new OpenEnd(out))
      if (bytes.size > U32_MAX || crc.size > U32_MAX) {
        throw new Error(`${entry.name} exceeds 4GB — zip64 is not supported`)
      }
      await writeBuf(out, dataDescriptor(crc.value, bytes.size, crc.size))
      central.push({ nameBuf, crc: crc.value, csize: bytes.size, usize: crc.size, offset })
    }
    const cdOffset = out.bytesWritten
    let cdSize = 0
    for (const entry of central) {
      const buf = centralEntry(entry.nameBuf, entry.crc, entry.csize, entry.usize, entry.offset)
      await writeBuf(out, buf)
      cdSize += buf.length
    }
    if (cdOffset + cdSize > U32_MAX) {
      throw new Error('archive exceeds 4GB — zip64 is not supported')
    }
    await writeBuf(out, endRecord(central.length, cdSize, cdOffset))
    await new Promise((resolve, reject) => out.end(err => (err ? reject(err) : resolve())))
  } catch (err) {
    out.destroy()
    await fsp.rm(zipPath, { force: true }).catch(() => {})
    throw err
  }
  return { entries: central.length, size: out.bytesWritten }
}
