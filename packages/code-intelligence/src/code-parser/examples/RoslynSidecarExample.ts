/**
 * Example usage of the Roslyn Sidecar for C# semantic analysis
 *
 * This example demonstrates how to use the RoslynSidecarService and
 * RoslynEnhancedCSharpParser for advanced C# code analysis.
 */

import { RoslynSidecarService } from '../services/RoslynSidecarService.js';
import { RoslynEnhancedCSharpParser } from '../parsers/RoslynEnhancedCSharpParser.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Example C# code for analysis
 */
const EXAMPLE_CSHARP_CODE = `
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ExampleNamespace
{
    /// <summary>
    /// Example base class demonstrating inheritance
    /// </summary>
    public abstract class BaseService
    {
        protected readonly string serviceName;

        protected BaseService(string name)
        {
            serviceName = name ?? throw new ArgumentNullException(nameof(name));
        }

        public abstract Task<bool> InitializeAsync();
        public virtual void Cleanup() => Console.WriteLine($"Cleaning up {serviceName}");
    }

    /// <summary>
    /// Interface for demonstrating implementation relationships
    /// </summary>
    public interface IDataProcessor<T> where T : class
    {
        Task<IEnumerable<T>> ProcessAsync(IEnumerable<T> items);
        void Configure(Dictionary<string, object> options);
    }

    /// <summary>
    /// Example service class with complex features
    /// </summary>
    [System.ComponentModel.Description("Data processing service")]
    public sealed class DataProcessingService : BaseService, IDataProcessor<string>
    {
        private readonly List<string> _processedItems = new();
        private Dictionary<string, object> _configuration = new();

        // Events
        public event EventHandler<string>? ItemProcessed;
        public static event Action<string>? GlobalLog;

        // Properties
        public int ProcessedCount => _processedItems.Count;
        public bool IsConfigured { get; private set; }

        // Indexer
        public string this[int index] => _processedItems[index];

        public DataProcessingService(string name) : base(name)
        {
        }

        public override async Task<bool> InitializeAsync()
        {
            await Task.Delay(100); // Simulate initialization
            GlobalLog?.Invoke($"Initialized {serviceName}");
            return true;
        }

        public async Task<IEnumerable<string>> ProcessAsync(IEnumerable<string> items)
        {
            var results = new List<string>();

            foreach (var item in items)
            {
                // Simulate processing with control flow
                var processed = await ProcessSingleItemAsync(item);
                if (processed != null)
                {
                    results.Add(processed);
                    _processedItems.Add(processed);
                    ItemProcessed?.Invoke(this, processed);
                }
            }

            return results;
        }

        private async Task<string?> ProcessSingleItemAsync(string item)
        {
            if (string.IsNullOrWhiteSpace(item))
                return null;

            await Task.Delay(10);

            // Complex control flow for demonstration
            switch (item.Length)
            {
                case 0:
                    return null;
                case 1:
                    return item.ToUpper();
                default:
                    var result = item.Trim();
                    for (int i = 0; i < result.Length; i++)
                    {
                        if (char.IsDigit(result[i]))
                        {
                            result = result.Remove(i, 1);
                            i--; // Adjust index after removal
                        }
                    }
                    return result;
            }
        }

        public void Configure(Dictionary<string, object> options)
        {
            _configuration = options ?? throw new ArgumentNullException(nameof(options));
            IsConfigured = true;
        }

        public T GetConfigValue<T>(string key, T defaultValue = default)
        {
            return _configuration.TryGetValue(key, out var value) && value is T typedValue
                ? typedValue
                : defaultValue;
        }

        public override void Cleanup()
        {
            base.Cleanup();
            _processedItems.Clear();
            _configuration.Clear();
            IsConfigured = false;
        }
    }

    // Utility classes
    public static class ProcessingUtilities
    {
        public static bool IsValidItem(string item) => !string.IsNullOrWhiteSpace(item);

        public static class StringHelpers
        {
            public static string Sanitize(string input) =>
                string.IsNullOrEmpty(input) ? string.Empty : input.Trim().ToLowerInvariant();
        }
    }

    // Enum for configuration
    public enum ProcessingMode
    {
        Sequential = 0,
        Parallel = 1,
        Batched = 2
    }

    // Record for data transfer
    public record ProcessingResult(string Item, bool Success, TimeSpan Duration);
}`;

/**
 * Run the Roslyn sidecar example
 */
