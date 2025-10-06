#!/usr/bin/env node

/**
 * Test MCP functionality directly
 */

import { projectManager } from './dist/mcp/project-manager.js';

const PROJECT_PATH = '/Users/epoplive/aigent-smith-clean/felix';

async function testMCP() {
  console.log('Testing MCP functionality...\n');
  
  try {
    // Set project
    console.log('1. Setting project...');
    const project = await projectManager.setProject(PROJECT_PATH);
    console.log(`   Project set: ${project.name}`);
    
    // Get project
    console.log('\n2. Getting project...');
    const projectInfo = await projectManager.getProject('felix');
    if (!projectInfo) {
      throw new Error('Could not get project');
    }
    console.log(`   Project retrieved: ${projectInfo.name}`);
    
    // Test search
    console.log('\n3. Testing semantic search...');
    const searchResults = await projectInfo.codeIndexer.searchSemanticUniversal('test', {
      entityTypes: ['component', 'task', 'note', 'rule'],
      limit: 5
    });
    console.log(`   Search returned: ${searchResults.results.length} results`);
    searchResults.results.forEach((r, i) => {
      console.log(`   ${i+1}. [${r.entityType}] ${r.entity.name || r.entity.title || 'Unnamed'}`);
    });
    
    // Test direct task retrieval
    console.log('\n4. Testing direct task retrieval...');
    const taskId = 'task_1756566093304_o4ybuc4kk';
    const task = await projectInfo.codeIndexer.getTask(taskId);
    if (task) {
      console.log(`   Retrieved task: ${task.title}`);
    } else {
      console.log(`   Could not retrieve task ${taskId}`);
    }
    
    // Test component search
    console.log('\n5. Testing component search...');
    const components = await projectInfo.codeIndexer.searchComponents({ query: 'index', limit: 3 });
    console.log(`   Component search returned: ${components.items.length} results`);
    components.items.forEach((c, i) => {
      console.log(`   ${i+1}. ${c.type}: ${c.name} (${c.filePath})`);
    });
    
    // Test listing tasks
    console.log('\n6. Testing task listing...');
    const tasks = await projectInfo.codeIndexer.listTasks({ limit: 3 });
    console.log(`   Listed ${tasks.length} tasks`);
    tasks.forEach((t, i) => {
      console.log(`   ${i+1}. ${t.title}`);
    });
    
    // Test project stats
    console.log('\n7. Testing project stats...');
    const stats = await projectInfo.codeIndexer.getStats();
    console.log(`   Components: ${stats.componentCount}`);
    console.log(`   Tasks: ${stats.taskCount}`);
    console.log(`   Notes: ${stats.noteCount}`);
    console.log(`   Rules: ${stats.ruleCount}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

testMCP().then(() => {
  console.log('\nMCP test complete.');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});