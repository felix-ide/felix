import { useState, useEffect } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Alert, AlertDescription } from '@client/shared/ui/Alert';
import { ChevronDown, ChevronRight, Settings, Check } from 'lucide-react';
import { Input } from '@client/shared/ui/Input';
import { cn } from '@/utils/cn';
import type { KBConfigField } from '../api/knowledgeBaseApi';
import { KBDatabaseConfig } from './KBDatabaseConfig';

interface KBInlineConfigProps {
  kbId: string;
  configSchema: KBConfigField[];
  existingConfig?: Record<string, any>;
  onSave: (config: Record<string, any>) => Promise<void>;
  isSaving?: boolean;
}

// Framework options based on selected languages
const FRAMEWORK_MAP: Record<string, string[]> = {
  'TypeScript': ['React', 'Angular', 'Vue', 'Next.js', 'Nuxt', 'NestJS', 'Express', 'Fastify', 'Remix', 'SvelteKit', 'Solid.js', 'Qwik'],
  'JavaScript': ['React', 'Angular', 'Vue', 'Next.js', 'Nuxt', 'Express', 'Fastify', 'Koa', 'Hapi', 'Meteor', 'Ember.js', 'Backbone.js', 'jQuery'],
  'Python': ['Django', 'Flask', 'FastAPI', 'Tornado', 'Pyramid', 'Bottle', 'Sanic', 'Starlette', 'Falcon', 'CherryPy', 'Web2py', 'TurboGears'],
  'Java': ['Spring Boot', 'Spring', 'Quarkus', 'Micronaut', 'Jakarta EE', 'Vert.x', 'Play Framework', 'Dropwizard', 'Spark Java', 'Struts', 'JSF', 'Vaadin'],
  'Go': ['Gin', 'Echo', 'Fiber', 'Chi', 'Gorilla', 'Revel', 'Beego', 'Buffalo', 'Iris'],
  'Rust': ['Actix-web', 'Rocket', 'Axum', 'Warp', 'Tide', 'Tokio', 'async-std'],
  'C#': ['.NET', 'ASP.NET Core', 'ASP.NET MVC', 'Blazor', 'Nancy', 'ServiceStack', 'Orleans', 'Unity', 'Xamarin', 'MAUI'],
  'PHP': ['Laravel', 'Symfony', 'CodeIgniter', 'Yii', 'CakePHP', 'Slim', 'Phalcon', 'Zend', 'Laminas', 'FuelPHP', 'WordPress', 'Drupal'],
  'Ruby': ['Ruby on Rails', 'Sinatra', 'Hanami', 'Padrino', 'Cuba', 'Roda', 'Grape'],
  'Swift': ['Vapor', 'Kitura', 'Perfect', 'SwiftUI', 'UIKit'],
  'Kotlin': ['Ktor', 'Spring Boot', 'Micronaut', 'Javalin', 'http4k'],
};

// Get available frameworks based on selected languages
const getAvailableFrameworks = (selectedLanguages: string[]): string[] => {
  if (!selectedLanguages || selectedLanguages.length === 0) {
    return [];
  }

  const frameworkSet = new Set<string>();
  selectedLanguages.forEach(lang => {
    const frameworks = FRAMEWORK_MAP[lang] || [];
    frameworks.forEach(fw => frameworkSet.add(fw));
  });

  return Array.from(frameworkSet).sort();
};

// Group fields by category for better organization
const groupFieldsByCategory = (fields: KBConfigField[]) => {
  const groups: Record<string, KBConfigField[]> = {
    'Development Setup': [],
    'Database Configuration': [],
    'Technology Stack': [],
    'Development Tools': [],
    'Architecture & Structure': [],
    'Naming Conventions': [],
  };

  fields.forEach(field => {
    // Skip frameworks field - we'll handle it dynamically
    if (field.key === 'frameworks') return;

    if (field.key.startsWith('dev') || field.key === 'autoStartDev') {
      groups['Development Setup'].push(field);
    } else if (field.key === 'languages') {
      groups['Technology Stack'].push(field);
    } else if (['orm', 'packageManager', 'testingFramework', 'linter', 'buildTool', 'stateManagement'].includes(field.key)) {
      groups['Development Tools'].push(field);
    } else if (field.key === 'architecturePatterns' || field.key === 'fileStructure') {
      groups['Architecture & Structure'].push(field);
    } else if (field.key.includes('Naming')) {
      groups['Naming Conventions'].push(field);
    }
  });

  // Always include Database Configuration group (handled specially)
  if (!Object.values(groups).some(g => g.length > 0 && g[0].key.startsWith('db'))) {
    // Database Configuration will be rendered with custom component
  }

  // Filter out empty groups
  return Object.entries(groups).filter(([_, fields]) => fields.length > 0);
};

