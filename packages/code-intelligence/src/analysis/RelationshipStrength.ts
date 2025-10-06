/**
 * RelationshipStrength - Calculate relationship importance based on multiple factors
 *
 * Strength is calculated using:
 * - Usage frequency (how often the relationship is traversed)
 * - Proximity (how close the components are in the code)
 * - Semantic importance (type of relationship)
 * - Recency (when it was last accessed)
 */

import { IRelationship, IComponent, RelationshipType } from '../code-analysis-types/index.js';

/**
 * Strength factors for calculating relationship importance
 */
export interface StrengthFactors {
  usageCount?: number;
  proximity?: number;
  semanticWeight?: number;
  recencyScore?: number;
  lastAccessed?: Date;
}

/**
 * Calculated strength result
 */
export interface StrengthResult {
  strength: number; // 0.0 to 1.0
  factors: StrengthFactors;
  explanation: string;
}

/**
 * Semantic weight for different relationship types
 * Higher weights indicate more important relationships
 */
const SEMANTIC_WEIGHTS: Record<string, number> = {
  // Core structural relationships (highest importance)
  [RelationshipType.CALLS]: 0.9,
  [RelationshipType.CALLED_BY]: 0.9,
  [RelationshipType.EXTENDS]: 1.0,
  [RelationshipType.EXTENDED_BY]: 1.0,
  [RelationshipType.IMPLEMENTS]: 0.95,
  [RelationshipType.IMPLEMENTED_BY]: 0.95,

  // Data flow relationships (high importance)
  [RelationshipType.TRANSFORMS_DATA]: 0.85,
  [RelationshipType.PASSES_TO]: 0.8,
  [RelationshipType.RETURNS_FROM]: 0.8,
  [RelationshipType.MODIFIES]: 0.75,

  // Field access relationships (medium importance)
  [RelationshipType.USES_FIELD]: 0.7,
  [RelationshipType.READS_FROM]: 0.65,
  [RelationshipType.WRITES_TO]: 0.7,
  [RelationshipType.DERIVES_FROM]: 0.75,

  // Import relationships (lower importance, often structural)
  [RelationshipType.IMPORTS]: 0.5,
  [RelationshipType.IMPORTED_BY]: 0.5,
  [RelationshipType.DEPENDS_ON]: 0.5,

  // Async/pattern relationships (medium importance)
  [RelationshipType.AWAITS]: 0.7,
  [RelationshipType.YIELDS]: 0.65,
  [RelationshipType.OBSERVES]: 0.75,

  // Default for unknown types
  DEFAULT: 0.5,
};

/**
 * Calculate relationship strength based on multiple factors
 */
export class RelationshipStrengthCalculator {
  /**
   * Calculate strength for a single relationship
   */
  calculateStrength(
    relationship: IRelationship,
    sourceComponent?: IComponent,
    targetComponent?: IComponent,
    factors?: Partial<StrengthFactors>
  ): StrengthResult {
    const usageCount = factors?.usageCount || 0;
    const proximity = factors?.proximity !== undefined
      ? factors.proximity
      : this.calculateProximity(sourceComponent, targetComponent);
    const semanticWeight = SEMANTIC_WEIGHTS[relationship.type] || SEMANTIC_WEIGHTS.DEFAULT;
    const recencyScore = factors?.recencyScore !== undefined
      ? factors.recencyScore
      : this.calculateRecencyScore(factors?.lastAccessed);

    // Weighted combination of factors
    // - Semantic weight: 40% (type of relationship is most important)
    // - Usage frequency: 30% (how often it's used)
    // - Proximity: 20% (closer components are more related)
    // - Recency: 10% (recently accessed relationships are more relevant)
    const usageScore = this.normalizeUsageCount(usageCount);
    const strength =
      semanticWeight * 0.4 +
      usageScore * 0.3 +
      proximity * 0.2 +
      recencyScore * 0.1;

    const explanation = this.generateExplanation({
      usageCount,
      proximity,
      semanticWeight,
      recencyScore,
    }, relationship.type);

    return {
      strength: Math.min(1.0, Math.max(0.0, strength)),
      factors: {
        usageCount,
        proximity,
        semanticWeight,
        recencyScore,
        lastAccessed: factors?.lastAccessed,
      },
      explanation,
    };
  }

