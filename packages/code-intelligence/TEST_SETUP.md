# Test the Complete Setup

Let's test both the dev flow and GitHub Actions!

## Test 1: Post-Install Script (5 minutes)

This tests the automatic build on `npm install`.

```bash
cd packages/code-intelligence

# Test the post-install script
node scripts/postinstall.js
```

**Expected output:**
```
==========================================================
  Felix Code Intelligence - Post Install
==========================================================

🔍 Bundled executables not found. Attempting to build for your platform...

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

💡 To manually build sidecars later:
   npm run build:sidecars
```

**Check it worked:**
```bash
# Check Python executable
ls -lh dist/sidecars/python/python_ast_helper*

# Check Roslyn executable
ls -lh dist/sidecars/roslyn/*/RoslynSidecar*

# Should see executables with sizes like:
# python_ast_helper: ~15-20 MB
# RoslynSidecar: ~80-100 MB
```

---

## Test 2: Run Post-Install Again (Should Skip Build)

```bash
node scripts/postinstall.js
```

**Expected output:**
```
==========================================================
  Felix Code Intelligence - Post Install
==========================================================

✅ Bundled executables found! No build needed.
  Python: /path/to/dist/sidecars/python/python_ast_helper
  Roslyn: /path/to/dist/sidecars/roslyn/osx-x64/RoslynSidecar

💡 Felix will use these bundled executables (no Python/dotnet required)
```

Perfect! It detected existing executables and skipped building.

---

## Test 3: Test Executables Work

```bash
# Test Python helper
./dist/sidecars/python/python_ast_helper --help
# Should show usage info

# Test Roslyn sidecar (Mac/Linux)
./dist/sidecars/roslyn/osx-x64/RoslynSidecar --help
# OR on Windows:
# ./dist/sidecars/roslyn/win-x64/RoslynSidecar.exe --help
# Should show usage info
```

---

## Test 4: Enable GitHub Actions (15 minutes)

Now let's test the full pipeline!

```bash
# Commit everything
git add .github/workflows/build-sidecars.yml
git add scripts/postinstall.js
git add package.json
git add docs/*.md
git commit -m "Add automated builds for sidecars"
git push origin main
```

**Then:**
1. Go to: `https://github.com/YOUR_USERNAME/felix/actions`
2. You should see "Build Sidecars" workflow running
3. Click on it to watch progress
4. Takes ~15 minutes

---

## Test 5: Download from GitHub Release

After the GitHub Actions build completes:

```bash
# Go to: https://github.com/YOUR_USERNAME/felix/releases
# Click on latest release (e.g., "Sidecars Build 1")
# Download all 6 artifacts
```

**Artifacts you should see:**
- python_ast_helper-windows
- python_ast_helper-macos
- python_ast_helper-linux
- roslyn-sidecar-windows
- roslyn-sidecar-macos
- roslyn-sidecar-linux

---

## Test 6: Simulate User Install

Let's simulate what a user experiences:

```bash
# Create a test directory
cd /tmp
mkdir felix-test
cd felix-test

# Link to your package (simulating npm install)
npm init -y
npm link ../../path/to/felix/packages/code-intelligence

# Watch the post-install script run automatically!
```

**You should see:**
```
> @felix/code-intelligence@1.0.0 postinstall
> node scripts/postinstall.js

==========================================================
  Felix Code Intelligence - Post Install
==========================================================

✅ Bundled executables found! No build needed.
  Python: /path/to/python_ast_helper
  Roslyn: /path/to/RoslynSidecar

💡 Felix will use these bundled executables (no Python/dotnet required)
```

Perfect! The post-install ran automatically during npm install!

---

## Test 7: Test Felix Actually Uses Bundled Executables

Create a test file:

```bash
cd /tmp/felix-test

# Create a Python file to parse
cat > test.py << 'EOF'
def hello():
    print("Hello World")

hello()
EOF

# Create a test script
cat > test-felix.js << 'EOF'
import { ParserFactory } from '@felix/code-intelligence/parser';

const factory = new ParserFactory();
const result = await factory.parseDocument('test.py');

console.log('Parsed successfully!');
console.log(`Found ${result.components.length} components`);
EOF

# Run it
node test-felix.js
```

**Watch the console output for:**
```
[python-ast-helper] Using bundled executable: /path/to/python_ast_helper
Parsed successfully!
Found 1 components
```

Success! Felix is using the bundled executable!

---

## Test 8: Test Without Bundled Executables (Fallback)

Let's test the fallback behavior:

```bash
cd packages/code-intelligence

# Rename the bundled executables to simulate them not existing
mv dist/sidecars dist/sidecars-backup

# Run post-install again
node scripts/postinstall.js
```

**Expected output:**
```
🔍 Bundled executables not found. Attempting to build for your platform...
📦 Building Python AST Helper...
  ✅ Built!
📦 Building Roslyn Sidecar...
  ✅ Built!
```

It rebuilds them automatically!

```bash
# Restore backup
rm -rf dist/sidecars
mv dist/sidecars-backup dist/sidecars
```

---

## Success Criteria

All tests passing means:

✅ **Test 1:** Post-install builds executables automatically
✅ **Test 2:** Post-install skips build when executables exist
✅ **Test 3:** Executables run and show help
✅ **Test 4:** GitHub Actions workflow runs successfully
✅ **Test 5:** Release artifacts are downloadable
✅ **Test 6:** Post-install runs automatically on npm install
✅ **Test 7:** Felix uses bundled executables at runtime
✅ **Test 8:** Fallback rebuild works when executables missing

---

## Quick Start (TL;DR)

```bash
# 1. Test post-install locally
cd packages/code-intelligence
node scripts/postinstall.js

# 2. Push to GitHub (enables Actions)
git add .github/workflows/build-sidecars.yml scripts/postinstall.js package.json
git commit -m "Add automated sidecar builds"
git push origin main

# 3. Watch build at:
# https://github.com/YOUR_USERNAME/felix/actions

# 4. Done! Users can now npm install and it works automatically
```

---

## Troubleshooting

### Post-install hangs

PyInstaller or dotnet build can take 2-3 minutes. Just wait.

### Post-install fails

Check you have Python 3.11+ and .NET 8.0 SDK:
```bash
python3 --version  # Should be 3.11+
dotnet --version   # Should be 8.0+
```

### GitHub Actions fails

Click on the failed job to see logs. Common issues:
- Syntax error in workflow YAML
- Path to source files incorrect

### Executables don't work

Check they're executable:
```bash
chmod +x dist/sidecars/python/python_ast_helper
chmod +x dist/sidecars/roslyn/*/RoslynSidecar
```

---

## What's Next?

After tests pass:
1. Use the system in development (it's automatic!)
2. When ready to release, download executables from GitHub Releases
3. Package and publish to npm
4. Users get automatic, painless installs 🎉
