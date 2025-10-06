import { describe, it, expect } from '@jest/globals';
import { TaskContextDetector } from '../TaskContextDetector';

describe('TaskContextDetector', () => {
  it('detects backend from keywords and files', () => {
    const ctx = TaskContextDetector.detectContext({
      title: 'Build API endpoint for users',
      description: 'Add controller and service for auth',
      entity_links: [
        { entity_type: 'file', entity_id: '1', entity_name: 'users.controller.ts' } as any,
      ],
      stable_tags: [],
    } as any);
    expect(['backend','full-stack']).toContain(ctx.type);
    expect(ctx.confidence).toBeGreaterThan(0);
  });

  it('detects frontend when tags indicate frontend', () => {
    const ctx = TaskContextDetector.detectContext({
      title: 'Implement UI form',
      description: 'Add React component',
      stable_tags: ['frontend'],
    } as any);
    expect(ctx.type).toBe('frontend');
  });
});

