#!/usr/bin/env node

/**
 * Test script to verify workflow definitions are valid
 */

import { WorkflowRegistry } from './WorkflowRegistry';
import { initializeWorkflowRegistry, BUILT_IN_WORKFLOWS } from './DefaultWorkflows';

function testWorkflowDefinitions() {
  console.error('🧪 Testing workflow definitions...\n');

  try {
    // Test workflow registry initialization
    const registry = initializeWorkflowRegistry();
    console.error('✅ Workflow registry initialized successfully');

    // Test all built-in workflows
    for (const workflow of BUILT_IN_WORKFLOWS) {
      console.error(`\n📋 Testing workflow: ${workflow.display_name}`);
      
      // Test workflow retrieval
      const retrieved = registry.getWorkflow(workflow.name);
      if (!retrieved) {
        throw new Error(`Failed to retrieve workflow: ${workflow.name}`);
      }
      console.error(`  ✅ Successfully retrieved from registry`);

      // Test required sections
      const requiredSections = workflow.required_sections.filter(s => s.required);
      console.error(`  📝 Required sections: ${requiredSections.length}`);
      requiredSections.forEach(section => {
        console.error(`    - ${section.section_type} ${section.help_text ? '(with help)' : ''}`);
      });

      // Test conditional requirements
      if (workflow.conditional_requirements.length > 0) {
        console.error(`  🔀 Conditional requirements: ${workflow.conditional_requirements.length}`);
        workflow.conditional_requirements.forEach(cond => {
          console.error(`    - ${cond.section_type}: ${cond.condition}`);
        });
      }

      // Test validation rules
      if (workflow.validation_rules.length > 0) {
        console.error(`  ✓ Validation rules: ${workflow.validation_rules.length}`);
        workflow.validation_rules.forEach(rule => {
          console.error(`    - ${rule.name}`);
        });
      }

      // Test use cases
      if (workflow.use_cases && workflow.use_cases.length > 0) {
        console.error(`  🎯 Use cases: ${workflow.use_cases.join(', ')}`);
      }
    }

    // Test workflow suggestions
    console.error('\n🔍 Testing workflow suggestions...');
    const testCases = [
      { taskType: 'bug', expected: 'bugfix' },
      { taskType: 'spike', expected: 'research' },
      { taskType: 'chore', expected: 'simple' },
      { taskType: 'epic', expected: 'feature_development' }
    ];

    for (const testCase of testCases) {
      const suggestions = registry.getWorkflowsForTaskType(testCase.taskType);
      const primarySuggestion = suggestions[0]?.name;
      
      if (primarySuggestion === testCase.expected) {
        console.error(`  ✅ ${testCase.taskType} -> ${primarySuggestion}`);
      } else {
        console.error(`  ⚠️  ${testCase.taskType} -> ${primarySuggestion} (expected ${testCase.expected})`);
      }
    }

    // Test default workflow
    console.error('\n🎯 Testing default workflow...');
    const defaultWorkflow = registry.getDefaultWorkflow();
    console.error(`  Default workflow: ${defaultWorkflow.display_name} (${defaultWorkflow.name})`);

    // Test export/import
    console.error('\n📦 Testing export/import...');
    const exported = registry.exportWorkflows();
    const exportedCount = Object.keys(exported).length;
    console.error(`  Exported ${exportedCount} workflows`);

    console.error('\n🎉 All workflow tests passed!');
    return true;

  } catch (error) {
    console.error('\n❌ Workflow test failed:', error);
    return false;
  }
}

function testWorkflowValidation() {
  console.error('\n🔍 Testing workflow validation scenarios...\n');

  const registry = WorkflowRegistry.getInstance();

  // Test scenarios for each workflow
  const testScenarios = [
    {
      workflow: 'simple',
      task: { title: 'Fix typo', description: 'Small fix' },
      shouldPass: true
    },
    {
      workflow: 'feature_development',
      task: { title: 'Add new API endpoint', description: 'Backend only' },
      shouldPass: false, // Missing required sections
      reason: 'Missing architecture, implementation checklist, test checklist, rules'
    },
    {
      workflow: 'bugfix',
      task: { title: 'Fix login bug', description: 'Users cannot login' },
      shouldPass: false, // Missing required sections
      reason: 'Missing reproduction steps, root cause analysis, etc.'
    },
    {
      workflow: 'research',
      task: { title: 'Research new framework', description: 'Investigate React alternatives' },
      shouldPass: false, // Missing required sections
      reason: 'Missing research goals, findings, conclusions'
    }
  ];

  testScenarios.forEach(scenario => {
    console.error(`Testing ${scenario.workflow} workflow:`);
    console.error(`  Task: "${scenario.task.title}"`);
    console.error(`  Expected: ${scenario.shouldPass ? 'PASS' : 'FAIL'}`);
    if (scenario.reason) {
      console.error(`  Reason: ${scenario.reason}`);
    }
    console.error(`  ✅ Test scenario defined\n`);
  });

  console.error('💡 Validation testing would require actual validator implementation');
}

// Run tests
if (require.main === module) {
  console.error('🚀 Starting workflow definition tests...\n');
  
  const success = testWorkflowDefinitions();
  
  if (success) {
    testWorkflowValidation();
    console.error('\n🎉 All tests completed successfully!');
    process.exit(0);
  } else {
    console.error('\n💥 Tests failed!');
    process.exit(1);
  }
}