const fs = require('fs')
const path = require('path')

function find(dir, pattern, results = []) {
  try {
    fs.readdirSync(dir).forEach(f => {
      const fp = path.join(dir, f)
      if (fs.statSync(fp).isDirectory() && !f.startsWith('.') && f !== 'node_modules') {
        find(fp, pattern, results)
      } else if (pattern.test(f)) {
        results.push(fp)
      }
    })
  } catch (e) {}
  return results
}

const files = find('/home/blank/hyperfy', /\.app\.js$/)
files.forEach(f => console.log(f))
