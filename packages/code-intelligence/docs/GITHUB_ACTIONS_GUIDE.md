# GitHub Actions Guide - Building Sidecars

## Overview

This guide explains how YOU (as Felix maintainer) use GitHub Actions to automatically build sidecars for all platforms, and how your users benefit.

## What GitHub Actions Does

When you push code or click a button, GitHub automatically:
1. Spins up 3 virtual machines (Windows, Mac, Linux)
2. Builds Python executable on each
3. Builds Roslyn executable on each
4. Packages everything as a GitHub Release
5. You download and distribute to users

**Result:** You get 6 executables (2 sidecars × 3 platforms) without needing 3 computers.

## How YOU Use It (Maintainer Workflow)

### Method 1: Automatic Builds (On Code Push)

**Step 1:** Make changes to sidecar code
```bash
# Edit Python helper
vim src/code-parser/parsers/python_ast_helper.py

# OR edit Roslyn code
vim src/code-parser/sidecars/roslyn/Program.cs
```

**Step 2:** Commit and push to main
```bash
git add .
git commit -m "Update sidecar code"
git push origin main
```

**Step 3:** GitHub Actions automatically starts building
- Go to: https://github.com/YOUR_USERNAME/felix/actions
- You'll see "Build Sidecars" workflow running
- Takes about 10-15 minutes

**Step 4:** Wait for completion
- Green checkmark ✅ = Success
- Red X ❌ = Failed (click to see logs)

---

### Method 2: Manual Trigger (Anytime)

**Step 1:** Go to GitHub Actions tab
```
https://github.com/YOUR_USERNAME/felix/actions
```

**Step 2:** Click "Build Sidecars" workflow on the left

**Step 3:** Click "Run workflow" button (top right)

**Step 4:** Select branch (usually `main`) and click green "Run workflow"

**Result:** Builds start immediately, even without code changes

---

## Getting Your Built Executables

### Option A: Download from Release

**Step 1:** Go to Releases
```
https://github.com/YOUR_USERNAME/felix/releases
```

**Step 2:** Find latest release (named like "Sidecars Build 42")

**Step 3:** Download the artifacts you need:
- `python_ast_helper-windows` - Windows Python executable
- `python_ast_helper-macos` - Mac Python executable
- `python_ast_helper-linux` - Linux Python executable
- `roslyn-sidecar-windows` - Windows Roslyn executable (folder)
- `roslyn-sidecar-macos` - Mac Roslyn executable (folder)
- `roslyn-sidecar-linux` - Linux Roslyn executable (folder)

**Step 4:** Extract and organize:
```bash
# Unzip downloads and organize like this:
dist/
├── sidecars/
│   ├── python/
│   │   ├── python_ast_helper.exe    # Windows
│   │   └── python_ast_helper        # Mac/Linux
│   └── roslyn/
│       ├── win-x64/
│       │   └── RoslynSidecar.exe
│       ├── osx-x64/
│       │   └── RoslynSidecar
│       └── linux-x64/
│           └── RoslynSidecar
```

### Option B: Download from Actions Tab

**Step 1:** Go to Actions tab
```
https://github.com/YOUR_USERNAME/felix/actions
```

**Step 2:** Click on a completed build (green checkmark)

**Step 3:** Scroll down to "Artifacts" section

**Step 4:** Download individual artifacts (same 6 files as above)

---

## Packaging for Distribution

### For NPM Package

**Step 1:** Get all 6 executables (from Release or Actions)

**Step 2:** Place them in correct structure:
```bash
cd packages/code-intelligence

# Create directories
mkdir -p dist/sidecars/python
mkdir -p dist/sidecars/roslyn/win-x64
mkdir -p dist/sidecars/roslyn/osx-x64
mkdir -p dist/sidecars/roslyn/linux-x64

# Copy executables
cp ~/Downloads/python_ast_helper.exe dist/sidecars/python/
cp ~/Downloads/python_ast_helper dist/sidecars/python/
cp ~/Downloads/RoslynSidecar.exe dist/sidecars/roslyn/win-x64/
cp ~/Downloads/RoslynSidecar-mac dist/sidecars/roslyn/osx-x64/RoslynSidecar
cp ~/Downloads/RoslynSidecar-linux dist/sidecars/roslyn/linux-x64/RoslynSidecar
```

**Step 3:** Build TypeScript
```bash
npm run build
```

**Step 4:** Publish
```bash
npm publish
```

The `dist/` folder (including sidecars) is automatically included due to `"files": ["dist"]` in package.json.

---

### For Electron/Desktop App

**Step 1:** Get all 6 executables

**Step 2:** Bundle them in your Electron app:
```javascript
// In your Electron build config
extraResources: [
  {
    from: 'packages/code-intelligence/dist/sidecars',
    to: 'sidecars',
    filter: ['**/*']
  }
]
```

