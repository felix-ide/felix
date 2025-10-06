export type SpecClassification = 'path' | 'bare' | 'namespace' | 'junk';

export function classifySpecifier(spec: string): SpecClassification {
  if (!spec) return 'junk';
  const trimmed = spec.trim();
  if (
    trimmed.startsWith('{') ||
    trimmed.startsWith('[') ||
    trimmed.includes('|class:') ||
    trimmed.includes('class:') ||
    trimmed.includes('file:')
  ) {
    return 'junk';
  }
  if (trimmed.startsWith('./') || trimmed.startsWith('../') || trimmed.startsWith('/') || trimmed.includes('\\')) {
    if (trimmed.includes('\\') && !trimmed.includes('/')) return 'namespace';
    return 'path';
  }
  if (/[\n\r]/.test(trimmed)) return 'junk';
  return 'bare';
}

export function sanitizeSpecifier(spec?: string): string {
  if (!spec) return '';
  let s = spec.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/\s+file:.*$/i, '').trim();
  const parts = s.split(' ');
  if (parts.length > 1) {
    const pathLike = parts.find(p => p.startsWith('./') || p.startsWith('../') || p.startsWith('/') || /[\\/]/.test(p));
    if (pathLike) return pathLike;
    return parts[0] ?? '';
  }
  return s;
}
