import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { DataSource } from 'typeorm';
import { RelationshipRepository } from '../RelationshipRepository';
import { Relationship } from '../../entities/index/Relationship.entity';
import { Component } from '../../entities/index/Component.entity';
import { Embedding } from '../../entities/index/Embedding.entity';
import { IndexMetadata } from '../../entities/index/IndexMetadata.entity';
import type { IRelationship } from '@felix/code-intelligence';

describe('RelationshipRepository Integration', () => {
  let ds: DataSource;
  let repo: RelationshipRepository;

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
    repo = new RelationshipRepository(ds);
  });

  afterEach(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('stores, fetches, updates and deletes a relationship', async () => {
    // Create minimal components to satisfy FK constraints
    const compRepo = ds.getRepository(Component);
    await compRepo.save({ id: 'comp-1', name: 'A', type: 'class', file_path: '/a.ts', project_name: 'default', start_line: 1, end_line: 1, start_column: 0, end_column: 0, language: 'ts' } as any);
    await compRepo.save({ id: 'comp-2', name: 'B', type: 'class', file_path: '/b.ts', project_name: 'default', start_line: 1, end_line: 1, start_column: 0, end_column: 0, language: 'ts' } as any);
    const r: IRelationship = {
      id: 'rel-1',
      type: 'uses',
      sourceId: 'comp-1',
      targetId: 'comp-2',
      metadata: { via: 'unit' },
    };

    // create
    const create = await repo.storeRelationship(r);
    expect(create.success).toBe(true);

    // read
    const fetched = await repo.getRelationship('rel-1');
    expect(fetched).toBeDefined();
    expect(fetched!.type).toBe('uses');
    expect(fetched!.metadata?.via).toBe('unit');

    // update with metadata merge
    const update = await repo.storeRelationship({ ...r, metadata: { strength: 0.8 } });
    expect(update.success).toBe(true);
    const merged = await repo.getRelationship('rel-1');
    expect(merged!.metadata?.via).toBe('unit');
    expect(merged!.metadata?.strength).toBe(0.8);

    // search
    const found = await repo.searchRelationships({ sourceId: 'comp-1' });
    expect(found.items.length).toBe(1);
    expect(found.items[0]!.targetId).toBe('comp-2');

    // delete
    const del = await repo.deleteRelationship('rel-1');
    expect(del.success).toBe(true);
    expect(await repo.getRelationship('rel-1')).toBeNull();
  });
});
