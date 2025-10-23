import type { KBStructureDefinition } from '../types.js';

/**
 * Refactor Knowledge Base Template
 *
 * A workspace for planning and executing code refactoring.
 * Tracks impact analysis, migration plans, and progress.
 */
export const REFACTOR_KB_STRUCTURE: KBStructureDefinition = {
  name: 'Refactor Knowledge Base',
  description: 'Structured workspace for code refactoring with impact tracking and migration planning',
  version: '1.0.0',

  configSchema: [
    // Refactor Scope
    {
      key: 'refactorType',
      label: 'Refactor Type',
      type: 'select',
      options: [
        'rename',           // Renaming variables/functions/classes
        'extract',          // Extracting methods/classes
        'move',            // Moving files/modules
        'restructure',     // Restructuring packages/modules
        'pattern_change',  // Changing design patterns
        'api_update',      // Updating API interfaces
        'performance',     // Performance optimizations
        'database',        // Database schema changes
        'architecture'     // Architectural changes
      ],
      defaultValue: 'restructure',
      required: true
    },
    {
      key: 'estimatedFilesAffected',
      label: 'Estimated Files Affected',
      type: 'number',
      placeholder: 'Approximate number of files that will be changed',
      required: true
    },
    {
      key: 'breakingChanges',
      label: 'Breaking Changes',
      type: 'boolean',
      defaultValue: false,
      required: true
    },
    {
      key: 'requiresDataMigration',
      label: 'Requires Data Migration',
      type: 'boolean',
      defaultValue: false
    },

    // Risk Assessment
    {
      key: 'riskLevel',
      label: 'Risk Level',
      type: 'select',
      options: ['low', 'medium', 'high', 'critical'],
      defaultValue: 'medium',
      required: true
    },
    {
      key: 'parallelRunPeriod',
      label: 'Parallel Run Period (days)',
      type: 'number',
      placeholder: 'Days to run old and new code in parallel (0 if not needed)',
      defaultValue: 0
    },

    // Search Tool Configuration
    {
      key: 'searchLenses',
      label: 'Search Analysis Lenses',
      type: 'multiselect',
      options: [
        'callers',      // Who uses this code
        'callees',      // What this code uses
        'inheritance',  // Class hierarchies
        'imports',      // Module dependencies
        'data-flow'     // Data flow paths
      ],
      defaultValue: ['callers', 'callees'],
      required: true
    },

    // Migration Strategy
    {
      key: 'migrationStrategy',
      label: 'Migration Strategy',
      type: 'select',
      options: [
        'all_at_once',     // Change everything in one go
        'incremental',     // Change piece by piece
        'parallel',        // Run old and new in parallel
        'feature_flag',    // Use feature flags
        'versioned'        // Maintain multiple versions
      ],
      defaultValue: 'incremental'
    },

    // Testing Strategy
    {
      key: 'testStrategy',
      label: 'Test Strategy',
      type: 'multiselect',
      options: [
        'update_existing',   // Update existing tests
        'add_migration',     // Add migration tests
        'snapshot',          // Snapshot testing
        'integration',       // Integration tests
        'e2e',              // End-to-end tests
        'performance'        // Performance tests
      ],
      defaultValue: ['update_existing', 'integration']
    },

    // Verification
    {
      key: 'verificationSteps',
      label: 'Verification Steps',
      type: 'multiselect',
      options: [
        'unit_tests',
        'integration_tests',
        'e2e_tests',
        'manual_testing',
        'performance_check',
        'backward_compat',
        'code_review',
        'staging_deploy'
      ],
      defaultValue: ['unit_tests', 'integration_tests', 'manual_testing']
    }
  ],

  root: {
    title: '{{refactorType}} Refactor',
    description: 'Refactoring workspace for systematic code changes',
    contentTemplate: `# Refactor Overview

**Type:** {{refactorType}}
**Estimated Impact:** {{estimatedFilesAffected}} files
**Breaking Changes:** {{#if breakingChanges}}Yes - Migration Required{{else}}No{{/if}}
**Risk Level:** {{riskLevel}}

## Search Configuration
Analysis will use these lenses: {{searchLenses}}

## Migration Strategy
{{migrationStrategy}}{{#if parallelRunPeriod}} with {{parallelRunPeriod}} days parallel run{{/if}}

## Testing Approach
{{testStrategy}}

## Verification Checklist
{{#each verificationSteps}}
- [ ] {{this}}
{{/each}}`,

    children: [
      {
        title: 'Current State Analysis',
        description: 'Document the existing code structure and problems',
        contentTemplate: `# Current State

## Problems to Solve
- [ ] Document current issues
- [ ] Performance bottlenecks
- [ ] Code smells
- [ ] Technical debt

## Existing Architecture
_Use mcp__felix__search to analyze and document current structure_

## Dependencies
_Document what depends on this code (callers)_

## External Dependencies
_Document what this code depends on (callees)_`,

        rules: [
          {
            name: 'analyze_current_state',
            description: 'Analyze existing code before refactoring',
            guidance_text: 'Analyze the current state before refactoring',
            guidance_template: `Before refactoring, analyze the current state:

1. **Use search tool with configured lenses:**
{{#each searchLenses}}
   - lens={{this}}: Analyze {{this}} relationships
{{/each}}

2. **Document findings in this KB node**

3. **Identify all affected components**

REQUIRED: Must complete analysis before proceeding to planning.`,
            rule_type: 'semantic',
            template_rule_key: 'refactor_current_analysis'
          }
        ]
      },

      {
        title: 'Impact Analysis',
        description: 'Detailed analysis of what will be affected',
        contentTemplate: `# Impact Analysis

## Affected Components
_List from search tool analysis_

## Breaking Changes
{{#if breakingChanges}}
### API Changes
- [ ] Document all signature changes

### Consumer Impact
- [ ] List all consumers that need updates

### Migration Path
- [ ] Define migration strategy
{{else}}
No breaking changes expected.
{{/if}}

## Test Impact
- [ ] Tests that will fail
- [ ] Tests that need updates
- [ ] New tests needed`,

        children: [
          {
            title: 'Files to Change',
            description: 'Complete list of files requiring modification',
            contentTemplate: `# Files Requiring Changes

## Core Changes (Must Change)
_Files that are being refactored_

## Cascading Changes (Affected by Core)
_Files that import/use the refactored code_

## Test File Changes
_Test files that need updates_

Total Files: {{estimatedFilesAffected}}`
          },
          {
            title: 'Signature Changes',
            description: 'Document all function/class signature changes',
            contentTemplate: `# Signature Changes

## Before → After Mappings

### Functions
\`\`\`typescript
// Before
oldFunction(param1: Type1): ReturnType

// After
newFunction(param1: Type1, param2: Type2): NewReturnType
\`\`\`

### Classes
_Document class/interface changes_

### Imports
_Document import path changes_`
          }
        ]
      },

      {
        title: 'Migration Plan',
        description: 'Step-by-step plan for executing the refactor',
        contentTemplate: `# Migration Plan

## Strategy: {{migrationStrategy}}

## Execution Order
1. [ ] Step 1: _Define order of changes_
2. [ ] Step 2: _Consider dependencies_
3. [ ] Step 3: _Minimize breaking changes_

{{#if breakingChanges}}
## Breaking Change Mitigation
{{#if parallelRunPeriod}}
### Parallel Run Period: {{parallelRunPeriod}} days
- [ ] Implement compatibility layer
- [ ] Set up feature flags
- [ ] Monitor both code paths
{{/if}}

## Consumer Migration Guide
_How consumers should update their code_
{{/if}}

## Rollback Plan
_How to revert if issues arise_`,

        rules: [
          {
            name: 'migration_planning',
            description: 'Plan the refactor execution',
            guidance_text: 'Plan the refactor execution',
            guidance_template: `Create a detailed migration plan:

1. **Order of Operations:**
   - Start with leaf dependencies (nothing depends on them)
   - Move up the dependency tree
   - Update tests alongside code

2. **For {{migrationStrategy}} strategy:**
{{#if (eq migrationStrategy "incremental")}}
   - Break into small, safe changes
   - Keep tests passing at each step
   - Commit after each working increment
{{/if}}
{{#if (eq migrationStrategy "parallel")}}
   - Implement compatibility layer
   - Set up feature flags
   - Plan {{parallelRunPeriod}} day transition
{{/if}}

3. **Test Updates:**
   Strategy: {{testStrategy}}`,
            rule_type: 'semantic',
            template_rule_key: 'refactor_migration_plan'
          }
        ]
      },

      {
        title: 'Implementation Tracking',
        description: 'Track progress during refactoring',
        contentTemplate: `# Implementation Progress

## Completed Changes
- [ ] List completed files/components

## In Progress
- [ ] Currently working on

## Remaining Work
- [ ] Yet to be done

## Issues Encountered
- [ ] Document any unexpected issues

## Deviations from Plan
- [ ] Document any changes to original plan`,

        children: [
          {
            title: 'Test Updates',
            description: 'Track test modifications',
            contentTemplate: `# Test Update Progress

## Updated Tests
- [ ] List updated test files

## New Tests Added
- [ ] List new test files

## Test Results
- [ ] All tests passing?
- [ ] Performance benchmarks`
          }
        ]
      },

      {
        title: 'Verification & Completion',
        description: 'Final verification before marking complete',
        contentTemplate: `# Verification Checklist

## Required Verification
{{#each verificationSteps}}
- [ ] {{this}}
{{/each}}

## Performance Verification
- [ ] No performance regressions
- [ ] Memory usage acceptable
- [ ] Response times maintained

## Code Quality
- [ ] Follows project conventions
- [ ] Documentation updated
- [ ] No TODOs left from refactor

## Sign-off
- [ ] Code review completed
- [ ] All tests passing
- [ ] Ready for deployment`,

        rules: [
          {
            name: 'refactor_completion',
            description: 'Verify refactor is complete',
            guidance_text: 'Verify refactor is complete',
            guidance_template: `Before marking refactor complete:

1. **Run all verification steps:**
{{#each verificationSteps}}
   - {{this}}
{{/each}}

2. **Confirm no regressions:**
   - Performance maintained
   - All tests passing
   - No broken functionality

3. **Clean up:**
   - Remove old code
   - Update documentation
   - Archive this KB`,
            rule_type: 'semantic',
            template_rule_key: 'refactor_verification'
          }
        ]
      }
    ]
  }
};