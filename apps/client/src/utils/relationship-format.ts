import type { Theme } from '@felix/theme-system';
import { getCodeComponentStyles, getRelationshipColors, colorsToCss } from '@felix/theme-system';

// Normalize a relationship type string (case/spacing)
export function normalizeRelType(type: unknown): string {
  const raw = typeof type === 'string' ? type : type == null ? '' : String(type);
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

// Title-case label from a type key (convert _ and - to spaces)
export function formatTypeLabel(type: unknown): string {
  const raw = typeof type === 'string' ? type : type == null ? '' : String(type);
  const pretty = raw.replace(/[-_]+/g, ' ').trim();
  return pretty.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

// Map relationship types to an equivalent component palette key when possible
// so relationships and components share semantics/colors.
export function mapRelToComponentType(relType: unknown): string | null {
  const t = normalizeRelType(relType);
  // Canonical mappings and common variants
  const map: Record<string, string> = {
    // direct import/export (active + passive + re-exports)
    import: 'import',
    imports: 'import',
    imports_from: 'import',
    imported_by: 'import',
    requires: 'import',
    required_by: 'import',
    export: 'export',
    exports: 'export',
    exports_to: 'export',
    exports_from: 'export',
    re_exports: 'export',
    reexport: 'export',
    re_exports_from: 'export',

    // hierarchy / OO
    extends: 'class',
    inherits: 'class',
    implements: 'interface',
    implemented_by: 'interface',
    overridden_by: 'method',
    overrides: 'method',

    // code flow (active + passive)
    calls: 'function',
    called_by: 'function',
    invokes: 'function',
    invoked_by: 'function',
    uses: 'function',
    used_by: 'function',
    returns: 'function',
    throws: 'function',

    // containment / structure (generic + class/member specifics)
    contains: 'directory',
    class_contains_method: 'class',
    class_contains_property: 'class',
    class_contains_member: 'class',
    method_belongs_to_class: 'class',
    property_belongs_to_class: 'class',
    member_belongs_to_class: 'class',
    belongs_to_class: 'class',
    belongs_to: 'directory',
    in_file: 'file',
    in_module: 'module',
    in_namespace: 'namespace',
    in_package: 'package',
    part_of: 'directory',
    defined_in: 'file',
    declared_in: 'file',

    // refs / data
    reads: 'variable',
    reads_from: 'variable',
    writes: 'variable',
    writes_to: 'variable',
    declares: 'variable',
    references: 'variable',
    referenced_by: 'variable',

    // annotations / attributes / decorators
    decorated_by: 'helper',
    annotates: 'helper',
    annotated_by: 'helper',
    annotated_with: 'helper',
    attribute_of: 'property',
  };
  if (map[t]) return map[t];

  // Heuristics: infer palette from keywords inside the relationship type
  if (/(^|_)class(\b|_)/.test(t)) return 'class';
  if (/(^|_)method(\b|_)/.test(t)) return 'method';
  if (/(^|_)function(\b|_)/.test(t)) return 'function';
  if (/(^|_)property(\b|_)/.test(t)) return 'property';
  if (/(^|_)(variable|var)(\b|_)/.test(t)) return 'variable';
  if (/(^|_)interface(\b|_)/.test(t)) return 'interface';
  if (/(^|_)type(\b|_)/.test(t)) return 'type';
  if (/(^|_)file(\b|_)/.test(t)) return 'file';
  if (/(^|_)(directory|folder)(\b|_)/.test(t)) return 'directory';
  if (/(^|_)module(\b|_)/.test(t)) return 'module';
  if (/(^|_)package(\b|_)/.test(t)) return 'package';
  if (/(^|_)namespace(\b|_)/.test(t)) return 'namespace';
  if (/(^|_)import(\b|_)/.test(t)) return 'import';
  if (/(^|_)export(\b|_)/.test(t)) return 'export';
  if (/(^|_)(call|invoke)(\b|_)/.test(t)) return 'function';

  return null;
}

// Compute inline style for a relationship chip that prefers component colors
export function getRelationshipChipStyle(theme: Theme, relType: unknown): React.CSSProperties {
  const compKey = mapRelToComponentType(relType);
  if (compKey) {
    return getCodeComponentStyles(theme, compKey);
  }
  const rel = getRelationshipColors(theme, normalizeRelType(relType));
  return colorsToCss(rel);
}

// Background panel style for relationship groups/cards
export function getRelationshipPanelStyle(theme: Theme, relType: string): React.CSSProperties {
  const s = getRelationshipChipStyle(theme, relType);
  return {
    backgroundColor: s.backgroundColor,
    borderColor: s.borderColor || s.color,
    color: s.color,
  };
}

// Color-code metadata tags: booleans → success/destructive, numbers → info, else use the group color
export function getRelationshipMetadataTagStyle(theme: Theme, relType: string, _key: string, value: any): React.CSSProperties {
  const base = getRelationshipChipStyle(theme, relType);
  const truthy = value === true;
  const falsy = value === false;
  const isNum = typeof value === 'number';
  const dark = theme.type === 'dark';

  if (truthy) {
    return {
      backgroundColor: dark ? 'hsl(var(--chip-bg-success))' : 'hsl(var(--chip-bg-success))',
      color: 'hsl(var(--chip-text-success))',
      borderColor: 'hsl(var(--chip-border-success))',
    };
  }
  if (falsy) {
    return {
      backgroundColor: dark ? 'hsl(var(--chip-bg-destructive))' : 'hsl(var(--chip-bg-destructive))',
      color: 'hsl(var(--chip-text-destructive))',
      borderColor: 'hsl(var(--chip-border-destructive))',
    };
  }
  if (isNum) {
    return {
      backgroundColor: dark ? 'hsl(var(--chip-bg-info))' : 'hsl(var(--chip-bg-info))',
      color: 'hsl(var(--chip-text-info))',
      borderColor: 'hsl(var(--chip-border-info))',
    };
  }
  // Default: tie to relationship color
  return {
    backgroundColor: base.backgroundColor,
    color: base.color,
    borderColor: base.borderColor || base.color,
  };
}

// Break a provenance value into tag parts (parser/source/backend/strategy/etc.)
export function extractProvenanceTags(value: any): Array<{ key: string; val: string }> {
  const tags: Array<{ key: string; val: string }> = [];
  if (!value) return tags;

  const pushKV = (k: string, v: any) => {
    if (v === undefined || v === null) return;
    const val = typeof v === 'string' ? v : typeof v === 'number' ? String(v) : JSON.stringify(v);
    if (val === '' || val === '""') return;
    tags.push({ key: k, val });
  };

  if (typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) pushKV(k, v);
    return tags;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      if (typeof entry === 'string') {
        // split possible k=v pairs inside strings
        const parts = entry.split(/[;|,]/);
        parts.forEach((p) => {
          const kv = p.split(/[:=]/);
          if (kv.length === 2) pushKV(kv[0].trim(), kv[1].trim());
          else if (kv[0].trim()) pushKV('item', kv[0].trim());
        });
      } else if (entry && typeof entry === 'object') {
        for (const [k, v] of Object.entries(entry)) pushKV(k, v);
      }
    });
    return tags;
  }

  if (typeof value === 'string') {
    const items = value.split(/[;|,]/);
    items.forEach((p) => {
      const kv = p.split(/[:=]/);
      if (kv.length === 2) pushKV(kv[0].trim(), kv[1].trim());
      else if (kv[0].trim()) pushKV('source', kv[0].trim());
    });
    return tags;
  }

  // Fallback
  pushKV('provenance', value);
  return tags;
}
// Two‑tone row style using source/target component palettes.
// Renders subtle side stripes: left = source, right = target.
export function getBiComponentRowStyle(theme: Theme, sourceType?: string, targetType?: string): React.CSSProperties {
  const src = getCodeComponentStyles(theme, String(sourceType || 'component'));
  const tgt = getCodeComponentStyles(theme, String(targetType || 'component'));
  const neutralBg = 'hsl(var(--card))';
  return {
    backgroundImage: `linear-gradient(to right, ${src.backgroundColor} 0, ${src.backgroundColor} 8px, ${neutralBg} 8px, ${neutralBg} calc(100% - 8px), ${tgt.backgroundColor} calc(100% - 8px), ${tgt.backgroundColor} 100%)`,
    borderColor: src.borderColor || src.color,
  };
}

// Panel/frame style that hints at ownership by coloring inner left/right edges.
export function getBiComponentPanelStyle(theme: Theme, sourceType?: string, targetType?: string): React.CSSProperties {
  const src = getCodeComponentStyles(theme, String(sourceType || 'component'));
  const tgt = getCodeComponentStyles(theme, String(targetType || 'component'));
  return {
    boxShadow: `inset 4px 0 0 0 ${src.color}, inset -4px 0 0 0 ${tgt.color}`,
  };
}
