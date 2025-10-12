#!/bin/bash

# Build standalone self-contained Roslyn Sidecar executables
# This creates executables that don't require .NET runtime installed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building standalone Roslyn Sidecar executable..."

# Check if .NET is installed
if ! command -v dotnet &> /dev/null; then
    echo "Error: .NET SDK not found. Please install .NET 8.0 SDK or later."
    echo "Download from: https://dotnet.microsoft.com/download"
    exit 1
fi

# Check .NET version
DOTNET_VERSION=$(dotnet --version)
echo "Using .NET version: $DOTNET_VERSION"

# Determine platform
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    RID="linux-x64"
    EXECUTABLE_NAME="RoslynSidecar"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    RID="osx-x64"
    EXECUTABLE_NAME="RoslynSidecar"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    RID="win-x64"
    EXECUTABLE_NAME="RoslynSidecar.exe"
else
    echo "Error: Unsupported platform: $OSTYPE"
    exit 1
fi

echo "Building for platform: $RID"

# Output directory (relative to package root)
OUTPUT_DIR="../../../../dist/sidecars/roslyn/$RID"

# Clean previous builds
if [ -d "$OUTPUT_DIR" ]; then
    echo "Cleaning previous build..."
    rm -rf "$OUTPUT_DIR"
fi

mkdir -p "$OUTPUT_DIR"

# Publish as self-contained single file
echo "Publishing self-contained executable..."
dotnet publish -c Release \
    -r "$RID" \
    --self-contained true \
    -p:PublishSingleFile=true \
    -p:PublishTrimmed=true \
    -p:IncludeNativeLibrariesForSelfExtract=true \
    -p:EnableCompressionInSingleFile=true \
    -o "$OUTPUT_DIR"

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Standalone build completed successfully!"
    echo ""
    echo "Executable location: $OUTPUT_DIR/$EXECUTABLE_NAME"

    # Show file size
    if [ -f "$OUTPUT_DIR/$EXECUTABLE_NAME" ]; then
        SIZE=$(du -h "$OUTPUT_DIR/$EXECUTABLE_NAME" | cut -f1)
        echo "Executable size: $SIZE"
    fi

    echo ""
    echo "This executable includes the .NET runtime and can run without .NET installed."
    echo ""
    echo "Test the sidecar with:"
    echo "  $OUTPUT_DIR/$EXECUTABLE_NAME stdio"
else
    echo "❌ Build failed!"
    exit 1
fi
