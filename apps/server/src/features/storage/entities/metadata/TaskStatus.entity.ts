import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

@Entity('task_statuses')
@Index('idx_task_status_name', ['name'], { unique: true })
export class TaskStatus {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  display_label?: string;

  @Column({ type: 'text', nullable: true })
  emoji?: string;

  @Column({ type: 'text', nullable: true })
  color?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
