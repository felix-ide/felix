/**
 * GlobalWorkflowSetting Entity
 * TypeORM entity for the global_workflow_settings table in metadata database
 */

import { 
  Entity, 
  PrimaryColumn, 
  Column, 
  UpdateDateColumn
} from 'typeorm';

@Entity('global_workflow_settings')
export class GlobalWorkflowSetting {
  @PrimaryColumn({ type: 'text' })
  setting_key!: string;

  @Column({ type: 'text' })
  setting_value!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}