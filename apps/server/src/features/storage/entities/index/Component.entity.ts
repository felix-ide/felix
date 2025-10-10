/**
 * Component Entity
 * TypeORM entity for the components table in index database
 */

import { 
  Entity, 
  PrimaryColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToMany,
  Index
} from 'typeorm';

@Entity('components')
@Index('idx_components_name', ['name'])
@Index('idx_components_type', ['type'])
@Index('idx_components_file', ['file_path'])
@Index('idx_components_project', ['project_name'])
@Index('idx_components_updated', ['updated_at'])
export class Component {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  type!: string; // 'function' | 'class' | 'interface' | 'variable' | 'module' | etc.

  @Column({ type: 'text' })
  file_path!: string;

  @Column({ type: 'text', default: 'default' })
  project_name!: string;

  @Column({ type: 'integer' })
  start_line!: number;

  @Column({ type: 'integer' })
  end_line!: number;

  @Column({ type: 'integer', nullable: true })
  start_column?: number;

  @Column({ type: 'integer', nullable: true })
  end_column?: number;

  @Column({ type: 'text', nullable: true })
  signature?: string;

  @Column({ type: 'text', nullable: true })
  parent_id?: string;

  @Column({ type: 'text', nullable: true })
  language?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  documentation?: string;

  @Column({ type: 'text', nullable: true })
  source_code?: string;

  @Column({ type: 'text', nullable: true })
  code?: string; // Alias for source_code for compatibility

  // Hash of the component's canonical content used for embeddings.
  // Enables strict staleness checks between code and vectors.
  @Column({ type: 'text', nullable: true })
  content_hash?: string;

  // When the canonical content for this component last changed.
  @Column({ type: 'datetime', nullable: true })
  content_updated_at?: Date;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: any;

  @Column({ type: 'blob', nullable: true })
  embedding?: Buffer;

  @Column({ type: 'text', nullable: true })
  embedding_version?: string;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;

  // Relations - we'll add these when all entities are created
  // @OneToMany(() => Relationship, rel => rel.fromComponent)
  // outgoingRelationships?: Relationship[];

  // @OneToMany(() => Relationship, rel => rel.toComponent)
  // incomingRelationships?: Relationship[];
}
