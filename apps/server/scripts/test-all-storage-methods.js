#!/usr/bin/env node

/**
 * Comprehensive test for ALL storage adapter methods
 */

import { StorageFactory } from '../dist/storage/StorageFactory.js';

async function testAllMethods() {
  console.log('🧪 Testing ALL Storage Adapter Methods\n');
  
  const adapter = await StorageFactory.create();
  let allPassed = true;
  
  const testResults = [];
  
  async function testMethod(name, testFn) {
    try {
      await testFn();
      testResults.push({ method: name, status: '✅', error: null });
      console.log(`✅ ${name}`);
    } catch (error) {
      testResults.push({ method: name, status: '❌', error: error.message });
      console.log(`❌ ${name}: ${error.message}`);
      allPassed = false;
    }
  }
  
  // Test component operations
  await testMethod('storeComponent', async () => {
    const component = {
      id: 'test-comp-1',
      name: 'TestComponent',
      type: 'function',
      language: 'javascript',
      filePath: '/test/file.js',
      location: { startLine: 1, endLine: 10 },
      code: 'function test() {}'
    };
    const result = await adapter.storeComponent(component);
    if (!result.success) throw new Error('Failed to store component');
  });
  
  await testMethod('getComponent', async () => {
    const comp = await adapter.getComponent('test-comp-1');
    if (!comp) throw new Error('Component not found');
  });
  
  await testMethod('updateComponent', async () => {
    const comp = await adapter.getComponent('test-comp-1');
    comp.name = 'UpdatedComponent';
    const result = await adapter.updateComponent(comp);
    if (!result.success) throw new Error('Failed to update');
  });
  
  await testMethod('searchComponents', async () => {
    const result = await adapter.searchComponents({ name: 'Test' });
    if (!result.items) throw new Error('No search results');
  });
  
  await testMethod('getComponentsInFile', async () => {
    const components = await adapter.getComponentsInFile('/test/file.js');
    if (!Array.isArray(components)) throw new Error('Invalid result');
  });
  
  // Test relationship operations
  await testMethod('storeRelationship', async () => {
    const rel = {
      id: 'test-rel-1',
      type: 'imports',
      sourceId: 'test-comp-1',
      targetId: 'test-comp-2'
    };
    const result = await adapter.storeRelationship(rel);
    if (!result.success) throw new Error('Failed to store relationship');
  });
  
  await testMethod('getRelationship', async () => {
    const rel = await adapter.getRelationship('test-rel-1');
    if (!rel) throw new Error('Relationship not found');
  });
  
  await testMethod('getRelationshipsForComponent', async () => {
    const rels = await adapter.getRelationshipsForComponent('test-comp-1');
    if (!Array.isArray(rels)) throw new Error('Invalid result');
  });
  
  await testMethod('getRelationshipsBetween', async () => {
    const rels = await adapter.getRelationshipsBetween('test-comp-1', 'test-comp-2');
    if (!Array.isArray(rels)) throw new Error('Invalid result');
  });
  
  // Test metadata operations
  await testMethod('searchTasksSummary', async () => {
    const result = await adapter.searchTasksSummary({ limit: 10 });
    if (!result.items) throw new Error('No search results');
  });
  
  await testMethod('getTaskTreeSummary', async () => {
    const tree = await adapter.getTaskTreeSummary();
    if (!Array.isArray(tree)) throw new Error('Invalid result');
  });
  
  // Test utility operations
  await testMethod('getComponentCountByType', async () => {
    const counts = await adapter.getComponentCountByType();
    if (typeof counts !== 'object') throw new Error('Invalid result');
  });
  
  await testMethod('getRelationshipCountByType', async () => {
    const counts = await adapter.getRelationshipCountByType();
    if (typeof counts !== 'object') throw new Error('Invalid result');
  });
  
  await testMethod('getIndexedFiles', async () => {
    const files = await adapter.getIndexedFiles();
    if (!Array.isArray(files)) throw new Error('Invalid result');
  });
  
  await testMethod('isFileIndexed', async () => {
    const indexed = await adapter.isFileIndexed('/test/file.js');
    if (typeof indexed !== 'boolean') throw new Error('Invalid result');
  });
  
  await testMethod('getStats', async () => {
    const stats = await adapter.getStats();
    if (!stats.componentCount !== undefined) throw new Error('Invalid stats');
  });
  
  await testMethod('updateLastUpdatedTimestamp', async () => {
    await adapter.updateLastUpdatedTimestamp();
    // Should not throw
  });
  
  await testMethod('validate', async () => {
    const result = await adapter.validate();
    if (result.isValid === undefined) throw new Error('Invalid validation result');
  });
  
  await testMethod('optimize', async () => {
    const result = await adapter.optimize();
    if (!result.success !== undefined) throw new Error('Invalid result');
  });
  
  await testMethod('getAdapterType', async () => {
    const type = adapter.getAdapterType();
    if (type !== 'utility-belt-sqlite') throw new Error(`Wrong type: ${type}`);
  });
  
  // Test cleanup operations
  await testMethod('deleteRelationshipsForComponent', async () => {
    const result = await adapter.deleteRelationshipsForComponent('test-comp-1');
    if (!result.success !== undefined) throw new Error('Invalid result');
  });
  
  await testMethod('deleteRelationshipsInFile', async () => {
    const result = await adapter.deleteRelationshipsInFile('/test/file.js');
    if (!result.success !== undefined) throw new Error('Invalid result');
  });
  
  await testMethod('deleteComponentsInFile', async () => {
    const result = await adapter.deleteComponentsInFile('/test/file.js');
    if (!result.success !== undefined) throw new Error('Invalid result');
  });
  
  await testMethod('deleteComponent', async () => {
    const result = await adapter.deleteComponent('test-comp-1');
    if (!result.success !== undefined) throw new Error('Invalid result');
  });
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`Total methods tested: ${testResults.length}`);
  console.log(`Passed: ${testResults.filter(r => r.status === '✅').length}`);
  console.log(`Failed: ${testResults.filter(r => r.status === '❌').length}`);
  
  if (!allPassed) {
    console.log('\n❌ Failed tests:');
    testResults.filter(r => r.status === '❌').forEach(r => {
      console.log(`  - ${r.method}: ${r.error}`);
    });
  }
  
  await adapter.close();
  
  if (allPassed) {
    console.log('\n🎉 All storage adapter methods working correctly!');
  } else {
    console.log('\n⚠️  Some methods failed - review and fix!');
    process.exit(1);
  }
}

testAllMethods().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});