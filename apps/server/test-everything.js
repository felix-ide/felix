#!/usr/bin/env node

/**
 * MANUAL TEST SCRIPT - Test EVERYTHING to find what's broken
 * Run with: node test-everything.js
 */

import { DatabaseManager } from './dist/features/storage/DatabaseManager.js';
import { CodeIndexer } from './dist/features/indexing/api/CodeIndexer.js';
import { ComponentSearchService } from './dist/features/search/services/ComponentSearchService.js';
import { TaskManagementService } from './dist/features/metadata/services/TaskManagementService.js';
import { NoteManagementService } from './dist/features/metadata/services/NoteManagementService.js';
import { RuleManagementService } from './dist/features/metadata/services/RuleManagementService.js';
import { EmbeddingService } from './dist/nlp/EmbeddingServiceAdapter.js';
import path from 'path';
import fs from 'fs';

const PROJECT_PATH = '/Users/epoplive/aigent-smith-clean/felix';

console.log('='.repeat(80));
console.log('COMPREHENSIVE FUNCTIONALITY TEST - FINDING WHAT\'S BROKEN');
console.log('='.repeat(80));

async function testDatabaseConnection() {
  console.log('\n📊 TESTING DATABASE CONNECTION...');
  try {
    const dbManager = DatabaseManager.getInstance(PROJECT_PATH);
    await dbManager.initialize();
    console.log('✅ Database Manager initialized');
    
    // Check if databases exist
    const indexDbPath = path.join(PROJECT_PATH, '.felix.index.db');
    const metadataDbPath = path.join(PROJECT_PATH, '.felix.metadata.db');
    
    console.log(`Index DB exists: ${fs.existsSync(indexDbPath)}`);
    console.log(`Metadata DB exists: ${fs.existsSync(metadataDbPath)}`);
    
    // Try to get counts from each table
    const componentRepo = dbManager.getComponentRepository();
    const tasksRepo = dbManager.getTasksRepository();
    const notesRepo = dbManager.getNotesRepository();
    
    console.log('\n📈 Checking data counts:');
    
    // Test component count
    try {
      const components = await componentRepo.searchComponents({});
      console.log(`Components in DB: ${components.items.length}`);
    } catch (e) {
      console.error(`❌ Failed to count components: ${e.message}`);
    }
    
    // Test task count
    try {
      const tasks = await tasksRepo.listTasks({});
      console.log(`Tasks in DB: ${tasks.items.length}`);
    } catch (e) {
      console.error(`❌ Failed to count tasks: ${e.message}`);
    }
    
    // Test note count
    try {
      const notes = await notesRepo.listNotes({});
      console.log(`Notes in DB: ${notes.items.length}`);
    } catch (e) {
      console.error(`❌ Failed to count notes: ${e.message}`);
    }
    
    return dbManager;
  } catch (error) {
    console.error(`❌ Database connection failed: ${error.message}`);
    console.error(error.stack);
    return null;
  }
}

async function testCodeIndexer(dbManager) {
  console.log('\n🔍 TESTING CODE INDEXER...');
  try {
    const embeddingService = new EmbeddingService();
    await embeddingService.initialize();
    
    const codeIndexer = new CodeIndexer(dbManager, embeddingService);
    console.log('✅ CodeIndexer created');
    
    // Test basic search
    console.log('\n🔎 Testing search functionality:');
    
    // Test semantic search
    try {
      const searchResults = await codeIndexer.searchSemanticUniversal('test', {
        entityTypes: ['component', 'task', 'note', 'rule'],
        limit: 5
      });
      console.log(`Semantic search returned: ${searchResults.results.length} results`);
      if (searchResults.results.length > 0) {
        console.log('First result:', searchResults.results[0].entity.name || searchResults.results[0].entity.title);
      }
    } catch (e) {
      console.error(`❌ Semantic search failed: ${e.message}`);
    }
    
    // Test component search
    try {
      const components = await codeIndexer.searchComponents({ query: 'index', limit: 5 });
      console.log(`Component search returned: ${components.items.length} results`);
    } catch (e) {
      console.error(`❌ Component search failed: ${e.message}`);
    }
    
    // Test getting a specific task
    try {
      const taskId = 'task_1756566093304_o4ybuc4kk';
      const task = await codeIndexer.getTask(taskId);
      if (task) {
        console.log(`✅ Retrieved task: ${task.title}`);
      } else {
        console.log(`❌ Could not retrieve task ${taskId}`);
      }
    } catch (e) {
      console.error(`❌ Task retrieval failed: ${e.message}`);
    }
    
    // Test getting task dependencies
    try {
      const deps = await codeIndexer.getTaskDependencies('task_1756566093304_o4ybuc4kk');
      console.log(`Task dependencies: ${deps.length}`);
    } catch (e) {
      console.error(`❌ Task dependencies failed: ${e.message}`);
    }
    
    return codeIndexer;
  } catch (error) {
    console.error(`❌ CodeIndexer test failed: ${error.message}`);
    console.error(error.stack);
    return null;
  }
}

