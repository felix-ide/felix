// Mock for @felix/code-analysis-types

export enum ComponentType {
  FILE = 'file',
  CLASS = 'class',
  INTERFACE = 'interface',
  ENUM = 'enum',
  FUNCTION = 'function',
  METHOD = 'method',
  PROPERTY = 'property',
  VARIABLE = 'variable',
  IMPORT = 'import',
  EXPORT = 'export',
  TYPE_ALIAS = 'type_alias',
  NAMESPACE = 'namespace',
  MODULE = 'module',
  DECORATOR = 'decorator',
  SYSTEM = 'system'
}

export enum RelationshipType {
  IMPORTS = 'imports',
  EXTENDS = 'extends',
  IMPLEMENTS = 'implements',
  USES = 'uses',
  CALLS = 'calls',
  DEPENDS_ON = 'depends_on',
  BELONGS_TO = 'belongs_to',
  CONTAINS = 'contains',
  DECORATES = 'decorates',
  OVERRIDES = 'overrides',
  REFERENCES = 'references',
  CREATES = 'creates',
  RETURNS = 'returns',
  PARAMETER_OF = 'parameter_of',
  TYPE_OF = 'type_of',
  AGGREGATES = 'aggregates',
  COMPOSES = 'composes',
  ASSOCIATION = 'association'
}

export interface Location {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

export interface IComponent {
  id: string;
  name: string;
  type: ComponentType;
  language: string;
  filePath: string;
  location: Location;
  code?: string;
  metadata: Record<string, any>;
}

export interface IRelationship {
  id: string;
  type: RelationshipType;
  sourceId: string;
  targetId: string;
  metadata: Record<string, any>;
}
