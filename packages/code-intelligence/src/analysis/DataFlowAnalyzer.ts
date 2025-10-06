import { IRelationship, IComponent, RelationshipType } from '../code-analysis-types/index.js';

/**
 * Represents a data flow between components
 */
export interface DataFlow {
  sourceId: string;
  targetId: string;
  flowType: RelationshipType;
  variableName?: string;
  transformations?: string[];
  metadata?: Record<string, any>;
}

/**
 * Context for tracking data flow through a scope
 */
interface DataFlowContext {
  scopeId: string;
  variables: Map<string, VariableInfo>;
  parameters: Map<string, ParameterInfo>;
  returnValues: ReturnValueInfo[];
  fieldAccesses: FieldAccessInfo[];
}

interface VariableInfo {
  name: string;
  componentId: string;
  assignments: string[];
  usages: string[];
  transformations: string[];
}

interface ParameterInfo {
  name: string;
  position: number;
  componentId: string;
  passedFrom?: string;
  passedTo?: string[];
}

interface ReturnValueInfo {
  componentId: string;
  expression: string;
  usedBy?: string[];
  derivesFrom?: string[];
}

interface FieldAccessInfo {
  fieldName: string;
  componentId: string;
  accessType: 'read' | 'write' | 'modify';
  accessedBy: string;
}

/**
 * Service for tracking semantic data flow relationships through code
 */
export class DataFlowAnalyzer {
  private contexts: Map<string, DataFlowContext> = new Map();
  private relationships: IRelationship[] = [];
  private currentContext: DataFlowContext | null = null;

  /**
   * Start a new data flow analysis context
   */
  public startContext(scopeId: string): void {
    const context: DataFlowContext = {
      scopeId,
      variables: new Map(),
      parameters: new Map(),
      returnValues: [],
      fieldAccesses: []
    };
    this.contexts.set(scopeId, context);
    this.currentContext = context;
  }

  /**
   * End the current context and generate relationships
   */
  public endContext(): IRelationship[] {
    if (!this.currentContext) return [];

    const relationships = this.generateRelationships(this.currentContext);
    this.currentContext = null;
    return relationships;
  }

  /**
   * Track a variable assignment or declaration
   */
  public trackVariable(
    variableName: string,
    componentId: string,
    value?: string,
    derivesFrom?: string[]
  ): void {
    if (!this.currentContext) return;

    let varInfo = this.currentContext.variables.get(variableName);
    if (!varInfo) {
      varInfo = {
        name: variableName,
        componentId,
        assignments: [],
        usages: [],
        transformations: []
      };
      this.currentContext.variables.set(variableName, varInfo);
    }

    if (value) {
      varInfo.assignments.push(value);
    }

    // Track data derivation
    if (derivesFrom) {
      derivesFrom.forEach(sourceVar => {
        this.addRelationship({
          id: `${componentId}-derives-${sourceVar}`,
          sourceId: sourceVar,
          targetId: componentId,
          type: RelationshipType.DERIVES_FROM,
          metadata: {
            variableName,
            transformation: value
          }
        });
      });
    }
  }

  /**
   * Track function parameter passing
   */
  public trackParameter(
    paramName: string,
    position: number,
    functionId: string,
    callerId?: string
  ): void {
    if (!this.currentContext) return;

    const paramInfo: ParameterInfo = {
      name: paramName,
      position,
      componentId: functionId,
      passedFrom: callerId,
      passedTo: []
    };

    this.currentContext.parameters.set(`${functionId}-${paramName}`, paramInfo);

    if (callerId) {
      this.addRelationship({
        id: `${callerId}-passes-${functionId}-${paramName}`,
        sourceId: callerId,
        targetId: functionId,
        type: RelationshipType.PASSES_TO,
        metadata: {
          parameterName: paramName,
          position
        }
      });
    }
  }

  /**
   * Track return value from a function
   */
  public trackReturnValue(
    functionId: string,
    expression: string,
    usedBy?: string[],
    derivesFrom?: string[]
  ): void {
    if (!this.currentContext) return;

    const returnInfo: ReturnValueInfo = {
      componentId: functionId,
      expression,
      usedBy,
      derivesFrom
    };

    this.currentContext.returnValues.push(returnInfo);

    // Track where return value is used
    if (usedBy) {
      usedBy.forEach(userId => {
        this.addRelationship({
          id: `${functionId}-returns-${userId}`,
          sourceId: functionId,
          targetId: userId,
          type: RelationshipType.RETURNS_FROM,
          metadata: {
            returnExpression: expression
          }
        });
      });
    }

    // Track what the return value derives from
    if (derivesFrom) {
      derivesFrom.forEach(sourceId => {
        this.addRelationship({
          id: `${functionId}-derives-${sourceId}`,
          sourceId: sourceId,
          targetId: functionId,
          type: RelationshipType.DERIVES_FROM,
          metadata: {
            through: 'return',
            expression
          }
        });
      });
    }
  }

