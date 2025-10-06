#!/usr/bin/env node

import { ParserFactory } from '../dist/code-parser/ParserFactory.js';

async function testParsers() {
  console.log('Testing all Tree-sitter parsers...\n');

  const factory = new ParserFactory();
  const testCases = [
    {
      language: 'javascript',
      content: 'const hello = () => { console.log("Hello"); }',
      file: 'test.js'
    },
    {
      language: 'python',
      content: 'def hello():\n    print("Hello")',
      file: 'test.py'
    },
    {
      language: 'php',
      content: '<?php\nfunction hello() {\n    echo "Hello";\n}',
      file: 'test.php'
    },
    {
      language: 'java',
      content: 'public class Hello {\n    public static void main(String[] args) {\n        System.out.println("Hello");\n    }\n}',
      file: 'test.java'
    },
    {
      language: 'html',
      content: '<html><body><h1>Hello</h1></body></html>',
      file: 'test.html'
    },
    {
      language: 'css',
      content: '.hello { color: red; }',
      file: 'test.css'
    }
  ];

  for (const test of testCases) {
    console.log(`Testing ${test.language}...`);

    try {
      const parser = factory.getParser(test.language);
      if (!parser) {
        console.error(`  ❌ No parser found for ${test.language}`);
        continue;
      }

      const result = await parser.parseContent(test.content, test.file);

      if (result.components && result.components.length > 0) {
        console.log(`  ✅ Parser found ${result.components.length} components`);
        console.log(`     Parser type: ${parser.constructor.name}`);
      } else {
        console.log(`  ⚠️  Parser found no components (might be normal for simple content)`);
      }
    } catch (error) {
      console.error(`  ❌ Error parsing ${test.language}: ${error.message}`);
    }
  }

  console.log('\nAll parsers tested!');
}

testParsers().catch(console.error);