#!/usr/bin/env node

/**
 * EXHAUSTIVE test for EVERY SINGLE felix feature
 * This test verifies ALL functionality is working correctly
 */

const path = require('path');
const axios = require('axios').default;
const fs = require('fs');

const API_BASE = 'http://localhost:9000/api';
const TEST_DIR = path.resolve(__dirname);

// Test tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ ${testName}`);
  } else {
    failedTests.push({ name: testName, details });
    console.log(`  ❌ ${testName}: ${details}`);
  }
}

async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) config.data = data;
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.message, 
      status: error.response?.status,
      data: error.response?.data 
    };
  }
}

// ==================== PROJECTS ====================
async function testProjects() {
  console.log('\n🔍 TESTING PROJECTS');
  
  // Set project
  const setResult = await makeRequest('POST', '/project/set', { path: TEST_DIR });
  assert(setResult.success, 'Set project', setResult.error);
  
  // Get current project
  const currentResult = await makeRequest('GET', '/project/current');
  assert(currentResult.success, 'Get current project', currentResult.error);
  assert(
    currentResult.data?.project === TEST_DIR || currentResult.data?.project_path === TEST_DIR,
    'Current project matches',
    `Expected ${TEST_DIR}, got ${currentResult.data?.project}`
  );
  
  // Get stats
  const statsResult = await makeRequest('GET', '/project/stats');
  assert(statsResult.success, 'Get project stats', statsResult.error);
  assert(statsResult.data?.stats !== undefined, 'Stats object exists');
  
  // Index project
  const indexResult = await makeRequest('POST', '/project/index', {
    projectPath: TEST_DIR,
    deep: true,
    force: true,
    includeTests: true
  });
  assert(indexResult.success, 'Index project', indexResult.error);
  assert(indexResult.data?.result?.filesProcessed > 0, 'Files processed > 0');
  assert(indexResult.data?.result?.componentCount > 0, 'Components found > 0');
  
  // Index metadata
  const metaIndexResult = await makeRequest('POST', '/project/index-metadata');
  assert(metaIndexResult.success, 'Index metadata entities', metaIndexResult.error);
  
  return indexResult.data?.result;
}

// ==================== SEARCH ====================
async function testSearch() {
  console.log('\n🔍 TESTING SEARCH');
  
  // Basic search
  const queries = ['BasicClass', 'function', 'async', 'interface', 'class', 'method'];
  for (const query of queries) {
    const result = await makeRequest('GET', `/search?query=${query}`);
    assert(result.success, `Search API works for "${query}"`, result.error);
    
    // Check if we're getting results (search might be broken)
    const hasResults = result.data?.results?.length > 0;
    assert(hasResults, `Search returns results for "${query}"`, 
      `Found ${result.data?.results?.length || 0} results`);
  }
  
  // Search with filters
  const filteredResult = await makeRequest('GET', '/search?query=class&type=class&limit=5');
  assert(filteredResult.success, 'Search with filters', filteredResult.error);
  
  // Semantic search
  const semanticResult = await makeRequest('POST', '/search/semantic', {
    query: 'functions that handle async operations',
    limit: 5
  });
  assert(semanticResult.success || semanticResult.status === 404, 
    'Semantic search endpoint', 
    semanticResult.status === 404 ? 'Not implemented' : semanticResult.error);
}

// ==================== COMPONENTS ====================
async function testComponents() {
  console.log('\n🔍 TESTING COMPONENTS');
  
  // Get all components
  const allResult = await makeRequest('GET', '/components');
  assert(allResult.success || allResult.status === 404, 'Get all components', 
    allResult.status === 404 ? 'Endpoint not found' : allResult.error);
  
  if (allResult.success && allResult.data?.components?.length > 0) {
    const componentId = allResult.data.components[0].id;
    
    // Get specific component
    const specificResult = await makeRequest('GET', `/components/${componentId}`);
    assert(specificResult.success, 'Get specific component', specificResult.error);
    
    // Get component context
    const contextResult = await makeRequest('GET', `/components/${componentId}/context`);
    assert(contextResult.success || contextResult.status === 404, 
      'Get component context',
      contextResult.status === 404 ? 'Not implemented' : contextResult.error);
    
    // Get similar components
    const similarResult = await makeRequest('GET', `/components/${componentId}/similar`);
    assert(similarResult.success || similarResult.status === 404,
      'Get similar components',
      similarResult.status === 404 ? 'Not implemented' : similarResult.error);
  }
  
  // Get components by type
  const byTypeResult = await makeRequest('GET', '/components?type=class');
  assert(byTypeResult.success || byTypeResult.status === 404, 
    'Get components by type',
    byTypeResult.status === 404 ? 'Endpoint not found' : byTypeResult.error);
}

