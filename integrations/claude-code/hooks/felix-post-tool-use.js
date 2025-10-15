#!/usr/bin/env node

// Felix Rule System - PostToolUse Hook
// Analyzes generated code and tracks rule applications for analytics

const {
    debugLog,
    searchRulesSemantic,
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

    // Build intelligent search query based on actual code content
    let searchQuery = '';

    // Start with tool-specific context
    switch (toolName) {
        case 'Write':
            searchQuery = 'created new file ';
            break;
        case 'Edit':
            searchQuery = 'modified code ';
            break;
        case 'MultiEdit':
            searchQuery = 'bulk refactored ';
            break;
        case 'NotebookEdit':
            searchQuery = 'notebook cell ';
            break;
    }

    // Extract file info
    const fileExt = filePath.split('.').pop() || '';
    const fileName = filePath.split('/').pop() || '';
    searchQuery += `${fileExt} ${fileName} `;

    // Analyze the generated code content
    const codeToAnalyze = newContent || '';
    if (codeToAnalyze) {
        const tokens = [];

        // Look for what was actually implemented
        const importMatches = codeToAnalyze.match(/(?:import|require|from)\s+['"]([^'"]+)['"]/g);
        if (importMatches) {
            tokens.push('imports', 'dependencies');
        }

        const functionMatches = codeToAnalyze.match(/(?:function|const|let|var|async|class)\s+(\w+)/g);
        if (functionMatches) {
            functionMatches.slice(0, 5).forEach(fn => tokens.push(fn.split(/\s+/).pop()));
        }

        // Pattern detection
        if (codeToAnalyze.match(/fetch|axios|http/i)) tokens.push('API', 'HTTP');
        if (codeToAnalyze.match(/useState|useEffect|component/i)) tokens.push('React', 'component');
        if (codeToAnalyze.match(/describe|test|it\(|expect/)) tokens.push('testing');
        if (codeToAnalyze.match(/router|route|endpoint/i)) tokens.push('routing', 'endpoint');
        if (codeToAnalyze.match(/auth|login|password/i)) tokens.push('authentication', 'security');
        if (codeToAnalyze.match(/database|query|sql/i)) tokens.push('database');
        if (codeToAnalyze.match(/try|catch|error/i)) tokens.push('error-handling');

        searchQuery += tokens.slice(0, 15).join(' ');
    }

    // Add file path context
    if (filePath.includes('test')) searchQuery += ' testing';
    if (filePath.includes('auth')) searchQuery += ' authentication';
    if (filePath.includes('api') || filePath.includes('route')) searchQuery += ' API';
    if (filePath.includes('component')) searchQuery += ' component';

    debugLog(`Post-tool search query: ${searchQuery}`);

    // Get component ID for the file
    const componentId = await getComponentIdFromPath(filePath);

    // Use semantic search to find rules that should have been considered
    const semanticResults = await searchRulesSemantic(searchQuery, 15);

    // Also get entity-specific rules
    const applicableRules = await getApplicableRules('file', componentId, searchQuery, newContent);

    // Combine rules from both sources
    const allRules = new Map();

    if (semanticResults && semanticResults.results) {
        semanticResults.results.forEach(rule => {
            if (rule.id && !allRules.has(rule.id)) {
                allRules.set(rule.id, { ...rule, source: 'semantic' });
            }
        });
    }

    if (applicableRules && applicableRules.applicable_rules) {
        applicableRules.applicable_rules.forEach(rule => {
            if (rule.id) {
                allRules.set(rule.id, { ...rule, source: 'entity' });
            }
        });
    }

    let output = '';

    if (allRules.size > 0) {
        debugLog(`Found ${allRules.size} rules for post-tool evaluation`);

        // Filter for relevant rules (priority >= 5) for evaluation
        const relevantRules = Array.from(allRules.values())
            .filter(rule => (rule.priority || 0) >= 5)
            .sort((a, b) => {
                if (a.source !== b.source) {
                    return a.source === 'entity' ? -1 : 1;
                }
                return (b.priority || 0) - (a.priority || 0);
            })
            .slice(0, 5); // Top 5 for post-operation evaluation

        if (relevantRules.length > 0) {
            const rulesList = relevantRules
                .map(rule => {
                    const name = rule.name || 'Rule';
                    const ruleId = rule.id || '';
                    const source = rule.source === 'entity' ? '📌' : '🔍';
                    const guidance = (rule.guidance_text || rule.description || '').substring(0, 150);
                    return `- ${source} **${name}** (ID: ${ruleId})\n  _${guidance}_`;
                })
                .join('\n');

            output += `\n---\n**Rule Effectiveness Check:**\n\n`;
            output += `For the ${toolName} operation on \`${fileName}\`, please briefly evaluate:\n`;
            output += `1. Which of these rules were applicable to this change?\n`;
            output += `2. Did you follow the guidance from these rules?\n`;
            output += `3. Rate applicability (1-5) for each rule you considered:\n\n`;
            output += `${rulesList}\n\n`;
            output += `_📌 = file-specific, 🔍 = semantic match_\n`;
            output += `*Note: This feedback helps improve rule effectiveness tracking.*`;
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
