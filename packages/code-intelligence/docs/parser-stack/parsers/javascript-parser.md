# JavaScript/TypeScript Parser

The JavaScript/TypeScript parser provides comprehensive AST-based analysis for modern JavaScript and TypeScript code, including ES6+ features, JSX, React patterns, and framework-specific components.

## Overview

- **Language Support**: JavaScript, TypeScript, JSX, TSX
- **File Extensions**: `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`
- **Parser Type**: AST-based using `@typescript-eslint/parser` or `babel-parser`
- **Parsing Level**: Semantic
- **Mixed-Language**: Yes (in HTML, Markdown)
- **Incremental**: Yes
- **LSP Support**: Yes (TypeScript Language Server)

## Features

### Core Language Support

- **ES6+ Syntax**: Arrow functions, destructuring, template literals, modules
- **TypeScript**: Type annotations, interfaces, generics, decorators
- **JSX/TSX**: React components, props, event handlers
- **Modern Features**: Async/await, optional chaining, nullish coalescing
- **Framework Detection**: React, Vue, Angular patterns

### Component Extraction

The parser extracts various component types:

```typescript
// Function declarations and expressions
function regularFunction() {}
const arrowFunction = () => {};
const asyncFunction = async () => {};

// Class components
class MyComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }

  render() {
    return <div>{this.state.count}</div>;
  }
}

// React functional components
const FunctionalComponent = ({ name }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('Component mounted');
  }, []);

  return <div>Hello {name}!</div>;
};

// Variables and constants
const API_URL = 'https://api.example.com';
let currentUser = null;

// Type definitions (TypeScript)
interface User {
  id: number;
  name: string;
  email: string;
}

type Status = 'loading' | 'success' | 'error';

// Enums
enum Color {
  Red,
  Green,
  Blue
}
```

### Relationship Extraction

The parser identifies various relationships:

- **Function Calls**: Direct and indirect function invocations
- **Import/Export**: Module dependencies and exports
- **Inheritance**: Class extension and interface implementation
- **Component Usage**: React component usage patterns
- **Hook Dependencies**: useEffect dependencies, custom hooks
- **Variable Access**: Variable reads and writes
- **Property Access**: Object property access patterns

## Configuration Options

### Parser Options

```typescript
interface JavaScriptParserOptions extends ParserOptions {
  // Language features
  allowImportExportEverywhere?: boolean;
  allowAwaitOutsideFunction?: boolean;
  allowReturnOutsideFunction?: boolean;
  allowUndeclaredExports?: boolean;

  // JSX options
  jsxPragma?: string;              // Default: 'React'
  jsxPragmaFrag?: string;          // Default: 'Fragment'

  // TypeScript options
  typescript?: boolean;            // Enable TypeScript parsing
  decorators?: boolean;            // Enable decorator support

  // Framework detection
  detectReact?: boolean;           // Detect React patterns
  detectVue?: boolean;             // Detect Vue patterns
  detectAngular?: boolean;         // Detect Angular patterns

  // Performance options
  sourceType?: 'script' | 'module'; // Default: 'module'
  strictMode?: boolean;            // Enable strict mode parsing
}
```

### Usage Examples

```typescript
import { ParserFactory } from '@felix/code-intelligence/code-parser';

const factory = new ParserFactory();

// Basic JavaScript parsing
const jsResult = await factory.parseDocument('/src/app.js');

// TypeScript with decorators
const tsResult = await factory.parseDocument('/src/component.ts', undefined, {
  parserOptions: {
    typescript: true,
    decorators: true
  }
});

// React JSX component
const jsxResult = await factory.parseDocument('/src/Component.jsx', undefined, {
  parserOptions: {
    detectReact: true,
    jsxPragma: 'React'
  }
});
```

## Component Types

### Functions

```typescript
// Regular function
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Async function
async function fetchUserData(userId) {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}

// Arrow function
const multiply = (a, b) => a * b;

// Method in class
class Calculator {
  add(a, b) {
    return a + b;
  }
}
```

**Extracted Components:**
- Function declarations (`ComponentType.FUNCTION`)
- Method definitions (`ComponentType.METHOD`)
- Arrow function expressions (`ComponentType.FUNCTION`)
- Async functions with async metadata

### Classes

```typescript
// ES6 Class
class UserService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  async getUser(id) {
    const response = await fetch(`${this.apiUrl}/users/${id}`);
    return response.json();
  }

  static validateId(id) {
    return typeof id === 'number' && id > 0;
  }
}

// React Class Component
class UserProfile extends React.Component {
  constructor(props) {
    super(props);
    this.state = { loading: true };
  }

  componentDidMount() {
    this.loadUserData();
  }

  async loadUserData() {
    const user = await UserService.getUser(this.props.userId);
    this.setState({ user, loading: false });
  }

  render() {
    if (this.state.loading) {
      return <div>Loading...</div>;
    }

    return (
      <div>
        <h1>{this.state.user.name}</h1>
        <p>{this.state.user.email}</p>
      </div>
    );
  }
}
```

