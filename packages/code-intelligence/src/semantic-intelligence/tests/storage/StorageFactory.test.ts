import { describe, it, expect } from '@jest/globals';
import { StorageFactory, createStorage, registerStorageAdapter } from '../../storage/StorageFactory.js';

class DummyAdapter {
  constructor(_opts?: any) {}
  init() {}
  save() { return Promise.resolve(); }
  load() { return Promise.resolve([]); }
}

describe('StorageFactory', () => {
  it('returns memory adapter by default and supports registration', () => {
    const types = StorageFactory.getInstance().getAdapterTypes();
    expect(types).toContain('memory');
    const mem = createStorage('memory');
    expect(mem).toBeTruthy();

    registerStorageAdapter('dummy', DummyAdapter as any);
    const d = createStorage('dummy');
    expect(d).toBeInstanceOf(DummyAdapter as any);
  });

  it('throws on unknown adapter type', () => {
    expect(() => createStorage('unknown')).toThrow();
  });
});

