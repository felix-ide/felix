# Felix on Windows — Complete Setup Guide

This walkthrough targets Windows 11/10 users and assumes zero recent Windows tooling experience. It covers every dependency Felix can use, explains which shell to run each command in, and notes optional steps you may skip if you do not need a particular language parser.

> **TL;DR**: open *Windows Terminal* → PowerShell tab → run the commands under **Quick Install**. Afterwards, `npm install` at the repo root does the heavy lifting, and you can start the backend with `npm run dev --workspace @felix/server` and the web UI with `npm run dev --workspace @felix/client`.

---

## 1. Choose Your Shell

Felix scripts now run cross-platform, so any modern shell works. Pick whichever you’re most comfortable with and stick to it for consistency.

| Shell | How to open | Notes |
|-------|-------------|-------|
| **PowerShell 7 (recommended)** | Start Menu → Windows Terminal → dropdown → *Windows PowerShell* | Supports copying Winget commands directly, has sensible defaults. Use for Administrator tasks too. |
| **Command Prompt (cmd.exe)** | Start Menu → `cmd` | Commands are similar to PowerShell but without `$` prefixes or backticks. |
| **Git Bash** | Install Git → Start Menu → Git Bash | Fine for Git and npm, but Winget/Chocolatey commands do **not** run here. |

> Tip: if a command fails in Git Bash, retry it in PowerShell. All commands in this guide list the shell they expect.

---

## 2. Install Dependencies

Felix needs a few global tools. You can let Winget install everything automatically, or install by hand.

### 2.1 Quick Install (PowerShell, run as Administrator)

```powershell
# Install package managers / runtimes
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Python.Python.3.12 -e

# Build tooling for native Node modules (better-sqlite3, etc.)
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive"

# Optional runtimes (enable related language parsers)
winget install --id PHP.PHP -e            # PHP parsing
winget install --id EclipseAdoptium.Temurin.17.JDK -e    # Java parsing
winget install --id Composer.Composer -e  # PHP composer support
```

If Winget is unavailable (older images, corporate machines), use Chocolatey instead:

```powershell
# Administrator PowerShell
Set-ExecutionPolicy Bypass -Scope Process -Force;
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072;
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

choco install git nodejs python visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools" -y
# Optional features
choco install php openjdk composer -y
```

### 2.2 Manual Install Checklist

