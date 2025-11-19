#!/usr/bin/env node

import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'
import { exportApp } from '../src/core/extras/appTools.js'

const sourceFile = '/home/blank/hyperfy/examples/mobile/simple-controls.js'
const collectionName = 'myApps'

async function createHypFile() {
  console.log('📦 Creating new .hyp file from scratch...')

  // Read source file
  const scriptContent = fs.readFileSync(sourceFile, 'utf-8')

  // Generate hash for script
  const scriptHash = crypto.createHash('sha256').update(scriptContent).digest('hex')
  const scriptUrl = `asset://${scriptHash}.js`
  const scriptAssetPath = path.join(process.cwd(), 'world/assets', `${scriptHash}.js`)

  // Ensure assets directory exists
  fs.ensureDirSync(path.dirname(scriptAssetPath))
  fs.writeFileSync(scriptAssetPath, scriptContent)
  console.log(`✅ Saved script asset: ${scriptHash}.js`)

  // Create a minimal glTF model
  const modelContent = JSON.stringify({
    asset: { version: "2.0" },
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    materials: [{
      name: "Default",
      pbrMetallicRoughness: {
        baseColorFactor: [0.8, 0.8, 0.8, 1]
      }
    }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0 },
        indices: 1,
        material: 0
      }]
    }],
    buffers: [{ byteLength: 36 }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 24, target: 34962 }, // POSITION
      { buffer: 0, byteOffset: 24, byteLength: 12, target: 34963 }  // INDICES
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 4, type: "VEC3",
        min: [-1, 0, -1], max: [1, 2, 1] },
      { bufferView: 1, componentType: 5123, count: 6, type: "SCALAR" }
    ]
  })

  const modelHash = crypto.createHash('sha256').update(modelContent).digest('hex')
  const modelUrl = `asset://${modelHash}.gltf`
  const modelAssetPath = path.join(process.cwd(), 'world/assets', `${modelHash}.gltf`)
  fs.writeFileSync(modelAssetPath, modelContent)
  console.log(`✅ Saved model asset: ${modelHash}.gltf`)

  // Create blueprint
  const blueprint = {
    id: crypto.randomBytes(8).toString('hex'),
    version: 4,
    name: 'simple-controls',
    model: modelUrl,
    script: scriptUrl,
    props: {
      width: 0,
      height: 2,
      fit: "cover",
      transparent: false,
      lit: false,
      shadows: true
    },
    preload: false,
    public: false,
    locked: false,
    unique: false,
    disabled: false
  }

  console.log(`🎯 Created blueprint: ${blueprint.name} (${blueprint.id})`)

  // Create resolveFile function
  async function resolveFile(url) {
    if (url.startsWith('asset://')) {
      const hash = url.slice(8)
      const assetPath = path.join(process.cwd(), 'world/assets', hash)
      if (!fs.existsSync(assetPath)) {
        throw new Error(`Asset not found: ${url}`)
      }
      const buffer = fs.readFileSync(assetPath)
      const ext = path.extname(assetPath)
      let mime = 'application/octet-stream'
      if (ext === '.js') mime = 'application/javascript'
      if (ext === '.gltf') mime = 'model/gltf+json'
      return new File([buffer], path.basename(assetPath), { type: mime })
    }
    throw new Error(`Unexpected URL format: ${url}`)
  }

  // Export as hyp file
  const hypFile = await exportApp(blueprint, resolveFile)
  const hypBuffer = Buffer.from(await hypFile.arrayBuffer())

  // Save to collections
  const collectionPath = path.join(process.cwd(), 'src/world/collections', collectionName)
  fs.ensureDirSync(collectionPath)
  const hypPath = path.join(collectionPath, 'simple-controls.hyp')
  fs.writeFileSync(hypPath, hypBuffer)

  // Also save to world/collections
  const worldCollectionPath = path.join(process.cwd(), 'world/collections', collectionName)
  fs.ensureDirSync(worldCollectionPath)
  const worldHypPath = path.join(worldCollectionPath, 'simple-controls.hyp')
  fs.writeFileSync(worldHypPath, hypBuffer)

  console.log(`✅ Saved .hyp file to: ${hypPath}`)
  console.log(`   Size: ${hypBuffer.length} bytes`)
  console.log(`   Also copied to: ${worldHypPath}`)

  // Update manifest
  const manifestPath = path.join(collectionPath, 'manifest.json')
  let manifest = { name: collectionName, apps: [] }

  if (fs.existsSync(manifestPath)) {
    manifest = fs.readJsonSync(manifestPath)
    // Remove old entry if exists
    manifest.apps = manifest.apps.filter(app => !app.includes('simple-controls'))
  }

  manifest.apps.push('simple-controls.hyp')
  fs.writeJsonSync(manifestPath, manifest, { spaces: 2 })
  console.log(`📋 Updated manifest: ${manifestPath}`)

  // Also update world manifest
  const worldManifestPath = path.join(worldCollectionPath, 'manifest.json')
  if (fs.existsSync(worldManifestPath)) {
    const worldManifest = fs.readJsonSync(worldManifestPath)
    worldManifest.apps = worldManifest.apps.filter(app => !app.includes('simple-controls'))
    worldManifest.apps.push('simple-controls.hyp')
    fs.writeJsonSync(worldManifestPath, worldManifest, { spaces: 2 })
    console.log(`📋 Updated world manifest: ${worldManifestPath}`)
  }

  return blueprint
}

createHypFile()
  .then(blueprint => {
    console.log('\n🎉 Successfully created simple-controls.hyp!')
    console.log('🔄 Restart the server to load the new app')
    process.exit(0)
  })
  .catch(err => {
    console.error('❌ Failed:', err)
    process.exit(1)
  })