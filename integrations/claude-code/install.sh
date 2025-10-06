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
for cmd in jq curl; do
    if ! command -v $cmd &> /dev/null; then
        print_error "Required command '$cmd' is not installed"
        print_status "Please install $cmd and try again"
        exit 1
    fi
done
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

# Copy hooks
print_status "Installing Felix hooks..."
for hook in "$HOOKS_SOURCE_DIR"/*.sh; do
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

# Create the hooks configuration
HOOKS_CONFIG=$(cat <<'EOF'
{
  "UserPromptSubmit": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash ~/.claude/hooks/felix-user-prompt-submit.sh"
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
          "command": "bash ~/.claude/hooks/felix-pre-tool-use.sh"
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
          "command": "bash ~/.claude/hooks/felix-post-tool-use.sh"
        }
      ]
    }
  ]
}
EOF
)

# Update settings.json with hooks configuration
if [ -f "$SETTINGS_FILE" ]; then
    # Check if hooks section already exists
    if jq -e '.hooks' "$SETTINGS_FILE" > /dev/null 2>&1; then
        print_warning "Hooks configuration already exists in settings.json"
        echo -e "${YELLOW}Do you want to replace the existing hooks configuration? (y/N)${NC}"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            # Replace hooks section
            jq --argjson hooks "$HOOKS_CONFIG" '.hooks = $hooks' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && \
            mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
            print_success "Hooks configuration updated"
        else
            print_status "Keeping existing hooks configuration"
        fi
    else
        # Add hooks section
        jq --argjson hooks "$HOOKS_CONFIG" '. + {hooks: $hooks}' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && \
        mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
        print_success "Hooks configuration added to settings.json"
    fi
fi

# Prompt for configuration
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Configuration${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Get project path
DEFAULT_PROJECT_PATH="$(pwd)"
echo -e "${BLUE}Enter your project path (default: $DEFAULT_PROJECT_PATH):${NC}"
read -r PROJECT_PATH
PROJECT_PATH="${PROJECT_PATH:-$DEFAULT_PROJECT_PATH}"

# Get server URL
DEFAULT_SERVER_URL="http://localhost:9000"
echo -e "${BLUE}Enter Felix server URL (default: $DEFAULT_SERVER_URL):${NC}"
read -r SERVER_URL
SERVER_URL="${SERVER_URL:-$DEFAULT_SERVER_URL}"

# Create environment configuration
ENV_FILE="$HOME/.felix_claude_config"
cat > "$ENV_FILE" <<EOF
# Felix Rule System Configuration for Claude Code
export FELIX_PROJECT_PATH="$PROJECT_PATH"
export FELIX_SERVER_URL="$SERVER_URL"
export DEBUG_MODE="false"
EOF

print_success "Configuration saved to $ENV_FILE"

# Add to shell profile
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Shell Configuration${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Detect shell
if [ -n "$ZSH_VERSION" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_PROFILE="$HOME/.bashrc"
else
    SHELL_PROFILE="$HOME/.profile"
fi

echo -e "${BLUE}Add Felix configuration to $SHELL_PROFILE? (Y/n):${NC}"
read -r response
if [[ ! "$response" =~ ^[Nn]$ ]]; then
    # Check if already added
    if ! grep -q "felix_claude_config" "$SHELL_PROFILE" 2>/dev/null; then
        echo "" >> "$SHELL_PROFILE"
        echo "# Felix Rule System for Claude Code" >> "$SHELL_PROFILE"
        echo "[ -f $ENV_FILE ] && source $ENV_FILE" >> "$SHELL_PROFILE"
        print_success "Added to $SHELL_PROFILE"
        print_status "Run 'source $SHELL_PROFILE' to load the configuration"
    else
        print_status "Configuration already in $SHELL_PROFILE"
    fi
fi

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

# Final instructions
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo ""
echo "1. Start the Felix server (if not already running):"
echo -e "   ${YELLOW}cd $PROJECT_PATH${NC}"
echo -e "   ${YELLOW}npm run server${NC}"
echo ""
echo "2. Reload your shell configuration:"
echo -e "   ${YELLOW}source $SHELL_PROFILE${NC}"
echo ""
echo "3. Start Claude Code and the hooks will be active!"
echo ""
echo -e "${CYAN}To test the installation:${NC}"
echo -e "   ${YELLOW}bash ~/.claude/hooks/felix-utils.sh${NC}"
echo ""
echo -e "${CYAN}For debug mode, set:${NC}"
echo -e "   ${YELLOW}export DEBUG_MODE=true${NC}"
echo ""
echo -e "${GREEN}Happy coding with Felix + Claude Code! 🚀${NC}"