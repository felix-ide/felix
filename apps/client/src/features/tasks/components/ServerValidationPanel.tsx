import { useEffect, useState } from 'react';
import { felixService } from '@/services/felixService';
import { Button } from '@client/shared/ui/Button';

export function ServerValidationPanel({ task, workflow }: { task: any; workflow?: string }) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!task) return;
    setLoading(true);
    felixService.validateWorkflow(task, workflow)
      .then(setResult)
      .catch(()=>setResult(null))
      .finally(()=>setLoading(false));
  }, [task?.title, task?.description, JSON.stringify(task?.entity_links||[]), workflow]);

  const handlePlanSubtasks = async () => {
    if (!task?.id || !workflow) return;
    const p = await felixService.scaffoldWorkflow(workflow, task.id, { sections: ['subtasks'], dry_run: true });
    setPlan(p);
  };

  const handleCreateSubtasks = async () => {
    if (!task?.id || !workflow || !plan?.templates?.subtasks) return;
    await felixService.scaffoldWorkflow(workflow, task.id, {
      sections: ['subtasks'],
      dry_run: false,
      stubs: plan.templates.subtasks
    });
    await handlePlanSubtasks();
  };

  // Helpers to handle checklist insertion
  const insertChecklist = async (name: string, items: string[]) => {
    if (!task?.id) return;
    setBusy(true);
    try {
      await felixService.addTaskChecklist(task.id, name, items);
      // Revalidate after write
      const r = await felixService.validateWorkflow(task, workflow);
      setResult(r);
    } finally {
      setBusy(false);
    }
  };

  // Helpers to create a note with template and link
  const createTemplateNote = async (section: string) => {
    if (!task?.id) return;
    setBusy(true);
    try {
      const templates: any = {
        architecture: {
          title: `Architecture for: ${task.title}`,
          content: '```mermaid\nflowchart LR\n  A[Start] --> B[Implement]\n```',
          noteType: 'documentation'
        },
        mockups: {
          title: `Mockups for: ${task.title}`,
          content: '{"type":"excalidraw","elements":[]}',
          noteType: 'excalidraw'
        },
        root_cause_analysis: {
          title: `Root Cause Analysis: ${task.title}`,
          content: 'Root cause:\n\nImpact:\n\nFix plan:\n',
          noteType: 'note'
        },
        findings_documentation: {
          title: `Findings: ${task.title}`,
          content: 'Key findings:\n\nEvidence:\n\nImplications:\n',
          noteType: 'documentation'
        },
        conclusions: {
          title: `Conclusions: ${task.title}`,
          content: 'Conclusions:\n\nRecommendations:\n',
          noteType: 'note'
        },
        rules_creation: {
          title: `Proposed Rules: ${task.title}`,
          content: '- Describe best practices\n- Consider automation\n- Add validation rules',
          noteType: 'note'
        }
      };
      const t = templates[section];
      if (!t) return;
      await felixService.addNote({
        title: t.title,
        content: t.content,
        noteType: t.noteType,
        entity_links: [{ entity_type: 'task', entity_id: task.id, link_strength: 'primary' }]
      });
      const r = await felixService.validateWorkflow(task, workflow);
      setResult(r);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Validating…</div>;
  if (!result) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm">Server validation: {Math.round(result.completion_percentage)}% complete</div>
      {result.missing_requirements?.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-medium">Missing:</div>
          <ul className="list-disc pl-5 text-sm">
            {result.missing_requirements.map((r: any, i: number) => (
              <li key={i} className="mb-1">
                <div>{r.action_needed || r.description || r.section_type}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {/* Checklist actions */}
                  {['implementation_checklist','test_checklist','reproduction_steps','test_verification','regression_testing','research_goals','next_steps'].includes(r.section_type) && (
                    <Button disabled={busy} size="sm" variant="secondary" onClick={() => {
                      const defaults: any = {
                        implementation_checklist: ['Implement core changes','Update related files','Run lint & build'],
                        test_checklist: ['Add unit tests','Add integration tests','Verify edge cases'],
                        reproduction_steps: ['Describe environment','Steps to reproduce','Expected vs actual'],
                        test_verification: ['All tests passing','Manual verification','QA sign-off'],
                        regression_testing: ['Define regression scope','Execute suite','Record results'],
                        research_goals: ['Define questions','Outline scope','Identify resources'],
                        next_steps: ['Prioritize actions','Create follow-up tasks','Schedule reviews']
                      };
                      const names: any = {
                        implementation_checklist: 'Implementation',
                        test_checklist: 'Tests',
                        reproduction_steps: 'Reproduction Steps',
                        test_verification: 'Test Verification',
                        regression_testing: 'Regression Testing',
                        research_goals: 'Research Goals',
                        next_steps: 'Next Steps'
                      };
                      insertChecklist(names[r.section_type], defaults[r.section_type] || ['Item 1','Item 2']);
                    }}>Insert checklist</Button>
                  )}
                  {/* Note actions */}
                  {['architecture','mockups','root_cause_analysis','findings_documentation','conclusions','rules_creation'].includes(r.section_type) && (
                    <Button disabled={busy} size="sm" onClick={() => createTemplateNote(r.section_type)}>Create note with template</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={handlePlanSubtasks}>Plan subtasks</Button>
            {plan?.templates?.subtasks?.length > 0 && (
              <Button onClick={handleCreateSubtasks}>Create suggested subtasks</Button>
            )}
          </div>
          {plan?.templates?.checklists && (
            <div className="text-xs text-muted-foreground">Checklists plan: {Object.keys(plan.templates.checklists).join(', ')}</div>
          )}
          {plan?.templates?.notes && (
            <div className="text-xs text-muted-foreground">Notes plan: {Object.keys(plan.templates.notes).join(', ')}</div>
          )}
        </div>
      )}
    </div>
  );
}