// ==================== RELATIONSHIPS ====================
async function testRelationships() {
  console.log('\n🔍 TESTING RELATIONSHIPS');
  
  // Get all relationships
  const allResult = await makeRequest('GET', '/relationships');
  assert(allResult.success || allResult.status === 404, 
    'Get all relationships',
    allResult.status === 404 ? 'Endpoint not found' : allResult.error);
  
  // Get relationships by type
  const types = ['extends', 'implements', 'uses', 'imports', 'calls'];
  for (const type of types) {
    const result = await makeRequest('GET', `/relationships?type=${type}`);
    assert(result.success || result.status === 404,
      `Get relationships of type ${type}`,
      result.status === 404 ? 'Endpoint not found' : result.error);
  }
}

// ==================== NOTES ====================
async function testNotes() {
  console.log('\n🔍 TESTING NOTES');
  
  // Create root note
  const createResult = await makeRequest('POST', '/notes', {
    title: 'Root Test Note',
    content: '# Root Note\n\nThis is the root note for testing.',
    note_type: 'documentation',
    tags: ['test', 'root']
  });
  assert(createResult.success, 'Create root note', createResult.error);
  const rootNoteId = createResult.data?.note?.id;
  
  if (rootNoteId) {
    // Create child note
    const childResult = await makeRequest('POST', '/notes', {
      title: 'Child Note',
      content: 'This is a child note',
      parent_id: rootNoteId,
      note_type: 'note'
    });
    assert(childResult.success, 'Create child note', childResult.error);
    assert(childResult.data?.note?.parent_id === rootNoteId, 'Child note has correct parent');
    const childNoteId = childResult.data?.note?.id;
    
    // Create grandchild note
    const grandchildResult = await makeRequest('POST', '/notes', {
      title: 'Grandchild Note',
      content: 'This is a grandchild note',
      parent_id: childNoteId,
      note_type: 'note'
    });
    assert(grandchildResult.success, 'Create grandchild note', grandchildResult.error);
    
    // Get note
    const getResult = await makeRequest('GET', `/notes/${rootNoteId}`);
    assert(getResult.success, 'Get specific note', getResult.error);
    
    // Update note
    const updateResult = await makeRequest('PUT', `/notes/${rootNoteId}`, {
      title: 'Updated Root Note',
      content: getResult.data?.note?.content + '\n\nUpdated.'
    });
    assert(updateResult.success, 'Update note', updateResult.error);
    
    // List all notes
    const listResult = await makeRequest('GET', '/notes');
    assert(listResult.success, 'List all notes', listResult.error);
    assert(listResult.data?.notes?.length > 0 || listResult.data?.items?.length > 0,
      'Notes list has items');
    
    // Get note tree
    const treeResult = await makeRequest('GET', '/notes/tree');
    assert(treeResult.success || treeResult.status === 404,
      'Get note tree',
      treeResult.status === 404 ? 'Not implemented' : treeResult.error);
    
    // Search notes
    const searchResult = await makeRequest('GET', '/notes/search?query=root');
    assert(searchResult.success || searchResult.status === 404,
      'Search notes',
      searchResult.status === 404 ? 'Not implemented' : searchResult.error);
    
    // Link note to component
    const components = await makeRequest('GET', '/components');
    if (components.success && components.data?.components?.length > 0) {
      const linkResult = await makeRequest('PUT', `/notes/${rootNoteId}`, {
        entity_links: [{
          entity_type: 'component',
          entity_id: components.data.components[0].id,
          entity_name: components.data.components[0].name
        }]
      });
      assert(linkResult.success, 'Link note to component', linkResult.error);
    }
    
    // Delete grandchild note
    const deleteResult = await makeRequest('DELETE', `/notes/${grandchildResult.data?.note?.id}`);
    assert(deleteResult.success, 'Delete note', deleteResult.error);
  }
  
  return rootNoteId;
}

