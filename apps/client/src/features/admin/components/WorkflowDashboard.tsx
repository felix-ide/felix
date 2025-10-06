import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@client/shared/ui/Card';
import { Button } from '@client/shared/ui/Button';
import { Edit, Trash2, FileJson, Plus, Settings } from 'lucide-react';
import { cn } from '@/utils/cn';
import { WorkflowEditor } from './WorkflowEditor';
import { GlobalSettings } from './GlobalSettings';

interface WorkflowDefinition {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_default: boolean;
  required_sections: any[];
  usage_count?: number;
  last_used?: string;
}

interface WorkflowStats {
  total_tasks: number;
  by_workflow: Record<string, number>;
  completion_rates: Record<string, number>;
}

export function WorkflowDashboard() {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock data - replace with API calls
  useEffect(() => {
    // Load workflows
    const mockWorkflows: WorkflowDefinition[] = [
      {
        id: 'simple',
        name: 'simple',
        display_name: 'Simple Task',
        description: 'Basic task with minimal requirements',
        is_default: false,
        required_sections: [],
        usage_count: 156,
        last_used: new Date().toISOString()
      },
      {
        id: 'feature_development',
        name: 'feature_development',
        display_name: 'Feature Development',
        description: 'Full structured workflow for new features',
        is_default: true,
        required_sections: ['architecture', 'mockups', 'implementation_checklist', 'test_checklist', 'rules'],
        usage_count: 89,
        last_used: new Date().toISOString()
      },
      {
        id: 'bugfix',
        name: 'bugfix',
        display_name: 'Bug Fix',
        description: 'Structured approach for bug resolution',
        is_default: false,
        required_sections: ['reproduction_steps', 'root_cause', 'test_verification'],
        usage_count: 234,
        last_used: new Date().toISOString()
      },
      {
        id: 'research',
        name: 'research',
        display_name: 'Research',
        description: 'Structured research with findings documentation',
        is_default: false,
        required_sections: ['research_goals', 'findings', 'conclusions', 'next_steps'],
        usage_count: 45,
        last_used: new Date().toISOString()
      }
    ];

    const mockStats: WorkflowStats = {
      total_tasks: 524,
      by_workflow: {
        simple: 156,
        feature_development: 89,
        bugfix: 234,
        research: 45
      },
      completion_rates: {
        simple: 0.95,
        feature_development: 0.78,
        bugfix: 0.88,
        research: 0.92
      }
    };

    setWorkflows(mockWorkflows);
    setStats(mockStats);
    setLoading(false);
  }, []);

  const handleCreateWorkflow = () => {
    setIsCreating(true);
    setSelectedWorkflow(null);
  };

  const handleEditWorkflow = (workflow: WorkflowDefinition) => {
    setSelectedWorkflow(workflow);
    setIsEditing(true);
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      // API call to delete workflow
      setWorkflows(workflows.filter(w => w.id !== workflowId));
    }
  };

  const handleSaveWorkflow = async (workflow: WorkflowDefinition) => {
    // API call to save workflow
    if (isCreating) {
      setWorkflows([...workflows, { ...workflow, id: Date.now().toString() }]);
    } else {
      setWorkflows(workflows.map(w => w.id === workflow.id ? workflow : w));
    }
    setIsEditing(false);
    setIsCreating(false);
    setSelectedWorkflow(null);
  };

  const handleSetDefault = async (workflowId: string) => {
    // API call to set default workflow
    setWorkflows(workflows.map(w => ({
      ...w,
      is_default: w.id === workflowId
    })));
  };

  const handleExportWorkflows = () => {
    const data = JSON.stringify(workflows, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflows-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-4">Loading workflows...</div>;
  }

  if (isEditing || isCreating) {
    return (
      <WorkflowEditor
        workflow={selectedWorkflow || {
          id: '',
          name: '',
          display_name: '',
          description: '',
          is_default: false,
          required_sections: []
        }}
        isNew={isCreating}
        onSave={handleSaveWorkflow}
        onCancel={() => {
          setIsEditing(false);
          setIsCreating(false);
          setSelectedWorkflow(null);
        }}
      />
    );
  }

  if (showSettings) {
    return (
      <GlobalSettings
        onBack={() => setShowSettings(false)}
      />
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workflow Management</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportWorkflows}
          >
            <FileJson className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Global Settings
          </Button>
          <Button
            size="sm"
            onClick={handleCreateWorkflow}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Tasks</div>
            <div className="text-2xl font-bold">{stats.total_tasks}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Workflows</div>
            <div className="text-2xl font-bold">{workflows.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Avg Completion</div>
            <div className="text-2xl font-bold">
              {Math.round(
                Object.values(stats.completion_rates).reduce((a, b) => a + b, 0) / 
                Object.values(stats.completion_rates).length * 100
              )}%
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Most Used</div>
            <div className="text-2xl font-bold">
              {Object.entries(stats.by_workflow)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
            </div>
          </Card>
        </div>
      )}

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map(workflow => (
          <Card key={workflow.id} className={cn(
            'relative',
            workflow.is_default && 'ring-2 ring-primary'
          )}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{workflow.display_name}</span>
                {workflow.is_default && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                    Default
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {workflow.description}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Required sections:</span>
                  <span className="font-medium">{workflow.required_sections.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Usage:</span>
                  <span className="font-medium">{workflow.usage_count || 0} tasks</span>
                </div>
                {stats && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Completion rate:</span>
                    <span className="font-medium">
                      {Math.round((stats.completion_rates[workflow.name] || 0) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              {!workflow.is_default && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetDefault(workflow.id)}
                >
                  Set Default
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditWorkflow(workflow)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              {!workflow.is_default && workflow.usage_count === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteWorkflow(workflow.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}