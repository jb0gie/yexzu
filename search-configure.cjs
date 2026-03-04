const fs = require('fs')
const path = require('path')

function find(dir, results = []) {
  try {
    fs.readdirSync(dir).forEach(f => {
      const fp = path.join(dir, f)
      const stat = fs.statSync(fp)
      if (stat.isDirectory() && !f.startsWith('.') && f !== 'node_modules') {
        find(fp, results)
      } else if (stat.isFile() && (f.endsWith('.app.js') || f.endsWith('.js'))) {
        results.push(fp)
      }
    })
  } catch (e) {}
  return results
}

const files = find('/home/blank/hyperfy/examples')
let found = []

files.forEach(fp => {
  try {
    const content = fs.readFileSync(fp, 'utf8')
    if (content.includes('app.configure') && content.includes('switch')) {
      found.push(fp)
    }
  } catch (e) {}
})

found.forEach(f => console.log(f))
