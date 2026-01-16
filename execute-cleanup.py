#!/usr/bin/env python3
"""Execute the cleanup script"""
import subprocess
import sys

result = subprocess.run([sys.executable, 'cleanup-temp-docs.py'],
                       capture_output=True, text=True, cwd='/home/blank/hyperfy')
print(result.stdout)
if result.stderr:
    print("Errors:", result.stderr, file=sys.stderr)
