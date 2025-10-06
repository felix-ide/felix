import {
  clearLanguageDefinitions,
  registerLanguage,
  getLanguageDefinition,
  resolveLanguageId,
  getAllLanguageDefinitions,
} from '../LanguageRegistry.js';
import { registerDefaultParsers } from '../../factory/registerDefaultParsers.js';
import type { ILanguageParser } from '../../interfaces/ILanguageParser.js';
import type { IComponent, IRelationship } from '../../types.js';
import type { ParseError, ParseWarning, ParseResult } from '../../interfaces/ILanguageParser.js';

const createStubParser = (language: string): ILanguageParser => {
  const emptyComponents: IComponent[] = [];
  const emptyRelationships: IRelationship[] = [];
  const emptyParseResult: ParseResult = {
    components: emptyComponents,
    relationships: emptyRelationships,
    errors: [] as ParseError[],
    warnings: [] as ParseWarning[],
    metadata: {
      filePath: '',
      language,
      parseTime: 0,
      componentCount: 0,
      relationshipCount: 0,
    },
  };

  return {
    language,
    getSupportedExtensions: () => ['.stub'],
    getIgnorePatterns: () => [],
    canParseFile: () => false,
    parseFile: async () => emptyParseResult,
    parseContent: async () => emptyParseResult,
    detectComponents: () => emptyComponents,
    detectRelationships: () => emptyRelationships,
    validateSyntax: () => [],
    validateContent: () => true,
    detectLanguageBoundaries: () => [],
    extractModuleComponents: () => emptyComponents,
    extractVariableComponents: () => emptyComponents,
    extractConstructorComponents: () => emptyComponents,
    extractAccessorComponents: () => emptyComponents,
    extractPropertyAssignments: () => emptyComponents,
    extractUsageRelationships: () => emptyRelationships,
    extractInheritanceRelationships: () => emptyRelationships,
    extractImportExportRelationships: () => emptyRelationships,
    extractContainmentRelationships: () => emptyRelationships,
    detectFrameworkComponents: () => emptyComponents,
    inferTypeFromExpression: () => 'unknown',
    extractDocumentation: () => undefined,
  };
};

describe('LanguageRegistry', () => {
  beforeEach(() => {
    clearLanguageDefinitions();
  });

  it('registers definitions and resolves aliases', () => {
    registerLanguage({
      id: 'stub',
      aliases: ['stub-alias'],
      extensions: ['.stub'],
      createPrimary: () => createStubParser('stub'),
      createFallbacks: () => [createStubParser('stub-fallback')],
    });

    const definition = getLanguageDefinition('stub');
    expect(definition).toBeDefined();
    expect(resolveLanguageId('stub-alias')).toBe('stub');

    const fallback = definition?.createFallbacks?.()[0];
    expect(fallback?.language).toBe('stub-fallback');
  });

  it('clears definitions between registrations', () => {
    registerLanguage({
      id: 'stub',
      createPrimary: () => createStubParser('stub'),
    });

    expect(getAllLanguageDefinitions()).toHaveLength(1);

    clearLanguageDefinitions();
    expect(getAllLanguageDefinitions()).toHaveLength(0);
  });

  it('registers built-in languages via registerDefaultParsers', () => {
    registerDefaultParsers();

    const definitions = getAllLanguageDefinitions();
    expect(definitions.length).toBeGreaterThan(5);
    const languages = definitions.map((def) => def.id);
    expect(languages).toContain('javascript');
    expect(languages).toContain('python');
    expect(languages).toContain('markdown');
  });
});
