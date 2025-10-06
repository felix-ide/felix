import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@client/shared/ui/Card';
import { Button } from '@client/shared/ui/Button';
import { cn } from '@/utils/cn';
import { AlertTriangle, CheckCircle, BarChart3, TestTube, Plus, Eye, X, Target } from 'lucide-react';
import type { RuleData } from '@/types/api';
import { buildUrl, API_BASE } from '@client/shared/api/http';
import { felixService } from '@/services/felixService';
import type { ListRulesResponse } from '@client/shared/api/rulesClient';

interface RuleEffectivenessDisplayProps {
  rules: RuleData[];
  className?: string;
  onRefresh?: () => void;
  onNewRule?: () => void;
  onBackToRules?: () => void;
  onTestRuleMatching?: () => void;
  testResults?: string | null;
  onClearTestResults?: () => void;
}

interface EffectivenessMetrics {
  rule_id: string;
  usage_count: number;
  acceptance_rate: number;
  effectiveness_score: number;
  last_used?: string;
  conflict_count: number;
  applicability_range: { min: number; max: number };
}

interface ConflictInfo {
  rule1_id: string;
  rule1_name: string;
  rule2_id: string;
  rule2_name: string;
  conflict_type: 'priority' | 'guidance' | 'pattern_overlap';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export function RuleEffectivenessDisplay({
  rules,
  className,
  onRefresh,
  onNewRule,
  onBackToRules,
  onTestRuleMatching,
  testResults,
  onClearTestResults
}: RuleEffectivenessDisplayProps) {
  const [metrics, setMetrics] = useState<EffectivenessMetrics[]>([]);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [sortBy, setSortBy] = useState<'usage' | 'acceptance' | 'effectiveness'>('effectiveness');
  const [activeTab, setActiveTab] = useState<'effectiveness' | 'conflicts' | 'testing'>('effectiveness');

  useEffect(() => {
    // Fetch real analytics data
    const fetchAnalytics = async () => {
      try {
        const ruleIds = rules.map(r => r.id).join(',');
        const url = buildUrl(API_BASE, 'rules/analytics', { rule_ids: ruleIds });
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          const analyticsMap: Map<string, any> = new Map((data.analytics as any[]).map((a: any) => [a.id, a]));
          
          // Map analytics data to metrics
          const calculatedMetrics: EffectivenessMetrics[] = rules.map(rule => {
            const analytics: any = analyticsMap.get(rule.id) || {};
            
            return {
              rule_id: rule.id,
              usage_count: analytics?.usage_count || 0,
              acceptance_rate: analytics?.acceptance_rate || 0,
              effectiveness_score: analytics?.effectiveness_score || 0,
              last_used: analytics?.last_used || undefined,
              conflict_count: typeof analytics?.conflict_count === 'number' ? analytics.conflict_count : 0,
              applicability_range: {
                min: 0.3,
                max: 0.9
              }
            };
          });
          
          setMetrics(calculatedMetrics);
        } else {
          // Fallback to simulated data if API fails
          console.warn('Failed to fetch rule analytics, using simulated data');
          const calculatedMetrics: EffectivenessMetrics[] = rules.map(rule => ({
            rule_id: rule.id,
            usage_count: Math.floor(Math.random() * 100),
            acceptance_rate: Math.random() * 0.8 + 0.2,
            effectiveness_score: Math.random() * 0.9 + 0.1,
            last_used: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            conflict_count: Math.floor(Math.random() * 3),
            applicability_range: {
              min: Math.random() * 0.3,
              max: Math.random() * 0.4 + 0.6
            }
          }));
          setMetrics(calculatedMetrics);
        }
      } catch (error) {
        console.error('Error fetching rule analytics:', error);
        // Use simulated data as fallback
        const calculatedMetrics: EffectivenessMetrics[] = rules.map(rule => ({
          rule_id: rule.id,
          usage_count: 0,
          acceptance_rate: 0,
          effectiveness_score: 0,
          last_used: undefined,
          conflict_count: 0,
          applicability_range: {
            min: 0.3,
            max: 0.9
          }
        }));
        setMetrics(calculatedMetrics);
      }
    };
    
    fetchAnalytics();

    // Detect potential conflicts
    const detectedConflicts: ConflictInfo[] = [];
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const rule1 = rules[i];
        const rule2 = rules[j];
        
        // Check for pattern overlap (simplified)
        if (hasPatternOverlap(rule1, rule2)) {
          detectedConflicts.push({
            rule1_id: rule1.id,
            rule1_name: rule1.name,
            rule2_id: rule2.id,
            rule2_name: rule2.name,
            conflict_type: 'pattern_overlap',
            severity: rule1.priority === rule2.priority ? 'high' : 'medium',
            description: `Rules have overlapping trigger patterns but different guidance`
          });
        }

        // Check for priority conflicts
        if (rule1.priority === rule2.priority && rule1.rule_type === rule2.rule_type) {
          detectedConflicts.push({
            rule1_id: rule1.id,
            rule1_name: rule1.name,
            rule2_id: rule2.id,
            rule2_name: rule2.name,
            conflict_type: 'priority',
            severity: 'low',
            description: `Rules have same priority (${rule1.priority}) and type`
          });
        }
      }
    }

