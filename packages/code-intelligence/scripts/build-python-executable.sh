#!/bin/bash
# Build standalone Python executable for all platforms
# This eliminates the need for users to have Python installed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$SCRIPT_DIR/.."
SRC_FILE="$PKG_DIR/src/code-parser/parsers/python_ast_helper.py"
BUILD_DIR="$PKG_DIR/build/python-sidecar"
DIST_DIR="$PKG_DIR/dist/sidecars/python"

echo "Building Python AST Helper standalone executable..."

# Check if PyInstaller is installed
if ! command -v pyinstaller &> /dev/null; then
    echo "PyInstaller not found. Installing..."
    pip install pyinstaller
fi

# Clean previous builds
rm -rf "$BUILD_DIR" "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Build for current platform
echo "Building for current platform..."
pyinstaller \
    --onefile \
    --name python_ast_helper \
    --distpath "$DIST_DIR" \
    --workpath "$BUILD_DIR/work" \
    --specpath "$BUILD_DIR" \
    --clean \
    "$SRC_FILE"

echo "✓ Built executable: $DIST_DIR/python_ast_helper"

# Instructions for cross-platform builds
cat << 'EOF'

To build for other platforms, use GitHub Actions or:

Windows (on Windows):
  pyinstaller --onefile --name python_ast_helper.exe python_ast_helper.py

macOS (on macOS):
  pyinstaller --onefile --name python_ast_helper python_ast_helper.py

Linux (on Linux):
  pyinstaller --onefile --name python_ast_helper python_ast_helper.py

Or use docker for cross-platform builds:
  docker run --rm -v $(pwd):/app python:3.11-slim bash -c \
    "pip install pyinstaller && cd /app && pyinstaller --onefile python_ast_helper.py"
EOF

echo ""
echo "Next steps:"
echo "1. Commit the built executables to git (or download from GitHub releases)"
echo "2. Update PythonAstBridge.ts to use bundled executable"
echo "3. Update package.json to include dist/sidecars in 'files' array"
