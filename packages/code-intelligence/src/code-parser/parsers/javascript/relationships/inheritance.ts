import ts from 'typescript';
import { IComponent, IRelationship, ComponentType, RelationshipType } from '../../../types.js';

interface InheritanceContext {
  sourceFile: ts.SourceFile;
  components: IComponent[];
  relationships: IRelationship[];
}

export function extractInheritanceRelationships(ctx: InheritanceContext): void {
  const componentMap = buildComponentMap(ctx.components);
  ctx.sourceFile.forEachChild(node => visit(node, ctx, componentMap));
}

function visit(
  node: ts.Node,
  ctx: InheritanceContext,
  componentMap: Map<string, IComponent>
): void {
  if (ts.isClassDeclaration(node) && node.name) {
    const className = node.name.text;
    const classComponent = componentMap.get(className);
    if (classComponent) {
      extractClassEdges(classComponent, node, ctx);
    }
  }

  ts.forEachChild(node, child => visit(child, ctx, componentMap));
}

function extractClassEdges(
  classComponent: IComponent,
  node: ts.ClassDeclaration,
  ctx: InheritanceContext
): void {
  const { relationships, components } = ctx;

  const heritageClauses = node.heritageClauses;
  if (!heritageClauses) return;

  heritageClauses.forEach(clause => {
    if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
      clause.types.forEach(type => {
        const expressionText = type.expression.getText();
        const target = findComponent(components, ComponentType.CLASS, expressionText);
        relationships.push({
          id: `${classComponent.id}-extends-${expressionText}`,
          type: RelationshipType.EXTENDS,
          sourceId: classComponent.id,
          targetId: target?.id || expressionText,
          metadata: {
            className: classComponent.name,
            superClass: expressionText
          }
        });
      });
    }

    if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
      clause.types.forEach(type => {
        const expressionText = type.expression.getText();
        const target = findComponent(components, ComponentType.INTERFACE, expressionText);
        relationships.push({
          id: `${classComponent.id}-implements-${expressionText}`,
          type: RelationshipType.IMPLEMENTS,
          sourceId: classComponent.id,
          targetId: target?.id || expressionText,
          metadata: {
            className: classComponent.name,
            interfaceName: expressionText
          }
        });
      });
    }
  });
}

function buildComponentMap(components: IComponent[]): Map<string, IComponent> {
  const map = new Map<string, IComponent>();
  components.forEach(component => {
    map.set(component.name, component);
  });
  return map;
}

function findComponent(
  components: IComponent[],
  type: ComponentType,
  name: string
): IComponent | undefined {
  return components.find(component => component.type === type && component.name === name);
}
