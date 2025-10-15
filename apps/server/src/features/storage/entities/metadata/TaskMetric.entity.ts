/**
 * TaskMetric Entity
 * TypeORM entity for the task_metrics table in metadata database
 */

import { 
  Entity, 
  PrimaryColumn, 
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Task } from './Task.entity.js';

@Entity('task_metrics')
export class TaskMetric {
  @PrimaryColumn({ type: 'text' })
  task_id!: string;

  @Column({ type: 'real', default: 0.0 })
  completion_percentage!: number;

  @Column({ type: 'integer', default: 0 })
  subtasks_total!: number;

  @Column({ type: 'integer', default: 0 })
  subtasks_completed!: number;

  @Column({ type: 'integer', default: 0 })
  dependencies_total!: number;

  @Column({ type: 'integer', default: 0 })
  dependencies_completed!: number;

  @Column({ type: 'text', default: '0h' })
  time_logged!: string;

  @Column({ type: 'integer', default: 0 })
  linked_components!: number;

  @Column({ type: 'integer', default: 0 })
  affected_files!: number;

  @Column({ type: 'boolean', default: false })
  is_blocked!: boolean;

  @Column({ type: 'integer', default: 0 })
  blocking_count!: number;

  @Column({ type: 'boolean', default: false })
  critical_path!: boolean;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;

  // Relations
  @ManyToOne('Task', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: Task;
}