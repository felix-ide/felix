import type { McpToolDefinition } from './common.js';

export const DEGRADATION_TOOL: McpToolDefinition = {
  name: 'degradation',
  description: `Automatic metadata cleanup system. Maintains data quality by removing stale information and deactivating ineffective rules.

PURPOSE: Keep metadata lean and relevant. Prevents accumulation of obsolete tags and unused rules over time.

Required: project, action(status|run_cleanup|configure|stop|start)
Configure: config{enabled,intervalHours,runOnStartup,maxRetries,retryDelayMinutes}

DEFAULT BEHAVIOR:
- Runs automatically every 24 hours
- Removes tags unused for 30+ days
- Marks rules as inactive if unused or ineffective
- Non-blocking background process

TYPICAL USE: Check status or run manual cleanup. Configure only if you need different intervals. Most users never touch this.`,
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