async function runExample(): Promise<void> {
    console.log('🔬 Roslyn Sidecar Example');
    console.log('========================\n');

    // Create temporary directory and files
    const tempDir = join(tmpdir(), 'roslyn-example-' + Date.now());
    mkdirSync(tempDir, { recursive: true });

    const exampleFile = join(tempDir, 'DataProcessingService.cs');
    writeFileSync(exampleFile, EXAMPLE_CSHARP_CODE);

    // Create a simple project file
    const projectFile = join(tempDir, 'ExampleProject.csproj');
    const projectContent = `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>`;
    writeFileSync(projectFile, projectContent);

    try {
        await demonstrateSidecarService(exampleFile, tempDir);
        await demonstrateEnhancedParser(exampleFile, tempDir);
    } catch (error) {
        console.error('❌ Example failed:', error);
        console.log('\nNote: This example requires .NET 8.0 SDK to be installed.');
        console.log('If you see "sidecar not available" messages, the Roslyn sidecar');
        console.log('may not be built or .NET may not be installed on your system.');
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up temporary files...');
        const { rmSync } = await import('fs');
        rmSync(tempDir, { recursive: true, force: true });
    }
}

/**
 * Demonstrate RoslynSidecarService usage
 */
async function demonstrateSidecarService(filePath: string, workspaceDir: string): Promise<void> {
    console.log('📡 RoslynSidecarService Demo');
    console.log('----------------------------\n');

    const service = new RoslynSidecarService({
        enableLogging: false,
        requestTimeout: 15000
    });

    try {
        // Check if service is available
        console.log('Checking sidecar availability...');
        const isAvailable = await service.isAvailable();
        console.log(`Sidecar available: ${isAvailable ? '✅' : '❌'}\n`);

        if (!isAvailable) {
            console.log('⚠️  Sidecar not available. Skipping service demo.\n');
            return;
        }

        // Load workspace
        console.log('Loading workspace...');
        const workspaceInfo = await service.loadWorkspace(workspaceDir);
        console.log(`Workspace loaded: ${workspaceInfo.isLoaded ? '✅' : '❌'}`);
        console.log(`Project: ${workspaceInfo.projectName}`);
        console.log(`Documents: ${workspaceInfo.documentCount}\n`);

        // Analyze file
        console.log('Analyzing C# file...');
        const analysisResult = await service.analyzeFile(filePath);
        console.log(`Analysis completed in ${analysisResult.processingTimeMs}ms`);
        console.log(`Symbols found: ${analysisResult.symbols.length}`);
        console.log(`Diagnostics: ${analysisResult.diagnostics.length}`);
        console.log(`Type hierarchies: ${analysisResult.typeHierarchies.length}`);
        console.log(`Control flow nodes: ${analysisResult.controlFlowGraph.length}\n`);

        // Show some interesting symbols
        console.log('🔍 Interesting Symbols:');
        const classes = analysisResult.symbols.filter(s => s.kind === 'NamedType' && s.name.includes('Service'));
        const methods = analysisResult.symbols.filter(s => s.kind === 'Method' && s.isAsync);
        const properties = analysisResult.symbols.filter(s => s.kind === 'Property');

        console.log(`  Classes with 'Service': ${classes.length}`);
        classes.slice(0, 3).forEach(c => {
            console.log(`    - ${c.name} (${c.accessibility}, ${c.isAbstract ? 'abstract' : 'concrete'})`);
        });

        console.log(`  Async methods: ${methods.length}`);
        methods.slice(0, 3).forEach(m => {
            console.log(`    - ${m.name}() -> ${m.returnType}`);
        });

        console.log(`  Properties: ${properties.length}`);
        properties.slice(0, 3).forEach(p => {
            console.log(`    - ${p.name}: ${p.type} (${p.accessibility})`);
        });

        // Get advanced analysis
        console.log('\n🔬 Advanced Analysis:');

        const controlFlow = await service.getControlFlow(filePath);
        console.log(`Control flow blocks: ${controlFlow.length}`);

        const dataFlow = await service.getDataFlow(filePath);
        if (dataFlow) {
            console.log(`Variables read: ${dataFlow.variablesRead.length}`);
            console.log(`Variables written: ${dataFlow.variablesWritten.length}`);
        }

        const typeHierarchy = await service.getTypeHierarchy(filePath);
        console.log(`Type hierarchy entries: ${typeHierarchy.length}`);

        // Show inheritance relationships
        const inheritance = typeHierarchy.filter(t => t.baseType);
        if (inheritance.length > 0) {
            console.log('\n🏗️  Inheritance Relationships:');
            inheritance.forEach(t => {
                console.log(`  ${t.symbolId} extends ${t.baseType}`);
                if (t.interfaces.length > 0) {
                    console.log(`    implements ${t.interfaces.join(', ')}`);
                }
            });
        }

    } catch (error) {
        console.error('Service demo error:', error);
    } finally {
        await service.stop();
        console.log('\n');
    }
}

