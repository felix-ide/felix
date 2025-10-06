#!/bin/bash

# Felix Rule System Integration Utilities for Claude Code Hooks
# Provides common functions for interacting with the Felix HTTP API

# Configuration
FELIX_SERVER_URL="${FELIX_SERVER_URL:-http://localhost:9000}"
FELIX_PROJECT_PATH="${FELIX_PROJECT_PATH:-/Users/epoplive/aigent-smith-clean/code-indexer}"
DEBUG_MODE="${DEBUG_MODE:-false}"

# Colors for debug output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Debug logging
debug_log() {
    if [ "$DEBUG_MODE" = "true" ]; then
        echo -e "${BLUE}[FELIX-DEBUG]${NC} $1" >&2
    fi
}

error_log() {
    echo -e "${RED}[FELIX-ERROR]${NC} $1" >&2
}

success_log() {
    if [ "$DEBUG_MODE" = "true" ]; then
        echo -e "${GREEN}[FELIX-SUCCESS]${NC} $1" >&2
    fi
}

# Get all rules from Felix
get_all_rules() {
    debug_log "Getting all rules from Felix API"

    local response=$(curl -s -X GET \
        -H "x-project-path: $FELIX_PROJECT_PATH" \
        "$FELIX_SERVER_URL/api/rules" 2>/dev/null)

    if [ $? -ne 0 ]; then
        error_log "Failed to connect to Felix server at $FELIX_SERVER_URL"
        return 1
    fi

    debug_log "Response: $response"
    echo "$response"
}

# Search for rules using semantic search
search_rules_semantic() {
    local query="$1"
    local limit="${2:-10}"

    debug_log "Searching rules with query: $query"

    local response=$(curl -s -X GET \
        -H "x-project-path: $FELIX_PROJECT_PATH" \
        -G "$FELIX_SERVER_URL/api/search" \
        --data-urlencode "q=$query" \
        --data-urlencode "entity_type=rule" \
        --data-urlencode "limit=$limit" 2>/dev/null)

    if [ $? -ne 0 ]; then
        error_log "Failed to search rules"
        return 1
    fi

    debug_log "Search response: $response"
    echo "$response"
}

# Get applicable rules for a specific entity
get_applicable_rules() {
    local entity_type="$1"
    local entity_id="$2"
    local user_intent="${3:-}"
    local file_content="${4:-}"

    debug_log "Getting applicable rules for $entity_type: $entity_id"

    local url="$FELIX_SERVER_URL/api/rules"
    url="${url}?entity_type=$entity_type"
    url="${url}&entity_id=$(jq -rn --arg v "$entity_id" '$v|@uri')"

    if [ -n "$user_intent" ]; then
        url="${url}&user_intent=$(jq -rn --arg v "$user_intent" '$v|@uri')"
    fi

    if [ -n "$file_content" ]; then
        # Truncate file content to avoid URL length issues
        local truncated_content="${file_content:0:1000}"
        url="${url}&file_content=$(jq -rn --arg v "$truncated_content" '$v|@uri')"
    fi

    local response=$(curl -s -X GET \
        -H "x-project-path: $FELIX_PROJECT_PATH" \
        "$url" 2>/dev/null)

    if [ $? -ne 0 ]; then
        error_log "Failed to get applicable rules"
        return 1
    fi

    debug_log "Applicable rules response: $response"
    echo "$response"
}

# Search for components (could be useful for getting component IDs)
search_components() {
    local query="$1"
    local limit="${2:-10}"

    debug_log "Searching components with query: $query"

    local response=$(curl -s -X GET \
        -H "x-project-path: $FELIX_PROJECT_PATH" \
        -G "$FELIX_SERVER_URL/api/search" \
        --data-urlencode "q=$query" \
        --data-urlencode "entity_type=component" \
        --data-urlencode "limit=$limit" 2>/dev/null)

    if [ $? -ne 0 ]; then
        error_log "Failed to search components"
        return 1
    fi

    echo "$response"
}

