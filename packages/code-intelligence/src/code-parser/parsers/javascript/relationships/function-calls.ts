import ts from 'typescript';
import { IComponent, IRelationship, ComponentType, RelationshipType } from '../../../types.js';

interface CallRelationshipContext {
  sourceFile: ts.SourceFile;
  components: IComponent[];
  relationships: IRelationship[];
  getNodeLocation(node: ts.Node): { startLine: number };
  findContainingFunction(node: ts.Node): string | undefined;
}

export function extractFunctionCallRelationships(ctx: CallRelationshipContext): void {
  const { sourceFile } = ctx;
  const componentMap = buildComponentMap(ctx.components);

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      handleCallExpression(ctx, node, componentMap);
    }

    if (ts.isPropertyAccessExpression(node)) {
      handlePropertyAccess(ctx, node, componentMap);
    }

    if (ts.isIdentifier(node)) {
      handleIdentifier(ctx, node, componentMap);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

function handleCallExpression(
  ctx: CallRelationshipContext,
  node: ts.CallExpression,
  componentMap: Map<string, IComponent>
): void {
  const callerName = ctx.findContainingFunction(node);
  if (!callerName) return;

  let calleeName: string | undefined;
  if (ts.isIdentifier(node.expression)) {
    calleeName = node.expression.text;
  } else if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.name)) {
    calleeName = node.expression.name.text;
  }

  if (!calleeName) return;
  const calleeComponent = componentMap.get(calleeName);
  if (!calleeComponent) return;
  const callerComponent = componentMap.get(callerName);
  if (!callerComponent || callerComponent.id === calleeComponent.id) return;

  const location = ctx.getNodeLocation(node);
  ctx.relationships.push({
    id: `${callerComponent.id}-calls-${calleeName}-${location.startLine}`,
    type: RelationshipType.CALLS,
    sourceId: callerComponent.id,
    targetId: calleeComponent.id,
    metadata: {
      relationship: 'function-call',
      callerName,
      calleeName,
      callerType: callerComponent.type,
      calleeType: calleeComponent?.type,
      line: location.startLine
    }
  });
}

function handlePropertyAccess(
  ctx: CallRelationshipContext,
  node: ts.PropertyAccessExpression,
  componentMap: Map<string, IComponent>
): void {
  const accessorName = ctx.findContainingFunction(node);
  if (!accessorName) return;

  const propertyName = ts.isIdentifier(node.name) ? node.name.text : 'unknown';
  const objectName = ts.isIdentifier(node.expression) ? node.expression.text : 'unknown';
  const accessorComponent = componentMap.get(accessorName);
  if (!accessorComponent) return;

  const targetComponent = findComponentByName(componentMap, propertyName);
  const location = ctx.getNodeLocation(node);

  ctx.relationships.push({
    id: `${accessorComponent.id}-accesses-${objectName}.${propertyName}-${location.startLine}`,
    type: RelationshipType.USES,
    sourceId: accessorComponent.id,
    targetId: targetComponent?.id || `UNRESOLVED:${objectName}.${propertyName}`,
    metadata: {
      usageType: 'property_access',
      line: location.startLine,
      accessorName,
      objectName,
      propertyName
    }
  });
}

function handleIdentifier(
  ctx: CallRelationshipContext,
  node: ts.Identifier,
  componentMap: Map<string, IComponent>
): void {
  const userName = ctx.findContainingFunction(node);
  if (!userName) return;

  const variableName = node.text;
  if (variableName === userName) return;

  const userComponent = componentMap.get(userName);
  const variableComponent = componentMap.get(variableName);
  if (!userComponent || !variableComponent || variableComponent.type !== ComponentType.VARIABLE) return;

  const location = ctx.getNodeLocation(node);
  ctx.relationships.push({
    id: `${userComponent.id}-uses-${variableComponent.id}-${location.startLine}`,
    type: RelationshipType.USES,
    sourceId: userComponent.id,
    targetId: variableComponent.id,
    metadata: {
      usageType: 'variable_reference',
      line: location.startLine,
      userName,
      variableName
    }
  });
}

function buildComponentMap(components: IComponent[]): Map<string, IComponent> {
  const map = new Map<string, IComponent>();
  components.forEach(component => map.set(component.name, component));
  return map;
}

function findComponentByName(
  componentMap: Map<string, IComponent>,
  name: string
): IComponent | undefined {
  return componentMap.get(name);
}
