#!/bin/bash
# Execute removal of grabbable core files

echo "=== REMOVING GRABBABLE CORE FILES ==="
echo "This will delete all grabbable module files from the core"
echo ""

# Files to remove (grabbable core modules)
GRABBABLE_FILES=(
  "src/core/nodes/Grabbable.js"
  "src/core/nodes/GrabbableInput.js"
  "src/core/nodes/GrabbableSnap.js"
  "src/core/nodes/GrabbableGrab.js"
  "src/core/nodes/GrabbableHandlers.js"
  "src/core/nodes/GrabbableProxy.js"
  "src/core/nodes/GrabbableOutline.js"
  "src/core/nodes/GrabbableUtils.js"
)

# Remove grabbable core files
echo "Removing grabbable core files..."
for file in "${GRABBABLE_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "  ✓ REMOVED: $file"
  else
    echo "  - NOT FOUND: $file"
  fi
done

# Test files to remove
TEST_FILES=(
  "examples/grabbable-test.js"
  "examples/simple-grabbable.js"
)

echo ""
echo "Removing test files..."
for file in "${TEST_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "  ✓ REMOVED: $file"
  else
    echo "  - NOT FOUND: $file"
  fi
done

# Documentation to remove
DOC_FILES=(
  "docs/GRABBABLE_TESTING.md"
  "docs/TESTING_GRABBABLES_CORRECTED.md"
  "docs/GRABBABLE_SUMMARY.md"
  "docs/GRABBABLE_FIXES_SUMMARY.md"
  "TESTING_GRABBABLE_NOW.md"
  "FIX_APPLIED.md"
  "REVERT_GRABBABLE_PLAN.md"
)

echo ""
echo "Removing documentation files..."
for file in "${DOC_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "  ✓ REMOVED: $file"
  else
    echo "  - NOT FOUND: $file"
  fi
done

echo ""
echo "=== REMOVAL COMPLETE ==="
echo ""
echo "Files kept:"
echo "  ✓ src/core/nodes/Snap.js (positioning system)"
echo "  ✓ examples/collectables/* (working collectables)"
echo "  ✓ examples/grabbable-demo.js (original demo)"
echo ""
echo "Next steps:"
echo "  1. npm run build (verify build succeeds)"
echo "  2. Test collectables system"
echo ""
