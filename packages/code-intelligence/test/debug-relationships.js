#!/usr/bin/env node

import { TreeSitterJavaScriptParser } from '../dist/code-parser/parsers/tree-sitter/TreeSitterJavaScriptParser.js';

const parser = new TreeSitterJavaScriptParser();
const code = `
import { BaseService } from './BaseService.js';
import { UserRepository } from './UserRepository.js';

export class UserService extends BaseService {
  constructor(repository) {
    super();
    this.repository = repository;
  }

  async getUser(id) {
    const user = await this.repository.findById(id);
    return user;
  }
}`;

const result = await parser.parseContent(code, 'test.js');

console.log('=== All Relationships ===');
result.relationships.forEach(r => {
  console.log(`Type: "${r.type}" | Source: ${r.sourceId} | Target: ${r.targetId}`);
});

console.log('\n=== Relationship Types ===');
const types = [...new Set(result.relationships.map(r => r.type))];
types.forEach(t => {
  const count = result.relationships.filter(r => r.type === t).length;
  console.log(`"${t}": ${count}`);
});

// Check the actual enum values
import { RelationshipType } from '../dist/code-parser/types.js';
console.log('\n=== RelationshipType enum values ===');
Object.entries(RelationshipType).forEach(([key, value]) => {
  console.log(`${key}: "${value}"`);
});