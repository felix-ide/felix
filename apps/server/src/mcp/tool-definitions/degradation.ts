import type { McpToolDefinition } from './common.js';

export const DEGRADATION_TOOL: McpToolDefinition = {
  name: 'degradation',
  description: `Automatic cleanup system for maintaining metadata quality over time.

PURPOSE:
- Removes stale or unused tags automatically
- Reduces inactive rules based on usage metrics
- Maintains lean, relevant metadata
- Prevents accumulation of obsolete information

ACTIONS:
- status: Check degradation scheduler status and last run
- run_cleanup: Manually trigger cleanup process
- configure: Adjust automatic cleanup schedule
- start/stop: Control automatic scheduler

DEFAULT BEHAVIOR:
- Runs automatically every 24 hours
- Removes tags unused for 30+ days
- Marks rules as inactive if unused/ineffective`,
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      action: {
        type: 'string',
        enum: ['status', 'run_cleanup', 'configure', 'stop', 'start'],
        description: 'Action to perform'
      },
      // For configure action
      config: {
        type: 'object',
        description: 'Scheduler configuration (for configure action)',
        properties: {
          enabled: { type: 'boolean' },
          intervalHours: { type: 'number' },
          runOnStartup: { type: 'boolean' },
          maxRetries: { type: 'number' },
          retryDelayMinutes: { type: 'number' }
        }
      }
    },
    required: ['project', 'action']
  }
};

/* TOOLS export moved to bottom after all tool declarations */



