/**
 * KnowledgeBase Entity
 * Tracks knowledge base structures built from templates
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

@Entity('knowledge_bases')
@Index('idx_kb_project_template', ['project_path', 'template_name']) // Not unique - can have many of same type
@Index('idx_kb_system', ['is_system'])
export class KnowledgeBase {
  @PrimaryColumn({ type: 'text' })
  id!: string; // Portable IDs: 'kb_project' for project KB, 'kb_{template}_{timestamp}_{random}' for others

  @Column({ type: 'text' })
  project_path!: string;

  @Column({ type: 'text' })
  template_name!: string;

  @Column({ type: 'text' })
  root_note_id!: string; // ID of the root note in the hierarchy

  @Column({ type: 'boolean', default: true })
  is_system!: boolean; // true for system templates, false for user-customized

  @Column({ type: 'text', nullable: true })
  system_version?: string; // Version of the system template (e.g., "1.0.0")

  @Column({ type: 'simple-json', nullable: true })
  config?: Record<string, any>; // KB configuration values

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
