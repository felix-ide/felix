#!/usr/bin/env node

// Felix Rule System - PreToolUse Hook
// Validates code modifications against rules before allowing Edit/Write operations

const {
    debugLog,
    searchRulesSemantic,
    getApplicableRules,
    getComponentIdFromPath,
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

    debugLog('PreToolUse hook triggered');
    debugLog(`Input JSON: ${JSON.stringify(input)}`);

    const toolName = input.tool_name || '';
    const filePath = input.tool_input?.file_path || input.tool_input?.notebook_path || '';
    const newContent = input.tool_input?.new_string || input.tool_input?.content || input.tool_input?.new_source || '';
    const oldContent = input.tool_input?.old_string || '';
    const projectDir = input.cwd || '';

    // Override FELIX_PROJECT_PATH with Claude Code's current working directory
    if (projectDir) {
        process.env.FELIX_PROJECT_PATH = projectDir;
    }

    debugLog(`Tool name: ${toolName}`);
    debugLog(`File path: ${filePath}`);
    debugLog(`Project dir: ${process.env.FELIX_PROJECT_PATH}`);

    // Only process Edit, Write, and MultiEdit tools
    if (!['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(toolName)) {
        debugLog(`Tool ${toolName} not relevant for rule validation, allowing...`);
        process.exit(0);
    }

    // Validate environment
    if (!await validateEnvironment()) {
        // Don't block on validation failure
        process.exit(0);
    }

    if (!filePath) {
        debugLog('No file path found, allowing operation...');
        process.exit(0);
    }

    debugLog(`Validating rules for file: ${filePath}`);

    // Build search query based on tool type
    let searchQuery = '';
    switch (toolName) {
        case 'Write':
            searchQuery = 'file creation new file boilerplate template scaffold';
            break;
        case 'Edit':
            searchQuery = 'code modification refactoring update change edit';
            break;
        case 'MultiEdit':
            searchQuery = 'bulk changes refactoring multiple files consistency';
            break;
        case 'NotebookEdit':
            searchQuery = 'jupyter notebook data science analysis cell';
            break;
    }

    // Add file-specific context to search
    if (filePath.includes('test')) {
        searchQuery += ' testing test coverage unit test integration test';
    } else if (filePath.includes('auth')) {
        searchQuery += ' authentication security authorization login';
    } else if (filePath.includes('api')) {
        searchQuery += ' API endpoint REST validation error handling';
    }

    debugLog(`Searching for rules with query: ${searchQuery}`);

    let output = '';
    let shouldBlock = false;

    // Get applicable rules for this specific file
    const componentId = await getComponentIdFromPath(filePath);
    const applicableRules = await getApplicableRules('file', componentId, searchQuery, newContent);

    if (applicableRules && applicableRules.applicable_rules) {
        debugLog('Found applicable rules, checking...');

        const rulesArray = applicableRules.applicable_rules || [];

        if (rulesArray.length > 0) {
            // Check high priority rules
            const highPriorityRules = rulesArray
                .filter(rule => (rule.priority || 0) >= 8)
                .map(rule => {
                    const name = rule.name || 'Rule';
                    const guidance = (rule.guidance_text || rule.description || '').substring(0, 200);
                    return `${name}: ${guidance}`;
                })
                .join('\n');

            if (highPriorityRules) {
                output += `⚠️ **Rule Warnings:**\n\n${highPriorityRules}\n`;
            }
        }
    }

    // Always output something so we know the hook ran (use stderr so it's visible)
    if (output) {
        console.error(output);
    } else {
        console.error('🔍 Felix PreToolUse hook ran - no high-priority rules found');
    }

    // Allow operation
    process.exit(0);
}

main().catch(err => {
    debugLog(`Error in PreToolUse hook: ${err.message}`);
    process.exit(0);
});