**Extracted Components:**
- Class declarations (`ComponentType.CLASS`)
- Constructor methods (`ComponentType.CONSTRUCTOR`)
- Instance methods (`ComponentType.METHOD`)
- Static methods (`ComponentType.METHOD` with static metadata)
- React lifecycle methods with framework metadata

### Variables and Constants

```typescript
// Constants
const API_ENDPOINTS = {
  users: '/api/users',
  posts: '/api/posts',
  comments: '/api/comments'
};

// Variables
let currentUser = null;
var globalConfig = {};

// Destructuring
const { name, email } = user;
const [first, second, ...rest] = items;

// Module exports
export const utilityFunction = () => {};
export default class DefaultClass {}
```

**Extracted Components:**
- Variable declarations (`ComponentType.VARIABLE`)
- Constants (`ComponentType.CONSTANT`)
- Destructuring assignments (`ComponentType.VARIABLE`)
- Export declarations (`ComponentType.EXPORT`)

### TypeScript-Specific Components

```typescript
// Interfaces
interface User {
  id: number;
  name: string;
  email: string;
  profile?: UserProfile;
}

// Type aliases
type Status = 'idle' | 'loading' | 'success' | 'error';
type EventHandler<T> = (event: T) => void;

// Enums
enum Color {
  Red = '#ff0000',
  Green = '#00ff00',
  Blue = '#0000ff'
}

// Generic functions
function identity<T>(arg: T): T {
  return arg;
}

// Decorators
@Component({
  selector: 'app-user',
  templateUrl: './user.component.html'
})
class UserComponent {
  @Input() userId: number;
  @Output() userSelected = new EventEmitter<User>();
}
```

**Extracted Components:**
- Interface declarations (`ComponentType.INTERFACE`)
- Type aliases (`ComponentType.TYPE`)
- Enum declarations (`ComponentType.ENUM`)
- Generic parameters with type metadata
- Decorators (`ComponentType.DECORATOR`)

## Relationship Types

### Import/Export Relationships

```typescript
// Named imports
import { Component, useState, useEffect } from 'react';
import { UserService } from './services/UserService';

// Default imports
import React from 'react';
import axios from 'axios';

// Namespace imports
import * as utils from './utils';

// Re-exports
export { UserService } from './services/UserService';
export * from './types';
```

**Extracted Relationships:**
- `IMPORTS`: Module import dependencies
- `EXPORTS`: Module export relationships
- `USES`: Symbol usage from imported modules

### Function Call Relationships

```typescript
function processUser(user) {
  // Function calls
  const validated = validateUser(user);
  const formatted = formatUserData(validated);

  // Method calls
  logger.info('Processing user', user.id);
  database.save(formatted);

  // Chained calls
  const result = api
    .fetchUser(user.id)
    .then(data => transformData(data))
    .catch(error => handleError(error));

  return result;
}
```

**Extracted Relationships:**
- `CALLS`: Function and method invocations
- `ACCESSES`: Property and variable access
- `USES`: Symbol usage patterns

### Class and Inheritance Relationships

```typescript
// Base class
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    console.log(`${this.name} makes a sound`);
  }
}

// Inheritance
class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }

  speak() {
    console.log(`${this.name} barks`);
  }
}

// Interface implementation (TypeScript)
interface Flyable {
  fly(): void;
}

class Bird extends Animal implements Flyable {
  fly() {
    console.log(`${this.name} flies`);
  }
}
```

**Extracted Relationships:**
- `EXTENDS`: Class inheritance
- `IMPLEMENTS`: Interface implementation
- `OVERRIDES`: Method overriding
- `CALLS`: Super method calls

## React-Specific Features

### Component Detection

```typescript
// Functional component
const UserCard = ({ user, onEdit }) => {
  const [editing, setEditing] = useState(false);

  const handleEdit = () => {
    setEditing(true);
    onEdit(user);
  };

  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <button onClick={handleEdit}>Edit</button>
    </div>
  );
};

// Class component
class UserList extends React.Component {
  state = {
    users: [],
    loading: true
  };

  async componentDidMount() {
    const users = await UserService.fetchAll();
    this.setState({ users, loading: false });
  }

  render() {
    const { users, loading } = this.state;

    if (loading) {
      return <LoadingSpinner />;
    }

    return (
      <div>
        {users.map(user => (
          <UserCard
            key={user.id}
            user={user}
            onEdit={this.handleEditUser}
          />
        ))}
      </div>
    );
  }

  handleEditUser = (user) => {
    // Edit logic
  };
}
```

