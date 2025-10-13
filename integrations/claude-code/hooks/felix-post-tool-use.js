#!/usr/bin/env node

// Felix Rule System - PostToolUse Hook
// Analyzes generated code and tracks rule applications for analytics

const {
    debugLog,
    getApplicableRules,
    getComponentIdFromPath,
    trackRuleApplication,
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
        process.exit(0);
    }

    debugLog('PostToolUse hook triggered');
    debugLog(`Input JSON: ${JSON.stringify(input)}`);

    const toolName = input.tool_name || '';
    const toolSuccess = input.tool_success || false;
    const filePath = input.tool_input?.file_path || input.tool_input?.notebook_path || '';
    const newContent = input.tool_input?.new_string || input.tool_input?.content || input.tool_input?.new_source || '';
    const projectDir = input.cwd || '';

    // Override FELIX_PROJECT_PATH with Claude Code's current working directory
    if (projectDir) {
        process.env.FELIX_PROJECT_PATH = projectDir;
    }

    debugLog(`Tool name: ${toolName}`);
    debugLog(`File path: ${filePath}`);
    debugLog(`Tool success: ${toolSuccess}`);
    debugLog(`Project dir: ${process.env.FELIX_PROJECT_PATH}`);

    // Only process successful Edit, Write, and MultiEdit tools
    if (!['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(toolName)) {
        debugLog(`Tool ${toolName} not relevant for post-analysis, skipping...`);
        process.exit(0);
    }

    // Skip if the operation failed
    if (!toolSuccess) {
        debugLog('Tool operation failed, skipping analysis...');
        process.exit(0);
    }

    // Validate environment
    if (!await validateEnvironment()) {
        process.exit(0);
    }

    if (!filePath) {
        debugLog('No file path found, skipping analysis...');
        process.exit(0);
    }

    debugLog(`Analyzing generated code for file: ${filePath}`);

    // Get component ID for the file
    const componentId = await getComponentIdFromPath(filePath);

    // Build search query based on what was done
    let operationType = '';
    switch (toolName) {
        case 'Write':
            operationType = 'file creation post-tool-use';
            break;
        case 'Edit':
            operationType = 'code modification refactoring post-tool-use';
            break;
        case 'MultiEdit':
            operationType = 'bulk changes refactoring post-tool-use';
            break;
        case 'NotebookEdit':
            operationType = 'jupyter notebook data science post-tool-use';
            break;
    }

    debugLog(`Searching for applicable rules for: ${operationType}`);

    // Get applicable rules that should have been considered
    const applicableRules = await getApplicableRules('file', componentId, operationType, newContent);

    let output = '';

    if (applicableRules && applicableRules.applicable_rules) {
        debugLog('Found applicable rules for evaluation...');

        const rulesArray = applicableRules.applicable_rules || [];

        if (rulesArray.length > 0) {
            // Filter for relevant rules (priority >= 5)
            const relevantRules = rulesArray
                .filter(rule => (rule.priority || 0) >= 5)
                .slice(0, 5); // Top 5 for post-operation evaluation

            if (relevantRules.length > 0) {
                const rulesList = relevantRules
                    .map(rule => {
                        const name = rule.name || 'Rule';
                        const ruleId = rule.id || '';
                        return `- ${name} (ID: ${ruleId})`;
                    })
                    .join('\n');

                output += `\n---\n**Rule Effectiveness Check:**\n\n`;
                output += `For the ${toolName} operation on \`${filePath.split(/[\\/]/).pop()}\`, please briefly evaluate:\n`;
                output += `1. Which of these rules were applicable to this change?\n`;
                output += `2. Did you follow the guidance from these rules?\n`;
                output += `3. Rate applicability (1-5) for each rule you considered:\n\n`;
                output += `${rulesList}\n\n`;
                output += `*Note: This feedback helps improve rule effectiveness tracking.*`;
            }
        }
    }

    // Output evaluation prompt if we have rules to evaluate
    if (output) {
        console.error(output);
    }

    // Exit successfully
    process.exit(0);
}

main().catch(err => {
    debugLog(`Error in PostToolUse hook: ${err.message}`);
    process.exit(0);
});