---

## User Experience

### What Users Do (With Bundled Executables)

```bash
# Install Felix
npm install @felix/code-intelligence

# Use it immediately - no Python or .NET needed!
import { ParserFactory } from '@felix/code-intelligence/parser';
const factory = new ParserFactory();
await factory.parseDocument('file.py');  # Just works!
```

Console output:
```
[python-ast-helper] Using bundled executable: /path/to/python_ast_helper
[roslyn-sidecar] Using bundled executable: /path/to/RoslynSidecar
```

### What Users Do (Without Bundled Executables)

If executables aren't bundled (fallback mode):

```bash
# Install Felix
npm install @felix/code-intelligence

# Install Python 3.11+ and .NET 8.0 SDK
# Then use Felix
```

Console output:
```
[python-ast-helper] Bundled executable not found, using system Python
[roslyn-sidecar] Bundled executable not found, checking development builds
```

---

## Monitoring Builds

### Check Build Status

**GitHub Actions Tab:**
```
https://github.com/YOUR_USERNAME/felix/actions
```

Shows:
- ✅ Recent successful builds
- ❌ Failed builds
- ⚙️ Currently running builds
- ⏱️ Build duration

### Check Build Logs

**Step 1:** Click on a workflow run

**Step 2:** Click on a job (e.g., "Build Python Sidecar (macos-latest)")

**Step 3:** Expand steps to see detailed logs

**Common issues:**
- "Python not found" → Setup Python step failed
- "dotnet command not found" → Setup .NET step failed
- "Build failed" → Syntax error in sidecar code

---

## Troubleshooting

### Build Fails on Windows

**Symptom:** Windows build completes but Linux/Mac fail
**Cause:** Path separator differences (\ vs /)
**Fix:** Use forward slashes in workflow file

### Artifacts Not Found

**Symptom:** Release created but no files attached
**Cause:** Artifact paths incorrect
**Fix:** Check `path:` in upload-artifact steps

### Release Not Created

**Symptom:** Build succeeds but no release
**Cause:** Only creates releases on `main` branch
**Fix:** Ensure you pushed to main branch

### Large Executable Sizes

**Symptom:** Roslyn executable is 100MB+
**Cause:** Self-contained .NET includes full runtime
**Fix:** This is expected, consider:
- Enabling `PublishTrimmed=true` (already set)
- Using compression in release

---

## Cost

GitHub Actions is **FREE** for public repositories with generous limits:
- 2,000 minutes/month free
- Unlimited for public repos
- Each build takes ~15 minutes × 6 jobs = ~90 minutes
- You can run ~20 builds per month for free on private repos
- Unlimited on public repos

For private repos, if you exceed limits:
- Buy additional minutes
- Or build locally and upload manually

---

## Advanced: Scheduled Builds

Want to build nightly? Add this to workflow:

```yaml
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:
  push:
    branches: [main]
```

---

## Advanced: Build Only Changed Sidecars

Currently builds both Python and Roslyn every time. To optimize:

```yaml
jobs:
  check-changes:
    runs-on: ubuntu-latest
    outputs:
      python: ${{ steps.filter.outputs.python }}
      roslyn: ${{ steps.filter.outputs.roslyn }}
    steps:
      - uses: actions/checkout@v3
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            python:
              - 'packages/code-intelligence/src/code-parser/parsers/python_ast_helper.py'
            roslyn:
              - 'packages/code-intelligence/src/code-parser/sidecars/roslyn/**'

  build-python-sidecar:
    needs: check-changes
    if: needs.check-changes.outputs.python == 'true'
    # ... rest of job
```

---

## Summary: Your Workflow

1. **One-time setup:**
   - Push `.github/workflows/build-sidecars.yml` to your repo
   - Done!

2. **When you change sidecar code:**
   - Push to main → automatic build
   - OR click "Run workflow" button → manual build

3. **When build completes:**
   - Go to Releases tab
   - Download 6 artifacts
   - Organize into `dist/sidecars/` structure

4. **When publishing Felix:**
   - Run `npm publish` (includes bundled executables)
   - Users install and it "just works"

**Time saved:** Instead of needing 3 machines and building manually, you click one button and get everything in 15 minutes.

---

## Next Steps

1. **Push the workflow file:**
   ```bash
   git add .github/workflows/build-sidecars.yml
   git commit -m "Add GitHub Actions workflow for sidecar builds"
   git push origin main
   ```

2. **Watch it run:**
   - Go to Actions tab
   - See the build in progress

3. **Download artifacts:**
   - Check Releases tab after build completes
   - Download and test executables

4. **Integrate into your release process:**
   - Include downloaded executables in your npm package
   - Users benefit from zero dependencies
