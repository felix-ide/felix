/**
 * Storage Feature - TypeORM Implementation
 * Exports all storage-related components for the TypeORM migration
 */

// Main adapter - removed, no longer using adapter pattern

// Database manager
export { DatabaseManager } from './DatabaseManager.js';

// Repositories
export { ComponentRepository } from './repositories/ComponentRepository.js';
export { RelationshipRepository } from './repositories/RelationshipRepository.js';
export { EmbeddingRepository } from './repositories/EmbeddingRepository.js';
export { NotesRepository } from './repositories/NotesRepository.js';
export { TasksRepository } from './repositories/TasksRepository.js';
export { RulesRepository } from './repositories/RulesRepository.js';

// Managers are deprecated; use repositories directly

// Entities - Index Database
export { Component } from './entities/index/Component.entity.js';
export { Relationship } from './entities/index/Relationship.entity.js';
export { Embedding } from './entities/index/Embedding.entity.js';

// Entities - Metadata Database
export { Note } from './entities/metadata/Note.entity.js';
export { Task } from './entities/metadata/Task.entity.js';
export { TaskDependency } from './entities/metadata/TaskDependency.entity.js';
export { TaskCodeLink } from './entities/metadata/TaskCodeLink.entity.js';
export { TaskMetric } from './entities/metadata/TaskMetric.entity.js';
export { Rule } from './entities/metadata/Rule.entity.js';
export { RuleRelationship } from './entities/metadata/RuleRelationship.entity.js';
export { RuleApplication } from './entities/metadata/RuleApplication.entity.js';
export { WorkflowConfiguration } from './entities/metadata/WorkflowConfiguration.entity.js';
export { GlobalWorkflowSetting } from './entities/metadata/GlobalWorkflowSetting.entity.js';

// Configuration
export { indexDatabaseConfig, metadataDatabaseConfig } from './config/database.config.js';