**React-Specific Metadata:**
- Component type (functional/class)
- Props interface extraction
- Hook usage patterns
- Lifecycle method detection
- JSX element relationships

### Hook Analysis

```typescript
// Custom hook
function useUserData(userId) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      try {
        setLoading(true);
        const userData = await UserService.getUser(userId);

        if (!cancelled) {
          setUser(userData);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { user, loading, error };
}

// Hook usage
function UserProfile({ userId }) {
  const { user, loading, error } = useUserData(userId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

**Hook Metadata:**
- Hook dependencies tracking
- State variable relationships
- Effect cleanup analysis
- Custom hook composition

## Performance Optimization

### Parser Performance

The JavaScript parser is optimized for performance:

1. **AST Caching**: Parsed ASTs are cached based on content hash
2. **Incremental Updates**: Only re-parse changed portions
3. **Lazy Evaluation**: Skip expensive analysis until needed
4. **Parallel Processing**: Parse multiple files concurrently

### Large File Handling

```typescript
// For large files, use Tree-sitter parser
const result = await factory.parseDocument('/large/bundle.js', undefined, {
  preferTreeSitter: true,
  segmentationOnly: true
});

// Or limit parsing depth
const result = await factory.parseDocument('/complex/file.js', undefined, {
  parserOptions: {
    maxDepth: 10
  }
});
```

### Memory Management

```typescript
// Process files in batches for memory efficiency
const batchSize = 50;
const files = getAllJavaScriptFiles();

for (let i = 0; i < files.length; i += batchSize) {
  const batch = files.slice(i, i + batchSize);

  const results = await Promise.all(
    batch.map(file => factory.parseDocument(file))
  );

  // Process results immediately
  await processResults(results);

  // Allow garbage collection
  if (global.gc) global.gc();
}
```

## Error Handling

### Common Parse Errors

```typescript
const result = await factory.parseDocument('/src/broken.js');

// Check for syntax errors
const syntaxErrors = result.errors.filter(e => e.code === 'SYNTAX_ERROR');
syntaxErrors.forEach(error => {
  console.error(`Syntax error at line ${error.location?.startLine}: ${error.message}`);
});

// Check for type errors (TypeScript)
const typeErrors = result.errors.filter(e => e.code?.startsWith('TS'));
typeErrors.forEach(error => {
  console.error(`Type error: ${error.message}`);
});
```

### Graceful Degradation

```typescript
try {
  // Try full semantic parsing
  const result = await factory.parseDocument(filePath);
  return result;
} catch (error) {
  console.warn('AST parsing failed, falling back to Tree-sitter:', error);

  try {

    // Final fallback to Tree-sitter
    const result = await factory.parseDocument(filePath, undefined, {
      preferTreeSitter: true
    });
    return result;
  }
}
```

## Best Practices

### 1. Choose the Right Parsing Level

```typescript
// For quick analysis - use segmentation only
const quick = await factory.parseDocument(filePath, undefined, {
  segmentationOnly: true
});

// For detailed analysis - enable all features
const detailed = await factory.parseDocument(filePath, undefined, {
  enableInitialLinking: true,
  enableAggregation: true
});

// For performance-critical scenarios - use Tree-sitter
const fast = await factory.parseDocument(filePath, undefined, {
  preferTreeSitter: true
});
```

### 2. Handle Mixed-Language Files

```typescript
// HTML with embedded JavaScript
const htmlResult = await factory.parseDocument('/template.html');

// Separate components by language
const htmlComponents = htmlResult.components.filter(c => c.language === 'html');
const jsComponents = htmlResult.components.filter(c => c.language === 'javascript');

// Find cross-language relationships
const crossLangRels = htmlResult.relationships.filter(rel => {
  const source = htmlResult.components.find(c => c.id === rel.sourceId);
  const target = htmlResult.components.find(c => c.id === rel.targetId);
  return source?.language !== target?.language;
});
```

### 3. Framework-Specific Analysis

```typescript
// React project analysis
const reactFiles = await findReactFiles(projectRoot);

const results = await Promise.all(
  reactFiles.map(file =>
    factory.parseDocument(file, undefined, {
      parserOptions: {
        detectReact: true,
        jsxPragma: 'React'
      }
    })
  )
);

// Extract React-specific patterns
const components = results.flatMap(r =>
  r.components.filter(c => c.metadata?.framework === 'react')
);

const hooks = results.flatMap(r =>
  r.components.filter(c => c.metadata?.isHook)
);
```

The JavaScript/TypeScript parser provides comprehensive analysis capabilities for modern JavaScript development, with special support for popular frameworks and TypeScript features. Its AST-based approach ensures high accuracy while maintaining good performance through caching and incremental parsing strategies.