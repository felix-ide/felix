#!/usr/bin/env node

import { ParserFactory } from '../dist/code-parser/ParserFactory.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const factory = new ParserFactory();
const testDir = './test-project';

// Create test project structure
mkdirSync(testDir, { recursive: true });

// Test file 1: Base class with imports
const baseServiceCode = `
import { Logger } from './Logger.js';
import { Config } from '../config/Config.js';

export class BaseService {
  constructor() {
    this.logger = new Logger();
    this.config = new Config();
  }

  log(message) {
    this.logger.info(message);
  }
}`;

writeFileSync(join(testDir, 'BaseService.js'), baseServiceCode);

// Test file 2: Derived class with more imports
const userServiceCode = `
import { BaseService } from './BaseService.js';
import { UserRepository } from './UserRepository.js';
import { ValidationError } from '../errors/ValidationError.js';

export class UserService extends BaseService {
  constructor(repository) {
    super();
    this.repository = repository;
  }

  async getUser(id) {
    if (!id) {
      throw new ValidationError('User ID required');
    }
    const user = await this.repository.findById(id);
    this.log(\`Retrieved user: \${user.name}\`);
    return user;
  }

  async createUser(data) {
    const user = await this.repository.create(data);
    this.log(\`Created user: \${user.id}\`);
    return user;
  }
}`;

writeFileSync(join(testDir, 'UserService.js'), userServiceCode);

// Test file 3: Repository with interface implementation
const userRepositoryCode = `
import { BaseRepository } from './BaseRepository.js';
import { DatabaseConnection } from '../db/DatabaseConnection.js';

export class UserRepository extends BaseRepository {
  constructor() {
    super('users');
    this.db = new DatabaseConnection();
  }

  async findById(id) {
    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }

  async create(data) {
    return this.db.insert('users', data);
  }

  async update(id, data) {
    return this.db.update('users', { id }, data);
  }
}`;

writeFileSync(join(testDir, 'UserRepository.js'), userRepositoryCode);

// Now test the full pipeline
console.log('=== Testing Full Indexing Pipeline ===\n');

const files = ['BaseService.js', 'UserService.js', 'UserRepository.js'];
const results = {};
let totalComponents = 0;
let totalRelationships = 0;

for (const file of files) {
  const filePath = join(testDir, file);
  console.log(`\nParsing ${file}...`);

  try {
    const result = await factory.parseDocument(filePath);
    results[file] = result;

    console.log(`  Components: ${result.components.length}`);
    result.components.forEach(c => {
      console.log(`    - ${c.type}: ${c.name}`);
    });

    console.log(`  Relationships: ${result.relationships.length}`);
    const relationshipTypes = {};
    result.relationships.forEach(r => {
      const type = r.type;
      relationshipTypes[type] = (relationshipTypes[type] || 0) + 1;
    });

    for (const [type, count] of Object.entries(relationshipTypes)) {
      console.log(`    - ${type}: ${count}`);
    }

    totalComponents += result.components.length;
    totalRelationships += result.relationships.length;

  } catch (error) {
    console.error(`  ERROR: ${error.message}`);
  }
}

console.log('\n=== Summary ===');
console.log(`Total files processed: ${files.length}`);
console.log(`Total components found: ${totalComponents}`);
console.log(`Total relationships found: ${totalRelationships}`);

// Cross-file relationship analysis
console.log('\n=== Cross-File Relationships ===');
const allRelationships = [];
for (const [file, result] of Object.entries(results)) {
  result.relationships.forEach(r => {
    allRelationships.push({
      source: file,
      ...r
    });
  });
}

const imports = allRelationships.filter(r => r.type === 'imports');
const extends_ = allRelationships.filter(r => r.type === 'extends');
const calls = allRelationships.filter(r => r.type === 'calls');

console.log(`Total imports: ${imports.length}`);
console.log(`Total extends: ${extends_.length}`);
console.log(`Total calls: ${calls.length}`);

// Verify expected relationships
console.log('\n=== Verification ===');
const expectations = {
  'BaseService.js': {
    imports: 2,  // Logger, Config
    components: 2 // class and constructor
  },
  'UserService.js': {
    imports: 3,  // BaseService, UserRepository, ValidationError
    extends: 1,  // extends BaseService
    components: 4 // class, constructor, getUser, createUser
  },
  'UserRepository.js': {
    imports: 2,  // BaseRepository, DatabaseConnection
    extends: 1,  // extends BaseRepository
    components: 5 // class, constructor, findById, create, update
  }
};

let passed = 0;
let failed = 0;

for (const [file, expected] of Object.entries(expectations)) {
  const result = results[file];
  const relationshipTypes = {};
  result.relationships.forEach(r => {
    relationshipTypes[r.type] = (relationshipTypes[r.type] || 0) + 1;
  });

  for (const [type, count] of Object.entries(expected)) {
    if (type === 'components') {
      if (result.components.length >= count) {
        console.log(`✓ ${file}: ${type} count (${result.components.length} >= ${count})`);
        passed++;
      } else {
        console.log(`✗ ${file}: ${type} count (expected >= ${count}, got ${result.components.length})`);
        failed++;
      }
    } else {
      const actual = relationshipTypes[type] || 0;
      if (actual === count) {
        console.log(`✓ ${file}: ${type} relationships (${actual})`);
        passed++;
      } else {
        console.log(`✗ ${file}: ${type} relationships (expected ${count}, got ${actual})`);
        failed++;
      }
    }
  }
}

console.log(`\nTests: ${passed} passed, ${failed} failed`);

// Clean up
rmSync(testDir, { recursive: true, force: true });

process.exit(failed > 0 ? 1 : 0);