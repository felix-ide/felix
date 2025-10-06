/**
 * Skeleton Generator
 * 
 * Generates structural skeletons of classes and files showing:
 * - Class signatures with visibility modifiers
 * - Property declarations with types and line numbers
 * - Method signatures with parameters, return types, and line numbers
 * - Interface members with line numbers
 * - Enum values with line numbers
 */

import { IComponent, ComponentType } from '../../code-analysis-types/index.js';

export interface SkeletonMember {
  type: 'property' | 'method' | 'constructor' | 'enum-value';
  name: string;
  signature: string;
  startLine: number;
  endLine: number;
  visibility?: string;
  modifiers?: string[];
}

export interface ClassSkeleton {
  type: 'class' | 'interface' | 'enum';
  name: string;
  signature: string;
  startLine: number;
  endLine: number;
  members: SkeletonMember[];
}

export interface FileSkeleton {
  filePath: string;
  classes: ClassSkeleton[];
  functions: SkeletonMember[];
  variables: SkeletonMember[];
}

export class SkeletonGenerator {
  /**
   * Generate skeleton for a class component
   */
  generateClassSkeleton(classComponent: IComponent, members: IComponent[]): ClassSkeleton {
    const metadata = classComponent.metadata || {};
    
    // Build class signature
    let signature = '';
    if (metadata.visibility) signature += metadata.visibility + ' ';
    if (metadata.isAbstract) signature += 'abstract ';
    if (metadata.isFinal) signature += 'final ';
    if (metadata.isStatic) signature += 'static ';
    
    signature += `${classComponent.type} ${classComponent.name}`;
    
    // Add generics
    if (metadata.generics && metadata.generics.length > 0) {
      signature += `<${metadata.generics.join(', ')}>`;
    }
    
    // Add extends
    if (metadata.extends) {
      signature += ` extends ${metadata.extends}`;
    }
    
    // Add implements
    if (metadata.implements && metadata.implements.length > 0) {
      signature += ` implements ${metadata.implements.join(', ')}`;
    }
    
    // Process members
    const skeletonMembers: SkeletonMember[] = [];
    
    for (const member of members) {
      if (member.filePath !== classComponent.filePath) continue;
      
      // Check if member belongs to this class
      const memberClassContext = member.id.split(':')[0];
      const classContext = classComponent.name;
      
      if (!member.id.includes(classContext)) continue;
      
      const memberSkeleton = this.generateMemberSkeleton(member);
      if (memberSkeleton) {
        skeletonMembers.push(memberSkeleton);
      }
    }
    
    // Sort members by line number
    skeletonMembers.sort((a, b) => a.startLine - b.startLine);
    
    return {
      type: classComponent.type as 'class' | 'interface' | 'enum',
      name: classComponent.name,
      signature,
      startLine: classComponent.location.startLine,
      endLine: classComponent.location.endLine,
      members: skeletonMembers
    };
  }
  
  /**
   * Generate skeleton for a member component
   */
  private generateMemberSkeleton(component: IComponent): SkeletonMember | null {
    const metadata = component.metadata || {};
    let signature = '';
    let memberType: 'property' | 'method' | 'constructor' | 'enum-value';
    
    switch (component.type) {
      case ComponentType.PROPERTY:
        memberType = 'property';
        // Build property signature
        if (metadata.visibility || metadata.accessModifier) {
          signature += (metadata.visibility || metadata.accessModifier) + ' ';
        }
        if (metadata.isStatic) signature += 'static ';
        if (metadata.isReadonly) signature += 'readonly ';
        
        signature += component.name;
        
        if (metadata.propertyType || metadata.type) {
          signature += `: ${metadata.propertyType || metadata.type}`;
        }
        break;
        
      case ComponentType.METHOD:
      case ComponentType.FUNCTION:
        memberType = metadata.isConstructor ? 'constructor' : 'method';
        // Build method signature
        if (metadata.visibility || metadata.accessModifier) {
          signature += (metadata.visibility || metadata.accessModifier) + ' ';
        }
        if (metadata.isStatic) signature += 'static ';
        if (metadata.isAbstract) signature += 'abstract ';
        if (metadata.isAsync) signature += 'async ';
        
        signature += component.name;
        
        // Add parameters
        signature += '(';
        // Parameters are always stored in metadata by all parsers
        if (metadata.parameters && Array.isArray(metadata.parameters)) {
          signature += metadata.parameters.map((p: any) => {
            let paramStr = p.name;
            if (p.type) paramStr += `: ${p.type}`;
            if (p.isOptional || p.default) paramStr += '?';
            return paramStr;
          }).join(', ');
        }
        signature += ')';
        
        // Add return type
        if (metadata.returnType) {
          signature += `: ${metadata.returnType}`;
        }
        break;
        
      case ComponentType.VARIABLE:
        if (component.name.startsWith('ENUM_VALUE_')) {
          memberType = 'enum-value';
          signature = component.name.replace('ENUM_VALUE_', '');
          if (metadata.value) {
            signature += ` = ${metadata.value}`;
          }
        } else {
          return null; // Skip regular variables in class skeleton
        }
        break;
        
      default:
        return null;
    }
    
    return {
      type: memberType,
      name: component.name,
      signature,
      startLine: component.location.startLine,
      endLine: component.location.endLine,
      visibility: metadata.visibility || metadata.accessModifier,
      modifiers: this.extractModifiers(metadata)
    };
  }
  