async function testIndexingNewFile(codeIndexer) {
  console.log('\n📝 TESTING FILE INDEXING...');
  try {
    // Create a test file
    const testFilePath = path.join(PROJECT_PATH, 'test-indexing.js');
    const testContent = `
// Test file for indexing
class TestClass {
  constructor() {
    this.name = 'test';
  }
  
  testMethod() {
    return 'hello world';
  }
}

function testFunction() {
  const x = 42;
  return x * 2;
}

module.exports = { TestClass, testFunction };
`;
    
    fs.writeFileSync(testFilePath, testContent);
    console.log('Created test file:', testFilePath);
    
    // Index the file
    const result = await codeIndexer.indexFile(testFilePath);
    console.log(`Indexing result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    if (result.components) {
      console.log(`Components found: ${result.components.length}`);
      result.components.forEach(c => {
        console.log(`  - ${c.type}: ${c.name}`);
      });
    }
    
    // Search for the new components
    const searchResult = await codeIndexer.searchComponents({ query: 'TestClass' });
    console.log(`Search for TestClass: ${searchResult.items.length} results`);
    
    // Clean up
    fs.unlinkSync(testFilePath);
    
    return result.success;
  } catch (error) {
    console.error(`❌ Indexing test failed: ${error.message}`);
    return false;
  }
}

async function testMCPIntegration() {
  console.log('\n🔌 TESTING MCP INTEGRATION...');
  try {
    const { projectManager } = await import('./dist/mcp/project-manager.js');
    
    // Test project listing
    const projects = projectManager.getProjects();
    console.log(`Projects registered: ${projects.length}`);
    projects.forEach(p => console.log(`  - ${p.name}: ${p.path}`));
    
    // Test setting project
    const project = await projectManager.setProject(PROJECT_PATH);
    console.log(`✅ Project set: ${project.name}`);
    
    // Test project operations
    const projectInfo = await projectManager.getProject('felix');
    if (projectInfo) {
      console.log('✅ Project retrieved successfully');
      
      // Test search through project
      const searchResults = await projectInfo.codeIndexer.searchSemanticUniversal('test');
      console.log(`Search through project: ${searchResults.results.length} results`);
    } else {
      console.log('❌ Could not retrieve project');
    }
    
  } catch (error) {
    console.error(`❌ MCP integration test failed: ${error.message}`);
  }
}

async function runAllTests() {
  try {
    // Test 1: Database Connection
    const dbManager = await testDatabaseConnection();
    if (!dbManager) {
      console.error('\n❌ CRITICAL: Database connection failed. Cannot continue tests.');
      process.exit(1);
    }
    
    // Test 2: CodeIndexer
    const codeIndexer = await testCodeIndexer(dbManager);
    if (!codeIndexer) {
      console.error('\n❌ CRITICAL: CodeIndexer failed. Cannot continue tests.');
      process.exit(1);
    }
    
    // Test 3: File Indexing
    const indexingWorks = await testIndexingNewFile(codeIndexer);
    
    // Test 4: MCP Integration
    await testMCPIntegration();
    
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('Database Connection: ' + (dbManager ? '✅' : '❌'));
    console.log('CodeIndexer: ' + (codeIndexer ? '✅' : '❌'));
    console.log('File Indexing: ' + (indexingWorks ? '✅' : '❌'));
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
console.log('Starting comprehensive tests...\n');
runAllTests().then(() => {
  console.log('\nTests complete.');
  process.exit(0);
}).catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});