export type CapabilityLevel = 'none' | 'basic' | 'structural' | 'semantic';

export interface LanguageConstructCapabilities {
  classes?: CapabilityLevel;
  interfaces?: CapabilityLevel;
  mixins?: CapabilityLevel;
  traits?: CapabilityLevel;
  functions?: CapabilityLevel;
  methods?: CapabilityLevel;
  properties?: CapabilityLevel;
  variables?: CapabilityLevel;
  enums?: CapabilityLevel;
  imports?: CapabilityLevel;
  exports?: CapabilityLevel;
  inheritance?: CapabilityLevel;
  generics?: CapabilityLevel;
  documentation?: CapabilityLevel;
  annotations?: CapabilityLevel;
  templates?: CapabilityLevel;
}

export interface LanguageServiceCapabilities {
  incrementalParsing?: boolean;
  embeddedLanguages?: 'delegated' | 'inlined' | 'none';
  crossFileResolution?: 'none' | 'speculative' | 'resolved';
  docLinking?: CapabilityLevel;
}

export interface ParserTier {
  /** Identifier for the primary backend (e.g., 'ast', 'tree-sitter', 'detector'). */
  primary: 'ast' | 'tree-sitter' | 'detector';
  /** Ordered list of fallback backends. */
  fallbacks?: Array<'ast' | 'tree-sitter' | 'detector'>;
}

export interface LanguageCapabilityDefinition {
  /** Canonical language identifier (matches ParserFactory language ids). */
  id: string;
  /** Human-friendly display name. */
  displayName: string;
  /** Parser tiers currently wired into ParserFactory. */
  parserTier: ParserTier;
  /** Feature coverage for high-level constructs. */
  constructs: LanguageConstructCapabilities;
  /** Service-level characteristics. */
  services?: LanguageServiceCapabilities;
  /** Optional notes for roadmap gaps or TODOs. */
  notes?: string;
}

export type LanguageCapabilityMap = Record<string, LanguageCapabilityDefinition>;
