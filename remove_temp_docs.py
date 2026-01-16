import os

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
    "WEVIEW_IMPLEMENTATION.md"  # Note: filename appears to have typo (WEVIEW instead of WEBVIEW)
]

removed_files = []
not_found_files = []

for filename in temp_docs:
    filepath = f"/home/blank/hyperfy/{filename}"
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
            removed_files.append(filename)
            print(f"✓ Removed: {filename}")
        except Exception as e:
            print(f"✗ Error removing {filename}: {e}")
            not_found_files.append(f"{filename} (error: {e})")
    else:
        not_found_files.append(filename)
        print(f"- Not found: {filename}")

print(f"\nSummary:")
print(f"Removed: {len(removed_files)} files")
print(f"Not found: {len(not_found_files)} files")

if removed_files:
    print(f"\nRemoved files:")
    for f in removed_files:
        print(f"  - {f}")

if not_found_files:
    print(f"\nNot found files:")
    for f in not_found_files:
        print(f"  - {f}")