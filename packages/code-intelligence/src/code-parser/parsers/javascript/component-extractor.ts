import ts from 'typescript';
import {
  IComponent,
  IFunctionComponent,
  IMethodComponent,
  ComponentType,
  RelationshipType,
  Location
} from '../../types.js';
import {
  hasModifier,
  getAccessModifier,
  getDecorators,
  getEnumValues,
  getImplementedInterfaces,
  getInterfaceExtends,
  getInterfaceMethods,
  getInterfaceProperties,
  getReturnType,
  getTypeParameters,
  getTypeString,
  getDefaultValue,
  extractParameters,
  getVariableScope,
  isConstVariable,
  getSuperClass
} from './component-utils.js';
import {
  isReactFunctionalComponent,
  extendsReactComponent,
  extractReactHooks,
  extractReactProps,
  extractClassMethods
} from './react-utils.js';

export interface ComponentExtractionContext {
  language: string;
  filePath: string;
  content: string;
  components: IComponent[];
  getNodeLocation(node: ts.Node): Location;
  generateComponentId(filePath: string, name: string, type: ComponentType): string;
  getCurrentParentId(): string | undefined;
  pushContext(component: IComponent): void;
  popContext(): void;
  extractSourceCode(node: ts.Node): string;
  extractDocumentation(line: number): string | undefined;
  isExported(name: string): boolean;
  isModuleLevelVariable(node: ts.VariableDeclaration): boolean;
  isClassLevelVariable(node: ts.VariableDeclaration): boolean;
}

export function visitComponentNode(ctx: ComponentExtractionContext, node: ts.Node): void {
  switch (node.kind) {
    case ts.SyntaxKind.ClassDeclaration: {
      const classNode = node as ts.ClassDeclaration;
      if (classNode.name) {
        extractClassComponent(ctx, classNode);
      }
      return;
    }
    case ts.SyntaxKind.InterfaceDeclaration:
      extractInterfaceComponent(ctx, node as ts.InterfaceDeclaration);
      break;
    case ts.SyntaxKind.FunctionDeclaration:
      extractFunctionComponent(ctx, node as ts.FunctionDeclaration);
      return;
    case ts.SyntaxKind.ArrowFunction:
    case ts.SyntaxKind.FunctionExpression:
      extractFunctionExpressionComponent(ctx, node as ts.ArrowFunction | ts.FunctionExpression);
      return;
    case ts.SyntaxKind.MethodDeclaration:
      extractMethodComponent(ctx, node as ts.MethodDeclaration);
      break;
    case ts.SyntaxKind.PropertyDeclaration:
      extractPropertyComponent(ctx, node as ts.PropertyDeclaration);
      break;
    case ts.SyntaxKind.VariableDeclaration:
      extractVariableComponent(ctx, node as ts.VariableDeclaration);
      break;
    case ts.SyntaxKind.EnumDeclaration:
      extractEnumComponent(ctx, node as ts.EnumDeclaration);
      break;
    case ts.SyntaxKind.TypeAliasDeclaration:
      extractTypeAliasComponent(ctx, node as ts.TypeAliasDeclaration);
      break;
  }

  ts.forEachChild(node, child => visitComponentNode(ctx, child));
}

function extractClassComponent(ctx: ComponentExtractionContext, node: ts.ClassDeclaration): void {
  const location = ctx.getNodeLocation(node);
  const className = node.name!.text;

  const classComponent: IComponent = {
    id: ctx.generateComponentId(ctx.filePath, className, ComponentType.CLASS),
    name: className,
    type: ComponentType.CLASS,
    language: ctx.language,
    filePath: ctx.filePath,
    location,
    code: ctx.extractSourceCode(node),
    parentId: ctx.getCurrentParentId(),
    metadata: {
      accessModifier: getAccessModifier(node),
      isExported: ctx.isExported(className),
      isAbstract: hasModifier(node, ts.SyntaxKind.AbstractKeyword),
      isStatic: hasModifier(node, ts.SyntaxKind.StaticKeyword),
      isFinal: false,
      superClass: getSuperClass(node),
      interfaces: getImplementedInterfaces(node),
      implementedInterfaces: getImplementedInterfaces(node),
      decorators: getDecorators(node),
      generics: getTypeParameters(node),
      documentation: ctx.extractDocumentation(location.startLine)
    }
  };

  ctx.components.push(classComponent);
  ctx.pushContext(classComponent);
  node.members.forEach(member => visitComponentNode(ctx, member));
  ctx.popContext();
}

