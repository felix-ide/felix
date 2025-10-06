/**
 * Tests for core types and enums
 */

import { ComponentType, RelationshipType } from '../../entities/core-types.js';

describe('ComponentType', () => {
  test('should contain all expected component types', () => {
    const expectedTypes = [
      'file',
      'directory',
      'class',
      'interface',
      'function',
      'method',
      'property',
      'variable',
      'import',
      'export',
      'type',
      'enum',
      'constant',
      'module',
      'namespace',
      'decorator',
      'annotation',
      'comment',
      'generic',
      'parameter',
      'return',
      'field',
      'constructor',
      'getter',
      'setter',
      'event',
      'callback',
      'arrow_function',
      'async_function',
      'generator_function',
      'abstract_class',
      'abstract_method',
      'static_method',
      'static_property',
      'private_method',
      'private_property',
      'protected_method',
      'protected_property',
      'public_method',
      'public_property',
      'readonly_property',
      'optional_property',
      'union_type',
      'intersection_type',
      'tuple_type',
      'array_type',
      'promise_type',
      'literal_type',
      'conditional_type',
      'mapped_type',
      'template_literal_type',
      'unknown'
    ];

    expectedTypes.forEach(type => {
      expect(Object.values(ComponentType)).toContain(type);
    });
  });

  test('should have consistent enum values', () => {
    expect(ComponentType.FILE).toBe('file');
    expect(ComponentType.CLASS).toBe('class');
    expect(ComponentType.FUNCTION).toBe('function');
    expect(ComponentType.INTERFACE).toBe('interface');
  });
});

describe('RelationshipType', () => {
  test('should contain all expected relationship types', () => {
    const expectedTypes = [
      'imports',
      'exports',
      'extends',
      'implements',
      'calls',
      'uses',
      'references',
      'defines',
      'contains',
      'overrides',
      'instantiates',
      'inherits_from',
      'composed_of',
      'depends_on',
      'aggregates',
      'associates',
      'decorates',
      'annotates',
      'returns',
      'accepts',
      'throws',
      'catches',
      'accesses',
      'modifies',
      'observes',
      'listens_to',
      'emits',
      'subscribes_to',
      'publishes',
      'consumes',
      'produces',
      'configures',
      'validates',
      'transforms',
      'serializes',
      'deserializes',
      'encrypts',
      'decrypts',
      'compresses',
      'decompresses',
      'unknown'
    ];

    expectedTypes.forEach(type => {
      expect(Object.values(RelationshipType)).toContain(type);
    });
  });

  test('should have consistent enum values', () => {
    expect(RelationshipType.IMPORTS).toBe('imports');
    expect(RelationshipType.EXTENDS).toBe('extends');
    expect(RelationshipType.CALLS).toBe('calls');
    expect(RelationshipType.IMPLEMENTS).toBe('implements');
  });
});