#!/usr/bin/env node

import { ParserFactory } from '../dist/code-parser/ParserFactory.js';
import { writeFileSync } from 'fs';

const factory = new ParserFactory();

const jsCode = `
import { BaseService } from './BaseService.js';
import { UserRepository } from './UserRepository.js';

export class UserService extends BaseService {
  constructor(repository) {
    super();
    this.repository = repository;
  }
}`;

writeFileSync('test.js', jsCode);

// Test direct parse
console.log('=== Direct Parse ===');
const directResult = await factory.parseFile('test.js', jsCode);
console.log('Total relationships:', directResult.relationships.length);
directResult.relationships.forEach(r => {
  console.log(`  ${r.type}: ${r.targetId}`);
});

// Test document parse (full pipeline)
console.log('\n=== Document Parse ===');
const docResult = await factory.parseDocument('test.js', jsCode);
console.log('Total relationships:', docResult.relationships.length);
docResult.relationships.forEach(r => {
  console.log(`  ${r.type}: ${r.targetId || r.targetFile}`);
});

// Check the aggregated relationships
console.log('\n=== Relationship Types in Document Parse ===');
const types = [...new Set(docResult.relationships.map(r => r.type))];
types.forEach(t => {
  const count = docResult.relationships.filter(r => r.type === t).length;
  console.log(`  "${t}": ${count}`);
});

import { unlinkSync as unlink } from 'fs';
unlink('test.js');