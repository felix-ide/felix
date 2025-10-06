#!/bin/bash

# Felix Rule System - PostToolUse Hook
# Analyzes generated code and tracks rule applications for analytics

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/felix-utils.sh"

# Enable debug for development
DEBUG_MODE="${DEBUG_MODE:-false}"

main() {
    # Read input from stdin (Claude Code passes hook data as JSON)
    local input_json=$(cat)

    debug_log "PostToolUse hook triggered"
    debug_log "Input JSON: $input_json"

    # Parse input JSON
    local tool_name=$(echo "$input_json" | jq -r '.tool_name // ""')
    local tool_success=$(echo "$input_json" | jq -r '.tool_success // "false"')
    local file_path=$(echo "$input_json" | jq -r '.tool_input.file_path // .tool_input.notebook_path // ""')
    local new_content=$(echo "$input_json" | jq -r '.tool_input.new_string // .tool_input.content // .tool_input.new_source // ""')

    debug_log "Tool name: $tool_name"
    debug_log "File path: $file_path"
    debug_log "Tool success: $tool_success"

    # Only process successful Edit, Write, and MultiEdit tools
    if [[ ! "$tool_name" =~ ^(Edit|Write|MultiEdit|NotebookEdit)$ ]]; then
        debug_log "Tool $tool_name not relevant for post-analysis, skipping..."
        exit 0
    fi

    # Skip if the operation failed
    if [ "$tool_success" != "true" ]; then
        debug_log "Tool operation failed, skipping analysis..."
        exit 0
    fi

    # Validate environment
    if ! validate_environment; then
        exit 0
    fi

    if [ -z "$file_path" ]; then
        debug_log "No file path found, skipping analysis..."
        exit 0
    fi

    debug_log "Analyzing generated code for file: $file_path"

    # Get component ID for the file
    local component_id=$(get_component_id_from_path "$file_path")

    # Build search query based on what was done
    local operation_type=""
    case "$tool_name" in
        "Write")
            operation_type="created new file"
            ;;
        "Edit")
            operation_type="modified code"
            ;;
        "MultiEdit")
            operation_type="bulk refactored"
            ;;
        "NotebookEdit")
            operation_type="updated notebook"
            ;;
    esac

    # Search for post-operation validation rules
    local validation_query="code review validation ${operation_type} quality check best practices"

    # Add context from file type
    local file_extension="${file_path##*.}"
    case "$file_extension" in
        "ts"|"tsx")
            validation_query="$validation_query typescript react component"
            ;;
        "js"|"jsx")
            validation_query="$validation_query javascript"
            ;;
        "py")
            validation_query="$validation_query python"
            ;;
        "test."*|"spec."*)
            validation_query="$validation_query testing test coverage assertions"
            ;;
    esac

    debug_log "Searching for post-operation rules: $validation_query"

    # Get applicable rules and track compliance
    local applicable_rules=$(get_applicable_rules "file" "$component_id" "$operation_type" "$new_content")

    if [ $? -eq 0 ] && [ -n "$applicable_rules" ]; then
        debug_log "Analyzing compliance with applicable rules..."

        # Extract rules array
        local rules_array=$(echo "$applicable_rules" | jq -c '.applicable_rules // []')

        if [ "$rules_array" != "[]" ]; then
            # Track each rule application for analytics
            while IFS= read -r rule; do
                local rule_id=$(echo "$rule" | jq -r '.id // "unknown"')
                local rule_name=$(echo "$rule" | jq -r '.name // "Unknown Rule"')
                local rule_type=$(echo "$rule" | jq -r '.rule_type // "pattern"')
                local priority=$(echo "$rule" | jq -r '.priority // 5')

                debug_log "Checking compliance with rule: $rule_name"

                # Simple compliance checking
                local is_compliant=true
                local feedback_score=5
                local user_action="accepted"

                # Pattern rules - check for common patterns
                if [ "$rule_type" = "pattern" ]; then
                    if [[ "$file_path" =~ \.(ts|tsx)$ ]]; then
                        if [ -n "$new_content" ]; then
                            if echo "$new_content" | grep -q ': any\b'; then
                                is_compliant=false
                                feedback_score=3
                            fi
                        fi
                    fi
                fi

                # Constraint rules - security checks
                if [ "$rule_type" = "constraint" ] && [ "$priority" -ge 8 ]; then
                    if [ -n "$new_content" ]; then
                        if echo "$new_content" | grep -qE '(api[_-]?key|secret|password|token)\s*=\s*[\"'\''][A-Za-z0-9]{8,}[\"'\'']'; then
                            is_compliant=false
                            feedback_score=1
                            user_action="rejected"
                        fi
                    fi
                fi

                # Track rule application for analytics
                debug_log "Tracking rule application: $rule_id with score $feedback_score"
                track_rule_application "$rule_id" "file" "$file_path" "$user_action" "$feedback_score" "$new_content" "$operation_type"

            done < <(echo "$rules_array" | jq -c '.[]')
        fi
    fi

    # Exit successfully (don't block or output anything to user for PostToolUse)
    exit 0
}

# Track rule application for analytics
track_rule_application() {
    local rule_id="$1"
    local entity_type="$2"
    local entity_id="$3"
    local user_action="$4"
    local feedback_score="$5"
    local generated_code="$6"
    local operation_type="${7:-unknown}"

    debug_log "Tracking: Rule $rule_id, Action: $user_action, Score: $feedback_score, Operation: $operation_type"

    # Prepare the tracking data
    local tracking_data=$(jq -n \
        --arg rule_id "$rule_id" \
        --arg entity_type "$entity_type" \
        --arg entity_id "$entity_id" \
        --arg user_action "$user_action" \
        --argjson feedback_score "$feedback_score" \
        --arg generated_code "${generated_code:0:500}" \
        --arg operation_type "$operation_type" \
        '{
            rule_id: $rule_id,
            event_type: "application",
            entity_type: $entity_type,
            entity_id: $entity_id,
            user_action: $user_action,
            feedback_score: $feedback_score,
            generated_code: $generated_code,
            operation_type: $operation_type,
            timestamp: now | todate
        }')

    # Send to Felix analytics endpoint
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "x-project-path: $FELIX_PROJECT_PATH" \
        -d "$tracking_data" \
        "$FELIX_SERVER_URL/api/rules/track" 2>/dev/null || true
}

# Run main function
main
