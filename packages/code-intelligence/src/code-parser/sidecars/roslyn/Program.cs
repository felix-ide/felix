using System.CommandLine;
using Newtonsoft.Json.Linq;
using CodeIndexer.RoslynSidecar.Models;

namespace CodeIndexer.RoslynSidecar;

/// <summary>
/// Main program for the Roslyn sidecar process
/// </summary>
class Program
{
    private static JsonRpcServer? _server;
    private static SemanticAnalysisEngine? _analysisEngine;
    private static WorkspaceManager? _workspaceManager;
    private static readonly CancellationTokenSource _cancellationTokenSource = new();

    static async Task<int> Main(string[] args)
    {
        // Set up command line interface
        var rootCommand = new RootCommand("Roslyn Sidecar for C# Semantic Analysis")
        {
            CreateStdioCommand(),
            CreateAnalyzeCommand(),
            CreateWorkspaceCommand()
        };

        return await rootCommand.InvokeAsync(args);
    }

    /// <summary>
    /// Create the stdio command for JSON-RPC communication
    /// </summary>
    private static Command CreateStdioCommand()
    {
        var command = new Command("stdio", "Start JSON-RPC server using stdio");

        command.SetHandler(async () =>
        {
            await RunStdioServerAsync();
        });

        return command;
    }

    /// <summary>
    /// Create the analyze command for direct file analysis
    /// </summary>
    private static Command CreateAnalyzeCommand()
    {
        var fileOption = new Option<string>("--file", "File path to analyze") { IsRequired = true };
        var outputOption = new Option<string?>("--output", "Output file path (optional)");

        var command = new Command("analyze", "Analyze a C# file directly")
        {
            fileOption,
            outputOption
        };

        command.SetHandler(async (file, output) =>
        {
            await AnalyzeFileDirectlyAsync(file, output);
        }, fileOption, outputOption);

        return command;
    }

    /// <summary>
    /// Create the workspace command for workspace operations
    /// </summary>
    private static Command CreateWorkspaceCommand()
    {
        var pathOption = new Option<string>("--path", "Workspace path (solution or project)") { IsRequired = true };

        var command = new Command("workspace", "Load and analyze workspace")
        {
            pathOption
        };

        command.SetHandler(async (path) =>
        {
            await LoadWorkspaceDirectlyAsync(path);
        }, pathOption);

        return command;
    }

