import { TreeSitterCSharpParser } from './dist/code-parser/parsers/tree-sitter/TreeSitterCSharpParser.js';

async function test() {
  try {
    const parser = new TreeSitterCSharpParser();
    console.log('Parser created');
    
    const testCode = 'using System; namespace Test { public class TestClass { } }';
    console.log('Testing validation with valid code...');
    
    // Try validateSyntax which was failing
    const errors = await parser.validateSyntax(testCode);
    console.log('Validation errors:', errors);
    
    // Test with invalid code
    const invalidCode = 'using System; namespace Test { public class { } }';
    console.log('\nTesting validation with invalid code...');
    const invalidErrors = await parser.validateSyntax(invalidCode);
    console.log('Invalid code errors:', invalidErrors.length > 0 ? 'Found errors (good!)' : 'No errors (bad)');
    
    // Test parsing
    console.log('\nTesting full parse...');
    const result = await parser.parseContent(testCode, 'test.cs');
    console.log('Parse result:', {
      components: result.components.length,
      relationships: result.relationships.length,
      errors: result.errors.length,
      warnings: result.warnings.length
    });
    
    if (result.components.length > 0) {
      console.log('First component:', result.components[0]);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();
