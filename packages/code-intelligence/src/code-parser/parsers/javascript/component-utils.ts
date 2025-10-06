import ts from 'typescript';
import type { Parameter } from '../../types.js';

export function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  const modifiers = (node as any).modifiers;
  return modifiers?.some((modifier: any) => modifier.kind === kind) ?? false;
}

export function getAccessModifier(node: ts.Node): 'public' | 'private' | 'protected' | 'package' {
  if (hasModifier(node, ts.SyntaxKind.PrivateKeyword)) return 'private';
  if (hasModifier(node, ts.SyntaxKind.ProtectedKeyword)) return 'protected';
  return 'public';
}

export function getSuperClass(node: ts.ClassDeclaration): string | undefined {
  const heritageClause = node.heritageClauses?.find(clause => clause.token === ts.SyntaxKind.ExtendsKeyword);
  return heritageClause?.types[0]?.expression.getText();
}

export function getImplementedInterfaces(node: ts.ClassDeclaration): string[] {
  const heritageClause = node.heritageClauses?.find(clause => clause.token === ts.SyntaxKind.ImplementsKeyword);
  return heritageClause?.types.map(type => type.expression.getText()) ?? [];
}

export function getDecorators(node: ts.Node): string[] {
  const decorators = (node as any).decorators || (node as any).modifiers?.filter((m: any) => m.kind === ts.SyntaxKind.Decorator);
  return decorators?.map((decorator: any) => decorator.getText()) ?? [];
}

export function getTypeParameters(node: any): string[] {
  const typeParameters = node.typeParameters;
  return typeParameters?.map((param: any) => param.name.text) ?? [];
}

export function extractParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>): Parameter[] {
  return parameters.map(param => {
    const parameter: Parameter = {
      name: param.name.getText(),
      isOptional: param.questionToken !== undefined,
      isRest: param.dotDotDotToken !== undefined
    };

    const type = getTypeString(param.type);
    if (type) parameter.type = type;

    const defaultValue = getDefaultValue(param.initializer);
    if (defaultValue) parameter.defaultValue = defaultValue;

    return parameter;
  });
}

export function getReturnType(node: ts.FunctionLikeDeclaration): string | undefined {
  return getTypeString(node.type);
}

export function getTypeString(type: ts.TypeNode | undefined): string | undefined {
  return type?.getText();
}

export function getDefaultValue(initializer: ts.Expression | undefined): string | undefined {
  if (!initializer) return undefined;
  if (ts.isStringLiteral(initializer)) {
    return `'${initializer.text}'`;
  }
  if (ts.isNumericLiteral(initializer)) {
    return initializer.text;
  }
  if (initializer.kind === ts.SyntaxKind.TrueKeyword || initializer.kind === ts.SyntaxKind.FalseKeyword) {
    return initializer.getText();
  }
  if (ts.isObjectLiteralExpression(initializer) || ts.isArrayLiteralExpression(initializer)) {
    return initializer.getText();
  }
  if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
    return initializer.getText();
  }
  return initializer.getText();
}

export function getVariableScope(node: ts.VariableDeclaration): string {
  let parent: ts.Node | undefined = node.parent;
  while (parent) {
    if (ts.isSourceFile(parent)) return 'module';
    if (ts.isClassDeclaration(parent)) return 'class';
    if (ts.isFunctionDeclaration(parent) || ts.isMethodDeclaration(parent)) return 'function';
    parent = parent.parent;
  }
  return 'unknown';
}

export function isConstVariable(node: ts.VariableDeclaration): boolean {
  const parent = node.parent;
  return ts.isVariableDeclarationList(parent) && (parent.flags & ts.NodeFlags.Const) !== 0;
}

export function getInterfaceExtends(node: ts.InterfaceDeclaration): string[] {
  return node.heritageClauses?.flatMap(clause => clause.types.map(type => type.getText())) ?? [];
}

export function getInterfaceMethods(node: ts.InterfaceDeclaration): string[] {
  return node.members
    .filter(member => ts.isMethodSignature(member) && ts.isIdentifier(member.name))
    .map(member => (member.name as ts.Identifier).text);
}

export function getInterfaceProperties(node: ts.InterfaceDeclaration): string[] {
  return node.members
    .filter(member => ts.isPropertySignature(member) && ts.isIdentifier(member.name))
    .map(member => (member.name as ts.Identifier).text);
}

export function getEnumValues(node: ts.EnumDeclaration): Array<{ name: string; value?: string }> {
  return node.members.map(member => {
    const name = ts.isIdentifier(member.name) ? member.name.text : member.name.getText();
    const value = member.initializer ? member.initializer.getText() : undefined;
    return { name, value };
  });
}

export function isModule(content: string): boolean {
  return /\b(?:import|export)\b/.test(content) ||
         /\bmodule\.exports\b/.test(content) ||
         /\bexports\.\w+/.test(content);
}
