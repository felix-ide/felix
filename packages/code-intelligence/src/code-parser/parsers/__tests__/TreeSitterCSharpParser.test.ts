import { TreeSitterCSharpParser } from '../tree-sitter/TreeSitterCSharpParser.js';
// Import component/relationship enums directly to avoid loading package index with ESM-only modules
import { ComponentType, RelationshipType } from '../../../code-analysis-types/entities/core-types.js';

describe('TreeSitterCSharpParser', () => {
  let parser: TreeSitterCSharpParser;

  beforeEach(() => {
    parser = new TreeSitterCSharpParser();
  });

  describe('Basic functionality', () => {
    it('should be created with correct language and extensions', () => {
      expect(parser.language).toBe('csharp');
      expect(parser.getSupportedExtensions()).toEqual(['.cs', '.csx']);
    });

    it('should detect if it can parse supported files', () => {
      expect(parser.canParseFile('Program.cs')).toBe(true);
      expect(parser.canParseFile('script.csx')).toBe(true);
      expect(parser.canParseFile('test.js')).toBe(false);
      expect(parser.canParseFile('test.java')).toBe(false);
    });

    it('should have correct capabilities', () => {
      const capabilities = (parser as any).getCapabilities();
      expect(capabilities.symbols).toBe(true);
      expect(capabilities.relationships).toBe(true);
      expect(capabilities.ranges).toBe(true);
      expect(capabilities.types).toBe(true);
      expect(capabilities.controlFlow).toBe(true);
      expect(capabilities.incremental).toBe(true);
    });
  });

  describe('C# Class parsing', () => {
    it('should parse a simple class declaration', async () => {
      const content = `
namespace MyNamespace
{
    public class MyClass
    {
        public string Name { get; set; }

        public void DoSomething()
        {
            Console.WriteLine("Hello World");
        }
    }
}`;

      const result = await parser.parseContent(content, 'MyClass.cs');
      expect(result.components).toBeDefined();

      // Should find the namespace, class, property, and method
      const namespaceComponent = result.components.find(c => c.type === ComponentType.NAMESPACE);
      expect(namespaceComponent).toBeDefined();
      expect(namespaceComponent?.name).toBe('MyNamespace');

      const classComponent = result.components.find(c => c.type === ComponentType.CLASS);
      expect(classComponent).toBeDefined();
      expect(classComponent?.name).toBe('MyClass');

      const propertyComponent = result.components.find(c => c.type === ComponentType.PROPERTY);
      expect(propertyComponent).toBeDefined();
      expect(propertyComponent?.name).toBe('Name');

      const methodComponent = result.components.find(c => c.type === ComponentType.METHOD);
      expect(methodComponent).toBeDefined();
      expect(methodComponent?.name).toBe('DoSomething');
    });

    it('should parse class with inheritance', async () => {
      const content = `
public class DerivedClass : BaseClass, IInterface
{
    public override void VirtualMethod()
    {
        base.VirtualMethod();
    }
}`;

      const result = await parser.parseContent(content, 'DerivedClass.cs');
      const classComponent = result.components.find(c => c.type === ComponentType.CLASS);

      expect(classComponent).toBeDefined();
      expect(classComponent?.name).toBe('DerivedClass');
      expect(classComponent?.metadata?.baseClass).toBe('BaseClass');
      expect(classComponent?.metadata?.implementedInterfaces).toContain('IInterface');
    });

    it('should parse generic class', async () => {
      const content = `
public class GenericClass<T, U> where T : class, new() where U : struct
{
    public T CreateInstance<V>() where V : T
    {
        return new T();
    }
}`;

      const result = await parser.parseContent(content, 'GenericClass.cs');
      const classComponent = result.components.find(c => c.type === ComponentType.CLASS);

      expect(classComponent).toBeDefined();
      expect(classComponent?.name).toBe('GenericClass');
      expect(classComponent?.metadata?.generics).toContain('T');
      expect(classComponent?.metadata?.generics).toContain('U');

      const methodComponent = result.components.find(c => c.type === ComponentType.METHOD);
      expect(methodComponent?.metadata?.generics).toContain('V');
    });
  });

  describe('C# Interface parsing', () => {
    it('should parse interface declaration', async () => {
      const content = `
public interface IRepository<T> where T : class
{
    Task<T> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task SaveAsync(T entity);
    Task DeleteAsync(int id);
}`;

      const result = await parser.parseContent(content, 'IRepository.cs');
      const interfaceComponent = result.components.find(c => c.type === ComponentType.INTERFACE);

      expect(interfaceComponent).toBeDefined();
      expect(interfaceComponent?.name).toBe('IRepository');
      expect(interfaceComponent?.metadata?.generics).toContain('T');

      const methods = result.components.filter(c => c.type === ComponentType.METHOD);
      expect(methods).toHaveLength(4);
      expect(methods.map(m => m.name)).toEqual(['GetByIdAsync', 'GetAllAsync', 'SaveAsync', 'DeleteAsync']);
    });
  });

  describe('C# Property parsing', () => {
    it('should parse auto-implemented properties', async () => {
      const content = `
public class Person
{
    public string FirstName { get; set; }
    public string LastName { get; private set; }
    public int Age { get; }
    public string FullName => $"{FirstName} {LastName}";
}`;

      const result = await parser.parseContent(content, 'Person.cs');
      const properties = result.components.filter(c => c.type === ComponentType.PROPERTY);

      expect(properties).toHaveLength(4);

      const firstNameProp = properties.find(p => p.name === 'FirstName');
      expect(firstNameProp?.metadata?.hasGetter).toBe(true);
      expect(firstNameProp?.metadata?.hasSetter).toBe(true);
      expect(firstNameProp?.metadata?.isAutoProperty).toBe(true);

      const fullNameProp = properties.find(p => p.name === 'FullName');
      expect(fullNameProp?.metadata?.isAutoProperty).toBe(false);
    });

    it('should parse indexer properties', async () => {
      const content = `
public class MyList<T>
{
    private List<T> items = new List<T>();

    public T this[int index]
    {
        get => items[index];
        set => items[index] = value;
    }
}`;

      const result = await parser.parseContent(content, 'MyList.cs');
      const indexer = result.components.find(c => c.type === ComponentType.PROPERTY && c.metadata?.isIndexer);

      expect(indexer).toBeDefined();
    });
  });

  describe('C# Method parsing', () => {
    it('should parse async methods', async () => {
      const content = `
public class DataService
{
    public async Task<string> GetDataAsync()
    {
        await Task.Delay(1000);
        return "Data";
    }

    public async void EventHandler()
    {
        await DoSomethingAsync();
    }
}`;

      const result = await parser.parseContent(content, 'DataService.cs');
      const methods = result.components.filter(c => c.type === ComponentType.METHOD);

      expect(methods).toHaveLength(2);

      const asyncMethod = methods.find(m => m.name === 'GetDataAsync');
      expect(asyncMethod?.metadata?.isAsync).toBe(true);
      expect(asyncMethod?.metadata?.returnType).toContain('Task');
    });

    it('should parse method overloads', async () => {
      const content = `
public class Calculator
{
    public int Add(int a, int b)
    {
        return a + b;
    }

    public double Add(double a, double b)
    {
        return a + b;
    }

    public T Add<T>(T a, T b) where T : struct
    {
        return (dynamic)a + (dynamic)b;
    }
}`;

      const result = await parser.parseContent(content, 'Calculator.cs');
      const methods = result.components.filter(c => c.type === ComponentType.METHOD && c.name === 'Add');

      expect(methods).toHaveLength(3);

      const genericMethod = methods.find(m => m.metadata?.generics?.includes('T'));
      expect(genericMethod).toBeDefined();
    });
  });

  describe('C# Modern features', () => {
    it('should parse records (C# 9+)', async () => {
      const content = `
public record Person(string FirstName, string LastName)
{
    public string FullName => $"{FirstName} {LastName}";
}

public record struct Point(int X, int Y);
`;

      const result = await parser.parseContent(content, 'Records.cs');
      const records = result.components.filter(c => c.type === ComponentType.CLASS && c.metadata?.csharpType === 'record');

      expect(records).toHaveLength(2);

      const personRecord = records.find(r => r.name === 'Person');
      expect(personRecord).toBeDefined();
      expect(personRecord?.metadata?.csharpType).toBe('record');
    });

    it('should parse nullable reference types', async () => {
      const content = `
public class UserService
{
    public string? GetUserName(int? userId)
    {
        if (userId == null)
            return null;

        return "User" + userId;
    }
}`;

      const result = await parser.parseContent(content, 'UserService.cs');
      const method = result.components.find(c => c.type === ComponentType.METHOD);

      expect(method).toBeDefined();
      expect(method?.name).toBe('GetUserName');
    });

    it('should parse pattern matching', async () => {
      const content = `
public class PatternExample
{
    public string ProcessValue(object value) => value switch
    {
        int i when i > 0 => "Positive integer",
        string s when !string.IsNullOrEmpty(s) => $"String: {s}",
        null => "Null value",
        _ => "Unknown"
    };
}`;

      const result = await parser.parseContent(content, 'PatternExample.cs');
      const method = result.components.find(c => c.type === ComponentType.METHOD);

      expect(method).toBeDefined();
      expect(method?.name).toBe('ProcessValue');
    });
  });

  describe('C# Attributes parsing', () => {
    it('should parse class and method attributes', async () => {
      const content = `
[Serializable]
[JsonObject(MemberSerialization.OptIn)]
public class MyClass
{
    [Required]
    [JsonProperty("name")]
    public string Name { get; set; }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> GetDataAsync()
    {
        return Ok();
    }
}`;

      const result = await parser.parseContent(content, 'MyClass.cs');

      const classComponent = result.components.find(c => c.type === ComponentType.CLASS);
      expect(classComponent?.metadata?.attributes).toContain('Serializable');
      expect(classComponent?.metadata?.attributes).toContain('JsonObject');

      const property = result.components.find(c => c.type === ComponentType.PROPERTY);
      expect(property?.metadata?.attributes).toContain('Required');
      expect(property?.metadata?.attributes).toContain('JsonProperty');

      const method = result.components.find(c => c.type === ComponentType.METHOD);
      expect(method?.metadata?.attributes).toContain('HttpGet');
      expect(method?.metadata?.attributes).toContain('Authorize');
    });
  });

  describe('C# Event and Delegate parsing', () => {
    it('should parse events and delegates', async () => {
      const content = `
public delegate void EventHandler<T>(T args);

public class Publisher
{
    public event Action<string> MessageReceived;
    public event EventHandler<int> NumberChanged;

    protected virtual void OnMessageReceived(string message)
    {
        MessageReceived?.Invoke(message);
    }
}`;

      const result = await parser.parseContent(content, 'Publisher.cs');

      const delegateComponent = result.components.find(c => c.type === ComponentType.TYPE && c.name === 'EventHandler');
      expect(delegateComponent).toBeDefined();

      const events = result.components.filter(c => c.type === ComponentType.PROPERTY && c.metadata?.csharpType === 'event');
      expect(events).toHaveLength(2);
    });
  });

  describe('Relationship parsing', () => {
    it('should detect inheritance relationships', async () => {
      const content = `
public abstract class Animal
{
    public abstract void MakeSound();
}

public class Dog : Animal
{
    public override void MakeSound()
    {
        Console.WriteLine("Woof!");
    }
}`;

      const result = await parser.parseContent(content, 'Animals.cs');

      // Should detect inheritance relationship
      const inheritanceRelationship = result.relationships.find(r => r.type === RelationshipType.EXTENDS);
      expect(inheritanceRelationship).toBeDefined();
    });

    it('should detect interface implementation relationships', async () => {
      const content = `
public interface IFlyable
{
    void Fly();
}

public class Bird : IFlyable
{
    public void Fly()
    {
        Console.WriteLine("Flying!");
    }
}`;

      const result = await parser.parseContent(content, 'Bird.cs');

      // Should detect implementation relationship
      const implementationRelationship = result.relationships.find(r => r.type === RelationshipType.IMPLEMENTS);
      expect(implementationRelationship).toBeDefined();
    });

    it('should detect method call relationships', async () => {
      const content = `
public class Service
{
    private Repository repository = new Repository();

    public void ProcessData()
    {
        var data = repository.GetData();
        ProcessItems(data);
    }

    private void ProcessItems(string data)
    {
        Console.WriteLine(data);
    }
}`;

      const result = await parser.parseContent(content, 'Service.cs');

      // Should detect method call relationships
      const callRelationships = result.relationships.filter(r => r.type === RelationshipType.CALLS);
      expect(callRelationships.length).toBeGreaterThan(0);
    });
  });

  describe('Syntax validation', () => {
    it('should validate correct C# syntax', async () => {
      const content = `
public class ValidClass
{
    public string Property { get; set; }

    public void Method()
    {
        Console.WriteLine("Valid");
    }
}`;

      const errors = await parser.validateSyntax(content);
      expect(errors).toHaveLength(0);
    });

    it('should detect syntax errors', async () => {
      const content = `
public class InvalidClass
{
    public string Property { get set; }  // Missing semicolon

    public void Method(
    {
        Console.WriteLine("Invalid");
    }
}`;

      const errors = await parser.validateSyntax(content);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].severity).toBe('error');
    });
  });

  describe('LINQ and modern C# features', () => {
    it('should parse LINQ expressions', async () => {
      const content = `
public class DataProcessor
{
    public IEnumerable<string> ProcessData(IEnumerable<Person> people)
    {
        return from person in people
               where person.Age > 18
               select person.Name;
    }

    public List<int> GetNumbers()
    {
        return Enumerable.Range(1, 10)
            .Where(x => x % 2 == 0)
            .Select(x => x * 2)
            .ToList();
    }
}`;

      const result = await parser.parseContent(content, 'DataProcessor.cs');
      const methods = result.components.filter(c => c.type === ComponentType.METHOD);

      expect(methods).toHaveLength(2);
      expect(methods.map(m => m.name)).toEqual(['ProcessData', 'GetNumbers']);
    });

    it('should parse using statements and imports', async () => {
      const content = `
using System;
using System.Collections.Generic;
using System.Linq;
using static System.Console;
using MyAlias = System.Collections.Generic.List<string>;

namespace MyApp
{
    public class Program
    {
        public static void Main()
        {
            WriteLine("Hello World");
        }
    }
}`;

      const result = await parser.parseContent(content, 'Program.cs');

      // Should detect using relationships
      const usingRelationships = result.relationships.filter(r => r.type === RelationshipType.IMPORTS);
      expect(usingRelationships.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty files gracefully', async () => {
      const content = '';
      const result = await parser.parseContent(content, 'Empty.cs');

      expect(result.components).toHaveLength(0);
      expect(result.relationships).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle malformed C# gracefully', async () => {
      const content = `
      This is not valid C# code at all!
      { } [ ] ( ) random text
      `;

      // Should not throw, should return gracefully
      const result = await parser.parseContent(content, 'Invalid.cs');
      expect(result).toBeDefined();
    });

    it('should handle very large files', async () => {
      // Generate a large C# class with many methods
      const methods = Array.from({length: 100}, (_, i) => `
        public void Method${i}()
        {
            Console.WriteLine("Method ${i}");
        }`).join('\n');

      const content = `
public class LargeClass
{${methods}
}`;

      const result = await parser.parseContent(content, 'LargeClass.cs');

      expect(result.components.length).toBeGreaterThan(100);
      expect(result.metadata?.componentCount).toBeGreaterThan(100);
    });
  });

  describe('Performance', () => {
    it('should parse moderately complex C# files in reasonable time', async () => {
      const content = `
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ComplexExample
{
    public abstract class BaseService<T> : IService<T> where T : class, IEntity
    {
        protected readonly IRepository<T> repository;

        protected BaseService(IRepository<T> repository)
        {
            this.repository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        public virtual async Task<T> GetByIdAsync(int id)
        {
            return await repository.GetByIdAsync(id);
        }

        public abstract Task<IEnumerable<T>> GetAllAsync();
    }

    public class UserService : BaseService<User>
    {
        public UserService(IRepository<User> repository) : base(repository) { }

        public override async Task<IEnumerable<User>> GetAllAsync()
        {
            return await repository.GetAllAsync();
        }

        public async Task<User> GetByEmailAsync(string email)
        {
            var users = await GetAllAsync();
            return users.FirstOrDefault(u => u.Email == email);
        }
    }
}`;

      const startTime = Date.now();
      const result = await parser.parseContent(content, 'ComplexExample.cs');
      const parseTime = Date.now() - startTime;

      expect(parseTime).toBeLessThan(5000); // Should parse in less than 5 seconds
      expect(result.components.length).toBeGreaterThan(5);
      expect(result.metadata?.parsingLevel).toBe('structural');
    });
  });
});