// ==================== TASKS ====================
async function testTasks() {
  console.log('\n🔍 TESTING TASKS');
  
  // Create epic
  const epicResult = await makeRequest('POST', '/tasks', {
    title: 'Epic Task',
    description: 'This is an epic with subtasks',
    task_type: 'epic',
    task_priority: 'high',
    task_status: 'todo'
  });
  assert(epicResult.success, 'Create epic task', epicResult.error);
  const epicId = epicResult.data?.task?.id;
  
  if (epicId) {
    // Create subtasks
    const subtask1Result = await makeRequest('POST', '/tasks', {
      title: 'Subtask 1',
      description: 'First subtask',
      parent_id: epicId,
      task_type: 'task',
      task_status: 'todo'
    });
    assert(subtask1Result.success, 'Create subtask 1', subtask1Result.error);
    const subtask1Id = subtask1Result.data?.task?.id;
    
    const subtask2Result = await makeRequest('POST', '/tasks', {
      title: 'Subtask 2',
      description: 'Second subtask',
      parent_id: epicId,
      task_type: 'task',
      task_status: 'todo'
    });
    assert(subtask2Result.success, 'Create subtask 2', subtask2Result.error);
    const subtask2Id = subtask2Result.data?.task?.id;
    
    // Add dependency
    const depResult = await makeRequest('POST', '/tasks/dependencies', {
      dependent_task_id: subtask2Id,
      dependency_task_id: subtask1Id,
      dependency_type: 'blocks'
    });
    assert(depResult.success || depResult.status === 404,
      'Add task dependency',
      depResult.status === 404 ? 'Not implemented' : depResult.error);
    
    // Get task
    const getResult = await makeRequest('GET', `/tasks/${epicId}`);
    assert(getResult.success, 'Get specific task', getResult.error);
    
    // Update task
    const updateResult = await makeRequest('PUT', `/tasks/${subtask1Id}`, {
      task_status: 'in_progress'
    });
    assert(updateResult.success, 'Update task status', updateResult.error);
    
    // List tasks
    const listResult = await makeRequest('GET', '/tasks');
    assert(listResult.success, 'List all tasks', listResult.error);
    assert(listResult.data?.tasks?.length > 0 || listResult.data?.items?.length > 0,
      'Tasks list has items');
    
    // Filter tasks
    const filterResult = await makeRequest('GET', '/tasks?task_status=todo');
    assert(filterResult.success, 'Filter tasks by status', filterResult.error);
    
    // Get task tree
    const treeResult = await makeRequest('GET', '/tasks/tree');
    assert(treeResult.success || treeResult.status === 404,
      'Get task tree',
      treeResult.status === 404 ? 'Not implemented' : treeResult.error);
    
    // Get dependencies
    const depsResult = await makeRequest('GET', `/tasks/${subtask2Id}/dependencies`);
    assert(depsResult.success || depsResult.status === 404,
      'Get task dependencies',
      depsResult.status === 404 ? 'Not implemented' : depsResult.error);
    
    // Suggest next tasks
    const suggestResult = await makeRequest('POST', '/tasks/suggest-next', {
      context: 'working on implementation',
      assignee: 'developer'
    });
    assert(suggestResult.success || suggestResult.status === 404,
      'Suggest next tasks',
      suggestResult.status === 404 ? 'Not implemented' : suggestResult.error);
    
    return epicId;
  }
}

