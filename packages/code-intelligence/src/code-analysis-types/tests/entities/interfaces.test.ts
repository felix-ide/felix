/**
 * Tests for core interfaces
 */

import { IComponent, IRelationship } from '../../entities/interfaces.js';
import { ComponentType, RelationshipType } from '../../entities/core-types.js';

describe('IComponent interface', () => {
  test('should accept valid component data', () => {
    const component: IComponent = {
      id: 'test-component-1',
      name: 'TestClass',
      type: ComponentType.CLASS,
      language: 'typescript',
      filePath: '/src/test.ts',
      location: {
        startLine: 1,
        startColumn: 0,
        endLine: 10,
        endColumn: 0
      },
      metadata: {
        exported: true,
        abstract: false
      }
    };

    expect(component.id).toBe('test-component-1');
    expect(component.name).toBe('TestClass');
    expect(component.type).toBe(ComponentType.CLASS);
    expect(component.language).toBe('typescript');
    expect(component.filePath).toBe('/src/test.ts');
    expect(component.location.startLine).toBe(1);
    expect(component.metadata.exported).toBe(true);
  });

  test('should support optional properties', () => {
    const component: IComponent = {
      id: 'test-component-2',
      name: 'testFunction',
      type: ComponentType.FUNCTION,
      language: 'javascript',
      filePath: '/src/utils.js',
      location: {
        startLine: 5,
        startColumn: 0,
        endLine: 15,
        endColumn: 0
      },
      metadata: {},
      code: 'function testFunction() { return true; }',
      scopeContext: {
        scope: 'function',
        languageStack: ['javascript'],
        componentChain: [{
          id: 'test-func-id',
          name: 'testFunction',
          type: ComponentType.FUNCTION,
          language: 'javascript'
        }]
      }
    };

    expect(component.code).toBeDefined();
    expect(component.scopeContext).toBeDefined();
    expect(component.scopeContext?.scope).toBe('function');
  });
});

describe('IRelationship interface', () => {
  test('should accept valid relationship data', () => {
    const relationship: IRelationship = {
      id: 'rel-1',
      sourceId: 'comp-1',
      targetId: 'comp-2',
      type: RelationshipType.IMPORTS,
      metadata: {
        importSpecifier: 'TestClass'
      }
    };

    expect(relationship.id).toBe('rel-1');
    expect(relationship.sourceId).toBe('comp-1');
    expect(relationship.targetId).toBe('comp-2');
    expect(relationship.type).toBe(RelationshipType.IMPORTS);
    expect(relationship.metadata.importSpecifier).toBe('TestClass');
  });

  test('should support optional properties', () => {
    const relationship: IRelationship = {
      id: 'rel-2',
      sourceId: 'comp-3',
      targetId: 'comp-4',
      type: RelationshipType.CALLS,
      metadata: {},
      location: {
        startLine: 42,
        startColumn: 10,
        endLine: 42,
        endColumn: 25
      }
    };

    expect(relationship.location).toBeDefined();
    expect(relationship.location?.startLine).toBe(42);
  });
});