#!/usr/bin/env node

import { ParserFactory } from '../dist/code-parser/ParserFactory.js';
import { writeFileSync } from 'fs';

async function testMetadata() {
  console.log('🧪 Testing Parser Metadata\n');
  console.log('=' .repeat(60));

  const factory = new ParserFactory();

  // Test Python with parseDocument
  const pythonCode = `
class Calculator:
    def add(self, a, b):
        return a + b
`;

  writeFileSync('test.py', pythonCode);

  console.log('\n📋 Python with parseDocument:');
  const pythonResult = await factory.parseDocument('test.py', pythonCode);

  console.log(`  Parsing level: ${pythonResult.metadata.parsingLevel}`);
  console.log(`  Backend: ${pythonResult.metadata.backend}`);

  if (pythonResult.components.length > 0) {
    const comp = pythonResult.components[0];
    console.log(`  First component metadata:`);
    console.log(`    - parsingLevel: ${comp.metadata?.parsingLevel}`);
    console.log(`    - backend: ${comp.metadata?.backend}`);
    console.log(`    - capabilities: ${JSON.stringify(comp.metadata?.capabilities)}`);
  }

  // Test PHP with parseDocument
  const phpCode = `<?php
class UserService {
    public function getUser($id) {
        return $this->db->find($id);
    }
}`;

  writeFileSync('test.php', phpCode);

  console.log('\n📋 PHP with parseDocument:');
  const phpResult = await factory.parseDocument('test.php', phpCode);

  console.log(`  Parsing level: ${phpResult.metadata.parsingLevel}`);
  console.log(`  Backend: ${phpResult.metadata.backend}`);

  if (phpResult.components.length > 0) {
    const comp = phpResult.components[0];
    console.log(`  First component metadata:`);
    console.log(`    - parsingLevel: ${comp.metadata?.parsingLevel}`);
    console.log(`    - backend: ${comp.metadata?.backend}`);
    console.log(`    - capabilities: ${JSON.stringify(comp.metadata?.capabilities)}`);
  }

  // Test Java with parseDocument
  const javaCode = `
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
}`;

  writeFileSync('test.java', javaCode);

  console.log('\n📋 Java with parseDocument:');
  const javaResult = await factory.parseDocument('test.java', javaCode);

  console.log(`  Parsing level: ${javaResult.metadata.parsingLevel}`);
  console.log(`  Backend: ${javaResult.metadata.backend}`);

  if (javaResult.components.length > 0) {
    const comp = javaResult.components[0];
    console.log(`  First component metadata:`);
    console.log(`    - parsingLevel: ${comp.metadata?.parsingLevel}`);
    console.log(`    - backend: ${comp.metadata?.backend}`);
    console.log(`    - capabilities: ${JSON.stringify(comp.metadata?.capabilities)}`);
  }

  // Clean up
  require('fs').unlinkSync('test.py');
  require('fs').unlinkSync('test.php');
  require('fs').unlinkSync('test.java');

  console.log('\n✅ Metadata test complete!');
}

testMetadata().catch(console.error);