using Newtonsoft.Json;

namespace CodeIndexer.RoslynSidecar.Models;

/// <summary>
/// JSON-RPC 2.0 request message
/// </summary>
public class JsonRpcRequest
{
    [JsonProperty("jsonrpc")]
    public string JsonRpc { get; set; } = "2.0";

    [JsonProperty("id")]
    public object? Id { get; set; }

    [JsonProperty("method")]
    public string Method { get; set; } = string.Empty;

    [JsonProperty("params")]
    public object? Params { get; set; }
}

/// <summary>
/// JSON-RPC 2.0 response message
/// </summary>
public class JsonRpcResponse
{
    [JsonProperty("jsonrpc")]
    public string JsonRpc { get; set; } = "2.0";

    [JsonProperty("id")]
    public object? Id { get; set; }

    [JsonProperty("result")]
    public object? Result { get; set; }

    [JsonProperty("error")]
    public JsonRpcError? Error { get; set; }
}

/// <summary>
/// JSON-RPC 2.0 error object
/// </summary>
public class JsonRpcError
{
    [JsonProperty("code")]
    public int Code { get; set; }

    [JsonProperty("message")]
    public string Message { get; set; } = string.Empty;

    [JsonProperty("data")]
    public object? Data { get; set; }
}

/// <summary>
/// JSON-RPC 2.0 notification message
/// </summary>
public class JsonRpcNotification
{
    [JsonProperty("jsonrpc")]
    public string JsonRpc { get; set; } = "2.0";

    [JsonProperty("method")]
    public string Method { get; set; } = string.Empty;

    [JsonProperty("params")]
    public object? Params { get; set; }
}

/// <summary>
/// Standard JSON-RPC error codes
/// </summary>
public static class JsonRpcErrorCodes
{
    public const int ParseError = -32700;
    public const int InvalidRequest = -32600;
    public const int MethodNotFound = -32601;
    public const int InvalidParams = -32602;
    public const int InternalError = -32603;

    // Application-specific error codes
    public const int WorkspaceNotLoaded = -32000;
    public const int FileNotFound = -32001;
    public const int CompilationError = -32002;
    public const int SemanticAnalysisError = -32003;
}