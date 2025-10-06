import type { ILanguageParser } from '../interfaces/ILanguageParser.js';

export interface LanguageDefinition {
  /** Canonical language identifier (e.g., `javascript`). */
  id: string;
  /** Optional display name for documentation/debugging. */
  displayName?: string;
  /** File extensions associated with this language (with leading dots). */
  extensions?: string[];
  /** Filenames that should map directly to this language. */
  filenames?: string[];
  /** Shebang interpreters that indicate this language. */
  shebangs?: string[];
  /** Additional aliases that should resolve to this language. */
  aliases?: string[];
  /** Factory for constructing the primary parser. */
  createPrimary: () => ILanguageParser;
  /** Optional factories for constructing fallback parsers (Tree-sitter, etc.). */
  createFallbacks?: () => ILanguageParser[];
}

const languageDefinitions = new Map<string, LanguageDefinition>();
const aliasToCanonicalId = new Map<string, string>();

export function clearLanguageDefinitions(): void {
  languageDefinitions.clear();
  aliasToCanonicalId.clear();
}

export function registerLanguage(definition: LanguageDefinition): void {
  languageDefinitions.set(definition.id, definition);

  if (definition.aliases) {
    for (const alias of definition.aliases) {
      aliasToCanonicalId.set(alias, definition.id);
    }
  }
}

export function getLanguageDefinition(languageId: string): LanguageDefinition | undefined {
  if (languageDefinitions.has(languageId)) {
    return languageDefinitions.get(languageId);
  }

  const canonical = aliasToCanonicalId.get(languageId);
  if (canonical) {
    return languageDefinitions.get(canonical);
  }
  return undefined;
}

export function resolveLanguageId(languageId: string): string | undefined {
  if (languageDefinitions.has(languageId)) {
    return languageId;
  }
  return aliasToCanonicalId.get(languageId);
}

export function getAllLanguageDefinitions(): LanguageDefinition[] {
  return Array.from(languageDefinitions.values());
}
