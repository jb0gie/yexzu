#!/usr/bin/env node

import fs from 'fs-extra'
import path from 'path'
import { exportApp } from '../src/core/extras/appTools.js'

const sourceFile = '/home/blank/hyperfy/examples/mobile/simple-controls.js'
const outputPath = '/home/blank/hyperfy/src/world/collections/myApps/simple-controls.hyp'

async function rebuildHypFile() {
  console.log('📦 Rebuilding .hyp file from source...')

  // Read source file
  const scriptContent = fs.readFileSync(sourceFile, 'utf-8')

  // Create resolveFile function
  async function resolveFile(url) {
    if (url.startsWith('asset://')) {
      const hash = url.slice(8)
      const assetPath = path.join(process.cwd(), 'world/assets', hash)
      if (!fs.existsSync(assetPath)) {
        throw new Error(`Asset not found: ${url}`)
      }
      const buffer = fs.readFileSync(assetPath)
      return new File([buffer], path.basename(assetPath), {
        type: 'application/octet-stream'
      })
    }

    const filePath = path.join(process.cwd(), url)
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    const buffer = fs.readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase()

    let mime = 'application/octet-stream'
    if (ext === '.js') mime = 'application/javascript'
    if (ext === '.glb') mime = 'model/gltf-binary'
    if (ext === '.gltf') mime = 'model/gltf+json'
    if (ext === '.png') mime = 'image/png'
    if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg'
    if (ext === '.webp') mime = 'image/webp'

    return new File([buffer], path.basename(filePath), { type: mime })
  }

  // Read and parse the old hyp to get the blueprint
  const oldHypPath = path.join(process.cwd(), 'src/world/collections/myApps/simple-controls.hyp')
  const oldBuffer = fs.readFileSync(oldHypPath)

  // Extract header manually
  const headerSize = new DataView(oldBuffer.buffer).getUint32(0, true)
  const headerBytes = new Uint8Array(oldBuffer.slice(4, 4 + headerSize))
  const headerJson = new TextDecoder().decode(headerBytes)

  console.log('Old header size:', headerSize)
  console.log('Old header:', headerJson.substring(0, 200) + '...')

  // Parse to get blueprint
  const header = JSON.parse(headerJson)
  const blueprint = header.blueprint

  console.log('Blueprint name:', blueprint.name)
  console.log('Script URL:', blueprint.script)

  // Export as new hyp file
  const hypFile = await exportApp(blueprint, resolveFile)

  // Write to both locations
  const hypBuffer = Buffer.from(await hypFile.arrayBuffer())

  // Write to src/world/collections
  fs.writeFileSync(outputPath, hypBuffer)

  // Write to world/collections (for running server)
  const worldPath = outputPath.replace('/src/world/', '/world/')
  fs.writeFileSync(worldPath, hypBuffer)

  console.log(`✅ Rebuilt .hyp file: ${outputPath}`)
  console.log(`   Also copied to: ${worldPath}`)
  console.log(`   Size: ${hypBuffer.length} bytes`)

  // Update manifest if needed
  const manifestPath = path.dirname(outputPath) + '/manifest.json'
  const manifest = fs.readJsonSync(manifestPath)
  if (!manifest.apps.includes('simple-controls.hyp')) {
    manifest.apps.push('simple-controls.hyp')
    fs.writeJsonSync(manifestPath, manifest, { spaces: 2 })
    console.log(`📋 Updated manifest: ${manifestPath}`)
  }

  // Also update world manifest
  const worldManifest = manifestPath.replace('/src/world/', '/world/')
  if (fs.existsSync(worldManifest)) {
    const wm = fs.readJsonSync(worldManifest)
    if (!wm.apps.includes('simple-controls.hyp')) {
      wm.apps.push('simple-controls.hyp')
      fs.writeJsonSync(worldManifest, wm, { spaces: 2 })
      console.log(`📋 Updated world manifest: ${worldManifest}`)
    }
  }
}

rebuildHypFile()
  .then(() => {
    console.log('\n✅ Successfully rebuilt simple-controls.hyp!')
    console.log('🔄 Restart the server to reload the collections')
    process.exit(0)
  })
  .catch(err => {
    console.error('❌ Failed:', err)
    process.exit(1)
  })