const fs = require('fs');
const path = require('path');

function walk(dir, results = []) {
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walk(fullPath, results);
      } else if (stat.isFile() && item.endsWith('.js')) {
        results.push(fullPath);
      }
    });
  } catch(e) {}
  return results;
}

const files = walk('/home/blank/hyperfy/src');
const contents = files.map(f => {
  try {
    return { path: f, content: fs.readFileSync(f, 'utf-8') };
  } catch(e) { return null; }
}).filter(x => x);

const withCopy = contents.filter(f =>
  f.content.toLowerCase().includes('clipboard') ||
  f.content.toLowerCase().includes('navigator.clipboard') ||
  f.content.includes('.copy(')
);

console.log('=== Files with copy/clipboard functionality ===');
withCopy.forEach(f => console.log(f.path));

// Also search for asset-related terms
const withAsset = contents.filter(f =>
  f.content.includes('asset://') ||
  f.content.includes('loader') && f.content.includes('file')
);

console.log('\n=== Files with asset:// or loader file handling ===');
withAsset.slice(0, 10).forEach(f => console.log(f.path));
