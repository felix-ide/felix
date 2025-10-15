/**
 * WorkflowConfiguration Entity
 * TypeORM entity for the workflow_configurations table in metadata database
 */

import { 
  Entity, 
  PrimaryColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index
} from 'typeorm';
import { WorkflowStatusFlow, WorkflowValidationBundle, ChildTaskRequirement } from '../../../../types/WorkflowTypes';

export interface RequiredSection {
  name: string;
  required: boolean;
  validation?: string;
}

export interface ConditionalRequirement {
  condition: string;
  sections: string[];
}

export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
}

@Entity('workflow_configurations')
@Index('idx_workflow_default', ['is_default'])
@Index('idx_workflow_name', ['name'], { unique: true })
@Index('idx_workflow_system', ['is_system'])
export class WorkflowConfiguration {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', unique: true })
  name!: string;

  @Column({ type: 'text' })
  display_name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  is_default!: boolean;

  @Column({ type: 'boolean', default: false })
  is_system!: boolean; // true for built-in workflows, false for user-customized

  @Column({ type: 'text', nullable: true })
  system_version?: string; // Version of the system workflow (e.g., "1.0.0")

  @Column({ type: 'simple-json' })
  required_sections!: RequiredSection[] | string;

  @Column({ type: 'simple-json', nullable: true })
  conditional_requirements?: ConditionalRequirement[];

  @Column({ type: 'simple-json', nullable: true })
  validation_rules?: ValidationRule[];

  @Column({ type: 'simple-json', nullable: true })
  use_cases?: string[];

  @Column({ type: 'simple-json', nullable: true })
  validation_bundles?: WorkflowValidationBundle[] | null;

  @Column({ type: 'simple-json', nullable: true })
  status_flow?: WorkflowStatusFlow | null;

  @Column({ type: 'text', nullable: true })
  status_flow_ref?: string | null;

  @Column({ type: 'simple-json', nullable: true })
  child_requirements?: ChildTaskRequirement[] | null;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
