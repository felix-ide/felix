#!/usr/bin/env node

import { BlockScanner } from '../dist/code-parser/services/BlockScanner.js';
import { writeFileSync, unlinkSync } from 'fs';

const scanner = BlockScanner.getInstance();

const jsCode = `
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

writeFileSync('test.js', jsCode);

console.log('=== Scanning File for Blocks ===');
const result = await scanner.scanFile('test.js', jsCode);

console.log(`Total blocks: ${result.blocks.length}`);
result.blocks.forEach((block, i) => {
  console.log(`\nBlock ${i + 1}:`);
  console.log(`  Language: ${block.language}`);
  console.log(`  Lines: ${block.startLine}-${block.endLine}`);
  console.log(`  Source: ${block.source}`);
  console.log(`  Metadata:`, block.metadata);
});

unlinkSync('test.js');