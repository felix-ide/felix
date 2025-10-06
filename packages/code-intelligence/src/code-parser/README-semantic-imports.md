# JS/TS Semantics: TypeChecker + Import/Export Resolution

## Overview

This implementation adds semantic TypeScript Program + TypeChecker based import/export resolution for JavaScript/TypeScript files. The system now resolves IMPORTS_FROM edges to concrete component IDs and creates file→file DEPENDS_ON edges, supporting re-exports and tsconfig path mapping.

## Architecture

### Core Services

#### 1. TSModuleResolver (`services/TSModuleResolver.ts`)
- **Purpose**: Builds TypeScript Program once per workspace and resolves module specifiers to absolute file paths
- **Features**:
  - Workspace-scoped Program caching for performance
  - TSConfig path mapping support (`baseUrl`, `paths`)
  - Node.js module resolution fallback
  - External module detection
  - Intelligent caching with invalidation

#### 2. TSExportIndex (`services/TSExportIndex.ts`)
- **Purpose**: Indexes all exports from TypeScript/JavaScript files
- **Features**:
  - Default, named, and namespace export indexing
  - Re-export chain resolution with circular dependency protection
  - Component ID mapping for exports
  - Content-based caching for performance

#### 3. JavaScriptParserSemantic (`parsers/JavaScriptParserSemantic.ts`)
- **Purpose**: Enhanced parser that uses TypeChecker for semantic import resolution
- **Features**:
  - Resolves import targets to concrete component IDs
  - Creates file→file DEPENDS_ON relationships
  - Maintains per-file name→component mapping
  - Graceful handling of unresolved imports

## Key Improvements

### 1. Concrete Import Target Resolution

**Before:**
```typescript
{
  type: RelationshipType.IMPORTS_FROM,
  sourceId: "file-component-id",
  targetId: "./relative/path", // String module specifier
  metadata: { importedName: "foo" }
}
```

**After:**
```typescript
{
  type: RelationshipType.IMPORTS_FROM,
  sourceId: "file-component-id",
  targetId: "concrete-component-id-of-foo", // Actual component ID
  metadata: {
    importedName: "foo",
    resolvedPath: "/absolute/path/to/file.ts",
    isResolved: true,
    isNamed: true
  }
}
```

### 2. File Dependency Tracking

New DEPENDS_ON relationships track file-level dependencies:
```typescript
{
  type: RelationshipType.DEPENDS_ON,
  sourceId: "importing-file-component-id",
  targetId: "imported-file-component-id",
  metadata: {
    relationshipType: "file-dependency",
    sourceFile: "/path/to/importing/file.ts",
    targetFile: "/path/to/imported/file.ts"
  }
}
```

### 3. TSConfig Path Mapping

Supports TypeScript path aliases:
```json
{
  "baseUrl": ".",
  "paths": {
    "@app/*": ["src/*"],
    "@utils/*": ["src/utils/*"]
  }
}
```

Import `from '@utils/math'` resolves to `src/utils/math.ts`.

### 4. Re-export Chain Resolution

Barrel pattern support:
```typescript
// src/lib.ts
export const X = () => {};

// src/barrel.ts
export { X } from './lib';

// src/use.ts
import { X } from './barrel';
```

Import of `X` resolves through the barrel to the original component in `lib.ts`.

## Performance Optimizations

### 1. Program Caching
- TypeScript Program created once per workspace
- Reused across all files in the workspace
- Cache invalidation based on tsconfig changes

### 2. Export Index Caching
- Content-based caching using MD5 hashes
- LRU eviction with configurable size limits
- Background cache cleanup

### 3. Resolution Caching
- Module resolution results cached per specifier/file pair
- Automatic cleanup to prevent memory leaks
- Configurable cache timeouts

## Testing

### Unit Tests (`__tests__/ts/import-resolution.test.ts`)
Comprehensive test coverage for:
- Default export/import resolution
- Named export/import resolution
- Namespace import resolution
- Re-export chain resolution
- TSConfig path mapping
- Unresolved import handling
- Performance requirements (≤15% overhead)

### Integration Tests (`FileIndexingService.semantic.test.ts`)
End-to-end testing with real file system:
- Full workspace indexing with TypeChecker
- Concrete component ID resolution verification
- File→file DEPENDS_ON edge creation
- Performance benchmarking
- Error handling for unresolved imports

## Usage

### Basic Integration

```typescript
import { JavaScriptParserSemantic } from './parsers/JavaScriptParserSemantic';

const parser = new JavaScriptParserSemantic();

// Parse file with semantic analysis
const components = await parser.detectComponents(content, filePath);
const relationships = await parser.detectRelationships(components, content);

// Clear caches when needed
parser.clearCaches();
```

### With Custom TSConfig

```typescript
// Workspace root must contain tsconfig.json
const workspaceRoot = '/path/to/project';
const components = await parser.detectComponents(content, filePath);
```

## Migration Path

The semantic parser (`JavaScriptParserSemantic`) is implemented as a separate class to allow gradual migration:

1. **Phase 1**: Deploy alongside existing `JavaScriptParser`
2. **Phase 2**: A/B test performance and accuracy
3. **Phase 3**: Replace original parser in production
4. **Phase 4**: Remove legacy parser code

## Performance Requirements

- **Target**: TypeChecker path ≤ 15% slower than structural parsing
- **Actual**: Measured performance meets requirements for 100+ file projects
- **Optimizations**: Aggressive caching ensures subsequent parses are faster

## Error Handling

- **Unresolved Imports**: Tagged with `UNRESOLVED:` prefix and reason
- **External Modules**: Marked as external, no component ID resolution attempted
- **Circular Dependencies**: Detected and avoided in re-export resolution
- **Parse Failures**: Graceful degradation with warning logs

## Future Enhancements

1. **Incremental Updates**: Support for incremental re-parsing when files change
2. **Cross-Project Resolution**: Resolve imports across project boundaries
3. **Type-Aware Analysis**: Leverage TypeChecker for type-based relationships
4. **Performance Profiling**: Detailed metrics for optimization opportunities

## Acceptance Criteria ✅

All acceptance criteria from the original task have been met:

- ✅ Default export/import resolution with concrete component IDs
- ✅ Re-export chain resolution through barrel files
- ✅ TSConfig path alias support
- ✅ Namespace import handling with metadata
- ✅ File→file DEPENDS_ON edge creation
- ✅ Performance within 15% of baseline
- ✅ Graceful unresolved import handling
- ✅ Comprehensive test coverage