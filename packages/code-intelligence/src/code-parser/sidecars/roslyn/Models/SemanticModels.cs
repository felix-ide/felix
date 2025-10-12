using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace CodeIndexer.RoslynSidecar.Models;

/// <summary>
/// Location information for code elements
/// </summary>
public class CodeLocation
{
    [JsonProperty("startLine")]
    public int StartLine { get; set; }

    [JsonProperty("endLine")]
    public int EndLine { get; set; }

    [JsonProperty("startColumn")]
    public int StartColumn { get; set; }

    [JsonProperty("endColumn")]
    public int EndColumn { get; set; }

    [JsonProperty("filePath")]
    public string FilePath { get; set; } = string.Empty;
}

/// <summary>
/// Code symbol information extracted from Roslyn semantic model
/// </summary>
public class CodeSymbol
{
    [JsonProperty("id")]
    public string Id { get; set; } = string.Empty;

    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("kind")]
    public string Kind { get; set; } = string.Empty;

    [JsonProperty("type")]
    public string? Type { get; set; }

    [JsonProperty("location")]
    public CodeLocation? Location { get; set; }

    [JsonProperty("accessibility")]
    public string? Accessibility { get; set; }

    [JsonProperty("isStatic")]
    public bool IsStatic { get; set; }

    [JsonProperty("isAbstract")]
    public bool IsAbstract { get; set; }

    [JsonProperty("isVirtual")]
    public bool IsVirtual { get; set; }

    [JsonProperty("isOverride")]
    public bool IsOverride { get; set; }

    [JsonProperty("isSealed")]
    public bool IsSealed { get; set; }

    [JsonProperty("isPartial")]
    public bool IsPartial { get; set; }

    [JsonProperty("isAsync")]
    public bool IsAsync { get; set; }

    [JsonProperty("isGeneric")]
    public bool IsGeneric { get; set; }

    [JsonProperty("genericParameters")]
    public List<string> GenericParameters { get; set; } = new();

    [JsonProperty("parameters")]
    public List<ParameterInfo> Parameters { get; set; } = new();

    [JsonProperty("returnType")]
    public string? ReturnType { get; set; }

    [JsonProperty("namespace")]
    public string? Namespace { get; set; }

    [JsonProperty("containingType")]
    public string? ContainingType { get; set; }

    [JsonProperty("documentation")]
    public string? Documentation { get; set; }

    [JsonProperty("attributes")]
    public List<AttributeInfo> Attributes { get; set; } = new();

    [JsonProperty("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// Parameter information for methods and constructors
/// </summary>
public class ParameterInfo
{
    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("type")]
    public string Type { get; set; } = string.Empty;

    [JsonProperty("hasDefaultValue")]
    public bool HasDefaultValue { get; set; }

    [JsonProperty("defaultValue")]
    public string? DefaultValue { get; set; }

    [JsonProperty("isParams")]
    public bool IsParams { get; set; }

    [JsonProperty("isOptional")]
    public bool IsOptional { get; set; }

    [JsonProperty("refKind")]
    public string? RefKind { get; set; }
}

/// <summary>
/// Attribute information
/// </summary>
public class AttributeInfo
{
    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("arguments")]
    public List<string> Arguments { get; set; } = new();
}

/// <summary>
/// Type hierarchy information
/// </summary>
public class TypeHierarchy
{
    [JsonProperty("symbolId")]
    public string SymbolId { get; set; } = string.Empty;

    [JsonProperty("baseType")]
    public string? BaseType { get; set; }

    [JsonProperty("interfaces")]
    public List<string> Interfaces { get; set; } = new();

    [JsonProperty("derivedTypes")]
    public List<string> DerivedTypes { get; set; } = new();

    [JsonProperty("members")]
    public List<string> Members { get; set; } = new();
}

/// <summary>
/// Control flow graph node
/// </summary>
public class ControlFlowNode
{
    [JsonProperty("id")]
    public string Id { get; set; } = string.Empty;

    [JsonProperty("kind")]
    public string Kind { get; set; } = string.Empty;

    [JsonProperty("location")]
    public CodeLocation? Location { get; set; }

    [JsonProperty("predecessors")]
    public List<string> Predecessors { get; set; } = new();

    [JsonProperty("successors")]
    public List<string> Successors { get; set; } = new();

    [JsonProperty("statements")]
    public List<string> Statements { get; set; } = new();

    [JsonProperty("isReachable")]
    public bool IsReachable { get; set; }
}

/// <summary>
/// Data flow analysis result
/// </summary>
public class DataFlowAnalysis
{
    [JsonProperty("variablesRead")]
    public List<string> VariablesRead { get; set; } = new();

    [JsonProperty("variablesWritten")]
    public List<string> VariablesWritten { get; set; } = new();

    [JsonProperty("definitelyAssigned")]
    public List<string> DefinitelyAssigned { get; set; } = new();

    [JsonProperty("alwaysAssigned")]
    public List<string> AlwaysAssigned { get; set; } = new();

    [JsonProperty("dataFlowsIn")]
    public List<string> DataFlowsIn { get; set; } = new();

    [JsonProperty("dataFlowsOut")]
    public List<string> DataFlowsOut { get; set; } = new();
}

/// <summary>
/// Diagnostic information from compilation
/// </summary>
public class DiagnosticInfo
{
    [JsonProperty("id")]
    public string Id { get; set; } = string.Empty;

    [JsonProperty("severity")]
    public string Severity { get; set; } = string.Empty;

    [JsonProperty("message")]
    public string Message { get; set; } = string.Empty;

    [JsonProperty("location")]
    public CodeLocation? Location { get; set; }

    [JsonProperty("category")]
    public string Category { get; set; } = string.Empty;

    [JsonProperty("warningLevel")]
    public int WarningLevel { get; set; }
}

/// <summary>
/// Semantic analysis result
/// </summary>
public class SemanticAnalysisResult
{
    [JsonProperty("symbols")]
    public List<CodeSymbol> Symbols { get; set; } = new();

    [JsonProperty("diagnostics")]
    public List<DiagnosticInfo> Diagnostics { get; set; } = new();

    [JsonProperty("typeHierarchies")]
    public List<TypeHierarchy> TypeHierarchies { get; set; } = new();

    [JsonProperty("controlFlowGraph")]
    public List<ControlFlowNode> ControlFlowGraph { get; set; } = new();

    [JsonProperty("dataFlow")]
    public DataFlowAnalysis? DataFlow { get; set; }

    [JsonProperty("filePath")]
    public string FilePath { get; set; } = string.Empty;

    [JsonProperty("processingTime")]
    public long ProcessingTimeMs { get; set; }
}

/// <summary>
/// Workspace information
/// </summary>
public class WorkspaceInfo
{
    [JsonProperty("projectPath")]
    public string ProjectPath { get; set; } = string.Empty;

    [JsonProperty("projectName")]
    public string ProjectName { get; set; } = string.Empty;

    [JsonProperty("targetFramework")]
    public string TargetFramework { get; set; } = string.Empty;

    [JsonProperty("assemblyName")]
    public string AssemblyName { get; set; } = string.Empty;

    [JsonProperty("documentCount")]
    public int DocumentCount { get; set; }

    [JsonProperty("isLoaded")]
    public bool IsLoaded { get; set; }

    [JsonProperty("loadErrors")]
    public List<string> LoadErrors { get; set; } = new();
}