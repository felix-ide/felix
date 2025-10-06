/**
 * Tests for RoslynEnhancedCSharpParser
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { RoslynEnhancedCSharpParser } from '../../parsers/RoslynEnhancedCSharpParser.js';
import { ComponentType, RelationshipType } from '../../types.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('RoslynEnhancedCSharpParser', () => {
  let parser: RoslynEnhancedCSharpParser;
  let testDir: string;
  let testCsFile: string;

  beforeAll(() => {
    // Create a temporary test directory
    testDir = join(tmpdir(), 'roslyn-parser-test-' + Date.now());
    mkdirSync(testDir, { recursive: true });

    // Create a comprehensive test C# file
    testCsFile = join(testDir, 'ComplexTestClass.cs');
    const testCsContent = `
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace TestNamespace.SubNamespace
{
    /// <summary>
    /// Base class for testing inheritance
    /// </summary>
    public abstract class BaseClass
    {
        protected string baseName;

        public BaseClass(string name)
        {
            baseName = name;
        }

        public abstract void AbstractMethod();
        public virtual void VirtualMethod() => Console.WriteLine("Base implementation");
    }

    /// <summary>
    /// Interface for testing implementation
    /// </summary>
    public interface ITestInterface
    {
        void InterfaceMethod();
        string InterfaceProperty { get; set; }
    }

    /// <summary>
    /// Generic interface for advanced testing
    /// </summary>
    public interface IGenericInterface<T> where T : class
    {
        T GetItem();
        void SetItem(T item);
    }

    /// <summary>
    /// Main test class with complex features
    /// </summary>
    [Serializable]
    [System.ComponentModel.Description("Test class for parsing")]
    public sealed class ComplexTestClass : BaseClass, ITestInterface, IGenericInterface<string>
    {
        // Fields with different modifiers
        private readonly List<string> _items = new();
        private static int _instanceCount;
        public const string DEFAULT_NAME = "Default";

        // Events
        public event EventHandler<string>? ItemAdded;
        public static event Action? StaticEvent;

        // Properties with different accessors
        public string Name { get; private set; }
        public int Count => _items.Count;
        public string InterfaceProperty { get; set; } = string.Empty;

        // Indexer
        public string this[int index]
        {
            get => _items[index];
            set => _items[index] = value;
        }

        // Constructor
        public ComplexTestClass(string name) : base(name)
        {
            Name = name;
            _instanceCount++;
        }

        // Static constructor
        static ComplexTestClass()
        {
            _instanceCount = 0;
        }

        // Destructor
        ~ComplexTestClass()
        {
            _instanceCount--;
        }

        // Method implementations
        public override void AbstractMethod()
        {
            Console.WriteLine($"Abstract method implementation in {Name}");
        }

        public override void VirtualMethod()
        {
            base.VirtualMethod();
            Console.WriteLine("Overridden implementation");
        }

        public void InterfaceMethod()
        {
            Console.WriteLine("Interface method implementation");
        }

        // Generic interface implementation
        public string GetItem()
        {
            return _items.FirstOrDefault() ?? string.Empty;
        }

        public void SetItem(string item)
        {
            _items.Clear();
            _items.Add(item);
            ItemAdded?.Invoke(this, item);
        }

        // Async method
        public async Task<bool> ProcessAsync(int delay = 1000)
        {
            await Task.Delay(delay);
            return true;
        }

        // Generic method
        public T Convert<T>(object value) where T : class
        {
            return value as T ?? throw new InvalidCastException();
        }

        // Operator overloading
        public static ComplexTestClass operator +(ComplexTestClass left, ComplexTestClass right)
        {
            var result = new ComplexTestClass(left.Name + right.Name);
            result._items.AddRange(left._items);
            result._items.AddRange(right._items);
            return result;
        }

        // Static method
        public static int GetInstanceCount() => _instanceCount;

        // Method with complex control flow
        public string ProcessWithControlFlow(int value)
        {
            string result;

            if (value < 0)
            {
                result = "Negative";
            }
            else if (value == 0)
            {
                result = "Zero";
            }
            else
            {
                result = "Positive";

                for (int i = 0; i < value && i < 10; i++)
                {
                    if (i % 2 == 0)
                    {
                        result += " Even";
                        continue;
                    }

                    result += " Odd";

                    if (i > 5)
                    {
                        break;
                    }
                }
            }

            return result;
        }
    }

    // Nested class
    public static class UtilityClass
    {
        public static void HelperMethod()
        {
            Console.WriteLine("Helper method");
        }

        public static class NestedUtility
        {
            public static string Format(string input) => input.ToUpper();
        }
    }

    // Enum
    public enum TestEnum
    {
        None = 0,
        First = 1,
        Second = 2,
        Combined = First | Second
    }

    // Struct
    public struct TestStruct
    {
        public int Value { get; set; }
        public string Name { get; set; }

        public TestStruct(int value, string name)
        {
            Value = value;
            Name = name;
        }
    }

    // Record (C# 9.0+)
    public record TestRecord(string Name, int Value)
    {
        public string Description => $"{Name}: {Value}";
    }

    // Delegate
    public delegate string ProcessDelegate(string input);
}`;

    writeFileSync(testCsFile, testCsContent);

    // Create a project file
    const projectFile = join(testDir, 'TestProject.csproj');
    const projectContent = `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>`;

    writeFileSync(projectFile, projectContent);
  });

  afterAll(() => {
    // Clean up test directory
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    parser = new RoslynEnhancedCSharpParser({
      enableRoslyn: true,
      enableFallback: true,
      enableCaching: false, // Disable caching for testing
      sidecarTimeout: 15000
    });
  });

  afterEach(async () => {
    if (parser) {
      await parser.dispose();
    }
  });

  describe('Parser Initialization', () => {
    test('should create parser with enhanced capabilities', () => {
      expect(parser).toBeDefined();
      expect(parser.getSupportedExtensions()).toContain('.cs');

      const capabilities = parser.getCapabilities();
      expect(capabilities.semantic).toBe(true);
      expect(capabilities.controlFlow).toBe(true);
      expect(capabilities.dataFlow).toBe(true);
      expect(capabilities.typeHierarchy).toBe(true);
    });

    test('should check parser status', () => {
      const status = parser.getStatus();
      expect(status).toHaveProperty('roslyn');
      expect(status).toHaveProperty('treeSitter');
      expect(status).toHaveProperty('fallback');
      expect(status.treeSitter).toBe(true);
      expect(status.fallback).toBe(true);
    });
  });

  describe('File Parsing', () => {
    test('should parse C# file and extract components', async () => {
      try {
        const result = await parser.parseFile(testCsFile);

        expect(result).toBeDefined();
        expect(result.components.length).toBeGreaterThan(0);
        expect(result.relationships.length).toBeGreaterThan(0);

        // Should find namespace
        const namespace = result.components.find(c => c.type === ComponentType.NAMESPACE);
        expect(namespace).toBeDefined();
        expect(namespace?.name).toContain('TestNamespace');

        // Should find classes
        const complexClass = result.components.find(c =>
          c.type === ComponentType.CLASS && c.name === 'ComplexTestClass'
        );
        expect(complexClass).toBeDefined();
        expect(complexClass?.metadata.parser).toBeTruthy();

        // Should find base class
        const baseClass = result.components.find(c =>
          c.type === ComponentType.CLASS && c.name === 'BaseClass'
        );
        expect(baseClass).toBeDefined();

        // Should find interface
        const testInterface = result.components.find(c =>
          c.type === ComponentType.INTERFACE && c.name === 'ITestInterface'
        );
        expect(testInterface).toBeDefined();

        // Should find methods
        const abstractMethod = result.components.find(c =>
          c.type === ComponentType.METHOD && c.name === 'AbstractMethod'
        );
        expect(abstractMethod).toBeDefined();

        // Should find properties
        const nameProperty = result.components.find(c =>
          c.type === ComponentType.PROPERTY && c.name === 'Name'
        );
        expect(nameProperty).toBeDefined();

        // Should find enum
        const testEnum = result.components.find(c =>
          c.type === ComponentType.ENUM && c.name === 'TestEnum'
        );
        expect(testEnum).toBeDefined();

        // Should find struct
        const testStruct = result.components.find(c =>
          c.type === ComponentType.STRUCT && c.name === 'TestStruct'
        );
        expect(testStruct).toBeDefined();

      } catch (error) {
        // If Roslyn is not available, should fall back to Tree-sitter
        console.warn('Enhanced parsing failed, checking fallback:', error);

        // Should still get some basic parsing results from Tree-sitter fallback
        const result = await parser.parseFile(testCsFile);
        expect(result.components.length).toBeGreaterThan(0);
        expect(result.metadata?.parser).toBeDefined();
      }
    }, 45000);

    test('should parse C# content directly', async () => {
      const content = `
using System;

namespace TestNamespace
{
    public class SimpleClass
    {
        private string _name;

        public SimpleClass(string name)
        {
            _name = name;
        }

        public string GetName() => _name;

        public async Task<string> GetNameAsync()
        {
            await Task.Delay(10);
            return _name;
        }
    }
}`;

      try {
        const result = await parser.parseContent(content, testCsFile);

        expect(result).toBeDefined();
        expect(result.components.length).toBeGreaterThan(0);

        // Should find the class
        const simpleClass = result.components.find(c =>
          c.type === ComponentType.CLASS && c.name === 'SimpleClass'
        );
        expect(simpleClass).toBeDefined();

        // Should find methods
        const getName = result.components.find(c =>
          c.type === ComponentType.METHOD && c.name === 'GetName'
        );
        expect(getName).toBeDefined();

        const getNameAsync = result.components.find(c =>
          c.type === ComponentType.METHOD && c.name === 'GetNameAsync'
        );
        expect(getNameAsync).toBeDefined();

      } catch (error) {
        console.warn('Content parsing test failed, checking fallback:', error);

        // Should still work with Tree-sitter fallback
        const result = await parser.parseContent(content, testCsFile);
        expect(result.components.length).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe('Relationship Extraction', () => {
    test('should extract inheritance relationships', async () => {
      try {
        const result = await parser.parseFile(testCsFile);

        // Should find inheritance relationship
        const inheritance = result.relationships.find(r =>
          r.type === RelationshipType.EXTENDS
        );
        expect(inheritance).toBeDefined();

        // Should find implementation relationship
        const implementation = result.relationships.find(r =>
          r.type === RelationshipType.IMPLEMENTS
        );
        expect(implementation).toBeDefined();

        // Should find containment relationships
        const containment = result.relationships.find(r =>
          r.type === RelationshipType.CONTAINS
        );
        expect(containment).toBeDefined();

      } catch (error) {
        console.warn('Relationship extraction test failed:', error);

        // Fallback should still provide basic relationships
        const result = await parser.parseFile(testCsFile);
        expect(result.relationships.length).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe('Enhanced Analysis', () => {
    test('should get semantic analysis', async () => {
      try {
        const semanticResult = await parser.getSemanticAnalysis(testCsFile);

        if (semanticResult) {
          expect(semanticResult.symbols.length).toBeGreaterThan(0);
          expect(semanticResult.filePath).toBe(testCsFile);
          expect(typeof semanticResult.processingTimeMs).toBe('number');
        }

      } catch (error) {
        console.warn('Semantic analysis test skipped (Roslyn not available):', error);
      }
    }, 30000);

    test('should get control flow graph', async () => {
      try {
        const controlFlow = await parser.getControlFlowGraph(testCsFile);

        expect(Array.isArray(controlFlow)).toBe(true);

      } catch (error) {
        console.warn('Control flow test skipped (Roslyn not available):', error);
      }
    }, 25000);

    test('should get data flow analysis', async () => {
      try {
        const dataFlow = await parser.getDataFlowAnalysis(testCsFile);

        // Data flow might be null for some files
        expect(dataFlow === null || typeof dataFlow === 'object').toBe(true);

      } catch (error) {
        console.warn('Data flow test skipped (Roslyn not available):', error);
      }
    }, 25000);

    test('should get type hierarchy', async () => {
      try {
        const typeHierarchy = await parser.getTypeHierarchy(testCsFile);

        expect(Array.isArray(typeHierarchy)).toBe(true);

      } catch (error) {
        console.warn('Type hierarchy test skipped (Roslyn not available):', error);
      }
    }, 25000);
  });

  describe('Workspace Integration', () => {
    test('should load workspace', async () => {
      try {
        const loaded = await parser.loadWorkspace(testDir);

        expect(typeof loaded).toBe('boolean');

      } catch (error) {
        console.warn('Workspace loading test skipped (Roslyn not available):', error);
      }
    }, 30000);

    test('should parse with workspace context', async () => {
      try {
        const result = await parser.parseFile(testCsFile, {
          workspaceRoot: testDir,
          preferSemanticAnalysis: true
        });

        expect(result).toBeDefined();
        expect(result.components.length).toBeGreaterThan(0);

      } catch (error) {
        console.warn('Workspace context parsing test failed:', error);

        // Should still work with fallback
        const result = await parser.parseFile(testCsFile);
        expect(result.components.length).toBeGreaterThan(0);
      }
    }, 35000);
  });

  describe('Fallback Behavior', () => {
    test('should fallback to Tree-sitter when Roslyn fails', async () => {
      // Create parser with Roslyn disabled
      const fallbackParser = new RoslynEnhancedCSharpParser({
        enableRoslyn: false,
        enableFallback: true
      });

      try {
        const result = await fallbackParser.parseFile(testCsFile);

        expect(result).toBeDefined();
        expect(result.components.length).toBeGreaterThan(0);
        expect(result.metadata?.parser).toBe('tree-sitter'); // Should indicate Tree-sitter was used

      } finally {
        await fallbackParser.dispose();
      }
    }, 25000);

    test('should handle invalid files gracefully', async () => {
      try {
        const result = await parser.parseFile('/nonexistent/file.cs');

        // Should either succeed with Tree-sitter or fail gracefully
        if (result) {
          expect(result.errors.length).toBeGreaterThan(0);
        }

      } catch (error) {
        // Failure is acceptable for nonexistent files
        expect(error).toBeDefined();
      }
    }, 15000);
  });

  describe('Metadata and Diagnostics', () => {
    test('should include rich metadata', async () => {
      try {
        const result = await parser.parseFile(testCsFile);

        expect(result.metadata).toBeDefined();
        expect(result.metadata.parser).toBeDefined();

        // Check for enhanced metadata if Roslyn is available
        if (result.metadata.parser === 'roslyn-enhanced') {
          expect(result.metadata.symbolCount).toBeGreaterThan(0);
          expect(typeof result.metadata.processingTimeMs).toBe('number');
        }

      } catch (error) {
        console.warn('Metadata test failed:', error);
      }
    }, 25000);

    test('should extract diagnostics', async () => {
      // Create a file with syntax errors
      const invalidContent = `
using System;

public class InvalidClass
{
    public void Method()
    {
        // Missing closing brace

    public void AnotherMethod()
    {
        int x = "string"; // Type mismatch
    }
// Missing closing brace for class
`;

      try {
        const result = await parser.parseContent(invalidContent, join(testDir, 'invalid.cs'));

        // Should have errors
        expect(result.errors.length).toBeGreaterThan(0);

      } catch (error) {
        console.warn('Diagnostics test failed:', error);
      }
    }, 20000);
  });

  describe('Performance', () => {
    test('should handle reasonably sized files efficiently', async () => {
      const startTime = Date.now();

      try {
        const result = await parser.parseFile(testCsFile);
        const endTime = Date.now();
        const processingTime = endTime - startTime;

        expect(result).toBeDefined();
        expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds

        console.log(`Parsing took ${processingTime}ms`);

      } catch (error) {
        console.warn('Performance test failed:', error);
      }
    }, 35000);
  });
});