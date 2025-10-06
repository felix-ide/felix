/**
 * RuleRelationship Entity
 * TypeORM entity for the rule_relationships table in metadata database
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

@Entity('rule_relationships')
@Index('idx_rule_relationships_parent', ['parent_rule_id'])
@Index('idx_rule_relationships_child', ['child_rule_id'])
export class RuleRelationship {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  parent_rule_id!: string;

  @Column({ type: 'text' })
  child_rule_id!: string;

  @Column({ type: 'text', default: 'extends' })
  relationship_type!: string; // 'extends', 'overrides', 'conflicts'

  @Column({ type: 'integer', default: 0 })
  priority_adjustment!: number;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  // Relations
  @ManyToOne('Rule', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_rule_id' })
  parentRule!: Rule;

  @ManyToOne('Rule', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_rule_id' })
  childRule!: Rule;
}