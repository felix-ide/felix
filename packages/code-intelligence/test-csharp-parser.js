#!/usr/bin/env node

/**
 * Test script for C# parsing capabilities
 */

import { ParserFactory } from './dist/code-parser/ParserFactory.js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function testCSharpParsing() {
  console.log('🔍 Testing C# Parser Support\n');
  console.log('═'.repeat(50));

  const factory = new ParserFactory();

  // Check what parsers are available for C#
  console.log('\n📋 Checking available C# parsers...');
  const parser = factory.getParser('csharp');

  if (!parser) {
    console.error('❌ No C# parser available!');
    return;
  }

  console.log(`✅ Found C# parser: ${parser.constructor.name}`);
  console.log(`   Language: ${parser.language}`);
  console.log(`   Extensions: ${parser.supportedExtensions ? parser.supportedExtensions.join(', ') : 'N/A'}`);

  // Test parsing our sample file
  const testFile = './test-csharp-project/Program.cs';
  console.log(`\n📄 Testing file: ${testFile}`);

  try {
    const content = readFileSync(testFile, 'utf8');
    console.log(`   File size: ${content.length} characters`);
    console.log(`   Lines: ${content.split('\n').length}`);

    console.log('\n🔧 Parsing with available backend...');
    const startTime = Date.now();

    const result = await parser.parseFile(testFile, {
      enableSegmentation: true,
      enableInitialLinking: true,
      maxParsingDepth: 10
    });

    const parseTime = Date.now() - startTime;

    console.log(`\n✅ Parsing completed in ${parseTime}ms`);
    console.log('\n📊 Results:');
    console.log(`   Components found: ${result.components.length}`);
    console.log(`   Relationships found: ${result.relationships.length}`);
    console.log(`   Errors: ${result.errors.length}`);
    console.log(`   Warnings: ${result.warnings.length}`);

    // Show metadata
    console.log('\n🔍 Parser Metadata:');
    console.log(`   Backend: ${result.metadata.backend || 'unknown'}`);
    console.log(`   Parsing level: ${result.metadata.parsingLevel || 'basic'}`);

    // Show component breakdown
    console.log('\n📦 Component Types:');
    const componentTypes = {};
    result.components.forEach(comp => {
      componentTypes[comp.type] = (componentTypes[comp.type] || 0) + 1;
    });

    Object.entries(componentTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Show some sample components
    console.log('\n🏷️  Sample Components (first 10):');
    result.components.slice(0, 10).forEach(comp => {
      console.log(`   - ${comp.type}: ${comp.name} (lines ${comp.location.startLine}-${comp.location.endLine})`);
    });

    // Show relationship types
    if (result.relationships.length > 0) {
      console.log('\n🔗 Relationship Types:');
      const relationshipTypes = {};
      result.relationships.forEach(rel => {
        relationshipTypes[rel.type] = (relationshipTypes[rel.type] || 0) + 1;
      });

      Object.entries(relationshipTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    }

    // Check for specific C# features
    console.log('\n🎯 C# Feature Detection:');
    const features = {
      'Classes': result.components.filter(c => c.type === 'class').length,
      'Interfaces': result.components.filter(c => c.type === 'interface').length,
      'Methods': result.components.filter(c => c.type === 'method' || c.type === 'function').length,
      'Properties': result.components.filter(c => c.type === 'property').length,
      'Async Methods': result.components.filter(c => c.name && c.name.includes('Async')).length,
      'Generic Types': result.components.filter(c => c.metadata?.typeParameters).length,
      'Events': result.components.filter(c => c.type === 'event').length,
      'Enums': result.components.filter(c => c.type === 'enum').length,
      'Records': result.components.filter(c => c.type === 'record').length,
      'Structs': result.components.filter(c => c.type === 'struct').length,
    };

    Object.entries(features).forEach(([feature, count]) => {
      const status = count > 0 ? '✅' : '❌';
      console.log(`   ${status} ${feature}: ${count}`);
    });

    // Test capabilities
    console.log('\n🚀 Parser Capabilities:');
    const capabilities = parser.getCapabilities ? parser.getCapabilities() : {};
    Object.entries(capabilities).forEach(([cap, enabled]) => {
      const status = enabled ? '✅' : '❌';
      console.log(`   ${status} ${cap}`);
    });

  } catch (error) {
    console.error('❌ Error parsing file:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '═'.repeat(50));
  console.log('✨ Test completed!');
}

// Run the test
testCSharpParsing().catch(console.error);