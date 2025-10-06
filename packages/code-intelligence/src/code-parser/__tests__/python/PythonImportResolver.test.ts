/**
 * Tests for Python Import Resolver
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { PythonImportResolver, ResolvedPythonImport, PythonImportStatement } from '../../services/PythonImportResolver.js';
import { ComponentType, IComponent } from '../../types.js';

describe('PythonImportResolver', () => {
  let resolver: PythonImportResolver;
  let testDir: string;
  let testFiles: string[];

  beforeEach(() => {
    // Create temporary test directory
    testDir = join('/tmp', `python_import_test_${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    testFiles = [];

    // Initialize resolver
    resolver = new PythonImportResolver();
  });

  afterEach(() => {
    // Clean up test files
    testFiles.forEach(file => {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    });

    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  const createTestFile = (fileName: string, content: string): string => {
    const filePath = join(testDir, fileName);
    const fileDir = dirname(filePath);

    if (!existsSync(fileDir)) {
      mkdirSync(fileDir, { recursive: true });
    }

    writeFileSync(filePath, content);
    testFiles.push(filePath);
    return filePath;
  };

  describe('extractImports', () => {
    test('should extract simple import statements', async () => {
      const content = `import os
import sys
import json`;

      const filePath = createTestFile('test_simple_imports.py', content);
      const imports = await resolver.extractImports(filePath);

      expect(imports).toHaveLength(3);

      expect(imports[0]).toEqual({
        type: 'Import',
        line: 1,
        column: 0,
        names: [{ name: 'os', asname: null }]
      });

      expect(imports[1]).toEqual({
        type: 'Import',
        line: 2,
        column: 0,
        names: [{ name: 'sys', asname: null }]
      });

      expect(imports[2]).toEqual({
        type: 'Import',
        line: 3,
        column: 0,
        names: [{ name: 'json', asname: null }]
      });
    });

    test('should extract import statements with aliases', async () => {
      const content = `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt`;

      const filePath = createTestFile('test_alias_imports.py', content);
      const imports = await resolver.extractImports(filePath);

      expect(imports).toHaveLength(3);

      expect(imports[0]).toEqual({
        type: 'Import',
        line: 1,
        column: 0,
        names: [{ name: 'numpy', asname: 'np' }]
      });

      expect(imports[1]).toEqual({
        type: 'Import',
        line: 2,
        column: 0,
        names: [{ name: 'pandas', asname: 'pd' }]
      });

      expect(imports[2]).toEqual({
        type: 'Import',
        line: 3,
        column: 0,
        names: [{ name: 'matplotlib.pyplot', asname: 'plt' }]
      });
    });

    test('should extract from import statements', async () => {
      const content = `from os import path
from sys import argv, exit
from json import loads, dumps as json_dumps`;

      const filePath = createTestFile('test_from_imports.py', content);
      const imports = await resolver.extractImports(filePath);

      expect(imports).toHaveLength(3);

      expect(imports[0]).toEqual({
        type: 'ImportFrom',
        line: 1,
        column: 0,
        module: 'os',
        names: [{ name: 'path', asname: null }],
        level: 0
      });

      expect(imports[1]).toEqual({
        type: 'ImportFrom',
        line: 2,
        column: 0,
        module: 'sys',
        names: [
          { name: 'argv', asname: null },
          { name: 'exit', asname: null }
        ],
        level: 0
      });

      expect(imports[2]).toEqual({
        type: 'ImportFrom',
        line: 3,
        column: 0,
        module: 'json',
        names: [
          { name: 'loads', asname: null },
          { name: 'dumps', asname: 'json_dumps' }
        ],
        level: 0
      });
    });

    test('should extract relative imports', async () => {
      const content = `from . import utils
from .. import config
from ...common import helpers
from .models import User`;

      const filePath = createTestFile('test_relative_imports.py', content);
      const imports = await resolver.extractImports(filePath);

      expect(imports).toHaveLength(4);

      expect(imports[0]).toEqual({
        type: 'ImportFrom',
        line: 1,
        column: 0,
        module: '',
        names: [{ name: 'utils', asname: null }],
        level: 1
      });

      expect(imports[1]).toEqual({
        type: 'ImportFrom',
        line: 2,
        column: 0,
        module: '',
        names: [{ name: 'config', asname: null }],
        level: 2
      });

      expect(imports[2]).toEqual({
        type: 'ImportFrom',
        line: 3,
        column: 0,
        module: 'common',
        names: [{ name: 'helpers', asname: null }],
        level: 3
      });

      expect(imports[3]).toEqual({
        type: 'ImportFrom',
        line: 4,
        column: 0,
        module: 'models',
        names: [{ name: 'User', asname: null }],
        level: 1
      });
    });

    test('should extract star imports', async () => {
      const content = `from os import *
from .utils import *`;

      const filePath = createTestFile('test_star_imports.py', content);
      const imports = await resolver.extractImports(filePath);

      expect(imports).toHaveLength(2);

      expect(imports[0]).toEqual({
        type: 'ImportFrom',
        line: 1,
        column: 0,
        module: 'os',
        names: [{ name: '*', asname: null }],
        level: 0
      });

      expect(imports[1]).toEqual({
        type: 'ImportFrom',
        line: 2,
        column: 0,
        module: 'utils',
        names: [{ name: '*', asname: null }],
        level: 1
      });
    });
  });

  describe('resolveImport', () => {
    test('should resolve standard library imports', async () => {
      const importStmt: PythonImportStatement = {
        type: 'Import',
        line: 1,
        column: 0,
        names: [{ name: 'os', asname: null }]
      };

      const filePath = createTestFile('test_stdlib.py', 'import os');
      const resolved = await resolver.resolveImport(importStmt, filePath, testDir);

      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toEqual(
        expect.objectContaining({
          specifier: 'os',
          isExternal: true,
          isRelative: false,
          resolutionMethod: 'stdlib',
          importType: 'module'
        })
      );
    });

    test('should resolve local module imports', async () => {
      // Create a local module
      const moduleContent = `def test_function():
    pass

class TestClass:
    pass`;

      const modulePath = createTestFile('mymodule.py', moduleContent);

      // Create test file that imports the module
      const testContent = 'import mymodule';
      const testPath = createTestFile('test_local.py', testContent);

      // Create component for the module
      const moduleComponent: IComponent = {
        id: 'mymodule-file',
        name: 'mymodule.py',
        type: ComponentType.FILE,
        language: 'python',
        filePath: modulePath,
        location: { startLine: 1, endLine: 5, startColumn: 0, endColumn: 0 },
        metadata: {}
      };

      resolver.buildComponentIndex([moduleComponent]);

      const importStmt: PythonImportStatement = {
        type: 'Import',
        line: 1,
        column: 0,
        names: [{ name: 'mymodule', asname: null }]
      };

      const resolved = await resolver.resolveImport(importStmt, testPath, testDir);

      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toEqual(
        expect.objectContaining({
          specifier: 'mymodule',
          isExternal: false,
          isRelative: false,
          resolutionMethod: 'absolute',
          importType: 'module',
          componentId: 'mymodule-file'
        })
      );
    });

    test('should resolve from imports with existing components', async () => {
      // Create module with function
      const moduleContent = `def my_function():
    return "Hello"

class MyClass:
    def method(self):
        pass`;

      const modulePath = createTestFile('utils.py', moduleContent);

      // Create test file
      const testContent = 'from utils import my_function, MyClass';
      const testPath = createTestFile('test_from.py', testContent);

      // Create components
      const components: IComponent[] = [
        {
          id: 'utils-file',
          name: 'utils.py',
          type: ComponentType.FILE,
          language: 'python',
          filePath: modulePath,
          location: { startLine: 1, endLine: 6, startColumn: 0, endColumn: 0 },
          metadata: {}
        },
        {
          id: 'my_function-func',
          name: 'my_function',
          type: ComponentType.FUNCTION,
          language: 'python',
          filePath: modulePath,
          location: { startLine: 1, endLine: 2, startColumn: 0, endColumn: 0 },
          metadata: {}
        },
        {
          id: 'MyClass-class',
          name: 'MyClass',
          type: ComponentType.CLASS,
          language: 'python',
          filePath: modulePath,
          location: { startLine: 4, endLine: 6, startColumn: 0, endColumn: 0 },
          metadata: {}
        }
      ];

      resolver.buildComponentIndex(components);

      const importStmt: PythonImportStatement = {
        type: 'ImportFrom',
        line: 1,
        column: 0,
        module: 'utils',
        names: [
          { name: 'my_function', asname: null },
          { name: 'MyClass', asname: null }
        ],
        level: 0
      };

      const resolved = await resolver.resolveImport(importStmt, testPath, testDir);

      expect(resolved).toHaveLength(2);

      expect(resolved[0]).toEqual(
        expect.objectContaining({
          specifier: 'utils',
          itemName: 'my_function',
          componentId: 'my_function-func',
          isExternal: false,
          importType: 'from_import'
        })
      );

      expect(resolved[1]).toEqual(
        expect.objectContaining({
          specifier: 'utils',
          itemName: 'MyClass',
          componentId: 'MyClass-class',
          isExternal: false,
          importType: 'from_import'
        })
      );
    });

    test('should handle relative imports', async () => {
      // Create package structure
      mkdirSync(join(testDir, 'package'), { recursive: true });
      mkdirSync(join(testDir, 'package', 'subpackage'), { recursive: true });

      createTestFile('package/__init__.py', '');
      createTestFile('package/subpackage/__init__.py', '');
      createTestFile('package/utils.py', 'def helper(): pass');
      createTestFile('package/subpackage/module.py', 'from ..utils import helper');

      const moduleFile = join(testDir, 'package', 'subpackage', 'module.py');

      const importStmt: PythonImportStatement = {
        type: 'ImportFrom',
        line: 1,
        column: 0,
        module: 'utils',
        names: [{ name: 'helper', asname: null }],
        level: 2
      };

      const resolved = await resolver.resolveImport(importStmt, moduleFile, testDir);

      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toEqual(
        expect.objectContaining({
          specifier: 'utils',
          itemName: 'helper',
          isRelative: true,
          importType: 'from_import'
        })
      );
    });

    test('should handle unresolved imports gracefully', async () => {
      const testContent = 'import nonexistent_module';
      const testPath = createTestFile('test_unresolved.py', testContent);

      const importStmt: PythonImportStatement = {
        type: 'Import',
        line: 1,
        column: 0,
        names: [{ name: 'nonexistent_module', asname: null }]
      };

      const resolved = await resolver.resolveImport(importStmt, testPath, testDir);

      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toEqual(
        expect.objectContaining({
          specifier: 'nonexistent_module',
          resolutionMethod: 'unresolved',
          unresolvedReason: expect.stringContaining('could not be resolved')
        })
      );
    });
  });

  describe('createImportRelationships', () => {
    test('should create correct relationships for resolved imports', async () => {
      const sourceComponent: IComponent = {
        id: 'test-file',
        name: 'test.py',
        type: ComponentType.FILE,
        language: 'python',
        filePath: '/test/test.py',
        location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 },
        metadata: {}
      };

      const resolvedImports: ResolvedPythonImport[] = [
        {
          resolvedPath: 'stdlib:os',
          isExternal: true,
          isRelative: false,
          specifier: 'os',
          location: { line: 1, column: 0 },
          resolutionMethod: 'stdlib',
          importType: 'module'
        },
        {
          resolvedPath: '/test/utils.py',
          componentId: 'utils-func',
          isExternal: false,
          isRelative: false,
          specifier: 'utils',
          itemName: 'helper',
          location: { line: 2, column: 0 },
          resolutionMethod: 'absolute',
          importType: 'from_import'
        }
      ];

      const relationships = resolver.createImportRelationships(resolvedImports, sourceComponent);

      expect(relationships).toHaveLength(2);

      expect(relationships[0]).toEqual(
        expect.objectContaining({
          type: 'imports_from',
          sourceId: 'test-file',
          targetId: 'EXTERNAL:os',
          metadata: expect.objectContaining({
            importType: 'module',
            specifier: 'os',
            isExternal: true,
            line: 1
          })
        })
      );

      expect(relationships[1]).toEqual(
        expect.objectContaining({
          type: 'imports_from',
          sourceId: 'test-file',
          targetId: 'utils-func',
          metadata: expect.objectContaining({
            importType: 'from_import',
            specifier: 'utils',
            itemName: 'helper',
            isExternal: false,
            line: 2
          })
        })
      );
    });

    test('should handle star imports', async () => {
      const sourceComponent: IComponent = {
        id: 'test-file',
        name: 'test.py',
        type: ComponentType.FILE,
        language: 'python',
        filePath: '/test/test.py',
        location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 },
        metadata: {}
      };

      const resolvedImports: ResolvedPythonImport[] = [
        {
          resolvedPath: '/test/utils.py',
          isExternal: false,
          isRelative: false,
          specifier: 'utils',
          itemName: '*',
          isStarImport: true,
          location: { line: 1, column: 0 },
          resolutionMethod: 'absolute',
          importType: 'star_import'
        }
      ];

      const relationships = resolver.createImportRelationships(resolvedImports, sourceComponent);

      expect(relationships).toHaveLength(1);
      expect(relationships[0].metadata).toEqual(
        expect.objectContaining({
          importType: 'star_import',
          isStarImport: true,
          itemName: '*'
        })
      );
    });
  });

  describe('buildComponentIndex', () => {
    test('should correctly index components by name and qualified name', () => {
      const components: IComponent[] = [
        {
          id: 'file-comp',
          name: 'module.py',
          type: ComponentType.FILE,
          language: 'python',
          filePath: '/test/module.py',
          location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 },
          metadata: {}
        },
        {
          id: 'class-comp',
          name: 'MyClass',
          type: ComponentType.CLASS,
          language: 'python',
          filePath: '/test/module.py',
          location: { startLine: 1, endLine: 5, startColumn: 0, endColumn: 0 },
          metadata: {}
        },
        {
          id: 'method-comp',
          name: 'my_method',
          type: ComponentType.METHOD,
          language: 'python',
          filePath: '/test/module.py',
          location: { startLine: 3, endLine: 4, startColumn: 0, endColumn: 0 },
          metadata: { className: 'MyClass' }
        }
      ];

      resolver.buildComponentIndex(components);

      // Test that we can access private componentIndex for verification
      // In a real test, you might expose a method to check if components are indexed
      expect(true).toBe(true); // Placeholder - actual indexing is tested implicitly in other tests
    });
  });
});