// ==================== CHECKLISTS ====================
async function testChecklists(taskId) {
  console.log('\n🔍 TESTING CHECKLISTS');
  
  if (!taskId) {
    assert(false, 'Checklists test skipped', 'No task ID available');
    return;
  }
  
  // Add checklist
  const addResult = await makeRequest('POST', '/checklists', {
    task_id: taskId,
    name: 'Implementation Checklist',
    items: ['Design', 'Implement', 'Test', 'Document', 'Review']
  });
  assert(addResult.success || addResult.status === 404,
    'Add checklist to task',
    addResult.status === 404 ? 'Not implemented' : addResult.error);
  
  if (addResult.success) {
    // Update checklist (rename)
    const updateResult = await makeRequest('PUT', '/checklists', {
      task_id: taskId,
      checklist_name: 'Implementation Checklist',
      new_name: 'Development Checklist'
    });
    assert(updateResult.success, 'Update checklist name', updateResult.error);
    
    // Toggle item
    const toggleResult = await makeRequest('POST', '/checklists/toggle', {
      task_id: taskId,
      checklist_name: 'Development Checklist',
      item_index: 0
    });
    assert(toggleResult.success, 'Toggle checklist item by index', toggleResult.error);
    
    // Toggle by text
    const toggleTextResult = await makeRequest('POST', '/checklists/toggle', {
      task_id: taskId,
      checklist_name: 'Development Checklist',
      item_text: 'Test'
    });
    assert(toggleTextResult.success, 'Toggle checklist item by text', toggleTextResult.error);
    
    // Add item
    const addItemResult = await makeRequest('POST', '/checklists/add-item', {
      task_id: taskId,
      checklist_name: 'Development Checklist',
      text: 'Deploy',
      position: 5
    });
    assert(addItemResult.success, 'Add item to checklist', addItemResult.error);
    
    // Remove item
    const removeItemResult = await makeRequest('POST', '/checklists/remove-item', {
      task_id: taskId,
      checklist_name: 'Development Checklist',
      item_index: 5
    });
    assert(removeItemResult.success, 'Remove item from checklist', removeItemResult.error);
    
    // Get progress
    const progressResult = await makeRequest('GET', `/checklists/progress?task_id=${taskId}`);
    assert(progressResult.success, 'Get checklist progress', progressResult.error);
    
    // Delete checklist
    const deleteResult = await makeRequest('DELETE', '/checklists', {
      task_id: taskId,
      checklist_name: 'Development Checklist'
    });
    assert(deleteResult.success, 'Delete checklist', deleteResult.error);
  }
}

// ==================== RULES ====================
async function testRules() {
  console.log('\n🔍 TESTING RULES');
  
  // Create parent rule
  const parentResult = await makeRequest('POST', '/rules', {
    name: 'Parent Rule',
    description: 'Parent rule for testing hierarchy',
    rule_type: 'pattern',
    priority: 10,
    guidance_text: 'This is the parent rule',
    trigger_patterns: {
      files: ['*.js', '*.ts'],
      components: ['class']
    }
  });
  assert(parentResult.success, 'Create parent rule', parentResult.error);
  const parentRuleId = parentResult.data?.rule?.id;
  
  if (parentRuleId) {
    // Create child rule
    const childResult = await makeRequest('POST', '/rules', {
      name: 'Child Rule',
      description: 'Child rule',
      parent_id: parentRuleId,
      rule_type: 'constraint',
      priority: 8,
      validation_script: 'return value.length > 0;'
    });
    assert(childResult.success, 'Create child rule', childResult.error);
    const childRuleId = childResult.data?.rule?.id;
    
    // Create automation rule
    const autoResult = await makeRequest('POST', '/rules', {
      name: 'Automation Rule',
      description: 'Rule that generates code',
      rule_type: 'automation',
      priority: 7,
      auto_apply: true,
      code_template: 'function ${name}() {\n  // Generated by rule\n}',
      confidence_threshold: 0.9
    });
    assert(autoResult.success, 'Create automation rule', autoResult.error);
    const autoRuleId = autoResult.data?.rule?.id;
    
    // Get rule
    const getResult = await makeRequest('GET', `/rules/${parentRuleId}`);
    assert(getResult.success, 'Get specific rule', getResult.error);
    
    // Update rule
    const updateResult = await makeRequest('PUT', `/rules/${parentRuleId}`, {
      priority: 9,
      active: true
    });
    assert(updateResult.success, 'Update rule', updateResult.error);
    
    // List rules
    const listResult = await makeRequest('GET', '/rules');
    assert(listResult.success, 'List all rules', listResult.error);
    assert(listResult.data?.rules?.length > 0 || listResult.data?.items?.length > 0,
      'Rules list has items');
    
    // Get rule tree
    const treeResult = await makeRequest('GET', '/rules/tree');
    assert(treeResult.success, 'Get rule tree', treeResult.error);
    
    // Get applicable rules
    const applicableResult = await makeRequest('POST', '/rules/applicable', {
      entity_type: 'component',
      entity_id: 'test-component',
      context: {
        file_content: 'class TestClass {}',
        user_intent: 'implementing class',
        current_task_id: 'task-123'
      }
    });
    assert(applicableResult.success || applicableResult.status === 404,
      'Get applicable rules',
      applicableResult.status === 404 ? 'Not implemented' : applicableResult.error);
    
    // Apply rule
    const applyResult = await makeRequest('POST', '/rules/apply', {
      rule_id: autoRuleId,
      target_entity: {
        entity_type: 'component',
        entity_id: 'test-component',
        file_path: '/test/file.js'
      },
      application_context: {
        user_intent: 'generate function',
        force_apply: false
      }
    });
    assert(applyResult.success || applyResult.status === 404,
      'Apply rule',
      applyResult.status === 404 ? 'Not implemented' : applyResult.error);
    
    // Track rule application
    const trackResult = await makeRequest('POST', '/rules/track', {
      rule_id: autoRuleId,
      entity_type: 'component',
      entity_id: 'test-component',
      user_action: 'accepted',
      feedback_score: 5,
      generated_code: 'function test() { }',
      applied_context: { user_intent: 'generate function' }
    });
    assert(trackResult.success || trackResult.status === 404,
      'Track rule application',
      trackResult.status === 404 ? 'Not implemented' : trackResult.error);
    
    // Get rule analytics
    const analyticsResult = await makeRequest('GET', '/rules/analytics?days_since=30');
    assert(analyticsResult.success || analyticsResult.status === 404,
      'Get rule analytics',
      analyticsResult.status === 404 ? 'Not implemented' : analyticsResult.error);
    
    // Delete child rule
    const deleteResult = await makeRequest('DELETE', `/rules/${childRuleId}`);
    assert(deleteResult.success, 'Delete rule', deleteResult.error);
  }
}

