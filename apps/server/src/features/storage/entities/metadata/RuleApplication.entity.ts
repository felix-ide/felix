/**
 * RuleApplication Entity
 * TypeORM entity for the rule_applications table in metadata database
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
import { Rule } from './Rule.entity.js';

@Entity('rule_applications')
@Index('idx_rule_applications_rule', ['rule_id'])
@Index('idx_rule_applications_entity', ['entity_type', 'entity_id'])
@Index('idx_rule_applications_action', ['user_action'])
@Index('idx_rule_applications_applied', ['applied_at'])
export class RuleApplication {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  rule_id!: string;

  @Column({ type: 'text' })
  entity_type!: string; // 'component' | 'task' | 'note' | 'file'

  @Column({ type: 'text' })
  entity_id!: string;

  @Column({ type: 'text', default: 'applied' })
  user_action!: string; // 'accepted' | 'modified' | 'rejected' | 'ignored' | 'applied'

  @Column({ type: 'integer', nullable: true })
  feedback_score?: number; // 1-5 rating

  @Column({ type: 'text', nullable: true })
  generated_code?: string;

  @Column({ type: 'simple-json', nullable: true })
  applied_context?: any;

  @Column({ type: 'text', nullable: true })
  error_message?: string;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  applied_at!: Date;

  // Relations
  @ManyToOne('Rule', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule!: Rule;
}