  /**
   * Generate skeleton for an entire file
   */
  generateFileSkeleton(components: IComponent[]): FileSkeleton {
    const fileComponent = components.find(c => c.type === ComponentType.FILE);
    if (!fileComponent) {
      throw new Error('No file component found');
    }
    
    const classes: ClassSkeleton[] = [];
    const functions: SkeletonMember[] = [];
    const variables: SkeletonMember[] = [];
    
    // Find all class-like components
    const classComponents = components.filter(c => 
      c.type === ComponentType.CLASS || 
      c.type === ComponentType.INTERFACE || 
      c.type === ComponentType.ENUM
    );
    
    // Generate skeleton for each class
    for (const classComp of classComponents) {
      const skeleton = this.generateClassSkeleton(classComp, components);
      classes.push(skeleton);
    }
    
    // Find standalone functions
    const functionComponents = components.filter(c => 
      c.type === ComponentType.FUNCTION &&
      !c.id.includes(':method:') // Not a method
    );
    
    for (const func of functionComponents) {
      const skeleton = this.generateMemberSkeleton(func);
      if (skeleton) {
        functions.push(skeleton);
      }
    }
    
    // Find module-level variables
    const variableComponents = components.filter(c => 
      c.type === ComponentType.VARIABLE &&
      !c.id.includes(':property:') && // Not a property
      !c.name.startsWith('ENUM_VALUE_') // Not an enum value
    );
    
    for (const variable of variableComponents) {
      const metadata = variable.metadata || {};
      let signature = '';
      
      if (metadata.isConst) signature += 'const ';
      else if (metadata.kind) signature += metadata.kind + ' ';
      
      signature += variable.name;
      
      if (metadata.type || metadata.variableType) {
        signature += `: ${metadata.type || metadata.variableType}`;
      }
      
      variables.push({
        type: 'property',
        name: variable.name,
        signature,
        startLine: variable.location.startLine,
        endLine: variable.location.endLine
      });
    }
    
    return {
      filePath: fileComponent.filePath,
      classes,
      functions,
      variables
    };
  }
  
  /**
   * Format skeleton as string
   */
  formatSkeleton(skeleton: ClassSkeleton | FileSkeleton): string {
    if ('classes' in skeleton) {
      return this.formatFileSkeleton(skeleton);
    } else {
      return this.formatClassSkeleton(skeleton);
    }
  }
  
  private formatClassSkeleton(skeleton: ClassSkeleton, indent = ''): string {
    let result = `${indent}${skeleton.signature} { // lines ${skeleton.startLine}-${skeleton.endLine}\n`;
    
    for (const member of skeleton.members) {
      result += `${indent}  ${member.signature} // lines ${member.startLine}-${member.endLine}\n`;
    }
    
    result += `${indent}}\n`;
    
    return result;
  }
  
  private formatFileSkeleton(skeleton: FileSkeleton): string {
    let result = `File: ${skeleton.filePath}\n\n`;
    
    // Format classes
    if (skeleton.classes.length > 0) {
      result += 'Classes:\n';
      for (const cls of skeleton.classes) {
        result += this.formatClassSkeleton(cls, '  ');
        result += '\n';
      }
    }
    
    // Format functions
    if (skeleton.functions.length > 0) {
      result += 'Functions:\n';
      for (const func of skeleton.functions) {
        result += `  ${func.signature} // lines ${func.startLine}-${func.endLine}\n`;
      }
      result += '\n';
    }
    
    // Format variables
    if (skeleton.variables.length > 0) {
      result += 'Variables:\n';
      for (const variable of skeleton.variables) {
        result += `  ${variable.signature} // lines ${variable.startLine}-${variable.endLine}\n`;
      }
      result += '\n';
    }
    
    return result;
  }
  
  private extractModifiers(metadata: any): string[] {
    const modifiers: string[] = [];
    
    if (metadata.isStatic) modifiers.push('static');
    if (metadata.isAbstract) modifiers.push('abstract');
    if (metadata.isFinal) modifiers.push('final');
    if (metadata.isAsync) modifiers.push('async');
    if (metadata.isReadonly) modifiers.push('readonly');
    if (metadata.isConst) modifiers.push('const');
    
    return modifiers;
  }
}