    /// <summary>
    /// Run the JSON-RPC server over stdio
    /// </summary>
    private static async Task RunStdioServerAsync()
    {
        try
        {
            // Initialize components
            _server = new JsonRpcServer();
            _analysisEngine = new SemanticAnalysisEngine();
            _workspaceManager = new WorkspaceManager();

            await _workspaceManager.InitializeAsync();

            // Register JSON-RPC methods
            RegisterRpcMethods();

            // Set up signal handlers for graceful shutdown
            Console.CancelKeyPress += (_, e) =>
            {
                e.Cancel = true;
                _cancellationTokenSource.Cancel();
            };

            // Start the server
            await _server.StartAsync(_cancellationTokenSource.Token);
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"Failed to start stdio server: {ex.Message}");
            Environment.Exit(1);
        }
        finally
        {
            _workspaceManager?.Dispose();
        }
    }

    /// <summary>
    /// Register all JSON-RPC method handlers
    /// </summary>
    private static void RegisterRpcMethods()
    {
        if (_server == null) return;

        // Workspace methods
        _server.RegisterMethod("workspace/load", HandleWorkspaceLoadAsync);
        _server.RegisterMethod("workspace/info", HandleWorkspaceInfoAsync);

        // Document methods
        _server.RegisterMethod("textDocument/analyze", HandleDocumentAnalyzeAsync);
        _server.RegisterMethod("textDocument/didOpen", HandleDocumentDidOpenAsync);
        _server.RegisterMethod("textDocument/didChange", HandleDocumentDidChangeAsync);
        _server.RegisterMethod("textDocument/didSave", HandleDocumentDidSaveAsync);
        _server.RegisterMethod("textDocument/didClose", HandleDocumentDidCloseAsync);

        // Symbol methods
        _server.RegisterMethod("workspace/symbol", HandleWorkspaceSymbolAsync);
        _server.RegisterMethod("textDocument/documentSymbol", HandleDocumentSymbolAsync);

        // Analysis methods
        _server.RegisterMethod("textDocument/controlFlow", HandleControlFlowAsync);
        _server.RegisterMethod("textDocument/dataFlow", HandleDataFlowAsync);
        _server.RegisterMethod("textDocument/typeHierarchy", HandleTypeHierarchyAsync);

        // Diagnostic methods
        _server.RegisterMethod("textDocument/diagnostics", HandleDiagnosticsAsync);
        _server.RegisterMethod("workspace/diagnostics", HandleWorkspaceDiagnosticsAsync);
    }

    /// <summary>
    /// JSON-RPC method handlers
    /// </summary>
    private static async Task<object?> HandleWorkspaceLoadAsync(JToken? parameters)
    {
        try
        {
            var path = parameters?["path"]?.ToString();
            if (string.IsNullOrEmpty(path))
            {
                throw new ArgumentException("Workspace path is required");
            }

            if (_workspaceManager == null)
            {
                throw new InvalidOperationException("Workspace manager not initialized");
            }

            var info = await _workspaceManager.LoadWorkspaceAsync(path);
            return info;
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to load workspace: {ex.Message}");
        }
    }

    private static async Task<object?> HandleWorkspaceInfoAsync(JToken? parameters)
    {
        // Return current workspace information
        return new { status = "ready", message = "Workspace manager initialized" };
    }

    private static async Task<object?> HandleDocumentAnalyzeAsync(JToken? parameters)
    {
        try
        {
            var filePath = parameters?["uri"]?.ToString() ?? parameters?["filePath"]?.ToString();
            var content = parameters?["content"]?.ToString();

            if (string.IsNullOrEmpty(filePath))
            {
                throw new ArgumentException("File path is required");
            }

            if (_analysisEngine == null)
            {
                throw new InvalidOperationException("Analysis engine not initialized");
            }

            // If content is not provided, try to read from file
            if (string.IsNullOrEmpty(content))
            {
                if (File.Exists(filePath))
                {
                    content = await File.ReadAllTextAsync(filePath);
                }
                else
                {
                    throw new FileNotFoundException($"File not found: {filePath}");
                }
            }

            var result = await _analysisEngine.AnalyzeFileAsync(filePath, content);
            return result;
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to analyze document: {ex.Message}");
        }
    }

    private static async Task<object?> HandleDocumentDidOpenAsync(JToken? parameters)
    {
        var uri = parameters?["textDocument"]?["uri"]?.ToString();
        var content = parameters?["textDocument"]?["text"]?.ToString();

        if (!string.IsNullOrEmpty(uri) && !string.IsNullOrEmpty(content) && _workspaceManager != null)
        {
            await _workspaceManager.UpdateDocumentAsync(uri, content);
        }

        return null; // Notification, no response
    }

    private static async Task<object?> HandleDocumentDidChangeAsync(JToken? parameters)
    {
        var uri = parameters?["textDocument"]?["uri"]?.ToString();
        var changes = parameters?["contentChanges"];

        if (!string.IsNullOrEmpty(uri) && changes != null && _workspaceManager != null)
        {
            // For simplicity, we'll assume full document changes
            var change = changes.FirstOrDefault();
            var content = change?["text"]?.ToString();

            if (!string.IsNullOrEmpty(content))
            {
                await _workspaceManager.UpdateDocumentAsync(uri, content);
            }
        }

        return null; // Notification, no response
    }

    private static async Task<object?> HandleDocumentDidSaveAsync(JToken? parameters)
    {
        // Handle document save - could trigger re-analysis
        return null; // Notification, no response
    }

    private static async Task<object?> HandleDocumentDidCloseAsync(JToken? parameters)
    {
        // Handle document close - could clean up cached data
        return null; // Notification, no response
    }

    private static async Task<object?> HandleWorkspaceSymbolAsync(JToken? parameters)
    {
        try
        {
            var query = parameters?["query"]?.ToString() ?? "";

            if (_workspaceManager == null)
            {
                throw new InvalidOperationException("Workspace manager not initialized");
            }

            var symbols = await _workspaceManager.FindSymbolsAsync(query);
            return symbols.Take(100).Select(s => new
            {
                name = s.Name,
                kind = s.Kind.ToString(),
                containerName = s.ContainingNamespace?.Name
            });
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to find workspace symbols: {ex.Message}");
        }
    }

    private static async Task<object?> HandleDocumentSymbolAsync(JToken? parameters)
    {
        try
        {
            var uri = parameters?["textDocument"]?["uri"]?.ToString();
            if (string.IsNullOrEmpty(uri))
            {
                throw new ArgumentException("Document URI is required");
            }

            // Use the analysis engine to get symbols for this document
            if (_analysisEngine != null && File.Exists(uri))
            {
                var content = await File.ReadAllTextAsync(uri);
                var result = await _analysisEngine.AnalyzeFileAsync(uri, content);
                return result.Symbols;
            }

            return new List<object>();
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to get document symbols: {ex.Message}");
        }
    }

    private static async Task<object?> HandleControlFlowAsync(JToken? parameters)
    {
        try
        {
            var uri = parameters?["textDocument"]?["uri"]?.ToString();
            if (string.IsNullOrEmpty(uri) || !File.Exists(uri))
            {
                throw new ArgumentException("Valid document URI is required");
            }

            if (_analysisEngine != null)
            {
                var content = await File.ReadAllTextAsync(uri);
                var result = await _analysisEngine.AnalyzeFileAsync(uri, content);
                return result.ControlFlowGraph;
            }

            return new List<object>();
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to analyze control flow: {ex.Message}");
        }
    }

    private static async Task<object?> HandleDataFlowAsync(JToken? parameters)
    {
        try
        {
            var uri = parameters?["textDocument"]?["uri"]?.ToString();
            if (string.IsNullOrEmpty(uri) || !File.Exists(uri))
            {
                throw new ArgumentException("Valid document URI is required");
            }

            if (_analysisEngine != null)
            {
                var content = await File.ReadAllTextAsync(uri);
                var result = await _analysisEngine.AnalyzeFileAsync(uri, content);
                return result.DataFlow;
            }

            return null;
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to analyze data flow: {ex.Message}");
        }
    }

    private static async Task<object?> HandleTypeHierarchyAsync(JToken? parameters)
    {
        try
        {
            var uri = parameters?["textDocument"]?["uri"]?.ToString();
            if (string.IsNullOrEmpty(uri) || !File.Exists(uri))
            {
                throw new ArgumentException("Valid document URI is required");
            }

            if (_analysisEngine != null)
            {
                var content = await File.ReadAllTextAsync(uri);
                var result = await _analysisEngine.AnalyzeFileAsync(uri, content);
                return result.TypeHierarchies;
            }

            return new List<object>();
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to analyze type hierarchy: {ex.Message}");
        }
    }

    private static async Task<object?> HandleDiagnosticsAsync(JToken? parameters)
    {
        try
        {
            var uri = parameters?["textDocument"]?["uri"]?.ToString();
            if (string.IsNullOrEmpty(uri) || !File.Exists(uri))
            {
                throw new ArgumentException("Valid document URI is required");
            }

            if (_analysisEngine != null)
            {
                var content = await File.ReadAllTextAsync(uri);
                var result = await _analysisEngine.AnalyzeFileAsync(uri, content);
                return result.Diagnostics;
            }

            return new List<object>();
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to get diagnostics: {ex.Message}");
        }
    }

    private static async Task<object?> HandleWorkspaceDiagnosticsAsync(JToken? parameters)
    {
        try
        {
            if (_workspaceManager == null)
            {
                throw new InvalidOperationException("Workspace manager not initialized");
            }

            var diagnostics = await _workspaceManager.GetWorkspaceDiagnosticsAsync();
            return diagnostics;
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to get workspace diagnostics: {ex.Message}");
        }
    }

    /// <summary>
    /// Direct file analysis (for testing)
    /// </summary>
    private static async Task AnalyzeFileDirectlyAsync(string filePath, string? outputPath)
    {
        try
        {
            var analysisEngine = new SemanticAnalysisEngine();
            var content = await File.ReadAllTextAsync(filePath);
            var result = await analysisEngine.AnalyzeFileAsync(filePath, content);

            var json = Newtonsoft.Json.JsonConvert.SerializeObject(result, Newtonsoft.Json.Formatting.Indented);

            if (!string.IsNullOrEmpty(outputPath))
            {
                await File.WriteAllTextAsync(outputPath, json);
                Console.WriteLine($"Analysis result written to: {outputPath}");
            }
            else
            {
                Console.WriteLine(json);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Analysis failed: {ex.Message}");
            Environment.Exit(1);
        }
    }

    /// <summary>
    /// Direct workspace loading (for testing)
    /// </summary>
    private static async Task LoadWorkspaceDirectlyAsync(string workspacePath)
    {
        try
        {
            using var workspaceManager = new WorkspaceManager();
            await workspaceManager.InitializeAsync();

            var info = await workspaceManager.LoadWorkspaceAsync(workspacePath);
            var json = Newtonsoft.Json.JsonConvert.SerializeObject(info, Newtonsoft.Json.Formatting.Indented);

            Console.WriteLine(json);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Workspace loading failed: {ex.Message}");
            Environment.Exit(1);
        }
    }
}