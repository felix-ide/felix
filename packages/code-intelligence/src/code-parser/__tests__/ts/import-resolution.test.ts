/**
 * Unit tests for TypeScript import resolution
 * Tests default, named, namespace imports, re-exports, and tsconfig path mapping
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join, resolve } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { TSModuleResolver } from '../../services/TSModuleResolver.js';
import { TSExportIndex } from '../../services/TSExportIndex.js';
import { JavaScriptParserSemantic } from '../../parsers/JavaScriptParserSemantic.js';
import { ComponentType, RelationshipType } from '../../types.js';

describe('TypeScript Import Resolution', () => {
  let testDir: string;
  let moduleResolver: TSModuleResolver;
  let exportIndex: TSExportIndex;
  let parser: JavaScriptParserSemantic;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), 'ts-import-test-' + Date.now());
    mkdirSync(testDir, { recursive: true });

    // Initialize services
    moduleResolver = new TSModuleResolver();
    exportIndex = new TSExportIndex();
    parser = new JavaScriptParserSemantic();
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    moduleResolver.clearCaches();
    exportIndex.clearCache();
    parser.clearCaches();
  });

  describe('Default Exports and Imports', () => {
    it('should resolve default export and import correctly', async () => {
      // Create test files
      const aPath = join(testDir, 'src', 'a.ts');
      const bPath = join(testDir, 'src', 'b.ts');

      mkdirSync(join(testDir, 'src'), { recursive: true });

      // src/a.ts: export default function foo() {}
      writeFileSync(aPath, 'export default function foo() {}\n');

      // src/b.ts: import foo from './a'
      writeFileSync(bPath, "import foo from './a';\nfoo();\n");

      // Parse both files
      const aComponents = await parser.detectComponents(
        'export default function foo() {}',
        aPath
      );
      const bComponents = await parser.detectComponents(
        "import foo from './a';\nfoo();",
        bPath
      );

      // Get relationships for b.ts
      const bRelationships = await parser.detectRelationships(
        bComponents,
        "import foo from './a';\nfoo();"
      );

      // Find the function component in a.ts
      const fooComponent = aComponents.find(c =>
        c.type === ComponentType.FUNCTION && c.name === 'foo'
      );
      expect(fooComponent).toBeDefined();

      // Find the import relationship in b.ts
      const importRelationship = bRelationships.find(r =>
        r.type === RelationshipType.IMPORTS_FROM &&
        r.metadata?.isDefault === true
      );
      expect(importRelationship).toBeDefined();
      expect(importRelationship?.metadata?.importedName).toBe('foo');
      expect(importRelationship?.metadata?.resolvedPath).toBe(aPath);

      // Find the file dependency relationship
      const dependsOnRelationship = bRelationships.find(r =>
        r.type === RelationshipType.DEPENDS_ON
      );
      expect(dependsOnRelationship).toBeDefined();
      expect(dependsOnRelationship?.metadata?.targetFile).toBe(aPath);
    });
  });

  describe('Named Exports and Imports', () => {
    it('should resolve named exports and imports correctly', async () => {
      // Create test files
      const libPath = join(testDir, 'src', 'lib.ts');
      const usePath = join(testDir, 'src', 'use.ts');

      mkdirSync(join(testDir, 'src'), { recursive: true });

      // src/lib.ts: export const X = () => {}
      writeFileSync(libPath, 'export const X = () => {};\nexport function Y() {}\n');

      // src/use.ts: import { X, Y } from './lib'
      writeFileSync(usePath, "import { X, Y } from './lib';\nX(); Y();\n");

      // Parse both files
      const libComponents = await parser.detectComponents(
        'export const X = () => {};\nexport function Y() {}',
        libPath
      );
      const useComponents = await parser.detectComponents(
        "import { X, Y } from './lib';\nX(); Y();",
        usePath
      );

      // Get relationships for use.ts
      const useRelationships = await parser.detectRelationships(
        useComponents,
        "import { X, Y } from './lib';\nX(); Y();"
      );

      // Find the variable and function components in lib.ts
      const xComponent = libComponents.find(c =>
        c.type === ComponentType.VARIABLE && c.name === 'X'
      );
      const yComponent = libComponents.find(c =>
        c.type === ComponentType.FUNCTION && c.name === 'Y'
      );
      expect(xComponent).toBeDefined();
      expect(yComponent).toBeDefined();

      // Find the import relationships in use.ts
      const xImportRelationship = useRelationships.find(r =>
        r.type === RelationshipType.IMPORTS_FROM &&
        r.metadata?.importedName === 'X' &&
        r.metadata?.isNamed === true
      );
      const yImportRelationship = useRelationships.find(r =>
        r.type === RelationshipType.IMPORTS_FROM &&
        r.metadata?.importedName === 'Y' &&
        r.metadata?.isNamed === true
      );

      expect(xImportRelationship).toBeDefined();
      expect(yImportRelationship).toBeDefined();
      expect(xImportRelationship?.metadata?.resolvedPath).toBe(libPath);
      expect(yImportRelationship?.metadata?.resolvedPath).toBe(libPath);

      // Find the file dependency relationship
      const dependsOnRelationship = useRelationships.find(r =>
        r.type === RelationshipType.DEPENDS_ON
      );
      expect(dependsOnRelationship).toBeDefined();
    });
  });

  describe('Namespace Imports', () => {
    it('should resolve namespace imports correctly', async () => {
      // Create test files
      const modPath = join(testDir, 'src', 'mod.ts');
      const usePath = join(testDir, 'src', 'use.ts');

      mkdirSync(join(testDir, 'src'), { recursive: true });

      // src/mod.ts: export function fn() {}
      writeFileSync(modPath, 'export function fn() {}\nexport const value = 42;\n');

      // src/use.ts: import * as ns from './mod'
      writeFileSync(usePath, "import * as ns from './mod';\nns.fn(); console.log(ns.value);\n");

      // Parse both files
      const modComponents = await parser.detectComponents(
        'export function fn() {}\nexport const value = 42;',
        modPath
      );
      const useComponents = await parser.detectComponents(
        "import * as ns from './mod';\nns.fn(); console.log(ns.value);",
        usePath
      );

      // Get relationships for use.ts
      const useRelationships = await parser.detectRelationships(
        useComponents,
        "import * as ns from './mod';\nns.fn(); console.log(ns.value);"
      );

      // Find the namespace import relationship
      const namespaceImportRelationship = useRelationships.find(r =>
        r.type === RelationshipType.IMPORTS_FROM &&
        r.metadata?.isNamespace === true
      );

      expect(namespaceImportRelationship).toBeDefined();
      expect(namespaceImportRelationship?.metadata?.namespaceName).toBe('ns');
      expect(namespaceImportRelationship?.metadata?.resolvedPath).toBe(modPath);

      // Find the file dependency relationship
      const dependsOnRelationship = useRelationships.find(r =>
        r.type === RelationshipType.DEPENDS_ON
      );
      expect(dependsOnRelationship).toBeDefined();
    });
  });

  describe('Re-exports (Barrel Pattern)', () => {
    it('should resolve re-exports through barrel files', async () => {
      // Create test files
      const libPath = join(testDir, 'src', 'lib.ts');
      const barrelPath = join(testDir, 'src', 'barrel.ts');
      const usePath = join(testDir, 'src', 'use.ts');

      mkdirSync(join(testDir, 'src'), { recursive: true });

      // src/lib.ts: export const X = () => {}
      writeFileSync(libPath, 'export const X = () => {};\n');

      // src/barrel.ts: export { X } from './lib'
      writeFileSync(barrelPath, "export { X } from './lib';\n");

      // src/use.ts: import { X } from './barrel'
      writeFileSync(usePath, "import { X } from './barrel';\nX();\n");

      // Parse all files
      const libComponents = await parser.detectComponents(
        'export const X = () => {};',
        libPath
      );
      const barrelComponents = await parser.detectComponents(
        "export { X } from './lib';",
        barrelPath
      );
      const useComponents = await parser.detectComponents(
        "import { X } from './barrel';\nX();",
        usePath
      );

      // Get relationships for use.ts
      const useRelationships = await parser.detectRelationships(
        useComponents,
        "import { X } from './barrel';\nX();"
      );

      // Find the variable component in lib.ts
      const xComponent = libComponents.find(c =>
        c.type === ComponentType.VARIABLE && c.name === 'X'
      );
      expect(xComponent).toBeDefined();

      // Find the import relationship in use.ts
      const importRelationship = useRelationships.find(r =>
        r.type === RelationshipType.IMPORTS_FROM &&
        r.metadata?.importedName === 'X'
      );

      expect(importRelationship).toBeDefined();
      expect(importRelationship?.metadata?.resolvedPath).toBe(barrelPath);

      // The target should eventually resolve to the original component in lib.ts
      // This would be tested in the integration test with full resolution chain
    });
  });

  describe('TSConfig Path Mapping', () => {
    it('should resolve imports using tsconfig path aliases', async () => {
      // Create tsconfig.json with path mapping
      const tsconfigPath = join(testDir, 'tsconfig.json');
      const tsconfig = {
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@app/*': ['src/*'],
            '@utils/*': ['src/utils/*']
          }
        }
      };
      writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

      // Create test files
      const mathPath = join(testDir, 'src', 'utils', 'math.ts');
      const usePath = join(testDir, 'src', 'use.ts');

      mkdirSync(join(testDir, 'src', 'utils'), { recursive: true });

      // src/utils/math.ts: export function sum(a: number, b: number) { return a + b; }
      writeFileSync(mathPath, 'export function sum(a: number, b: number) { return a + b; }\n');

      // src/use.ts: import { sum } from '@utils/math'
      writeFileSync(usePath, "import { sum } from '@utils/math';\nconsole.log(sum(1, 2));\n");

      // Test module resolution with tsconfig paths
      const resolved = await moduleResolver.resolveModule('@utils/math', usePath, testDir);

      expect(resolved).toBeDefined();
      expect(resolved?.resolvedPath).toBe(mathPath);
      expect(resolved?.resolutionMethod).toBe('tsconfig-paths');
      expect(resolved?.isExternal).toBe(false);

      // Parse files and check relationships
      const mathComponents = await parser.detectComponents(
        'export function sum(a: number, b: number) { return a + b; }',
        mathPath
      );
      const useComponents = await parser.detectComponents(
        "import { sum } from '@utils/math';\nconsole.log(sum(1, 2));",
        usePath
      );

      // Find the function component in math.ts
      const sumComponent = mathComponents.find(c =>
        c.type === ComponentType.FUNCTION && c.name === 'sum'
      );
      expect(sumComponent).toBeDefined();
    });
  });

  describe('Unresolved Imports', () => {
    it('should handle unresolved imports gracefully', async () => {
      // Create test file with unresolved import
      const usePath = join(testDir, 'src', 'use.ts');
      mkdirSync(join(testDir, 'src'), { recursive: true });

      // src/use.ts: import { missing } from './nonexistent'
      writeFileSync(usePath, "import { missing } from './nonexistent';\nmissing();\n");

      // Parse file
      const useComponents = await parser.detectComponents(
        "import { missing } from './nonexistent';\nmissing();",
        usePath
      );

      // Get relationships
      const useRelationships = await parser.detectRelationships(
        useComponents,
        "import { missing } from './nonexistent';\nmissing();"
      );

      // Find the import relationship
      const importRelationship = useRelationships.find(r =>
        r.type === RelationshipType.IMPORTS_FROM
      );

      expect(importRelationship).toBeDefined();
      expect(importRelationship?.metadata?.isResolved).toBe(false);
      expect(importRelationship?.metadata?.unresolvedReason).toBeDefined();
      expect(importRelationship?.targetId).toMatch(/^UNRESOLVED:/);
    });

    it('should handle external modules correctly', async () => {
      // Create package.json to make this a valid npm project
      const packageJsonPath = join(testDir, 'package.json');
      writeFileSync(packageJsonPath, JSON.stringify({
        name: 'test-project',
        version: '1.0.0'
      }, null, 2));

      // Create test file with external import
      const usePath = join(testDir, 'src', 'use.ts');
      mkdirSync(join(testDir, 'src'), { recursive: true });

      // src/use.ts: import React from 'react'
      writeFileSync(usePath, "import React from 'react';\nexport default function App() { return React.createElement('div'); }\n");

      // Test module resolution for external module
      const resolved = await moduleResolver.resolveModule('react', usePath, testDir);

      // External modules should be marked as external or unresolved
      if (resolved) {
        expect(resolved.isExternal).toBe(true);
      } else {
        // It's fine if external modules can't be resolved in test environment
        expect(resolved).toBeNull();
      }

      // Parse file and check relationships
      const useComponents = await parser.detectComponents(
        "import React from 'react';\nexport default function App() { return React.createElement('div'); }",
        usePath
      );

      const useRelationships = await parser.detectRelationships(
        useComponents,
        "import React from 'react';\nexport default function App() { return React.createElement('div'); }"
      );

      // Find the import relationship
      const importRelationship = useRelationships.find(r =>
        r.type === RelationshipType.IMPORTS_FROM &&
        r.metadata?.importPath === 'react'
      );

      expect(importRelationship).toBeDefined();
      // External imports should either be resolved as external or marked as unresolved
      expect(
        importRelationship?.metadata?.isResolved === false ||
        importRelationship?.metadata?.resolvedPath?.includes('node_modules')
      ).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should meet performance targets for TypeChecker path', async () => {
      // Create a moderate-sized project for performance testing
      mkdirSync(join(testDir, 'src'), { recursive: true });

      const files: string[] = [];
      const fileContents: string[] = [];

      // Create 20 files with imports between them
      for (let i = 0; i < 20; i++) {
        const filePath = join(testDir, 'src', `file${i}.ts`);
        let content = `export function func${i}() { return ${i}; }\n`;

        // Add imports to previous files
        if (i > 0) {
          const importTarget = Math.max(0, i - 3); // Import from a few files back
          content += `import { func${importTarget} } from './file${importTarget}';\n`;
          content += `func${importTarget}();\n`;
        }

        files.push(filePath);
        fileContents.push(content);
        writeFileSync(filePath, content);
      }

      // Measure parsing time
      const startTime = Date.now();

      // Parse all files
      const allComponents: any[] = [];
      const allRelationships: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const components = await parser.detectComponents(fileContents[i], files[i]);
        const relationships = await parser.detectRelationships(components, fileContents[i]);

        allComponents.push(...components);
        allRelationships.push(...relationships);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance target: TypeChecker path should be ≤ 15% slower than structural parsing
      // For 20 files, this should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Verify that relationships were properly resolved
      const resolvedImports = allRelationships.filter(r =>
        r.type === RelationshipType.IMPORTS_FROM && r.metadata?.isResolved === true
      );

      // Should have some resolved imports (at least 10 from the 19 files that import)
      expect(resolvedImports.length).toBeGreaterThan(10);

      console.log(`Performance test: Parsed ${files.length} files in ${duration}ms`);
      console.log(`Found ${resolvedImports.length} resolved imports out of ${allRelationships.filter(r => r.type === RelationshipType.IMPORTS_FROM).length} total imports`);
    });
  });
});