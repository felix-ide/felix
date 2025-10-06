import type { IRelationship } from '@felix/code-intelligence';
import { Relationship } from '@felix/code-intelligence';

export class RelationshipNormalizerService {
  private inverseMap: Record<string, string> = {
    // Generic contains
    contains: 'belongs_to',
    belongs_to: 'contains',

    // Specific contains relationships
    'class-contains-method': 'method-belongs-to-class',
    'method-belongs-to-class': 'class-contains-method',
    'class-contains-property': 'property-belongs-to-class',
    'property-belongs-to-class': 'class-contains-property',
    'class-contains-constructor': 'constructor-belongs-to-class',
    'constructor-belongs-to-class': 'class-contains-constructor',
    'class-contains-member': 'member-belongs-to-class',
    'member-belongs-to-class': 'class-contains-member',

    'interface-contains-method': 'method-belongs-to-interface',
    'method-belongs-to-interface': 'interface-contains-method',
    'interface-contains-property': 'property-belongs-to-interface',
    'property-belongs-to-interface': 'interface-contains-property',
    'interface-contains-member': 'member-belongs-to-interface',
    'member-belongs-to-interface': 'interface-contains-member',

    'namespace-contains-class': 'class-belongs-to-namespace',
    'class-belongs-to-namespace': 'namespace-contains-class',
    'namespace-contains-interface': 'interface-belongs-to-namespace',
    'interface-belongs-to-namespace': 'namespace-contains-interface',
    'namespace-contains-member': 'member-belongs-to-namespace',
    'member-belongs-to-namespace': 'namespace-contains-member',

    // Import/export
    imports: 'imported_by',
    imported_by: 'imports',
    exports: 'exported_by',
    exported_by: 'exports',

    // Inheritance
    extends: 'extended_by',
    extended_by: 'extends',
    implements: 'implemented_by',
    implemented_by: 'implements',

    // Calls
    calls: 'called_by',
    called_by: 'calls',

    // Other
    uses: 'used_by',
    used_by: 'uses',
    references: 'referenced_by',
    referenced_by: 'references',
    includes: 'included_by',
    included_by: 'includes',
  };

  normalize(relationships: IRelationship[]): IRelationship[] {
    const out: IRelationship[] = [];
    const enableInverse = !['off','false','0'].includes((process.env.ORAICLE_REL_INVERSE || 'on').toLowerCase());
    const key = (r: IRelationship) => `${r.sourceId}|${r.type}|${r.targetId}`.toLowerCase();
    const seen = new Set<string>();

    const push = (r: IRelationship) => {
      const k = key(r);
      if (seen.has(k)) return;
      seen.add(k);
      out.push(r);
    };

    for (const r of relationships) {
      const canonical = this.mapType(r.type as string);
      const base: IRelationship = {
        ...r,
        type: canonical as any,
        metadata: { ...(r.metadata || {}), canonical: true }
      };
      // Ensure base has an ID using the shared generator
      (base as any).id = (r as any).id || Relationship.computeId(base.type as any, base.sourceId, base.targetId, base.location);
      push(base);

      // generate inverse where appropriate
      const inv = enableInverse ? this.inverseMap[canonical] : undefined;
      if (enableInverse && inv) {
        const invRel: IRelationship = {
          id: Relationship.computeId(inv as any, r.targetId, r.sourceId, undefined),
          type: inv as any,
          sourceId: r.targetId,
          targetId: r.sourceId,
          location: undefined,
          metadata: { ...(r.metadata || {}), canonical_inverse: true }
        };
        push(invRel);
      }
    }

    return out;
  }

