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

  @Column({
    type: 'simple-json',
    transformer: {
      to: (value: string[] | undefined) => value ? JSON.stringify(value) : '[]',
      from: (value: string | null) => {
        if (!value) return [];
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
    }
  })
  status_ids!: string[];

  @Column({
    type: 'simple-json',
    nullable: true,
    transformer: {
      to: (value: Record<string, unknown> | undefined) => value ? JSON.stringify(value) : null,
      from: (value: string | null) => {
        if (!value) return null;
        try {
          const parsed = JSON.parse(value);
          return parsed && typeof parsed === 'object' ? parsed : null;
        } catch {
          return null;
        }
      }
    }
  })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