1. **Git** — download the 64-bit installer from [git-scm.com](https://git-scm.com/download/win). During setup, choose “Git from the command line and also from 3rd-party software” so PowerShell can see it.
2. **Node.js 18+** — grab the LTS installer from [nodejs.org](https://nodejs.org/). Re-run the installer if `node --version` reports anything below `v18`.
3. **Python 3.10+** — get the Windows installer from [python.org](https://www.python.org/downloads/). Tick **“Add python.exe to PATH”**.
4. **C++ Build Tools** — install “Build Tools for Visual Studio 2022” from [Microsoft](https://visualstudio.microsoft.com/downloads/). During installation, select *C++ build tools* and accept defaults to cover all node-gyp workloads.
5. *(Optional)* PHP, Composer, and Java like above if you need PHP/Java parsing.

Verify everything is on your PATH (run in PowerShell):

```powershell
node --version
npm --version
python --version
pip --version
cl.exe  # this should print Microsoft compiler info if Build Tools are installed
```

If any command is missing, reopen your terminal or reboot once so PATH updates take effect.

---

## 3. Clone Felix

PowerShell / Command Prompt / Git Bash (non-admin):

```powershell
git clone https://github.com/your-org/felix.git
cd felix
```

If you use SSH keys, replace the URL accordingly.

### Optional: enable long file paths

Some dependency file names exceed Windows’ default 260-character limit. Run once in an elevated PowerShell:

```powershell
reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f
```

Reboot afterwards for the change to stick.

---

## 4. Install Node Dependencies

All shells (PowerShell recommended):

```powershell
npm install
```

The root `postinstall` script runs `scripts/setup.js`, which will:

- Validate your Node/Python/Tree-sitter environment
- Offer to download missing TextMate grammars
- Check for optional LSP servers

If the script needs to compile native addons, the first run can take several minutes. Re-run `npm install` if you install additional runtimes later.

### 4.1 Sidecar (Python service)

Felix’s semantic features use a Python sidecar server. Lifecycle helpers are exposed via npm scripts:

```powershell
npm run sidecar         # starts the service if it is not already running
npm run sidecar:stop    # stops any tracked sidecar processes
```

Internally these call `scripts/ensure-sidecar.mjs` and `scripts/stop-sidecar.mjs`. The starter detects Python, creates `.venv` under `python-sidecar`, installs requirements (unless `SKIP_PIP_INSTALL=1`), and launches Uvicorn on `http://127.0.0.1:8088`. Logs are written to your temp directory (`%TEMP%\felix-sidecar.log`). If the helper needs more time to become healthy (slow machines, first run), set `SIDECAR_STARTUP_TIMEOUT_MS` in the environment before running it.

---

## 5. Development Workflow

You can run everything from Windows without WSL.

### Backend (Felix server + MCP)

```powershell
npm run dev --workspace @felix/server
```

This command ensures the sidecar is running, builds the TypeScript sources, and then launches the server on `http://localhost:9000`.

### Frontend (Felix client web UI)

```powershell
npm run dev --workspace @felix/client
```

The client uses Vite, which supports hot reloading out of the box.

### Full-stack convenience script

If you prefer one command that launches everything (code intelligence services, server, client, theme system, etc.), run:

```powershell
npm run dev
```

This uses `concurrently` to spawn multiple processes. On Windows you may see extra console noise—this is normal. Use `Ctrl+C` twice to shut everything down.

---

## 6. Optional Integrations & Language Support

Felix detects parsers based on what is installed on your machine.

| Feature | Requirement | How to enable |
|---------|-------------|---------------|
| PHP AST parsing | PHP CLI (`php`) and Composer (optional) | Install via Winget/Chocolatey; run `php --version` to confirm. |
| Python AST helper | Python 3.10+ | Already installed above; sidecar script will install dependencies automatically. |
| Java parsing | Java 11+ JDK | Install Temurin/OpenJDK; set `JAVA_HOME` if needed. |
| Markdown/HTML/CSS | Included by default | No extra setup. |
| Optional LSPs | Depends on language | Run `npm run setup` to see which servers are missing; the script offers download links. |

> If a parser is missing, Felix falls back to Tree-sitter. Installing the native runtime usually gives richer results (namespaces, docblocks, etc.).

---

## 7. Verification Checklist

Run these commands in PowerShell to confirm everything works end-to-end:

```powershell
# 1. Backend build
npm run build --workspace @felix/server

# 2. Frontend build
npm run build --workspace @felix/client

# 3. Whole workspace tests (takes several minutes)
npm test --workspaces

# 4. Start the server (keep running)
npm run dev --workspace @felix/server

# 5. In a new terminal, start the client
npm run dev --workspace @felix/client
```

Visit `http://localhost:9000` for the full Felix UI or `http://localhost:9000/api/health` to confirm the backend is healthy.

---

## 8. Troubleshooting on Windows

| Symptom | Fix |
|---------|-----|
| `better-sqlite3` fails to build | Ensure Visual Studio Build Tools with C++ workload is installed; run `npm rebuild better-sqlite3`. |
| `node-gyp` errors referencing Python | Run `py -3 --version`; if Python is missing, reinstall with “Add to PATH”. Double-check `npm config get python`. |
| `cl : Command line warning D9025` | Harmless; occurs when Build Tools provide additional compiler flags. |
| `ELIFECYCLE errno 3221225477` during install | Usually Node was downloaded from the Microsoft Store. Remove it (`winget uninstall Node.js`) and reinstall the official LTS MSI. |
| Sidecar fails with SSL DLL errors | Ensure Visual C++ Redistributable is installed (Build Tools includes it). Delete `python-sidecar/.venv` and rerun `npm run sidecar`. |
| Ports already in use | Change `SIDECAR_BIND_PORT` or the server’s `PORT` environment variable before running `npm run dev`. |

---

## 9. Staying Up to Date

- Pull latest code: `git pull` (PowerShell/Git Bash).
- Install new dependencies: `npm install`.
- Rerun `npm run setup` if the script adds new checks; it is safe to run multiple times.
- Periodically update the sidecar virtual environment: delete `python-sidecar/.venv` and run `npm run sidecar` again.

---

## 10. Need WSL Instead?

You do **not** need WSL for Felix, but if you prefer a Linux userland:

1. Install WSL (`wsl --install` from Administrator PowerShell).
2. Inside WSL, follow the Linux/macOS instructions in `docs/felix-docs/getting-started.md`.

WSL can share the same working tree, but avoid running `npm install` from both Windows and WSL simultaneously to prevent `node_modules` conflicts.

---

With these steps you should be able to go from a blank Windows machine to a fully working Felix development environment without hunting down extra context. If you hit a new Windows quirk, add a note here so the next person stays unblocked.
