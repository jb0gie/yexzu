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

// Search for asset-related files
const files = walk('/home/blank/hyperfy/src/client');
const contents = files.map(f => {
  try {
    const content = fs.readFileSync(f, 'utf-8');
    return { path: f, content: content };
  } catch(e) { return null; }
}).filter(x => x);

// Find files mentioning assets
const withAsset = contents.filter(f =>
  f.content.toLowerCase().includes('asset') ||
  f.path.toLowerCase().includes('asset')
);

console.log('=== Files mentioning assets ===');
withAsset.forEach(f => console.log(f.path));

// Find files mentioning file upload or management
const withFile = contents.filter(f =>
  f.content.toLowerCase().includes('upload') ||
  f.content.toLowerCase().includes('file') && f.content.toLowerCase().includes('list')
);

console.log('\n=== Files mentioning upload/file management ===');
withFile.forEach(f => console.log(f.path));

// Look for sidebar/panel components
const panels = contents.filter(f =>
  f.content.toLowerCase().includes('sidebar') ||
  f.content.toLowerCase().includes('panel') ||
  f.content.toLowerCase().includes('menu')
);

console.log('\n=== Panel/Sidebar/Menu files ===');
panels.forEach(f => console.log(f.path));
