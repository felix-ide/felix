#!/usr/bin/env node

// Felix Rule System - SessionEnd Hook
// Collects session-level analytics about rule usage and effectiveness

const {
    debugLog,
    getAllRules,
    validateEnvironment,
    FELIX_PROJECT_PATH
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
        process.exit(0);
    }

    debugLog('SessionEnd hook triggered');
    debugLog(`Input JSON: ${JSON.stringify(input)}`);

    const projectDir = input.cwd || '';

    // Override FELIX_PROJECT_PATH with Claude Code's current working directory
    if (projectDir) {
        process.env.FELIX_PROJECT_PATH = projectDir;
    }

    debugLog(`Project dir: ${process.env.FELIX_PROJECT_PATH}`);

    // Validate environment
    if (!await validateEnvironment()) {
        process.exit(0);
    }

    debugLog('Getting rule analytics for session summary...');

    // Get all rules to understand which ones are active
    // Note: Could enhance this with semantic search for "session-end" tagged rules
    const allRules = await getAllRules();

    let output = '';

    if (allRules && allRules.applicable_rules) {
        const rulesArray = allRules.applicable_rules || [];

        // Filter for high-priority rules that were likely shown during session
        const highPriorityRules = rulesArray
            .filter(rule => (rule.priority || 0) >= 5 && rule.active !== false)
            .slice(0, 10);

        if (highPriorityRules.length > 0) {
            output += '\n═══════════════════════════════════════════════════════════════\n';
            output += '📊 **Session Rule Effectiveness Summary**\n';
            output += '═══════════════════════════════════════════════════════════════\n\n';

            output += 'Please provide a brief summary of your experience with Felix rules during this session:\n\n';
            output += '1. **Overall Helpfulness**: Were the rule suggestions helpful? (Rate 1-5)\n\n';
            output += '2. **Most Applicable Rules**: Which rules were most relevant to your work?\n\n';
            output += '3. **Rule Coverage**: Were there any situations where you needed guidance but no relevant rules were suggested?\n\n';
            output += '4. **Suggestions**: Any recommendations for new rules or improvements to existing ones?\n\n';

            output += '*This feedback will help improve the Felix rule system for future sessions.*\n';
            output += '═══════════════════════════════════════════════════════════════\n';
        }
    }

    // Output session summary prompt
    if (output) {
        console.error(output);
    } else {
        debugLog('No rule analytics available for session summary');
    }

    // Exit successfully
    process.exit(0);
}

main().catch(err => {
    debugLog(`Error in SessionEnd hook: ${err.message}`);
    process.exit(0);
});
