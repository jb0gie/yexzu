#!/usr/bin/env node

import fs from 'fs-extra'
import path from 'path'
import sqlite3 from 'sqlite3'
import { importApp } from '../src/core/extras/appTools.js'

const hypFilePath = process.argv[2] || '/home/blank/hyperfy/world/collections/myApps/simple-controls.hyp'

if (!fs.existsSync(hypFilePath)) {
  console.error(`❌ .hyp file not found: ${hypFilePath}`)
  process.exit(1)
}

const dbPath = '/home/blank/hyperfy/world/db.sqlite'

async function addAppToWorld() {
  console.log(`📦 Loading app from: ${hypFilePath}`)

  // Read and import the .hyp file
  const fileBuffer = fs.readFileSync(hypFilePath)
  const file = new File([fileBuffer], path.basename(hypFilePath), {
    type: 'application/octet-stream'
  })

  const appData = await importApp(file)
  const blueprint = appData.blueprint

  console.log(`🎯 App name: ${blueprint.name}`)
  console.log(`   ID: ${blueprint.id}`)
  console.log(`   Script: ${blueprint.script}`)

  // Open database
  const db = new sqlite3.Database(dbPath)

  return new Promise((resolve, reject) => {
    // Check if blueprint already exists
    db.get(
      "SELECT id FROM blueprints WHERE id = ?",
      [blueprint.id],
      (err, row) => {
        if (err) {
          reject(err)
          return
        }

        if (row) {
          console.log(`⚠️  Blueprint already exists with ID: ${blueprint.id}`)
        } else {
          // Insert blueprint
          const now = new Date().toISOString()
          const blueprintJson = JSON.stringify(blueprint)

          db.run(
            "INSERT INTO blueprints (id, data, createdAt, updatedAt) VALUES (?, ?, ?, ?)",
            [blueprint.id, blueprintJson, now, now],
            (err) => {
              if (err) {
                reject(err)
                return
              }
              console.log(`✅ Inserted blueprint: ${blueprint.name}`)
            }
          )
        }

        // Check if entity already exists
        db.get(
          "SELECT id FROM entities WHERE blueprint = ? AND type = 'app'",
          [blueprint.id],
          (err, row) => {
            if (err) {
              reject(err)
              return
            }

            if (row) {
              console.log(`⚠️  Entity already exists for this blueprint`)
              db.close()
              resolve()
              return
            }

            // Create entity for the app
            const entityId = `${blueprint.id.slice(0, 8)}_${Date.now().toString(36)}`
            const now = new Date().toISOString()

            // Position the app at origin with a small offset
            const entityData = {
              id: entityId,
              type: 'app',
              blueprint: blueprint.id,
              position: [0, 2, 0],  // Slightly above ground
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
              props: blueprint.props || {},
              name: blueprint.name
            }

            const entityJson = JSON.stringify(entityData)

            db.run(
              "INSERT INTO entities (id, data, createdAt, updatedAt) VALUES (?, ?, ?, ?)",
              [entityId, entityJson, now, now],
              (err) => {
                if (err) {
                  reject(err)
                  return
                }

                console.log(`✅ Created entity: ${entityId}`)
                console.log(`   Position: [${entityData.position.join(', ')}]`)

                db.close()
                resolve()
              }
            )
          }
        )
      }
    )
  })
}

addAppToWorld()
  .then(() => {
    console.log(`\n🎉 Successfully added ${path.basename(hypFilePath)} to the world!`)
    console.log(`🔄 Refresh your browser to see the app`)
    process.exit(0)
  })
  .catch(err => {
    console.error('❌ Failed to add app to world:', err)
    process.exit(1)
  })