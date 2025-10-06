import ts from 'typescript';

export function isReactFunctionalComponent(node: ts.FunctionDeclaration, content: string): boolean {
  return returnsJSX(node) || content.includes('React') || /\.jsx?$/.test(content);
}

export function extendsReactComponent(node: ts.ClassDeclaration): string | undefined {
  if (!node.heritageClauses) return undefined;
  for (const heritage of node.heritageClauses) {
    if (heritage.token !== ts.SyntaxKind.ExtendsKeyword) continue;
    for (const type of heritage.types) {
      if (ts.isIdentifier(type.expression)) {
        const baseName = type.expression.text;
        if (baseName.includes('Component') || baseName.includes('React')) {
          return baseName;
        }
      }
    }
  }
  return undefined;
}

export function extractReactHooks(node: ts.FunctionDeclaration): string[] {
  const hooks: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
      const name = n.expression.text;
      if (name.startsWith('use')) {
        hooks.push(name);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return hooks;
}

export function extractReactProps(node: ts.FunctionDeclaration): string[] {
  const props: string[] = [];
  if (node.parameters && node.parameters.length > 0) {
    const firstParam = node.parameters[0];
    if (firstParam && ts.isObjectBindingPattern(firstParam.name)) {
      firstParam.name.elements.forEach(element => {
        if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
          props.push(element.name.text);
        }
      });
    }
  }
  return props;
}

export function extractClassMethods(node: ts.ClassDeclaration): string[] {
  const methods: string[] = [];
  node.members.forEach(member => {
    if (ts.isMethodDeclaration(member) && ts.isIdentifier(member.name)) {
      methods.push(member.name.text);
    }
  });
  return methods;
}

export function inferTypeFromNode(node: ts.Node): string {
  if (ts.isStringLiteral(node)) return 'string';
  if (ts.isNumericLiteral(node)) return 'number';
  if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return 'boolean';
  if (node.kind === ts.SyntaxKind.NullKeyword) return 'null';
  if (node.kind === ts.SyntaxKind.UndefinedKeyword) return 'undefined';
  if (ts.isArrayLiteralExpression(node)) return 'array';
  if (ts.isObjectLiteralExpression(node)) return 'object';
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return 'function';
  return 'unknown';
}

export function returnsJSX(node: ts.FunctionDeclaration): boolean {
  const sourceText = node.getText();
  return /return\s*<\w+/.test(sourceText) || /=>\s*<\w+/.test(sourceText);
}
