import fs from 'fs-extra'
import path from 'path'
import { importApp } from '../core/extras/appTools'
import { assets } from './assets'

class Collections {
  constructor() {
    this.list = []
    this.blueprints = new Set()
  }

  async init({ rootDir, worldDir, db }) {
    // console.log('[collections] initializing')
    this.dir = path.join(worldDir, '/collections')
    this.db = db
    // ensure collections directory exists
    await fs.ensureDir(this.dir)
    // copy over built-in collections
    // console.log('[collections] copying from src/world/collections to', this.dir)
    await fs.copy(path.join(rootDir, 'src/world/collections'), this.dir)
    // ensure all collections apps are installed
    let folderNames = fs.readdirSync(this.dir)
    // console.log('[collections] found folders:', folderNames)
    folderNames.sort((a, b) => {
      // keep "default" first then sort alphabetically
      if (a === 'default') return -1
      if (b === 'default') return 1
      return a.localeCompare(b)
    })
    for (const folderName of folderNames) {
      const folderPath = path.join(this.dir, folderName)
      const stats = fs.statSync(folderPath)
      if (!stats.isDirectory()) continue
      const manifestPath = path.join(folderPath, 'manifest.json')
      // console.log(`[collections] checking ${folderName} manifest:`, manifestPath)
      if (!fs.existsSync(manifestPath)) {
        // console.log('[collections] manifest not found, skipping')
        continue
      }
      const manifest = fs.readJsonSync(manifestPath)
      // console.log(`[collections] ${folderName} has ${manifest.apps.length} apps`)
      const blueprints = []
      for (const appFilename of manifest.apps) {
        const appPath = path.join(folderPath, appFilename)
        // console.log(`[collections] loading app: ${appFilename}`)
        try {
          const appBuffer = fs.readFileSync(appPath)
          const appFile = new File([appBuffer], appFilename, {
            type: 'application/octet-stream',
          })
          const app = await importApp(appFile)
          // console.log(`[collections] ✅ loaded ${appFilename}:`, app.blueprint.name)
          for (const asset of app.assets) {
            await assets.upload(asset.file)
          }
          blueprints.push(app.blueprint)

          // Save blueprint to database
          const now = new Date().toISOString()
          const blueprintJson = JSON.stringify(app.blueprint)
          await this.db('blueprints').insert({
            id: app.blueprint.id,
            data: blueprintJson,
            createdAt: now,
            updatedAt: now,
          }).onConflict('id').merge()
          // console.log(`[collections] 💾 saved blueprint to database: ${app.blueprint.id}`)

        } catch (err) {
          console.error(`[collections] ❌ failed to load ${appFilename}:`, err.message)
        }
      }
      this.list.push({
        id: folderName,
        name: manifest.name,
        blueprints,
      })
      for (const blueprint of blueprints) {
        this.blueprints.add(blueprint)
      }
    }
    // console.log(`[collections] ✅ loaded ${this.blueprints.size} blueprints total`)
  }
}

export const collections = new Collections()
