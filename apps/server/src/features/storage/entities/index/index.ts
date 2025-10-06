/**
 * Index Database Entities
 * Export all entities for the index database
 */

export { Component } from './Component.entity.js';
export { Relationship } from './Relationship.entity.js';
export { Embedding } from './Embedding.entity.js';
export { IndexMetadata } from './IndexMetadata.entity.js';

// Array of all index entities for DataSource configuration
export const INDEX_ENTITIES = [
  'Component',
  'Relationship',
  'Embedding',
  'IndexMetadata'
];