/**
 * Demonstrate RoslynEnhancedCSharpParser usage
 */
async function demonstrateEnhancedParser(filePath: string, workspaceDir: string): Promise<void> {
    console.log('🚀 RoslynEnhancedCSharpParser Demo');
    console.log('----------------------------------\n');

    const parser = new RoslynEnhancedCSharpParser({
        enableRoslyn: true,
        enableFallback: true,
        enableCaching: false // Disable for demo
    });

    try {
        // Check parser status
        const status = parser.getStatus();
        console.log('Parser Status:');
        console.log(`  Roslyn: ${status.roslyn ? '✅' : '❌'}`);
        console.log(`  Tree-sitter: ${status.treeSitter ? '✅' : '❌'}`);
        console.log(`  Fallback enabled: ${status.fallback ? '✅' : '❌'}\n`);

        // Parse with workspace context
        console.log('Parsing with workspace context...');
        const parseResult = await parser.parseFile(filePath, {
            workspaceRoot: workspaceDir,
            preferSemanticAnalysis: true
        });

        console.log(`Components found: ${parseResult.components.length}`);
        console.log(`Relationships found: ${parseResult.relationships.length}`);
        console.log(`Errors: ${parseResult.errors.length}`);
        console.log(`Warnings: ${parseResult.warnings.length}`);
        console.log(`Parser used: ${parseResult.metadata?.parser || 'unknown'}\n`);

        // Show component breakdown
        console.log('📊 Component Breakdown:');
        const componentCounts = parseResult.components.reduce((acc, comp) => {
            acc[comp.type] = (acc[comp.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        Object.entries(componentCounts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([type, count]) => {
                console.log(`  ${type}: ${count}`);
            });

        // Show some relationships
        console.log('\n🔗 Relationships:');
        const relationshipCounts = parseResult.relationships.reduce((acc, rel) => {
            acc[rel.type] = (acc[rel.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        Object.entries(relationshipCounts).forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });

        // Show rich metadata if available
        if (parseResult.metadata?.parser === 'roslyn-enhanced') {
            console.log('\n📈 Enhanced Metadata:');
            console.log(`  Processing time: ${parseResult.metadata.processingTimeMs}ms`);
            console.log(`  Symbol count: ${parseResult.metadata.symbolCount}`);
            console.log(`  Has control flow: ${parseResult.metadata.hasControlFlow ? '✅' : '❌'}`);
            console.log(`  Has data flow: ${parseResult.metadata.hasDataFlow ? '✅' : '❌'}`);
            console.log(`  Has type hierarchy: ${parseResult.metadata.hasTypeHierarchy ? '✅' : '❌'}`);

            // Get additional analysis if Roslyn is available
            if (parser.isRoslynAvailable()) {
                console.log('\n🔬 Additional Roslyn Analysis:');

                const semanticAnalysis = await parser.getSemanticAnalysis(filePath);
                if (semanticAnalysis) {
                    console.log(`  Full semantic analysis: ${semanticAnalysis.symbols.length} symbols`);
                }

                const controlFlowGraph = await parser.getControlFlowGraph(filePath);
                console.log(`  Control flow graph: ${controlFlowGraph.length} nodes`);

                const dataFlowAnalysis = await parser.getDataFlowAnalysis(filePath);
                console.log(`  Data flow analysis: ${dataFlowAnalysis ? 'Available' : 'N/A'}`);
            }
        }

        // Test error handling with invalid code
        console.log('\n🚨 Error Handling Demo:');
        const invalidCode = `
using System;
public class InvalidClass
{
    public void Method()
    {
        int x = "string"; // Type error
        // Missing closing brace
`;

        const errorResult = await parser.parseContent(invalidCode, 'Invalid.cs');
        console.log(`  Errors detected: ${errorResult.errors.length}`);
        console.log(`  Warnings detected: ${errorResult.warnings.length}`);

        if (errorResult.errors.length > 0) {
            console.log('  Sample error:', errorResult.errors[0].message);
        }

    } catch (error) {
        console.error('Parser demo error:', error);
    } finally {
        await parser.dispose();
    }
}

/**
 * Run the example if this file is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
    runExample().catch(console.error);
}

export { runExample, EXAMPLE_CSHARP_CODE };