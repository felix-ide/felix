#!/bin/bash

# Build script for Roslyn Sidecar
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building Roslyn Sidecar..."

# Check if .NET is installed
if ! command -v dotnet &> /dev/null; then
    echo "Error: .NET SDK not found. Please install .NET 8.0 SDK or later."
    echo "Download from: https://dotnet.microsoft.com/download"
    exit 1
fi

# Check .NET version
DOTNET_VERSION=$(dotnet --version)
echo "Using .NET version: $DOTNET_VERSION"

# Restore dependencies
echo "Restoring NuGet packages..."
dotnet restore

# Build in Release configuration
echo "Building in Release configuration..."
dotnet build -c Release --no-restore

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo ""
    echo "Executable location:"
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        echo "  Windows: bin/Release/net8.0/RoslynSidecar.exe"
    else
        echo "  Unix: bin/Release/net8.0/RoslynSidecar"
    fi
    echo ""
    echo "Test the sidecar with:"
    echo "  dotnet run -- analyze --file YourFile.cs"
    echo "  dotnet run -- workspace --path /path/to/solution.sln"
    echo "  dotnet run -- stdio"
else
    echo "❌ Build failed!"
    exit 1
fi