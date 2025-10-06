#!/bin/bash

# Felix Rule System - PreToolUse Hook
# Validates code modifications against rules before allowing Edit/Write operations

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/felix-utils.sh"

# Enable debug for development
DEBUG_MODE="${DEBUG_MODE:-false}"

main() {
    # Read input from stdin (Claude Code passes hook data as JSON)
    local input_json=$(cat)

    debug_log "PreToolUse hook triggered"
    debug_log "Input JSON: $input_json"

    # Parse input JSON
    local tool_name=$(echo "$input_json" | jq -r '.tool_name // ""')
    local file_path=$(echo "$input_json" | jq -r '.tool_input.file_path // .tool_input.notebook_path // ""')
    local new_content=$(echo "$input_json" | jq -r '.tool_input.new_string // .tool_input.content // .tool_input.new_source // ""')
    local old_content=$(echo "$input_json" | jq -r '.tool_input.old_string // ""')
    local project_dir=$(echo "$input_json" | jq -r '.cwd // ""')

    # Override FELIX_PROJECT_PATH with Claude Code's current working directory
    if [ -n "$project_dir" ]; then
        FELIX_PROJECT_PATH="$project_dir"
        export FELIX_PROJECT_PATH
    fi

    debug_log "Tool name: $tool_name"
    debug_log "File path: $file_path"
    debug_log "Project dir: $FELIX_PROJECT_PATH"

    # Only process Edit, Write, and MultiEdit tools
    if [[ ! "$tool_name" =~ ^(Edit|Write|MultiEdit|NotebookEdit)$ ]]; then
        debug_log "Tool $tool_name not relevant for rule validation, allowing..."
        exit 0
    fi

    # Validate environment
    if ! validate_environment; then
        # Don't block on validation failure
        exit 0
    fi

    if [ -z "$file_path" ]; then
        debug_log "No file path found, allowing operation..."
        exit 0
    fi

    debug_log "Validating rules for file: $file_path"

    # Build search query based on tool type
    local search_query=""
    case "$tool_name" in
        "Write")
            search_query="file creation new file boilerplate template scaffold"
            ;;
        "Edit")
            search_query="code modification refactoring update change edit"
            ;;
        "MultiEdit")
            search_query="bulk changes refactoring multiple files consistency"
            ;;
        "NotebookEdit")
            search_query="jupyter notebook data science analysis cell"
            ;;
    esac

    # Add file-specific context to search
    if [[ "$file_path" == *"test"* ]]; then
        search_query="$search_query testing test coverage unit test integration test"
    elif [[ "$file_path" == *"auth"* ]]; then
        search_query="$search_query authentication security authorization login"
    elif [[ "$file_path" == *"api"* ]]; then
        search_query="$search_query API endpoint REST validation error handling"
    fi

    debug_log "Searching for rules with query: $search_query"

    # Search for tool-specific rules
    local tool_rules=$(search_rules_semantic "$search_query" 5)

    local output=""
    local should_block=false

    # Get applicable rules for this specific file
    local component_id=$(get_component_id_from_path "$file_path")
    local applicable_rules=$(get_applicable_rules "file" "$component_id" "$search_query" "$new_content")

    if [ $? -eq 0 ] && [ -n "$applicable_rules" ]; then
        debug_log "Found applicable rules, checking..."

        # Extract rules array
        local rules_array=$(echo "$applicable_rules" | jq -c '.applicable_rules // []')

        if [ "$rules_array" != "[]" ]; then
            # Check high priority rules
            local high_priority_rules=$(echo "$rules_array" | jq -r '.[] | select(.priority >= 8) | .name + ": " + (.guidance_text // .description // "")[0:200]' 2>/dev/null)
            if [ -n "$high_priority_rules" ]; then
                output="${output}⚠️ **Rule Warnings:**\n\n${high_priority_rules}\n"
            fi
        fi
    fi

    # Check for specific security issues in authentication files
    if [[ "$file_path" == *"auth"* ]] || [[ "$file_path" == *"login"* ]] || [[ "$file_path" == *"security"* ]]; then
        debug_log "Applying security rules..."

        if [ -n "$new_content" ]; then
            # Check for hardcoded secrets (simplified check)
            if echo "$new_content" | grep -qE '(api[_-]?key|secret|password|token)\s*=\s*["'"'"'][A-Za-z0-9]{8,}["'"'"']'; then
                output="${output}🚫 **Security Violation:** Possible hardcoded secrets detected. Use environment variables instead.\n"
                should_block=true
            fi
        fi
    fi

    # Output warnings/guidance if any
    if [ -n "$output" ]; then
        echo "$output"
    fi

    # Block if security violations found
    if [ "$should_block" = true ]; then
        exit 2
    fi

    # Allow operation
    exit 0
}

# Run main function
main