# Format rules as system messages for Claude
format_rules_as_messages() {
    local rules_json="$1"
    local context="$2"

    local output=$(jq -n --arg context "$context" '{
        continue: true,
        systemMessages: []
    }')

    # Check if this is from the rules API or search API
    local rules_array=""

    # Try to parse as rules API response (has applicable_rules field)
    if echo "$rules_json" | jq -e '.applicable_rules' > /dev/null 2>&1; then
        rules_array=$(echo "$rules_json" | jq -c '.applicable_rules')
    # Try to parse as search API response (has results field)
    elif echo "$rules_json" | jq -e '.results' > /dev/null 2>&1; then
        rules_array=$(echo "$rules_json" | jq -c '.results')
    else
        debug_log "Could not parse rules response"
        echo "$output"
        return
    fi

    if [ -n "$rules_array" ] && [ "$rules_array" != "null" ] && [ "$rules_array" != "[]" ]; then
        local message="📋 **Applicable Felix Rules for $context:**\n\n"

        # Format each rule
        local formatted_rules=$(echo "$rules_array" | jq -r '.[] |
            "### \(.name // .title // "Rule")\n" +
            "- **Type:** `\(.rule_type // .type // "unknown")` | **Priority:** \(.priority // 5)\n" +
            if .guidance_text then
                "- **Guidance:** \(.guidance_text)\n"
            elif .snippet then
                "- **Description:** \(.snippet)\n"
            elif .description then
                "- **Description:** \(.description)\n"
            else
                ""
            end +
            "\n"')

        if [ -n "$formatted_rules" ]; then
            message="${message}${formatted_rules}"

            output=$(echo "$output" | jq --arg msg "$message" '.systemMessages += [{
                type: "text",
                text: $msg,
                priority: "high"
            }]')
        fi
    fi

    echo "$output"
}

# Extract file paths from Claude environment variables
extract_file_paths() {
    if [ -n "$CLAUDE_FILE_PATHS" ]; then
        echo "$CLAUDE_FILE_PATHS" | tr ' ' '\n'
    elif [ -n "$CLAUDE_FILE_PATH" ]; then
        echo "$CLAUDE_FILE_PATH"
    fi
}

# Get component ID from file path
get_component_id_from_path() {
    local file_path="$1"
    # Search for components in this file
    local response=$(search_components "filePath:$file_path" 1)

    if [ $? -eq 0 ]; then
        local component_id=$(echo "$response" | jq -r '.results[0].id // empty')
        if [ -n "$component_id" ]; then
            echo "$component_id"
        else
            # Fallback to simple file ID
            echo "file:$file_path"
        fi
    else
        echo "file:$file_path"
    fi
}

# Validate environment and dependencies
validate_environment() {
    # Check for required commands
    for cmd in curl jq; do
        if ! command -v $cmd &> /dev/null; then
            error_log "Required command '$cmd' is not installed"
            return 1
        fi
    done

    # Check if Felix server is reachable
    if ! curl -s -f "$FELIX_SERVER_URL/api/health" &> /dev/null; then
        error_log "Felix server is not reachable at $FELIX_SERVER_URL"
        error_log "Please ensure the code-indexer server is running on port 9000"
        return 1
    fi

    success_log "Environment validated successfully"
    return 0
}

# Test function to verify API connectivity
test_felix_connection() {
    echo "Testing Felix API connection..."

    # Test health endpoint
    echo -n "1. Testing health endpoint... "
    if curl -s -f "$FELIX_SERVER_URL/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi

    # Test rules endpoint
    echo -n "2. Testing rules endpoint... "
    local rules=$(get_all_rules)
    if [ $? -eq 0 ] && echo "$rules" | jq -e '.applicable_rules' > /dev/null 2>&1; then
        local count=$(echo "$rules" | jq '.applicable_rules | length')
        echo -e "${GREEN}✓${NC} (Found $count rules)"
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi

    # Test search endpoint
    echo -n "3. Testing search endpoint... "
    local search_results=$(search_rules_semantic "test" 5)
    if [ $? -eq 0 ] && echo "$search_results" | jq -e '.results' > /dev/null 2>&1; then
        local count=$(echo "$search_results" | jq '.results | length')
        echo -e "${GREEN}✓${NC} (Found $count results)"
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi

    echo -e "\n${GREEN}All tests passed!${NC}"
    return 0
}

# Main function for testing
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    DEBUG_MODE=true
    debug_log "Felix utils loaded in test mode"
    validate_environment
    if [ $? -eq 0 ]; then
        test_felix_connection
    fi
fi