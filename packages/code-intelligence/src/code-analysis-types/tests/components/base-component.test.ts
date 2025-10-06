/**
 * Tests for BaseComponent
 */

import { BaseComponent } from '../../components/BaseComponent.js';
import { ComponentType } from '../../entities/core-types.js';

// Test implementation of BaseComponent for testing purposes
class TestComponent extends BaseComponent {
  constructor(
    id: string,
    name: string,
    filePath: string,
    location: any,
    language: string = 'typescript',
    metadata: Record<string, any> = {}
  ) {
    super(id, name, ComponentType.CLASS, language, filePath, location, metadata);
  }

  getSpecificData(): Record<string, any> {
    return {
      testField: 'testValue'
    };
  }
}

describe('BaseComponent', () => {
  const mockLocation = {
    startLine: 1,
    startColumn: 0,
    endLine: 10,
    endColumn: 0
  };

  describe('constructor', () => {
    test('should create component with required fields', () => {
      const component = new TestComponent(
        'test-id',
        'TestClass',
        '/src/test.ts',
        mockLocation
      );

      expect(component.id).toBe('test-id');
      expect(component.name).toBe('TestClass');
      expect(component.type).toBe(ComponentType.CLASS);
      expect(component.filePath).toBe('/src/test.ts');
      expect(component.location).toEqual(mockLocation);
      expect(component.language).toBe('typescript');
      expect(component.metadata).toEqual({});
    });

    test('should create component with custom language and metadata', () => {
      const metadata = { exported: true, abstract: false };
      const component = new TestComponent(
        'test-id',
        'TestClass',
        '/src/test.js',
        mockLocation,
        'javascript',
        metadata
      );

      expect(component.language).toBe('javascript');
      expect(component.metadata).toEqual(metadata);
    });
  });


  describe('serialization', () => {
    test('should serialize to JSON', () => {
      const metadata = { exported: true };
      const component = new TestComponent(
        'test-id',
        'TestClass',
        '/src/test.ts',
        mockLocation,
        'typescript',
        metadata
      );

      const json = component.toJSON();

      expect(json.id).toBe('test-id');
      expect(json.name).toBe('TestClass');
      expect(json.type).toBe(ComponentType.CLASS);
      expect(json.filePath).toBe('/src/test.ts');
      expect(json.location).toEqual(mockLocation);
      expect(json.language).toBe('typescript');
      expect(json.metadata).toEqual(metadata);
    });

  });

  describe('utility methods', () => {
    test('should convert to string', () => {
      const component = new TestComponent(
        'test-id',
        'TestClass',
        '/src/test.ts',
        mockLocation
      );

      const stringRepresentation = component.toString();
      expect(stringRepresentation).toBe('class:TestClass (/src/test.ts:1)');
    });

    test('should access properties', () => {
      const component = new TestComponent(
        'test-id',
        'TestClass',
        '/src/test.ts',
        mockLocation
      );

      expect(component.id).toBe('test-id');
      expect(component.name).toBe('TestClass');
      expect(component.type).toBe(ComponentType.CLASS);
      expect(component.language).toBe('typescript');
      expect(component.filePath).toBe('/src/test.ts');
      expect(component.location).toEqual(mockLocation);
    });
  });

  describe('clone', () => {
    test('should clone component', () => {
      const original = new TestComponent(
        'original-id',
        'TestClass',
        '/src/test.ts',
        mockLocation,
        'typescript',
        { exported: true }
      );

      const cloned = original.clone() as TestComponent;

      expect(cloned.id).toBe(original.id); // Clone preserves ID by default
      expect(cloned.name).toBe(original.name);
      expect(cloned.type).toBe(original.type);
      expect(cloned.filePath).toBe(original.filePath);
      expect(cloned.location).toEqual(original.location);
      expect(cloned.language).toBe(original.language);
      expect(cloned.metadata).toEqual(original.metadata);
    });

    test('should clone component with overrides', () => {
      const original = new TestComponent(
        'original-id',
        'TestClass',
        '/src/test.ts',
        mockLocation,
        'typescript',
        { exported: true }
      );

      const cloned = original.clone({ id: 'new-id', name: 'NewClass' }) as TestComponent;

      expect(cloned.id).toBe('new-id');
      expect(cloned.name).toBe('NewClass');
      expect(cloned.type).toBe(original.type);
      expect(cloned.filePath).toBe(original.filePath);
    });
  });
});