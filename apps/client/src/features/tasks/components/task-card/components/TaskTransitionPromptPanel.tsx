import { Lightbulb, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface TaskTransitionPromptPanelProps {
  prompt: string;
  bundleResults?: Array<{
    bundle_name?: string;
    bundle_id?: string;
    is_valid?: boolean;
    missing_requirements?: Array<{
      section_type: string;
      action_needed: string;
    }>;
    completed_requirements?: string[];
  }>;
  className?: string;
}

export function TaskTransitionPromptPanel({
  prompt,
  bundleResults,
  className
}: TaskTransitionPromptPanelProps) {
  return (
    <div className={cn(
      'mb-3 rounded-lg border border-primary/20 bg-primary/5 p-4',
      'dark:border-primary/40 dark:bg-primary/10',
      className
    )}>
      <div className="flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1 space-y-3">
          <p className="text-sm text-primary-foreground/80 dark:text-primary-foreground/90 whitespace-pre-wrap">
            {prompt}
          </p>

          {bundleResults && bundleResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-primary/80">Validation bundles</p>
              <div className="space-y-2">
                {bundleResults.map((bundle, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-primary/20 dark:border-primary/30 bg-background/60 p-2"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-primary/80">
                      <CheckCircle2 className={cn('h-4 w-4', bundle.is_valid ? 'text-emerald-500' : 'text-amber-500')} />
                      {bundle.bundle_name || bundle.bundle_id || `Bundle ${idx + 1}`}
                    </div>
                    {Array.isArray(bundle.missing_requirements) && bundle.missing_requirements.length > 0 && (
                      <ul className="mt-1 ml-6 list-disc space-y-0.5 text-xs text-muted-foreground">
                        {bundle.missing_requirements.map((req, reqIdx) => (
                          <li key={reqIdx}>
                            <span className="font-medium">{req.section_type}:</span> {req.action_needed}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
