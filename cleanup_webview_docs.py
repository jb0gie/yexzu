#!/usr/bin/env python3
"""
Cleanup script for temporary documentation files created during WebView development.
Execute this script to remove temporary docs and clean up the working tree.
"""

import os
import sys

# Change to the hyperfy directory
os.chdir('/home/blank/hyperfy')

# List of temporary documentation files to remove
temp_docs = [
    "ANIMATION_INTEGRATION_SUMMARY.md",
    "ENS_IMPLEMENTATION_SUMMARY.md",
    "FIXES_APPLIED.md",
    "LIGHTWEIGHT_DOF_OPTIMIZATION.md",
    "VERIFICATION_REPORT.md",
    "WEBVIEW_FIX_REPORT.md",
    "WEBVIEW_IMPLEMENTATION_ANALYSIS.md",
    "WEBVIEW_IMPLEMENTATION_CHECKLIST.md",
    "WEBVIEW_PR147_SUMMARY.md",
    "WEVIEW_IMPLEMENTATION.md",
    "cleanup-temp-docs.py",
    "execute-cleanup.py"
]

print("=" * 60)
print("Cleaning up temporary WebView documentation files...")
print("=" * 60)

removed_count = 0
for filename in temp_docs:
    if os.path.exists(filename):
        try:
            os.remove(filename)
            print(f"✓ Removed: {filename}")
            removed_count += 1
        except Exception as e:
            print(f"✗ Error removing {filename}: {e}")
    else:
        print(f"- Skipped: {filename} (not found)")

print("\n" + "=" * 60)
print(f"Cleanup complete! Removed {removed_count} files.")
print("=" * 60)
print("\nNext steps:")
print("1. Run: git status")
print("2. Verify no untracked .md files remain")
print("3. Note: /world/ directory is .gitignored by design (line 9)")
