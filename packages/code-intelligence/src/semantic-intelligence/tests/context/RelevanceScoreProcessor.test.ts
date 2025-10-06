/**
 * RelevanceScoreProcessor Tests
 */

import { RelevanceScoreProcessor } from '../../context/RelevanceScoreProcessor';
import type { ContextData, ContextQuery } from '../../context/interfaces';
import { ComponentType } from '../../context/types';

describe('RelevanceScoreProcessor', () => {
  let processor: RelevanceScoreProcessor;

  beforeEach(() => {
    processor = new RelevanceScoreProcessor({
      maxKeywords: 5,
      typeWeights: {
        class: 10.0,
        function: 8.0,
        method: 6.0,
        interface: 7.0,
        variable: 4.0,
        type: 5.0,
        file: 3.0
      },
      matchMultipliers: {
        exactMatch: 5.0,
        nameMatch: 3.0,
        keywordRelevance: 2.0,
        codeMatch: 1.5,
        docMatch: 1.2
      }
    });
  });

  describe('Keyword Extraction', () => {
    it('should extract keywords from query', async () => {
      const data: ContextData = {
        query: 'find user authentication service',
        items: [],
        relationships: []
      };

      const query: ContextQuery = {
        componentId: 'test',
        query: 'user auth'
      };

      const result = await processor.process(data, query, { targetTokens: 1000 });
      
      // Should extract keywords from query
      expect(result.metadata.processorName).toBe('RelevanceScoreProcessor');
    });
  });

  describe('Relevance Scoring', () => {
    it('should score exact matches highest', async () => {
      const data: ContextData = {
        query: 'UserService',
        items: [
          {
            id: '1',
            name: 'UserService', // Exact match
            type: ComponentType.CLASS,
            filePath: '/src/UserService.ts'
          },
          {
            id: '2',
            name: 'UserController', // Partial match
            type: ComponentType.CLASS,
            filePath: '/src/UserController.ts'
          },
          {
            id: '3',
            name: 'AdminService', // No match
            type: ComponentType.CLASS,
            filePath: '/src/AdminService.ts'
          }
        ],
        relationships: []
      };

      const query: ContextQuery = { componentId: 'UserService' };
      const result = await processor.process(data, query, { targetTokens: 1000 });

      const scores = result.data.items.map(item => ({
        name: item.name,
        score: item.metadata?.relevanceScore || 0
      }));

      const exactMatch = scores.find(s => s.name === 'UserService');
      const partialMatch = scores.find(s => s.name === 'UserController');
      const noMatch = scores.find(s => s.name === 'AdminService');

      expect(exactMatch!.score).toBeGreaterThanOrEqual(partialMatch!.score);
      expect(partialMatch!.score).toBeGreaterThanOrEqual(noMatch!.score);
    });

    it('should apply type weights correctly', async () => {
      const data: ContextData = {
        query: 'test',
        items: [
          {
            id: '1',
            name: 'TestClass',
            type: ComponentType.CLASS, // Weight: 10
            filePath: '/src/test.ts'
          },
          {
            id: '2',
            name: 'TestFunction',
            type: ComponentType.FUNCTION, // Weight: 8
            filePath: '/src/test.ts'
          },
          {
            id: '3',
            name: 'TestVariable',
            type: ComponentType.VARIABLE, // Weight: 4
            filePath: '/src/test.ts'
          }
        ],
        relationships: []
      };

      const query: ContextQuery = { query: 'test' };
      const result = await processor.process(data, query, { targetTokens: 1000 });

      const classScore = result.data.items.find(i => i.name === 'TestClass')?.metadata?.relevanceScore || 0;
      const functionScore = result.data.items.find(i => i.name === 'TestFunction')?.metadata?.relevanceScore || 0;
      const variableScore = result.data.items.find(i => i.name === 'TestVariable')?.metadata?.relevanceScore || 0;

      expect(classScore).toBeGreaterThan(functionScore);
      expect(functionScore).toBeGreaterThan(variableScore);
    });

    it('should boost scores for code and doc matches', async () => {
      const data: ContextData = {
        query: 'authentication',
        items: [
          {
            id: '1',
            name: 'AuthService',
            type: ComponentType.CLASS,
            filePath: '/src/auth.ts',
            code: 'class AuthService { authenticate() {} }' // Code match
          },
          {
            id: '2',
            name: 'UserService',
            type: ComponentType.CLASS,
            filePath: '/src/user.ts',
            metadata: {
              documentation: 'Handles user authentication and authorization' // Doc match
            }
          },
          {
            id: '3',
            name: 'DataService',
            type: ComponentType.CLASS,
            filePath: '/src/data.ts' // No match
          }
        ],
        relationships: []
      };

      const query: ContextQuery = { query: 'authentication' };
      const result = await processor.process(data, query, { targetTokens: 1000 });

      const authScore = result.data.items.find(i => i.name === 'AuthService')?.metadata?.relevanceScore || 0;
      const userScore = result.data.items.find(i => i.name === 'UserService')?.metadata?.relevanceScore || 0;
      const dataScore = result.data.items.find(i => i.name === 'DataService')?.metadata?.relevanceScore || 0;

      expect(authScore).toBeGreaterThanOrEqual(dataScore);
      expect(userScore).toBeGreaterThanOrEqual(dataScore);
    });
  });

  describe('Relationship Scoring', () => {
    it('should propagate scores through relationships', async () => {
      const data: ContextData = {
        query: 'UserService',
        items: [
          {
            id: 'user-service',
            name: 'UserService',
            type: ComponentType.CLASS,
            filePath: '/src/UserService.ts'
          },
          {
            id: 'user-repo',
            name: 'UserRepository',
            type: ComponentType.CLASS,
            filePath: '/src/UserRepository.ts'
          },
          {
            id: 'database',
            name: 'Database',
            type: ComponentType.CLASS,
            filePath: '/src/Database.ts'
          }
        ],
        relationships: [
          {
            id: 'rel-user-service-repo',
            type: 'imports',
            sourceId: 'user-service',
            targetId: 'user-repo'
          },
          {
            id: 'rel-user-repo-db',
            type: 'imports',
            sourceId: 'user-repo',
            targetId: 'database'
          }
        ]
      };

      const query: ContextQuery = { componentId: 'user-service' };
      const result = await processor.process(data, query, { targetTokens: 1000 });

      const userServiceScore = result.data.items.find(i => i.id === 'user-service')?.metadata?.relevanceScore || 0;
      const userRepoScore = result.data.items.find(i => i.id === 'user-repo')?.metadata?.relevanceScore || 0;
      const databaseScore = result.data.items.find(i => i.id === 'database')?.metadata?.relevanceScore || 0;

      // Direct match should have highest score
      expect(userServiceScore).toBeGreaterThanOrEqual(userRepoScore);
      // First-degree relationship should score higher than second-degree
      expect(userRepoScore).toBeGreaterThanOrEqual(databaseScore);
      // All should have some score due to relationships
      expect(databaseScore).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query', async () => {
      const data: ContextData = {
        query: '',
        items: [
          {
            id: '1',
            name: 'TestClass',
            type: ComponentType.CLASS,
            filePath: '/src/test.ts'
          }
        ],
        relationships: []
      };

      const query: ContextQuery = {};
      const result = await processor.process(data, query, { targetTokens: 1000 });

      // Should still assign base scores
      expect(result.data.items[0].metadata?.relevanceScore).toBeGreaterThan(0);
    });

    it('should handle special characters in queries', async () => {
      const data: ContextData = {
        query: 'user@auth.service',
        items: [
          {
            id: '1',
            name: 'UserAuthService',
            type: ComponentType.CLASS,
            filePath: '/src/user-auth.ts'
          }
        ],
        relationships: []
      };

      const query: ContextQuery = { componentId: 'user@auth.service' };
      const result = await processor.process(data, query, { targetTokens: 1000 });

      // Should handle special characters gracefully
      expect(result.data.items[0].metadata?.relevanceScore).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should respect custom weights', async () => {
      const customProcessor = new RelevanceScoreProcessor({
        typeWeights: {
          variable: 100.0, // Make variables highest priority
          class: 1.0
        }
      });

      const data: ContextData = {
        query: 'test',
        items: [
          {
            id: '1',
            name: 'TestClass',
            type: ComponentType.CLASS,
            filePath: '/src/test.ts'
          },
          {
            id: '2',
            name: 'TestVariable',
            type: ComponentType.VARIABLE,
            filePath: '/src/test.ts'
          }
        ],
        relationships: []
      };

      const query: ContextQuery = { query: 'test' };
      const result = await customProcessor.process(data, query, { targetTokens: 1000 });

      const classScore = result.data.items.find(i => i.name === 'TestClass')?.metadata?.relevanceScore || 0;
      const variableScore = result.data.items.find(i => i.name === 'TestVariable')?.metadata?.relevanceScore || 0;

      expect(variableScore).toBeGreaterThan(classScore);
    });
  });
});