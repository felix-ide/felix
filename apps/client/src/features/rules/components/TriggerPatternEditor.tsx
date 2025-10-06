import { useState, useCallback } from 'react';
import { Card, CardContent } from '@client/shared/ui/Card';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { cn } from '@/utils/cn';
import { X, FileText, Code, GitBranch, Brain, Plus } from 'lucide-react';

export interface TriggerPatterns {
  files?: string[];
  components?: string[];
  relationships?: string[];
}

export interface SemanticTriggers {
  business_domains?: string[];
  architectural_layers?: string[];
  patterns?: string[];
}

export interface ContextConditions {
  file_size?: {
    min?: number;
    max?: number;
  };
  complexity?: {
    max?: number;
  };
  dependencies?: {
    max?: number;
  };
}

interface TriggerPatternEditorProps {
  triggerPatterns?: TriggerPatterns;
  semanticTriggers?: SemanticTriggers;
  contextConditions?: ContextConditions;
  onTriggerPatternsChange: (patterns: TriggerPatterns) => void;
  onSemanticTriggersChange: (triggers: SemanticTriggers) => void;
  onContextConditionsChange: (conditions: ContextConditions) => void;
  className?: string;
}

export function TriggerPatternEditor({
  triggerPatterns = {},
  semanticTriggers = {},
  contextConditions = {},
  onTriggerPatternsChange,
  onSemanticTriggersChange,
  onContextConditionsChange,
  className
}: TriggerPatternEditorProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'components' | 'semantic' | 'context'>('files');
  
  // File pattern handlers
  const addFilePattern = useCallback(() => {
    const newPatterns = {
      ...triggerPatterns,
      files: [...(triggerPatterns.files || []), '']
    };
    onTriggerPatternsChange(newPatterns);
  }, [triggerPatterns, onTriggerPatternsChange]);

  const updateFilePattern = useCallback((index: number, value: string) => {
    const newFiles = [...(triggerPatterns.files || [])];
    newFiles[index] = value;
    onTriggerPatternsChange({
      ...triggerPatterns,
      files: newFiles
    });
  }, [triggerPatterns, onTriggerPatternsChange]);

  const removeFilePattern = useCallback((index: number) => {
    const newFiles = [...(triggerPatterns.files || [])];
    newFiles.splice(index, 1);
    onTriggerPatternsChange({
      ...triggerPatterns,
      files: newFiles
    });
  }, [triggerPatterns, onTriggerPatternsChange]);

  // Component pattern handlers
  const addComponentPattern = useCallback(() => {
    const newPatterns = {
      ...triggerPatterns,
      components: [...(triggerPatterns.components || []), '']
    };
    onTriggerPatternsChange(newPatterns);
  }, [triggerPatterns, onTriggerPatternsChange]);

  const updateComponentPattern = useCallback((index: number, value: string) => {
    const newComponents = [...(triggerPatterns.components || [])];
    newComponents[index] = value;
    onTriggerPatternsChange({
      ...triggerPatterns,
      components: newComponents
    });
  }, [triggerPatterns, onTriggerPatternsChange]);

  const removeComponentPattern = useCallback((index: number) => {
    const newComponents = [...(triggerPatterns.components || [])];
    newComponents.splice(index, 1);
    onTriggerPatternsChange({
      ...triggerPatterns,
      components: newComponents
    });
  }, [triggerPatterns, onTriggerPatternsChange]);

  // Semantic trigger handlers
  const addSemanticTrigger = useCallback((type: 'business_domains' | 'architectural_layers' | 'patterns') => {
    const newTriggers = {
      ...semanticTriggers,
      [type]: [...(semanticTriggers[type] || []), '']
    };
    onSemanticTriggersChange(newTriggers);
  }, [semanticTriggers, onSemanticTriggersChange]);

  const updateSemanticTrigger = useCallback((type: 'business_domains' | 'architectural_layers' | 'patterns', index: number, value: string) => {
    const newArray = [...(semanticTriggers[type] || [])];
    newArray[index] = value;
    onSemanticTriggersChange({
      ...semanticTriggers,
      [type]: newArray
    });
  }, [semanticTriggers, onSemanticTriggersChange]);

  const removeSemanticTrigger = useCallback((type: 'business_domains' | 'architectural_layers' | 'patterns', index: number) => {
    const newArray = [...(semanticTriggers[type] || [])];
    newArray.splice(index, 1);
    onSemanticTriggersChange({
      ...semanticTriggers,
      [type]: newArray
    });
  }, [semanticTriggers, onSemanticTriggersChange]);

  const tabs = [
    { id: 'files' as const, label: 'File Patterns', icon: FileText },
    { id: 'components' as const, label: 'Components', icon: Code },
    { id: 'semantic' as const, label: 'Semantic', icon: Brain },
    { id: 'context' as const, label: 'Context', icon: GitBranch }
  ];

  const commonFilePatterns = [
    '**/*.ts',
    '**/*.tsx', 
    '**/*.js',
    '**/*.jsx',
    '**/test/**',
    '**/spec/**',
    'src/**/*.{ts,tsx}',
    'pages/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}'
  ];

  const commonComponentTypes = [
    'function',
    'class',
    'interface',
    'method',
    'property',
    'variable'
  ];

  const commonDomains = [
    'authentication',
    'authorization',
    'user-management',
    'api',
    'database',
    'validation',
    'error-handling',
    'logging',
    'caching',
    'testing'
  ];

  const commonLayers = [
    'controller',
    'service',
    'model',
    'view',
    'component',
    'util',
    'middleware',
    'config'
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-card  p-1 rounded-lg">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-card  text-foreground  shadow-sm"
                  : "text-muted-foreground  hover:text-foreground :text-gray-100"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <Card>
        <CardContent className="p-4">
          {activeTab === 'files' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">File Patterns</h3>
                <Button onClick={addFilePattern} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Pattern
                </Button>
              </div>
              
              {/* Quick suggestions */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Common patterns:</p>
                <div className="flex flex-wrap gap-1">
                  {commonFilePatterns.map(pattern => (
                    <button
                      key={pattern}
                      onClick={() => {
                        const newPatterns = {
                          ...triggerPatterns,
                          files: [...(triggerPatterns.files || []), pattern]
                        };
                        onTriggerPatternsChange(newPatterns);
                      }}
                      className="px-2 py-1 text-xs bg-primary/10 /20 text-blue-800  rounded hover:bg-blue-200 :bg-blue-800"
                    >
                      {pattern}
                    </button>
                  ))}
                </div>
              </div>

              {(triggerPatterns.files || []).map((pattern, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={pattern}
                    onChange={(e) => updateFilePattern(index, e.target.value)}
                    placeholder="e.g., **/*.ts, src/**/*.tsx"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => removeFilePattern(index)}
                    size="sm"
                    variant="outline"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'components' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Component Types</h3>
                <Button onClick={addComponentPattern} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Type
                </Button>
              </div>

              {/* Quick suggestions */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Common types:</p>
                <div className="flex flex-wrap gap-1">
                  {commonComponentTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        const newPatterns = {
                          ...triggerPatterns,
                          components: [...(triggerPatterns.components || []), type]
                        };
                        onTriggerPatternsChange(newPatterns);
                      }}
                      className="px-2 py-1 text-xs bg-green-100  text-green-800  rounded hover:bg-green-200 :bg-green-800"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {(triggerPatterns.components || []).map((pattern, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={pattern}
                    onChange={(e) => updateComponentPattern(index, e.target.value)}
                    placeholder="e.g., function, class, interface"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => removeComponentPattern(index)}
                    size="sm"
                    variant="outline"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'semantic' && (
            <div className="space-y-6">
              {/* Business Domains */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Business Domains</h4>
                  <Button 
                    onClick={() => addSemanticTrigger('business_domains')} 
                    size="sm" 
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Domain
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  {commonDomains.map(domain => (
                    <button
                      key={domain}
                      onClick={() => {
                        const newTriggers = {
                          ...semanticTriggers,
                          business_domains: [...(semanticTriggers.business_domains || []), domain]
                        };
                        onSemanticTriggersChange(newTriggers);
                      }}
                      className="px-2 py-1 text-xs bg-purple-100  text-purple-800  rounded hover:bg-purple-200 :bg-purple-800"
                    >
                      {domain}
                    </button>
                  ))}
                </div>

                {(semanticTriggers.business_domains || []).map((domain, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={domain}
                      onChange={(e) => updateSemanticTrigger('business_domains', index, e.target.value)}
                      placeholder="e.g., authentication, user-management"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => removeSemanticTrigger('business_domains', index)}
                      size="sm"
                      variant="outline"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Architectural Layers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Architectural Layers</h4>
                  <Button 
                    onClick={() => addSemanticTrigger('architectural_layers')} 
                    size="sm" 
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Layer
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  {commonLayers.map(layer => (
                    <button
                      key={layer}
                      onClick={() => {
                        const newTriggers = {
                          ...semanticTriggers,
                          architectural_layers: [...(semanticTriggers.architectural_layers || []), layer]
                        };
                        onSemanticTriggersChange(newTriggers);
                      }}
                      className="px-2 py-1 text-xs bg-orange-100  text-orange-800  rounded hover:bg-orange-200 :bg-orange-800"
                    >
                      {layer}
                    </button>
                  ))}
                </div>

                {(semanticTriggers.architectural_layers || []).map((layer, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={layer}
                      onChange={(e) => updateSemanticTrigger('architectural_layers', index, e.target.value)}
                      placeholder="e.g., controller, service, model"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => removeSemanticTrigger('architectural_layers', index)}
                      size="sm"
                      variant="outline"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'context' && (
            <div className="space-y-6">
              {/* File Size Conditions */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">File Size Constraints</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Minimum Size (bytes)</label>
                    <Input
                      type="number"
                      value={contextConditions.file_size?.min || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : undefined;
                        onContextConditionsChange({
                          ...contextConditions,
                          file_size: {
                            ...contextConditions.file_size,
                            min: value
                          }
                        });
                      }}
                      placeholder="e.g., 1000"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Maximum Size (bytes)</label>
                    <Input
                      type="number"
                      value={contextConditions.file_size?.max || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : undefined;
                        onContextConditionsChange({
                          ...contextConditions,
                          file_size: {
                            ...contextConditions.file_size,
                            max: value
                          }
                        });
                      }}
                      placeholder="e.g., 50000"
                    />
                  </div>
                </div>
              </div>

              {/* Complexity Conditions */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Complexity Constraints</h4>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Maximum Complexity</label>
                  <Input
                    type="number"
                    value={contextConditions.complexity?.max || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : undefined;
                      onContextConditionsChange({
                        ...contextConditions,
                        complexity: {
                          max: value
                        }
                      });
                    }}
                    placeholder="e.g., 10"
                  />
                </div>
              </div>

              {/* Dependencies Conditions */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Dependencies Constraints</h4>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Maximum Dependencies</label>
                  <Input
                    type="number"
                    value={contextConditions.dependencies?.max || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : undefined;
                      onContextConditionsChange({
                        ...contextConditions,
                        dependencies: {
                          max: value
                        }
                      });
                    }}
                    placeholder="e.g., 5"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}