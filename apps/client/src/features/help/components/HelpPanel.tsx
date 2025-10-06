import { useEffect, useState } from 'react';
import { X, Info } from 'lucide-react';
import { felixService } from '@/services/felixService';
import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';

interface HelpPanelProps {
  section: 'tasks'|'workflows'|'notes'|'checklists'|'spec';
  isOpen: boolean;
  onClose: () => void;
}

export function HelpPanel({ section, isOpen, onClose }: HelpPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pack, setPack] = useState<{ human_md: string; ai_guide: any } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    felixService.getHelp(section)
      .then((res) => { setPack({ human_md: res.human_md, ai_guide: res.ai_guide }); setError(null); })
      .catch((e) => setError(e.message || 'Failed to load help'))
      .finally(() => setLoading(false));
  }, [isOpen, section]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold capitalize">{section} Help</h3>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-accent rounded-lg p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                <div className="text-sm text-muted-foreground">Loading help content...</div>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}
          {pack && (
            <div className="space-y-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownRenderer content={pack.human_md} />
              </div>
              {pack.ai_guide && (
                <details className="border border-border rounded-lg">
                  <summary className="px-4 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors text-sm font-medium">
                    AI Guide Details
                  </summary>
                  <div className="p-4">
                    <pre className="bg-muted p-3 rounded-lg overflow-auto text-xs font-mono">{JSON.stringify({
                      state_machine: pack.ai_guide?.state_machine,
                      validation_gates: pack.ai_guide?.validation_gates,
                      stepper_flows: Object.keys(pack.ai_guide?.stepper_flows || {}).slice(0, 3)
                    }, null, 2)}</pre>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

