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
            operationType = 'created new file';
            break;
        case 'Edit':
            operationType = 'modified code';
            break;
        case 'MultiEdit':
            operationType = 'bulk refactored';
            break;
        case 'NotebookEdit':
            operationType = 'updated notebook';
            break;
    }

    // Search for post-operation validation rules
    let validationQuery = `code review validation ${operationType} quality check best practices`;

    // Add context from file type
    const fileExtension = filePath.split('.').pop();
    switch (fileExtension) {
        case 'ts':
        case 'tsx':
            validationQuery += ' typescript react component';
            break;
        case 'js':
        case 'jsx':
            validationQuery += ' javascript';
            break;
        case 'py':
            validationQuery += ' python';
            break;
    }

    if (filePath.includes('test') || filePath.includes('spec')) {
        validationQuery += ' testing test coverage assertions';
    }

    debugLog(`Searching for post-operation rules: ${validationQuery}`);

    // Get applicable rules and track compliance
    const applicableRules = await getApplicableRules('file', componentId, operationType, newContent);

    if (applicableRules && applicableRules.applicable_rules) {
        debugLog('Analyzing compliance with applicable rules...');

        const rulesArray = applicableRules.applicable_rules || [];

        if (rulesArray.length > 0) {
            // Track each rule application for analytics
            for (const rule of rulesArray) {
                const ruleId = rule.id || 'unknown';
                const ruleName = rule.name || 'Unknown Rule';

                debugLog(`Tracking rule: ${ruleName}`);

                // Track rule application for analytics (non-blocking)
                debugLog(`Tracking rule application: ${ruleId}`);
                trackRuleApplication(
                    ruleId,
                    'file',
                    filePath,
                    'accepted',
                    5,
                    newContent,
                    operationType
                ).catch(() => {});
            }
        }
    }

    // Exit successfully (don't block or output anything to user for PostToolUse)
    process.exit(0);
}

main().catch(err => {
    debugLog(`Error in PostToolUse hook: ${err.message}`);
    process.exit(0);
});
