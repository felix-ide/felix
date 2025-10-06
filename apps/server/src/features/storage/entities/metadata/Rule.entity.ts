/**
 * Rule Entity
 * TypeORM entity for the rules table in metadata database
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
import type { EntityLink } from './Task.entity.js';

export interface TriggerPattern {
  files?: string[];
  components?: string[];
  relationships?: string[];
}

export interface SemanticTrigger {
  patterns?: string[];
  business_domains?: string[];
  architectural_layers?: string[];
}

@Entity('rules')
@Index('idx_rules_parent', ['parent_id'])
@Index('idx_rules_type', ['rule_type'])
@Index('idx_rules_active', ['is_active'])
@Index('idx_rules_priority', ['priority'])
@Index('idx_rules_updated', ['updated_at'])
export class Rule {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', nullable: true })
  parent_id?: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', default: 'pattern' })
  rule_type!: string;

  @Column({ type: 'text' })
  guidance_text!: string;

  @Column({ 
    type: 'simple-json', 
    nullable: true,
    transformer: {
      to: (value: TriggerPattern | undefined) => value ? JSON.stringify(value) : null,
      from: (value: any) => {
        if (!value) return null;
        if (typeof value === 'string' && value.trim()) {
          return JSON.parse(value);
        }
        return null;
      }
    }
  })
  trigger_patterns?: TriggerPattern;

  @Column({ 
    type: 'simple-json', 
    nullable: true,
    transformer: {
      to: (value: SemanticTrigger | undefined) => value ? JSON.stringify(value) : null,
      from: (value: any) => {
        if (!value) return null;
        if (typeof value === 'string' && value.trim()) {
          return JSON.parse(value);
        }
        return null;
      }
    }
  })
  semantic_triggers?: SemanticTrigger;

  @Column({ 
    type: 'simple-json', 
    nullable: true,
    transformer: {
      to: (value: any) => value ? JSON.stringify(value) : null,
      from: (value: any) => {
        if (!value) return null;
        if (typeof value === 'string' && value.trim()) {
          return JSON.parse(value);
        }
        return null;
      }
    }
  })
  context_conditions?: any;

  @Column({ type: 'text', nullable: true })
  code_template?: string;

  @Column({ type: 'text', nullable: true })
  validation_script?: string;

  @Column({ type: 'boolean', default: false })
  auto_apply!: boolean;

  @Column({ type: 'integer', default: 5 })
  priority!: number;

  @Column({ type: 'real', default: 0.8 })
  confidence_threshold!: number;

  // Map to 'is_active' for new DBs, but 'active' exists in old DBs
  // TypeORM will use 'is_active' when creating new tables
  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'integer', default: 0 })
  sort_order!: number;

  @Column({ type: 'integer', default: 0 })
  depth_level!: number;

  @Column({ type: 'text', nullable: true })
  entity_type?: string;

  @Column({ type: 'text', nullable: true })
  entity_id?: string;

  // JSON columns
  @Column({ 
    type: 'simple-json', 
    nullable: true,
    transformer: {
      to: (value: EntityLink[] | undefined) => value ? JSON.stringify(value) : null,
      from: (value: any) => {
        if (!value) return null;
        if (typeof value === 'string' && value.trim()) {
          return JSON.parse(value);
        }
        return null;
      }
    }
  })
  entity_links?: EntityLink[];

  @Column({ 
    type: 'simple-json', 
    nullable: true,
    transformer: {
      to: (value: any) => value ? JSON.stringify(value) : null,
      from: (value: any) => {
        if (!value) return null;
        if (typeof value === 'string' && value.trim()) {
          return JSON.parse(value);
        }
        return null;
      }
    }
  })
  stable_links?: any;

  @Column({ 
    type: 'simple-json', 
    nullable: true,
    transformer: {
      to: (value: any) => value ? JSON.stringify(value) : null,
      from: (value: any) => {
        if (!value) return null;
        if (typeof value === 'string' && value.trim()) {
          return JSON.parse(value);
        }
        return null;
      }
    }
  })
  fragile_links?: any;

  @Column({ type: 'text', nullable: true })
  semantic_context?: string;

  @Column({ type: 'blob', nullable: true })
  semantic_embedding?: Buffer;

  @Column({ 
    type: 'simple-json', 
    nullable: true,
    transformer: {
      to: (value: string[] | undefined) => value ? JSON.stringify(value) : null,
      from: (value: any) => {
        if (!value) return null;
        if (typeof value === 'string' && value.trim()) {
          return JSON.parse(value);
        }
        return null;
      }
    }
  })
  stable_tags?: string[];

  @Column({ 
    type: 'simple-json', 
    nullable: true,
    transformer: {
      to: (value: string[] | undefined) => value ? JSON.stringify(value) : null,
      from: (value: any) => {
        if (!value) return null;
        if (typeof value === 'string' && value.trim()) {
          return JSON.parse(value);
        }
        return null;
      }
    }
  })
  auto_tags?: string[];

  @Column({ 
    type: 'simple-json', 
    nullable: true,
    transformer: {
      to: (value: string[] | undefined) => value ? JSON.stringify(value) : null,
      from: (value: any) => {
        if (!value) return null;
        if (typeof value === 'string' && value.trim()) {
          return JSON.parse(value);
        }
        return null;
      }
    }
  })
  contextual_tags?: string[];

  @Column({ 
    type: 'simple-json', 
    nullable: true,
    transformer: {
      to: (value: string[] | undefined) => value ? JSON.stringify(value) : null,
      from: (value: any) => {
        if (!value) return null;
        if (typeof value === 'string' && value.trim()) {
          return JSON.parse(value);
        }
        return null;
      }
    }
  })
  exclusion_patterns?: string[];

  @Column({ type: 'integer', default: 0 })
  usage_count!: number;

  @Column({ type: 'datetime', nullable: true })
  last_used?: Date;

  @Column({ type: 'text', default: 'replace' })
  merge_strategy!: string;

  @Column({ type: 'real', default: 0 })
  acceptance_rate!: number;

  @Column({ type: 'real', default: 0 })
  effectiveness_score!: number;

  @Column({ type: 'text', nullable: true })
  created_by?: string;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;

  // Relations
  @ManyToOne('Rule', 'children', { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Rule;

  @OneToMany('Rule', 'parent')
  children?: Rule[];
}