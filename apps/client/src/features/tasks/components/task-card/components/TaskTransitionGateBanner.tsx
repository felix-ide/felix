import { AlertCircle, CheckSquare, ClipboardCheck } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { cn } from '@/utils/cn';

interface TaskTransitionGateBannerProps {
  gate: any;
  message: string;
  loading?: boolean;
  onAcknowledge: () => void;
  onDismiss?: () => void;
}

export function TaskTransitionGateBanner({
  gate,
  message,
  loading,
  onAcknowledge,
  onDismiss
}: TaskTransitionGateBannerProps) {
  const bundleResults = gate?.bundle_results as any[] | undefined;
  const token = gate?.gate?.issued_token ?? gate?.issued_token;
  const prompt = gate?.prompt || gate?.gate?.prompt;

  return (
    <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-300 mt-0.5" />
        <div className="flex-1 space-y-3">
          <div>
            <p className="font-medium text-sm text-amber-900 dark:text-amber-100">
              {message}
            </p>
            {prompt && (
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-2 whitespace-pre-wrap">
                {prompt}
              </p>
            )}
            {token && (
              <p className="text-xs text-muted-foreground mt-2">
                Gate Token: <code className="px-1 py-0.5 bg-background border rounded">{token}</code>
              </p>
            )}
          </div>

          {bundleResults && bundleResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-amber-900 dark:text-amber-100">Required bundles</p>
              <div className="space-y-1">
                {bundleResults.map((bundle, idx) => (
                  <div key={idx} className="rounded-md border border-amber-200 dark:border-amber-800 bg-white/60 dark:bg-amber-900/30 p-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-100">
                      <CheckSquare className="h-4 w-4" />
                      {bundle.bundle_name || bundle.bundle_id || `Bundle ${idx + 1}`}
                    </div>
                    {Array.isArray(bundle.missing_requirements) && bundle.missing_requirements.length > 0 && (
                      <ul className="mt-1 ml-6 list-disc space-y-0.5 text-xs text-amber-800 dark:text-amber-200">
                        {bundle.missing_requirements.map((req: any, reqIdx: number) => (
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

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-2"
              disabled={loading}
              onClick={onAcknowledge}
            >
              <ClipboardCheck className="h-4 w-4" />
              Acknowledge Transition
            </Button>
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                disabled={loading}
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
