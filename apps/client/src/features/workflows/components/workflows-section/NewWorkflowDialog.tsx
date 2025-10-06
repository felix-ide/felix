import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';

interface NewWorkflowDialogProps {
  visible: boolean;
  name: string;
  onNameChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
}

export function NewWorkflowDialog({ visible, name, onNameChange, onClose, onCreate }: NewWorkflowDialogProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl border border-border max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Workflow</h3>
          <div className="space-y-4">
            <div>
              <Input
                label="Workflow Name"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="e.g., Feature Development"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onCreate();
                  if (event.key === 'Escape') onClose();
                }}
              />
              <p className="text-xs text-muted-foreground mt-2">This will be converted to snake_case automatically</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 pb-6">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onCreate} disabled={!name.trim()}>
            Create Workflow
          </Button>
        </div>
      </div>
    </div>
  );
}
