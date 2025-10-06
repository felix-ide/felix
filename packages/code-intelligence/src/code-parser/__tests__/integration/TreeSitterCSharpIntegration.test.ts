import { ParserFactory } from '../../ParserFactory.js';
import { TreeSitterCSharpParser } from '../../parsers/tree-sitter/TreeSitterCSharpParser.js';

describe('TreeSitter C# Parser Integration', () => {
  let factory: ParserFactory;

  beforeEach(() => {
    factory = new ParserFactory();
  });

  describe('Parser Factory Integration', () => {
    it('should register C# parser in factory', () => {
      const supportedLanguages = factory.getSupportedLanguages();
      expect(supportedLanguages).toContain('csharp');
    });

    it('should detect C# files by extension', () => {
      const detectionResult = factory.detectLanguage('Program.cs');
      expect(detectionResult).not.toBeNull();
      expect(detectionResult?.language).toBe('csharp');
      expect(detectionResult?.parser).toBeInstanceOf(TreeSitterCSharpParser);
      expect(detectionResult?.detectionMethod).toBe('extension');
    });

    it('should detect C# script files', () => {
      const detectionResult = factory.detectLanguage('script.csx');
      expect(detectionResult).not.toBeNull();
      expect(detectionResult?.language).toBe('csharp');
    });

    it('should get C# parser from factory', () => {
      const parser = factory.getParser('csharp');
      expect(parser).toBeInstanceOf(TreeSitterCSharpParser);
    });

    it('should detect C# by file content', () => {
      const csharpContent = `
using System;

namespace MyApp
{
    public class Program
    {
        public static void Main(string[] args)
        {
            Console.WriteLine("Hello World");
        }
    }
}`;

      const detectionResult = factory.detectLanguage('Unknown.txt', csharpContent);
      expect(detectionResult).not.toBeNull();
      expect(detectionResult?.language).toBe('csharp');
      expect(detectionResult?.detectionMethod).toBe('content');
    });

    it('should correctly identify C# content patterns', () => {
      const testCases = [
        {
          content: 'public class MyClass { }',
          shouldDetect: true,
          description: 'simple class'
        },
        {
          content: 'namespace MyNamespace { }',
          shouldDetect: true,
          description: 'namespace declaration'
        },
        {
          content: 'using System.Collections.Generic;',
          shouldDetect: true,
          description: 'using statement'
        },
        {
          content: 'Console.WriteLine("Hello");',
          shouldDetect: true,
          description: 'Console output'
        },
        {
          content: 'public async Task<string> GetDataAsync()',
          shouldDetect: true,
          description: 'async method'
        },
        {
          content: 'var result = items.Where(x => x.IsActive);',
          shouldDetect: true,
          description: 'LINQ expression'
        },
        {
          content: 'string? nullable = null;',
          shouldDetect: true,
          description: 'nullable reference type'
        },
        {
          content: '[HttpGet] public ActionResult Index()',
          shouldDetect: true,
          description: 'attribute usage'
        },
        {
          content: 'public string Name { get; set; }',
          shouldDetect: true,
          description: 'auto property'
        },
        {
          content: 'event Action<string> OnChanged;',
          shouldDetect: true,
          description: 'event declaration'
        },
        {
          content: 'public record Person(string Name);',
          shouldDetect: true,
          description: 'record declaration'
        },
        {
          content: 'function myFunction() { }',  // JavaScript
          shouldDetect: false,
          description: 'JavaScript function'
        },
        {
          content: 'def my_function():',  // Python
          shouldDetect: false,
          description: 'Python function'
        },
        {
          content: 'public class MyClass extends BaseClass',  // Java
          shouldDetect: false,
          description: 'Java class (should prefer Java parser)'
        }
      ];

      for (const testCase of testCases) {
        const detectionResult = factory.detectLanguage('test.txt', testCase.content);

        if (testCase.shouldDetect) {
          expect(detectionResult?.language).toBe('csharp');
        } else {
          expect(detectionResult?.language).not.toBe('csharp');
        }
      }
    });
  });

  describe('Parser Priority and Fallback', () => {
    it('should prefer Tree-sitter parser over legacy parsers', () => {
      const parser = factory.getParserForFile('Program.cs');
      expect(parser).toBeInstanceOf(TreeSitterCSharpParser);
    });

    it('should be included in supported extensions list', () => {
      const supportedExtensions = factory.getSupportedExtensions();
      expect(supportedExtensions).toContain('.cs');
      expect(supportedExtensions).toContain('.csx');
    });

    it('should have correct parser metadata', () => {
      const stats = factory.getStats();
      expect(stats.supportedLanguages).toContain('csharp');
      expect(stats.extensionMappings['.cs']).toBe('csharp');
      expect(stats.extensionMappings['.csx']).toBe('csharp');
    });
  });

  describe('Full Document Parsing', () => {
    it('should parse C# documents through ParserFactory', async () => {
      const csharpContent = `
using System;
using System.Collections.Generic;

namespace MyProject.Services
{
    /// <summary>
    /// Main service class for handling user operations
    /// </summary>
    public class UserService : IUserService
    {
        private readonly IRepository<User> repository;

        public UserService(IRepository<User> repository)
        {
            this.repository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        public async Task<User> GetUserAsync(int id)
        {
            return await repository.GetByIdAsync(id);
        }

        public async Task<List<User>> GetAllUsersAsync()
        {
            var users = await repository.GetAllAsync();
            return users.ToList();
        }
    }

    public interface IUserService
    {
        Task<User> GetUserAsync(int id);
        Task<List<User>> GetAllUsersAsync();
    }
}`;

      const result = await factory.parseDocument('UserService.cs', csharpContent, {
        enableSegmentation: true,
        enableInitialLinking: true,
        enableAggregation: true
      });

      expect(result).toBeDefined();
      expect(result.components.length).toBeGreaterThan(0);
      expect(result.metadata.backend).toContain('tree-sitter');
      expect(result.metadata.parsingLevel).toBe('structural');

      // Check that we found the main components
      const namespaceComponent = result.components.find(c => c.name === 'MyProject.Services');
      expect(namespaceComponent).toBeDefined();

      const classComponent = result.components.find(c => c.name === 'UserService');
      expect(classComponent).toBeDefined();

      const interfaceComponent = result.components.find(c => c.name === 'IUserService');
      expect(interfaceComponent).toBeDefined();
    });

    it('should handle C# parsing errors gracefully', async () => {
      const invalidContent = `
      using System;

      public class InvalidClass
      {
          // Missing closing brace
          public void Method()
          {
              Console.WriteLine("Test");
      `;

      // Should not throw, should handle gracefully
      const result = await factory.parseDocument('Invalid.cs', invalidContent);
      expect(result).toBeDefined();
      expect(result.metadata.warnings).toBeDefined();
    });
  });

  describe('Performance Integration', () => {
    it('should maintain reasonable performance with C# parser', async () => {
      const largeContent = `
using System;
using System.Collections.Generic;
using System.Linq;

namespace PerformanceTest
{
    public class LargeClass
    {
        ${Array.from({length: 50}, (_, i) => `
        public string Property${i} { get; set; }

        public void Method${i}()
        {
            Console.WriteLine("Method ${i}");
        }`).join('\n')}
    }
}`;

      const startTime = Date.now();
      const result = await factory.parseDocument('LargeClass.cs', largeContent);
      const parseTime = Date.now() - startTime;

      expect(parseTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.components.length).toBeGreaterThan(100);
    });
  });
});