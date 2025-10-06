import type { IRelationship } from '@felix/code-intelligence';

export type TargetResolutionStatus =
  | 'resolved'
  | 'skippedExternal'
  | 'skippedIgnored'
  | 'skippedJunk'
  | 'skippedStdlib'
  | 'unresolved';

export type SourceResolutionStatus = 'resolved' | 'external' | 'unresolved';

export interface PendingRelationshipUpdate {
  id: string;
  resolved_target_id?: string | null;
  resolved_source_id?: string | null;
  metadata?: IRelationship['metadata'];
}

export interface ResolutionMetrics {
  fileIdHits: number;
  fileIdMisses: number;
  nameIdHits: number;
  nameIdMisses: number;
  fsExistsHits: number;
  fsExistsMisses: number;
  targetFlushes: number;
  targetPatched: number;
  sourceFlushes: number;
  sourcePatched: number;
}

export const createDefaultMetrics = (): ResolutionMetrics => ({
  fileIdHits: 0,
  fileIdMisses: 0,
  nameIdHits: 0,
  nameIdMisses: 0,
  fsExistsHits: 0,
  fsExistsMisses: 0,
  targetFlushes: 0,
  targetPatched: 0,
  sourceFlushes: 0,
  sourcePatched: 0
});
