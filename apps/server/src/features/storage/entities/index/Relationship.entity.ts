/**
 * Relationship Entity
 * TypeORM entity for the relationships table in index database
 */

import { 
  Entity, 
  PrimaryColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { Component } from './Component.entity.js';

@Entity('relationships')
@Index('idx_relationships_source', ['source_id'])
@Index('idx_relationships_target', ['target_id'])
@Index('idx_relationships_type', ['type'])
@Index('idx_relationships_updated', ['updated_at'])
export class Relationship {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'source_id' })
  source_id!: string;

  @Column({ type: 'text', name: 'resolved_source_id', nullable: true })
  resolved_source_id?: string;

  @Column({ type: 'text', name: 'target_id' })
  target_id!: string;

  @Column({ type: 'text', name: 'resolved_target_id', nullable: true })
  resolved_target_id?: string;

  @Column({ type: 'text', name: 'type' })
  type!: string; // 'imports' | 'calls' | 'extends' | 'implements' | 'uses' | etc.

  @Column({ type: 'text', nullable: true })
  relationship_subtype?: string;

  @Column({ type: 'real', default: 1.0 })
  confidence!: number;

  @Column({ type: 'integer', nullable: true })
  start_line?: number;

  @Column({ type: 'integer', nullable: true })
  end_line?: number;

  @Column({ type: 'integer', nullable: true })
  start_column?: number;

  @Column({ type: 'integer', nullable: true })
  end_column?: number;

  @Column({ 
    type: 'simple-json', 
    nullable: true,
    transformer: {
      to: (value: any) => value ? JSON.stringify(value) : null,
      from: (value: string | null) => value ? JSON.parse(value) : null
    }
  })
  metadata?: any;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;

  // Relations
  // IMPORTANT: source_id and target_id columns have NO foreign key constraints
  // They can store EXTERNAL:, RESOLVE:, or any other unresolved references
  // Foreign key constraints are ONLY on resolved_source_id and resolved_target_id

  // These are just property accessors, NOT foreign key relations
  get sourceComponent(): any {
    return this.source_id;
  }

  get targetComponent(): any {
    return this.target_id;
  }

  // Only the resolved fields have actual foreign key constraints
  @ManyToOne('Component', { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'resolved_source_id' })
  resolvedSourceComponent?: Component;

  @ManyToOne('Component', { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'resolved_target_id' })
  resolvedTargetComponent?: Component;
}