import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { DataSource } from 'typeorm';
import { RelationshipRepository } from '../RelationshipRepository';
import { ComponentRepository } from '../ComponentRepository';
import { Relationship } from '../../entities/index/Relationship.entity';
import { Component } from '../../entities/index/Component.entity';
import { Embedding } from '../../entities/index/Embedding.entity';
import { IndexMetadata } from '../../entities/index/IndexMetadata.entity';
import type { IRelationship } from '@felix/code-intelligence';

describe('Relationship cascade on component delete (integration)', () => {
  let ds: DataSource;
  let relRepo: RelationshipRepository;
  let compRepo: ComponentRepository;

  beforeEach(async () => {
    ds = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [Component, Relationship, Embedding, IndexMetadata],
      synchronize: true,
      logging: false,
      dropSchema: true,
    });
    await ds.initialize();
    relRepo = new RelationshipRepository(ds);
    compRepo = new ComponentRepository(ds, process.cwd(), relRepo);

    // Seed FK components
    await ds.getRepository(Component).save({
      id: 'A', name: 'A', type: 'class', file_path: '/a.ts', project_name: 'p', start_line: 1, end_line: 1, start_column: 0, end_column: 0, language: 'ts',
    } as any);
    await ds.getRepository(Component).save({
      id: 'B', name: 'B', type: 'class', file_path: '/b.ts', project_name: 'p', start_line: 1, end_line: 1, start_column: 0, end_column: 0, language: 'ts',
    } as any);
  });

  afterEach(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('removes relationships referencing a deleted component', async () => {
    const r: IRelationship = { id: 'R1', type: 'uses', sourceId: 'A', targetId: 'B', metadata: { via: 'test' } };
    const create = await relRepo.storeRelationship(r);
    expect(create.success).toBe(true);

    // Sanity check
    const before = await relRepo.searchRelationships({ sourceId: 'A' });
    expect(before.items.length).toBe(1);

    // Delete component "A" and ensure relationship is gone
    const delComp = await compRepo.deleteComponent('A');
    expect(delComp.success).toBe(true);

    const after = await relRepo.searchRelationships({ sourceId: 'A' });
    expect(after.items.length).toBe(0);
  });
});
