/**
 * IndexMetadata Entity
 * TypeORM entity for the index_metadata table in index database
 */

import { 
  Entity, 
  PrimaryColumn, 
  Column, 
  UpdateDateColumn
} from 'typeorm';

@Entity('index_metadata')
export class IndexMetadata {
  @PrimaryColumn({ type: 'text' })
  key!: string;

  @Column({ type: 'text' })
  value!: string;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}