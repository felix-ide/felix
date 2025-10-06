import ts from 'typescript';
import {
  IComponent,
  IRelationship,
  ComponentType,
  RelationshipType
} from '../../../types.js';

interface ImportExportContext {
  sourceFile: ts.SourceFile;
  fileComponent: IComponent;
  components: IComponent[];
  relationships: IRelationship[];
}

export function extractImportExportRelationships(ctx: ImportExportContext): void {
  const { sourceFile } = ctx;
  sourceFile.statements.forEach(statement => {
    if (ts.isImportDeclaration(statement)) {
      handleImportDeclaration(ctx, statement);
    }

    if (ts.isExportDeclaration(statement)) {
      handleExportDeclaration(ctx, statement);
    }

    if (ts.isExportAssignment(statement)) {
      handleExportAssignment(ctx, statement);
    }

    if (hasExportModifier(statement)) {
      handleExportModifiers(ctx, statement);
    }
  });
}

function handleImportDeclaration(ctx: ImportExportContext, statement: ts.ImportDeclaration): void {
  if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) return;
  const importPath = statement.moduleSpecifier.text;

  const { relationships, fileComponent } = ctx;

  if (statement.importClause) {
    if (statement.importClause.name) {
      relationships.push(createImportRelationship(fileComponent.id, importPath, 'default', statement.importClause.name.text));
    }

    const bindings = statement.importClause.namedBindings;
    if (bindings) {
      if (ts.isNamedImports(bindings)) {
        bindings.elements.forEach(element => {
          const importedName = element.name.text;
          const originalName = element.propertyName ? element.propertyName.text : importedName;
          relationships.push(createImportRelationship(fileComponent.id, importPath, 'named', importedName, originalName));
        });
      } else if (ts.isNamespaceImport(bindings)) {
        relationships.push(createImportRelationship(fileComponent.id, importPath, 'namespace', bindings.name.text));
      }
    }
  }
}

function handleExportDeclaration(ctx: ImportExportContext, statement: ts.ExportDeclaration): void {
  const { relationships, fileComponent, components } = ctx;

  if (statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
    const exportPath = statement.moduleSpecifier.text;
    relationships.push({
      id: `${fileComponent.id}-exports-from-${exportPath}`,
      type: RelationshipType.EXPORTS_FROM,
      sourceId: fileComponent.id,
      targetId: exportPath,
      metadata: {
        exportPath,
        isReExport: true
      }
    });
    return;
  }

  if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
    statement.exportClause.elements.forEach(element => {
      const exportedName = element.name.text;
      const localName = element.propertyName ? element.propertyName.text : exportedName;
      const exportedComponent = components.find(c => c.name === localName && c.type !== ComponentType.FILE);
      if (!exportedComponent) return;

      relationships.push({
        id: `${fileComponent.id}-exports-${exportedComponent.id}`,
        type: RelationshipType.EXPORTS,
        sourceId: fileComponent.id,
        targetId: exportedComponent.id,
        metadata: {
          exportedName,
          localName,
          componentType: exportedComponent.type
        }
      });

      exportedComponent.metadata = exportedComponent.metadata || {};
      exportedComponent.metadata.isExported = true;
      exportedComponent.metadata.exportedName = exportedName;
    });
  }
}

function handleExportAssignment(ctx: ImportExportContext, statement: ts.ExportAssignment): void {
  const { relationships, fileComponent, components } = ctx;
  const expr = statement.expression;

  if (ts.isIdentifier(expr)) {
    const target = components.find(c => c.name === expr.text && c.type !== ComponentType.FILE);
    if (target) {
      relationships.push({
        id: `${fileComponent.id}-exports-default-${target.id}`,
        type: RelationshipType.EXPORTS,
        sourceId: fileComponent.id,
        targetId: target.id,
        metadata: { default: true, componentType: target.type }
      });
      target.metadata = target.metadata || {};
      target.metadata.isExported = true;
      target.metadata.exportedDefault = true;
      return;
    }
  }

  relationships.push({
    id: `${fileComponent.id}-exports-default-expression`,
    type: RelationshipType.EXPORTS,
    sourceId: fileComponent.id,
    targetId: `${fileComponent.id}#default`,
    metadata: { default: true }
  });
}

function handleExportModifiers(ctx: ImportExportContext, statement: ts.Statement): void {
  const { components } = ctx;

  const markExported = (type: ComponentType, name: string | undefined) => {
    if (!name) return;
    const comp = components.find(c => c.type === type && c.name === name);
    if (!comp) return;
    comp.metadata = comp.metadata || {};
    comp.metadata.isExported = true;
  };

  if (ts.isClassDeclaration(statement)) {
    markExported(ComponentType.CLASS, statement.name?.text);
  } else if (ts.isFunctionDeclaration(statement)) {
    markExported(ComponentType.FUNCTION, statement.name?.text);
  } else if (ts.isVariableStatement(statement)) {
    statement.declarationList.declarations.forEach(decl => {
      const varName = ts.isIdentifier(decl.name) ? decl.name.text : undefined;
      markExported(ComponentType.VARIABLE, varName);
    });
  } else if (ts.isInterfaceDeclaration(statement)) {
    markExported(ComponentType.INTERFACE, statement.name.text);
  } else if (ts.isEnumDeclaration(statement)) {
    markExported(ComponentType.ENUM, statement.name.text);
  } else if (ts.isTypeAliasDeclaration(statement)) {
    markExported(ComponentType.TYPEDEF, statement.name.text);
  }
}

function createImportRelationship(
  fileId: string,
  specifier: string,
  importKind: 'default' | 'named' | 'namespace',
  importedName: string,
  originalName?: string
): IRelationship {
  return {
    id: `${fileId}-imports-${importKind}-${importedName}-from-${specifier}`,
    type: RelationshipType.IMPORTS_FROM,
    sourceId: fileId,
    targetId: `RESOLVE:${specifier}`,
    metadata: {
      importKind,
      importedName,
      originalName,
      specifier,
      needsResolution: true
    }
  };
}

function hasExportModifier(statement: ts.Statement): boolean {
  const modifiers = (statement as any).modifiers as ts.NodeArray<ts.Modifier> | undefined;
  return modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}
