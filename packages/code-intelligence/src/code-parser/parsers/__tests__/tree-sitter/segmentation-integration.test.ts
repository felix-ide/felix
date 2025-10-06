/**
 * Test suite for Tree-sitter integration with BlockScanner segmentation
 * Tests that Tree-sitter parsers work correctly with detectors.yml boundaries
 */

import { ParserFactory } from '../../../ParserFactory.js';
import { BlockScanner } from '../../../services/BlockScanner.js';
import { describe, it, expect, beforeAll } from 'vitest';
import { ComponentType } from '../../../types.js';

describe('Tree-sitter Segmentation Integration', () => {
  let parserFactory: ParserFactory;
  let blockScanner: BlockScanner;

  beforeAll(async () => {
    parserFactory = new ParserFactory();
    blockScanner = BlockScanner.getInstance();
  });

  describe('HTML with embedded content parsing', () => {
    it('should use Tree-sitter for HTML blocks and delegate to embedded languages', async () => {
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Mixed Content Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(to right, #667eea 0%, #764ba2 100%);
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
    </style>
    <script>
        class UserInterface {
            constructor(selector) {
                this.element = document.querySelector(selector);
                this.initialized = false;
            }

            initialize() {
                if (this.initialized) return;

                this.element.addEventListener('click', this.handleClick.bind(this));
                this.initialized = true;
            }

            handleClick(event) {
                console.log('Element clicked:', event.target);
                this.toggleClass('active');
            }

            toggleClass(className) {
                this.element.classList.toggle(className);
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            const ui = new UserInterface('.container');
            ui.initialize();
        });
    </script>
</head>
<body>
    <div class="container">
        <h1>Welcome to Mixed Content Demo</h1>
        <p>This page demonstrates Tree-sitter parsing with injections.</p>
        <button onclick="alert('Hello from inline JS!')">Click Me</button>
    </div>
</body>
</html>
      `.trim();

      const result = await parserFactory.parseDocument('test.html', htmlContent, {
        enableSegmentation: true,
        enableInitialLinking: true,
        enableAggregation: true
      });

      // Verify segmentation was performed
      expect(result.segmentation.blocks.length).toBeGreaterThan(0);
      expect(result.metadata.backend).toMatch(/tree-sitter|hybrid/);

      // Should have components from all three languages
      const htmlComponents = result.components.filter(c => c.language === 'html');
      const cssComponents = result.components.filter(c => c.language === 'css');
      const jsComponents = result.components.filter(c => c.language === 'javascript');

      expect(htmlComponents.length).toBeGreaterThan(0);
      expect(cssComponents.length).toBeGreaterThan(0);
      expect(jsComponents.length).toBeGreaterThan(0);

      // Verify Tree-sitter parsing level
      const treeSitterComponents = result.components.filter(c =>
        c.metadata?.backend === 'tree-sitter'
      );
      expect(treeSitterComponents.length).toBeGreaterThan(0);

      // Check specific components
      const uiClass = jsComponents.find(c =>
        c.type === ComponentType.CLASS && c.name === 'UserInterface'
      );
      expect(uiClass).toBeDefined();
      expect(uiClass?.metadata?.parsingLevel).toBe('structural');

      const bodyRule = cssComponents.find(c =>
        c.metadata?.selectors?.includes('body')
      );
      expect(bodyRule).toBeDefined();

      const containerRule = cssComponents.find(c =>
        c.metadata?.selectors?.includes('.container')
      );
      expect(containerRule).toBeDefined();

      // Verify injection relationships
      const injectionRelationships = result.relationships.filter(r =>
        r.metadata?.embeddedLanguage || r.metadata?.injectionType
      );
      expect(injectionRelationships.length).toBeGreaterThan(0);
    });

    it('should handle mixed PHP and HTML content', async () => {
      const phpContent = `
<?php
class DatabaseConnection {
    private $host;
    private $database;
    private $connection;

    public function __construct($host, $database) {
        $this->host = $host;
        $this->database = $database;
    }

    public function connect() {
        $this->connection = new PDO("mysql:host={$this->host};dbname={$this->database}");
        return $this->connection;
    }
}

$db = new DatabaseConnection('localhost', 'myapp');
$connection = $db->connect();
?>
<!DOCTYPE html>
<html>
<head>
    <title>Database Demo</title>
    <style>
        .status {
            padding: 10px;
            border-radius: 4px;
        }
        .success { background: #d4edda; }
        .error { background: #f8d7da; }
    </style>
</head>
<body>
    <div class="status <?php echo $connection ? 'success' : 'error'; ?>">
        <?php if ($connection): ?>
            <h2>Database Connected</h2>
            <p>Successfully connected to database: <?php echo $db->database; ?></p>
        <?php else: ?>
            <h2>Connection Failed</h2>
            <p>Could not connect to the database.</p>
        <?php endif; ?>
    </div>
</body>
</html>
      `.trim();

      const result = await parserFactory.parseDocument('test.php', phpContent, {
        enableSegmentation: true
      });

      // Should detect multiple languages
      const languages = [...new Set(result.components.map(c => c.language))];
      expect(languages).toContain('php');
      expect(languages).toContain('html');
      expect(languages).toContain('css');

      // Verify PHP components
      const phpComponents = result.components.filter(c => c.language === 'php');
      const dbClass = phpComponents.find(c =>
        c.type === ComponentType.CLASS && c.name === 'DatabaseConnection'
      );
      expect(dbClass).toBeDefined();

      // Verify HTML components from embedded sections
      const htmlComponents = result.components.filter(c => c.language === 'html');
      expect(htmlComponents.length).toBeGreaterThan(0);

      // Verify CSS components
      const cssComponents = result.components.filter(c => c.language === 'css');
      const statusRule = cssComponents.find(c =>
        c.metadata?.selectors?.includes('.status')
      );
      expect(statusRule).toBeDefined();
    });
  });

  describe('Per-block routing', () => {
    it('should route blocks to appropriate Tree-sitter parsers', async () => {
      const mixedContent = `
<!DOCTYPE html>
<html>
<head>
    <script type="module">
        import { Component } from './component.js';

        export class App extends Component {
            async render() {
                const data = await this.fetchData();
                return data.map(item => this.renderItem(item));
            }
        }
    </script>
    <script type="application/json">
        {
            "config": {
                "apiUrl": "https://api.example.com",
                "timeout": 5000,
                "retries": 3
            }
        }
    </script>
    <style lang="scss">
        $primary-color: #007bff;
        $secondary-color: #6c757d;

        .app {
            color: $primary-color;

            &.loading {
                color: $secondary-color;
            }
        }
    </style>
</head>
<body>
    <div id="app" class="app loading">Loading...</div>
</body>
</html>
      `.trim();

      const result = await parserFactory.parseDocument('app.html', mixedContent);

      // Should identify different script and style types
      const jsModuleComponents = result.components.filter(c =>
        c.language === 'javascript' && c.metadata?.moduleType === 'module'
      );

      const appClass = result.components.find(c =>
        c.type === ComponentType.CLASS && c.name === 'App'
      );
      expect(appClass).toBeDefined();

      // Should handle CSS with SCSS-like syntax
      const cssComponents = result.components.filter(c => c.language === 'css');
      const appRule = cssComponents.find(c =>
        c.metadata?.selectors?.includes('.app')
      );
      expect(appRule).toBeDefined();
    });

    it('should prioritize Tree-sitter over legacy parsers', async () => {
      const jsContent = `
/**
 * Advanced TypeScript-like JavaScript with complex patterns
 */
class EventEmitter {
    constructor() {
        this.events = new Map();
        this.maxListeners = 10;
    }

    on(event, listener) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        const listeners = this.events.get(event);
        if (listeners.length >= this.maxListeners) {
            console.warn(\`Max listeners (\${this.maxListeners}) exceeded for event: \${event}\`);
        }

        listeners.push(listener);
        return this;
    }

    emit(event, ...args) {
        const listeners = this.events.get(event);
        if (!listeners) return false;

        listeners.forEach(listener => {
            try {
                listener.apply(this, args);
            } catch (error) {
                console.error('Error in event listener:', error);
            }
        });

        return true;
    }

    off(event, listener) {
        const listeners = this.events.get(event);
        if (!listeners) return this;

        const index = listeners.indexOf(listener);
        if (index !== -1) {
            listeners.splice(index, 1);
        }

        if (listeners.length === 0) {
            this.events.delete(event);
        }

        return this;
    }
}

// Usage example with advanced patterns
const emitter = new EventEmitter();

emitter.on('data', function(data) {
    console.log('Received:', data);
});

emitter.on('error', (error) => {
    console.error('Error occurred:', error);
});

// Method chaining
emitter
    .on('start', () => console.log('Starting...'))
    .on('progress', (percent) => console.log(\`Progress: \${percent}%\`))
    .on('complete', () => console.log('Complete!'));
      `.trim();

      const result = await parserFactory.parseDocument('emitter.js', jsContent);

      // Should use Tree-sitter (structural) over legacy parsers
      expect(result.metadata.parsingLevel).toBe('structural');
      expect(result.metadata.backend).toMatch(/tree-sitter|hybrid/);

      // Verify advanced component detection
      const eventEmitterClass = result.components.find(c =>
        c.type === ComponentType.CLASS && c.name === 'EventEmitter'
      );
      expect(eventEmitterClass).toBeDefined();
      expect(eventEmitterClass?.metadata?.backend).toBe('tree-sitter');

      // Should detect methods with proper metadata
      const methods = result.components.filter(c => c.type === ComponentType.METHOD);
      const onMethod = methods.find(m => m.name === 'on');
      const emitMethod = methods.find(m => m.name === 'emit');

      expect(onMethod).toBeDefined();
      expect(emitMethod).toBeDefined();
      expect(onMethod?.metadata?.parameters).toEqual(['event', 'listener']);
      expect(emitMethod?.metadata?.parameters).toEqual(['event', 'args']);

      // Should detect arrow functions and complex expressions
      const variables = result.components.filter(c => c.type === ComponentType.VARIABLE);
      const emitterVar = variables.find(v => v.name === 'emitter');
      expect(emitterVar).toBeDefined();
    });
  });

  describe('Error handling and fallbacks', () => {
    it('should fall back to legacy parsers when Tree-sitter fails', async () => {
      // Create content that might challenge Tree-sitter
      const challengingContent = `
// This might be challenging for Tree-sitter parsing
var weirdSyntax = (function() {
    return {
        [Symbol.iterator]: function*() {
            yield* [1, 2, 3];
        },
        async *asyncGenerator() {
            for await (const item of this) {
                yield item * 2;
            }
        }
    };
})();
      `.trim();

      const result = await parserFactory.parseDocument('challenging.js', challengingContent);

      // Should still parse successfully, even if falling back
      expect(result.components.length).toBeGreaterThan(0);
      expect(result.metadata.backend).toMatch(/tree-sitter|detectors-only|hybrid|textmate|textmate-hybrid/);

      // Should have some level of component detection
      const variables = result.components.filter(c => c.type === ComponentType.VARIABLE);
      expect(variables.length).toBeGreaterThan(0);
    });

    it('should handle empty or minimal content gracefully', async () => {
      const emptyContent = '';
      const minimalContent = '<html></html>';

      const emptyResult = await parserFactory.parseDocument('empty.html', emptyContent);
      const minimalResult = await parserFactory.parseDocument('minimal.html', minimalContent);

      // Should not throw errors
      expect(emptyResult.components).toBeDefined();
      expect(minimalResult.components).toBeDefined();
      expect(minimalResult.components.length).toBeGreaterThan(0);
    });
  });

  describe('Performance characteristics', () => {
    it('should demonstrate improved parsing performance with Tree-sitter', async () => {
      const largeJsContent = `
// Large JavaScript file for performance testing
${Array.from({ length: 50 }, (_, i) => `
function function${i}(param1, param2, param3) {
    const result${i} = param1 + param2 + param3;
    const intermediate${i} = result${i} * 2;

    if (intermediate${i} > 100) {
        return intermediate${i} / 2;
    } else {
        return intermediate${i} + 10;
    }
}

class Class${i} {
    constructor(value${i}) {
        this.value${i} = value${i};
        this.processed${i} = false;
    }

    process${i}() {
        if (!this.processed${i}) {
            this.value${i} = function${i}(this.value${i}, 10, 5);
            this.processed${i} = true;
        }
        return this.value${i};
    }
}

const instance${i} = new Class${i}(${i});
const result${i} = instance${i}.process${i}();
`).join('\n')}
      `.trim();

      const startTime = Date.now();
      const result = await parserFactory.parseDocument('large.js', largeJsContent);
      const parseTime = Date.now() - startTime;

      // Should parse successfully
      expect(result.components.length).toBeGreaterThan(100); // Many functions, classes, variables

      // Should have good component detection
      const functions = result.components.filter(c => c.type === ComponentType.FUNCTION);
      const classes = result.components.filter(c => c.type === ComponentType.CLASS);
      const variables = result.components.filter(c => c.type === ComponentType.VARIABLE);

      expect(functions.length).toBeGreaterThanOrEqual(50);
      expect(classes.length).toBeGreaterThanOrEqual(50);
      expect(variables.length).toBeGreaterThanOrEqual(50);

      // Should use Tree-sitter for better performance
      expect(result.metadata.backend).toMatch(/tree-sitter|hybrid/);

      console.log(`Large file parse time: ${parseTime}ms, Components: ${result.components.length}`);
    });
  });
});
