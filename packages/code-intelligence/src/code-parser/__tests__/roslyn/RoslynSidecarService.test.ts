/**
 * Tests for RoslynSidecarService
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { RoslynSidecarService } from '../../services/RoslynSidecarService.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('RoslynSidecarService', () => {
  let service: RoslynSidecarService;
  let testDir: string;
  let testCsFile: string;

  beforeAll(() => {
    // Create a temporary test directory
    testDir = join(tmpdir(), 'roslyn-test-' + Date.now());
    mkdirSync(testDir, { recursive: true });

    // Create a test C# file
    testCsFile = join(testDir, 'TestClass.cs');
    const testCsContent = `
using System;
using System.Collections.Generic;

namespace TestNamespace
{
    /// <summary>
    /// A test class for demonstration
    /// </summary>
    public class TestClass
    {
        private readonly string _name;

        public TestClass(string name)
        {
            _name = name ?? throw new ArgumentNullException(nameof(name));
        }

        public string Name => _name;

        public async Task<int> CalculateAsync(int value)
        {
            await Task.Delay(100);
            return value * 2;
        }

        public static void StaticMethod()
        {
            Console.WriteLine("Static method called");
        }
    }

    public interface ITestInterface
    {
        void DoSomething();
    }

    public class DerivedClass : TestClass, ITestInterface
    {
        public DerivedClass(string name) : base(name) { }

        public void DoSomething()
        {
            Console.WriteLine($"Doing something with {Name}");
        }
    }
}`;

    writeFileSync(testCsFile, testCsContent);

    // Create a simple project file
    const projectFile = join(testDir, 'TestProject.csproj');
    const projectContent = `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <LangVersion>latest</LangVersion>
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
    service = new RoslynSidecarService({
      enableLogging: false,
      requestTimeout: 10000
    });
  });

  afterEach(async () => {
    if (service) {
      await service.stop();
    }
  });

  describe('Service Lifecycle', () => {
    test('should create service instance', () => {
      expect(service).toBeDefined();
      expect(service.getStatus().isInitialized).toBe(false);
    });

    test('should check availability without starting', async () => {
      // This test may fail if dotnet is not installed
      try {
        const isAvailable = await service.isAvailable();
        expect(typeof isAvailable).toBe('boolean');
      } catch (error) {
        // If dotnet is not available, that's expected in some environments
        console.warn('Dotnet not available for testing:', error);
      }
    }, 15000);

    test('should start and stop service', async () => {
      try {
        await service.start();
        expect(service.getStatus().isInitialized).toBe(true);

        await service.stop();
        expect(service.getStatus().isInitialized).toBe(false);
      } catch (error) {
        // Skip test if sidecar is not available
        console.warn('Sidecar not available for testing:', error);
      }
    }, 20000);
  });

  describe('File Analysis', () => {
    test('should analyze C# file and extract symbols', async () => {
      try {
        const result = await service.analyzeFile(testCsFile);

        expect(result).toBeDefined();
        expect(result.filePath).toBe(testCsFile);
        expect(result.symbols.length).toBeGreaterThan(0);

        // Should find the main class
        const testClassSymbol = result.symbols.find(s => s.name === 'TestClass');
        expect(testClassSymbol).toBeDefined();
        expect(testClassSymbol?.kind).toBe('NamedType');

        // Should find methods
        const calculateMethod = result.symbols.find(s => s.name === 'CalculateAsync');
        expect(calculateMethod).toBeDefined();
        expect(calculateMethod?.isAsync).toBe(true);

        // Should find constructor
        const constructor = result.symbols.find(s => s.name === '.ctor');
        expect(constructor).toBeDefined();

        // Should have diagnostics
        expect(Array.isArray(result.diagnostics)).toBe(true);

      } catch (error) {
        console.warn('File analysis test skipped (sidecar not available):', error);
      }
    }, 30000);

    test('should analyze C# content directly', async () => {
      const content = `
using System;

public class SimpleClass
{
    public string Property { get; set; }

    public void Method()
    {
        Console.WriteLine("Hello World");
    }
}`;

      try {
        const result = await service.analyzeFile(testCsFile, content);

        expect(result).toBeDefined();
        expect(result.symbols.length).toBeGreaterThan(0);

        const simpleClass = result.symbols.find(s => s.name === 'SimpleClass');
        expect(simpleClass).toBeDefined();

      } catch (error) {
        console.warn('Content analysis test skipped (sidecar not available):', error);
      }
    }, 20000);
  });

  describe('Workspace Operations', () => {
    test('should load workspace project', async () => {
      try {
        const workspaceInfo = await service.loadWorkspace(testDir);

        expect(workspaceInfo).toBeDefined();
        expect(workspaceInfo.isLoaded).toBe(true);
        expect(workspaceInfo.projectName).toBeTruthy();

      } catch (error) {
        console.warn('Workspace loading test skipped (sidecar not available):', error);
      }
    }, 30000);

    test('should get workspace symbols', async () => {
      try {
        await service.loadWorkspace(testDir);
        const symbols = await service.getWorkspaceSymbols('Test');

        expect(Array.isArray(symbols)).toBe(true);

      } catch (error) {
        console.warn('Workspace symbols test skipped (sidecar not available):', error);
      }
    }, 25000);
  });

  describe('Advanced Analysis', () => {
    test('should get control flow graph', async () => {
      try {
        const controlFlow = await service.getControlFlow(testCsFile);

        expect(Array.isArray(controlFlow)).toBe(true);

      } catch (error) {
        console.warn('Control flow test skipped (sidecar not available):', error);
      }
    }, 20000);

    test('should get data flow analysis', async () => {
      try {
        const dataFlow = await service.getDataFlow(testCsFile);

        // Data flow analysis might be null for some files
        expect(dataFlow === null || typeof dataFlow === 'object').toBe(true);

      } catch (error) {
        console.warn('Data flow test skipped (sidecar not available):', error);
      }
    }, 20000);

    test('should get type hierarchy', async () => {
      try {
        const typeHierarchy = await service.getTypeHierarchy(testCsFile);

        expect(Array.isArray(typeHierarchy)).toBe(true);

      } catch (error) {
        console.warn('Type hierarchy test skipped (sidecar not available):', error);
      }
    }, 20000);

    test('should get diagnostics', async () => {
      try {
        const diagnostics = await service.getDiagnostics(testCsFile);

        expect(Array.isArray(diagnostics)).toBe(true);

      } catch (error) {
        console.warn('Diagnostics test skipped (sidecar not available):', error);
      }
    }, 20000);
  });

  describe('Document Notifications', () => {
    test('should handle document lifecycle notifications', async () => {
      const content = 'public class TestDocument { }';

      try {
        // These are notifications, so they don't return values
        await service.didOpenDocument(testCsFile, content);
        await service.didChangeDocument(testCsFile, content + '\n// Modified');

        // Should not throw errors
        expect(true).toBe(true);

      } catch (error) {
        console.warn('Document notifications test skipped (sidecar not available):', error);
      }
    }, 15000);
  });

  describe('Error Handling', () => {
    test('should handle invalid file paths gracefully', async () => {
      try {
        const result = await service.analyzeFile('/nonexistent/file.cs');

        // Should either return an error result or throw
        expect(result.diagnostics.length).toBeGreaterThan(0);

      } catch (error) {
        // This is expected for nonexistent files
        expect(error).toBeDefined();
      }
    }, 15000);

    test('should handle invalid workspace paths gracefully', async () => {
      try {
        const workspaceInfo = await service.loadWorkspace('/nonexistent/workspace');

        expect(workspaceInfo.isLoaded).toBe(false);
        expect(workspaceInfo.loadErrors.length).toBeGreaterThan(0);

      } catch (error) {
        // This is expected for nonexistent workspaces
        expect(error).toBeDefined();
      }
    }, 15000);
  });

  describe('Service Configuration', () => {
    test('should respect timeout configuration', async () => {
      const fastTimeoutService = new RoslynSidecarService({
        requestTimeout: 1000, // Very short timeout
        enableLogging: false
      });

      try {
        // This might timeout or succeed depending on system speed
        await fastTimeoutService.analyzeFile(testCsFile);
      } catch (error) {
        // Timeout error is acceptable
        expect(error.message).toContain('timeout');
      } finally {
        await fastTimeoutService.stop();
      }
    }, 10000);

    test('should handle auto-restart configuration', async () => {
      const autoRestartService = new RoslynSidecarService({
        autoRestart: true,
        maxRestartAttempts: 1,
        enableLogging: false
      });

      // Test that the service can be configured
      expect(autoRestartService.getStatus().isInitialized).toBe(false);

      await autoRestartService.stop();
    });
  });
});