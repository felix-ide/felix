# Complete Setup Guide - Production & Dev Flow

## Overview

Felix now has **two automatic build systems** to make life easy:

1. **GitHub Actions** - Builds all platforms for packaged releases
2. **Post-install Script** - Builds current platform when users do `npm install`

## The Two Flows

### Flow 1: Packaged Release (You as Maintainer)

```
YOU push code
    ↓
GitHub Actions builds Windows, Mac, Linux (15 min)
    ↓
YOU download 6 executables from Releases
    ↓
npm publish (with all executables)
    ↓
USERS install → executables already bundled → works immediately
```

**User Experience:**
```bash
npm install @felix/code-intelligence
# ✅ Works immediately! No build, no dependencies!
```

---

### Flow 2: Dev/Source Install (Users installing from source)

```
USER runs: npm install @felix/code-intelligence
    ↓
Post-install script automatically runs
    ↓
Detects their platform (Mac/Windows/Linux)
    ↓
Builds executables for THEIR platform only
    ↓
If build succeeds → uses bundled executable
If build fails → uses system Python/dotnet
```

**User Experience:**
```bash
npm install @felix/code-intelligence

# Post-install runs automatically:
==========================================================
  Felix Code Intelligence - Post Install
==========================================================

🔍 Bundled executables not found. Attempting to build...

📦 Building Python AST Helper...
  🔨 Building executable (this may take 1-2 minutes)...
  ✅ Python executable built successfully!

📦 Building Roslyn Sidecar...
  🔨 Building self-contained executable (this may take 2-3 minutes)...
  ✅ Roslyn executable built successfully!

==========================================================
  Installation Summary
==========================================================
✅ All sidecars built successfully!
✅ Felix will use bundled executables (no runtime dependencies)
```

---

## Setup Instructions

### Step 1: Test Locally First

Let's test that everything works on your machine:

```bash
cd packages/code-intelligence

# Test the postinstall script manually
node scripts/postinstall.js
```

You should see it build both Python and Roslyn executables (takes 3-5 minutes).

---

### Step 2: Enable GitHub Actions

```bash
# Commit the workflow
git add .github/workflows/build-sidecars.yml
git add scripts/postinstall.js
git add package.json
git commit -m "Add automated builds for dev and production"
git push origin main
```

This triggers the first GitHub Actions build!

---

### Step 3: Watch GitHub Actions Build

Go to: `https://github.com/YOUR_USERNAME/felix/actions`

You'll see:
```
⚙️ Build Sidecars #1
   Running...

   Jobs:
   ✅ Build Python Sidecar (ubuntu-latest)      2m 30s
   ✅ Build Python Sidecar (windows-latest)     2m 45s
   ✅ Build Python Sidecar (macos-latest)       2m 35s
   ✅ Build Roslyn Sidecar (ubuntu-latest)      4m 20s
   ✅ Build Roslyn Sidecar (windows-latest)     4m 30s
   ✅ Build Roslyn Sidecar (macos-latest)       4m 25s
   ✅ Create Release with Artifacts             1m 10s
```

---

### Step 4: Get Executables from Release

Go to: `https://github.com/YOUR_USERNAME/felix/releases`

Download all 6 files and organize:

```bash
cd packages/code-intelligence

# Create structure
mkdir -p dist/sidecars/python
mkdir -p dist/sidecars/roslyn/{win-x64,osx-x64,linux-x64}

# Unzip and copy downloads
unzip ~/Downloads/python_ast_helper-windows.zip -d dist/sidecars/python/
unzip ~/Downloads/python_ast_helper-macos.zip -d dist/sidecars/python/
# (Linux users can use the same macos binary or download linux one)

unzip ~/Downloads/roslyn-sidecar-windows.zip -d dist/sidecars/roslyn/win-x64/
unzip ~/Downloads/roslyn-sidecar-macos.zip -d dist/sidecars/roslyn/osx-x64/
unzip ~/Downloads/roslyn-sidecar-linux.zip -d dist/sidecars/roslyn/linux-x64/
```

---

### Step 5: Publish

```bash
# Build TypeScript
npm run build

# Publish to npm
npm publish
```

The `dist/` folder (including sidecars) is included automatically!

---

## How Users Install

### Scenario A: Installing from npm (with bundled executables)

```bash
npm install @felix/code-intelligence
```

**What happens:**
1. npm downloads package (includes pre-built executables)
2. Post-install script runs
3. Script detects executables already exist
4. **Output:**
   ```
   ✅ Bundled executables found! No build needed.
     Python: /path/to/python_ast_helper
     Roslyn: /path/to/RoslynSidecar
   💡 Felix will use these bundled executables (no Python/dotnet required)
   ```

**Result:** Works immediately with zero dependencies! 🎉

---

### Scenario B: Installing from source (no bundled executables)

```bash
git clone https://github.com/YOUR_USERNAME/felix.git
cd felix/packages/code-intelligence
npm install
```

