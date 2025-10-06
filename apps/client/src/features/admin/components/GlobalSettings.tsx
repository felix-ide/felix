import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@client/shared/ui/Card';
import { Button } from '@client/shared/ui/Button';
import { ChevronLeft, Save, RotateCcw } from 'lucide-react';

interface GlobalSettingsProps {
  onBack: () => void;
}

interface GlobalSettings {
  default_workflow: string;
  validation_strictness: 'strict' | 'moderate' | 'lenient';
  allow_emergency_bypass: boolean;
  require_workflow_selection: boolean;
  auto_detect_workflow: boolean;
  min_checklist_items: number;
  min_test_items: number;
  allow_custom_workflows: boolean;
  max_override_per_day: number;
}

const DEFAULT_SETTINGS: GlobalSettings = {
  default_workflow: 'feature_development',
  validation_strictness: 'moderate',
  allow_emergency_bypass: true,
  require_workflow_selection: false,
  auto_detect_workflow: true,
  min_checklist_items: 3,
  min_test_items: 2,
  allow_custom_workflows: true,
  max_override_per_day: 5
};

export function GlobalSettings({ onBack }: GlobalSettingsProps) {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from API
  useEffect(() => {
    // Mock API call - replace with real API
    const loadedSettings = { ...DEFAULT_SETTINGS };
    setSettings(loadedSettings);
    setOriginalSettings(loadedSettings);
  }, []);

  // Track changes
  useEffect(() => {
    setIsDirty(JSON.stringify(settings) !== JSON.stringify(originalSettings));
  }, [settings, originalSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      setOriginalSettings(settings);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const handleRevert = () => {
    setSettings(originalSettings);
  };

  return (
    <div className="p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            Global Workflow Settings
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Default Workflow */}
          <div className="space-y-4">
            <h3 className="font-medium">Default Settings</h3>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Default Workflow
              </label>
              <select
                value={settings.default_workflow}
                onChange={(e) => setSettings({ ...settings, default_workflow: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              >
                <option value="simple">Simple Task</option>
                <option value="feature_development">Feature Development</option>
                <option value="bugfix">Bug Fix</option>
                <option value="research">Research</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Default workflow for new tasks when not specified
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Validation Strictness
              </label>
              <select
                value={settings.validation_strictness}
                onChange={(e) => setSettings({ ...settings, validation_strictness: e.target.value as any })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              >
                <option value="strict">Strict - All requirements must be met</option>
                <option value="moderate">Moderate - Core requirements must be met</option>
                <option value="lenient">Lenient - Requirements are suggestions</option>
              </select>
            </div>
          </div>

          {/* Behavior Settings */}
          <div className="space-y-4">
            <h3 className="font-medium">Behavior</h3>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.allow_emergency_bypass}
                onChange={(e) => setSettings({ ...settings, allow_emergency_bypass: e.target.checked })}
                className="h-4 w-4"
              />
              <div>
                <span className="text-sm font-medium">Allow Emergency Bypass</span>
                <p className="text-xs text-muted-foreground">
                  Users can override validation in emergency situations
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.require_workflow_selection}
                onChange={(e) => setSettings({ ...settings, require_workflow_selection: e.target.checked })}
                className="h-4 w-4"
              />
              <div>
                <span className="text-sm font-medium">Require Workflow Selection</span>
                <p className="text-xs text-muted-foreground">
                  Force users to explicitly choose a workflow
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.auto_detect_workflow}
                onChange={(e) => setSettings({ ...settings, auto_detect_workflow: e.target.checked })}
                className="h-4 w-4"
              />
              <div>
                <span className="text-sm font-medium">Auto-Detect Workflow</span>
                <p className="text-xs text-muted-foreground">
                  Suggest workflow based on task type and content
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.allow_custom_workflows}
                onChange={(e) => setSettings({ ...settings, allow_custom_workflows: e.target.checked })}
                className="h-4 w-4"
              />
              <div>
                <span className="text-sm font-medium">Allow Custom Workflows</span>
                <p className="text-xs text-muted-foreground">
                  Users can create and modify workflows
                </p>
              </div>
            </label>
          </div>

          {/* Limits */}
          <div className="space-y-4">
            <h3 className="font-medium">Requirements & Limits</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Min Checklist Items
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.min_checklist_items}
                  onChange={(e) => setSettings({ ...settings, min_checklist_items: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Min Test Items
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.min_test_items}
                  onChange={(e) => setSettings({ ...settings, min_test_items: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Max Override Per Day
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={settings.max_override_per_day}
                onChange={(e) => setSettings({ ...settings, max_override_per_day: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum validation overrides allowed per user per day (0 = unlimited)
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 border rounded-md bg-muted/30">
            <h4 className="font-medium mb-2">Current Configuration Summary</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Default workflow: <span className="font-medium">{settings.default_workflow}</span></li>
              <li>• Validation: <span className="font-medium">{settings.validation_strictness}</span></li>
              <li>• Emergency bypass: <span className="font-medium">{settings.allow_emergency_bypass ? 'Enabled' : 'Disabled'}</span></li>
              <li>• Minimum requirements: <span className="font-medium">{settings.min_checklist_items} checklist, {settings.min_test_items} test items</span></li>
              {settings.max_override_per_day > 0 && (
                <li>• Max overrides per day: <span className="font-medium">{settings.max_override_per_day}</span></li>
              )}
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={JSON.stringify(settings) === JSON.stringify(DEFAULT_SETTINGS)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            {isDirty && (
              <Button
                variant="outline"
                onClick={handleRevert}
              >
                Revert Changes
              </Button>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}