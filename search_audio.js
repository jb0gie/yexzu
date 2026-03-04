const fs = require('fs');
const path = require('path');

// Search for audio examples using asset://
function searchFiles(dir) {
  const results = [];
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();
    try {
      const items = fs.readdirSync(current, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(current, item.name);
        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
          stack.push(fullPath);
        } else if (/\.js$/.test(item.name)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes("createNode('audio'") || content.includes('createNode("audio"')) {
              const lines = content.split('\n').filter(l =>
                l.includes('audio') && (l.includes('src') || l.includes('asset://'))
              );
              if (lines.length > 0) {
                results.push({ file: fullPath, lines: lines.slice(0, 5) });
              }
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
  return results;
}

const files = searchFiles('/home/blank/hyperfy');
console.log('Files creating audio nodes:');
files.forEach(f => {
  console.log('\n' + f.file + ':');
  f.lines.forEach(l => console.log('  ' + l.trim()));
});
