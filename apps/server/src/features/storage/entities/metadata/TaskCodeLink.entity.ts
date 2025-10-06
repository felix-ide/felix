/**
 * TaskCodeLink Entity
 * TypeORM entity for the task_code_links table in metadata database
 */

import { 
  Entity, 
  PrimaryColumn, 
  Column, 
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { Task } from './Task.entity.js';

@Entity('task_code_links')
@Index('idx_task_code_links_task', ['task_id'])
@Index('idx_task_code_links_entity', ['entity_type', 'entity_id'])
export class TaskCodeLink {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  task_id!: string;

  @Column({ type: 'text' })
  entity_type!: string;

  @Column({ type: 'text' })
  entity_id!: string;

  @Column({ type: 'text', default: 'implements' })
  link_type!: string; // 'implements', 'affects', 'tests'

  @Column({ type: 'real', default: 1.0 })
  confidence!: number;

  @Column({ type: 'boolean', default: false })
  auto_detected!: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  last_verified!: Date;

  @Column({ type: 'text', nullable: true })
  code_hash?: string;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  // Relations
  @ManyToOne('Task', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: Task;
}