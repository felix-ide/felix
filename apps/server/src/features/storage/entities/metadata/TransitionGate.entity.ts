import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

@Entity('transition_gates')
@Index('idx_transition_gate_task', ['task_id'])
@Index('idx_transition_gate_transition', ['transition_id'])
export class TransitionGate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  task_id!: string;

  @Column({ type: 'text' })
  workflow!: string;

  @Column({ type: 'text' })
  transition_id!: string;

  @Column({ type: 'text' })
  target_status!: string;

  @Column({ type: 'text', default: 'pending' })
  state!: 'pending' | 'acknowledged' | 'cancelled';

  @Column({ type: 'text', nullable: true })
  issued_token?: string | null;

  @Column({ type: 'text', nullable: true })
  prompt?: string | null;

  @Column({
    type: 'simple-json',
    nullable: true
  })
  metadata?: Record<string, any> | null;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;

  @Column({ type: 'datetime', nullable: true })
  acknowledged_at?: Date | null;
}