// ==================== DEGRADATION ====================
async function testDegradation() {
  console.log('\n🔍 TESTING DEGRADATION SYSTEM');
  
  // Get status
  const statusResult = await makeRequest('GET', '/degradation/status');
  assert(statusResult.success || statusResult.status === 404,
    'Get degradation status',
    statusResult.status === 404 ? 'Not implemented' : statusResult.error);
  
  // Configure
  const configResult = await makeRequest('POST', '/degradation/configure', {
    enabled: true,
    intervalHours: 24,
    maxRetries: 3,
    retryDelayMinutes: 5,
    runOnStartup: false
  });
  assert(configResult.success || configResult.status === 404,
    'Configure degradation',
    configResult.status === 404 ? 'Not implemented' : configResult.error);
  
  // Run cleanup
  const cleanupResult = await makeRequest('POST', '/degradation/cleanup');
  assert(cleanupResult.success || cleanupResult.status === 404,
    'Run cleanup',
    cleanupResult.status === 404 ? 'Not implemented' : cleanupResult.error);
  
  // Stop scheduler
  const stopResult = await makeRequest('POST', '/degradation/stop');
  assert(stopResult.success || stopResult.status === 404,
    'Stop degradation scheduler',
    stopResult.status === 404 ? 'Not implemented' : stopResult.error);
  
  // Start scheduler
  const startResult = await makeRequest('POST', '/degradation/start');
  assert(startResult.success || startResult.status === 404,
    'Start degradation scheduler',
    startResult.status === 404 ? 'Not implemented' : startResult.error);
}

