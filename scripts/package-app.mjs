#!/usr/bin/env node

import fs from 'fs-extra'
import path from 'path'
import { exportApp } from '../src/core/extras/appTools.js'
import crypto from 'crypto'

const args = process.argv.slice(2)
if (args.length < 2) {
  console.error('Usage: node scripts/package-app.mjs <source-js-file> <output-collection-name>')
  console.error('Example: node scripts/package-app.mjs examples/mobile/simple-controls.js myApps')
  process.exit(1)
}

const sourceFile = path.resolve(args[0])
const collectionName = args[1] || 'myApps'

if (!fs.existsSync(sourceFile)) {
  console.error(`❌ Source file not found: ${sourceFile}`)
  process.exit(1)
}

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

  // Handle relative paths and absolute paths
  let filePath = url
  if (!path.isAbsolute(url)) {
    filePath = path.join(process.cwd(), url)
  }

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
  if (ext === '.wav') mime = 'audio/wav'
  if (ext === '.mp3') mime = 'audio/mpeg'

  return new File([buffer], path.basename(filePath), { type: mime })
}

async function packageApp() {
  console.log(`📦 Packaging app: ${sourceFile}`)

  // Read the source JavaScript file
  const scriptContent = fs.readFileSync(sourceFile, 'utf-8')

  // Create a unique ID for the app
  const id = crypto.randomBytes(8).toString('hex')

  // Generate hash for the script
  const scriptHash = crypto.createHash('sha256').update(scriptContent).digest('hex')
  const scriptUrl = `asset://${scriptHash}.js`

  // Save the script to world/assets
  const scriptAssetPath = path.join(process.cwd(), 'world/assets', `${scriptHash}.js`)
  fs.ensureDirSync(path.dirname(scriptAssetPath))
  fs.writeFileSync(scriptAssetPath, scriptContent)

  // Create a simple model for the app (empty glTF)
  const modelContent = JSON.stringify({
    asset: { version: "2.0" },
    scenes: [{ nodes: [0] }],
    nodes: [],
    materials: [],
    meshes: []
  })
  const modelHash = crypto.createHash('sha256').update(modelContent).digest('hex')
  const modelUrl = `asset://${modelHash}.glb`
  const modelAssetPath = path.join(process.cwd(), 'world/assets', `${modelHash}.glb`)
  fs.writeFileSync(modelAssetPath, modelContent)

  // Create the blueprint
  const appName = path.basename(sourceFile, '.js')
  const blueprint = {
    id,
    version: 4,
    name: appName,
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

  console.log(`🎯 Created blueprint for: ${appName}`)

  // Export as .hyp file
  const hypFile = await exportApp(blueprint, resolveFile)

  // Save to collections
  const collectionPath = path.join(process.cwd(), 'src/world/collections', collectionName)
  fs.ensureDirSync(collectionPath)

  const hypPath = path.join(collectionPath, `${appName}.hyp`)
  fs.writeFileSync(hypPath, Buffer.from(await hypFile.arrayBuffer()))

  console.log(`💾 Saved .hyp file: ${hypPath}`)

  // Update manifest.json
  const manifestPath = path.join(collectionPath, 'manifest.json')
  let manifest = { name: collectionName, apps: [] }

  if (fs.existsSync(manifestPath)) {
    manifest = fs.readJsonSync(manifestPath)
  }

  if (!manifest.apps.includes(`${appName}.hyp`)) {
    manifest.apps.push(`${appName}.hyp`)
    fs.writeJsonSync(manifestPath, manifest, { spaces: 2 })
    console.log(`📋 Updated manifest: ${manifestPath}`)
  }

  console.log(`✅ Successfully packaged ${appName}.hyp`)
  console.log(`   Collection: ${collectionName}`)
  console.log(`   Script: ${scriptUrl}`)
  console.log(`   Model: ${modelUrl}`)
  console.log(`\n🚀 Restart the server to load the new app!`)
}

packageApp().catch(err => {
  console.error('❌ Failed to package app:', err)
  process.exit(1)
})