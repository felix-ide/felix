import type { FileExplorerComponent } from './fileExplorerData';

export type ComponentRelationship = {
  type: string;
  connection: string;
  direction: 'incoming' | 'outgoing';
  source?: string;
  target?: string;
  relatedComponent?: FileExplorerComponent;
};
