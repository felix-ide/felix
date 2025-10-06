import { GraphStore } from './stores/GraphStore';
import type { Logger } from '../shared/Logger';

export interface ProjectSnapshot {
  id: string;
  path: string;
  indexedAt: Date;
}

export type ProjectFilter = {
  name?: string;
  tags?: string[];
};

export enum SnapshotStatus {
  Pending = 'pending',
  Ready = 'ready'
}

export class ProjectIndexer {
  #store: GraphStore;
  #logger: Logger;

  constructor(store: GraphStore, logger: Logger) {
    this.#store = store;
    this.#logger = logger;
  }

  async index(path: string): Promise<SnapshotStatus> {
    const snapshot = await this.#store.capture(path);
    this.#logger.info('indexed', { id: snapshot.id });
    return SnapshotStatus.Ready;
  }
}

export function createIndexer(store: GraphStore, logger: Logger): ProjectIndexer {
  return new ProjectIndexer(store, logger);
}

export const getSnapshot = async (
  store: GraphStore,
  id: string
): Promise<ProjectSnapshot | null> => {
  const match = await store.find(id);
  return match ?? null;
};