  /**
   * Map various relationship type names from different parsers to canonical types
   * This ensures consistency across different language parsers while preserving specificity
   */
  private mapType(t: string): string {
    const s = (t || '').toLowerCase().trim();
    if (!s) return 'references';

    // === CONTAINMENT RELATIONSHIPS ===
    // Preserve specific containment relationships - these are our canonical forms

    // Class containment
    if (s === 'class-contains-method' || s === 'class_contains_method' || s === 'classmethod') {
      return 'class-contains-method';
    }
    if (s === 'class-contains-property' || s === 'class_contains_property' || s === 'classproperty' || s === 'class-contains-field' || s === 'class_contains_field') {
      return 'class-contains-property';
    }
    if (s === 'class-contains-constructor' || s === 'class_contains_constructor') {
      return 'class-contains-constructor';
    }
    if (s === 'class-contains-member' || s === 'class_contains_member' || s === 'classmember') {
      return 'class-contains-member';
    }

    // Interface containment
    if (s === 'interface-contains-method' || s === 'interface_contains_method') {
      return 'interface-contains-method';
    }
    if (s === 'interface-contains-property' || s === 'interface_contains_property' || s === 'interface-contains-field') {
      return 'interface-contains-property';
    }
    if (s === 'interface-contains-member' || s === 'interface_contains_member') {
      return 'interface-contains-member';
    }

    // Namespace/Module containment
    if (s === 'namespace-contains-class' || s === 'namespace_contains_class' || s === 'module-contains-class' || s === 'package-contains-class') {
      return 'namespace-contains-class';
    }
    if (s === 'namespace-contains-interface' || s === 'namespace_contains_interface' || s === 'module-contains-interface') {
      return 'namespace-contains-interface';
    }
    if (s === 'namespace-contains-function' || s === 'module-contains-function' || s === 'package-contains-function') {
      return 'namespace-contains-function';
    }
    if (s === 'namespace-contains-member' || s === 'namespace_contains_member' || s === 'module-contains-member') {
      return 'namespace-contains-member';
    }

    // File containment (generic contains for file-level)
    if (s === 'file-contains-component' || s === 'file_contains_component') {
      return 'contains';
    }

    // Generic contains ONLY if no specific type matched
    if (s === 'contains' || s === 'includes' || s === 'has') {
      return 'contains';
    }

    // === INHERITANCE RELATIONSHIPS ===
    if (s === 'extends' || s === 'inherits' || s === 'inherits_from' || s === 'subclass_of' || s === 'derives_from') {
      return 'extends';
    }
    if (s === 'implements' || s === 'realizes' || s === 'conforms_to') {
      return 'implements';
    }
    if (s === 'overrides' || s === 'redefines' || s === 'overloads') {
      return 'overrides';
    }

    // === DEPENDENCY RELATIONSHIPS ===
    if (s === 'imports' || s === 'imports_from' || s === 'uses_module' || s === 'requires') {
      return 'imports';
    }
    if (s === 'exports' || s === 'exports_to' || s === 'provides') {
      return 'exports';
    }
    if (s === 'imported_by' || s === 'required_by') {
      return 'imported_by';
    }
    if (s === 'exported_by' || s === 'provided_by') {
      return 'exported_by';
    }

    // === CALL RELATIONSHIPS ===
    if (s === 'calls' || s === 'invokes' || s === 'executes' || s === 'calls_function' || s === 'calls_method') {
      return 'calls';
    }
    if (s === 'called_by' || s === 'invoked_by' || s === 'executed_by') {
      return 'called_by';
    }
    if (s === 'instantiates' || s === 'creates' || s === 'constructs' || s === 'calls_constructor') {
      return 'instantiates';
    }

    // === DATA RELATIONSHIPS ===
    if (s === 'reads' || s === 'accesses' || s === 'gets' || s === 'reads_from') {
      return 'reads';
    }
    if (s === 'writes' || s === 'modifies' || s === 'sets' || s === 'writes_to' || s === 'mutates') {
      return 'writes';
    }
    if (s === 'returns' || s === 'yields' || s === 'produces') {
      return 'returns';
    }
    if (s === 'accepts' || s === 'receives' || s === 'takes' || s === 'parameters') {
      return 'accepts';
    }

    // === REFERENCE RELATIONSHIPS ===
    if (s === 'references' || s === 'refers_to' || s === 'mentions') {
      return 'references';
    }
    if (s === 'uses' || s === 'depends_on' || s === 'utilizes') {
      return 'uses';
    }
    if (s === 'used_by' || s === 'dependency_of') {
      return 'used_by';
    }

    // === DOCUMENTATION RELATIONSHIPS ===
    if (s === 'documents' || s === 'describes' || s === 'annotates') {
      return 'documents';
    }
    if (s === 'explains' || s === 'clarifies' || s === 'comments') {
      return 'explains';
    }

    // === INVERSE RELATIONSHIPS ===
    if (s === 'belongs_to' || s === 'contained_by' || s === 'member_of' || s === 'child_of') {
      return 'belongs_to';
    }
    if (s === 'extended_by' || s === 'inherited_by' || s === 'subclassed_by') {
      return 'extended_by';
    }
    if (s === 'implemented_by' || s === 'realized_by') {
      return 'implemented_by';
    }

    // === LANGUAGE-SPECIFIC MAPPINGS ===
    // Python-specific
    if (s === 'decorates' || s === 'decorated_by') {
      return s; // Keep as-is, Python-specific
    }
    // Java-specific
    if (s === 'annotates' || s === 'annotated_by') {
      return s; // Keep as-is, Java-specific
    }
    // PHP-specific
    if (s === 'trait_uses' || s === 'used_by_trait') {
      return s; // Keep as-is, PHP-specific
    }

    // If we don't recognize it, preserve it as-is
    // This prevents data loss for new or custom relationship types
    return s;
  }
}