  /**
   * Track field or property access
   */
  public trackFieldAccess(
    fieldName: string,
    componentId: string,
    accessedBy: string,
    accessType: 'read' | 'write' | 'modify' = 'read'
  ): void {
    if (!this.currentContext) return;

    const accessInfo: FieldAccessInfo = {
      fieldName,
      componentId,
      accessType,
      accessedBy
    };

    this.currentContext.fieldAccesses.push(accessInfo);

    // Generate appropriate relationship based on access type
    const relationType = accessType === 'read'
      ? RelationshipType.READS_FROM
      : accessType === 'write'
      ? RelationshipType.WRITES_TO
      : RelationshipType.MODIFIES;

    this.addRelationship({
      id: `${accessedBy}-${accessType}-${componentId}-${fieldName}`,
      sourceId: accessedBy,
      targetId: componentId,
      type: relationType,
      metadata: {
        fieldName,
        accessType
      }
    });
  }

  /**
   * Track data transformation (map, filter, reduce, etc.)
   */
  public trackTransformation(
    sourceId: string,
    targetId: string,
    transformationType: string,
    metadata?: Record<string, any>
  ): void {
    this.addRelationship({
      id: `${sourceId}-transforms-${targetId}`,
      sourceId: sourceId,
      targetId: targetId,
      type: RelationshipType.TRANSFORMS_DATA,
      metadata: {
        transformationType,
        ...metadata
      }
    });
  }

  /**
   * Track async/await relationships
   */
  public trackAsync(
    awaiterId: string,
    promiseId: string,
    metadata?: Record<string, any>
  ): void {
    this.addRelationship({
      id: `${awaiterId}-awaits-${promiseId}`,
      sourceId: awaiterId,
      targetId: promiseId,
      type: RelationshipType.AWAITS,
      metadata: metadata || {}
    });
  }

  /**
   * Track observable/event emitter patterns
   */
  public trackObservable(
    observerId: string,
    subjectId: string,
    eventName?: string
  ): void {
    this.addRelationship({
      id: `${observerId}-observes-${subjectId}`,
      sourceId: observerId,
      targetId: subjectId,
      type: RelationshipType.OBSERVES,
      metadata: {
        eventName
      }
    });
  }

  /**
   * Get all tracked relationships
   */
  public getRelationships(): IRelationship[] {
    return [...this.relationships];
  }

  /**
   * Clear all tracked data
   */
  public clear(): void {
    this.contexts.clear();
    this.relationships = [];
    this.currentContext = null;
  }

  /**
   * Add a relationship to the collection
   */
  private addRelationship(relationship: IRelationship): void {
    // Check for duplicates
    const exists = this.relationships.some(r =>
      r.sourceId === relationship.sourceId &&
      r.targetId === relationship.targetId &&
      r.type === relationship.type
    );

    if (!exists) {
      this.relationships.push(relationship);
    }
  }

  /**
   * Generate relationships from a context
   */
  private generateRelationships(context: DataFlowContext): IRelationship[] {
    const relationships: IRelationship[] = [];

    // Generate variable flow relationships
    context.variables.forEach(varInfo => {
      varInfo.usages.forEach(usageId => {
        relationships.push({
          id: `${varInfo.componentId}-var-${varInfo.name}-${usageId}`,
          sourceId: varInfo.componentId,
          targetId: usageId,
          type: RelationshipType.USES_FIELD,
          metadata: {
            variableName: varInfo.name,
            assignments: varInfo.assignments
          }
        });
      });
    });

    // Generate parameter flow relationships
    context.parameters.forEach(paramInfo => {
      if (paramInfo.passedTo) {
        paramInfo.passedTo.forEach(targetId => {
          relationships.push({
            id: `${paramInfo.componentId}-param-${paramInfo.name}-${targetId}`,
            sourceId: paramInfo.componentId,
            targetId: targetId,
            type: RelationshipType.PASSES_TO,
            metadata: {
              parameterName: paramInfo.name,
              position: paramInfo.position
            }
          });
        });
      }
    });

    return relationships;
  }

  /**
   * Analyze a component for high-level patterns
   */
  public analyzePatterns(component: IComponent): string[] {
    const patterns: string[] = [];

    // Check for factory pattern
    if (component.name?.includes('Factory') || component.name?.includes('create')) {
      patterns.push('Factory');
    }

    // Check for observer pattern
    if (component.name?.includes('Observer') || component.name?.includes('subscribe')) {
      patterns.push('Observer');
    }

    // Check for singleton pattern
    if (component.name?.includes('getInstance') || component.name?.includes('Singleton')) {
      patterns.push('Singleton');
    }

    // Check for builder pattern
    if (component.name?.includes('Builder') || component.name?.includes('build')) {
      patterns.push('Builder');
    }

    return patterns;
  }
}