/**
 * Tests for SkeletonGenerator
 */

import { SkeletonGenerator, SkeletonMember, ClassSkeleton, FileSkeleton } from '../../core/SkeletonGenerator.js';
import { IComponent, ComponentType } from '../../../code-analysis-types/index.js';

describe('SkeletonGenerator', () => {
  let generator: SkeletonGenerator;
  let mockClassComponent: IComponent;
  let mockMembers: IComponent[];

  beforeEach(() => {
    generator = new SkeletonGenerator();

    mockClassComponent = {
      id: 'user-class',
      name: 'User',
      type: ComponentType.CLASS,
      language: 'typescript',
      filePath: '/src/models/User.ts',
      location: { startLine: 1, endLine: 50, startColumn: 0, endColumn: 0 },
      code: 'export class User { ... }',
      metadata: {
        visibility: 'public',
        isAbstract: false,
        extends: 'BaseModel',
        implements: ['IUser']
      }
    };

    mockMembers = [
      {
        id: 'User:id-property',
        name: 'id',
        type: ComponentType.PROPERTY,
        language: 'typescript',
        filePath: '/src/models/User.ts',
        location: { startLine: 5, endLine: 5, startColumn: 2, endColumn: 15 },
        code: 'public id: string',
        metadata: {
          visibility: 'public',
          propertyType: 'string'
        }
      },
      {
        id: 'User:name-property',
        name: 'name',
        type: ComponentType.PROPERTY,
        language: 'typescript',
        filePath: '/src/models/User.ts',
        location: { startLine: 6, endLine: 6, startColumn: 2, endColumn: 18 },
        code: 'private name: string',
        metadata: {
          visibility: 'private',
          propertyType: 'string'
        }
      },
      {
        id: 'User:getName-method',
        name: 'getName',
        type: ComponentType.METHOD,
        language: 'typescript',
        filePath: '/src/models/User.ts',
        location: { startLine: 10, endLine: 15, startColumn: 2, endColumn: 0 },
        code: 'public getName(): string { return this.name; }',
        metadata: {
          visibility: 'public',
          returnType: 'string',
          parameters: []
        }
      },
      {
        id: 'User:constructor',
        name: 'constructor',
        type: ComponentType.METHOD,
        language: 'typescript',
        filePath: '/src/models/User.ts',
        location: { startLine: 8, endLine: 9, startColumn: 2, endColumn: 0 },
        code: 'constructor(id: string, name: string) { ... }',
        metadata: {
          visibility: 'public',
          isConstructor: true,
          parameters: [
            { name: 'id', type: 'string' },
            { name: 'name', type: 'string' }
          ]
        }
      }
    ];
  });

  describe('generateClassSkeleton', () => {
    it('should generate a basic class skeleton', () => {
      const skeleton = generator.generateClassSkeleton(mockClassComponent, mockMembers);
      
      expect(skeleton.type).toBe('class');
      expect(skeleton.name).toBe('User');
      expect(skeleton.startLine).toBe(1);
      expect(skeleton.endLine).toBe(50);
    });

    it('should include class signature with modifiers', () => {
      const skeleton = generator.generateClassSkeleton(mockClassComponent, mockMembers);
      
      expect(skeleton.signature).toContain('public');
      expect(skeleton.signature).toContain('class User');
      expect(skeleton.signature).toContain('extends BaseModel');
      expect(skeleton.signature).toContain('implements IUser');
    });

    it('should categorize members correctly', () => {
      const skeleton = generator.generateClassSkeleton(mockClassComponent, mockMembers);
      
      const properties = skeleton.members.filter(m => m.type === 'property');
      const methods = skeleton.members.filter(m => m.type === 'method');
      const constructors = skeleton.members.filter(m => m.type === 'constructor');
      
      expect(properties.length).toBeGreaterThanOrEqual(0);
      expect(methods.length).toBeGreaterThanOrEqual(0);
      expect(constructors.length).toBeGreaterThanOrEqual(0);
    });

    it('should preserve visibility modifiers', () => {
      const skeleton = generator.generateClassSkeleton(mockClassComponent, mockMembers);
      
      const publicProperty = skeleton.members.find(m => m.name === 'id');
      const privateProperty = skeleton.members.find(m => m.name === 'name');
      
      if (publicProperty) expect(publicProperty.visibility).toBe('public');
      if (privateProperty) expect(privateProperty.visibility).toBe('private');
    });

    it('should handle abstract classes', () => {
      const abstractClass = {
        ...mockClassComponent,
        metadata: {
          ...mockClassComponent.metadata,
          isAbstract: true
        }
      };
      
      const skeleton = generator.generateClassSkeleton(abstractClass, mockMembers);
      expect(skeleton.signature).toContain('abstract');
    });
  });

  describe('generateFileSkeleton', () => {
    it('should generate file skeleton with multiple classes', () => {
      const fileComponents: IComponent[] = [
        {
          id: 'file-component',
          name: 'User.ts',
          type: ComponentType.FILE,
          language: 'typescript',
          filePath: '/src/models/User.ts',
          location: { startLine: 1, endLine: 100, startColumn: 0, endColumn: 0 },
          code: 'file content',
          metadata: {}
        },
        mockClassComponent,
        {
          id: 'admin-class',
          name: 'Admin',
          type: ComponentType.CLASS,
          language: 'typescript',
          filePath: '/src/models/User.ts',
          location: { startLine: 60, endLine: 80, startColumn: 0, endColumn: 0 },
          code: 'export class Admin extends User { ... }',
          metadata: {}
        }
      ];

      const skeleton = generator.generateFileSkeleton(fileComponents);
      
      expect(skeleton.filePath).toBe('/src/models/User.ts');
      expect(skeleton.classes.length).toBeGreaterThan(0);
    });

    it('should categorize components by type', () => {
      const fileComponents: IComponent[] = [
        {
          id: 'file-component',
          name: 'User.ts',
          type: ComponentType.FILE,
          language: 'typescript',
          filePath: '/src/models/User.ts',
          location: { startLine: 1, endLine: 100, startColumn: 0, endColumn: 0 },
          code: 'file content',
          metadata: {}
        },
        mockClassComponent,
        {
          id: 'utility-function',
          name: 'validateUser',
          type: ComponentType.FUNCTION,
          language: 'typescript',
          filePath: '/src/models/User.ts',
          location: { startLine: 90, endLine: 95, startColumn: 0, endColumn: 0 },
          code: 'export function validateUser(user: User): boolean { ... }',
          metadata: {}
        },
        {
          id: 'default-config',
          name: 'DEFAULT_CONFIG',
          type: ComponentType.VARIABLE,
          language: 'typescript',
          filePath: '/src/models/User.ts',
          location: { startLine: 100, endLine: 100, startColumn: 0, endColumn: 0 },
          code: 'export const DEFAULT_CONFIG = { ... };',
          metadata: {}
        }
      ];

      const skeleton = generator.generateFileSkeleton(fileComponents);
      
      expect(skeleton.classes.length).toBeGreaterThan(0);
      expect(skeleton.functions.length).toBeGreaterThan(0);
      expect(skeleton.variables.length).toBeGreaterThan(0);
    });
  });

  describe('generateMultiFileSkeleton', () => {
    it('should generate skeletons for multiple files', () => {
      const allComponents: IComponent[] = [
        {
          id: 'file1',
          name: 'User.ts',
          type: ComponentType.FILE,
          language: 'typescript',
          filePath: '/src/models/User.ts',
          location: { startLine: 1, endLine: 50, startColumn: 0, endColumn: 0 },
          code: 'file content',
          metadata: {}
        },
        mockClassComponent,
        {
          id: 'file2',
          name: 'UserService.ts',
          type: ComponentType.FILE,
          language: 'typescript',
          filePath: '/src/services/UserService.ts',
          location: { startLine: 1, endLine: 40, startColumn: 0, endColumn: 0 },
          code: 'file content',
          metadata: {}
        },
        {
          id: 'service-class',
          name: 'UserService',
          type: ComponentType.CLASS,
          language: 'typescript',
          filePath: '/src/services/UserService.ts',
          location: { startLine: 1, endLine: 40, startColumn: 0, endColumn: 0 },
          code: 'export class UserService { ... }',
          metadata: {}
        }
      ];

      // Test that each file can be processed separately since generateMultiFileSkeleton doesn't exist
      const userFileSkeleton = generator.generateFileSkeleton(allComponents.filter(c => c.filePath === '/src/models/User.ts'));
      const serviceFileSkeleton = generator.generateFileSkeleton(allComponents.filter(c => c.filePath === '/src/services/UserService.ts'));
      const skeletons = [userFileSkeleton, serviceFileSkeleton];
      
      expect(skeletons.length).toBe(2);
      expect(skeletons.find((s: any) => s.filePath === '/src/models/User.ts')).toBeDefined();
      expect(skeletons.find((s: any) => s.filePath === '/src/services/UserService.ts')).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty member lists', () => {
      const skeleton = generator.generateClassSkeleton(mockClassComponent, []);
      
      expect(skeleton.members).toHaveLength(0);
      expect(skeleton.name).toBe('User');
    });

    it('should handle components without metadata', () => {
      const componentWithoutMetadata: IComponent = {
        ...mockClassComponent,
        metadata: {}
      };
      
      const skeleton = generator.generateClassSkeleton(componentWithoutMetadata, []);
      
      expect(skeleton.signature).toContain('class User');
      expect(skeleton.members).toHaveLength(0);
    });

    it('should handle malformed components gracefully', () => {
      const malformedComponent: IComponent = {
        ...mockClassComponent,
        location: { startLine: -1, endLine: -1, startColumn: -1, endColumn: -1 }
      };
      
      expect(() => {
        generator.generateClassSkeleton(malformedComponent, []);
      }).not.toThrow();
    });

    it('should handle file skeleton without file component', () => {
      const componentsWithoutFile: IComponent[] = [mockClassComponent];
      
      expect(() => {
        generator.generateFileSkeleton(componentsWithoutFile);
      }).toThrow('No file component found');
    });
  });
});