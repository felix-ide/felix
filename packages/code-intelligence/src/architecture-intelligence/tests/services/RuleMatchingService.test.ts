/**
 * Tests for RuleMatchingService
 */

import { RuleMatchingService, RuleMatchingConfig } from '../../services/RuleMatchingService.js';

describe('RuleMatchingService', () => {
  let service: RuleMatchingService;
  let mockRuleStorage: any;

  beforeEach(() => {
    mockRuleStorage = {
      getRules: jest.fn().mockResolvedValue([]),
      getRuleById: jest.fn().mockResolvedValue(null)
    };

    const config: RuleMatchingConfig = {
      cacheExpiry: 5000,
      defaultMinConfidence: 0.5,
      maxResults: 10
    };

    service = new RuleMatchingService(mockRuleStorage, config);
  });

  describe('initialization', () => {
    it('should initialize with storage and config', () => {
      expect(service).toBeDefined();
    });

    it('should use default config when none provided', () => {
      const defaultService = new RuleMatchingService(mockRuleStorage);
      expect(defaultService).toBeDefined();
    });
  });

  describe('cache management', () => {
    it('should clear cache when requested', () => {
      expect(() => service.clearCache()).not.toThrow();
    });
  });
});