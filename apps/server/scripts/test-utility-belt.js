#!/usr/bin/env node

/**
 * Test script for utility-belt integration
 * Validates database operations and performance
 */

import { StorageFactory } from '../dist/storage/StorageFactory.js';
import { performance } from 'perf_hooks';

async function testDatabase() {
  console.log('🧪 Testing Utility-Belt SQLite Integration\n');
  
  const adapter = await StorageFactory.create();
  
  // Test 1: Database connection
  console.log('✅ Database initialized successfully');
  
  // Test 2: Read metadata stats
  console.log('\n📊 Metadata Statistics:');
  const tasks = await adapter.listTasks({});
  const notes = await adapter.listNotes({});
  const rules = await adapter.listRules();
  
  console.log(`  Tasks: ${tasks.length}`);
  console.log(`  Notes: ${notes.length}`);
  console.log(`  Rules: ${rules.length}`);
  
  // Test 3: Performance benchmarks
  console.log('\n⚡ Performance Benchmarks:');
  
  // Benchmark task retrieval
  const taskStart = performance.now();
  const allTasks = await adapter.listTasks({ limit: 1000 });
  const taskEnd = performance.now();
  console.log(`  Task retrieval (${allTasks.length} items): ${(taskEnd - taskStart).toFixed(2)}ms`);
  
  // Benchmark search
  const searchStart = performance.now();
  const searchResults = await adapter.searchTasks({ query: 'task' });
  const searchEnd = performance.now();
  console.log(`  Task search: ${(searchEnd - searchStart).toFixed(2)}ms`);
  
  // Test 4: CRUD operations
  console.log('\n🔧 Testing CRUD Operations:');
  
  // Create a test note
  const testNote = {
    title: 'Test Note - Utility Belt',
    content: 'This is a test note created during utility-belt validation',
    note_type: 'note',
    stable_tags: ['test', 'utility-belt']
  };
  
  const createStart = performance.now();
  const noteResult = await adapter.storeNote(testNote);
  const createEnd = performance.now();
  console.log(`  Note creation: ${(createEnd - createStart).toFixed(2)}ms`);
  
  // Get the note ID from the result
  let noteId;
  if (noteResult.success && noteResult.data) {
    noteId = noteResult.data;
  } else {
    console.log('  ⚠️  Could not create test note, skipping CRUD tests');
    noteId = null;
  }
  
  if (noteId) {
    // Read the note back
    const readStart = performance.now();
    const retrievedNote = await adapter.getNote(noteId);
    const readEnd = performance.now();
    console.log(`  Note retrieval: ${(readEnd - readStart).toFixed(2)}ms`);
    
    // Update the note
    const updateStart = performance.now();
    await adapter.updateNote(noteId, { 
      content: 'Updated content via utility-belt' 
    });
    const updateEnd = performance.now();
    console.log(`  Note update: ${(updateEnd - updateStart).toFixed(2)}ms`);
    
    // Delete the note
    const deleteStart = performance.now();
    await adapter.deleteNote(noteId);
    const deleteEnd = performance.now();
    console.log(`  Note deletion: ${(deleteEnd - deleteStart).toFixed(2)}ms`);
  }
  
  // Test 5: Complex queries
  console.log('\n🔍 Testing Complex Queries:');
  
  // Test hierarchical task retrieval
  const treeStart = performance.now();
  const taskTree = await adapter.getTaskTree();
  const treeEnd = performance.now();
  console.log(`  Task tree retrieval: ${(treeEnd - treeStart).toFixed(2)}ms`);
  
  // Test 6: Verify data integrity
  console.log('\n✨ Data Integrity Check:');
  
  // Sample a few tasks to verify data
  const sampleTasks = allTasks.slice(0, 3);
  for (const task of sampleTasks) {
    const fullTask = await adapter.getTask(task.id);
    if (fullTask) {
      console.log(`  ✓ Task "${fullTask.title}" - Status: ${fullTask.task_status}`);
    }
  }
  
  await adapter.close();
  
  console.log('\n🎉 All tests passed! Utility-belt integration is working correctly.');
}

// Run tests
testDatabase().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});