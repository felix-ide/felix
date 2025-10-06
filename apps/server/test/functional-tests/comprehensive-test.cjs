#!/usr/bin/env node

/**
 * Comprehensive functional test for ALL felix features
 */

const path = require('path');
const axios = require('axios').default;
const fs = require('fs');

const API_BASE = 'http://localhost:9000/api';
const TEST_DIR = path.resolve(__dirname);

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log();
  log(`${'='.repeat(60)}`, 'cyan');
  log(title, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

let testResults = {
  passed: 0,
  failed: 0,
  features: {}
};

function recordTest(feature, testName, passed, details = '') {
  if (!testResults.features[feature]) {
    testResults.features[feature] = { passed: 0, failed: 0, tests: [] };
  }
  
  testResults.features[feature].tests.push({
    name: testName,
    passed,
    details
  });
  
  if (passed) {
    testResults.passed++;
    testResults.features[feature].passed++;
    log(`  ✅ ${testName}`, 'green');
  } else {
    testResults.failed++;
    testResults.features[feature].failed++;
    log(`  ❌ ${testName}: ${details}`, 'red');
  }
}

// ========== PROJECT MANAGEMENT ==========
async function testProjectManagement() {
  logSection('Testing Project Management');
  
  // Set project
  try {
    const response = await axios.post(`${API_BASE}/project/set`, {
      path: TEST_DIR
    });
    recordTest('Project Management', 'Set project', true);
    
    // Get current project
    const current = await axios.get(`${API_BASE}/project/current`);
    recordTest('Project Management', 'Get current project', 
      current.data.project === TEST_DIR);
    
    // Get project stats
    const stats = await axios.get(`${API_BASE}/project/stats`);
    recordTest('Project Management', 'Get project stats', 
      stats.data.stats !== undefined);
    
    return true;
  } catch (error) {
    recordTest('Project Management', 'Set project', false, error.message);
    return false;
  }
}

// ========== INDEXING ==========
async function testIndexing() {
  logSection('Testing Indexing');
  
  try {
    // Clear and reindex
    const response = await axios.post(`${API_BASE}/project/index`, {
      projectPath: TEST_DIR,
      deep: true,
      force: true,
      includeTests: true
    });
    
    const result = response.data.result;
    recordTest('Indexing', 'Index project files', result.success);
    recordTest('Indexing', 'Files processed > 0', result.filesProcessed > 0);
    recordTest('Indexing', 'Components found > 0', result.componentCount > 0);
    recordTest('Indexing', 'Relationships found > 0', result.relationshipCount > 0);
    
    // Test metadata indexing
    const metaResponse = await axios.post(`${API_BASE}/project/index-metadata`);
    recordTest('Indexing', 'Index metadata entities', 
      metaResponse.status === 200 || metaResponse.status === 201);
    
    return result;
  } catch (error) {
    recordTest('Indexing', 'Index project', false, error.message);
    return null;
  }
}

// ========== SEARCH ==========
async function testSearch() {
  logSection('Testing Search Functionality');
  
  const queries = [
    { query: 'BasicClass', expectedMin: 1 },
    { query: 'function', expectedMin: 1 },
    { query: 'async', expectedMin: 1 },
    { query: 'interface', expectedMin: 1 }
  ];
  
  for (const test of queries) {
    try {
      const response = await axios.get(`${API_BASE}/search`, {
        params: { query: test.query, limit: 10 }
      });
      
      const results = response.data.results || [];
      recordTest('Search', `Search for "${test.query}"`, 
        results.length >= test.expectedMin,
        `Found ${results.length} results`);
    } catch (error) {
      recordTest('Search', `Search for "${test.query}"`, false, error.message);
    }
  }
  
  // Test semantic search
  try {
    const response = await axios.post(`${API_BASE}/search/semantic`, {
      query: 'class with methods',
      limit: 5
    });
    recordTest('Search', 'Semantic search', response.status === 200);
  } catch (error) {
    // Semantic search might not be implemented
    recordTest('Search', 'Semantic search', false, 'Not implemented or failed');
  }
}

// ========== COMPONENTS ==========
async function testComponents() {
  logSection('Testing Components');
  
  try {
    // Get all components
    const allComponents = await axios.get(`${API_BASE}/components`);
    recordTest('Components', 'Get all components', 
      Array.isArray(allComponents.data.components || allComponents.data));
    
    // Get components by type
    const classes = await axios.get(`${API_BASE}/components`, {
      params: { type: 'class' }
    });
    recordTest('Components', 'Filter by type', true);
    
    // Get specific component (if we have any)
    if (allComponents.data.components && allComponents.data.components.length > 0) {
      const componentId = allComponents.data.components[0].id;
      const specific = await axios.get(`${API_BASE}/components/${componentId}`);
      recordTest('Components', 'Get specific component', specific.data !== undefined);
    }
  } catch (error) {
    recordTest('Components', 'Component operations', false, error.message);
  }
}

// ========== RELATIONSHIPS ==========
async function testRelationships() {
  logSection('Testing Relationships');
  
  try {
    // Get all relationships
    const response = await axios.get(`${API_BASE}/relationships`);
    recordTest('Relationships', 'Get all relationships', 
      Array.isArray(response.data.relationships || response.data));
    
    // Test relationship types
    const types = ['extends', 'implements', 'uses', 'imports'];
    for (const type of types) {
      try {
        const filtered = await axios.get(`${API_BASE}/relationships`, {
          params: { type }
        });
        recordTest('Relationships', `Filter by type: ${type}`, true);
      } catch (e) {
        recordTest('Relationships', `Filter by type: ${type}`, false, 'Failed');
      }
    }
  } catch (error) {
    recordTest('Relationships', 'Relationship operations', false, error.message);
  }
}

// ========== NOTES ==========
async function testNotes() {
  logSection('Testing Notes');
  
  try {
    // Create note
    const createResponse = await axios.post(`${API_BASE}/notes`, {
      title: 'Test Note',
      content: '# Test Note\n\nThis is a test note with **markdown**.',
      note_type: 'documentation',
      tags: ['test', 'functional']
    });
    const noteId = createResponse.data.note.id;
    recordTest('Notes', 'Create note', noteId !== undefined);
    
    // Get note
    const getResponse = await axios.get(`${API_BASE}/notes/${noteId}`);
    recordTest('Notes', 'Get specific note', getResponse.data.note !== undefined);
    
    // Update note
    const updateResponse = await axios.put(`${API_BASE}/notes/${noteId}`, {
      title: 'Updated Test Note',
      content: getResponse.data.note.content + '\n\nUpdated content.'
    });
    recordTest('Notes', 'Update note', updateResponse.status === 200);
    
    // List notes
    const listResponse = await axios.get(`${API_BASE}/notes`);
    recordTest('Notes', 'List notes', Array.isArray(listResponse.data.notes || listResponse.data.items));
    
    // Search notes
    const searchResponse = await axios.get(`${API_BASE}/notes/search`, {
      params: { query: 'test' }
    });
    recordTest('Notes', 'Search notes', true);
    
    // Create hierarchical note
    const childNote = await axios.post(`${API_BASE}/notes`, {
      title: 'Child Note',
      content: 'This is a child note',
      parent_id: noteId
    });
    recordTest('Notes', 'Create child note', childNote.data.note.parent_id === noteId);
    
    // Get note tree
    try {
      const treeResponse = await axios.get(`${API_BASE}/notes/tree`);
      recordTest('Notes', 'Get note tree', true);
    } catch (e) {
      recordTest('Notes', 'Get note tree', false, 'Not implemented');
    }
    
    // Delete note
    const deleteResponse = await axios.delete(`${API_BASE}/notes/${childNote.data.note.id}`);
    recordTest('Notes', 'Delete note', deleteResponse.status === 200 || deleteResponse.status === 204);
    
    return noteId;
  } catch (error) {
    recordTest('Notes', 'Note operations', false, error.message);
    return null;
  }
}

// ========== TASKS ==========
async function testTasks() {
  logSection('Testing Tasks');
  
  try {
    // Create task
    const createResponse = await axios.post(`${API_BASE}/tasks`, {
      title: 'Test Task',
      description: 'This is a test task',
      task_type: 'task',
      task_priority: 'high',
      task_status: 'todo'
    });
    const taskId = createResponse.data.task.id;
    recordTest('Tasks', 'Create task', taskId !== undefined);
    
    // Get task
    const getResponse = await axios.get(`${API_BASE}/tasks/${taskId}`);
    recordTest('Tasks', 'Get specific task', getResponse.data.task !== undefined);
    
    // Update task status
    const updateResponse = await axios.put(`${API_BASE}/tasks/${taskId}`, {
      task_status: 'in_progress'
    });
    recordTest('Tasks', 'Update task status', updateResponse.status === 200);
    
    // Create subtask
    const subtaskResponse = await axios.post(`${API_BASE}/tasks`, {
      title: 'Subtask',
      description: 'This is a subtask',
      parent_id: taskId,
      task_type: 'subtask',
      task_status: 'todo'
    });
    recordTest('Tasks', 'Create subtask', subtaskResponse.data.task.parent_id === taskId);
    
    // Add task dependency
    try {
      const depResponse = await axios.post(`${API_BASE}/tasks/dependencies`, {
        dependent_task_id: taskId,
        dependency_task_id: subtaskResponse.data.task.id,
        dependency_type: 'blocks'
      });
      recordTest('Tasks', 'Add task dependency', true);
    } catch (e) {
      recordTest('Tasks', 'Add task dependency', false, 'Not implemented');
    }
    
    // Get task tree
    try {
      const treeResponse = await axios.get(`${API_BASE}/tasks/tree`);
      recordTest('Tasks', 'Get task tree', true);
    } catch (e) {
      recordTest('Tasks', 'Get task tree', false, 'Not implemented');
    }
    
    // List tasks with filters
    const todoTasks = await axios.get(`${API_BASE}/tasks`, {
      params: { task_status: 'todo' }
    });
    recordTest('Tasks', 'Filter tasks by status', true);
    
    // Suggest next tasks
    try {
      const suggestResponse = await axios.post(`${API_BASE}/tasks/suggest-next`, {
        context: 'working on refactoring'
      });
      recordTest('Tasks', 'Suggest next tasks', true);
    } catch (e) {
      recordTest('Tasks', 'Suggest next tasks', false, 'Not implemented');
    }
    
    return taskId;
  } catch (error) {
    recordTest('Tasks', 'Task operations', false, error.message);
    return null;
  }
}

// ========== CHECKLISTS ==========
async function testChecklists(taskId) {
  logSection('Testing Checklists');
  
  if (!taskId) {
    recordTest('Checklists', 'Test skipped', false, 'No task ID available');
    return;
  }
  
  try {
    // Add checklist to task
    const addResponse = await axios.post(`${API_BASE}/checklists`, {
      task_id: taskId,
      name: 'Implementation Steps',
      items: ['Step 1', 'Step 2', 'Step 3']
    });
    recordTest('Checklists', 'Add checklist to task', true);
    
    // Toggle checklist item
    const toggleResponse = await axios.post(`${API_BASE}/checklists/toggle`, {
      task_id: taskId,
      checklist_name: 'Implementation Steps',
      item_index: 0
    });
    recordTest('Checklists', 'Toggle checklist item', true);
    
    // Add item to checklist
    const addItemResponse = await axios.post(`${API_BASE}/checklists/add-item`, {
      task_id: taskId,
      checklist_name: 'Implementation Steps',
      text: 'Step 4'
    });
    recordTest('Checklists', 'Add item to checklist', true);
    
    // Get checklist progress
    const progressResponse = await axios.get(`${API_BASE}/checklists/progress`, {
      params: { task_id: taskId }
    });
    recordTest('Checklists', 'Get checklist progress', true);
    
  } catch (error) {
    recordTest('Checklists', 'Checklist operations', false, error.message);
  }
}

// ========== RULES ==========
async function testRules() {
  logSection('Testing Rules');
  
  try {
    // Create rule
    const createResponse = await axios.post(`${API_BASE}/rules`, {
      name: 'Test Rule',
      description: 'Test rule for validation',
      rule_type: 'pattern',
      priority: 8,
      guidance_text: 'Follow this pattern',
      trigger_patterns: {
        files: ['*.js', '*.ts'],
        components: ['function', 'method']
      },
      code_template: 'function ${name}() {\n  // TODO\n}'
    });
    const ruleId = createResponse.data.rule.id;
    recordTest('Rules', 'Create rule', ruleId !== undefined);
    
    // Get rule
    const getResponse = await axios.get(`${API_BASE}/rules/${ruleId}`);
    recordTest('Rules', 'Get specific rule', getResponse.data.rule !== undefined);
    
    // Update rule
    const updateResponse = await axios.put(`${API_BASE}/rules/${ruleId}`, {
      priority: 9,
      active: true
    });
    recordTest('Rules', 'Update rule', updateResponse.status === 200);
    
    // Get applicable rules
    try {
      const applicableResponse = await axios.post(`${API_BASE}/rules/applicable`, {
        entity_type: 'component',
        entity_id: 'test-component',
        context: {
          file_content: 'function test() {}',
          user_intent: 'implementing feature'
        }
      });
      recordTest('Rules', 'Get applicable rules', true);
    } catch (e) {
      recordTest('Rules', 'Get applicable rules', false, 'Not implemented');
    }
    
    // Apply rule
    try {
      const applyResponse = await axios.post(`${API_BASE}/rules/apply`, {
        rule_id: ruleId,
        target_entity: {
          entity_type: 'component',
          entity_id: 'test-component'
        }
      });
      recordTest('Rules', 'Apply rule', true);
    } catch (e) {
      recordTest('Rules', 'Apply rule', false, 'Not implemented');
    }
    
    // Track rule application
    try {
      const trackResponse = await axios.post(`${API_BASE}/rules/track`, {
        rule_id: ruleId,
        entity_type: 'component',
        entity_id: 'test-component',
        user_action: 'accepted',
        feedback_score: 5
      });
      recordTest('Rules', 'Track rule application', true);
    } catch (e) {
      recordTest('Rules', 'Track rule application', false, 'Not implemented');
    }
    
    // Get rule analytics
    try {
      const analyticsResponse = await axios.get(`${API_BASE}/rules/analytics`, {
        params: { days_since: 30 }
      });
      recordTest('Rules', 'Get rule analytics', true);
    } catch (e) {
      recordTest('Rules', 'Get rule analytics', false, 'Not implemented');
    }
    
    // Get rule tree
    try {
      const treeResponse = await axios.get(`${API_BASE}/rules/tree`);
      recordTest('Rules', 'Get rule tree', true);
    } catch (e) {
      recordTest('Rules', 'Get rule tree', false, 'Not implemented');
    }
    
    return ruleId;
  } catch (error) {
    recordTest('Rules', 'Rule operations', false, error.message);
    return null;
  }
}

// ========== DEGRADATION ==========
async function testDegradation() {
  logSection('Testing Degradation System');
  
  try {
    // Get degradation status
    const statusResponse = await axios.get(`${API_BASE}/degradation/status`);
    recordTest('Degradation', 'Get degradation status', true);
    
    // Run manual cleanup
    const cleanupResponse = await axios.post(`${API_BASE}/degradation/cleanup`);
    recordTest('Degradation', 'Run manual cleanup', true);
    
    // Configure degradation
    const configResponse = await axios.post(`${API_BASE}/degradation/configure`, {
      enabled: true,
      intervalHours: 24,
      runOnStartup: false
    });
    recordTest('Degradation', 'Configure degradation', true);
    
    // Stop degradation
    const stopResponse = await axios.post(`${API_BASE}/degradation/stop`);
    recordTest('Degradation', 'Stop degradation scheduler', true);
    
    // Start degradation
    const startResponse = await axios.post(`${API_BASE}/degradation/start`);
    recordTest('Degradation', 'Start degradation scheduler', true);
    
  } catch (error) {
    recordTest('Degradation', 'Degradation operations', false, 'Not implemented or failed');
  }
}

// ========== KNOWLEDGE GRAPH ==========
async function testKnowledgeGraph() {
  logSection('Testing Knowledge Graph');
  
  try {
    // Get graph statistics
    const statsResponse = await axios.get(`${API_BASE}/graph/stats`);
    recordTest('Knowledge Graph', 'Get graph statistics', true);
    
    // Get node neighbors
    const components = await axios.get(`${API_BASE}/components`);
    if (components.data.components && components.data.components.length > 0) {
      const nodeId = components.data.components[0].id;
      const neighborsResponse = await axios.get(`${API_BASE}/graph/neighbors/${nodeId}`);
      recordTest('Knowledge Graph', 'Get node neighbors', true);
    }
    
    // Find paths between nodes
    if (components.data.components && components.data.components.length > 1) {
      const source = components.data.components[0].id;
      const target = components.data.components[1].id;
      try {
        const pathResponse = await axios.get(`${API_BASE}/graph/path`, {
          params: { source, target }
        });
        recordTest('Knowledge Graph', 'Find path between nodes', true);
      } catch (e) {
        recordTest('Knowledge Graph', 'Find path between nodes', false, 'Not implemented');
      }
    }
    
    // Get clusters
    try {
      const clustersResponse = await axios.get(`${API_BASE}/graph/clusters`);
      recordTest('Knowledge Graph', 'Get graph clusters', true);
    } catch (e) {
      recordTest('Knowledge Graph', 'Get graph clusters', false, 'Not implemented');
    }
    
  } catch (error) {
    recordTest('Knowledge Graph', 'Knowledge graph operations', false, 'Not implemented or failed');
  }
}

// ========== FILE OPERATIONS ==========
async function testFileOperations() {
  logSection('Testing File Operations');
  
  try {
    // Watch for file changes
    const testFile = path.join(TEST_DIR, 'test-watch.js');
    
    // Create a test file
    fs.writeFileSync(testFile, 'function testWatch() { return "initial"; }');
    
    // Wait for file watcher to pick it up
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Modify the file
    fs.writeFileSync(testFile, 'function testWatch() { return "modified"; }');
    
    // Wait for update
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if component was updated
    const searchResponse = await axios.get(`${API_BASE}/search`, {
      params: { query: 'testWatch' }
    });
    
    recordTest('File Operations', 'File watching', searchResponse.data.results.length > 0);
    
    // Clean up
    fs.unlinkSync(testFile);
    
  } catch (error) {
    recordTest('File Operations', 'File operations', false, error.message);
  }
}

// ========== EMBEDDINGS ==========
async function testEmbeddings() {
  logSection('Testing Embeddings & Semantic Search');
  
  try {
    // Generate embeddings for components
    const generateResponse = await axios.post(`${API_BASE}/embeddings/generate`, {
      entity_type: 'components'
    });
    recordTest('Embeddings', 'Generate component embeddings', true);
    
    // Semantic similarity search
    const similarityResponse = await axios.post(`${API_BASE}/search/similarity`, {
      query: 'function that handles async operations',
      limit: 5
    });
    recordTest('Embeddings', 'Semantic similarity search', true);
    
    // Find similar components
    const components = await axios.get(`${API_BASE}/components`);
    if (components.data.components && components.data.components.length > 0) {
      const componentId = components.data.components[0].id;
      const similarResponse = await axios.get(`${API_BASE}/components/${componentId}/similar`);
      recordTest('Embeddings', 'Find similar components', true);
    }
    
  } catch (error) {
    recordTest('Embeddings', 'Embedding operations', false, 'Not implemented or failed');
  }
}

// ========== MAIN TEST RUNNER ==========
async function runComprehensiveTests() {
  log('\n🚀 Starting COMPREHENSIVE Functional Tests for Felix', 'bright');
  log(`📁 Test Directory: ${TEST_DIR}`, 'cyan');
  
  // Check server
  try {
    await axios.get(`${API_BASE}/project/stats`);
  } catch (error) {
    log('❌ Server is not running. Please start the server first.', 'red');
    process.exit(1);
  }
  
  // Run all tests
  const projectSet = await testProjectManagement();
  if (!projectSet) {
    log('\n❌ Failed to set project. Cannot continue.', 'red');
    process.exit(1);
  }
  
  const indexResult = await testIndexing();
  await testSearch();
  await testComponents();
  await testRelationships();
  
  const noteId = await testNotes();
  const taskId = await testTasks();
  await testChecklists(taskId);
  const ruleId = await testRules();
  
  await testDegradation();
  await testKnowledgeGraph();
  await testFileOperations();
  await testEmbeddings();
  
  // Print summary
  logSection('TEST SUMMARY');
  
  log(`\nTotal Tests: ${testResults.passed + testResults.failed}`, 'bright');
  log(`✅ Passed: ${testResults.passed}`, 'green');
  log(`❌ Failed: ${testResults.failed}`, 'red');
  
  log('\n📊 Feature Coverage:', 'bright');
  for (const [feature, results] of Object.entries(testResults.features)) {
    const icon = results.failed === 0 ? '✅' : '⚠️';
    log(`  ${icon} ${feature}: ${results.passed}/${results.tests.length} passed`, 
      results.failed === 0 ? 'green' : 'yellow');
    
    if (results.failed > 0) {
      results.tests.filter(t => !t.passed).forEach(test => {
        log(`    ❌ ${test.name}: ${test.details}`, 'red');
      });
    }
  }
  
  // Overall result
  const passRate = (testResults.passed / (testResults.passed + testResults.failed) * 100).toFixed(1);
  log(`\n📈 Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : passRate >= 60 ? 'yellow' : 'red');
  
  if (testResults.failed === 0) {
    log('\n🎉 ALL TESTS PASSED! The felix is fully functional!', 'green');
  } else {
    log(`\n⚠️  Some tests failed. Review the failures above.`, 'yellow');
  }
}

// Run the tests
runComprehensiveTests().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});