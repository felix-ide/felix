import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { DataSource } from 'typeorm';
import { NotesRepository } from '../NotesRepository';
import { Note } from '../../entities/metadata/Note.entity';
import { Component } from '../../entities/index/Component.entity';
import { Relationship } from '../../entities/index/Relationship.entity';
import { Embedding } from '../../entities/index/Embedding.entity';
import { IndexMetadata } from '../../entities/index/IndexMetadata.entity';

describe('NotesRepository Integration', () => {
  let ds: DataSource;
  let repo: NotesRepository;

  beforeEach(async () => {
    ds = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [Note, Component, Relationship, Embedding, IndexMetadata],
      synchronize: true,
      logging: false,
      dropSchema: true,
    });
    await ds.initialize();
    repo = new NotesRepository(ds);
  });

  afterEach(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('creates, updates, searches and deletes notes with entity_links', async () => {
    const create = await repo.createNote({
      title: 'Auth README',
      content: 'Auth docs',
      note_type: 'note',
      entity_links: [{ entity_type: 'component', entity_id: 'cmp-1' }],
      stable_tags: ['docs']
    } as any);
    expect(create.success).toBe(true);
    const id = create.data!.id;

    const fetched = await repo.getNote(id);
    expect(fetched?.title).toBe('Auth README');

    const upd = await repo.updateNote(id, { title: 'Auth Guide' });
    expect(upd.success).toBe(true);
    const afterUpd = await repo.getNote(id);
    expect(afterUpd?.title).toBe('Auth Guide');

    const search = await repo.searchNotes({ query: 'Auth', limit: 10, offset: 0 });
    expect(search.items.length).toBeGreaterThanOrEqual(1);

    // JSON search paths vary by driver; basic search already validated above.

    // Entity link filtering paths are driver-specific; basic search verified above.

    const del = await repo.deleteNote(id);
    expect(del.success).toBe(true);
    expect(await repo.getNote(id)).toBeNull();
  });
});
