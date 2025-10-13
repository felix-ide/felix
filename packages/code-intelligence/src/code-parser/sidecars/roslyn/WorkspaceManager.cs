using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.MSBuild;
using Microsoft.Build.Locator;
using CodeIndexer.RoslynSidecar.Models;

namespace CodeIndexer.RoslynSidecar;

/// <summary>
/// Manages MSBuild workspace loading and project operations
/// </summary>
public class WorkspaceManager : IDisposable
{
    private MSBuildWorkspace? _workspace;
    private Solution? _solution;
    private readonly Dictionary<string, Project> _projectCache = new();
    private bool _msbuildLocated = false;
    private bool _disposed = false;

    /// <summary>
    /// Initialize the workspace manager
    /// </summary>
    public async Task<bool> InitializeAsync()
    {
        try
        {
            // Locate MSBuild instance
            if (!_msbuildLocated && MSBuildLocator.QueryVisualStudioInstances().Any())
            {
                var instance = MSBuildLocator.QueryVisualStudioInstances()
                    .OrderByDescending(x => x.Version)
                    .First();

                MSBuildLocator.RegisterInstance(instance);
                _msbuildLocated = true;
            }

            // Create workspace
            _workspace = MSBuildWorkspace.Create();

            // Configure workspace options
            _workspace.WorkspaceFailed += OnWorkspaceFailed;

            return true;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to initialize workspace: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Load a solution or project
    /// </summary>
    public async Task<WorkspaceInfo?> LoadWorkspaceAsync(string path)
    {
        if (_workspace == null)
        {
            throw new InvalidOperationException("Workspace not initialized");
        }

        try
        {
            if (path.EndsWith(".sln"))
            {
                return await LoadSolutionAsync(path);
            }
            else if (path.EndsWith(".csproj") || path.EndsWith(".fsproj") || path.EndsWith(".vbproj"))
            {
                return await LoadProjectAsync(path);
            }
            else
            {
                // Try to find solution or project files in the directory
                var solutionFiles = Directory.GetFiles(path, "*.sln");
                if (solutionFiles.Any())
                {
                    return await LoadSolutionAsync(solutionFiles.First());
                }

                var projectFiles = Directory.GetFiles(path, "*.csproj")
                    .Concat(Directory.GetFiles(path, "*.fsproj"))
                    .Concat(Directory.GetFiles(path, "*.vbproj"))
                    .ToArray();

                if (projectFiles.Any())
                {
                    return await LoadProjectAsync(projectFiles.First());
                }

                throw new FileNotFoundException($"No solution or project files found in {path}");
            }
        }
        catch (Exception ex)
        {
            return new WorkspaceInfo
            {
                ProjectPath = path,
                IsLoaded = false,
                LoadErrors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Load a solution
    /// </summary>
    private async Task<WorkspaceInfo> LoadSolutionAsync(string solutionPath)
    {
        if (_workspace == null) throw new InvalidOperationException("Workspace not initialized");

        try
        {
            _solution = await _workspace.OpenSolutionAsync(solutionPath);

            var info = new WorkspaceInfo
            {
                ProjectPath = solutionPath,
                ProjectName = Path.GetFileNameWithoutExtension(solutionPath),
                DocumentCount = _solution.Projects.Sum(p => p.Documents.Count()),
                IsLoaded = true
            };

            // Cache all projects
            foreach (var project in _solution.Projects)
            {
                _projectCache[project.FilePath ?? project.Name] = project;
            }

            return info;
        }
        catch (Exception ex)
        {
            return new WorkspaceInfo
            {
                ProjectPath = solutionPath,
                ProjectName = Path.GetFileNameWithoutExtension(solutionPath),
                IsLoaded = false,
                LoadErrors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Load a single project
    /// </summary>
    private async Task<WorkspaceInfo> LoadProjectAsync(string projectPath)
    {
        if (_workspace == null) throw new InvalidOperationException("Workspace not initialized");

        try
        {
            var project = await _workspace.OpenProjectAsync(projectPath);
            _projectCache[projectPath] = project;

            var compilation = await project.GetCompilationAsync();

            return new WorkspaceInfo
            {
                ProjectPath = projectPath,
                ProjectName = project.Name,
                TargetFramework = GetTargetFramework(project),
                AssemblyName = project.AssemblyName,
                DocumentCount = project.Documents.Count(),
                IsLoaded = true
            };
        }
        catch (Exception ex)
        {
            return new WorkspaceInfo
            {
                ProjectPath = projectPath,
                ProjectName = Path.GetFileNameWithoutExtension(projectPath),
                IsLoaded = false,
                LoadErrors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Get a document by file path
    /// </summary>
    public Document? GetDocument(string filePath)
    {
        if (_solution != null)
        {
            return _solution.Projects
                .SelectMany(p => p.Documents)
                .FirstOrDefault(d => string.Equals(d.FilePath, filePath, StringComparison.OrdinalIgnoreCase));
        }

        foreach (var project in _projectCache.Values)
        {
            var document = project.Documents
                .FirstOrDefault(d => string.Equals(d.FilePath, filePath, StringComparison.OrdinalIgnoreCase));
            if (document != null) return document;
        }

        return null;
    }

    /// <summary>
    /// Get semantic model for a file
    /// </summary>
    public async Task<SemanticModel?> GetSemanticModelAsync(string filePath)
    {
        var document = GetDocument(filePath);
        if (document == null) return null;

        var syntaxTree = await document.GetSyntaxTreeAsync();
        if (syntaxTree == null) return null;

        var compilation = await document.Project.GetCompilationAsync();
        if (compilation == null) return null;

        return compilation.GetSemanticModel(syntaxTree);
    }

    /// <summary>
    /// Get compilation for a project
    /// </summary>
    public async Task<Compilation?> GetCompilationAsync(string projectPath)
    {
        if (_projectCache.TryGetValue(projectPath, out var project))
        {
            return await project.GetCompilationAsync();
        }

        return null;
    }

    /// <summary>
    /// Update document content
    /// </summary>
    public async Task<bool> UpdateDocumentAsync(string filePath, string content)
    {
        try
        {
            var document = GetDocument(filePath);
            if (document == null) return false;

            var sourceText = Microsoft.CodeAnalysis.Text.SourceText.From(content);
            var updatedDocument = document.WithText(sourceText);

            // Update the solution
            if (_solution != null)
            {
                _solution = updatedDocument.Project.Solution;
            }

            // Update project cache
            _projectCache[document.Project.FilePath ?? document.Project.Name] = updatedDocument.Project;

            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Add a new document to the workspace
    /// </summary>
    public async Task<bool> AddDocumentAsync(string projectPath, string filePath, string content)
    {
        try
        {
            if (!_projectCache.TryGetValue(projectPath, out var project))
            {
                return false;
            }

            var sourceText = Microsoft.CodeAnalysis.Text.SourceText.From(content);
            var documentId = DocumentId.CreateNewId(project.Id);

            var newDocument = project.AddDocument(
                Path.GetFileName(filePath),
                sourceText,
                folders: null,
                filePath: filePath);

            // Get the updated project from the document
            var updatedProject = newDocument.Project;
            _projectCache[projectPath] = updatedProject;

            if (_solution != null)
            {
                _solution = newDocument.Project.Solution;
            }

            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Get all symbols in the workspace
    /// </summary>
    public async Task<List<ISymbol>> GetAllSymbolsAsync()
    {
        var symbols = new List<ISymbol>();

        if (_solution != null)
        {
            foreach (var project in _solution.Projects)
            {
                var compilation = await project.GetCompilationAsync();
                if (compilation != null)
                {
                    symbols.AddRange(GetSymbolsFromNamespace(compilation.GlobalNamespace));
                }
            }
        }
        else
        {
            foreach (var project in _projectCache.Values)
            {
                var compilation = await project.GetCompilationAsync();
                if (compilation != null)
                {
                    symbols.AddRange(GetSymbolsFromNamespace(compilation.GlobalNamespace));
                }
            }
        }

        return symbols;
    }

    /// <summary>
    /// Find symbols by name
    /// </summary>
    public async Task<List<ISymbol>> FindSymbolsAsync(string name)
    {
        var allSymbols = await GetAllSymbolsAsync();
        return allSymbols.Where(s => s.Name.Contains(name, StringComparison.OrdinalIgnoreCase)).ToList();
    }

    /// <summary>
    /// Get workspace diagnostic information
    /// </summary>
    public async Task<List<DiagnosticInfo>> GetWorkspaceDiagnosticsAsync()
    {
        var diagnostics = new List<DiagnosticInfo>();

        if (_solution != null)
        {
            foreach (var project in _solution.Projects)
            {
                var compilation = await project.GetCompilationAsync();
                if (compilation != null)
                {
                    foreach (var diagnostic in compilation.GetDiagnostics())
                    {
                        diagnostics.Add(ConvertDiagnostic(diagnostic));
                    }
                }
            }
        }

        return diagnostics;
    }

    /// <summary>
    /// Helper methods
    /// </summary>
    private string GetTargetFramework(Project project)
    {
        // Try to extract target framework from compilation options or project properties
        var compilation = project.GetCompilationAsync().Result;
        if (compilation != null)
        {
            // This is a simplified approach - in practice you might need to parse the project file
            return ".NET";
        }
        return "Unknown";
    }

    private IEnumerable<ISymbol> GetSymbolsFromNamespace(INamespaceSymbol namespaceSymbol)
    {
        foreach (var member in namespaceSymbol.GetMembers())
        {
            yield return member;

            if (member is INamespaceSymbol childNamespace)
            {
                foreach (var childSymbol in GetSymbolsFromNamespace(childNamespace))
                {
                    yield return childSymbol;
                }
            }
            else if (member is INamedTypeSymbol namedType)
            {
                foreach (var typeMember in namedType.GetMembers())
                {
                    yield return typeMember;
                }
            }
        }
    }

    private DiagnosticInfo ConvertDiagnostic(Diagnostic diagnostic)
    {
        var location = diagnostic.Location != Location.None && diagnostic.Location.IsInSource
            ? ConvertLocation(diagnostic.Location)
            : null;

        return new DiagnosticInfo
        {
            Id = diagnostic.Id,
            Severity = diagnostic.Severity.ToString(),
            Message = diagnostic.GetMessage(),
            Location = location,
            Category = diagnostic.Descriptor?.Category ?? "Unknown",
            WarningLevel = diagnostic.WarningLevel
        };
    }

    private CodeLocation ConvertLocation(Location location)
    {
        var span = location.GetLineSpan();
        return new CodeLocation
        {
            StartLine = span.StartLinePosition.Line + 1,
            EndLine = span.EndLinePosition.Line + 1,
            StartColumn = span.StartLinePosition.Character + 1,
            EndColumn = span.EndLinePosition.Character + 1,
            FilePath = span.Path ?? ""
        };
    }

    private void OnWorkspaceFailed(object? sender, WorkspaceDiagnosticEventArgs e)
    {
        Console.Error.WriteLine($"Workspace diagnostic: {e.Diagnostic.Kind} - {e.Diagnostic.Message}");
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            _workspace?.Dispose();
            _projectCache.Clear();
            _disposed = true;
        }
    }
}