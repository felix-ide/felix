# GitHub Actions - Quick Start (5 Minutes)

## The Simple Picture

```
YOU (Push Code)
     ↓
GitHub Actions (Builds on Windows, Mac, Linux)
     ↓
GitHub Releases (6 executables ready to download)
     ↓
YOU (Download & package)
     ↓
USERS (npm install → works without Python/dotnet!)
```

## Quick Start

### Step 1: Enable GitHub Actions (One Time)

```bash
# Commit the workflow file
git add .github/workflows/build-sidecars.yml
git commit -m "Add sidecar builds"
git push origin main
```

✅ That's it! First build starts automatically.

---

### Step 2: Watch It Build

Go to: `https://github.com/YOUR_USERNAME/felix/actions`

You'll see:
```
⚙️ Build Sidecars #1
   Running... (15 minutes)

   Jobs:
   ✅ Build Python Sidecar (ubuntu-latest)
   ✅ Build Python Sidecar (windows-latest)
   ✅ Build Python Sidecar (macos-latest)
   ✅ Build Roslyn Sidecar (ubuntu-latest)
   ✅ Build Roslyn Sidecar (windows-latest)
   ✅ Build Roslyn Sidecar (macos-latest)
   ✅ Create Release with Artifacts
```

---

### Step 3: Get Your Executables

**Option A - From Releases (Recommended)**

Go to: `https://github.com/YOUR_USERNAME/felix/releases`

Download:
- `python_ast_helper-windows.zip`
- `python_ast_helper-macos.zip`
- `python_ast_helper-linux.zip`
- `roslyn-sidecar-windows.zip`
- `roslyn-sidecar-macos.zip`
- `roslyn-sidecar-linux.zip`

**Option B - From Actions Tab**

Go to: `https://github.com/YOUR_USERNAME/felix/actions`
→ Click latest successful build
→ Scroll to "Artifacts" section
→ Download each one

---

### Step 4: Organize Them

Unzip and put in this structure:

```
packages/code-intelligence/dist/sidecars/
├── python/
│   ├── python_ast_helper.exe    ← Windows
│   └── python_ast_helper        ← Mac & Linux (same file works on both)
└── roslyn/
    ├── win-x64/
    │   └── RoslynSidecar.exe
    ├── osx-x64/
    │   └── RoslynSidecar
    └── linux-x64/
        └── RoslynSidecar
```

---

### Step 5: Publish

```bash
cd packages/code-intelligence
npm run build  # Compile TypeScript
npm publish    # The dist/ folder (with sidecars) is included automatically
```

Done! Users can now `npm install` and use Felix without Python or .NET.

---

## Manual Trigger (Anytime)

Want to rebuild without code changes?

1. Go to: `https://github.com/YOUR_USERNAME/felix/actions`
2. Click "Build Sidecars" on left sidebar
3. Click "Run workflow" button (top right)
4. Click green "Run workflow"

Build starts immediately.

---

## What Users See

### With Your Bundled Executables:

```bash
npm install @felix/code-intelligence
```

```javascript
import { ParserFactory } from '@felix/code-intelligence/parser';
const factory = new ParserFactory();
await factory.parseDocument('myfile.py');
// ✅ Works! No Python needed!
```

Console:
```
[python-ast-helper] Using bundled executable: /path/to/python_ast_helper
```

### Without Bundled Executables:

```bash
npm install @felix/code-intelligence
```

Console:
```
[python-ast-helper] Bundled executable not found, using system Python
Error: Python 3 interpreter not found
```

User needs to install Python 3.11+ and .NET 8.0 SDK.

---

## Visual Workflow

### Traditional Way (No GitHub Actions):
```
YOU on Mac → Build Mac executables
YOU get Windows machine → Build Windows executables
YOU get Linux machine → Build Linux executables
YOU manually organize and package
Users install → Works only on their platform
```
⏱️ **Time:** Hours, need 3 machines

### With GitHub Actions:
```
YOU push code
↓
GitHub builds all 3 platforms automatically (15 min)
↓
YOU download 6 files from Releases
↓
YOU organize into dist/sidecars/
↓
npm publish
↓
Users install → Works on all platforms!
```
⏱️ **Time:** 15 minutes, one click, no extra machines needed

---

## FAQs

**Q: Do I need to do this every time I change TypeScript code?**
A: No! Only when you change Python or Roslyn sidecar code.

**Q: What if I just want to test locally?**
A: Just use system Python/dotnet. Builds are only for distribution.

**Q: How much does this cost?**
A: Free for public repos. ~$0.008/minute for private repos (~$0.72 per build).

**Q: Can I disable automatic builds?**
A: Yes! Remove the `push:` trigger from workflow file, keep only `workflow_dispatch:` for manual builds.

**Q: What if a build fails?**
A: Click on the failed job to see logs. Usually a syntax error in sidecar code.

**Q: Do I have to include all 6 executables?**
A: No! You can include only the platforms you support. Others fall back to system installations.

---

## That's It!

The workflow is now set up. Every time you push changes to sidecar code:
1. GitHub automatically builds everything
2. You download from Releases
3. You package and publish
4. Users get a better experience

No manual builds on multiple machines needed! 🎉
