/**
 * Embedding Entity
 * TypeORM entity for the embeddings table in index database
 * EXACT MATCH to schema: composite primary key (entity_id, entity_type)
 */

import { 
  Entity, 
  PrimaryColumn, 
  Column, 
  CreateDateColumn,
  Index
} from 'typeorm';

@Entity('embeddings')
@Index('idx_embeddings_entity_type', ['entity_type'])
export class Embedding {
  @PrimaryColumn({ type: 'text' })
  entity_id!: string;

  @PrimaryColumn({ type: 'text', default: 'component' })
  entity_type!: string; // 'component' | 'task' | 'note' | 'rule'

  @Column({ type: 'text' })
  embedding!: string; // JSON stringified array of numbers

  @Column({ type: 'text' })
  version!: string;

  // Content hash of the source that this embedding was computed from.
  // Used to ensure we never use stale vectors.
  @Column({ type: 'text', nullable: true })
  content_hash?: string;

  @CreateDateColumn()
  created_at!: Date;
}
