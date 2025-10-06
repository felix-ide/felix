import { useEffect, useState } from 'react';
import { felixService } from '@/services/felixService';
import { Button } from '@client/shared/ui/Button';
import { Check, AlertTriangle, PlayCircle, RefreshCw, Rocket } from 'lucide-react';

interface TaskWhatsNextProps {
  taskId: string;
}

export function TaskWhatsNext({ taskId }: TaskWhatsNextProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<any | null>(null);
  const [status, setStatus] = useState<'idle'|'running'|'done'>('idle');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await felixService.getTaskSpecBundle(taskId, true);
      setBundle(res.bundle);
    } catch (e:any) {
      setError(e.message || 'Failed to load spec bundle');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [taskId]);

  const addMinimalNotesAndChecklists = async () => {
    try {
      setStatus('running');
      const notes = [
        { title: 'Architecture', content: '```mermaid\nflowchart TD\n  A[Component A] --> B[Component B]\n```', noteType: 'documentation' as const },
        { title: 'ERD', content: '```mermaid\nerDiagram\n```', noteType: 'documentation' as const },
        { title: 'API Contract', content: '```yaml\nopenapi: 3.1.0\npaths: {}\n```', noteType: 'documentation' as const }
      ];
      for (const n of notes) {
        await felixService.addNote({ title: n.title, content: n.content, noteType: n.noteType, entity_links: [{ entity_type: 'task', entity_id: taskId }] });
      }
      await felixService.addTaskChecklist(taskId, 'Acceptance Criteria', [
        'Given [context], When [action], Then [outcome]',
        'Given [alt], When [action], Then [edge case]',
        'Given [state], When [negative], Then [denied]'
      ]);
      await felixService.addTaskChecklist(taskId, 'Test Verification', [ 'Unit: add tests', 'Integration: happy path' ]);
      await felixService.addTaskChecklist(taskId, 'Implementation Checklist', [ 'Data model', 'API routes + validation', 'UI states' ]);
      await load();
    } catch (e:any) {
      setError(e.message || 'Failed to add minimal spec');
    } finally {
      setStatus('idle');
    }
  };

  const validateAndMarkReady = async () => {
    try {
      setStatus('running');
      await felixService.validateWorkflow({ id: taskId } as any);
      await felixService.setTaskSpecState(taskId, 'spec_ready');
      await load();
      setStatus('done');
    } catch (e:any) {
      setError(e.message || 'Validation failed');
      setStatus('idle');
    }
  };

  const checkAndStartWork = async () => {
    try {
      setStatus('running');
      // Require spec_ready in bundle
      if (bundle?.task?.spec_state !== 'spec_ready') {
        setError('Spec is not ready. Complete validation and set spec_state=spec_ready first.');
        setStatus('idle');
        return;
      }
      // Check blocking dependencies
      const deps = await felixService.getTaskDependencies(taskId);
      const blockers = (deps.outgoing || []).filter(d => d.dependency_type === 'blocks' && d.required);
      const unresolved: Array<{ id: string; title?: string; status?: string }> = [];
      for (const b of blockers) {
        const t = await felixService.getTask(b.dependency_task_id);
        if (!t || (t.task_status !== 'done' && t.task_status !== 'cancelled')) {
          unresolved.push({ id: b.dependency_task_id, title: (b as any).dependency_task_name, status: t?.task_status });
        }
      }
      if (unresolved.length) {
        setError(`Cannot start: blocking dependencies not completed: ${unresolved.map(u => `${u.title || u.id}${u.status?` [${u.status}]`:''}`).join(', ')}`);
        setStatus('idle');
        return;
      }
      // Optional pre-hook
      try {
        (window as any).__FELIX_HOOKS?.onStartWork?.(bundle);
      } catch (error) {
        console.error('[Felix] Task start hook failed', error);
      }
      // Update status to in_progress (server validates gates too)
      await felixService.updateTask(taskId, { taskStatus: 'in_progress' });
      // Post event for external integrations
      try {
        window.dispatchEvent(new CustomEvent('task-started', { detail: { taskId, at: new Date().toISOString() } }));
      } catch (error) {
        console.error('[Felix] Failed to dispatch task-started event', error);
      }
      await load();
      setStatus('done');
    } catch (e:any) {
      setError(e.message || 'Failed to start work');
      setStatus('idle');
    }
  };

  return (
    <div className="border border-border rounded-md p-3 bg-card/50">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">What’s Next</div>
        <Button size="sm" variant="ghost" onClick={load} title="Refresh">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
      {error && (
        <div className="text-xs text-destructive flex items-center gap-1 mb-2">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </div>
      )}
      {bundle && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium">Validation:</span>
            <span className={bundle.validation?.is_valid ? 'text-green-600' : 'text-orange-600'}>
              {bundle.validation?.is_valid ? 'Ready' : `Missing items (${Math.round(bundle.validation?.completion_percentage || 0)}%)`}
            </span>
          </div>
          {bundle.guidance?.ai_guide?.stepper_flows?.spec_prep && (
            <div>
              <div className="font-medium mb-1">Spec Prep Steps</div>
              <ol className="list-decimal ml-4 space-y-1">
                {bundle.guidance.ai_guide.stepper_flows.spec_prep.steps.map((s: any, idx: number) => (
                  <li key={idx}><code>{s.tool}.{s.action}</code></li>
                ))}
              </ol>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" onClick={addMinimalNotesAndChecklists} disabled={status==='running'}>
              <PlayCircle className="h-3.5 w-3.5 mr-1" /> Add minimal spec
            </Button>
            <Button size="sm" variant="secondary" onClick={validateAndMarkReady} disabled={status==='running'}>
              <Check className="h-3.5 w-3.5 mr-1" /> Validate & mark ready
            </Button>
            <Button size="sm" variant="default" onClick={checkAndStartWork} disabled={status==='running' || bundle?.task?.spec_state !== 'spec_ready'} title={bundle?.task?.spec_state !== 'spec_ready' ? 'Spec not ready' : 'Start work'}>
              <Rocket className="h-3.5 w-3.5 mr-1" /> Start work
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