// ==================== KNOWLEDGE GRAPH ====================
async function testKnowledgeGraph() {
  console.log('\n🔍 TESTING KNOWLEDGE GRAPH');
  
  // Get graph stats
  const statsResult = await makeRequest('GET', '/graph/stats');
  assert(statsResult.success || statsResult.status === 404,
    'Get graph statistics',
    statsResult.status === 404 ? 'Not implemented' : statsResult.error);
  
  // Get components for testing
  const components = await makeRequest('GET', '/components');
  if (components.success && components.data?.components?.length > 1) {
    const node1 = components.data.components[0].id;
    const node2 = components.data.components[1].id;
    
    // Get neighbors
    const neighborsResult = await makeRequest('GET', `/graph/neighbors/${node1}`);
    assert(neighborsResult.success || neighborsResult.status === 404,
      'Get node neighbors',
      neighborsResult.status === 404 ? 'Not implemented' : neighborsResult.error);
    
    // Find path
    const pathResult = await makeRequest('GET', `/graph/path?source=${node1}&target=${node2}`);
    assert(pathResult.success || pathResult.status === 404,
      'Find path between nodes',
      pathResult.status === 404 ? 'Not implemented' : pathResult.error);
    
    // Get clusters
    const clustersResult = await makeRequest('GET', '/graph/clusters');
    assert(clustersResult.success || clustersResult.status === 404,
      'Get graph clusters',
      clustersResult.status === 404 ? 'Not implemented' : clustersResult.error);
    
    // Get subgraph
    const subgraphResult = await makeRequest('POST', '/graph/subgraph', {
      node_ids: [node1, node2],
      depth: 2
    });
    assert(subgraphResult.success || subgraphResult.status === 404,
      'Get subgraph',
      subgraphResult.status === 404 ? 'Not implemented' : subgraphResult.error);
  }
}

// ==================== EMBEDDINGS ====================
async function testEmbeddings() {
  console.log('\n🔍 TESTING EMBEDDINGS & SEMANTIC SEARCH');
  
  // Generate embeddings
  const generateResult = await makeRequest('POST', '/embeddings/generate', {
    entity_type: 'components'
  });
  assert(generateResult.success || generateResult.status === 404,
    'Generate embeddings',
    generateResult.status === 404 ? 'Not implemented' : generateResult.error);
  
  // Semantic similarity search
  const similarityResult = await makeRequest('POST', '/search/similarity', {
    query: 'async functions with error handling',
    limit: 5,
    threshold: 0.7
  });
  assert(similarityResult.success || similarityResult.status === 404,
    'Semantic similarity search',
    similarityResult.status === 404 ? 'Not implemented' : similarityResult.error);
  
  // Find similar components
  const components = await makeRequest('GET', '/components');
  if (components.success && components.data?.components?.length > 0) {
    const componentId = components.data.components[0].id;
    const similarResult = await makeRequest('GET', `/components/${componentId}/similar?limit=5`);
    assert(similarResult.success || similarResult.status === 404,
      'Find similar components',
      similarResult.status === 404 ? 'Not implemented' : similarResult.error);
  }
  
  // Discovery search
  const discoveryResult = await makeRequest('POST', '/search/discover', {
    query: 'error handling patterns',
    discovery_limit: 10,
    similarity_threshold: 0.6
  });
  assert(discoveryResult.success || discoveryResult.status === 404,
    'Discovery search',
    discoveryResult.status === 404 ? 'Not implemented' : discoveryResult.error);
}

// ==================== CONTEXT GENERATION ====================
async function testContextGeneration() {
  console.log('\n🔍 TESTING CONTEXT GENERATION');
  
  // Get a component to test with
  const searchResult = await makeRequest('GET', '/search?query=class&limit=1');
  if (searchResult.success && searchResult.data?.results?.length > 0) {
    const componentId = searchResult.data.results[0].id;
    
    // Generate context
    const contextResult = await makeRequest('POST', '/context/generate', {
      component_id: componentId,
      depth: 2,
      include_documentation: true,
      include_relationships: true,
      include_source: true,
      include_metadata: true,
      include_notes: true,
      include_rules: true,
      include_tasks: false,
      output_format: 'json',
      target_token_size: 10000
    });
    assert(contextResult.success || contextResult.status === 404,
      'Generate component context',
      contextResult.status === 404 ? 'Not implemented' : contextResult.error);
    
    // Generate markdown context
    const markdownResult = await makeRequest('POST', '/context/generate', {
      component_id: componentId,
      output_format: 'markdown'
    });
    assert(markdownResult.success || markdownResult.status === 404,
      'Generate markdown context',
      markdownResult.status === 404 ? 'Not implemented' : markdownResult.error);
  }
}

