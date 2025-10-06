import { BookOpen, Database, FileText, ListTodo, CheckSquare, Wrench } from 'lucide-react';
import { useTheme } from '@felix/theme-system';
import type { StrictStatus } from '../hooks/useTaskCardData';
import type { ValidationStatus } from '@client/features/tasks/hooks/useTaskValidation';

interface TaskWorkflowGatesProps {
  strictStatus: StrictStatus | null;
  validation: ValidationStatus;
}

const GATE_CONFIG = [
  { section: 'architecture', title: 'Architecture (mermaid)', Icon: BookOpen },
  { section: 'erd', title: 'ERD (erDiagram)', Icon: Database },
  { section: 'api_contract', title: 'API Contract (OpenAPI 3.1)', Icon: FileText },
  { section: 'acceptance_criteria', title: 'Acceptance Criteria (Gherkin)', Icon: ListTodo },
  { section: 'test_verification', title: 'Test Verification (unit + integration/e2e)', Icon: CheckSquare },
  { section: 'implementation_checklist', title: 'Implementation Checklist (3+ items)', Icon: Wrench },
] as const;

export function TaskWorkflowGates({ strictStatus, validation }: TaskWorkflowGatesProps) {
  const missing = strictStatus?.missing ?? new Set<string>();

  return (
    <div className="flex items-center gap-1 mb-2">
      {GATE_CONFIG.map(({ section, title, Icon }) => {
        const ok = strictStatus ? !missing.has(section) : validation.isValid;
        return <GateBadge key={section} ok={ok} title={title} Icon={Icon} />;
      })}
    </div>
  );
}

function GateBadge({ ok, title, Icon }: { ok: boolean; title: string; Icon: any }) {
  const { theme } = useTheme();
  const key = title.toLowerCase();
  const category = key.includes('acceptance')
    ? 'warning'
    : key.includes('test')
      ? 'success'
      : key.includes('api')
        ? 'primary'
        : key.includes('erd')
          ? 'info'
          : key.includes('architecture')
            ? 'accent'
            : 'secondary';

  const shade = theme.type === 'dark' ? 400 : 700;
  const categoryScale = (theme.colors as any)[category] || {};
  const categoryColor = categoryScale[shade] || categoryScale[500] || theme.colors.foreground.secondary;
  const darkBase = theme.colors.background.tertiary || theme.colors.background.secondary;
  const backgroundColor = theme.type === 'dark' ? `${darkBase}73` : ok ? theme.colors.success[50] : theme.colors.error[50];
  const borderColor = ok ? theme.colors.success[200] : theme.colors.error[200];

  return (
    <div
      className="inline-flex items-center gap-1 px-1 py-0.5 rounded border text-[10px]"
      style={{ backgroundColor, borderColor, color: categoryColor }}
      title={title}
    >
      <Icon className="h-3 w-3" />
    </div>
  );
}
