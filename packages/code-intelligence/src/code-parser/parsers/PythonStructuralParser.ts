import { dirname, basename, extname, join } from 'path';
import { existsSync } from 'fs';
import { TreeSitterStructuralParser } from './tree-sitter/TreeSitterStructuralParser.js';
import { IComponent, IRelationship, ComponentType, RelationshipType } from '../types.js';

/**
 * Shared helpers for Python-language parsers (AST & tree-sitter variants).
 * Handles module/file scaffolding, qualified naming, and namespace/inheritance relationships.
 */
export abstract class PythonStructuralParser extends TreeSitterStructuralParser {
  protected currentModuleName: string | undefined;
  protected currentModuleComponent: IComponent | undefined;

  protected beginFileModuleContext(
    filePath: string,
    content: string,
    components: IComponent[]
  ): { fileComponent: IComponent; moduleComponent?: IComponent } {
    const fileComponent = this.createFileComponent(filePath, content);
    components.push(fileComponent);
    this.pushContext(fileComponent);

    this.currentModuleName = this.computeModuleName(filePath);
    this.currentModuleComponent = undefined;

    if (this.currentModuleName) {
      const moduleComponent = this.createModuleComponent(fileComponent, this.currentModuleName);
      components.push(moduleComponent);
      this.currentModuleComponent = moduleComponent;
      this.pushContext(moduleComponent);
    }

    return { fileComponent, moduleComponent: this.currentModuleComponent };
  }

  protected endFileModuleContext(): void {
    if (this.currentModuleComponent) {
      this.popContext();
    }
    this.popContext();
    this.clearContext();
    this.currentModuleName = undefined;
    this.currentModuleComponent = undefined;
  }

  protected computeModuleName(filePath: string): string {
    const packageParts = this.getPythonPackageParts(filePath);
    const fileBaseName = basename(filePath, extname(filePath));

    if (fileBaseName === '__init__') {
      return packageParts.join('.') || '__init__';
    }

    return [...packageParts, fileBaseName].filter(Boolean).join('.') || fileBaseName;
  }

  protected buildFullName(...segments: Array<string | undefined>): string | undefined {
    const filtered = segments.filter((segment): segment is string => Boolean(segment && segment.length > 0));
    if (filtered.length === 0) {
      return undefined;
    }
    return filtered.join('.');
  }

  protected stampModuleMetadata(
    component: IComponent,
    moduleName?: string,
    fullName?: string,
    extra?: Record<string, unknown>
  ): void {
    component.metadata = {
      ...(component.metadata || {}),
      ...(moduleName ? { module: moduleName } : {}),
      ...(fullName ? { fullName } : {}),
      ...(extra || {})
    };
  }

  protected createModuleComponent(fileComponent: IComponent, moduleName: string): IComponent {
    return {
      id: this.generateComponentId(fileComponent.filePath!, moduleName, ComponentType.MODULE),
      name: moduleName,
      type: ComponentType.MODULE,
      language: this.language,
      filePath: fileComponent.filePath,
      location: fileComponent.location,
      parentId: fileComponent.id,
      metadata: {
        moduleName,
        module: moduleName,
        fileId: fileComponent.id
      }
    };
  }

  protected linkModuleContainment(components: IComponent[]): IRelationship[] {
    if (!this.currentModuleComponent) {
      // Module context not active, but we still may have module components in list
      const moduleComponents = components.filter(c => c.type === ComponentType.MODULE);
      if (moduleComponents.length === 0) {
        return [];
      }
      return moduleComponents.flatMap(moduleComponent =>
        this.collectModuleContainmentRelationships(moduleComponent, components)
      );
    }

    return this.collectModuleContainmentRelationships(this.currentModuleComponent, components);
  }