function extractFunctionComponent(ctx: ComponentExtractionContext, node: ts.FunctionDeclaration): void {
  if (!node.name) return;

  const location = ctx.getNodeLocation(node);
  const functionName = node.name.text;

  const functionComponent: IFunctionComponent = {
    id: ctx.generateComponentId(ctx.filePath, functionName, ComponentType.FUNCTION),
    name: functionName,
    type: ComponentType.FUNCTION,
    language: ctx.language,
    filePath: ctx.filePath,
    location,
    code: ctx.extractSourceCode(node),
    parameters: extractParameters(node.parameters),
    metadata: {
      isExported: ctx.isExported(functionName)
    }
  };

  const returnType = getReturnType(node);
  if (returnType) functionComponent.returnType = returnType;
  if (hasModifier(node, ts.SyntaxKind.AsyncKeyword)) functionComponent.isAsync = true;
  if (node.asteriskToken !== undefined) functionComponent.isGenerator = true;
  functionComponent.isArrow = false;

  const accessModifier = getAccessModifier(node);
  if (accessModifier !== 'public') functionComponent.accessModifier = accessModifier;

  const decorators = getDecorators(node);
  if (decorators.length > 0) functionComponent.decorators = decorators;

  const documentation = ctx.extractDocumentation(location.startLine);
  if (documentation) functionComponent.documentation = documentation;

  ctx.components.push(functionComponent);
}

function extractFunctionExpressionComponent(
  ctx: ComponentExtractionContext,
  node: ts.ArrowFunction | ts.FunctionExpression
): void {
  let functionName = 'anonymous';
  const parent = node.parent;

  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    functionName = parent.name.text;
  } else if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
    functionName = parent.name.text;
  }

  const location = ctx.getNodeLocation(node);
  const uniqueFunctionName = functionName === 'anonymous'
    ? `anonymous_L${location.startLine}`
    : functionName;

  const functionComponent: IFunctionComponent = {
    id: ctx.generateComponentId(ctx.filePath, uniqueFunctionName, ComponentType.FUNCTION),
    name: functionName,
    type: ComponentType.FUNCTION,
    language: ctx.language,
    filePath: ctx.filePath,
    location,
    code: ctx.extractSourceCode(node),
    parentId: ctx.getCurrentParentId(),
    parameters: extractParameters(node.parameters),
    metadata: {
      isExported: ctx.isExported(functionName)
    }
  };

  const returnType = getReturnType(node);
  if (returnType) functionComponent.returnType = returnType;

  if (hasModifier(node, ts.SyntaxKind.AsyncKeyword)) functionComponent.isAsync = true;
  functionComponent.isGenerator = false;
  if (ts.isArrowFunction(node)) functionComponent.isArrow = true;

  const documentation = ctx.extractDocumentation(location.startLine);
  if (documentation) functionComponent.documentation = documentation;

  ctx.components.push(functionComponent);
  ctx.pushContext(functionComponent);

  if (node.body && ts.isBlock(node.body)) {
    ts.forEachChild(node.body, child => visitComponentNode(ctx, child));
  }

  ctx.popContext();
}

function extractMethodComponent(ctx: ComponentExtractionContext, node: ts.MethodDeclaration): void {
  if (!node.name || !ts.isIdentifier(node.name)) return;

  const location = ctx.getNodeLocation(node);
  const methodName = node.name.text;

  const methodComponent: IMethodComponent = {
    id: ctx.generateComponentId(ctx.filePath, methodName, ComponentType.METHOD),
    name: methodName,
    type: ComponentType.METHOD,
    language: ctx.language,
    filePath: ctx.filePath,
    location,
    code: ctx.extractSourceCode(node),
    parentId: ctx.getCurrentParentId(),
    parameters: extractParameters(node.parameters),
    accessModifier: getAccessModifier(node),
    metadata: {}
  };

  const returnType = getReturnType(node);
  if (returnType) methodComponent.returnType = returnType;
  if (hasModifier(node, ts.SyntaxKind.AsyncKeyword)) methodComponent.isAsync = true;
  if (node.asteriskToken !== undefined) methodComponent.isGenerator = true;
  if (hasModifier(node, ts.SyntaxKind.StaticKeyword)) methodComponent.isStatic = true;
  if (hasModifier(node, ts.SyntaxKind.AbstractKeyword)) methodComponent.isAbstract = true;
  methodComponent.isFinal = false;
  methodComponent.isConstructor = false;

  const decorators = getDecorators(node);
  if (decorators.length > 0) methodComponent.decorators = decorators;

  const documentation = ctx.extractDocumentation(location.startLine);
  if (documentation) methodComponent.documentation = documentation;

  ctx.components.push(methodComponent);
}

