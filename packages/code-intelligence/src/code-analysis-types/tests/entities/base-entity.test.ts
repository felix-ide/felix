/**
 * Tests for BaseEntity abstract class
 */

import { BaseEntity, BaseMetadata } from '../../entities/base-entity.js';

// Test implementation of BaseEntity for testing purposes
class TestEntity extends BaseEntity {
  public testData: string;

  constructor(id?: string, metadata: BaseMetadata = {}, testData: string = 'test') {
    super(id, metadata);
    this.testData = testData;
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!this.testData) {
      errors.push('testData is required');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected getSerializableFields(): Record<string, any> {
    return {
      testData: this.testData
    };
  }

  getType(): string {
    return 'test';
  }

  getName(): string {
    return this.testData;
  }

  static fromJSON(data: Record<string, any>): TestEntity {
    return new TestEntity(data.id, data.metadata, data.testData);
  }
}

describe('BaseEntity', () => {
  describe('constructor', () => {
    test('should generate ID if not provided', () => {
      const entity = new TestEntity();
      expect(entity.id).toBeDefined();
      expect(typeof entity.id).toBe('string');
      expect(entity.id.length).toBeGreaterThan(0);
    });

    test('should use provided ID', () => {
      const customId = 'custom-test-id';
      const entity = new TestEntity(customId);
      expect(entity.id).toBe(customId);
    });

    test('should set default metadata', () => {
      const entity = new TestEntity();
      expect(entity.metadata.createdAt).toBeDefined();
      expect(entity.metadata.version).toBe('1.0.0');
    });

    test('should merge provided metadata', () => {
      const customMetadata = { customField: 'customValue' };
      const entity = new TestEntity(undefined, customMetadata);
      expect(entity.metadata.customField).toBe('customValue');
      expect(entity.metadata.createdAt).toBeDefined();
      expect(entity.metadata.version).toBe('1.0.0');
    });
  });

  describe('metadata operations', () => {
    test('should update metadata with updateMetadata', () => {
      const entity = new TestEntity();
      const originalUpdatedAt = entity.metadata.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        entity.updateMetadata({ newField: 'newValue' });
        expect(entity.metadata.newField).toBe('newValue');
        expect(entity.metadata.updatedAt).toBeDefined();
        expect(entity.metadata.updatedAt).not.toBe(originalUpdatedAt);
      }, 1);
    });

    test('should get metadata value', () => {
      const entity = new TestEntity();
      entity.setMetadata('testKey', 'testValue');
      expect(entity.getMetadata('testKey')).toBe('testValue');
      expect(entity.getMetadata('nonExistent')).toBeUndefined();
    });

    test('should set metadata value', () => {
      const entity = new TestEntity();
      entity.setMetadata('testKey', 'testValue');
      expect(entity.metadata.testKey).toBe('testValue');
      expect(entity.metadata.updatedAt).toBeDefined();
    });
  });

  describe('validation', () => {
    test('should validate successfully with valid data', () => {
      const entity = new TestEntity(undefined, {}, 'valid-data');
      const result = entity.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate unsuccessfully with invalid data', () => {
      const entity = new TestEntity(undefined, {}, '');
      const result = entity.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('testData is required');
    });
  });

  describe('serialization', () => {
    test('should serialize to JSON', () => {
      const entity = new TestEntity('test-id', { customField: 'value' }, 'test-data');
      const json = entity.toJSON();
      
      expect(json.id).toBe('test-id');
      expect(json.testData).toBe('test-data');
      expect(json.metadata.customField).toBe('value');
      expect(json.metadata.createdAt).toBeDefined();
    });

    test('should create from JSON', () => {
      const data = {
        id: 'test-id',
        testData: 'test-data',
        metadata: { customField: 'value' }
      };
      const entity = TestEntity.fromJSON(data);
      
      expect(entity.id).toBe('test-id');
      expect(entity.testData).toBe('test-data');
      expect(entity.metadata.customField).toBe('value');
    });
  });

  describe('utility methods', () => {
    test('should clone entity with new ID', () => {
      const original = new TestEntity('original-id', { field: 'value' }, 'original-data');
      
      // Add small delay to ensure different timestamps
      const originalCreatedAt = original.metadata.createdAt;
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValueOnce(new Date(Date.now() + 1).toISOString());
      
      const cloned = original.clone() as TestEntity;
      
      expect(cloned.id).not.toBe(original.id);
      expect(cloned.testData).toBe(original.testData);
      expect(cloned.metadata.field).toBe('value');
      expect(cloned.metadata.createdAt).not.toBe(originalCreatedAt);
    });

    test('should check equality correctly', () => {
      const entity1 = new TestEntity('same-id');
      const entity2 = new TestEntity('same-id');
      const entity3 = new TestEntity('different-id');
      
      expect(entity1.equals(entity2)).toBe(true);
      expect(entity1.equals(entity3)).toBe(false);
    });

    test('should generate hash code', () => {
      const entity = new TestEntity('test-id');
      const hash = entity.hashCode();
      expect(hash).toBe('test:test-id');
    });

    test('should return type and name', () => {
      const entity = new TestEntity(undefined, {}, 'my-test-data');
      expect(entity.getType()).toBe('test');
      expect(entity.getName()).toBe('my-test-data');
    });
  });
});