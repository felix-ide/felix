export const normalizeFilePath = (path?: string): string => {
  if (!path) return '';
  return path
    .replace(/^.*\/Felix\//, '')
    .replace(/^\/Users\/[^\/]+\//, '')
    .replace(/^\/home\/[^\/]+\//, '');
};

export const getLanguageFromFile = (filePath?: string): string => {
  if (!filePath) return 'typescript';
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'cpp':
    case 'cc':
    case 'cxx':
      return 'cpp';
    case 'c':
      return 'c';
    case 'cs':
      return 'csharp';
    case 'go':
      return 'go';
    case 'rb':
      return 'ruby';
    case 'php':
      return 'php';
    case 'swift':
      return 'swift';
    case 'kt':
    case 'kts':
      return 'kotlin';
    case 'rs':
      return 'rust';
    case 'scala':
      return 'scala';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'md':
    case 'markdown':
      return 'markdown';
    default:
      return ext || 'typescript';
  }
};
