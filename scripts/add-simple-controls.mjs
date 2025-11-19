#!/usr/bin/env node

import fs from 'fs-extra'
import path from 'path'
import { importApp } from '../src/core/extras/appTools.js'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const hypFilePath = process.argv[2] || path.join(__dirname, '../world/collections/myApps/simple-controls.hyp')

if (!fs.existsSync(hypFilePath)) {
  console.error(`❌ .hyp file not found: ${hypFilePath}`)
  process.exit(1)
}

async function addAppToWorld() {
  console.log(`📦 Loading app from: ${hypFilePath}`)

  // Read and import the .hyp file
  const fileBuffer = fs.readFileSync(hypFilePath)
  const file = new File([fileBuffer], path.basename(hypFilePath), {
    type: 'application/octet-stream'
  })

  const appData = await importApp(file)
  const blueprint = appData.blueprint

  console.log(`\n🎯 App Details:`)
  console.log(`   Name: ${blueprint.name}`)
  console.log(`   ID: ${blueprint.id}`)
  console.log(`   Script: ${blueprint.script}`)

  const now = new Date().toISOString()
  const blueprintJson = JSON.stringify(blueprint)

  // Generate entity ID
  const entityId = `${blueprint.id.slice(0, 8)}_${Date.now().toString(36)}`

  const entityData = {
    id: entityId,
    type: 'app',
    blueprint: blueprint.id,
    position: [0, 2, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    props: blueprint.props || {},
    name: blueprint.name
  }

  const entityJson = JSON.stringify(entityData)

  // Escape single quotes for SQL
  const escapeSql = (str) => str.replace(/'/g, "''")

  const blueprintSql = `
-- Insert blueprint
INSERT OR REPLACE INTO blueprints (id, data, createdAt, updatedAt) VALUES (
  '${escapeSql(blueprint.id)}',
  '${escapeSql(blueprintJson)}',
  '${now}',
  '${now}'
);

-- Insert entity
INSERT INTO entities (id, data, createdAt, updatedAt) VALUES (
  '${escapeSql(entityId)}',
  '${escapeSql(entityJson)}',
  '${now}',
  '${now}'
);

-- Verify
SELECT 'Blueprint inserted:' as info, json_extract(data, '$.name') as name
FROM blueprints WHERE id = '${escapeSql(blueprint.id)}';

SELECT 'Entity created:' as info, id, json_extract(data, '$.name') as name
FROM entities WHERE id = '${escapeSql(entityId)}';
`

  const sqlPath = '/tmp/add-simple-controls.sql'
  fs.writeFileSync(sqlPath, blueprintSql)

  console.log(`\n💾 Generated SQL file: ${sqlPath}`)
  console.log(`\n📋 To add to database, run:`)
  console.log(`   sqlite3 /home/blank/hyperfy/world/db.sqlite < ${sqlPath}`)

  // Also write a bash script to execute it
  const bashScript = `#!/bin/bash
sqlite3 /home/blank/hyperfy/world/db.sqlite << 'EOF'
${blueprintSql}
EOF`

  const shPath = '/tmp/add-simple-controls.sh'
  fs.writeFileSync(shPath, bashScript)
  fs.chmodSync(shPath, 0o755)

  console.log(`\n🚀 Or run directly: bash ${shPath}`)
}

addAppToWorld()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Failed:', err)
    process.exit(1)
  })