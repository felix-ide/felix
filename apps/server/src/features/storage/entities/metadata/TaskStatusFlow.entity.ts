import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

@Entity('task_status_flows')
@Index('idx_task_status_flow_name', ['name'], { unique: true })
export class TaskStatusFlow {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  display_label?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'simple-json' })
  status_ids!: string[];

  @Column({ type: 'text', nullable: true })
  initial_state?: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
