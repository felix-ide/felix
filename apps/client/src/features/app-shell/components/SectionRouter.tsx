import { useAppStore } from '@client/features/app-shell/state/appStore';
import { ServerLogSection } from '@client/features/app-shell/components/ServerLogSection';
import { ExploreSection } from '@client/features/search/components/ExploreSection';
import { NotesSection } from '@client/features/notes/components/NotesSection';
import { TasksSection } from '@client/features/tasks/components/TasksSection';
import { RulesSection } from '@client/features/rules/components/RulesSection';
import { WorkflowsSection } from '@client/features/workflows/components/WorkflowsSection';
import { ActivitySection } from '@client/features/app-shell/components/ActivitySection';

export function SectionRouter() {
  const { currentSection } = useAppStore();

  switch (currentSection) {
    case 'server-log':
      return <ServerLogSection />;
    case 'explore':
      return <ExploreSection />;
    case 'notes':
      return <NotesSection />;
    case 'tasks':
      return <TasksSection />;
    case 'rules':
      return <RulesSection />;
    case 'workflows':
      return <WorkflowsSection />;
    case 'activity':
      return <ActivitySection />;
    default:
      return <ExploreSection />;
  }
}
