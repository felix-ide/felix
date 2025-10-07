# Python Sidecar Upgrade Notes

## sentence-transformers 3.x → 5.x

**Breaking Change:** sentence-transformers v5.0+ removed the `dtype` parameter from `encode()`.

### If you're upgrading:

1. **Stop the sidecar:**
   ```bash
   npm run sidecar:stop
   ```

2. **Delete and recreate the virtual environment:**
   ```bash
   cd python-sidecar
   rm -rf .venv
   ```

3. **Run setup to reinstall with GPU detection:**
   ```bash
   npm run setup --auto
   ```

   Or manually:
   ```bash
   # macOS/Linux
   python3 -m venv .venv
   source .venv/bin/activate

   # Windows
   py -3 -m venv .venv
   .venv\Scripts\activate

   # Install dependencies
   pip install --upgrade pip

   # For CUDA (NVIDIA GPU on Windows/Linux):
   pip install torch --index-url https://download.pytorch.org/whl/cu124

   # For CPU or macOS:
   pip install torch

   # Install rest
   pip install -r requirements.txt
   ```

4. **Restart your dev server**

### Code changes

The sidecar code (`app.py`) now handles both v3-4 and v5+ with backwards compatibility, so the code will work regardless of version. But for consistency, everyone should upgrade to v5.x.

### Why the upgrade?

- sentence-transformers v5+ required for Python 3.13 support
- Better CUDA support on newer PyTorch versions
- Performance improvements
