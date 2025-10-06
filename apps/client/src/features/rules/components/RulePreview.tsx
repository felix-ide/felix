import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@client/shared/ui/Card';
import { Button } from '@client/shared/ui/Button';
import { cn } from '@/utils/cn';
import { felixService } from '@/services/felixService';
import { useAppStore } from '@client/features/app-shell/state/appStore';
import { Eye, Target, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';
import type { RuleData } from '@/types/api';

interface RulePreviewProps {
  rule: Partial<RuleData>;
  triggerPatterns?: any;
  semanticTriggers?: any;
  contextConditions?: any;
  className?: string;
}

interface PreviewMatch {
  entity_id: string;
  entity_type: string;
  entity_name: string;
  confidence: number;
  why_applicable: string;
  file_path?: string;
}

interface PreviewResult {
  total_entities: number;
  matched_entities: number;
  matches: PreviewMatch[];
  estimated_performance: {
    match_time_ms: number;
    confidence_range: { min: number; max: number };
  };
}

export function RulePreview({
  rule,
  triggerPatterns,
  semanticTriggers,
  contextConditions,
  className
}: RulePreviewProps) {
  const { projectPath } = useAppStore();
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

  const runPreview = async () => {
    if (!projectPath || !rule.name) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create a temporary rule for testing
      const testRule: Partial<RuleData> = {
        ...rule,
        trigger_patterns: triggerPatterns,
        semantic_triggers: semanticTriggers,
        context_conditions: contextConditions,
        active: true
      };

      // Get sample entities to test against
      const searchResult = await felixService.search('', 50, ['component']);

      const entities = searchResult.results || [];
      
      // Simulate rule matching (in real implementation, this would use the backend)
      const matches: PreviewMatch[] = [];
      
      for (const entity of entities.slice(0, 20)) { // Test against first 20 entities
        const confidence = calculateMatchConfidence(entity, testRule);
        
        if (confidence > 0.5) { // Threshold for preview
          matches.push({
            entity_id: entity.id,
            entity_type: entity.type,
            entity_name: entity.name,
            confidence,
            why_applicable: generateExplanation(entity, testRule, confidence),
            file_path: entity.filePath
          });
        }
      }

      // Sort by confidence
      matches.sort((a, b) => b.confidence - a.confidence);

      const result: PreviewResult = {
        total_entities: entities.length,
        matched_entities: matches.length,
        matches: matches.slice(0, 10), // Show top 10
        estimated_performance: {
          match_time_ms: Math.random() * 50 + 10, // Simulated
          confidence_range: {
            min: matches.length > 0 ? Math.min(...matches.map(m => m.confidence)) : 0,
            max: matches.length > 0 ? Math.max(...matches.map(m => m.confidence)) : 0
          }
        }
      };

      setPreviewResult(result);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run preview');
    } finally {
      setLoading(false);
    }
  };

  // Simple rule matching simulation
  const calculateMatchConfidence = (entity: any, _testRule: Partial<RuleData>): number => {
    let confidence = 0;

    // File pattern matching
    if (triggerPatterns?.files?.length > 0) {
      for (const pattern of triggerPatterns.files) {
        if (entity.filePath && matchGlob(entity.filePath, pattern)) {
          confidence += 0.3;
          break;
        }
      }
    }

    // Component type matching
    if (triggerPatterns?.components?.length > 0) {
      if (triggerPatterns.components.includes(entity.type)) {
        confidence += 0.4;
      }
    }

    // Semantic matching (simplified)
    if (semanticTriggers?.business_domains?.length > 0) {
      for (const domain of semanticTriggers.business_domains) {
        if (entity.name.toLowerCase().includes(domain.toLowerCase()) ||
            entity.filePath?.toLowerCase().includes(domain.toLowerCase())) {
          confidence += 0.2;
          break;
        }
      }
    }

    // Architectural layer matching
    if (semanticTriggers?.architectural_layers?.length > 0) {
      for (const layer of semanticTriggers.architectural_layers) {
        if (entity.filePath?.toLowerCase().includes(layer.toLowerCase()) ||
            entity.name.toLowerCase().includes(layer.toLowerCase())) {
          confidence += 0.2;
          break;
        }
      }
    }

    return Math.min(confidence, 1.0);
  };

  const generateExplanation = (entity: any, _testRule: Partial<RuleData>, _confidence: number): string => {
    const reasons = [];

    if (triggerPatterns?.files?.length > 0) {
      for (const pattern of triggerPatterns.files) {
        if (entity.filePath && matchGlob(entity.filePath, pattern)) {
          reasons.push(`matches file pattern "${pattern}"`);
          break;
        }
      }
    }

    if (triggerPatterns?.components?.length > 0 && triggerPatterns.components.includes(entity.type)) {
      reasons.push(`is a ${entity.type} component`);
    }

    if (semanticTriggers?.business_domains?.length > 0) {
      for (const domain of semanticTriggers.business_domains) {
        if (entity.name.toLowerCase().includes(domain.toLowerCase()) ||
            entity.filePath?.toLowerCase().includes(domain.toLowerCase())) {
          reasons.push(`relates to ${domain} domain`);
          break;
        }
      }
    }

    return reasons.length > 0 ? reasons.join('; ') : 'general applicability';
  };

  // Simple glob matching (for demo)
  const matchGlob = (path: string, pattern: string): boolean => {
    if (pattern.includes('**')) {
      const parts = pattern.split('**');
      return parts.every(part => path.includes(part.replace(/\*/g, '')));
    }
    return path.includes(pattern.replace(/\*/g, ''));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 ';
    if (confidence >= 0.6) return 'text-primary ';
    if (confidence >= 0.4) return 'text-yellow-600 ';
    return 'text-red-600 ';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return CheckCircle;
    if (confidence >= 0.6) return Target;
    if (confidence >= 0.4) return Clock;
    return AlertTriangle;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Rule Preview & Testing
            </CardTitle>
            <Button 
              onClick={runPreview} 
              disabled={loading || !rule.name}
              size="sm"
            >
              {loading ? 'Testing...' : 'Test Rule'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 /20/20 border border-red-200  rounded-md">
              <p className="text-sm text-red-600 ">{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-muted-foreground ">
                Testing rule against current entities...
              </span>
            </div>
          )}

          {previewResult && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted  p-3 rounded-lg">
                  <div className="text-2xl font-bold text-primary ">
                    {previewResult.matched_entities}
                  </div>
                  <div className="text-xs text-gray-500">Matched Entities</div>
                </div>
                <div className="bg-muted  p-3 rounded-lg">
                  <div className="text-2xl font-bold text-muted-foreground ">
                    {previewResult.total_entities}
                  </div>
                  <div className="text-xs text-gray-500">Total Entities</div>
                </div>
                <div className="bg-muted  p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 ">
                    {Math.round((previewResult.matched_entities / previewResult.total_entities) * 100)}%
                  </div>
                  <div className="text-xs text-gray-500">Match Rate</div>
                </div>
                <div className="bg-muted  p-3 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 ">
                    {previewResult.estimated_performance.match_time_ms.toFixed(1)}ms
                  </div>
                  <div className="text-xs text-gray-500">Match Time</div>
                </div>
              </div>

              {/* Confidence Range */}
              {previewResult.matches.length > 0 && (
                <div className="bg-blue-50 /20/20 p-3 rounded-lg">
                  <div className="text-sm font-medium text-blue-800  mb-1">
                    Confidence Range
                  </div>
                  <div className="text-xs text-primary ">
                    {(previewResult.estimated_performance.confidence_range.min * 100).toFixed(1)}% - {' '}
                    {(previewResult.estimated_performance.confidence_range.max * 100).toFixed(1)}%
                  </div>
                </div>
              )}

              {/* Matched Entities */}
              {previewResult.matches.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Matching Entities</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {previewResult.matches.map((match, index) => {
                      const ConfidenceIcon = getConfidenceIcon(match.confidence);
                      return (
                        <div
                          key={index}
                          className={cn(
                            "p-3 border rounded-lg cursor-pointer transition-colors",
                            selectedEntity === match.entity_id
                              ? "border-blue-300  bg-blue-50 /20/20"
                              : "border-border  hover:border-border :border-gray-600"
                          )}
                          onClick={() => setSelectedEntity(
                            selectedEntity === match.entity_id ? null : match.entity_id
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium truncate">
                                  {match.entity_name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({match.entity_type})
                                </span>
                              </div>
                              {match.file_path && (
                                <div className="text-xs text-gray-500 truncate mt-1">
                                  {match.file_path}
                                </div>
                              )}
                              {selectedEntity === match.entity_id && (
                                <div className="text-xs text-muted-foreground  mt-2">
                                  {match.why_applicable}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 ml-2">
                              <ConfidenceIcon className={cn("h-4 w-4", getConfidenceColor(match.confidence))} />
                              <span className={cn("text-sm font-medium", getConfidenceColor(match.confidence))}>
                                {(match.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 ">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No entities match this rule configuration</p>
                  <p className="text-xs mt-1">Try adjusting the trigger patterns</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}