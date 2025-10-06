/**
 * Core interfaces for code analysis entities
 */
import { ComponentType, RelationshipType, Location, ScopeContext, Parameter } from './core-types.js';
/**
 * Base component interface
 */
export interface IComponent {
    id: string;
    name: string;
    type: ComponentType;
    language: string;
    filePath: string;
    location: Location;
    code?: string;
    metadata: Record<string, any>;
    scopeContext?: ScopeContext;
    parentId?: string;
}
/**
 * Base relationship interface
 */
export interface IRelationship {
    id: string;
    type: RelationshipType;
    sourceId: string;
    targetId: string;
    location?: Location;
    metadata: Record<string, any>;
}
/**
 * Parse error information
 */
export interface ParseError {
    message: string;
    location?: Location;
    severity: 'error' | 'warning';
    code?: string;
    source?: string;
}
/**
 * Parse warning information
 */
export interface ParseWarning {
    message: string;
    location?: Location;
    code?: string;
    source?: string;
}
/**
 * Parse result from language parsers
 */
export interface ParseResult {
    components: IComponent[];
    relationships: IRelationship[];
    errors: ParseError[];
    warnings: ParseWarning[];
    metadata?: {
        filePath: string;
        language: string;
        parseTime: number;
        componentCount: number;
        relationshipCount: number;
        [key: string]: any;
    };
}
/**
 * Component search criteria
 */
export interface ComponentSearchCriteria {
    type?: string | string[];
    name?: string;
    language?: string | string[];
    filePath?: string;
    query?: string;
    limit?: number;
    offset?: number;
}
/**
 * Relationship search criteria
 */
export interface RelationshipSearchCriteria {
    id?: string | string[];
    type?: string | string[];
    sourceId?: string | string[];
    targetId?: string | string[];
    language?: string | string[];
    metadata?: Record<string, any>;
    limit?: number;
    offset?: number;
}
/**
 * File component interface
 */
export interface IFileComponent extends IComponent {
    type: ComponentType.FILE;
    size: number;
    extension: string;
    modificationTime: number;
    lineCount: number;
    hash?: string;
}
/**
 * Class component interface
 */
export interface IClassComponent extends IComponent {
    type: ComponentType.CLASS;
    isAbstract?: boolean;
    isFinal?: boolean;
    isStatic?: boolean;
    accessModifier: 'public' | 'private' | 'protected' | 'package';
    superClass?: string;
    interfaces?: string[];
    implementedInterfaces?: string[];
    decorators?: string[];
    generics?: string[];
    documentation?: string;
}
/**
 * Function component interface
 */
export interface IFunctionComponent extends IComponent {
    type: ComponentType.FUNCTION;
    parameters: Parameter[];
    returnType?: string;
    isAsync?: boolean;
    isGenerator?: boolean;
    isArrow?: boolean;
    accessModifier?: 'public' | 'private' | 'protected' | 'package';
    decorators?: string[];
    documentation?: string;
}
/**
 * Method component interface
 */
export interface IMethodComponent extends IComponent {
    type: ComponentType.METHOD;
    parameters: Parameter[];
    returnType?: string;
    isAsync?: boolean;
    isGenerator?: boolean;
    isStatic?: boolean;
    isAbstract?: boolean;
    isFinal?: boolean;
    isConstructor?: boolean;
    accessModifier: 'public' | 'private' | 'protected' | 'package';
    decorators?: string[];
    documentation?: string;
}
//# sourceMappingURL=interfaces.d.ts.map