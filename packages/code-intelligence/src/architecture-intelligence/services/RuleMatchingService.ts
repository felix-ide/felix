/**
 * Rule Matching Service - Intelligently matches rules to entities using knowledge graph data
 */

import { 
  RuleUtils, 
  type IRule, 
  type ApplicableRule, 
  type RuleApplicationContext,
  type IComponent,
  type IRelationship
} from '../../code-analysis-types/index.js';
import { TriggerFactory } from '../../code-analysis-types/index.js';

/**
 * Rule storage interface for dependency injection
 */
export interface IRuleStorage {
  getRules(options?: { includeInactive?: boolean; ruleTypes?: string[] }): Promise<IRule[]>;
  getRuleById(id: string): Promise<IRule | null>;
}

/**
 * Configuration for rule matching
 */
export interface RuleMatchingConfig {
  cacheExpiry?: number;
  defaultMinConfidence?: number;
  maxResults?: number;
}

/**
 * Options for rule matching
 */
export interface RuleMatchingOptions {
  includeInactive?: boolean;
  minConfidence?: number;
  maxResults?: number;
  ruleTypes?: string[];
  priorityThreshold?: number;
}

/**
 * Context for rule matching including component relationships
 */
export interface RuleMatchResult {
  rule: IRule;
  confidence: number;
  matchedTriggers: string[];
  contextFactors: {
    hasRelationships: boolean;
    complexity: number;
    fileSize: number;
    dependencies: number;
  };
}

/**
 * Extended context for rule matching
 */
export interface MatchingContext extends RuleApplicationContext {
  component?: IComponent;
  relationships?: IRelationship[];
  fileMetrics?: {
    size: number;
    complexity: number;
    changeFrequency: number;
  };
  dependencies?: string[];
}

/**
 * Service for intelligent rule matching using semantic analysis
 */
export class RuleMatchingService {
  private ruleStorage: IRuleStorage;
  private config: Required<RuleMatchingConfig>;
  private ruleCache: Map<string, IRule[]> = new Map();
  private lastCacheUpdate: number = 0;

  constructor(
    ruleStorage: IRuleStorage,
    config: RuleMatchingConfig = {}
  ) {
    this.ruleStorage = ruleStorage;
    this.config = {
      cacheExpiry: 60000, // 1 minute cache
      defaultMinConfidence: 0.5,
      maxResults: 10,
      ...config
    };
  }

