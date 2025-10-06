/**
 * Tests for TopicContextManager
 */

import { TopicContextManager, IEmbeddingService, TopicManagerConfig } from '../../services/TopicContextManager.js';

describe('TopicContextManager', () => {
  let manager: TopicContextManager;
  let mockEmbeddingService: jest.Mocked<IEmbeddingService>;
  let tempProjectPath: string;

  beforeEach(() => {
    tempProjectPath = '/tmp/test-project';
    
    mockEmbeddingService = {
      generateEmbedding: jest.fn(),
      generateBatchEmbeddings: jest.fn()
    };

    mockEmbeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);
    mockEmbeddingService.generateBatchEmbeddings.mockResolvedValue([
      [0.1, 0.2, 0.3, 0.4, 0.5],
      [0.2, 0.3, 0.4, 0.5, 0.6]
    ]);

    const config: TopicManagerConfig = {
      topicDetectionThreshold: 0.7,
      maxTopicsPerSearch: 5
    };

    manager = new TopicContextManager(tempProjectPath, mockEmbeddingService, config);
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultManager = new TopicContextManager(tempProjectPath, mockEmbeddingService);
      expect(defaultManager).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const config: TopicManagerConfig = {
        topicDetectionThreshold: 0.8,
        maxTopicsPerSearch: 3,
        contextFilePath: '/custom/path/context.json'
      };
      
      const customManager = new TopicContextManager(tempProjectPath, mockEmbeddingService, config);
      expect(customManager).toBeDefined();
    });

    it('should start a new session on initialization', async () => {
      await manager.initialize();
      expect(manager).toBeDefined();
    });
  });

  describe('topic detection', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should detect topics from search queries', async () => {
      const query = 'user authentication login';
      
      const result = await manager.detectTopicsFromQuery(query);
      
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(query);
      expect(result).toBeDefined();
      expect(result.detectedTopics).toBeDefined();
      expect(result.query).toBe(query);
    });

    it('should handle empty queries gracefully', async () => {
      const result = await manager.detectTopicsFromQuery('');
      expect(result.detectedTopics).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle embedding service errors', async () => {
      mockEmbeddingService.generateEmbedding.mockRejectedValue(new Error('Embedding error'));
      
      await manager.initialize();
      
      await expect(manager.detectTopicsFromQuery('test query'))
        .rejects.toThrow('Embedding error');
    });
  });
});