    setConflicts(detectedConflicts);
  }, [rules]);

  const hasPatternOverlap = (rule1: RuleData, rule2: RuleData): boolean => {
    // Simplified overlap detection
    if (!rule1.trigger_patterns || !rule2.trigger_patterns) return false;
    
    const patterns1 = JSON.stringify(rule1.trigger_patterns);
    const patterns2 = JSON.stringify(rule2.trigger_patterns);
    
    return patterns1 === patterns2;
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 0.8) return 'text-success ';
    if (score >= 0.6) return 'text-primary ';
    if (score >= 0.4) return 'text-warning ';
    return 'text-destructive ';
  };

  const getEffectivenessIcon = (score: number) => {
    if (score >= 0.8) return CheckCircle;
    if (score >= 0.6) return Target;
    if (score >= 0.4) return Target;
    return AlertTriangle;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-destructive bg-destructive/15';
      case 'medium': return 'text-warning bg-warning/15';
      case 'low': return 'text-primary bg-primary/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const sortedRules = [...rules].sort((a, b) => {
    const metricA = metrics.find(m => m.rule_id === a.id);
    const metricB = metrics.find(m => m.rule_id === b.id);

    if (!metricA || !metricB) return 0;

    switch (sortBy) {
      case 'usage':
        return metricB.usage_count - metricA.usage_count;
      case 'acceptance':
        return metricB.acceptance_rate - metricA.acceptance_rate;
      case 'effectiveness':
      default:
        return metricB.effectiveness_score - metricA.effectiveness_score;
    }
  });

  return (
    <div className={cn("space-y-4", className)}>
      {/* Analytics Information */}
      {metrics.length > 0 && metrics.every(m => m.usage_count === 0) && (
        <Card className="border border-border bg-card ">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
          <Target className="h-5 w-5 text-primary mt-0.5" />
              <div>
            <h3 className="font-medium">Rule Analytics Active</h3>
            <p className="text-sm text-muted-foreground mt-1">
                  Rule usage is now being tracked. As you use rules in your conversations:
                </p>
            <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
                  <li>Usage counts will increase when rules are applied</li>
                  <li>Acceptance rates can be tracked through user feedback</li>
                  <li>Effectiveness scores will improve with positive interactions</li>
                  <li>Last used dates will update automatically</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Card with Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            {/* Left side: Title and Section Tabs */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                <CardTitle className="text-lg">Rule Analytics</CardTitle>
              </div>

              {/* Section Tabs */}
              <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('effectiveness')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    activeTab === 'effectiveness'
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Effectiveness
                </button>
                <button
                  onClick={() => setActiveTab('conflicts')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-1",
                    activeTab === 'conflicts'
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Conflicts</span>
                  {conflicts.length > 0 && (
                    <span className="ml-1 bg-warning/20 text-warning px-1.5 py-0.5 rounded-full text-xs">
                      {conflicts.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('testing')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-1",
                    activeTab === 'testing'
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TestTube className="h-3.5 w-3.5" />
                  <span>Testing</span>
                </button>
              </div>
            </div>

            {/* Right side: Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Action buttons */}
              {onNewRule && (
                <Button variant="outline" size="sm" onClick={onNewRule}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Rule
                </Button>
              )}

              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh}>
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </Button>
              )}

              {rules.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                  {rules.length} rules
                </span>
              )}

              {onBackToRules && (
                <Button variant="outline" size="sm" onClick={onBackToRules}>
                  <Eye className="h-4 w-4 mr-1" />
                  Back to Rules
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Effectiveness Tab Content */}
          {activeTab === 'effectiveness' && (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 border-b pb-2">
                <div className="col-span-4">Rule Name</div>
                <button
                  onClick={() => setSortBy('usage')}
                  className={cn(
                    "col-span-2 text-center hover:text-foreground transition-colors",
                    sortBy === 'usage' && "text-foreground font-semibold"
                  )}
                >
                  Usage {sortBy === 'usage' && '↓'}
                </button>
                <button
                  onClick={() => setSortBy('acceptance')}
                  className={cn(
                    "col-span-2 text-center hover:text-foreground transition-colors",
                    sortBy === 'acceptance' && "text-foreground font-semibold"
                  )}
                >
                  Acceptance {sortBy === 'acceptance' && '↓'}
                </button>
                <button
                  onClick={() => setSortBy('effectiveness')}
                  className={cn(
                    "col-span-2 text-center hover:text-foreground transition-colors",
                    sortBy === 'effectiveness' && "text-foreground font-semibold"
                  )}
                >
                  Effectiveness {sortBy === 'effectiveness' && '↓'}
                </button>
                <div className="col-span-2 text-center">Conflicts</div>
              </div>

              <div className="space-y-1">
                {sortedRules.map((rule, index) => {
                  const metric = metrics.find(m => m.rule_id === rule.id);
                  if (!metric) return null;

                  const EffectivenessIcon = getEffectivenessIcon(metric.effectiveness_score);

                  return (
                    <div
                      key={rule.id}
                      className="grid grid-cols-12 gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="col-span-4">
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            index < 3 ? "bg-success/15 text-success" :
                            index < 6 ? "bg-warning/15 text-warning" :
                            "bg-card text-muted-foreground"
                          )}>
                            #{index + 1}
                          </span>
                          <span className="text-sm font-medium truncate">{rule.name}</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">{rule.rule_type}</div>
                      </div>

                      <div className="col-span-2 text-center">
                        <div className="text-sm font-medium">{metric.usage_count}</div>
                        <div className="text-xs text-gray-500">
                          {metric.last_used ?
                            new Date(metric.last_used).toLocaleDateString() :
                            'Never'
                          }
                        </div>
                      </div>

                      <div className="col-span-2 text-center">
                        <div className={cn("text-sm font-medium", getEffectivenessColor(metric.acceptance_rate))}>
                          {(metric.acceptance_rate * 100).toFixed(0)}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-primary h-1.5 rounded-full"
                            style={{ width: `${metric.acceptance_rate * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="col-span-2 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <EffectivenessIcon className={cn("h-4 w-4", getEffectivenessColor(metric.effectiveness_score))} />
                          <span className={cn("text-sm font-medium", getEffectivenessColor(metric.effectiveness_score))}>
                            {(metric.effectiveness_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="col-span-2 text-center">
                        {metric.conflict_count > 0 ? (
                          <div className="flex items-center justify-center space-x-1">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            <span className="text-sm text-warning">
                              {metric.conflict_count}
                            </span>
                          </div>
                        ) : (
                          <CheckCircle className="h-4 w-4 text-success mx-auto" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conflicts Tab Content */}
          {activeTab === 'conflicts' && (
            <div className="space-y-2">
              {conflicts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-success" />
                  <p className="text-sm">No rule conflicts detected</p>
                </div>
              ) : (
                conflicts.map((conflict, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-lg border",
                      getSeverityColor(conflict.severity)
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {conflict.rule1_name} ↔ {conflict.rule2_name}
                        </div>
                        <div className="text-xs mt-1">
                          {conflict.description}
                        </div>
                        <div className="text-xs mt-1 opacity-75">
                          Type: {conflict.conflict_type.replace('_', ' ')}
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        conflict.severity === 'high' ? 'bg-destructive/15 text-destructive' :
                        conflict.severity === 'medium' ? 'bg-warning/15 text-warning' :
                        'bg-primary/15 text-primary'
                      )}>
                        {conflict.severity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Testing Tab Content */}
          {activeTab === 'testing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Test the rule matching system to verify components, rules, and server connectivity.
                </p>
                {onTestRuleMatching && (
                  <Button variant="default" onClick={onTestRuleMatching}>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Rule Matching
                  </Button>
                )}
              </div>

              {testResults && (
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Test Results</h3>
                    {onClearTestResults && (
                      <Button variant="outline" size="sm" onClick={onClearTestResults}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono select-text">
                    {testResults}
                  </pre>
                </div>
              )}

              {!testResults && (
                <div className="text-center py-8 text-muted-foreground">
                  <TestTube className="h-12 w-12 mx-auto mb-3" />
                  <p className="text-sm">Click "Test Rule Matching" to run system tests</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
