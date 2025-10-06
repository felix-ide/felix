/**
 * Tests for ContextGenerationAPI
 */

import { ContextGenerationAPI, ProcessorChain } from '../../context/ContextGenerationAPI.js';
import type { ContextGenerationOptions } from '../../context/types.js';

describe('ContextGenerationAPI', () => {
  let api: ContextGenerationAPI;
  let mockKnowledgeGraph: any;

  beforeEach(() => {
    mockKnowledgeGraph = {
      addComponent: jest.fn(),
      deleteComponent: jest.fn(),
      getComponent: jest.fn(),
      search: jest.fn().mockResolvedValue({ components: [], relationships: [] }),
      addRelationship: jest.fn(),
      deleteRelationship: jest.fn(),
      getRelationship: jest.fn(),
      findPath: jest.fn(),
      findComponents: jest.fn(),
      getStats: jest.fn(),
      clear: jest.fn()
    };

    const options: ContextGenerationOptions = {
      maxTokens: 4000,
      includeCode: true,
      includeRelationships: true,
      maxDepth: 2
    };

    api = new ContextGenerationAPI(mockKnowledgeGraph, [], options);
  });

  describe('initialization', () => {
    it('should initialize with knowledge graph and options', () => {
      expect(api).toBeDefined();
    });

    it('should use default options when none provided', () => {
      const defaultApi = new ContextGenerationAPI(mockKnowledgeGraph);
      expect(defaultApi).toBeDefined();
    });
  });

  describe('processor management', () => {
    it('should add processors dynamically', () => {
      const processor = {
        name: 'test-processor',
        process: jest.fn().mockResolvedValue({ components: [], relationships: [] })
      };

      api.addProcessor(processor);
      const processors = api.getProcessors();
      expect(processors.find(p => p.name === 'test-processor')).toBeDefined();
    });

    it('should remove processors by name', () => {
      const processor = {
        name: 'removable-processor',
        process: jest.fn().mockResolvedValue({ components: [], relationships: [] })
      };

      api.addProcessor(processor);
      api.removeProcessor('removable-processor');
      const processors = api.getProcessors();
      expect(processors.find(p => p.name === 'removable-processor')).toBeUndefined();
    });
  });

  describe('processor chains', () => {
    it('should create processor chain correctly', () => {
      const chain = new ProcessorChain();
      expect(chain).toBeDefined();
    });
  });
});
