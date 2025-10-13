#!/bin/bash

# Felix Rule System - Claude Code Integration Installer
# This script installs the Felix hooks into your Claude Code configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_SOURCE_DIR="$SCRIPT_DIR/hooks"
CLAUDE_DIR="$HOME/.claude"
HOOKS_DEST_DIR="$CLAUDE_DIR/hooks"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
BACKUP_DIR="$CLAUDE_DIR/backups"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Felix Rule System - Claude Code Integration Setup      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Claude Code is installed
if [ ! -d "$CLAUDE_DIR" ]; then
    print_error "Claude Code directory not found at $CLAUDE_DIR"
    print_status "Please ensure Claude Code is installed and you've run it at least once."
    exit 1
fi

# Check for required dependencies
print_status "Checking dependencies..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    print_status "Please install Node.js to use Felix hooks"
    exit 1
fi

NODE_VERSION=$(node --version 2>&1)
print_status "Node.js version: $NODE_VERSION"

# Check for curl
if ! command -v curl &> /dev/null; then
    print_error "curl is not installed"
    print_status "Please install curl to use Felix hooks"
    exit 1
fi

print_success "All dependencies found"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup existing settings if they exist
if [ -f "$SETTINGS_FILE" ]; then
    BACKUP_FILE="$BACKUP_DIR/settings.json.$(date +%Y%m%d_%H%M%S)"
    print_status "Backing up existing settings to $BACKUP_FILE"
    cp "$SETTINGS_FILE" "$BACKUP_FILE"
fi

# Create hooks directory if it doesn't exist
print_status "Creating hooks directory..."
mkdir -p "$HOOKS_DEST_DIR"

# Clean old hooks (bash and python versions)
print_status "Cleaning old hook scripts..."
rm -f "$HOOKS_DEST_DIR"/felix*.sh "$HOOKS_DEST_DIR"/felix*.py
print_success "Old hooks cleaned"

# Copy hooks
print_status "Installing Felix hooks..."
for hook in "$HOOKS_SOURCE_DIR"/*.js; do
    hook_name=$(basename "$hook")
    print_status "  Installing $hook_name..."
    cp "$hook" "$HOOKS_DEST_DIR/"
    chmod +x "$HOOKS_DEST_DIR/$hook_name"
done
print_success "Hooks installed successfully"

# Update settings.json
print_status "Updating Claude Code settings..."

# Check if settings.json exists
if [ ! -f "$SETTINGS_FILE" ]; then
    print_status "Creating new settings.json..."
    cat > "$SETTINGS_FILE" <<'EOF'
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json"
}
EOF
fi

# Create the hooks configuration with full paths
# Convert Git Bash path to Windows path with backslashes
HOOKS_PATH_WIN="$HOOKS_DEST_DIR"
if [[ "$HOOKS_PATH_WIN" =~ ^/([a-z])/ ]]; then
    # Convert /c/Users/... to C:\Users\...
    HOOKS_PATH_WIN=$(echo "$HOOKS_PATH_WIN" | sed 's|^/\([a-z]\)/|\1:|' | sed 's|/|\\|g')
fi

HOOKS_CONFIG=$(cat <<EOF
{
  "UserPromptSubmit": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "node $HOOKS_PATH_WIN\\\\felix-user-prompt-submit.js"
        }
      ]
    }
  ],
  "PreToolUse": [
    {
      "matcher": "Edit|Write|MultiEdit|NotebookEdit",
      "hooks": [
        {
          "type": "command",
          "command": "node $HOOKS_PATH_WIN\\\\felix-pre-tool-use.js"
        }
      ]
    }
  ],
  "PostToolUse": [
    {
      "matcher": "Edit|Write|MultiEdit|NotebookEdit|Task",
      "hooks": [
        {
          "type": "command",
          "command": "node $HOOKS_PATH_WIN\\\\felix-post-tool-use.js"
        }
      ]
    }
  ],
  "SessionEnd": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "node $HOOKS_PATH_WIN\\\\felix-session-end.js"
        }
      ]
    }
  ]
}
EOF
)

# Update settings.json with hooks configuration using Node.js
if [ -f "$SETTINGS_FILE" ]; then
    # Write hooks config to a temp file
    TEMP_HOOKS_FILE="/tmp/felix_hooks_config_$$.json"
    echo "$HOOKS_CONFIG" > "$TEMP_HOOKS_FILE"

    # Use Node.js to update the JSON file
    node -e "
const fs = require('fs');

try {
    // Read the hooks configuration
    const hooksConfig = JSON.parse(fs.readFileSync('$TEMP_HOOKS_FILE', 'utf8'));

    // Read current settings
    const settings = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8'));

    // Check if hooks already exist
    if (settings.hooks) {
        console.error('HOOKS_EXIST');
    }

    // Update hooks configuration
    settings.hooks = hooksConfig;

    // Write updated settings
    fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(settings, null, 2));

    process.exit(0);
} catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
}
" 2>&1 | grep -q 'HOOKS_EXIST' && HOOKS_EXISTED=true || HOOKS_EXISTED=false

    # Clean up temp file
    rm -f "$TEMP_HOOKS_FILE"

    if [ "$HOOKS_EXISTED" = true ]; then
        print_warning "Replaced existing hooks configuration in settings.json"
    else
        print_success "Hooks configuration added to settings.json"
    fi
fi

# Prompt for configuration
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Configuration${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Get server URL
DEFAULT_SERVER_URL="http://localhost:9000"
echo -e "${BLUE}Enter Felix server URL (default: $DEFAULT_SERVER_URL):${NC}"
read -r SERVER_URL
SERVER_URL="${SERVER_URL:-$DEFAULT_SERVER_URL}"

print_success "Felix server URL: $SERVER_URL"

# Test Felix server connection
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Testing Connection${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

print_status "Testing Felix server connection at $SERVER_URL..."
if curl -s -f "$SERVER_URL/api/health" > /dev/null 2>&1; then
    print_success "Felix server is running and accessible"
else
    print_warning "Felix server is not accessible at $SERVER_URL"
    print_status "Make sure to start the server with: npm run server"
fi

# Setup MCP Server
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Setting up MCP Server${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

print_status "Configuring Felix MCP server..."
if command -v claude &> /dev/null; then
    # Try to remove existing felix MCP server if it exists
    claude mcp remove felix 2>/dev/null || true

    # Add MCP server using HTTP transport
    print_status "Running: claude mcp add -s user -t http felix $SERVER_URL/mcp"
    if claude mcp add -s user -t http felix "$SERVER_URL/mcp"; then
        print_success "Felix MCP server configured successfully"
    else
        print_warning "Failed to configure MCP server automatically"
        print_status "You can manually add it later with:"
        print_status "  claude mcp add -s user -t http felix $SERVER_URL/mcp"
    fi
else
    print_warning "Claude CLI not found in PATH"
    print_status "You can manually add the MCP server with:"
    print_status "  claude mcp add -s user -t http felix $SERVER_URL/mcp"
fi

# Final instructions
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo ""
echo "1. Start the Felix server (if not already running):"
echo -e "   ${YELLOW}cd <your-project-directory>${NC}"
echo -e "   ${YELLOW}npm run dev${NC}"
echo ""
echo "2. Start Claude Code in your project directory and the hooks will be active!"
echo ""
echo -e "${GREEN}Happy coding with Felix + Claude Code! 🚀${NC}"