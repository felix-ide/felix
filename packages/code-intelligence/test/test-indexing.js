#!/usr/bin/env node

import { ParserFactory } from '../dist/code-parser/ParserFactory.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = './test-index';

async function createTestProject() {
  // Clean and create test directory
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {}
  mkdirSync(TEST_DIR, { recursive: true });

  // Create a small test project
  const files = {
    'UserService.js': `
import { BaseService } from './BaseService.js';
import { UserRepository } from './UserRepository.js';

export class UserService extends BaseService {
  constructor(repository) {
    super();
    this.repository = repository;
  }

  async getUser(id) {
    const user = await this.repository.findById(id);
    return this.transformUser(user);
  }

  transformUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email
    };
  }
}`,
    'UserRepository.js': `
import { Database } from './Database.js';

export class UserRepository {
  constructor(db) {
    this.db = db;
  }

  async findById(id) {
    return await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }

  async findByEmail(email) {
    return await this.db.query('SELECT * FROM users WHERE email = ?', [email]);
  }
}`,
    'BaseService.js': `
export class BaseService {
  constructor() {
    this.logger = console;
  }

  log(message) {
    this.logger.log(message);
  }
}`,
    'Database.js': `
export class Database {
  async query(sql, params) {
    // Mock database query
    console.log('Executing:', sql, params);
    return { id: 1, name: 'Test User', email: 'test@example.com' };
  }
}`
  };

  // Write files
  for (const [filename, content] of Object.entries(files)) {
    writeFileSync(join(TEST_DIR, filename), content);
  }

  return Object.keys(files).map(f => join(TEST_DIR, f));
}

async function testIndexing() {
  console.log('🔍 Testing Indexing and Relationships\n');
  console.log('=' .repeat(60));

  const factory = new ParserFactory();
  const files = await createTestProject();

  let totalComponents = 0;
  let totalRelationships = 0;
  const allComponents = [];
  const allRelationships = [];

  // Parse each file
  for (const filePath of files) {
    console.log(`\n📄 Parsing ${filePath}:`);

    // Test with parseFile (direct)
    const directResult = await factory.parseFile(filePath);
    console.log(`  Direct parse:`);
    console.log(`    Components: ${directResult.components.length}`);
    console.log(`    Relationships: ${directResult.relationships.length}`);

    // Test with parseDocument (full pipeline)
    const docResult = await factory.parseDocument(filePath);
    console.log(`  Document parse:`);
    console.log(`    Components: ${docResult.components.length}`);
    console.log(`    Relationships: ${docResult.relationships.length}`);
    console.log(`    Aggregated relationships: ${docResult.relationships.length}`);
    console.log(`    Parsing level: ${docResult.metadata.parsingLevel}`);
    console.log(`    Backend: ${docResult.metadata.backend}`);

    // Collect data
    totalComponents += docResult.components.length;
    totalRelationships += docResult.relationships.length;
    allComponents.push(...docResult.components);
    allRelationships.push(...docResult.relationships);

    // Show component details
    console.log(`  Components found:`);
    docResult.components.forEach(comp => {
      console.log(`    - ${comp.type}: ${comp.name} (L${comp.location.startLine})`);
    });

    // Show relationships
    if (docResult.relationships.length > 0) {
      console.log(`  Relationships found:`);
      docResult.relationships.slice(0, 5).forEach(rel => {
        console.log(`    - ${rel.type}: ${rel.sourceId} → ${rel.targetId}`);
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`  Total files: ${files.length}`);
  console.log(`  Total components: ${totalComponents}`);
  console.log(`  Total relationships: ${totalRelationships}`);

  // Check for specific expected relationships
  console.log('\n🔎 Checking for expected relationships:');

  // Should have import relationships
  const importRels = allRelationships.filter(r => r.type === 'imports');
  console.log(`  Import relationships: ${importRels.length} ${importRels.length > 0 ? '✅' : '❌ MISSING!'}`);

  // Should have extends relationships (UserService extends BaseService)
  const extendsRels = allRelationships.filter(r => r.type === 'extends');
  console.log(`  Extends relationships: ${extendsRels.length} ${extendsRels.length > 0 ? '✅' : '❌ MISSING!'}`);

  // Should have calls relationships
  const callsRels = allRelationships.filter(r => r.type === 'calls');
  console.log(`  Calls relationships: ${callsRels.length} ${callsRels.length > 0 ? '✅' : '❌ MISSING!'}`);

  // Check component names are indexed
  console.log('\n🔎 Checking component indexing:');
  const componentNames = allComponents.map(c => c.name);
  const expectedNames = ['UserService', 'UserRepository', 'BaseService', 'Database', 'getUser', 'findById'];

  expectedNames.forEach(name => {
    const found = componentNames.includes(name);
    console.log(`  ${name}: ${found ? '✅' : '❌ MISSING!'}`);
  });

  // Check if code content is being preserved
  console.log('\n🔎 Checking code content:');
  const hasCode = allComponents.filter(c => c.code && c.code.length > 0);
  console.log(`  Components with code: ${hasCode.length}/${allComponents.length} ${hasCode.length === allComponents.length ? '✅' : '⚠️'}`);

  // Clean up
  console.log('\n🧹 Cleaning up...');
  rmSync(TEST_DIR, { recursive: true, force: true });

  // Final verdict
  console.log('\n' + '='.repeat(60));
  if (totalRelationships === 0) {
    console.log('❌ CRITICAL: No relationships found! Indexing is broken!');
  } else if (totalRelationships < 5) {
    console.log('⚠️  WARNING: Very few relationships found. Parsing may be incomplete.');
  } else {
    console.log('✅ Indexing appears to be working.');
  }
}

testIndexing().catch(console.error);