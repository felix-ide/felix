import { getAllLanguageDefinitions } from '../core/LanguageRegistry.js';

export interface LanguageDetectionMaps {
  extensionMap: Map<string, string>;
  shebangMap: Map<string, string>;
  filenameMap: Map<string, string>;
}

export function registerLanguageDetection({ extensionMap, shebangMap, filenameMap }: LanguageDetectionMaps): void {
  for (const definition of getAllLanguageDefinitions()) {
    definition.extensions?.forEach(ext => {
      extensionMap.set(ext, definition.id);
    });

    definition.shebangs?.forEach(shebang => {
      shebangMap.set(shebang, definition.id);
    });

    definition.filenames?.forEach(filename => {
      filenameMap.set(filename.toLowerCase(), definition.id);
    });
  }
}
