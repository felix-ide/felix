#!/usr/bin/env node

// Felix Rule System Integration Utilities for Claude Code Hooks
// Provides common functions for interacting with the Felix HTTP API

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration from environment variables
const FELIX_SERVER_URL = process.env.FELIX_SERVER_URL || 'http://localhost:9000';
const FELIX_PROJECT_PATH = process.env.FELIX_PROJECT_PATH || process.env.CLAUDE_PROJECT_DIR || process.cwd();
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

// Logging utilities
function debugLog(message) {
    if (DEBUG_MODE) {
        console.error(`\x1b[34m[FELIX-DEBUG]\x1b[0m ${message}`);
    }
}

function errorLog(message) {
    console.error(`\x1b[31m[FELIX-ERROR]\x1b[0m ${message}`);
}

function successLog(message) {
    if (DEBUG_MODE) {
        console.error(`\x1b[32m[FELIX-SUCCESS]\x1b[0m ${message}`);
    }
}

// HTTP request helper
async function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;

        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'x-project-path': FELIX_PROJECT_PATH,
                ...options.headers
            }
        };

        const req = client.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }

        req.end();
    });
}

// Get all rules from Felix
async function getAllRules() {
    debugLog('Getting all rules from Felix API');
    try {
        const response = await makeRequest(`${FELIX_SERVER_URL}/api/rules`);
        debugLog(`Response: ${JSON.stringify(response)}`);
        return response;
    } catch (err) {
        errorLog(`Failed to connect to Felix server at ${FELIX_SERVER_URL}: ${err.message}`);
        return null;
    }
}

// Search for rules using semantic search
async function searchRulesSemantic(query, limit = 10) {
    debugLog(`Searching rules with query: ${query}`);
    try {
        const url = `${FELIX_SERVER_URL}/api/search?q=${encodeURIComponent(query)}&entity_type=rule&limit=${limit}`;
        const response = await makeRequest(url);
        debugLog(`Search response: ${JSON.stringify(response)}`);
        return response;
    } catch (err) {
        errorLog(`Failed to search rules: ${err.message}`);
        return null;
    }
}

// Get applicable rules for a specific entity
async function getApplicableRules(entityType, entityId, userIntent = '', fileContent = '') {
    debugLog(`Getting applicable rules for ${entityType}: ${entityId}`);

    let url = `${FELIX_SERVER_URL}/api/rules?entity_type=${entityType}&entity_id=${encodeURIComponent(entityId)}`;

    if (userIntent) {
        url += `&user_intent=${encodeURIComponent(userIntent)}`;
    }

    if (fileContent) {
        const truncatedContent = fileContent.substring(0, 1000);
        url += `&file_content=${encodeURIComponent(truncatedContent)}`;
    }

    try {
        const response = await makeRequest(url);
        debugLog(`Applicable rules response: ${JSON.stringify(response)}`);
        return response;
    } catch (err) {
        errorLog(`Failed to get applicable rules: ${err.message}`);
        return null;
    }
}

// Search for components
async function searchComponents(query, limit = 10) {
    debugLog(`Searching components with query: ${query}`);
    try {
        const url = `${FELIX_SERVER_URL}/api/search?q=${encodeURIComponent(query)}&entity_type=component&limit=${limit}`;
        const response = await makeRequest(url);
        return response;
    } catch (err) {
        errorLog(`Failed to search components: ${err.message}`);
        return null;
    }
}

// Get component ID from file path
async function getComponentIdFromPath(filePath) {
    const response = await searchComponents(`filePath:${filePath}`, 1);
    if (response && response.results && response.results.length > 0) {
        return response.results[0].id;
    }
    return `file:${filePath}`;
}

// Format rules as markdown
function formatRulesAsMarkdown(rulesJson, context) {
    let rulesArray = rulesJson.applicable_rules || rulesJson.results;

    if (!rulesArray || rulesArray.length === 0) {
        return '';
    }

    let message = `📋 **Applicable Felix Rules for ${context}:**\n\n`;

    for (const rule of rulesArray) {
        const name = rule.name || rule.title || 'Rule';
        const type = rule.rule_type || rule.type || 'unknown';
        const priority = rule.priority || 5;
        const description = rule.guidance_text || rule.snippet || rule.description || '';

        message += `### ${name}\n`;
        message += `- **Type:** \`${type}\` | **Priority:** ${priority}\n`;
        if (description) {
            message += `- **Guidance:** ${description}\n`;
        }
        message += '\n';
    }

    return message;
}

// Track rule discovery for analytics
async function trackRuleDiscovery(ruleId, context, relevanceScore) {
    debugLog(`Tracking rule discovery: ${ruleId} in context: ${context}`);

    const feedbackScore = Math.min(5, Math.max(1, Math.round(relevanceScore * 5)));

    const trackingData = {
        rule_id: ruleId,
        entity_type: 'prompt',
        entity_id: context,
        user_action: 'accepted',
        feedback_score: feedbackScore,
        timestamp: new Date().toISOString()
    };

    try {
        await makeRequest(`${FELIX_SERVER_URL}/api/rules/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: trackingData
        });
    } catch (err) {
        // Silently fail - analytics shouldn't block
    }
}

// Track rule application for analytics
async function trackRuleApplication(ruleId, entityType, entityId, userAction, feedbackScore, generatedCode, operationType) {
    debugLog(`Tracking: Rule ${ruleId}, Action: ${userAction}, Score: ${feedbackScore}, Operation: ${operationType}`);

    const trackingData = {
        rule_id: ruleId,
        event_type: 'application',
        entity_type: entityType,
        entity_id: entityId,
        user_action: userAction,
        feedback_score: feedbackScore,
        generated_code: generatedCode ? generatedCode.substring(0, 500) : '',
        operation_type: operationType,
        timestamp: new Date().toISOString()
    };

    try {
        await makeRequest(`${FELIX_SERVER_URL}/api/rules/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: trackingData
        });
    } catch (err) {
        // Silently fail
    }
}

// Validate environment and dependencies
async function validateEnvironment() {
    try {
        const response = await makeRequest(`${FELIX_SERVER_URL}/api/health`);
        successLog('Environment validated successfully');
        return true;
    } catch (err) {
        errorLog(`Felix server is not reachable at ${FELIX_SERVER_URL}`);
        errorLog('Please ensure the code-indexer server is running on port 9000');
        return false;
    }
}

module.exports = {
    FELIX_SERVER_URL,
    FELIX_PROJECT_PATH,
    DEBUG_MODE,
    debugLog,
    errorLog,
    successLog,
    makeRequest,
    getAllRules,
    searchRulesSemantic,
    getApplicableRules,
    searchComponents,
    getComponentIdFromPath,
    formatRulesAsMarkdown,
    trackRuleDiscovery,
    trackRuleApplication,
    validateEnvironment
};
