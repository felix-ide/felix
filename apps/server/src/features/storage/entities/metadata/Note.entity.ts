/**
 * Note Entity
 * TypeORM entity for the notes table in metadata database
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

@Entity('notes')
@Index('idx_notes_parent', ['parent_id'])
@Index('idx_notes_type', ['note_type'])
@Index('idx_notes_entity', ['entity_type', 'entity_id'])
@Index('idx_notes_updated', ['updated_at'])
export class Note {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', nullable: true })
  parent_id?: string;

  @Column({ type: 'text', nullable: true })
  title?: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text', default: 'note' })
  note_type!: string;

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
      from: (value: string | null) => (value && typeof value === 'string' && value.trim() !== '') ? JSON.parse(value) : null
    }
  })
  entity_links?: EntityLink[];

  @Column({ 
    type: 'simple-json', 
    nullable: true,
    transformer: {
      to: (value: any) => value ? JSON.stringify(value) : null,
      from: (value: string | null) => (value && typeof value === 'string' && value.trim() !== '') ? JSON.parse(value) : null
    }
  })
  stable_links?: any;

  @Column({ 
    type: 'simple-json', 
    nullable: true,
    transformer: {
      to: (value: any) => value ? JSON.stringify(value) : null,
      from: (value: string | null) => (value && typeof value === 'string' && value.trim() !== '') ? JSON.parse(value) : null
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
      from: (value: string | null) => (value && typeof value === 'string' && value.trim() !== '') ? JSON.parse(value) : null
    }
  })
  stable_tags?: string[];

  @Column({ 
    type: 'simple-json', 
    nullable: true,
    transformer: {
      to: (value: string[] | undefined) => value ? JSON.stringify(value) : null,
      from: (value: string | null) => (value && typeof value === 'string' && value.trim() !== '') ? JSON.parse(value) : null
    }
  })
  auto_tags?: string[];

  @Column({ 
    type: 'simple-json', 
    nullable: true,
    transformer: {
      to: (value: string[] | undefined) => value ? JSON.stringify(value) : null,
      from: (value: string | null) => (value && typeof value === 'string' && value.trim() !== '') ? JSON.parse(value) : null
    }
  })
  contextual_tags?: string[];

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;

  // Relations
  @ManyToOne('Note', 'children', { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Note;

  @OneToMany('Note', 'parent')
  children?: Note[];
}