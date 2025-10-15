import * as kbClient from '@client/shared/api/knowledgeBaseClient';

export type { KBTemplate, KBNode, KBListItem, KBConfigField } from '@client/shared/api/knowledgeBaseClient';

export const knowledgeBaseApi = {
  /**
   * Get available KB templates
   */
  async getTemplates() {
    const response = await kbClient.getKBTemplates();
    return response.templates;
  },

  /**
   * Create a KB from a template
   */
  async createFromTemplate(templateName: string, customName: string, kbConfig?: Record<string, any>, parentId?: string) {
    const response = await kbClient.createKBFromTemplate(templateName, customName, kbConfig, parentId);
    return {
      rootId: response.root_id,
      createdNodes: response.created_nodes
    };
  },

  /**
   * Get KB structure tree
   */
  async getStructure(kbId: string) {
    const response = await kbClient.getKBStructure(kbId);
    return response.structure;
  },

  /**
   * List all KBs in the project
   */
  async listKnowledgeBases(kbType?: string) {
    const response = await kbClient.listKnowledgeBases(kbType);
    return response.knowledge_bases;
  },

  /**
   * Update a KB node's title and/or content
   */
  async updateNode(nodeId: string, updates: { title?: string; content?: string }) {
    const response = await kbClient.updateKBNode(nodeId, updates);
    return response;
  },

  /**
   * Create a new child node under a parent KB node
   */
  async createNode(parentId: string, title: string, content?: string) {
    const response = await kbClient.createKBNode(parentId, title, content);
    return {
      nodeId: response.node_id
    };
  },

  /**
   * Update KB configuration and regenerate template rules
   */
  async updateConfig(kbId: string, config: Record<string, any>) {
    const response = await kbClient.updateKBConfig(kbId, config);
    return {
      updatedRules: response.updated_rules
    };
  }
};
