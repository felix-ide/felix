import { useEffect, useState } from 'react';
import { felixService } from '@/services/felixService';

interface StatusOption {
  value: string;
  label: string;
}

/**
 * Hook to fetch available statuses for a workflow
 */
export function useWorkflowStatuses(workflow?: string): StatusOption[] {
  const [statuses, setStatuses] = useState<StatusOption[]>([
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'done', label: 'Done' },
    { value: 'cancelled', label: 'Cancelled' },
  ]);

  useEffect(() => {
    if (!workflow || workflow === 'simple') {
      // Use default statuses for simple workflow
      setStatuses([
        { value: 'todo', label: 'To Do' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'blocked', label: 'Blocked' },
        { value: 'done', label: 'Done' },
        { value: 'cancelled', label: 'Cancelled' },
      ]);
      return;
    }

    // Fetch the workflow definition to get its status flow
    felixService
      .getWorkflow(workflow)
      .then((workflowDef) => {
        if (!workflowDef) {
          return;
        }

        let statusIds: string[] = [];

        // Check if workflow has status_flow with states
        if (workflowDef.status_flow?.states) {
          statusIds = workflowDef.status_flow.states;
        }
        // Check if workflow has status_flow_ref
        else if (workflowDef.status_flow_ref) {
          // Need to fetch the status flow by ref
          felixService.getWorkflowStatusFlows().then((result) => {
            const flow = result.flows.find((f: any) => f.id === workflowDef.status_flow_ref);
            if (flow && flow.status_ids) {
              const options = flow.status_ids.map((id: string) => ({
                value: id,
                label: formatStatusLabel(id),
              }));
              setStatuses(options);
            }
          }).catch((error) => {
            console.error('[Felix] Failed to load status flow:', error);
          });
          return;
        }

        if (statusIds.length > 0) {
          const options = statusIds.map((id) => ({
            value: id,
            label: formatStatusLabel(id),
          }));
          setStatuses(options);
        }
      })
      .catch((error) => {
        console.error('[Felix] Failed to load workflow statuses:', error);
      });
  }, [workflow]);

  return statuses;
}

function formatStatusLabel(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
