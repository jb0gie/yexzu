#!/usr/bin/env python3
import os
import sys

# List of files to remove
files_to_remove = [
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
]

base_path = '/home/blank/hyperfy/'
removed_files = []
nonexistent_files = []

for filename in files_to_remove:
    file_path = os.path.join(base_path, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            removed_files.append(filename)
            print(f'Removed: {filename}')
        except Exception as e:
            print(f'Error removing {filename}: {e}')
    else:
        nonexistent_files.append(filename)
        print(f'File not found: {filename}')

print(f'\nSummary:')
print(f'Successfully removed: {len(removed_files)} files')
print(f'Files not found: {len(nonexistent_files)} files')

if removed_files:
    print(f'\nRemoved files:')
    for f in removed_files:
        print(f'  - {f}')

if nonexistent_files:
    print(f'\nNon-existent files:')
    for f in nonexistent_files:
        print(f'  - {f}')

sys.exit(0)