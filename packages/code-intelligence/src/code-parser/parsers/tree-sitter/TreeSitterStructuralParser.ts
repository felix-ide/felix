import { BaseLanguageParser } from '../BaseLanguageParser.js';
import { IComponent, IRelationship } from '../../types.js';
import { RelationshipType } from '../../types.js';

export abstract class TreeSitterStructuralParser extends BaseLanguageParser {
  protected beginFileContext(
    filePath: string,
    content: string,
    components: IComponent[]
  ): IComponent {
    this.clearContext();
    const fileComponent = this.createFileComponent(filePath, content);
    components.push(fileComponent);
    this.pushContext(fileComponent);
    return fileComponent;
  }

  protected endFileContext(): void {
    this.popContext();
    this.clearContext();
  }

  protected collectStandardRelationships(
    components: IComponent[],
    content: string,
    extras: Array<IRelationship[] | undefined> = []
  ): IRelationship[] {
    const seen = new Set<string>();
    const relationships: IRelationship[] = [];

    const push = (rels: IRelationship[] | undefined) => {
      if (!rels || rels.length === 0) return;
      for (const rel of rels) {
        if (!rel.id) {
          rel.id = this.generateRelationshipId(rel.sourceId, rel.targetId, rel.type as string);
        }
        if (seen.has(rel.id)) continue;
        seen.add(rel.id);
        relationships.push(rel);
      }
    };

    push(this.extractUsageRelationships(components, content));
    push(this.extractInheritanceRelationships(components, content));
    push(this.extractImportExportRelationships(components, content));
    push(this.extractContainmentRelationships(components));

    for (const extra of extras) {
      push(extra);
    }

    return relationships;
  }

  protected createContainmentRelationship(
    sourceId: string,
    targetId: string,
    metadata: Record<string, unknown> = {}
  ): IRelationship {
    return {
      id: this.generateRelationshipId(sourceId, targetId, RelationshipType.CONTAINS),
      type: RelationshipType.CONTAINS,
      sourceId,
      targetId,
      metadata
    };
  }
}
