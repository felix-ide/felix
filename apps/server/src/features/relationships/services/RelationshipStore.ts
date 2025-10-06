import type { IRelationship } from '@felix/code-intelligence';

import type { DatabaseManager } from '../../storage/DatabaseManager.js';

export class RelationshipStore {
  constructor(private readonly dbManager: DatabaseManager) {}

  async storeRelationship(relationship: IRelationship): Promise<{ success: boolean; error?: string }> {
    return await this.dbManager.getRelationshipRepository().storeRelationship(relationship);
  }

  async storeRelationships(relationships: IRelationship[]): Promise<{ success: boolean; error?: string }> {
    return await this.dbManager.getRelationshipRepository().storeRelationships(relationships);
  }

  async updateRelationship(relationship: IRelationship): Promise<{ success: boolean; error?: string }> {
    return await this.dbManager.getRelationshipRepository().updateRelationship(relationship);
  }

  async deleteRelationship(id: string): Promise<{ success: boolean; error?: string }> {
    return await this.dbManager.getRelationshipRepository().deleteRelationship(id);
  }

  async deleteComponentRelationships(componentId: string): Promise<{ success: boolean; error?: string }> {
    return await this.dbManager.getRelationshipRepository().deleteRelationshipsByComponent(componentId);
  }

  async deleteRelationshipsInFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    return await this.dbManager.getRelationshipRepository().deleteMany({ file_path: filePath });
  }
}
