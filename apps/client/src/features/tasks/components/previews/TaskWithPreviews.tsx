import { DocumentPreview } from './DocumentPreview';
import { Card } from '@client/shared/ui/Card';
import { CheckSquare, Paperclip } from 'lucide-react';

interface Attachment {
  id: string;
  type: 'mermaid' | 'excalidraw' | 'image' | 'document';
  content: string;
  title: string;
  metadata?: {
    fileName?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

interface TaskWithPreviewsProps {
  task: {
    id: string;
    name: string;
    description: string;
    status: string;
    attachments?: Attachment[];
  };
}

// Example of how to integrate document previews with tasks
export function TaskWithPreviews({ task }: TaskWithPreviewsProps) {
  // Extract Mermaid diagrams from markdown content
  const extractDiagramsFromMarkdown = (content: string): Attachment[] => {
    const diagrams: Attachment[] = [];
    
    // Find mermaid code blocks
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    let match;
    let index = 0;
    
    while ((match = mermaidRegex.exec(content)) !== null) {
      diagrams.push({
        id: `mermaid-${index}`,
        type: 'mermaid',
        content: match[1].trim(),
        title: `Diagram ${index + 1}`
      });
      index++;
    }
    
    // Find excalidraw blocks (if stored as JSON in markdown)
    const excalidrawRegex = /```excalidraw\n([\s\S]*?)```/g;
    index = 0;
    
    while ((match = excalidrawRegex.exec(content)) !== null) {
      try {
        const jsonContent = match[1].trim();
        JSON.parse(jsonContent); // Validate JSON
        diagrams.push({
          id: `excalidraw-${index}`,
          type: 'excalidraw',
          content: jsonContent,
          title: `Mockup ${index + 1}`
        });
        index++;
      } catch (e) {
        // Invalid JSON, skip
      }
    }
    
    return diagrams;
  };

  const embeddedDiagrams = extractDiagramsFromMarkdown(task.description);
  const allAttachments = [...(task.attachments || []), ...embeddedDiagrams];

  return (
    <Card className="p-4 space-y-4">
      {/* Task Header */}
      <div className="flex items-start gap-3">
        <CheckSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold">{task.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {task.description.replace(/```(mermaid|excalidraw)[\s\S]*?```/g, '[Diagram]')}
          </p>
        </div>
      </div>

      {/* Attachments Section */}
      {allAttachments.length > 0 && (
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Paperclip className="h-4 w-4" />
            <span>Attachments ({allAttachments.length})</span>
          </div>
          
          {/* Preview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allAttachments.map((attachment) => (
              <DocumentPreview
                key={attachment.id}
                content={attachment.content}
                type={attachment.type}
                title={attachment.title}
                size="sm"
                metadata={attachment.metadata}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// Example usage in a task list
export function TaskListWithPreviews() {
  const exampleTasks = [
    {
      id: '1',
      name: 'Design System Architecture',
      description: `Create the overall system architecture.
      
\`\`\`mermaid
graph TD
    A[Frontend] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[Data Service]
    D --> E[(Database)]
\`\`\`

The architecture should be scalable and maintainable.`,
      status: 'in_progress',
      attachments: [
        {
          id: 'img1',
          type: 'image' as const,
          content: '/path/to/screenshot.png',
          title: 'UI Screenshot',
          metadata: {
            fileName: 'ui-design.png',
            createdAt: new Date().toISOString()
          }
        }
      ]
    },
    {
      id: '2',
      name: 'Create UI Mockups',
      description: 'Design the user interface mockups for the dashboard.',
      status: 'todo',
      attachments: [
        {
          id: 'exc1',
          type: 'excalidraw' as const,
          content: JSON.stringify({
            elements: [
              {
                id: "rect1",
                type: "rectangle",
                x: 100,
                y: 100,
                width: 300,
                height: 200,
                backgroundColor: "#e9ecef",
                strokeColor: "#495057",
                strokeWidth: 2
              }
            ],
            appState: { viewBackgroundColor: "#ffffff" }
          }),
          title: 'Dashboard Mockup',
          metadata: {
            fileName: 'dashboard.excalidraw',
            updatedAt: new Date().toISOString()
          }
        }
      ]
    }
  ];

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-bold mb-4">Tasks with Document Previews</h2>
      {exampleTasks.map(task => (
        <TaskWithPreviews key={task.id} task={task} />
      ))}
    </div>
  );
}