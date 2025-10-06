import { TreeSitterCSharpParser } from './dist/code-parser/parsers/tree-sitter/TreeSitterCSharpParser.js';
import { readFileSync } from 'fs';

async function quickTest() {
  console.log('Quick C# Parser Test');

  const parser = new TreeSitterCSharpParser();
  console.log('Parser created:', parser.constructor.name);

  const code = `
public class HelloWorld {
    public static void Main() {
        Console.WriteLine("Hello World!");
    }
}`;

  console.log('Parsing simple C# code...');
  try {
    const result = await parser.parseContent(code, 'test.cs');
    console.log('Parse result:', {
      components: result.components.length,
      relationships: result.relationships.length,
      errors: result.errors.length
    });

    console.log('\nComponents found:');
    result.components.forEach(c => {
      console.log(`  ${c.type}: ${c.name}`);
    });
  } catch (error) {
    console.error('Parse error:', error.message);
  }
}

quickTest().catch(console.error);