/**
 * Boolean Query Parser for multi-term search
 * 
 * Parses natural boolean syntax like:
 * - "storage AND update"
 * - "file AND (change OR modify)"
 * - "storage AND update AND NOT memory"
 */

export interface QueryNode {
  type: 'term' | 'and' | 'or' | 'not';
  value?: string;
  modifier?: QueryModifier | null;
  children?: QueryNode[];
}

export interface QueryModifier {
  type: 'exact' | 'like' | 'semantic' | 'lang' | 'type' | 'file';
  value: string;
}

export interface ParsedQuery {
  ast: QueryNode;
  terms: string[];
}

export class BooleanQueryParser {
  /**
   * Parse a boolean query string into an AST
   */
  parse(query: string): ParsedQuery {
    const tokens = this.tokenize(query);
    const ast = this.parseExpression(tokens, 0).node;
    const terms = this.extractTerms(ast);
    
    return { ast, terms };
  }

  /**
   * Tokenize the query string
   */
  private tokenize(query: string): string[] {
    // Handle quoted strings and modifiers like exact:"some text"
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < query.length; i++) {
      const char = query[i]!;
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        current += char;
        quoteChar = '';
      } else if (inQuotes) {
        current += char;
      } else if (char === '(' || char === ')') {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
        tokens.push(char);
      } else if (/\s/.test(char)) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      tokens.push(current.trim());
    }
    
    return tokens.filter(token => token.length > 0);
  }

  /**
   * Parse expression with precedence
   * OR has lowest precedence, AND has higher, NOT has highest
   */
  private parseExpression(tokens: string[], index: number): { node: QueryNode; nextIndex: number } {
    return this.parseOr(tokens, index);
  }

  /**
   * Parse OR expressions (lowest precedence)
   */
  private parseOr(tokens: string[], index: number): { node: QueryNode; nextIndex: number } {
    let result = this.parseAnd(tokens, index);
    
    while (result.nextIndex < tokens.length && 
           tokens[result.nextIndex] && 
           tokens[result.nextIndex]!.toLowerCase() === 'or') {
      const rightResult = this.parseAnd(tokens, result.nextIndex + 1);
      
      result = {
        node: {
          type: 'or',
          children: [result.node, rightResult.node]
        },
        nextIndex: rightResult.nextIndex
      };
    }
    
    return result;
  }

  /**
   * Parse AND expressions (medium precedence)
   */
  private parseAnd(tokens: string[], index: number): { node: QueryNode; nextIndex: number } {
    let result = this.parseNot(tokens, index);
    
    while (result.nextIndex < tokens.length) {
      const nextToken = tokens[result.nextIndex];
      if (!nextToken) break;
      const nextTokenLower = nextToken.toLowerCase();
      
      // Explicit AND or implicit (no operator between terms)
      if (nextTokenLower === 'and') {
        const rightResult = this.parseNot(tokens, result.nextIndex + 1);
        result = {
          node: {
            type: 'and',
            children: [result.node, rightResult.node]
          },
          nextIndex: rightResult.nextIndex
        };
      } else if (nextTokenLower !== 'or' && nextToken !== ')') {
        // Implicit AND (space between terms)
        const rightResult = this.parseNot(tokens, result.nextIndex);
        result = {
          node: {
            type: 'and',
            children: [result.node, rightResult.node]
          },
          nextIndex: rightResult.nextIndex
        };
      } else {
        break;
      }
    }
    
    return result;
  }

  /**
   * Parse NOT expressions (highest precedence)
   */
  private parseNot(tokens: string[], index: number): { node: QueryNode; nextIndex: number } {
    if (index >= tokens.length) {
      throw new Error('Unexpected end of query');
    }
    
    const token = tokens[index]!.toLowerCase();
    
    if (token === 'not') {
      const result = this.parsePrimary(tokens, index + 1);
      return {
        node: {
          type: 'not',
          children: [result.node]
        },
        nextIndex: result.nextIndex
      };
    }
    
    return this.parsePrimary(tokens, index);
  }

  /**
   * Parse primary expressions (terms and parentheses)
   */
  private parsePrimary(tokens: string[], index: number): { node: QueryNode; nextIndex: number } {
    if (index >= tokens.length) {
      throw new Error('Unexpected end of query');
    }
    
    const token = tokens[index]!;
    
    if (token === '(') {
      const result = this.parseExpression(tokens, index + 1);
      
      if (result.nextIndex >= tokens.length || tokens[result.nextIndex] !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      
      return {
        node: result.node,
        nextIndex: result.nextIndex + 1
      };
    }
    
    // Regular term
    if (this.isOperator(token)) {
      throw new Error(`Unexpected operator: ${token}`);
    }
    
    // Parse modifiers like exact:"search term" or lang:typescript
    const modifier = this.parseModifier(token);
    
    return {
      node: {
        type: 'term',
        value: modifier ? modifier.value : token.replace(/^["']|["']$/g, ''),
        modifier: modifier
      },
      nextIndex: index + 1
    };
  }

  /**
   * Check if token is an operator
   */
  private isOperator(token: string): boolean {
    const lower = token.toLowerCase();
    return lower === 'and' || lower === 'or' || lower === 'not';
  }

  /**
   * Parse modifier syntax like exact:"search term" or lang:typescript
   */
  private parseModifier(token: string): QueryModifier | null {
    const colonIndex = token.indexOf(':');
    if (colonIndex === -1) {
      return null;
    }
    
    const modifierType = token.substring(0, colonIndex).toLowerCase();
    const rawValue = token.substring(colonIndex + 1);
    
    // Valid modifier types
    const validModifiers = ['exact', 'like', 'semantic', 'lang', 'type', 'file'] as const;
    if (!validModifiers.includes(modifierType as any)) {
      return null;
    }
    
    // Remove quotes from value if present
    let value = rawValue;
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    return {
      type: modifierType as QueryModifier['type'],
      value: value
    };
  }

  /**
   * Extract all unique terms from the AST
   */
  private extractTerms(node: QueryNode): string[] {
    const terms = new Set<string>();
    
    const traverse = (n: QueryNode) => {
      if (n.type === 'term' && n.value) {
        terms.add(n.value);
      } else if (n.children) {
        n.children.forEach(traverse);
      }
    };
    
    traverse(node);
    return Array.from(terms);
  }

  /**
   * Evaluate the AST against a set of matched terms
   */
  evaluateQuery(ast: QueryNode, matchedTerms: Set<string>): boolean {
    switch (ast.type) {
      case 'term':
        return ast.value ? matchedTerms.has(ast.value) : false;
        
      case 'and':
        return ast.children?.every(child => this.evaluateQuery(child, matchedTerms)) ?? false;
        
      case 'or':
        return ast.children?.some(child => this.evaluateQuery(child, matchedTerms)) ?? false;
        
      case 'not':
        return ast.children && ast.children[0] ? !this.evaluateQuery(ast.children[0], matchedTerms) : false;
        
      default:
        return false;
    }
  }
}