  /**
   * Calculate proximity score based on component locations
   * Returns 1.0 for same file, lower for different files/directories
   */
  private calculateProximity(
    source?: IComponent,
    target?: IComponent
  ): number {
    if (!source || !target) {
      return 0.5; // neutral if we don't have location info
    }

    const sourcePath = source.filePath || '';
    const targetPath = target.filePath || '';

    // Same file = highest proximity
    if (sourcePath === targetPath) {
      // Check line distance if available
      if (source.location && target.location) {
        const lineDistance = Math.abs(
          source.location.startLine - target.location.startLine
        );
        // Within 50 lines = very close (1.0)
        // Within 200 lines = close (0.8)
        // Within 500 lines = moderate (0.6)
        // Beyond 500 lines = lower (0.4)
        if (lineDistance < 50) return 1.0;
        if (lineDistance < 200) return 0.8;
        if (lineDistance < 500) return 0.6;
        return 0.4;
      }
      return 0.9; // same file but no line info
    }

    // Same directory = high proximity
    const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
    const targetDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
    if (sourceDir === targetDir) {
      return 0.7;
    }

    // Same parent directory = moderate proximity
    const sourceParent = sourceDir.substring(0, sourceDir.lastIndexOf('/'));
    const targetParent = targetDir.substring(0, targetDir.lastIndexOf('/'));
    if (sourceParent === targetParent) {
      return 0.5;
    }

    // Different directories = lower proximity
    return 0.3;
  }

  /**
   * Normalize usage count to 0.0-1.0 scale
   * Uses logarithmic scaling to handle wide range of values
   */
  private normalizeUsageCount(usageCount: number): number {
    if (usageCount === 0) return 0.0;
    if (usageCount === 1) return 0.3;
    if (usageCount < 5) return 0.5;
    if (usageCount < 10) return 0.7;
    if (usageCount < 50) return 0.85;
    return 1.0; // 50+ uses = maximum usage score
  }

  /**
   * Calculate recency score based on last accessed time
   * More recent = higher score
   */
  private calculateRecencyScore(lastAccessed?: Date): number {
    if (!lastAccessed) {
      return 0.5; // neutral if no access time
    }

    const now = Date.now();
    const accessTime = lastAccessed.getTime();
    const ageMs = now - accessTime;

    // Convert age to days
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    // Recency scoring:
    // < 1 day = 1.0
    // < 7 days = 0.8
    // < 30 days = 0.6
    // < 90 days = 0.4
    // older = 0.2
    if (ageDays < 1) return 1.0;
    if (ageDays < 7) return 0.8;
    if (ageDays < 30) return 0.6;
    if (ageDays < 90) return 0.4;
    return 0.2;
  }

  /**
   * Generate human-readable explanation of strength calculation
   */
  private generateExplanation(factors: StrengthFactors, relationshipType: string): string {
    const parts: string[] = [];

    // Semantic weight
    const semanticWeight = factors.semanticWeight || 0.5;
    if (semanticWeight >= 0.9) {
      parts.push('critical relationship type');
    } else if (semanticWeight >= 0.7) {
      parts.push('important relationship type');
    } else if (semanticWeight >= 0.5) {
      parts.push('standard relationship type');
    } else {
      parts.push('supporting relationship type');
    }

    // Usage
    const usage = factors.usageCount || 0;
    if (usage > 50) {
      parts.push('very frequently used');
    } else if (usage > 10) {
      parts.push('frequently used');
    } else if (usage > 5) {
      parts.push('moderately used');
    } else if (usage > 0) {
      parts.push('occasionally used');
    }

    // Proximity
    const proximity = factors.proximity || 0.5;
    if (proximity >= 0.9) {
      parts.push('same file/very close');
    } else if (proximity >= 0.7) {
      parts.push('same directory');
    } else if (proximity >= 0.5) {
      parts.push('nearby location');
    }

    // Recency
    const recency = factors.recencyScore || 0.5;
    if (recency >= 0.8) {
      parts.push('recently accessed');
    } else if (recency <= 0.3) {
      parts.push('not recently accessed');
    }

    return parts.join(', ');
  }

  /**
   * Batch calculate strengths for multiple relationships
   */
  calculateBatchStrengths(
    relationships: IRelationship[],
    components: Map<string, IComponent>,
    usageCounts?: Map<string, number>,
    lastAccessed?: Map<string, Date>
  ): Map<string, StrengthResult> {
    const results = new Map<string, StrengthResult>();

    for (const rel of relationships) {
      const source = components.get(rel.sourceId);
      const target = components.get(rel.targetId);

      const result = this.calculateStrength(
        rel,
        source,
        target,
        {
          usageCount: usageCounts?.get(rel.id) || 0,
          lastAccessed: lastAccessed?.get(rel.id),
        }
      );

      results.set(rel.id, result);
    }

    return results;
  }

  /**
   * Update strength based on new usage
   * Returns updated strength value
   */
  updateStrengthOnUsage(
    currentStrength: number,
    currentUsageCount: number
  ): number {
    const newUsageCount = currentUsageCount + 1;
    const usageScore = this.normalizeUsageCount(newUsageCount);

    // Recalculate with increased usage weight
    // Keep semantic and proximity weights, update usage and recency
    const semanticWeight = currentStrength * 0.4 / 0.4; // Extract semantic portion
    const newRecency = 1.0; // Just accessed

    return Math.min(1.0, semanticWeight * 0.4 + usageScore * 0.3 + 0.5 * 0.2 + newRecency * 0.1);
  }
}

/**
 * Default calculator instance
 */
export const strengthCalculator = new RelationshipStrengthCalculator();
