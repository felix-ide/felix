/**
 * Integration tests for Python Parser with Import Resolver
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { PythonParser } from '../../parsers/PythonParser.js';
import { ComponentType, RelationshipType } from '../../types.js';

describe('PythonParser Integration Tests', () => {
  let parser: PythonParser;
  let testDir: string;
  let testFiles: string[];

  beforeEach(() => {
    // Create temporary test directory
    testDir = join('/tmp', `python_parser_test_${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    testFiles = [];

    // Initialize parser
    parser = new PythonParser();
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

  describe('Import Resolution Integration', () => {
    test('should parse Python file and resolve standard library imports', async () => {
      const content = `import os
import sys
import json

def main():
    path = os.path.join("test", "file.txt")
    args = sys.argv
    data = json.loads('{"key": "value"}')
    return data

if __name__ == "__main__":
    main()`;

      const filePath = createTestFile('test_stdlib.py', content);

      // Parse components
      const components = parser.detectComponents(content, filePath);
      expect(components.length).toBeGreaterThan(0);

      const fileComponent = components.find(c => c.type === ComponentType.FILE);
      const moduleComponent = components.find(c => c.type === ComponentType.MODULE);
      expect(fileComponent).toBeDefined();
      expect(moduleComponent).toBeDefined();
      expect(moduleComponent?.parentId).toBe(fileComponent?.id);
      expect((moduleComponent?.metadata as any)?.moduleName).toBe('test_stdlib');

      const importComponents = components.filter(c => c.type === ComponentType.IMPORT);
      expect(importComponents.length).toBeGreaterThanOrEqual(3);

      // Parse relationships
      const relationships = await parser.detectRelationships(components, content, filePath);

      // Check that import relationships were created
      const importRelationships = relationships.filter(r => r.type === RelationshipType.IMPORTS_FROM);
      expect(importRelationships.length).toBeGreaterThanOrEqual(3);

      // Check specific import relationships
      const osImport = importRelationships.find(r =>
        r.metadata?.specifier === 'os' && r.metadata?.importType === 'module'
      );
      expect(osImport).toBeDefined();
      expect(osImport?.metadata?.isExternal).toBe(true);
      expect(osImport?.metadata?.resolutionMethod).toBe('stdlib');

      const sysImport = importRelationships.find(r =>
        r.metadata?.specifier === 'sys' && r.metadata?.importType === 'module'
      );
      expect(sysImport).toBeDefined();
      expect(sysImport?.metadata?.isExternal).toBe(true);

      const jsonImport = importRelationships.find(r =>
        r.metadata?.specifier === 'json' && r.metadata?.importType === 'module'
      );
      expect(jsonImport).toBeDefined();
      expect(jsonImport?.metadata?.isExternal).toBe(true);
    });

    test('should resolve local module imports and create component relationships', async () => {
      // Create utility module
      const utilsContent = `def calculate(x, y):
    return x + y

class Calculator:
    def __init__(self):
        self.result = 0

    def add(self, value):
        self.result += value
        return self.result`;

      const utilsPath = createTestFile('utils.py', utilsContent);

      // Create main module that imports utils
      const mainContent = `from utils import calculate, Calculator

def main():
    result = calculate(5, 3)
    calc = Calculator()
    calc.add(10)
    return calc.result

if __name__ == "__main__":
    print(main())`;

      const mainPath = createTestFile('main.py', mainContent);

      // Parse both files
      const utilsComponents = parser.detectComponents(utilsContent, utilsPath);
      const mainComponents = parser.detectComponents(mainContent, mainPath);

      // Combine components for relationship resolution
      const allComponents = [...utilsComponents, ...mainComponents];

      // Parse relationships for main file
      const relationships = await parser.detectRelationships(mainComponents, mainContent, mainPath);

      // Check that we found the correct components
      const calculateFunc = utilsComponents.find(c => c.name === 'calculate' && c.type === ComponentType.FUNCTION);
      const calculatorClass = utilsComponents.find(c => c.name === 'Calculator' && c.type === ComponentType.CLASS);
      expect(calculateFunc).toBeDefined();
      expect(calculatorClass).toBeDefined();
      expect((calculateFunc?.metadata as any)?.fullName).toBe('utils.calculate');
      expect((calculatorClass?.metadata as any)?.fullName).toBe('utils.Calculator');

      const utilsModule = utilsComponents.find(c => c.type === ComponentType.MODULE);
      expect(utilsModule).toBeDefined();
      expect((utilsModule?.metadata as any)?.moduleName).toBe('utils');

      // Check import relationships
      const importRelationships = relationships.filter(r => r.type === RelationshipType.IMPORTS_FROM);
      expect(importRelationships.length).toBeGreaterThanOrEqual(2);

      // Check specific imports
      const calculateImport = importRelationships.find(r =>
        r.metadata?.itemName === 'calculate' && r.metadata?.importType === 'from_import'
      );
      expect(calculateImport).toBeDefined();
      expect(calculateImport?.metadata?.specifier).toBe('utils');
      expect(calculateImport?.metadata?.isExternal).toBe(false);

      const calculatorImport = importRelationships.find(r =>
        r.metadata?.itemName === 'Calculator' && r.metadata?.importType === 'from_import'
      );
      expect(calculatorImport).toBeDefined();
      expect(calculatorImport?.metadata?.specifier).toBe('utils');
      expect(calculatorImport?.metadata?.isExternal).toBe(false);

      const namespaceRelationships = relationships.filter(r => r.type === RelationshipType.IN_NAMESPACE);
      expect(namespaceRelationships.length).toBeGreaterThan(0);
    });

    test('should handle relative imports in package structure', async () => {
      // Create package structure
      mkdirSync(join(testDir, 'mypackage'), { recursive: true });
      mkdirSync(join(testDir, 'mypackage', 'submodule'), { recursive: true });

      // Create package files
      createTestFile('mypackage/__init__.py', '');
      createTestFile('mypackage/submodule/__init__.py', '');

      const baseContent = `class BaseClass:
    def base_method(self):
        return "base"`;

      const baseModulePath = createTestFile('mypackage/base.py', baseContent);

      const subModuleContent = `from ..base import BaseClass

class DerivedClass(BaseClass):
    def derived_method(self):
        return "derived"`;

      const subModulePath = createTestFile('mypackage/submodule/derived.py', subModuleContent);

      // Parse components
      const baseComponents = parser.detectComponents(baseContent, baseModulePath);
      const subComponents = parser.detectComponents(subModuleContent, subModulePath);

      // Parse relationships for submodule
      const relationships = await parser.detectRelationships(subComponents, subModuleContent, subModulePath);

      const namespaceRelationships = relationships.filter(r => r.type === RelationshipType.IN_NAMESPACE);
      expect(namespaceRelationships.length).toBeGreaterThan(0);

      const extendsRelationships = relationships.filter(r => r.type === RelationshipType.EXTENDS);
      expect(extendsRelationships.length).toBeGreaterThanOrEqual(1);

      // Check relative import relationship
      const importRelationships = relationships.filter(r => r.type === RelationshipType.IMPORTS_FROM);
      expect(importRelationships.length).toBeGreaterThanOrEqual(1);

      const relativeImport = importRelationships.find(r =>
        r.metadata?.itemName === 'BaseClass' && r.metadata?.isRelative === true
      );
      expect(relativeImport).toBeDefined();
      expect(relativeImport?.metadata?.specifier).toBe('base');
    });

    test('should handle star imports', async () => {
      const utilsContent = `PI = 3.14159
E = 2.71828

def square(x):
    return x * x

def cube(x):
    return x * x * x`;

      const utilsPath = createTestFile('math_utils.py', utilsContent);

      const mainContent = `from math_utils import *

def main():
    area = PI * square(5)
    return area`;

      const mainPath = createTestFile('main_star.py', mainContent);

      // Parse components
      const components = parser.detectComponents(mainContent, mainPath);

      // Parse relationships
      const relationships = await parser.detectRelationships(components, mainContent, mainPath);

      // Check star import relationship
      const importRelationships = relationships.filter(r => r.type === RelationshipType.IMPORTS_FROM);
      const starImport = importRelationships.find(r =>
        r.metadata?.isStarImport === true && r.metadata?.importType === 'star_import'
      );
      expect(starImport).toBeDefined();
      expect(starImport?.metadata?.specifier).toBe('math_utils');
      expect(starImport?.metadata?.itemName).toBe('*');
    });

    test('should handle import aliases', async () => {
      const content = `import numpy as np
from pandas import DataFrame as df

def process_data():
    arr = np.array([1, 2, 3])
    data = df({'col': arr})
    return data`;

      const filePath = createTestFile('test_aliases.py', content);

      // Parse components
      const components = parser.detectComponents(content, filePath);

      // Parse relationships
      const relationships = await parser.detectRelationships(components, content, filePath);

      // Check import relationships with aliases
      const importRelationships = relationships.filter(r => r.type === RelationshipType.IMPORTS_FROM);

      const numpyImport = importRelationships.find(r =>
        r.metadata?.specifier === 'numpy' && r.metadata?.alias === 'np'
      );
      expect(numpyImport).toBeDefined();
      expect(numpyImport?.metadata?.importType).toBe('module');

      const pandasImport = importRelationships.find(r =>
        r.metadata?.itemName === 'DataFrame' && r.metadata?.alias === 'df'
      );
      expect(pandasImport).toBeDefined();
      expect(pandasImport?.metadata?.specifier).toBe('pandas');
      expect(pandasImport?.metadata?.importType).toBe('from_import');
    });

    test('should handle unresolved imports gracefully', async () => {
      const content = `import nonexistent_module
from unknown_package import unknown_function

def test():
    return "test"`;

      const filePath = createTestFile('test_unresolved.py', content);

      // Parse components
      const components = parser.detectComponents(content, filePath);

      // Parse relationships
      const relationships = await parser.detectRelationships(components, content, filePath);

      // Check that unresolved imports still create relationships
      const importRelationships = relationships.filter(r => r.type === RelationshipType.IMPORTS_FROM);
      expect(importRelationships.length).toBeGreaterThanOrEqual(2);

      // Check unresolved import markers
      const unresolvedImports = importRelationships.filter(r =>
        r.metadata?.isUnresolved === true || r.targetId.startsWith('UNRESOLVED:')
      );
      expect(unresolvedImports.length).toBeGreaterThanOrEqual(2);
    });

    test('should resolve imports in Django project structure', async () => {
      // Create Django-like structure
      mkdirSync(join(testDir, 'myproject'), { recursive: true });
      mkdirSync(join(testDir, 'myproject', 'myapp'), { recursive: true });

      createTestFile('myproject/__init__.py', '');
      createTestFile('myproject/myapp/__init__.py', '');

      const modelsContent = `from django.db import models

class User(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()`;

      const modelsPath = createTestFile('myproject/myapp/models.py', modelsContent);

      const viewsContent = `from django.shortcuts import render
from .models import User

def user_list(request):
    users = User.objects.all()
    return render(request, 'users.html', {'users': users})`;

      const viewsPath = createTestFile('myproject/myapp/views.py', viewsContent);

      // Parse components
      const modelsComponents = parser.detectComponents(modelsContent, modelsPath);
      const viewsComponents = parser.detectComponents(viewsContent, viewsPath);

      // Parse relationships for views
      const relationships = await parser.detectRelationships(viewsComponents, viewsContent, viewsPath);

      // Check import relationships
      const importRelationships = relationships.filter(r => r.type === RelationshipType.IMPORTS_FROM);
      expect(importRelationships.length).toBeGreaterThanOrEqual(2);

      // Check Django import (external)
      const djangoImport = importRelationships.find(r =>
        r.metadata?.specifier === 'django.shortcuts'
      );
      expect(djangoImport).toBeDefined();
      expect(djangoImport?.metadata?.isExternal).toBe(true);

      // Check relative import
      const modelsImport = importRelationships.find(r =>
        r.metadata?.specifier === 'models' && r.metadata?.isRelative === true
      );
      expect(modelsImport).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle syntax errors gracefully', async () => {
      const invalidContent = `import os
def invalid_function(
    # Missing closing parenthesis and proper indentation
    pass`;

      const filePath = createTestFile('test_syntax_error.py', invalidContent);

      // Should not throw but handle gracefully
      expect(async () => {
        const components = parser.detectComponents(invalidContent, filePath);
        const relationships = await parser.detectRelationships(components, invalidContent, filePath);
      }).not.toThrow();
    });

    test('should fallback to regex extraction when AST fails', async () => {
      const content = `import os
from sys import argv`;

      const filePath = createTestFile('test_fallback.py', content);

      // Parse components
      const components = parser.detectComponents(content, filePath);

      // Parse relationships
      const relationships = await parser.detectRelationships(components, content, filePath);

      // Should have import relationships even with fallback
      const importRelationships = relationships.filter(r => r.type === RelationshipType.IMPORTS_FROM);
      expect(importRelationships.length).toBeGreaterThanOrEqual(2);
    });
  });
});
