/**
 * Task Entity
 * TypeORM entity for the tasks table in metadata database
 */

import { 
  Entity, 
  PrimaryColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';

// Entity interfaces
export interface EntityLink {
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  link_strength?: 'primary' | 'secondary' | 'reference';
}

export interface Checklist {
  name: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  text: string;
  checked: boolean;
}

@Entity('tasks')
@Index('idx_tasks_parent', ['parent_id'])
@Index('idx_tasks_status', ['task_status'])
@Index('idx_tasks_priority', ['task_priority'])
@Index('idx_tasks_entity', ['entity_type', 'entity_id'])
@Index('idx_tasks_updated', ['updated_at'])
@Index('idx_tasks_completed', ['completed_at'])
export class Task {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', nullable: true })
  parent_id?: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', default: 'task' })
  task_type!: string;

  @Column({ type: 'text', default: 'todo' })
  task_status!: string;

  @Column({ type: 'text', default: 'medium' })
  task_priority!: string;

  @Column({ type: 'text', nullable: true })
  estimated_effort?: string;

  @Column({ type: 'text', nullable: true })
  actual_effort?: string;

  @Column({ type: 'timestamp', nullable: true })
  due_date?: Date;

  @Column({ type: 'text', nullable: true })
  assigned_to?: string;

  @Column({ type: 'text', nullable: true })
  entity_type?: string;

  @Column({ type: 'text', nullable: true })
  entity_id?: string;

  // JSON columns - TypeORM simple-json handles serialization
  @Column({
    type: 'simple-json',
    nullable: true
  })
  entity_links?: EntityLink[];

  @Column({
    type: 'simple-json',
    nullable: true
  })
  stable_links?: any;

  @Column({
    type: 'simple-json',
    nullable: true
  })
  fragile_links?: any;

  @Column({ type: 'text', nullable: true })
  semantic_context?: string;

  @Column({ type: 'bytea', nullable: true })
  semantic_embedding?: Buffer;

  @Column({
    type: 'simple-json',
    nullable: true
  })
  stable_tags?: string[];

  @Column({
    type: 'simple-json',
    nullable: true
  })
  auto_tags?: string[];

  @Column({
    type: 'simple-json',
    nullable: true
  })
  contextual_tags?: string[];

  @Column({ type: 'integer', default: 0 })
  sort_order!: number;

  @Column({ type: 'integer', default: 0 })
  depth_level!: number;

  @Column({
    type: 'simple-json',
    nullable: true
  })
  checklists?: Checklist[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at?: Date;

  // Workflow name (nullable for legacy tasks)
  @Column({ type: 'text', nullable: true })
  workflow?: string;

  // Spec gating state for task-as-spec workflows
  @Column({ type: 'text', default: 'draft' })
  spec_state!: 'draft' | 'spec_in_progress' | 'spec_ready';

  // Structured waivers for conditional requirements
  @Column({ type: 'simple-json', nullable: true })
  spec_waivers?: Array<{ code: string; reason: string; added_by?: string; added_at?: string }>;

  // Last validation metadata
  @Column({ type: 'timestamp', nullable: true })
  last_validated_at?: Date;

  @Column({ type: 'text', nullable: true })
  validated_by?: string;

  // Relations (simplified to avoid circular dependency issues)
  @ManyToOne('Task', 'children', { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Task;

  @OneToMany('Task', 'parent')
  children?: Task[];

  // We'll add these relations when we create the other entities
  // @OneToMany(() => TaskDependency, dep => dep.task)
  // dependencies?: TaskDependency[];

  // @OneToMany(() => TaskCodeLink, link => link.task)
  // codeLinks?: TaskCodeLink[];
}