**What happens:**
1. npm installs dependencies
2. Post-install script runs
3. Script detects NO executables
4. Checks if Python is installed → builds Python executable
5. Checks if .NET is installed → builds Roslyn executable
6. **Output:**
   ```
   🔍 Bundled executables not found. Attempting to build...

   📦 Building Python AST Helper...
   ✅ Python executable built successfully!

   📦 Building Roslyn Sidecar...
   ✅ Roslyn executable built successfully!

   ✅ All sidecars built successfully!
   ```

**Result:** Executables built automatically, works great!

---

### Scenario C: Installing without Python/dotnet

```bash
npm install @felix/code-intelligence
# But user has neither Python nor .NET installed
```

**What happens:**
1. npm downloads package
2. Post-install script runs
3. No bundled executables found
4. No Python found → skips Python build
5. No .NET found → skips Roslyn build
6. **Output:**
   ```
   ❌ Python not found - skipping Python executable build
   💡 Install Python 3.11+ to enable Python parsing

   ❌ .NET SDK not found - skipping Roslyn executable build
   💡 Install .NET 8.0 SDK to enable C# parsing

   ⚠️  No executables built - using system fallbacks

   Felix will work but requires:
     • Python 3.11+ for Python file parsing
     • .NET 8.0 SDK for C# file parsing
   ```

**Result:** Install succeeds (doesn't break!), but user needs to install Python/dotnet to use those features.

---

## Development Workflow

### For You (Maintainer)

**Daily development:**
```bash
# Just use system Python/dotnet
npm test
npm run dev
```

**When you change sidecar code:**
```bash
git commit -m "Update Python parser"
git push
# GitHub Actions builds all platforms automatically
# Download from Releases when ready to publish
```

**Quick manual rebuild:**
```bash
npm run build:sidecars  # Builds for your current platform
```

---

### For Contributors

**Clone and start developing:**
```bash
git clone https://github.com/YOUR_USERNAME/felix.git
cd felix/packages/code-intelligence
npm install  # Auto-builds sidecars for their platform!
npm test
```

They don't even need to know about the build system!

---

## Environment Variables

### Skip Auto-Build

If you want to skip the post-install build (e.g., in Docker):

```bash
SKIP_SIDECAR_BUILD=1 npm install
```

Or in CI:
```bash
CI=true npm install  # Already skipped in CI by default
```

---

## Troubleshooting

### Post-install takes too long

The first build takes 3-5 minutes. This is normal. Subsequent installs will detect existing executables and skip building.

**Speed it up:**
```bash
# Download pre-built from Releases instead
# Place in dist/sidecars/ before npm install
```

---

### Post-install fails but npm install continues

**This is intentional!** The post-install script never fails the npm install. It always exits with success and uses fallbacks.

**Example:**
```bash
npm install @felix/code-intelligence
# ... post-install tries to build ...
# ... build fails ...
# ... install continues successfully ...
# Felix will use system Python/dotnet
```

---

### Want to rebuild after install

```bash
cd node_modules/@felix/code-intelligence
npm run build:sidecars
```

Or just:
```bash
node node_modules/@felix/code-intelligence/scripts/postinstall.js
```

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    YOU (Maintainer)                      │
└─────────────────────────────────────────────────────────┘
                            │
                            │ Push code
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    GitHub Actions                        │
│  Builds: Win, Mac, Linux (Python + Roslyn = 6 files)   │
└─────────────────────────────────────────────────────────┘
                            │
                            │ Creates Release
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   GitHub Releases                        │
│         6 downloadable executables                       │
└─────────────────────────────────────────────────────────┘
                            │
                            │ Download & package
                            ↓
┌─────────────────────────────────────────────────────────┐
│                      npm publish                         │
│         Package includes all executables                 │
└─────────────────────────────────────────────────────────┘
                            │
                            │
          ┌─────────────────┴─────────────────┐
          │                                   │
          ↓                                   ↓
┌─────────────────────┐           ┌─────────────────────┐
│   USERS (npm)       │           │  USERS (source)     │
│   npm install       │           │  git clone + npm    │
└─────────────────────┘           └─────────────────────┘
          │                                   │
          │ Post-install                      │ Post-install
          │ runs                              │ runs
          ↓                                   ↓
┌─────────────────────┐           ┌─────────────────────┐
│ Finds bundled       │           │ No bundled exes     │
│ executables         │           │ Builds for platform │
│ ✅ Done!            │           │ ✅ Done!            │
└─────────────────────┘           └─────────────────────┘
```

---

## Summary

**You get:**
- ✅ Automated multi-platform builds via GitHub Actions
- ✅ Automatic single-platform builds on user install
- ✅ Graceful fallbacks if builds fail
- ✅ Zero config for users
- ✅ Works in all scenarios

**Users get:**
- ✅ npm install → works immediately (if bundled)
- ✅ npm install → auto-builds if not bundled
- ✅ Still works even if builds fail (system fallback)
- ✅ Zero manual setup

**Next steps:**
1. Test post-install locally: `node scripts/postinstall.js`
2. Push workflow to GitHub
3. Watch first GitHub Actions build
4. Download executables from Releases
5. Publish to npm
6. Profit! 🎉