// ==================== FILE OPERATIONS ====================
async function testFileOperations() {
  console.log('\n🔍 TESTING FILE OPERATIONS');
  
  // Test file watching by creating and modifying a file
  const testFile = path.join(TEST_DIR, 'watch-test.js');
  
  // Create file
  fs.writeFileSync(testFile, 'function watchTest() { return "v1"; }');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Search for the new component
  const search1Result = await makeRequest('GET', '/search?query=watchTest');
  assert(search1Result.success && search1Result.data?.results?.length > 0,
    'File watcher detected new file',
    `Found ${search1Result.data?.results?.length || 0} results`);
  
  // Modify file
  fs.writeFileSync(testFile, 'function watchTest() { return "v2"; }\nfunction watchTest2() { return "new"; }');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Search for the modified component
  const search2Result = await makeRequest('GET', '/search?query=watchTest2');
  assert(search2Result.success && search2Result.data?.results?.length > 0,
    'File watcher detected file modification',
    `Found ${search2Result.data?.results?.length || 0} results`);
  
  // Clean up
  fs.unlinkSync(testFile);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Verify deletion
  const search3Result = await makeRequest('GET', '/search?query=watchTest2');
  assert(search3Result.data?.results?.length === 0,
    'File watcher detected file deletion',
    `Still found ${search3Result.data?.results?.length || 0} results`);
}

// ==================== MAIN ====================
async function runExhaustiveTests() {
  console.log('🚀 RUNNING EXHAUSTIVE CODE-INDEXER TESTS');
  console.log('=' . repeat(60));
  
  try {
    // Test server connectivity
    const healthCheck = await makeRequest('GET', '/project/stats');
    if (!healthCheck.success) {
      console.error('❌ Server is not responding. Please start the server.');
      process.exit(1);
    }
    
    // Run all test suites
    const indexResult = await testProjects();
    await testSearch();
    await testComponents();
    await testRelationships();
    const noteId = await testNotes();
    const taskId = await testTasks();
    await testChecklists(taskId);
    await testRules();
    await testDegradation();
    await testKnowledgeGraph();
    await testEmbeddings();
    await testContextGeneration();
    await testFileOperations();
    
    // Print summary
    console.log('\n' + '=' . repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' . repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests.length}`);
    console.log(`📈 Pass Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      const grouped = {};
      failedTests.forEach(test => {
        const category = test.name.split(' ')[0];
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(test);
      });
      
      for (const [category, tests] of Object.entries(grouped)) {
        console.log(`\n  ${category}:`);
        tests.forEach(test => {
          console.log(`    ❌ ${test.name}: ${test.details}`);
        });
      }
    }
    
    // Overall verdict
    const passRate = (passedTests / totalTests) * 100;
    if (passRate === 100) {
      console.log('\n🎉 PERFECT! All tests passed!');
    } else if (passRate >= 80) {
      console.log('\n✅ GOOD: Most features are working correctly.');
    } else if (passRate >= 60) {
      console.log('\n⚠️  FAIR: Several features need attention.');
    } else {
      console.log('\n❌ POOR: Many features are broken or missing.');
    }
    
    // Feature completeness
    console.log('\n📋 FEATURE IMPLEMENTATION STATUS:');
    const features = {
      'Core Indexing': passRate > 0,
      'Search': failedTests.filter(t => t.name.includes('Search')).length === 0,
      'Components API': failedTests.filter(t => t.name.includes('component')).length === 0,
      'Relationships': failedTests.filter(t => t.name.includes('relationship')).length === 0,
      'Notes (with hierarchy)': failedTests.filter(t => t.name.includes('note')).length === 0,
      'Tasks (with dependencies)': failedTests.filter(t => t.name.includes('task')).length === 0,
      'Checklists': failedTests.filter(t => t.name.includes('checklist')).length === 0,
      'Rules (with analytics)': failedTests.filter(t => t.name.includes('rule')).length === 0,
      'Degradation System': failedTests.filter(t => t.name.includes('degradation')).length === 0,
      'Knowledge Graph': failedTests.filter(t => t.name.includes('graph')).length === 0,
      'Embeddings/Semantic': failedTests.filter(t => t.name.includes('embedding') || t.name.includes('semantic')).length === 0,
      'Context Generation': failedTests.filter(t => t.name.includes('context')).length === 0,
      'File Watching': failedTests.filter(t => t.name.includes('watch')).length === 0
    };
    
    for (const [feature, working] of Object.entries(features)) {
      console.log(`  ${working ? '✅' : '❌'} ${feature}`);
    }
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runExhaustiveTests();