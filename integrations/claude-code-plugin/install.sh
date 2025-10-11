#!/bin/bash

# Felix Plugin for Claude Code - Installer
# This script installs Felix as a Claude Code plugin with MCP server + hooks

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
PLUGIN_SOURCE_DIR="$SCRIPT_DIR"
CLAUDE_DIR="$HOME/.claude"
PLUGINS_DIR="$CLAUDE_DIR/plugins"
PLUGIN_DEST_DIR="$PLUGINS_DIR/felix"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
BACKUP_DIR="$CLAUDE_DIR/backups"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        Felix Plugin for Claude Code - Installation         ║${NC}"
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

# Create plugins directory if it doesn't exist
print_status "Creating plugins directory..."
mkdir -p "$PLUGINS_DIR"

# Remove existing Felix plugin if present
if [ -d "$PLUGIN_DEST_DIR" ]; then
    print_warning "Existing Felix plugin found"
    echo -e "${YELLOW}Do you want to replace it? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        print_status "Removing existing plugin..."
        rm -rf "$PLUGIN_DEST_DIR"
    else
        print_status "Keeping existing plugin"
        exit 0
    fi
fi

# Copy plugin files
print_status "Installing Felix plugin..."
mkdir -p "$PLUGIN_DEST_DIR"
cp -r "$PLUGIN_SOURCE_DIR/.claude-plugin" "$PLUGIN_DEST_DIR/"
cp -r "$PLUGIN_SOURCE_DIR/hooks" "$PLUGIN_DEST_DIR/"

# Make hooks executable
chmod +x "$PLUGIN_DEST_DIR/hooks"/*.sh

print_success "Plugin files installed"

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

# Enable debug mode?
echo -e "${BLUE}Enable debug mode for hooks? (y/N):${NC}"
read -r DEBUG_RESPONSE
if [[ "$DEBUG_RESPONSE" =~ ^[Yy]$ ]]; then
    DEBUG_MODE="true"
else
    DEBUG_MODE="false"
fi

# Create environment configuration
ENV_FILE="$HOME/.felix_claude_config"
cat > "$ENV_FILE" <<EOF
# Felix Plugin Configuration for Claude Code
# Project path is automatically detected from Claude Code's working directory
export FELIX_SERVER_URL="$SERVER_URL"
export DEBUG_MODE="$DEBUG_MODE"
EOF

print_success "Configuration saved to $ENV_FILE"

# Update settings.json with plugin configuration
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

# Read plugin manifest
PLUGIN_MANIFEST="$PLUGIN_DEST_DIR/.claude-plugin/marketplace.json"

# Create MCP servers configuration
MCP_CONFIG=$(cat <<EOF
{
  "felix": {
    "command": "npx",
    "args": ["-y", "@felix/mcp-server"],
    "env": {
      "FELIX_SERVER_URL": "$SERVER_URL"
    }
  }
}
EOF
)

# Create hooks configuration
HOOKS_CONFIG=$(cat <<EOF
{
  "UserPromptSubmit": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash $PLUGIN_DEST_DIR/hooks/felix-user-prompt-submit.sh"
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
          "command": "bash $PLUGIN_DEST_DIR/hooks/felix-pre-tool-use.sh"
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
          "command": "bash $PLUGIN_DEST_DIR/hooks/felix-post-tool-use.sh"
        }
      ]
    }
  ]
}
EOF
)

# Update settings.json with MCP servers
if jq -e '.mcpServers' "$SETTINGS_FILE" > /dev/null 2>&1; then
    # Merge with existing mcpServers
    jq --argjson mcp "$MCP_CONFIG" '.mcpServers.felix = $mcp.felix' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && \
    mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
else
    # Add mcpServers section
    jq --argjson mcp "$MCP_CONFIG" '. + {mcpServers: $mcp}' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && \
    mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
fi

# Update settings.json with hooks
if jq -e '.hooks' "$SETTINGS_FILE" > /dev/null 2>&1; then
    print_warning "Hooks configuration already exists in settings.json"
    echo -e "${YELLOW}Do you want to replace the existing hooks configuration? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        jq --argjson hooks "$HOOKS_CONFIG" '.hooks = $hooks' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && \
        mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
        print_success "Hooks configuration updated"
    else
        print_status "Keeping existing hooks configuration"
    fi
else
    jq --argjson hooks "$HOOKS_CONFIG" '. + {hooks: $hooks}' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && \
    mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
    print_success "Hooks configuration added"
fi

print_success "Claude Code settings updated"

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
    if ! grep -q "felix_claude_config" "$SHELL_PROFILE" 2>/dev/null; then
        echo "" >> "$SHELL_PROFILE"
        echo "# Felix Plugin for Claude Code" >> "$SHELL_PROFILE"
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
    print_status "Make sure to start the server with: npm run dev"
fi

# Final instructions
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Plugin installed at:${NC}"
echo "   $PLUGIN_DEST_DIR"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo ""
echo "1. Start the Felix server (if not already running):"
echo -e "   ${YELLOW}cd <your-project-directory>${NC}"
echo -e "   ${YELLOW}npm run dev${NC}"
echo ""
echo "2. Reload your shell configuration:"
echo -e "   ${YELLOW}source $SHELL_PROFILE${NC}"
echo ""
echo "3. Restart Claude Code to load the plugin"
echo ""
echo -e "${CYAN}The Felix plugin provides:${NC}"
echo "   ✓ MCP Server - Code intelligence and task management tools"
echo "   ✓ Hooks - Automatic rule validation and context injection"
echo "   ✓ Workflows - Task management with validation bundles"
echo "   ✓ Documentation - Mermaid and Excalidraw support"
echo "   ✓ Rules - Coding standards and pattern enforcement"
echo ""
echo -e "${CYAN}Available MCP tools:${NC}"
echo "   - mcp__felix__search      - Semantic code search"
echo "   - mcp__felix__context     - Component context with relationships"
echo "   - mcp__felix__tasks       - Task and workflow management"
echo "   - mcp__felix__notes       - Documentation system"
echo "   - mcp__felix__rules       - Coding rules and patterns"
echo "   - mcp__felix__workflows   - Workflow configuration"
echo ""
echo -e "${GREEN}Happy coding with Felix + Claude Code! 🚀${NC}"
