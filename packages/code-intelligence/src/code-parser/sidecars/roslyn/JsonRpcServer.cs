using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using CodeIndexer.RoslynSidecar.Models;
using System.Text;

namespace CodeIndexer.RoslynSidecar;

/// <summary>
/// JSON-RPC 2.0 server implementation for stdio communication
/// </summary>
public class JsonRpcServer
{
    private readonly Dictionary<string, Func<JToken?, Task<object?>>> _methods = new();
    private readonly SemaphoreSlim _outputSemaphore = new(1, 1);
    private bool _running = false;

    public JsonRpcServer()
    {
        RegisterMethod("initialize", InitializeAsync);
        RegisterMethod("shutdown", ShutdownAsync);
        RegisterMethod("exit", ExitAsync);
    }

    /// <summary>
    /// Register a method handler
    /// </summary>
    public void RegisterMethod(string methodName, Func<JToken?, Task<object?>> handler)
    {
        _methods[methodName] = handler;
    }

    /// <summary>
    /// Start the JSON-RPC server loop
    /// </summary>
    public async Task StartAsync(CancellationToken cancellationToken = default)
    {
        _running = true;

        try
        {
            while (_running && !cancellationToken.IsCancellationRequested)
            {
                var message = await ReadMessageAsync(cancellationToken);
                if (message == null) break;

                // Process message in background to avoid blocking the read loop
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await ProcessMessageAsync(message);
                    }
                    catch (Exception ex)
                    {
                        await SendErrorAsync(null, JsonRpcErrorCodes.InternalError,
                            $"Unhandled error processing message: {ex.Message}");
                    }
                }, cancellationToken);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Expected cancellation
        }
        catch (Exception ex)
        {
            await SendErrorAsync(null, JsonRpcErrorCodes.InternalError,
                $"Server error: {ex.Message}");
        }
    }

    /// <summary>
    /// Send a notification to the client
    /// </summary>
    public async Task SendNotificationAsync(string method, object? parameters = null)
    {
        var notification = new JsonRpcNotification
        {
            Method = method,
            Params = parameters
        };

        await SendMessageAsync(notification);
    }

    /// <summary>
    /// Read a JSON-RPC message from stdin
    /// </summary>
    private async Task<string?> ReadMessageAsync(CancellationToken cancellationToken)
    {
        try
        {
            var contentLengthHeader = await Console.In.ReadLineAsync();
            if (contentLengthHeader == null) return null;

            if (!contentLengthHeader.StartsWith("Content-Length: "))
            {
                // Try to read as raw JSON for simple testing
                if (contentLengthHeader.StartsWith("{"))
                {
                    return contentLengthHeader;
                }
                return null;
            }

            var contentLength = int.Parse(contentLengthHeader.Substring("Content-Length: ".Length));

            // Read the empty line
            await Console.In.ReadLineAsync();

            // Read the content
            var buffer = new char[contentLength];
            var totalRead = 0;
            while (totalRead < contentLength)
            {
                var read = await Console.In.ReadAsync(buffer, totalRead, contentLength - totalRead);
                if (read == 0) break;
                totalRead += read;
            }

            return new string(buffer, 0, totalRead);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(null, JsonRpcErrorCodes.ParseError,
                $"Failed to read message: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// Process a JSON-RPC message
    /// </summary>
    private async Task ProcessMessageAsync(string message)
    {
        try
        {
            var request = JsonConvert.DeserializeObject<JsonRpcRequest>(message);
            if (request == null)
            {
                await SendErrorAsync(null, JsonRpcErrorCodes.InvalidRequest, "Invalid request format");
                return;
            }

            if (!_methods.TryGetValue(request.Method, out var handler))
            {
                await SendErrorAsync(request.Id, JsonRpcErrorCodes.MethodNotFound,
                    $"Method '{request.Method}' not found");
                return;
            }

            try
            {
                var result = await handler(request.Params as JToken);

                if (request.Id != null) // Don't send response for notifications
                {
                    await SendResponseAsync(request.Id, result);
                }
            }
            catch (Exception ex)
            {
                await SendErrorAsync(request.Id, JsonRpcErrorCodes.InternalError,
                    ex.Message, ex.StackTrace);
            }
        }
        catch (JsonException ex)
        {
            await SendErrorAsync(null, JsonRpcErrorCodes.ParseError,
                $"JSON parse error: {ex.Message}");
        }
    }

    /// <summary>
    /// Send a response message
    /// </summary>
    private async Task SendResponseAsync(object? id, object? result)
    {
        var response = new JsonRpcResponse
        {
            Id = id,
            Result = result
        };

        await SendMessageAsync(response);
    }

    /// <summary>
    /// Send an error response
    /// </summary>
    private async Task SendErrorAsync(object? id, int errorCode, string message, object? data = null)
    {
        var response = new JsonRpcResponse
        {
            Id = id,
            Error = new JsonRpcError
            {
                Code = errorCode,
                Message = message,
                Data = data
            }
        };

        await SendMessageAsync(response);
    }

    /// <summary>
    /// Send a message to stdout with Content-Length header
    /// </summary>
    private async Task SendMessageAsync(object message)
    {
        await _outputSemaphore.WaitAsync();
        try
        {
            var json = JsonConvert.SerializeObject(message, Formatting.None);
            var contentLength = Encoding.UTF8.GetByteCount(json);

            await Console.Out.WriteLineAsync($"Content-Length: {contentLength}");
            await Console.Out.WriteLineAsync();
            await Console.Out.WriteAsync(json);
            await Console.Out.FlushAsync();
        }
        finally
        {
            _outputSemaphore.Release();
        }
    }

    /// <summary>
    /// Default method handlers
    /// </summary>
    private async Task<object?> InitializeAsync(JToken? parameters)
    {
        await SendNotificationAsync("initialized");
        return new { capabilities = GetServerCapabilities() };
    }

    private async Task<object?> ShutdownAsync(JToken? parameters)
    {
        _running = false;
        return null;
    }

    private async Task<object?> ExitAsync(JToken? parameters)
    {
        Environment.Exit(0);
        return null;
    }

    /// <summary>
    /// Get server capabilities
    /// </summary>
    private object GetServerCapabilities()
    {
        return new
        {
            textDocumentSync = new { openClose = true, change = 2, save = true },
            documentSymbolProvider = true,
            workspaceSymbolProvider = true,
            definitionProvider = true,
            referencesProvider = true,
            hoverProvider = true,
            completionProvider = new { triggerCharacters = new[] { "." } },
            semanticAnalysisProvider = true,
            controlFlowProvider = true,
            dataFlowProvider = true,
            typeHierarchyProvider = true
        };
    }

    public void Stop()
    {
        _running = false;
    }
}