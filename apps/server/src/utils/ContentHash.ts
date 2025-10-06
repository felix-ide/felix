import type { IComponent } from '@felix/code-intelligence';
import { createHash } from 'crypto';

export function computeComponentContentHash(component: IComponent): string {
  // Prefer hashing the actual code; fall back to structural signature
  const payload = component.code && component.code.length > 0
    ? component.code
    : JSON.stringify({
        name: component.name,
        type: component.type,
        filePath: component.filePath,
        location: component.location,
      });
  return createHash('sha256').update(payload).digest('hex');
}

