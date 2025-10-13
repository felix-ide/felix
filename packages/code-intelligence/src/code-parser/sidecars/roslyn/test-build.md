# Testing Roslyn Sidecar Build

## On Windows

### 1. Build the sidecar
```bash
cd packages/code-intelligence/src/code-parser/sidecars/roslyn
dotnet restore
dotnet build -c Release
```

### 2. Check for errors
If the build succeeds, you should see:
```
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

### 3. Test the executable
```bash
# Test direct file analysis
dotnet run -- analyze --file Program.cs

# Test stdio mode (what the service uses)
dotnet run -- stdio
# Then type: Content-Length: 58
#
# {"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
# (Press Ctrl+C to exit)
```

### 4. Check executable location
The built executable should be at:
```
bin/Release/net8.0/RoslynSidecar.exe
```

## Expected Output

If everything works, `dotnet run -- stdio` should:
1. Start without errors
2. Wait for JSON-RPC input on stdin
3. Send back an "initialized" notification after receiving initialize request

## Common Errors Fixed

- ❌ **Task ambiguous reference** - Fixed by disabling ImplicitUsings
- ❌ **Missing using statements** - Fixed by adding explicit usings
- ❌ **Platform-specific RuntimeIdentifier** - Removed win-x64 restriction
