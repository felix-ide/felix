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

    let output = '';

    // Build intelligent search query based on actual code content and tool parameters
    let searchQuery = '';

    // Start with tool-specific context
    switch (toolName) {
        case 'Write':
            searchQuery = 'creating new file ';
            break;
        case 'Edit':
            searchQuery = 'modifying existing code ';
            break;
        case 'MultiEdit':
            searchQuery = 'bulk refactoring multiple edits ';
            break;
        case 'NotebookEdit':
            searchQuery = 'jupyter notebook cell ';
            break;
    }

    // Extract file type and add to query
    const fileExt = filePath.split('.').pop() || '';
    const fileName = filePath.split('/').pop() || '';
    searchQuery += `${fileExt} ${fileName} `;

    // Analyze the actual code content being written/edited
    const codeToAnalyze = newContent || '';
    if (codeToAnalyze) {
        // Extract meaningful tokens from the code
        const tokens = [];

        // Look for imports/requires
        const importMatches = codeToAnalyze.match(/(?:import|require|from)\s+['"]([^'"]+)['"]/g);
        if (importMatches) {
            tokens.push('imports', 'dependencies');
            importMatches.forEach(imp => tokens.push(imp.replace(/['"`]/g, '')));
        }

        // Look for function/class definitions
        const functionMatches = codeToAnalyze.match(/(?:function|const|let|var|async|class)\s+(\w+)/g);
        if (functionMatches) {
            functionMatches.forEach(fn => tokens.push(fn.split(/\s+/).pop()));
        }

        // Look for common patterns
        if (codeToAnalyze.match(/fetch|axios|http/i)) tokens.push('API', 'HTTP', 'network');
        if (codeToAnalyze.match(/useState|useEffect|component/i)) tokens.push('React', 'component', 'state');
        if (codeToAnalyze.match(/describe|test|it\(|expect/)) tokens.push('testing', 'unit-test');
        if (codeToAnalyze.match(/router|route|endpoint/i)) tokens.push('routing', 'API-endpoint');
        if (codeToAnalyze.match(/auth|login|password|token/i)) tokens.push('authentication', 'security');
        if (codeToAnalyze.match(/database|query|sql|orm/i)) tokens.push('database', 'data-access');
        if (codeToAnalyze.match(/try|catch|throw|error/i)) tokens.push('error-handling', 'exceptions');

        // Add tokens to search query
        searchQuery += tokens.slice(0, 15).join(' ');
    }

    // Add file path context
    if (filePath.includes('test')) searchQuery += ' testing test-coverage';
    if (filePath.includes('auth')) searchQuery += ' authentication security';
    if (filePath.includes('api') || filePath.includes('route')) searchQuery += ' API endpoint';
    if (filePath.includes('component')) searchQuery += ' UI component';
    if (filePath.includes('hook')) searchQuery += ' React hooks';
    if (filePath.includes('util') || filePath.includes('helper')) searchQuery += ' utility helper-function';

    debugLog(`Smart search query: ${searchQuery}`);

    // Use semantic search to find relevant rules based on what's actually being done
    const semanticResults = await searchRulesSemantic(searchQuery, 15);

    // Also get entity-specific rules for this file
    const componentId = await getComponentIdFromPath(filePath);
    const entityRules = await getApplicableRules('file', componentId, searchQuery, codeToAnalyze);

    // Combine rules from both sources, deduplicate by ID
    const allRules = new Map();

    // Add semantic search results
    if (semanticResults && semanticResults.results) {
        semanticResults.results.forEach(rule => {
            if (rule.id && !allRules.has(rule.id)) {
                allRules.set(rule.id, { ...rule, source: 'semantic' });
            }
        });
    }

    // Add entity-specific rules (these take precedence if duplicate)
    if (entityRules && entityRules.applicable_rules) {
        entityRules.applicable_rules.forEach(rule => {
            if (rule.id) {
                allRules.set(rule.id, { ...rule, source: 'entity' });
            }
        });
    }

    if (allRules.size > 0) {
        debugLog(`Found ${allRules.size} total applicable rules`);

        // Filter for high-priority rules and format for output
        const relevantRules = Array.from(allRules.values())
            .filter(rule => (rule.priority || 0) >= 5)
            .sort((a, b) => {
                // Sort by: entity rules first, then by priority
                if (a.source !== b.source) {
                    return a.source === 'entity' ? -1 : 1;
                }
                return (b.priority || 0) - (a.priority || 0);
            })
            .slice(0, 10) // Limit to top 10
            .map(rule => {
                const name = rule.name || 'Rule';
                const priority = rule.priority || 5;
                const guidance = (rule.guidance_text || rule.description || '').substring(0, 250);
                const source = rule.source === 'entity' ? '📌' : '🔍';
                return `${source} **${name}** (P${priority})\n  ${guidance}`;
            })
            .join('\n\n');

        if (relevantRules) {
            output += `⚠️ **Rules for ${toolName} on \`${fileName}\`:**\n\n${relevantRules}\n\n`;
            output += `_📌 = file-specific, 🔍 = semantic match_`;
        }
    }

    // Always output something so we know the hook ran (use stderr so it's visible)
    if (output) {
        console.error(output);
    } else {
        console.error('🔍 Felix PreToolUse hook ran - no applicable rules found');
    }

    // Allow operation
    process.exit(0);
}

main().catch(err => {
    debugLog(`Error in PreToolUse hook: ${err.message}`);
    process.exit(0);
});
