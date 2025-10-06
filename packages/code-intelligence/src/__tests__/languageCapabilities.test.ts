import { languageCapabilities, getLanguageCapability } from '../language-registry';

describe('language capability registry', () => {
  it('exposes semantic coverage for javascript/TypeScript', () => {
    const capability = getLanguageCapability('javascript');

    expect(capability).toBeDefined();
    expect(capability?.parserTier.primary).toBe('ast');
    expect(capability?.parserTier.fallbacks).toContain('tree-sitter');
    expect(capability?.constructs.imports).toBe('semantic');
  });

  it('tracks documentation capability entries for non-code languages', () => {
    const documentationEntry = languageCapabilities['documentation'];

    expect(documentationEntry).toBeDefined();
    expect(documentationEntry?.constructs.documentation).toBeDefined();
  });
});
