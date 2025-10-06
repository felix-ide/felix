/**
 * Services exports
 */

export { RuleMatchingService } from '@felix/code-intelligence';
export { TagDegradationService, type DegradationConfig } from '../features/metadata/services/TagDegradationService.js';
export { DegradationScheduler, type SchedulerConfig } from '../features/metadata/services/DegradationScheduler.js';
export { DocumentationService, type DocumentationBundle, type DocumentSearchResult, type DocumentationSearchOptions } from '../features/metadata/services/DocumentationService.js';
export { TaskExportService, type TaskExportData, type TaskExportOptions, type TaskImportOptions } from '../features/metadata/services/TaskExportService.js';
export { NoteExportService, type NoteExportData, type NoteExportOptions, type NoteImportOptions } from '../features/metadata/services/NoteExportService.js';
export { RuleExportService, type RuleExportData, type RuleExportOptions, type RuleImportOptions } from '../features/metadata/services/RuleExportService.js';
