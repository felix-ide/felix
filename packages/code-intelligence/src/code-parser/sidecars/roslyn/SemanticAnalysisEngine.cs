using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Text;
using Microsoft.CodeAnalysis.FlowAnalysis;
using CodeIndexer.RoslynSidecar.Models;
using System.Text;

namespace CodeIndexer.RoslynSidecar;

/// <summary>
/// Semantic analysis engine using Roslyn APIs
/// </summary>
public class SemanticAnalysisEngine
{
    private readonly Dictionary<string, SyntaxTree> _syntaxTreeCache = new();
    private readonly Dictionary<string, SemanticModel> _semanticModelCache = new();
    private Compilation? _compilation;

    /// <summary>
    /// Analyze a C# source file and extract semantic information
    /// </summary>
    public async Task<SemanticAnalysisResult> AnalyzeFileAsync(string filePath, string content)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            var syntaxTree = await GetOrCreateSyntaxTreeAsync(filePath, content);
            var semanticModel = await GetOrCreateSemanticModelAsync(syntaxTree);

            var result = new SemanticAnalysisResult
            {
                FilePath = filePath,
                Symbols = await ExtractSymbolsAsync(syntaxTree, semanticModel),
                Diagnostics = ExtractDiagnostics(semanticModel),
                TypeHierarchies = await ExtractTypeHierarchiesAsync(syntaxTree, semanticModel),
                ControlFlowGraph = await ExtractControlFlowGraphAsync(syntaxTree, semanticModel),
                DataFlow = await ExtractDataFlowAnalysisAsync(syntaxTree, semanticModel)
            };

            stopwatch.Stop();
            result.ProcessingTimeMs = stopwatch.ElapsedMilliseconds;

