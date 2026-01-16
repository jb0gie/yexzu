const fs = require('fs');
const path = require('path');

// List of files to remove
const filesToRemove = [
    'ANIMATION_INTEGRATION_SUMMARY.md',
    'ENS_IMPLEMENTATION_SUMMARY.md',
    'FIXES_APPLIED.md',
    'LIGHTWEIGHT_DOF_OPTIMIZATION.md',
    'VERIFICATION_REPORT.md',
    'WEBVIEW_FIX_REPORT.md',
    'WEBVIEW_IMPLEMENTATION_ANALYSIS.md',
    'WEBVIEW_IMPLEMENTATION_CHECKLIST.md',
    'WEBVIEW_PR147_SUMMARY.md',
    'WEVIEW_IMPLEMENTATION.md'
];

const basePath = '/home/blank/hyperfy/';
const removedFiles = [];
const nonexistentFiles = [];

filesToRemove.forEach(filename => {
    const filePath = path.join(basePath, filename);
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            removedFiles.push(filename);
            console.log(`Removed: ${filename}`);
        } catch (e) {
            console.log(`Error removing ${filename}: ${e.message}`);
        }
    } else {
        nonexistentFiles.push(filename);
        console.log(`File not found: ${filename}`);
    }
});

console.log('\nSummary:');
console.log(`Successfully removed: ${removedFiles.length} files`);
console.log(`Files not found: ${nonexistentFiles.length} files`);

if (removedFiles.length > 0) {
    console.log('\nRemoved files:');
    removedFiles.forEach(f => console.log(`  - ${f}`));
}

if (nonexistentFiles.length > 0) {
    console.log('\nNon-existent files:');
    nonexistentFiles.forEach(f => console.log(`  - ${f}`));
}