function extractPropertyComponent(ctx: ComponentExtractionContext, node: ts.PropertyDeclaration): void {
  if (!node.name || !ts.isIdentifier(node.name)) return;

  const location = ctx.getNodeLocation(node);
  const propertyName = node.name.text;

  const propertyComponent: IComponent = {
    id: ctx.generateComponentId(ctx.filePath, propertyName, ComponentType.PROPERTY),
    name: propertyName,
    type: ComponentType.PROPERTY,
    language: ctx.language,
    filePath: ctx.filePath,
    location,
    code: ctx.extractSourceCode(node),
    parentId: ctx.getCurrentParentId(),
    metadata: {
      propertyType: getTypeString(node.type),
      defaultValue: getDefaultValue(node.initializer),
      isStatic: hasModifier(node, ts.SyntaxKind.StaticKeyword),
      isReadonly: hasModifier(node, ts.SyntaxKind.ReadonlyKeyword),
      accessModifier: getAccessModifier(node),
      decorators: getDecorators(node),
      documentation: ctx.extractDocumentation(location.startLine)
    }
  };

  ctx.components.push(propertyComponent);
}

export function extractVariableComponent(ctx: ComponentExtractionContext, node: ts.VariableDeclaration): void {
  if (!node.name || !ts.isIdentifier(node.name)) return;

  const isModuleLevel = ctx.isModuleLevelVariable(node);
  const isClassLevel = ctx.isClassLevelVariable(node);
  if (!isModuleLevel && !isClassLevel) return;

  const location = ctx.getNodeLocation(node);
  const variableName = node.name.text;

  const variableComponent: IComponent = {
    id: ctx.generateComponentId(ctx.filePath, variableName, ComponentType.VARIABLE),
    name: variableName,
    type: ComponentType.VARIABLE,
    language: ctx.language,
    filePath: ctx.filePath,
    location,
    code: ctx.extractSourceCode(node),
    parentId: ctx.getCurrentParentId(),
    metadata: {
      variableType: getTypeString(node.type),
      defaultValue: getDefaultValue(node.initializer),
      scope: getVariableScope(node),
      isConst: isConstVariable(node),
      documentation: ctx.extractDocumentation(location.startLine),
      isExported: ctx.isExported(variableName),
      isModuleLevel,
      isClassLevel
    }
  };

  ctx.components.push(variableComponent);
}

function extractInterfaceComponent(ctx: ComponentExtractionContext, node: ts.InterfaceDeclaration): void {
  const location = ctx.getNodeLocation(node);
  const interfaceName = node.name.text;

  const interfaceComponent: IComponent = {
    id: ctx.generateComponentId(ctx.filePath, interfaceName, ComponentType.INTERFACE),
    name: interfaceName,
    type: ComponentType.INTERFACE,
    language: ctx.language,
    filePath: ctx.filePath,
    location,
    code: ctx.extractSourceCode(node),
    metadata: {
      extends: getInterfaceExtends(node),
      methods: getInterfaceMethods(node),
      properties: getInterfaceProperties(node),
      generics: getTypeParameters(node),
      documentation: ctx.extractDocumentation(location.startLine),
      isExported: ctx.isExported(interfaceName)
    }
  };

  ctx.components.push(interfaceComponent);
}

function extractEnumComponent(ctx: ComponentExtractionContext, node: ts.EnumDeclaration): void {
  const location = ctx.getNodeLocation(node);
  const enumName = node.name.text;

  const enumComponent: IComponent = {
    id: ctx.generateComponentId(ctx.filePath, enumName, ComponentType.ENUM),
    name: enumName,
    type: ComponentType.ENUM,
    language: ctx.language,
    filePath: ctx.filePath,
    location,
    code: ctx.extractSourceCode(node),
    parentId: ctx.getCurrentParentId(),
    metadata: {
      values: getEnumValues(node),
      isConst: hasModifier(node, ts.SyntaxKind.ConstKeyword),
      documentation: ctx.extractDocumentation(location.startLine),
      isExported: ctx.isExported(enumName)
    }
  };

  ctx.components.push(enumComponent);
}

function extractTypeAliasComponent(ctx: ComponentExtractionContext, node: ts.TypeAliasDeclaration): void {
  const location = ctx.getNodeLocation(node);
  const typeName = node.name.text;

  const typeComponent: IComponent = {
    id: ctx.generateComponentId(ctx.filePath, typeName, ComponentType.TYPEDEF),
    name: typeName,
    type: ComponentType.TYPEDEF,
    language: ctx.language,
    filePath: ctx.filePath,
    location,
    code: ctx.extractSourceCode(node),
    parentId: ctx.getCurrentParentId(),
    metadata: {
      typeDefinition: getTypeString(node.type),
      generics: getTypeParameters(node),
      documentation: ctx.extractDocumentation(location.startLine),
      isExported: ctx.isExported(typeName)
    }
  };

  ctx.components.push(typeComponent);
}