export function KBInlineConfig({
  kbId,
  configSchema,
  existingConfig = {},
  onSave,
  isSaving = false
}: KBInlineConfigProps) {
  const [isExpanded, setIsExpanded] = useState(Object.keys(existingConfig).length === 0);
  const [config, setConfig] = useState<Record<string, any>>({
    ...existingConfig,
    databases: existingConfig.databases || []
  });
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Development Setup', 'Database Configuration']));

  const groupedFields = groupFieldsByCategory(configSchema);
  const hasExistingConfig = Object.keys(existingConfig).length > 0;

  // Get available frameworks based on selected languages
  const selectedLanguages = config.languages || [];
  const availableFrameworks = getAvailableFrameworks(selectedLanguages);

  // Update config when existingConfig changes (but preserve user input)
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      ...existingConfig,
      databases: existingConfig.databases || prev.databases || []
    }));
  }, [existingConfig]);

  const handleChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleMultiselectToggle = (key: string, option: string) => {
    const current = config[key] || [];
    const newValue = current.includes(option)
      ? current.filter((item: string) => item !== option)
      : [...current, option];
    handleChange(key, newValue);
  };

  const handleSave = async () => {
    try {
      setError(null);
      await onSave(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden my-6 bg-card">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 bg-muted/30 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-lg">Project Configuration</h3>
            <p className="text-sm text-muted-foreground">
              {hasExistingConfig
                ? 'Update your project baseline information'
                : 'Configure baseline project information to auto-generate rules'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasExistingConfig && (
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
              Configured
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Grouped Fields */}
          <div className="space-y-4">
            {/* Database Configuration (Special Section) */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleGroup('Database Configuration')}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
              >
                <span className="font-medium">Database Configuration</span>
                {expandedGroups.has('Database Configuration') ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {expandedGroups.has('Database Configuration') && (
                <div className="p-4 bg-background">
                  <KBDatabaseConfig
                    databases={config.databases || []}
                    onChange={(databases) => handleChange('databases', databases)}
                  />
                </div>
              )}
            </div>

            {groupedFields.map(([groupName, fields]) => (
              <div key={groupName} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
                >
                  <span className="font-medium">{groupName}</span>
                  {expandedGroups.has(groupName) ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {expandedGroups.has(groupName) && (
                  <div className="p-4 bg-background">
                    {/* Render fields in a smarter grid */}
                    <div className="space-y-3">
                      {fields.map((field, idx) => {
                        // Check if next field should be on same row (for compact layouts)
                        const nextField = fields[idx + 1];
                        const shouldGroupWithNext =
                          field.type === 'number' && field.key.endsWith('Port') ||
                          (field.key.includes('Host') && nextField?.key.includes('Port')) ||
                          (field.key.includes('Username') && nextField?.key.includes('Password'));

                        // Skip if this was already rendered with previous field
                        if (idx > 0) {
                          const prevField = fields[idx - 1];
                          const prevShouldGroupWithThis =
                            prevField.type === 'number' && prevField.key.endsWith('Port') ||
                            (prevField.key.includes('Host') && field.key.includes('Port')) ||
                            (prevField.key.includes('Username') && field.key.includes('Password'));
                          if (prevShouldGroupWithThis) return null;
                        }

                        return (
                          <div key={field.key} className={cn(
                            shouldGroupWithNext && "grid grid-cols-2 gap-3"
                          )}>
                            {/* Current Field */}
                            <div className={shouldGroupWithNext ? "" : ""}>
                              <label className="block text-sm font-medium mb-1.5">
                                {field.label}
                                {field.required && <span className="text-destructive ml-1">*</span>}
                              </label>

                              {/* Text Input */}
                              {field.type === 'text' && (
                                <Input
                                  type="text"
                                  value={config[field.key] || ''}
                                  onChange={(e) => handleChange(field.key, e.target.value)}
                                  placeholder={field.placeholder}
                                  required={field.required}
                                  className="h-9"
                                />
                              )}

                              {/* Number Input */}
                              {field.type === 'number' && (
                                <Input
                                  type="number"
                                  value={config[field.key] || ''}
                                  onChange={(e) => handleChange(field.key, e.target.value ? Number(e.target.value) : '')}
                                  placeholder={field.placeholder}
                                  required={field.required}
                                  className="h-9"
                                />
                              )}

                              {/* Select Dropdown */}
                              {field.type === 'select' && (
                                <select
                                  value={config[field.key] || ''}
                                  onChange={(e) => handleChange(field.key, e.target.value)}
                                  className="w-full h-9 px-3 py-1 border border-border rounded-md bg-background text-foreground text-sm"
                                  required={field.required}
                                >
                                  <option value="">-- Select --</option>
                                  {field.options?.map(option => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {/* Multi-select as Tag Grid */}
                              {field.type === 'multiselect' && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {field.options?.map(option => {
                                    const isSelected = (config[field.key] || []).includes(option);
                                    return (
                                      <button
                                        key={option}
                                        type="button"
                                        onClick={() => handleMultiselectToggle(field.key, option)}
                                        className={cn(
                                          "px-2.5 py-1 text-xs rounded-md border transition-colors",
                                          isSelected
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background border-border hover:bg-accent hover:border-accent-foreground"
                                        )}
                                      >
                                        {option}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Boolean Checkbox */}
                              {field.type === 'boolean' && (
                                <label className="flex items-center gap-2 cursor-pointer pt-1">
                                  <input
                                    type="checkbox"
                                    checked={config[field.key] || false}
                                    onChange={(e) => handleChange(field.key, e.target.checked)}
                                    className="rounded border-border"
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {field.placeholder || 'Enable'}
                                  </span>
                                </label>
                              )}
                            </div>

                            {/* Next Field (if grouped) */}
                            {shouldGroupWithNext && nextField && (
                              <div>
                                <label className="block text-sm font-medium mb-1.5">
                                  {nextField.label}
                                  {nextField.required && <span className="text-destructive ml-1">*</span>}
                                </label>

                                {nextField.type === 'text' && (
                                  <Input
                                    type="text"
                                    value={config[nextField.key] || ''}
                                    onChange={(e) => handleChange(nextField.key, e.target.value)}
                                    placeholder={nextField.placeholder}
                                    required={nextField.required}
                                    className="h-9"
                                  />
                                )}

                                {nextField.type === 'number' && (
                                  <Input
                                    type="number"
                                    value={config[nextField.key] || ''}
                                    onChange={(e) => handleChange(nextField.key, e.target.value ? Number(e.target.value) : '')}
                                    placeholder={nextField.placeholder}
                                    required={nextField.required}
                                    className="h-9"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }).filter(Boolean)}

                      {/* Dynamic Frameworks Field (Tech Stack group only) */}
                      {groupName === 'Technology Stack' && selectedLanguages.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium mb-1.5">
                            Frameworks & Libraries
                          </label>
                          {availableFrameworks.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {availableFrameworks.map(framework => {
                                const isSelected = (config.frameworks || []).includes(framework);
                                return (
                                  <button
                                    key={framework}
                                    type="button"
                                    onClick={() => handleMultiselectToggle('frameworks', framework)}
                                    className={cn(
                                      "px-2.5 py-1 text-xs rounded-md border transition-colors",
                                      isSelected
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background border-border hover:bg-accent hover:border-accent-foreground"
                                    )}
                                  >
                                    {framework}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              Select languages above to see available frameworks
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setIsExpanded(false)} disabled={isSaving}>
              Collapse
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                'Saving...'
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
