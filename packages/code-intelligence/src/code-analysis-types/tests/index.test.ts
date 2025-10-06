/**
 * Integration tests for main index exports
 */

import * as CodeAnalysisTypes from '../index.js';

describe('Main exports', () => {
  test('should export core types', () => {
    expect(CodeAnalysisTypes.ComponentType).toBeDefined();
    expect(CodeAnalysisTypes.RelationshipType).toBeDefined();
    expect(CodeAnalysisTypes.ComponentType.CLASS).toBe('class');
    expect(CodeAnalysisTypes.RelationshipType.IMPORTS).toBe('imports');
  });

  test('should export interfaces', () => {
    // These are TypeScript interfaces, so we can't test them directly at runtime
    // But we can test that the module doesn't throw when imported
    expect(typeof CodeAnalysisTypes).toBe('object');
  });

  test('should export base entity', () => {
    expect(CodeAnalysisTypes.BaseEntity).toBeDefined();
    expect(typeof CodeAnalysisTypes.BaseEntity).toBe('function');
  });

  test('should export component implementations', () => {
    expect(CodeAnalysisTypes.BaseComponent).toBeDefined();
    expect(CodeAnalysisTypes.FileComponent).toBeDefined();
    expect(CodeAnalysisTypes.ClassComponent).toBeDefined();
    expect(CodeAnalysisTypes.FunctionComponent).toBeDefined();
    expect(CodeAnalysisTypes.MethodComponent).toBeDefined();
    expect(CodeAnalysisTypes.PropertyComponent).toBeDefined();
    expect(CodeAnalysisTypes.VariableComponent).toBeDefined();
    expect(CodeAnalysisTypes.Relationship).toBeDefined();
  });

  test('should export metadata models', () => {
    expect(CodeAnalysisTypes.NoteValidator).toBeDefined();
    expect(CodeAnalysisTypes.NoteUtils).toBeDefined();
    expect(CodeAnalysisTypes.TaskValidator).toBeDefined();
    expect(CodeAnalysisTypes.TaskUtils).toBeDefined();
    expect(CodeAnalysisTypes.RuleValidator).toBeDefined();
    expect(CodeAnalysisTypes.RuleUtils).toBeDefined();
  });

  test('should export utility classes', () => {
    expect(typeof CodeAnalysisTypes.NoteValidator.validate).toBe('function');
    expect(typeof CodeAnalysisTypes.TaskValidator.validate).toBe('function');
    expect(typeof CodeAnalysisTypes.RuleValidator.validate).toBe('function');
    
    expect(typeof CodeAnalysisTypes.NoteUtils.generateId).toBe('function');
    expect(typeof CodeAnalysisTypes.TaskUtils.generateId).toBe('function');
    expect(typeof CodeAnalysisTypes.RuleUtils.generateId).toBe('function');
  });

  test('should allow creating instances', () => {
    // Test that we can create instances of the exported classes
    const noteId = CodeAnalysisTypes.NoteUtils.generateId();
    expect(noteId).toMatch(/^note_\d+_[a-z0-9]{9}$/);
    
    const taskId = CodeAnalysisTypes.TaskUtils.generateId();
    expect(taskId).toMatch(/^task_\d+_[a-z0-9]{9}$/);
    
    const ruleId = CodeAnalysisTypes.RuleUtils.generateId();
    expect(ruleId).toMatch(/^rule_\d+_[a-z0-9]{9}$/);
  });

  test('should validate exported validators work', () => {
    const noteValidation = CodeAnalysisTypes.NoteValidator.validate({
      title: 'Test Note',
      content: 'Test content',
      note_type: 'note'
    });
    expect(noteValidation.valid).toBe(true);
    
    const taskValidation = CodeAnalysisTypes.TaskValidator.validate({
      title: 'Test Task',
      description: 'Test description',
      task_status: 'todo',
      task_priority: 'medium'
    });
    expect(taskValidation.valid).toBe(true);
    
    const ruleValidation = CodeAnalysisTypes.RuleValidator.validate({
      name: 'Test Rule',
      rule_type: 'pattern',
      guidance_text: 'Test guidance'
    });
    expect(ruleValidation.valid).toBe(true);
  });
});