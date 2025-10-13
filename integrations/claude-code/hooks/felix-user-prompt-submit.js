#!/usr/bin/env node

// Felix Rule System - UserPromptSubmit Hook
// Searches for applicable rules when user submits a prompt and injects them as context

const {
    debugLog,
    searchRulesSemantic,
    getAllRules,
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
    debugLog('Searching for rules semantically based on user prompt...');
    const semanticResults = await searchRulesSemantic(userPrompt, 10);

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

    // Get high-priority constraint rules
    debugLog('Fetching high-priority rules...');
    const allRules = await getAllRules();

    if (allRules && allRules.applicable_rules) {
        // Filter for high-priority constraint rules
        const constraints = allRules.applicable_rules.filter(
            rule => rule.rule_type === 'constraint' && (rule.priority || 0) >= 8
        );

        if (constraints.length > 0) {
            debugLog('Found high-priority constraint rules');

            let constraintMsg = '⚠️ **Active Constraints:**\n\n';
            for (const rule of constraints) {
                const name = rule.name || 'Rule';
                const priority = rule.priority || 5;
                const guidance = rule.guidance_text || rule.description || '';
                constraintMsg += `• **${name}** (Priority: ${priority})\n  ${guidance}\n`;
            }

            if (constraints.length > 0) {
                output += '\n\n' + constraintMsg;
            }
        }
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
