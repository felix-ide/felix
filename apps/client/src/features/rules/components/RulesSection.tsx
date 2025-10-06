import { useEffect, useState } from 'react';
import { useAppStore } from '@client/features/app-shell/state/appStore';
import { felixService } from '@/services/felixService';
import type { ListRulesResponse } from '@client/shared/api/rulesClient';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@client/shared/ui/Card';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { Alert } from '@client/shared/ui/Alert';
import { RuleHierarchy } from '@client/features/rules/components/RuleHierarchy';
import { AlertCircle, Link, Tag, X, Plus, Settings } from 'lucide-react';
import { EntityLinksSection } from '@client/shared/components/EntityLinksSection';
import { RuleEffectivenessDisplay } from '@client/features/rules/components/RuleEffectivenessDisplay';
import type { RuleData } from '@/types/api';


export function RulesSection() {
  const { projectPath } = useAppStore();
  const [rules, setRules] = useState<RuleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [parentRuleId, setParentRuleId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    rule_type: 'pattern',
    guidance_text: '',
    priority: 5,
    auto_apply: false
  });
  const [entityLinks, setEntityLinks] = useState<Array<{entity_type: string; entity_id: string; entity_name?: string; link_strength?: 'primary' | 'secondary' | 'reference'}>>([]);
  const [stableLinks, setStableLinks] = useState<Record<string, any>>({});
  const [fragileLinks, setFragileLinks] = useState<Record<string, any>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [testResults, setTestResults] = useState<string | null>(null);

  const loadRules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result: ListRulesResponse = await felixService.listRules({
        includeAutomation: true
      });
      
      setRules(result.applicable_rules ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    try {
      setError(null);
      
      await felixService.addRule({
        name: newRule.name,
        description: newRule.description,
        ruleType: newRule.rule_type,
        guidanceText: newRule.guidance_text,
        priority: newRule.priority,
        autoApply: newRule.auto_apply,
        parentId: parentRuleId || undefined,
        entity_links: entityLinks.length > 0 ? entityLinks : undefined,
        stableTags: tags.length > 0 ? tags : undefined
      });
      
      setNewRule({
        name: '',
        description: '',
        rule_type: 'pattern',
        guidance_text: '',
        priority: 5,
        auto_apply: false
      });
      setEntityLinks([]);
      setStableLinks({});
      setFragileLinks({});
      setTags([]);
      setNewTag('');
      setShowAddForm(false);
      setParentRuleId(null);
      
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add rule');
    }
  };

  const handleUpdateRule = async (ruleId: string, updates: Partial<RuleData>) => {
    try {
      setError(null);
      await felixService.updateRule(ruleId, updates);
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      setError(null);
      await felixService.deleteRule(ruleId);
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
    }
  };

  const handleReorderRule = async (ruleId: string, newParentId: string | null, newSortOrder: number) => {
    try {
      setError(null);
      await felixService.updateRule(ruleId, {
        parent_id: newParentId,
        sort_order: newSortOrder
      });
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder rule');
    }
  };

  const handleAddSubRule = (parentId: string) => {
    // Set parent ID and show the form
    setParentRuleId(parentId);
    setShowAddForm(true);
  };

  const testRuleMatching = async () => {
    try {
      setError(null);
      
      // Test basic functionality
      const [searchResult, rulesResult] = await Promise.all([
        felixService.search('component', 10, ['component']),
        felixService.listRules({ includeAutomation: true }) as Promise<ListRulesResponse>
      ]);
      
      const componentCount = searchResult.results?.length || 0;
      const ruleCount = rulesResult.applicable_rules?.length || 0;
      
      // Test if we can access the server - use the project/current endpoint which should exist
      let mcpTest = 'Not tested';
      try {
        const response = await fetch(`${import.meta.env.VITE_FELIX_SERVER || 'http://localhost:9000/api'}/project/current`);
        mcpTest = response.ok ? 'Server responding' : 'Server not responding';
      } catch {
        mcpTest = 'Server connection failed';
      }
      
      const serverOk = mcpTest === 'Server responding';
      const systemReady = componentCount > 0 && ruleCount > 0 && serverOk;
      
      const results = `System Test Results:
      
📊 Data Status:
- Components indexed: ${componentCount}
- Rules configured: ${ruleCount}
- Server status: ${mcpTest}

🔧 Next Steps:
${componentCount === 0 ? '- Index your codebase first' : '✓ Components ready'}
${ruleCount === 0 ? '- Create some rules' : '✓ Rules configured'}
${!serverOk ? '- Fix server connection (check if Felix backend is running)' : '✓ Server responding'}

${systemReady ? 
'✅ System ready! Rules will appear when editing files.' : 
'❌ System not ready - fix the issues above first.'}`;

      setTestResults(results);
      
    } catch (err) {
      const errorMsg = `Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setTestResults(errorMsg);
      setError(err instanceof Error ? err.message : 'Failed to test system');
    }
  };

  useEffect(() => {
    if (projectPath) {
      loadRules();
    }

    // Listen for project restoration
    const handleProjectRestored = () => {
      console.log('Project restored, reloading rules...');
      if (projectPath) {
        loadRules();
      }
    };
    
    window.addEventListener('project-restored', handleProjectRestored);

    return () => {
      window.removeEventListener('project-restored', handleProjectRestored);
    };
  }, [projectPath]);


  if (!projectPath) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Settings size={48} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-gray-500">No project selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        </div>
      )}

      {/* Add Rule Form */}
      {showAddForm && (
        <div className="flex-none p-4 bg-muted/30 border-b border-border">
          <Card className="max-h-[80vh] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle>{parentRuleId ? 'Add Sub-Rule' : 'Add New Rule'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="Rule name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Input
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={newRule.rule_type}
                  onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="pattern">Pattern</option>
                  <option value="constraint">Constraint</option>
                  <option value="semantic">Semantic</option>
                  <option value="automation">Automation</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Guidance Text</label>
                <textarea
                  value={newRule.guidance_text}
                  onChange={(e) => setNewRule({ ...newRule, guidance_text: e.target.value })}
                  placeholder="Detailed guidance for this rule..."
                  className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  required
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={newRule.priority}
                    onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                    className="w-20"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="auto_apply"
                    checked={newRule.auto_apply}
                    onChange={(e) => setNewRule({ ...newRule, auto_apply: e.target.checked })}
                    className="h-4 w-4 rounded border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <label htmlFor="auto_apply" className="text-sm">Auto-apply</label>
                </div>
              </div>

              {/* Entity Linking */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  <Link className="h-4 w-4 inline mr-1" />
                  Entity Links
                </label>
                <EntityLinksSection
                  entityLinks={entityLinks}
                  onEntityLinksUpdate={setEntityLinks}
                  stableLinks={stableLinks}
                  onStableLinksUpdate={setStableLinks}
                  fragileLinks={fragileLinks}
                  onFragileLinksUpdate={setFragileLinks}
                  allowedEntityTypes={['component', 'note', 'task', 'rule']}
                  compact={true}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  <Tag className="h-4 w-4 inline mr-1" />
                  Tags
                </label>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground text-sm rounded"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                        <button
                          onClick={() => setTags(tags.filter(t => t !== tag))}
                          className="ml-1 hover:text-destructive"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTag.trim() && !tags.includes(newTag.trim())) {
                          setTags([...tags, newTag.trim()]);
                          setNewTag('');
                        }
                      }
                    }}
                    placeholder="Add tag..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newTag.trim() && !tags.includes(newTag.trim())) {
                        setTags([...tags, newTag.trim()]);
                        setNewTag('');
                      }
                    }}
                    disabled={!newTag.trim()}
                    className="px-3"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-shrink-0 flex justify-end space-x-2 border-t border-border">
              <Button variant="outline" onClick={() => {
                setEntityLinks([]);
                setStableLinks({});
                setFragileLinks({});
                setTags([]);
                setNewTag('');
                setShowAddForm(false);
                setParentRuleId(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleAddRule} disabled={!newRule.name || !newRule.guidance_text}>
                Add Rule
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Rules Hierarchy */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-gray-500">Loading rules...</p>
            </div>
          </div>
        ) : showAnalytics ? (
          <div className="h-full overflow-y-auto p-4">
            <RuleEffectivenessDisplay
              rules={rules}
              onRefresh={loadRules}
              onNewRule={() => setShowAddForm(true)}
              onBackToRules={() => setShowAnalytics(false)}
              onTestRuleMatching={testRuleMatching}
              testResults={testResults}
              onClearTestResults={() => setTestResults(null)}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <RuleHierarchy
                rules={rules}
                onRuleUpdate={handleUpdateRule}
                onRuleDelete={handleDeleteRule}
                onReorder={handleReorderRule}
                onAddSubRule={handleAddSubRule}
                onCreateNew={() => setShowAddForm(true)}
                onToggleAnalytics={() => setShowAnalytics(!showAnalytics)}
                showAnalytics={showAnalytics}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