  /**
   * Find applicable rules for a given component and context
   */
  async findApplicableRules(
    component: IComponent,
    context: MatchingContext,
    options: RuleMatchingOptions = {}
  ): Promise<RuleMatchResult[]> {
    const rules = await this.getRules(options);
    const applicable: RuleMatchResult[] = [];

    for (const rule of rules) {
      if (!rule.active && !options.includeInactive) {
        continue;
      }

      const matchResult = await this.evaluateRuleMatch(component, rule, context);
      
      if (matchResult.confidence >= (options.minConfidence || this.config.defaultMinConfidence)) {
        applicable.push(matchResult);
      }
    }

    // Sort by confidence and priority
    applicable.sort((a, b) => {
      const priorityDiff = (b.rule.priority || 5) - (a.rule.priority || 5);
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

    // Apply result limit
    const maxResults = options.maxResults || this.config.maxResults;
    return applicable.slice(0, maxResults);
  }

  /**
   * Evaluate if a rule matches a component
   */
  private async evaluateRuleMatch(
    component: IComponent,
    rule: IRule,
    context: MatchingContext
  ): Promise<RuleMatchResult> {
    let confidence = 0;
    const matchedTriggers: string[] = [];
    const contextFactors = {
      hasRelationships: (context.relationships?.length || 0) > 0,
      complexity: this.calculateComplexity(component, context),
      fileSize: context.fileMetrics?.size || 0,
      dependencies: context.dependencies?.length || 0
    };

    // Evaluate trigger patterns
    if (rule.trigger_patterns) {
      confidence += this.evaluateTriggerPatterns(component, rule.trigger_patterns, matchedTriggers);
    }

    // Evaluate semantic triggers
    if (rule.semantic_triggers) {
      confidence += this.evaluateSemanticTriggers(component, rule.semantic_triggers, context, matchedTriggers);
    }

    // Evaluate context conditions
    if (rule.context_conditions) {
      confidence += this.evaluateContextConditions(component, rule.context_conditions, context);
    }

    // Apply confidence adjustments based on context
    confidence = this.adjustConfidenceForContext(confidence, contextFactors, rule);

    return {
      rule,
      confidence: Math.min(1.0, Math.max(0.0, confidence)),
      matchedTriggers,
      contextFactors
    };
  }

  /**
   * Evaluate trigger patterns (file patterns, component types, etc.)
   */
  private evaluateTriggerPatterns(
    component: IComponent,
    triggerPatterns: any,
    matchedTriggers: string[]
  ): number {
    let score = 0;

    // Component type matching
    if (triggerPatterns.components && triggerPatterns.components.includes(component.type)) {
      score += 0.3;
      matchedTriggers.push(`component_type:${component.type}`);
    }

    // File pattern matching
    if (triggerPatterns.files) {
      for (const pattern of triggerPatterns.files) {
        if (this.matchesPattern(component.filePath, pattern)) {
          score += 0.2;
          matchedTriggers.push(`file_pattern:${pattern}`);
        }
      }
    }

    // Language matching
    if (triggerPatterns.languages && triggerPatterns.languages.includes(component.language)) {
      score += 0.1;
      matchedTriggers.push(`language:${component.language}`);
    }

    return score;
  }

  /**
   * Evaluate semantic triggers using component content and relationships
   */
  private evaluateSemanticTriggers(
    component: IComponent,
    semanticTriggers: any,
    context: MatchingContext,
    matchedTriggers: string[]
  ): number {
    let score = 0;

    // Pattern matching in component name and code
    if (semanticTriggers.patterns) {
      for (const pattern of semanticTriggers.patterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(component.name) || (component.code && regex.test(component.code))) {
          score += 0.2;
          matchedTriggers.push(`semantic_pattern:${pattern}`);
        }
      }
    }

    // Architectural layer detection
    if (semanticTriggers.architectural_layers) {
      const detectedLayer = this.detectArchitecturalLayer(component, context);
      if (detectedLayer && semanticTriggers.architectural_layers.includes(detectedLayer)) {
        score += 0.25;
        matchedTriggers.push(`architectural_layer:${detectedLayer}`);
      }
    }

    // Business domain detection
    if (semanticTriggers.business_domains) {
      const detectedDomain = this.detectBusinessDomain(component, context);
      if (detectedDomain && semanticTriggers.business_domains.includes(detectedDomain)) {
        score += 0.15;
        matchedTriggers.push(`business_domain:${detectedDomain}`);
      }
    }

    return score;
  }

  /**
   * Evaluate context conditions
   */
  private evaluateContextConditions(
    component: IComponent,
    contextConditions: any,
    context: MatchingContext
  ): number {
    let score = 0;

    // File size conditions
    if (contextConditions.min_file_size && context.fileMetrics?.size) {
      if (context.fileMetrics.size >= contextConditions.min_file_size) {
        score += 0.1;
      }
    }

    if (contextConditions.max_file_size && context.fileMetrics?.size) {
      if (context.fileMetrics.size <= contextConditions.max_file_size) {
        score += 0.1;
      }
    }

    // Complexity conditions
    const complexity = this.calculateComplexity(component, context);
    if (contextConditions.min_complexity && complexity >= contextConditions.min_complexity) {
      score += 0.1;
    }

    if (contextConditions.max_complexity && complexity <= contextConditions.max_complexity) {
      score += 0.1;
    }

    // Relationship conditions
    if (contextConditions.has_relationships && context.relationships && context.relationships.length > 0) {
      score += 0.1;
    }

    return score;
  }

  /**
   * Adjust confidence based on context factors
   */
  private adjustConfidenceForContext(
    baseConfidence: number,
    contextFactors: any,
    rule: IRule
  ): number {
    let adjusted = baseConfidence;

    // Boost confidence for rules with higher priority
    if (rule.priority && rule.priority > 5) {
      adjusted *= 1.1;
    }

    // Reduce confidence for very complex components (might need specialized rules)
    if (contextFactors.complexity > 10) {
      adjusted *= 0.9;
    }

    // Boost confidence for components with relationships (more context available)
    if (contextFactors.hasRelationships) {
      adjusted *= 1.05;
    }

    return adjusted;
  }

  /**
   * Calculate complexity score for a component
   */
  private calculateComplexity(component: IComponent, context: MatchingContext): number {
    let complexity = 0;

    // Base complexity from component type
    const typeComplexity = {
      'class': 3,
      'function': 2,
      'method': 2,
      'interface': 1,
      'variable': 1,
      'property': 1
    };
    complexity += typeComplexity[component.type as keyof typeof typeComplexity] || 1;

    // Add complexity from code length
    if (component.code) {
      complexity += Math.min(5, component.code.split('\n').length / 10);
    }

    // Add complexity from relationships
    if (context.relationships) {
      complexity += Math.min(3, context.relationships.length / 5);
    }

    // Add complexity from file metrics
    if (context.fileMetrics?.complexity) {
      complexity += Math.min(4, context.fileMetrics.complexity / 10);
    }

    return Math.round(complexity);
  }

  /**
   * Detect architectural layer from component characteristics
   */
  private detectArchitecturalLayer(component: IComponent, context: MatchingContext): string | null {
    const path = component.filePath.toLowerCase();
    const name = component.name.toLowerCase();

    if (path.includes('controller') || name.includes('controller')) return 'controller';
    if (path.includes('service') || name.includes('service')) return 'service';
    if (path.includes('repository') || path.includes('dao') || name.includes('repository')) return 'data';
    if (path.includes('model') || path.includes('entity') || name.includes('model')) return 'model';
    if (path.includes('view') || path.includes('component') || name.includes('view')) return 'presentation';
    if (path.includes('middleware') || name.includes('middleware')) return 'middleware';
    if (path.includes('util') || path.includes('helper') || name.includes('util')) return 'utility';

    return null;
  }

  /**
   * Detect business domain from component characteristics
   */
  private detectBusinessDomain(component: IComponent, context: MatchingContext): string | null {
    const path = component.filePath.toLowerCase();
    const name = component.name.toLowerCase();
    const code = component.code?.toLowerCase() || '';

    const domains = {
      'auth': ['auth', 'login', 'user', 'session', 'token', 'security'],
      'payment': ['payment', 'billing', 'invoice', 'transaction', 'money'],
      'notification': ['notification', 'email', 'message', 'alert', 'notify'],
      'analytics': ['analytics', 'metrics', 'tracking', 'stats', 'report'],
      'admin': ['admin', 'management', 'dashboard', 'configuration'],
      'api': ['api', 'endpoint', 'route', 'controller', 'rest'],
      'data': ['database', 'storage', 'persistence', 'repository', 'dao']
    };

    for (const [domain, keywords] of Object.entries(domains)) {
      if (keywords.some(keyword => 
        path.includes(keyword) || name.includes(keyword) || code.includes(keyword)
      )) {
        return domain;
      }
    }

    return null;
  }

  /**
   * Check if a string matches a pattern (supports basic wildcards)
   */
  private matchesPattern(str: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(str);
  }

  /**
   * Get rules with caching
   */
  private async getRules(options: RuleMatchingOptions = {}): Promise<IRule[]> {
    const cacheKey = JSON.stringify(options);
    const now = Date.now();

    // Check cache
    if (this.ruleCache.has(cacheKey) && 
        (now - this.lastCacheUpdate) < this.config.cacheExpiry) {
      return this.ruleCache.get(cacheKey)!;
    }

    // Fetch from storage
    const rules = await this.ruleStorage.getRules({
      includeInactive: options.includeInactive,
      ruleTypes: options.ruleTypes
    });

    // Update cache
    this.ruleCache.set(cacheKey, rules);
    this.lastCacheUpdate = now;

    return rules;
  }

  /**
   * Clear the rule cache (useful when rules are modified)
   */
  clearCache(): void {
    this.ruleCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Get matching statistics for debugging
   */
  async getMatchingStats(
    components: IComponent[],
    context: MatchingContext,
    options: RuleMatchingOptions = {}
  ): Promise<{
    totalRules: number;
    matchedRules: number;
    averageConfidence: number;
    topMatches: RuleMatchResult[];
  }> {
    const rules = await this.getRules(options);
    let totalMatched = 0;
    let totalConfidence = 0;
    const allMatches: RuleMatchResult[] = [];

    for (const component of components) {
      const matches = await this.findApplicableRules(component, context, options);
      if (matches.length > 0) {
        totalMatched++;
        if (matches[0]) totalConfidence += matches[0].confidence; // Use best match
        allMatches.push(...matches);
      }
    }

    // Sort all matches by confidence
    allMatches.sort((a, b) => b.confidence - a.confidence);

    return {
      totalRules: rules.length,
      matchedRules: totalMatched,
      averageConfidence: totalMatched > 0 ? totalConfidence / totalMatched : 0,
      topMatches: allMatches.slice(0, 5)
    };
  }
}