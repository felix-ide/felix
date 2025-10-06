/**
 * ContentOptimizer Tests
 * 
 * Tests the main content optimization functionality that orchestrates
 * all the individual processors.
 */

import { ContentOptimizer } from '../../context/ContentOptimizer';
import type { ContextData, ContextQuery } from '../../context/interfaces';
import { ComponentType } from '../../context/types';

describe('ContentOptimizer', () => {
  let optimizer: ContentOptimizer;

  const testData: ContextData = {
    query: 'authentication',
    items: [
      {
        id: 'auth-service',
        name: 'AuthService',
        type: ComponentType.CLASS,
        filePath: '/src/auth/AuthService.ts',
        code: 'class AuthService { authenticate(user: User) { return jwt.sign(user); } }',
        metadata: {
          description: 'Handles user authentication and token generation',
          relevanceScore: 0.9
        }
      },
      {
        id: 'user-controller',
        name: 'UserController',
        type: ComponentType.CLASS,
        filePath: '/src/controllers/UserController.ts',
        code: 'class UserController { login(req: Request) { return this.authService.authenticate(req.user); } }',
        metadata: {
          description: 'REST controller for user operations',
          relevanceScore: 0.7
        }
      },
      {
        id: 'config-service',
        name: 'ConfigService',
        type: ComponentType.CLASS,
        filePath: '/src/config/ConfigService.ts',
        code: 'class ConfigService { getJwtSecret() { return process.env.JWT_SECRET; } }',
        metadata: {
          description: 'Application configuration management',
          relevanceScore: 0.3
        }
      }
    ],
    relationships: [
      {
        id: 'rel-1',
        sourceId: 'user-controller',
        targetId: 'auth-service',
        type: 'uses',
        metadata: { relevanceScore: 0.8 }
      },
      {
        id: 'rel-2',
        sourceId: 'auth-service',
        targetId: 'config-service',
        type: 'depends',
        metadata: { relevanceScore: 0.5 }
      }
    ]
  };

  const query: ContextQuery = {
    query: 'authentication login',
    componentId: 'auth-service'
  };

  beforeEach(() => {
    optimizer = new ContentOptimizer({
      targetTokens: 500,
      includeSourceCode: true,
      includeRelationships: true,
      outputFormat: 'json'
    });
  });

  describe('Initialization', () => {
    it('should create optimizer with default options', () => {
      const defaultOptimizer = new ContentOptimizer({
        targetTokens: 1000
      });
      expect(defaultOptimizer).toBeInstanceOf(ContentOptimizer);
    });

    it('should create optimizer with custom options', () => {
      const customOptimizer = new ContentOptimizer({
        targetTokens: 1000,
        includeSourceCode: false,
        outputFormat: 'markdown',
        minified: true
      });
      expect(customOptimizer).toBeInstanceOf(ContentOptimizer);
    });
  });

  describe('Content Optimization', () => {

    it('should optimize content within token limits', async () => {
      const result = await optimizer.optimize(testData, query);

      expect(result.optimizedData).toBeDefined();
      expect(result.finalTokens).toBeLessThanOrEqual(500);
      expect(result.strategiesApplied).toContain('relevance-scoring');
      expect(result.strategiesApplied).toContain('window-sizing');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should preserve protected items', async () => {
      const result = await optimizer.optimize(testData, query);

      // Primary component should be preserved
      const authService = result.optimizedData.items.find(item => item.id === 'auth-service');
      expect(authService).toBeDefined();
      expect(authService!.name).toBe('AuthService');
    });

    it('should apply relevance scoring', async () => {
      const result = await optimizer.optimize(testData, query);

      // Items should have relevance scores
      result.optimizedData.items.forEach(item => {
        expect(item.metadata?.relevanceScore).toBeGreaterThan(0);
      });
    });

    it('should reduce content when over token limit', async () => {
      const largeOptimizer = new ContentOptimizer({
        targetTokens: 50, // Very small limit
        includeSourceCode: true
      });

      const result = await largeOptimizer.optimize(testData, query);

      expect(result.finalTokens).toBeLessThan(result.originalTokens);
      expect(result.itemsRemoved).toBeGreaterThanOrEqual(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Token Estimation', () => {
    it('should estimate tokens for different formats', () => {
      const content = 'function authenticate(user) { return jwt.sign(user); }';
      
      const jsonTokens = optimizer.estimateTokens(content, 'json');
      const markdownTokens = optimizer.estimateTokens(content, 'markdown');
      const textTokens = optimizer.estimateTokens(content, 'text');

      expect(jsonTokens).toBeGreaterThan(0);
      expect(markdownTokens).toBeGreaterThan(0);
      expect(textTokens).toBeGreaterThan(0);
      
      // JSON should have more overhead
      expect(jsonTokens).toBeGreaterThan(textTokens);
    });

    it('should estimate context tokens', () => {
      const tokens = optimizer.estimateContextTokens(testData);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('Content Filtering', () => {
    it('should filter content without token limits', async () => {
      const testData: ContextData = {
        query: 'test',
        items: [
          {
            id: 'item-1',
            name: 'HighRelevance',
            type: ComponentType.FUNCTION,
            filePath: '/src/high.ts',
            metadata: { relevanceScore: 0.9 }
          },
          {
            id: 'item-2',
            name: 'LowRelevance',
            type: ComponentType.FUNCTION,
            filePath: '/src/low.ts',
            metadata: { relevanceScore: 0.1 }
          }
        ],
        relationships: []
      };

      const query: ContextQuery = { query: 'test' };
      const filtered = await optimizer.filterContent(testData, query);

      expect(filtered.items).toHaveLength(2);
      // Should have relevance scores applied
      filtered.items.forEach(item => {
        expect(item.metadata?.relevanceScore).toBeGreaterThan(0);
      });
    });
  });

  describe('Relevance Calculation', () => {
    it('should calculate relevance for individual items', async () => {
      const item = testData.items[0];
      const query: ContextQuery = { query: 'authentication' };
      
      const relevance = await optimizer.calculateRelevance(item, query);
      expect(relevance).toBeGreaterThan(0);
      expect(relevance).toBeLessThanOrEqual(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data', async () => {
      const emptyData: ContextData = {
        query: 'test',
        items: [],
        relationships: []
      };
      const query: ContextQuery = { query: 'test' };

      const result = await optimizer.optimize(emptyData, query);
      
      expect(result.optimizedData.items).toHaveLength(0);
      expect(result.optimizedData.relationships).toHaveLength(0);
      expect(result.finalTokens).toBe(0);
    });

    it('should handle very large token targets', async () => {
      const largeOptimizer = new ContentOptimizer({
        targetTokens: 10000 // Very large limit
      });

      const result = await largeOptimizer.optimize(testData, query);
      
      // Should not need to remove any content
      expect(result.itemsRemoved).toBe(0);
      expect(result.relationshipsRemoved).toBe(0);
    });

    it('should handle optimization errors gracefully', async () => {
      // Create invalid data that might cause errors
      const invalidData = {
        ...testData,
        query: 'test',
        items: testData.items.map(item => ({
          ...item,
          code: null as any // Invalid code field
        }))
      };

      const query: ContextQuery = { query: 'test' };
      
      // Should not throw but handle gracefully
      await expect(optimizer.optimize(invalidData, query)).resolves.toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should respect includeSourceCode option', async () => {
      const noCodeOptimizer = new ContentOptimizer({
        targetTokens: 500,
        includeSourceCode: false
      });

      const result = await noCodeOptimizer.optimize(testData, query);
      
      // Should optimize differently when source code is excluded
      expect(result.optimizedData).toBeDefined();
    });

    it('should respect includeRelationships option', async () => {
      const noRelOptimizer = new ContentOptimizer({
        targetTokens: 500,
        includeRelationships: false
      });

      const result = await noRelOptimizer.optimize(testData, query);
      
      // Should optimize differently when relationships are excluded
      expect(result.optimizedData).toBeDefined();
    });

    it('should use different output formats', async () => {
      const markdownOptimizer = new ContentOptimizer({
        targetTokens: 500,
        outputFormat: 'markdown'
      });

      const result = await markdownOptimizer.optimize(testData, query);
      
      expect(result.optimizedData).toBeDefined();
      expect(result.finalTokens).toBeGreaterThan(0);
    });
  });
});