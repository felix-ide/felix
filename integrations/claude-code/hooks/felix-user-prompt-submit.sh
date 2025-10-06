#!/bin/bash

# Felix Rule System - UserPromptSubmit Hook
# Searches for applicable rules when user submits a prompt and injects them as context

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/felix-utils.sh"

# Enable debug for development
DEBUG_MODE="${DEBUG_MODE:-false}"

main() {
    # Read input from stdin (Claude Code passes hook data as JSON)
    local input_json=$(cat)

    debug_log "UserPromptSubmit hook triggered"
    debug_log "Input JSON: $input_json"

    # Parse input JSON
    local user_prompt=$(echo "$input_json" | jq -r '.prompt // ""')
    local project_dir=$(echo "$input_json" | jq -r '.cwd // ""')

    # Override FELIX_PROJECT_PATH with Claude Code's current working directory
    if [ -n "$project_dir" ]; then
        FELIX_PROJECT_PATH="$project_dir"
        export FELIX_PROJECT_PATH
    fi

    debug_log "User prompt: $user_prompt"
    debug_log "Project dir: $FELIX_PROJECT_PATH"

    # Validate environment
    if ! validate_environment; then
        # Don't block on validation failure, just skip rule injection
        echo '{"continue": true}'
        exit 0
    fi

    # Search for rules based on the user's prompt (semantic search)
    debug_log "Searching for rules semantically based on user prompt..."
    local semantic_results=$(search_rules_semantic "$user_prompt" 10)

    # Initialize output - we'll add system messages with rules
    local output=""

    if [ $? -eq 0 ] && [ -n "$semantic_results" ]; then
        debug_log "Got semantic search results, formatting..."

        # Track discovered rules for analytics
        local rules_array=$(echo "$semantic_results" | jq -c '.results // []')
        if [ "$rules_array" != "[]" ]; then
            while IFS= read -r rule; do
                local rule_id=$(echo "$rule" | jq -r '.id // "unknown"')
                local relevance=$(echo "$rule" | jq -r '.relevance_score // 0.5')
                track_rule_discovery "$rule_id" "semantic_search" "$relevance" &
            done < <(echo "$rules_array" | jq -c '.[]')
        fi

        # Format the rules as markdown to inject into context
        local formatted=$(format_rules_as_markdown "$semantic_results" "your request")

        if [ -n "$formatted" ]; then
            output="$formatted"
        fi
    fi

    # Get high-priority constraint rules
    debug_log "Fetching high-priority rules..."
    local all_rules=$(get_all_rules)

    if [ $? -eq 0 ] && [ -n "$all_rules" ]; then
        # Filter for high-priority constraint rules
        local constraints=$(echo "$all_rules" | jq -c '[.applicable_rules[]? | select(.rule_type == "constraint" and .priority >= 8)]')

        if [ "$constraints" != "[]" ] && [ "$constraints" != "null" ]; then
            debug_log "Found high-priority constraint rules"

            # Create a message for constraints
            local constraint_msg="⚠️ **Active Constraints:**\n\n"
            constraint_msg="${constraint_msg}$(echo "$constraints" | jq -r '.[] | "• **\(.name)** (Priority: \(.priority))\n  \(.guidance_text // .description // "")\n"')"

            if [ -n "$constraint_msg" ] && [ "$constraint_msg" != "⚠️ **Active Constraints:**\n\n" ]; then
                output="${output}\n\n${constraint_msg}"
            fi
        fi
    fi

    # Output the context to stdout - Claude Code will add this to the conversation
    if [ -n "$output" ]; then
        echo "$output"
    fi

    # Exit with 0 to allow the prompt to proceed
    exit 0
}

# Track rule discovery for analytics
track_rule_discovery() {
    local rule_id="$1"
    local context="$2"
    local relevance_score="$3"

    debug_log "Tracking rule discovery: $rule_id in context: $context"

    # Convert relevance score (0-1) to feedback score (1-5)
    local feedback_score=$(echo "$relevance_score * 5" | bc -l | awk '{printf "%.0f", $1}')
    if [ "$feedback_score" -lt 1 ]; then
        feedback_score=1
    elif [ "$feedback_score" -gt 5 ]; then
        feedback_score=5
    fi

    # Send to Felix analytics endpoint
    local tracking_data=$(jq -n \
        --arg rule_id "$rule_id" \
        --arg context "$context" \
        --argjson feedback_score "$feedback_score" \
        '{
            rule_id: $rule_id,
            entity_type: "prompt",
            entity_id: $context,
            user_action: "accepted",
            feedback_score: $feedback_score,
            timestamp: now | todate
        }')

    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "x-project-path: $FELIX_PROJECT_PATH" \
        -d "$tracking_data" \
        "$FELIX_SERVER_URL/api/rules/track" 2>/dev/null || true
}

# Format rules as markdown instead of JSON system messages
format_rules_as_markdown() {
    local rules_json="$1"
    local context="$2"

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
            echo "$message"
        fi
    fi
}

# Run main function
main
