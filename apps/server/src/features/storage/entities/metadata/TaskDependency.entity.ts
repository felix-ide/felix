/**
 * TaskDependency Entity
 * TypeORM entity for the task_dependencies table in metadata database
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

@Entity('task_dependencies')
@Index('idx_task_dependencies_task', ['dependent_task_id'])
@Index('idx_task_dependencies_dependency', ['dependency_task_id'])
@Index('idx_task_dependencies_type', ['dependency_type'])
export class TaskDependency {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', name: 'dependent_task_id' })
  dependent_task_id!: string;

  @Column({ type: 'text' })
  dependency_task_id!: string;

  @Column({ type: 'text', default: 'blocks' })
  dependency_type!: string; // 'blocks' | 'related' | 'follows'

  @Column({ type: 'boolean', default: true })
  required!: boolean;

  @Column({ type: 'boolean', default: false })
  auto_created!: boolean;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  // Relations
  @ManyToOne('Task', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dependent_task_id' })
  dependentTask!: Task;

  @ManyToOne('Task', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dependency_task_id' })
  dependencyTask!: Task;
}