  private collectModuleContainmentRelationships(
    moduleComponent: IComponent,
    components: IComponent[]
  ): IRelationship[] {
    const relationships: IRelationship[] = [];
    const moduleName = (moduleComponent.metadata as any)?.module || moduleComponent.name;
    const filePath = moduleComponent.filePath;

    const allowedTypes = new Set<ComponentType>([
      ComponentType.CLASS,
      ComponentType.INTERFACE,
      ComponentType.FUNCTION,
      ComponentType.METHOD,
      ComponentType.PROPERTY,
      ComponentType.VARIABLE,
      ComponentType.CONSTANT,
      ComponentType.DECORATOR
    ]);

    for (const component of components) {
      if (component.id === moduleComponent.id) continue;
      if (!component.filePath || (filePath && component.filePath !== filePath)) continue;
      if (!allowedTypes.has(component.type as ComponentType)) continue;

      const componentModule = (component.metadata as any)?.module as string | undefined;
      if (moduleName && componentModule && componentModule !== moduleName) continue;

      relationships.push({
        id: this.generateRelationshipId(moduleComponent.id, component.id, RelationshipType.IN_NAMESPACE),
        type: RelationshipType.IN_NAMESPACE,
        sourceId: moduleComponent.id,
        targetId: component.id,
        metadata: {
          relationship: 'module-contains-entity',
          module: moduleName
        }
      });
    }

    return relationships;
  }

  protected linkPythonInheritanceRelationships(components: IComponent[]): IRelationship[] {
    const relationships: IRelationship[] = [];
    const classComponents = components.filter(c => c.type === ComponentType.CLASS);
    if (classComponents.length === 0) return relationships;

    const fullNameIndex = new Map<string, IComponent>();
    const shortNameIndex = new Map<string, IComponent[]>();

    for (const classComponent of classComponents) {
      const metadata = (classComponent.metadata ?? {}) as Record<string, any>;
      const fullName = typeof metadata.fullName === 'string' ? metadata.fullName : undefined;
      if (fullName) {
        fullNameIndex.set(fullName, classComponent);
      }
      const name = (classComponent.name || '').toString();
      if (name) {
        const list = shortNameIndex.get(name) || [];
        list.push(classComponent);
        shortNameIndex.set(name, list);
      }
    }

    const seen = new Set<string>();

    for (const classComponent of classComponents) {
      const metadata = (classComponent.metadata ?? {}) as Record<string, any>;
      const moduleName = typeof metadata.module === 'string' ? metadata.module : undefined;
      const baseClasses: string[] = Array.isArray(metadata.baseClasses) ? metadata.baseClasses : [];
      if (baseClasses.length === 0) continue;

      for (const baseRaw of baseClasses) {
        const baseName = (baseRaw || '').toString().trim();
        if (!baseName || baseName === 'object') continue;

        let targetComponent: IComponent | undefined = fullNameIndex.get(baseName);

        if (!targetComponent && moduleName) {
          const moduleQualified = `${moduleName}.${baseName}`;
          targetComponent = fullNameIndex.get(moduleQualified);
        }

        if (!targetComponent) {
          const candidates = shortNameIndex.get(baseName);
          if (candidates && candidates.length === 1) {
            targetComponent = candidates[0];
          }
        }

        const targetId = targetComponent ? targetComponent.id : `RESOLVE:${baseName}`;
        const relationshipId = this.generateRelationshipId(classComponent.id, targetId, RelationshipType.EXTENDS);
        if (seen.has(relationshipId)) continue;
        seen.add(relationshipId);

        relationships.push({
          id: relationshipId,
          type: RelationshipType.EXTENDS,
          sourceId: classComponent.id,
          targetId,
          metadata: {
            relationship: 'class-extends-class',
            detection: 'python-structural',
            baseClass: baseName,
            module: moduleName,
            ...(targetComponent ? {} : { needsResolution: true })
          }
        });
      }
    }

    return relationships;
  }

  protected getPythonPackageParts(filePath: string): string[] {
    try {
      let dir = dirname(filePath);
      const parts: string[] = [];
      while (true) {
        const initPath = join(dir, '__init__.py');
        if (existsSync(initPath)) {
          parts.unshift(basename(dir));
          const parent = dirname(dir);
          if (parent === dir) break;
          dir = parent;
        } else {
          break;
        }
      }
      return parts;
    } catch {
      return [];
    }
  }
}