            return result;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return new SemanticAnalysisResult
            {
                FilePath = filePath,
                ProcessingTimeMs = stopwatch.ElapsedMilliseconds,
                Diagnostics = new List<DiagnosticInfo>
                {
                    new()
                    {
                        Id = "SE0001",
                        Severity = "Error",
                        Message = $"Semantic analysis failed: {ex.Message}",
                        Category = "SemanticEngine"
                    }
                }
            };
        }
    }

    /// <summary>
    /// Get or create a syntax tree with caching
    /// </summary>
    private async Task<SyntaxTree> GetOrCreateSyntaxTreeAsync(string filePath, string content)
    {
        var contentHash = ComputeContentHash(content);
        var cacheKey = $"{filePath}#{contentHash}";

        if (_syntaxTreeCache.TryGetValue(cacheKey, out var cachedTree))
        {
            return cachedTree;
        }

        var sourceText = SourceText.From(content, Encoding.UTF8);
        var syntaxTree = CSharpSyntaxTree.ParseText(sourceText, path: filePath);

        // Cache the syntax tree
        _syntaxTreeCache[cacheKey] = syntaxTree;

        // Clean up old cache entries (keep only last 100)
        if (_syntaxTreeCache.Count > 100)
        {
            var oldestKeys = _syntaxTreeCache.Keys.Take(_syntaxTreeCache.Count - 100).ToList();
            foreach (var key in oldestKeys)
            {
                _syntaxTreeCache.Remove(key);
            }
        }

        return syntaxTree;
    }

    /// <summary>
    /// Get or create a semantic model with caching
    /// </summary>
    private async Task<SemanticModel> GetOrCreateSemanticModelAsync(SyntaxTree syntaxTree)
    {
        var cacheKey = syntaxTree.FilePath ?? "unknown";

        if (_semanticModelCache.TryGetValue(cacheKey, out var cachedModel))
        {
            return cachedModel;
        }

        // Create a compilation if we don't have one
        if (_compilation == null)
        {
            await CreateCompilationAsync(syntaxTree);
        }

        // Add the syntax tree to compilation if it's not already there
        if (!_compilation!.SyntaxTrees.Contains(syntaxTree))
        {
            _compilation = _compilation.AddSyntaxTrees(syntaxTree);
        }

        var semanticModel = _compilation.GetSemanticModel(syntaxTree);
        _semanticModelCache[cacheKey] = semanticModel;

        return semanticModel;
    }

    /// <summary>
    /// Create a compilation with standard references
    /// </summary>
    private async Task CreateCompilationAsync(SyntaxTree syntaxTree)
    {
        var references = new List<MetadataReference>
        {
            MetadataReference.CreateFromFile(typeof(object).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(Enumerable).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(Console).Assembly.Location)
        };

        // Add more references for a complete compilation
        var runtimePath = Path.GetDirectoryName(typeof(object).Assembly.Location);
        if (runtimePath != null)
        {
            var runtimeRefs = new[]
            {
                "System.Runtime.dll",
                "System.Collections.dll",
                "System.Linq.dll",
                "System.Threading.dll",
                "System.Threading.Tasks.dll",
                "Microsoft.CSharp.dll"
            };

            foreach (var refName in runtimeRefs)
            {
                var refPath = Path.Combine(runtimePath, refName);
                if (File.Exists(refPath))
                {
                    references.Add(MetadataReference.CreateFromFile(refPath));
                }
            }
        }

        _compilation = CSharpCompilation.Create(
            assemblyName: "Analysis",
            syntaxTrees: new[] { syntaxTree },
            references: references,
            options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );
    }

    /// <summary>
    /// Extract symbols from the syntax tree and semantic model
    /// </summary>
    private async Task<List<CodeSymbol>> ExtractSymbolsAsync(SyntaxTree syntaxTree, SemanticModel semanticModel)
    {
        var symbols = new List<CodeSymbol>();
        var root = await syntaxTree.GetRootAsync();

        foreach (var node in root.DescendantNodes())
        {
            var symbol = ExtractSymbolFromNode(node, semanticModel);
            if (symbol != null)
            {
                symbols.Add(symbol);
            }
        }

        return symbols;
    }

    /// <summary>
    /// Extract a symbol from a syntax node
    /// </summary>
    private CodeSymbol? ExtractSymbolFromNode(SyntaxNode node, SemanticModel semanticModel)
    {
        try
        {
            var symbolInfo = semanticModel.GetSymbolInfo(node);
            var declaredSymbol = semanticModel.GetDeclaredSymbol(node);
            var symbol = symbolInfo.Symbol ?? declaredSymbol;

            if (symbol == null) return null;

            var codeSymbol = new CodeSymbol
            {
                Id = GetSymbolId(symbol),
                Name = symbol.Name,
                Kind = symbol.Kind.ToString(),
                Type = GetSymbolType(symbol),
                Location = GetCodeLocation(node),
                Accessibility = symbol.DeclaredAccessibility.ToString(),
                IsStatic = symbol.IsStatic,
                IsAbstract = symbol.IsAbstract,
                IsVirtual = symbol.IsVirtual,
                IsOverride = symbol.IsOverride,
                IsSealed = symbol.IsSealed,
                Namespace = GetNamespace(symbol),
                ContainingType = symbol.ContainingType?.Name,
                Documentation = ExtractDocumentation(symbol)
            };

            // Extract additional metadata based on symbol type
            ExtractSymbolSpecificMetadata(symbol, node, codeSymbol);

            return codeSymbol;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Extract symbol-specific metadata
    /// </summary>
    private void ExtractSymbolSpecificMetadata(ISymbol symbol, SyntaxNode node, CodeSymbol codeSymbol)
    {
        switch (symbol)
        {
            case IMethodSymbol method:
                codeSymbol.IsAsync = method.IsAsync;
                codeSymbol.IsGeneric = method.IsGenericMethod;
                codeSymbol.GenericParameters = method.TypeParameters.Select(tp => tp.Name).ToList();
                codeSymbol.Parameters = method.Parameters.Select(ConvertParameter).ToList();
                codeSymbol.ReturnType = method.ReturnType.Name;
                break;

            case IPropertySymbol property:
                codeSymbol.Type = property.Type.Name;
                codeSymbol.IsStatic = property.IsStatic;
                break;

            case IFieldSymbol field:
                codeSymbol.Type = field.Type.Name;
                codeSymbol.IsStatic = field.IsStatic;
                break;

            case INamedTypeSymbol namedType:
                codeSymbol.IsGeneric = namedType.IsGenericType;
                codeSymbol.GenericParameters = namedType.TypeParameters.Select(tp => tp.Name).ToList();
                codeSymbol.IsPartial = namedType.IsPartial();
                break;
        }

        // Extract attributes
        codeSymbol.Attributes = symbol.GetAttributes()
            .Select(attr => new AttributeInfo
            {
                Name = attr.AttributeClass?.Name ?? "Unknown",
                Arguments = attr.ConstructorArguments.Select(arg => arg.Value?.ToString() ?? "").ToList()
            })
            .ToList();
    }

    /// <summary>
    /// Convert parameter symbol to parameter info
    /// </summary>
    private ParameterInfo ConvertParameter(IParameterSymbol parameter)
    {
        return new ParameterInfo
        {
            Name = parameter.Name,
            Type = parameter.Type.Name,
            HasDefaultValue = parameter.HasExplicitDefaultValue,
            DefaultValue = parameter.ExplicitDefaultValue?.ToString(),
            IsParams = parameter.IsParams,
            IsOptional = parameter.IsOptional,
            RefKind = parameter.RefKind.ToString()
        };
    }

    /// <summary>
    /// Extract diagnostics from the semantic model
    /// </summary>
    private List<DiagnosticInfo> ExtractDiagnostics(SemanticModel semanticModel)
    {
        var diagnostics = new List<DiagnosticInfo>();

        foreach (var diagnostic in semanticModel.GetDiagnostics())
        {
            diagnostics.Add(new DiagnosticInfo
            {
                Id = diagnostic.Id,
                Severity = diagnostic.Severity.ToString(),
                Message = diagnostic.GetMessage(),
                Location = GetCodeLocationFromDiagnostic(diagnostic),
                Category = diagnostic.Category,
                WarningLevel = diagnostic.WarningLevel
            });
        }

        return diagnostics;
    }

    /// <summary>
    /// Extract type hierarchies
    /// </summary>
    private async Task<List<TypeHierarchy>> ExtractTypeHierarchiesAsync(SyntaxTree syntaxTree, SemanticModel semanticModel)
    {
        var hierarchies = new List<TypeHierarchy>();
        var root = await syntaxTree.GetRootAsync();

        var typeDeclarations = root.DescendantNodes()
            .OfType<TypeDeclarationSyntax>()
            .ToList();

        foreach (var typeDecl in typeDeclarations)
        {
            var symbol = semanticModel.GetDeclaredSymbol(typeDecl) as INamedTypeSymbol;
            if (symbol == null) continue;

            var hierarchy = new TypeHierarchy
            {
                SymbolId = GetSymbolId(symbol),
                BaseType = symbol.BaseType?.Name,
                Interfaces = symbol.Interfaces.Select(i => i.Name).ToList(),
                Members = symbol.GetMembers().Select(m => m.Name).ToList()
            };

            hierarchies.Add(hierarchy);
        }

        return hierarchies;
    }

    /// <summary>
    /// Extract control flow graph
    /// </summary>
    private async Task<List<ControlFlowNode>> ExtractControlFlowGraphAsync(SyntaxTree syntaxTree, SemanticModel semanticModel)
    {
        var nodes = new List<ControlFlowNode>();
        var root = await syntaxTree.GetRootAsync();

        var methods = root.DescendantNodes()
            .OfType<MethodDeclarationSyntax>()
            .ToList();

        foreach (var method in methods)
        {
            try
            {
                var methodSymbol = semanticModel.GetDeclaredSymbol(method);
                if (methodSymbol?.DeclaringSyntaxReferences.FirstOrDefault()?.GetSyntax() is MethodDeclarationSyntax methodSyntax)
                {
                    var body = methodSyntax.Body;
                    if (body != null)
                    {
                        var cfg = ControlFlowGraph.Create(body, semanticModel);
                        var cfgNodes = ConvertControlFlowGraph(cfg);
                        nodes.AddRange(cfgNodes);
                    }
                }
            }
            catch
            {
                // Control flow analysis failed for this method
            }
        }

        return nodes;
    }

    /// <summary>
    /// Extract data flow analysis
    /// </summary>
    private async Task<DataFlowAnalysis?> ExtractDataFlowAnalysisAsync(SyntaxTree syntaxTree, SemanticModel semanticModel)
    {
        try
        {
            var root = await syntaxTree.GetRootAsync();
            var firstMethod = root.DescendantNodes().OfType<MethodDeclarationSyntax>().FirstOrDefault();

            if (firstMethod?.Body != null)
            {
                var dataFlow = semanticModel.AnalyzeDataFlow(firstMethod.Body);
                if (dataFlow.Succeeded)
                {
                    return new DataFlowAnalysis
                    {
                        VariablesRead = dataFlow.ReadInside.Select(s => s.Name).ToList(),
                        VariablesWritten = dataFlow.WrittenInside.Select(s => s.Name).ToList(),
                        DefinitelyAssigned = dataFlow.DefinitelyAssignedOnEntry.Select(s => s.Name).ToList(),
                        AlwaysAssigned = dataFlow.AlwaysAssigned.Select(s => s.Name).ToList(),
                        DataFlowsIn = dataFlow.DataFlowsIn.Select(s => s.Name).ToList(),
                        DataFlowsOut = dataFlow.DataFlowsOut.Select(s => s.Name).ToList()
                    };
                }
            }
        }
        catch
        {
            // Data flow analysis failed
        }

        return null;
    }

    /// <summary>
    /// Helper methods
    /// </summary>
    private string GetSymbolId(ISymbol symbol)
    {
        return $"{symbol.ContainingNamespace?.Name ?? "global"}::{symbol.ContainingType?.Name ?? ""}.{symbol.Name}";
    }

    private string? GetSymbolType(ISymbol symbol)
    {
        return symbol switch
        {
            IFieldSymbol field => field.Type.Name,
            IPropertySymbol property => property.Type.Name,
            IMethodSymbol method => method.ReturnType.Name,
            _ => null
        };
    }

    private CodeLocation GetCodeLocation(SyntaxNode node)
    {
        var span = node.GetLocation().GetLineSpan();
        return new CodeLocation
        {
            StartLine = span.StartLinePosition.Line + 1,
            EndLine = span.EndLinePosition.Line + 1,
            StartColumn = span.StartLinePosition.Character + 1,
            EndColumn = span.EndLinePosition.Character + 1,
            FilePath = span.Path ?? ""
        };
    }

    private CodeLocation? GetCodeLocationFromDiagnostic(Diagnostic diagnostic)
    {
        if (diagnostic.Location == Location.None) return null;

        var span = diagnostic.Location.GetLineSpan();
        return new CodeLocation
        {
            StartLine = span.StartLinePosition.Line + 1,
            EndLine = span.EndLinePosition.Line + 1,
            StartColumn = span.StartLinePosition.Character + 1,
            EndColumn = span.EndLinePosition.Character + 1,
            FilePath = span.Path ?? ""
        };
    }

    private string? GetNamespace(ISymbol symbol)
    {
        return symbol.ContainingNamespace?.Name;
    }

    private string? ExtractDocumentation(ISymbol symbol)
    {
        var documentation = symbol.GetDocumentationCommentXml();
        return string.IsNullOrEmpty(documentation) ? null : documentation;
    }

    private List<ControlFlowNode> ConvertControlFlowGraph(ControlFlowGraph cfg)
    {
        var nodes = new List<ControlFlowNode>();

        foreach (var block in cfg.Blocks)
        {
            var node = new ControlFlowNode
            {
                Id = $"block_{block.Ordinal}",
                Kind = block.Kind.ToString(),
                Predecessors = block.Predecessors.Select(p => $"block_{p.Destination.Ordinal}").ToList(),
                Successors = block.Successors.Select(s => $"block_{s.Destination.Ordinal}").ToList(),
                Statements = block.Operations.Select(op => op.Syntax.ToString()).ToList(),
                IsReachable = block.IsReachable
            };

            if (block.Operations.Any())
            {
                var firstOp = block.Operations.First();
                node.Location = GetCodeLocation(firstOp.Syntax);
            }

            nodes.Add(node);
        }

        return nodes;
    }

    private string ComputeContentHash(string content)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(content);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    /// <summary>
    /// Clear all caches
    /// </summary>
    public void ClearCache()
    {
        _syntaxTreeCache.Clear();
        _semanticModelCache.Clear();
        _compilation = null;
    }
}