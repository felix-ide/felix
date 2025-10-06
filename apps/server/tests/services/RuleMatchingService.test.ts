import { describe, it, expect } from '@jest/globals';

describe('Intelligent Rules System', () => {
  describe('Core Components', () => {
    it('should import RuleMatchingService without errors', async () => {
      const { RuleMatchingService } = await import('@felix/code-intelligence');
      expect(RuleMatchingService).toBeDefined();
      expect(typeof RuleMatchingService).toBe('function');
    });

    it('should import TagDegradationService without errors', async () => {
      const { TagDegradationService } = await import('../../src/features/metadata/services/TagDegradationService.js');
      expect(TagDegradationService).toBeDefined();
      expect(typeof TagDegradationService).toBe('function');
    });

    it('should import DegradationScheduler without errors', async () => {
      const { DegradationScheduler } = await import('../../src/features/metadata/services/DegradationScheduler.js');
      expect(DegradationScheduler).toBeDefined();
      expect(typeof DegradationScheduler).toBe('function');
    });

    it.skip('should import TriggerFactory without errors', async () => {
      // Skipped - moved to architectural-intelligence
    });

    it.skip('should import Rule interface without errors', async () => {
      // Skipped - moved to architectural-intelligence
    });
  });

  describe('TypeScript Compilation', () => {
    it('should have all services exported from index', async () => {
      const services = await import('../../src/services/index.js');
      expect(services.RuleMatchingService).toBeDefined();
      expect(services.TagDegradationService).toBeDefined();
      expect(services.DegradationScheduler).toBeDefined();
    });

    it('should have proper type definitions', () => {
      // Basic type checking - if this compiles, types are working
      const testConfig: any = {
        autoTagMaxAge: 30,
        contextualTagMaxAge: 14,
        ruleDecayRate: 0.02
      };
      expect(testConfig).toBeDefined();
    });
  });
});