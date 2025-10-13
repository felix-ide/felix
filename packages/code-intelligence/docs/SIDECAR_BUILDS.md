# Sidecar Builds - Portable Executables

## Overview

Felix Code Intelligence uses two language-specific sidecars for advanced parsing capabilities:

1. **Python AST Helper** - For Python AST parsing and analysis
2. **Roslyn Sidecar** - For C# semantic analysis

To eliminate dependency issues and improve portability, both sidecars can be built as **self-contained executables** that bundle all required runtimes.

## Problem Solved

**Before:** Users needed to install:
- Python 3.x for Python parsing
- .NET 8.0 SDK for C# analysis
- Correct versions of each

**After:**
- Felix can use bundled executables that require **no external dependencies**
- Automatic fallback to system installations if executables not found
- Cross-platform support (Windows, macOS, Linux)

## Architecture

### Priority-Based Resolution

Both sidecars use a priority-based resolution system:

#### Python AST Helper
1. **Bundled Executable** (no Python required)
   - `dist/sidecars/python/python_ast_helper.exe` (Windows)
   - `dist/sidecars/python/python_ast_helper` (Unix)
2. **System Python** (fallback)
   - Tries `py -3`, `python3`, `python` in order

#### Roslyn Sidecar
1. **Bundled Self-Contained Executable** (no .NET required)
   - `dist/sidecars/roslyn/{rid}/RoslynSidecar.exe` (Windows)
   - `dist/sidecars/roslyn/{rid}/RoslynSidecar` (Unix)
   - RID: `win-x64`, `osx-x64`, `linux-x64`
2. **Development Build** (requires .NET runtime)
   - `bin/Release/net9.0/RoslynSidecar`
3. **dotnet run** (fallback, requires .NET SDK)

## Building Sidecars

### Build All Sidecars

```bash
npm run build:sidecars
```

This builds both Python and Roslyn sidecars for the current platform.

### Build Python Executable

```bash
npm run build:sidecar:python
```

Requirements:
- Python 3.11+ installed
- PyInstaller (`pip install pyinstaller`)

Output: `dist/sidecars/python/python_ast_helper[.exe]`

### Build Roslyn Executable

```bash
npm run build:sidecar:roslyn
```

Requirements:
- .NET 8.0 SDK or later

Output: `dist/sidecars/roslyn/{rid}/RoslynSidecar[.exe]`

### Cross-Platform Builds

To build for multiple platforms, you need to run the build scripts on each platform:

**Option 1: Manual builds**
- Run `npm run build:sidecars` on macOS to create macOS executables
- Run `npm run build:sidecars` on Windows to create Windows executables
- Run `npm run build:sidecars` on Linux to create Linux executables

**Option 2: Virtual machines**
- Use VMs or cloud instances to build for other platforms
- Use Docker for Linux builds from any platform

**Option 3: CI/CD (optional)**
- Set up GitHub Actions, GitLab CI, or similar
- Automate multi-platform builds
- Store artifacts for distribution

## Distribution

### Including Sidecars in Package

The `package.json` includes `"dist"` in the `"files"` array, which ensures bundled executables are included when publishing to npm.

Structure:
```
@felix/code-intelligence/
├── dist/
│   ├── sidecars/
│   │   ├── python/
│   │   │   ├── python_ast_helper.exe  (Windows)
│   │   │   └── python_ast_helper      (Unix)
│   │   └── roslyn/
│   │       ├── win-x64/
│   │       │   └── RoslynSidecar.exe
│   │       ├── osx-x64/
│   │       │   └── RoslynSidecar
│   │       └── linux-x64/
│   │           └── RoslynSidecar
│   └── ... (TypeScript compiled code)
```

## User Requirements

### With Bundled Executables (Recommended)
- **No Python required**
- **No .NET required**
- Just `npm install @felix/code-intelligence`

### Without Bundled Executables (Fallback)
- Python 3.11+ for Python parsing
- .NET 8.0 SDK for C# analysis

## Development

### Testing Bundled Executables

```bash
# Build the sidecars
npm run build:sidecars

# Run tests - should automatically use bundled executables
npm test
```

### Debugging Resolution

Both services log which executable they're using:

```
[python-ast-helper] Using bundled executable: /path/to/python_ast_helper
[roslyn-sidecar] Using bundled executable: /path/to/RoslynSidecar
```

Or fallback messages:

```
[python-ast-helper] Bundled executable not found, using system Python
[roslyn-sidecar] Bundled executable not found, checking development builds
```

## Technical Details

### Python Executable

Built with PyInstaller using `--onefile` mode:
- Bundles Python interpreter and all dependencies
- Creates single executable file
- Size: ~15-20 MB
- Startup: Slightly slower than script (extraction overhead)

### Roslyn Executable

Built with .NET publish using:
- `PublishSingleFile=true` - Single executable
- `SelfContained=true` - Bundles .NET runtime
- `PublishTrimmed=true` - Removes unused assemblies
- `IncludeNativeLibrariesForSelfExtract=true` - Includes native libs
- `EnableCompressionInSingleFile=true` - Compresses bundle

Result:
- Size: ~80-100 MB (includes full .NET runtime + Roslyn)
- Startup: Fast (native code)
- No .NET SDK or runtime required on target machine

## Troubleshooting

### Python Executable Issues

**Issue:** "Python 3 interpreter not found"
- **Solution:** Either build Python executable or install Python 3.11+

**Issue:** Python executable fails to start
- **Solution:** Check file permissions, rebuild executable for correct platform

### Roslyn Executable Issues

**Issue:** ".NET SDK not found" when using dotnet fallback
- **Solution:** Either build Roslyn executable or install .NET 8.0 SDK

**Issue:** Roslyn executable crashes
- **Solution:** Check that executable was built for correct platform (RID mismatch)

### General Issues

**Issue:** Executables not found after install
- **Solution:** Run `npm run build:sidecars` to build them locally
- Or obtain pre-built binaries from your distribution source

**Issue:** Wrong platform executable used
- **Solution:** Check platform detection in service code, ensure correct RID

## Future Enhancements

1. **Automatic Download**: Download platform-specific binaries during `npm install` (from CDN or release server)
2. **Electron/Desktop App**: Bundle executables directly in app distributables
3. **Docker Images**: Pre-built Docker images with all sidecars
4. **ARM Support**: Build for ARM64 architectures (Apple Silicon, ARM Linux)
5. **Size Optimization**: Further reduce executable sizes with advanced trimming
6. **CI/CD**: Automate multi-platform builds with GitHub Actions or similar

## Related Files

- `src/code-parser/services/PythonAstBridge.ts` - Python executable resolution
- `src/code-parser/services/RoslynSidecarService.ts` - Roslyn executable resolution
- `scripts/build-python-executable.sh` - Python build script
- `src/code-parser/sidecars/roslyn/build-standalone.sh` - Roslyn build script
- `package.json` - Build scripts configuration
