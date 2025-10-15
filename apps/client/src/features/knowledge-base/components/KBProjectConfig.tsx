import { useState, useEffect } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Alert, AlertDescription } from '@client/shared/ui/Alert';
import { X, Settings } from 'lucide-react';
import { KBConfigForm } from './KBConfigForm';
import type { KBConfigField } from '../api/knowledgeBaseApi';

interface KBProjectConfigProps {
  kbId: string;
  configSchema: KBConfigField[];
  existingConfig?: Record<string, any>;
  onSave: (config: Record<string, any>) => Promise<void>;
  isSaving?: boolean;
}

export function KBProjectConfig({
  kbId,
  configSchema,
  existingConfig = {},
  onSave,
  isSaving = false
}: KBProjectConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<Record<string, any>>(existingConfig);
  const [error, setError] = useState<string | null>(null);

  // Update config when existingConfig changes
  useEffect(() => {
    setConfig(existingConfig);
  }, [existingConfig]);

  const handleSave = async () => {
    try {
      setError(null);
      await onSave(config);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  };

  const hasExistingConfig = Object.keys(existingConfig).length > 0;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant={hasExistingConfig ? 'outline' : 'default'}
        size="sm"
      >
        <Settings className="w-4 h-4 mr-2" />
        {hasExistingConfig ? 'Update Configuration' : 'Configure Project'}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
          <div className="bg-background rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Project Configuration</h2>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure your project's baseline information. This will automatically update the associated rules with the correct values.
              </p>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <KBConfigForm
                configSchema={configSchema}
                initialValues={existingConfig}
                onChange={setConfig}
              />

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
