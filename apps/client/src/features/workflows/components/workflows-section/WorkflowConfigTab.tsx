import { Layers, Settings2, Shield, RefreshCw, Archive } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@client/shared/ui/Card';
import { Select } from '@client/shared/ui/Select';
import { MappingEditor } from '@client/features/workflows/components/MappingEditor';
import { TypeManager } from '@client/features/workflows/components/TypeManager';
import { cn } from '@/utils/cn';
import type { ConfigSection, WorkflowListItem } from './hooks/useWorkflowsSectionState';

interface WorkflowConfigTabProps {
  configSection: ConfigSection;
  onConfigSectionChange: (section: ConfigSection) => void;
  defaultWorkflow: string;
  items: WorkflowListItem[];
  updateDefaultWorkflow: (name: string) => void;
  enforceMapping: boolean;
  toggleEnforceMapping: () => void;
  mappingKey: number;
  onReloadMapping: () => void;
  restoreBuiltInWorkflows: () => void;
}

export function WorkflowConfigTab({
  configSection,
  onConfigSectionChange,
  defaultWorkflow,
  items,
  updateDefaultWorkflow,
  enforceMapping,
  toggleEnforceMapping,
  mappingKey,
  onReloadMapping,
  restoreBuiltInWorkflows,
}: WorkflowConfigTabProps) {
  return (
    <div className="flex-1 flex">
      <div className="w-64 border-r border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold mb-4">Configuration Sections</h3>
        <div className="space-y-1">
          <button
            onClick={() => onConfigSectionChange('mapping')}
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm text-left transition-all flex items-center gap-2',
              configSection === 'mapping' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
            )}
          >
            <Layers className="h-4 w-4" />
            Workflow Mapping
          </button>
          <button
            onClick={() => onConfigSectionChange('types')}
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm text-left transition-all flex items-center gap-2',
              configSection === 'types' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
            )}
          >
            <Settings2 className="h-4 w-4" />
            Task Types
          </button>
          <button
            onClick={() => onConfigSectionChange('settings')}
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm text-left transition-all flex items-center gap-2',
              configSection === 'settings' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
            )}
          >
            <Shield className="h-4 w-4" />
            System Settings
          </button>
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">DEFAULT WORKFLOW</h4>
            <Select value={defaultWorkflow} onChange={(event) => updateDefaultWorkflow(event.target.value)} className="w-full">
              {items.map((workflow) => (
                <option key={workflow.name} value={workflow.name}>
                  {workflow.display_name || workflow.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">ENFORCEMENT</h4>
            <div className="flex items-center justify-between p-2 rounded-md bg-background">
              <span className="text-sm">Strict Mode</span>
              <button
                onClick={toggleEnforceMapping}
                className={cn('relative w-10 h-5 rounded-full transition-colors', enforceMapping ? 'bg-primary' : 'bg-muted')}
              >
                <div
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full shadow-sm transition-transform border border-border',
                    enforceMapping ? 'translate-x-5' : 'translate-x-0.5',
                    'bg-card'
                  )}
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Enforce task type mappings</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {configSection === 'mapping' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Workflow Mapping</h2>
              <p className="text-xs text-muted-foreground">Drag types between workflows • Auto-saves</p>
            </div>
            <MappingEditor key={mappingKey} />
          </div>
        )}

        {configSection === 'types' && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Custom Task Types</h2>
              <p className="text-sm text-muted-foreground">Create custom task types with emojis, colors, and default settings.</p>
            </div>
            <TypeManager onUpdate={onReloadMapping} />
          </div>
        )}

        {configSection === 'settings' && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">System Settings</h2>
              <p className="text-sm text-muted-foreground">Configure system-wide workflow settings and maintenance options.</p>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-green-500" />
                    Maintenance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-sm mb-2">Restore Built-in Workflows</h4>
                      <p className="text-xs text-muted-foreground mb-3">Reset the default workflows to their original configuration.</p>
                      <Button variant="outline" size="sm" onClick={restoreBuiltInWorkflows}>
                        <Archive className="h-4 w-4 mr-2" />
                        Restore Defaults
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
