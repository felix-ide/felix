import { describe, it, expect, beforeEach, afterEach } from 'vitest';
// Need real TypeORM for integration tests, not mocks
import { DataSource } from 'typeorm';
import { ComponentRepository } from '../ComponentRepository';
import { Component } from '../../entities/index/Component.entity';
import { Relationship } from '../../entities/index/Relationship.entity';
import { ComponentType } from '@felix/code-intelligence';
import type { IComponent } from '@felix/code-intelligence';
import { RelationshipRepository } from '../RelationshipRepository';

describe('ComponentRepository REAL Integration Tests', () => {
  let dataSource: DataSource;
  let repository: ComponentRepository;

  beforeEach(async () => {
    // Create in-memory SQLite database for testing
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [Component, Relationship],
      synchronize: true,
      logging: true, // Enable logging to debug
      dropSchema: true // Drop and recreate schema each time
    });

    try {
      await dataSource.initialize();
    } catch (error) {
      console.error('Failed to initialize DataSource:', error);
      throw error;
    }
    console.log('DataSource initialized:', dataSource.isInitialized);
    if (dataSource.isInitialized) {
      console.log('Entities:', dataSource.entityMetadatas.map(e => e.name));
    } else {
      console.error('DataSource failed to initialize!');
    }
    const relationshipRepo = new RelationshipRepository(dataSource);
    repository = new ComponentRepository(dataSource, process.cwd(), relationshipRepo);
  });

  afterEach(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('storeComponent', () => {
    it('should store a component and retrieve it', async () => {
      const component: IComponent = {
        id: 'test-component-1',
        name: 'TestClass',
        type: ComponentType.CLASS,
        language: 'typescript',
        filePath: '/src/test.ts',
        location: {
          startLine: 10,
          endLine: 50,
          startColumn: 0,
          endColumn: 0
        },
        code: 'class TestClass { /* code */ }',
        metadata: {
          exported: true,
          abstract: false
        }
      };

      const result = await repository.storeComponent(component);
      console.log('Store result:', result);
      expect(result.success).toBe(true);

      // Check if component is actually stored
      const allComponents = await repository.getAllComponents();
      console.log('All components after store:', allComponents);

      const retrieved = await repository.getComponent('test-component-1');
      console.log('Retrieved component:', retrieved);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('TestClass');
      expect(retrieved?.type).toBe(ComponentType.CLASS);
      expect(retrieved?.language).toBe('typescript');
      expect(retrieved?.code).toBe('class TestClass { /* code */ }');
    });

    it('should update existing component', async () => {
      const component: IComponent = {
        id: 'update-test',
        name: 'OldName',
        type: ComponentType.FUNCTION,
        language: 'javascript',
        filePath: '/src/old.js',
        metadata: {},
          location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 }
      };

      await repository.storeComponent(component);

      const updated: IComponent = {
        ...component,
        name: 'NewName',
        code: 'function NewName() { /* updated */ }'
      };

      await repository.storeComponent(updated);

      const retrieved = await repository.getComponent('update-test');
      expect(retrieved?.name).toBe('NewName');
      expect(retrieved?.code).toBe('function NewName() { /* updated */ }');
    });
  });

  describe('storeComponents', () => {
    it('should store multiple components in batch', async () => {
      const components: IComponent[] = [
        {
          id: 'batch-1',
          name: 'Component1',
          type: ComponentType.CLASS,
          language: 'typescript',
          filePath: '/src/comp1.ts',
          metadata: {},
          location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 }
        },
        {
          id: 'batch-2',
          name: 'Component2',
          type: ComponentType.FUNCTION,
          language: 'typescript',
          filePath: '/src/comp2.ts',
          metadata: {},
          location: { startLine: 1, endLine: 5, startColumn: 0, endColumn: 0 }
        },
        {
          id: 'batch-3',
          name: 'Component3',
          type: ComponentType.INTERFACE,
          language: 'typescript',
          filePath: '/src/comp3.ts',
          metadata: {},
          location: { startLine: 1, endLine: 8, startColumn: 0, endColumn: 0 }
        }
      ];

      const result = await repository.storeComponents(components);
      expect(result.success).toBe(true);
      expect(result.affected).toBe(3);

      const all = await repository.getAllComponents();
      expect(all).toHaveLength(3);
      expect(all.map((c: any) => c.name).sort()).toEqual(['Component1', 'Component2', 'Component3']);
    });
  });

  describe('searchComponents', () => {
    beforeEach(async () => {
      const components: IComponent[] = [
        {
          id: 'search-1',
          name: 'UserService',
          type: ComponentType.CLASS,
          language: 'typescript',
          filePath: '/src/services/UserService.ts',
          metadata: {},
          location: { startLine: 1, endLine: 100, startColumn: 0, endColumn: 0 }
        },
        {
          id: 'search-2',
          name: 'getUserById',
          type: ComponentType.FUNCTION,
          language: 'typescript',
          filePath: '/src/services/UserService.ts',
          metadata: {},
          location: { startLine: 20, endLine: 30, startColumn: 0, endColumn: 0 }
        },
        {
          id: 'search-3',
          name: 'AuthService',
          type: ComponentType.CLASS,
          language: 'typescript',
          filePath: '/src/services/AuthService.ts',
          metadata: {},
          location: { startLine: 1, endLine: 150, startColumn: 0, endColumn: 0 }
        },
        {
          id: 'search-4',
          name: 'validateUser',
          type: ComponentType.FUNCTION,
          language: 'typescript',
          filePath: '/src/services/AuthService.ts',
          metadata: {},
          location: { startLine: 50, endLine: 70, startColumn: 0, endColumn: 0 }
        }
      ];

      await repository.storeComponents(components);
    });

    it('should search by name pattern', async () => {
      const result = await repository.searchComponents({
        query: 'User',
        limit: 10
      });

      // 'User' pattern should match: UserService, getUserById, validateUser
      expect(result.items).toHaveLength(3);
      expect(result.items.map((c: any) => c.name).sort()).toEqual(['UserService', 'getUserById', 'validateUser']);
    });

    it('should search by type', async () => {
      const result = await repository.searchComponents({
        type: ComponentType.CLASS,
        limit: 10
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.map((c: any) => c.name).sort()).toEqual(['AuthService', 'UserService']);
    });

    it('should search by language', async () => {
      const result = await repository.searchComponents({
        language: 'typescript',
        limit: 10
      });

      expect(result.items).toHaveLength(4);
    });

    it('should search by file path', async () => {
      const result = await repository.searchComponents({
        filePath: '/src/services/AuthService.ts',
        limit: 10
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.map((c: any) => c.name).sort()).toEqual(['AuthService', 'validateUser']);
    });

    it('should handle pagination', async () => {
      const page1 = await repository.searchComponents({
        limit: 2,
        offset: 0
      });

      expect(page1.items).toHaveLength(2);
      expect(page1.total).toBe(4);
      expect(page1.hasMore).toBe(true);

      const page2 = await repository.searchComponents({
        limit: 2,
        offset: 2
      });

      expect(page2.items).toHaveLength(2);
      expect(page2.hasMore).toBe(false);

      // Ensure no overlap
      const page1Ids = page1.items.map((c: any) => c.id);
      const page2Ids = page2.items.map((c: any) => c.id);
      const intersection = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(intersection).toHaveLength(0);
    });
  });

  describe('deleteComponent', () => {
    it('should delete a component', async () => {
      const component: IComponent = {
        id: 'delete-test',
        name: 'ToDelete',
        type: ComponentType.CLASS,
        language: 'typescript',
        filePath: '/src/delete.ts',
        metadata: {},
          location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 }
      };

      await repository.storeComponent(component);
      
      const beforeDelete = await repository.getComponent('delete-test');
      expect(beforeDelete).toBeDefined();

      const result = await repository.deleteComponent('delete-test');
      expect(result.success).toBe(true);

      const afterDelete = await repository.getComponent('delete-test');
      expect(afterDelete).toBeNull();
    });

    it('should handle deleting non-existent component', async () => {
      const result = await repository.deleteComponent('non-existent');
      expect(result.success).toBe(false);
      expect(result.affected).toBe(0);
    });
  });

  describe('deleteComponentsInFile', () => {
    it('should delete all components in a file', async () => {
      const components: IComponent[] = [
        {
          id: 'file-1',
          name: 'Component1',
          type: ComponentType.CLASS,
          language: 'typescript',
          filePath: '/src/target.ts',
          metadata: {},
          location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 }
        },
        {
          id: 'file-2',
          name: 'Component2',
          type: ComponentType.FUNCTION,
          language: 'typescript',
          filePath: '/src/target.ts',
          metadata: {},
          location: { startLine: 15, endLine: 25, startColumn: 0, endColumn: 0 }
        },
        {
          id: 'other-1',
          name: 'OtherComponent',
          type: ComponentType.CLASS,
          language: 'typescript',
          filePath: '/src/other.ts',
          metadata: {},
          location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 }
        }
      ];

      await repository.storeComponents(components);

      const result = await repository.deleteComponentsInFile('/src/target.ts');
      expect(result.success).toBe(true);
      expect(result.affected).toBe(2);

      const remaining = await repository.getAllComponents();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.name).toBe('OtherComponent');
    });
  });

  describe('getComponentsByFile', () => {
    it('should get all components in a specific file', async () => {
      const components: IComponent[] = [
        {
          id: 'file-comp-1',
          name: 'FileComponent1',
          type: ComponentType.CLASS,
          language: 'typescript',
          filePath: '/src/specific.ts',
          metadata: {},
          location: { startLine: 1, endLine: 50, startColumn: 0, endColumn: 0 }
        },
        {
          id: 'file-comp-2',
          name: 'FileComponent2',
          type: ComponentType.FUNCTION,
          language: 'typescript',
          filePath: '/src/specific.ts',
          metadata: {},
          location: { startLine: 60, endLine: 80, startColumn: 0, endColumn: 0 }
        },
        {
          id: 'other-comp',
          name: 'OtherFileComponent',
          type: ComponentType.CLASS,
          language: 'typescript',
          filePath: '/src/other.ts',
          metadata: {},
          location: { startLine: 1, endLine: 30, startColumn: 0, endColumn: 0 }
        }
      ];

      await repository.storeComponents(components);

      const fileComponents = await repository.getComponentsByFile('/src/specific.ts');
      expect(fileComponents).toHaveLength(2);
      expect(fileComponents.map((c: IComponent) => c.name).sort()).toEqual(['FileComponent1', 'FileComponent2']);
    });
  });

});
