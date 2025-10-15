#!/usr/bin/env node

// Felix Rule System - UserPromptSubmit Hook
// Searches for applicable rules when user submits a prompt and injects them as context

const {
    debugLog,
    searchRulesSemantic,
    formatRulesAsMarkdown,
    trackRuleDiscovery,
    validateEnvironment
} = require('./felix-utils.js');

async function main() {
    // Read input from stdin
    let inputData = '';

    for await (const chunk of process.stdin) {
        inputData += chunk;
    }

    let input;
    try {
        input = JSON.parse(inputData);
    } catch (err) {
        debugLog('Failed to parse input JSON');
        console.log('{"continue": true}');
        process.exit(0);
    }

    debugLog('UserPromptSubmit hook triggered');
    debugLog(`Input JSON: ${JSON.stringify(input)}`);

    const userPrompt = input.prompt || '';
    const projectDir = input.cwd || '';

    // Override FELIX_PROJECT_PATH with Claude Code's current working directory
    if (projectDir) {
        process.env.FELIX_PROJECT_PATH = projectDir;
    }

    debugLog(`User prompt: ${userPrompt}`);
    debugLog(`Project dir: ${process.env.FELIX_PROJECT_PATH}`);

    // Validate environment
    if (!await validateEnvironment()) {
        // Don't block on validation failure, just skip rule injection
        console.log('{"continue": true}');
        process.exit(0);
    }

    let output = '';

    // Search for rules based on the user's prompt (semantic search)
    // Include hook context tag to boost rules tagged for this hook
    debugLog('Searching for rules semantically based on user prompt...');
    const enhancedQuery = `${userPrompt} user-prompt-submit`;
    const semanticResults = await searchRulesSemantic(enhancedQuery, 20);

    if (semanticResults && semanticResults.results) {
        debugLog('Got semantic search results, formatting...');

        // Track discovered rules for analytics (non-blocking)
        const rulesArray = semanticResults.results || [];
        for (const rule of rulesArray) {
            const ruleId = rule.id || 'unknown';
            const relevance = rule.relevance_score || 0.5;
            trackRuleDiscovery(ruleId, 'semantic_search', relevance).catch(() => {});
        }

        // Format the rules as markdown to inject into context
        const formatted = formatRulesAsMarkdown(semanticResults, 'your request');
        if (formatted) {
            output = formatted;
        }
    }

    // Add tracking instruction for AI
    if (output) {
        output += '\n\n---\n**Tracking:** After completing this task, use the mcp__felix__rules tool (action=track_application) to record which rules were most helpful:\n- Set track_entity_type="task", track_entity_id=<task_context>\n- Set user_action: "accepted" (rule was followed), "modified" (partially used), "rejected" (not applicable), or "ignored"\n- Set feedback_score: 1-5 (1=not helpful, 5=very helpful)\n- Include applied_context with details on how the rule was applied\nThis data improves rule recommendations for future tasks.';
    }

    // Output the context to stdout - Claude Code will add this to the conversation
    if (output) {
        console.log(output);
    }

    // Exit with 0 to allow the prompt to proceed
    process.exit(0);
}

main().catch(err => {
    debugLog(`Error in UserPromptSubmit hook: ${err.message}`);
    console.log('{"continue": true}');
    process.exit(0);
});
