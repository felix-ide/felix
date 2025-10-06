import { useState, useEffect } from 'react';
import { FileText, Image, Code, GitBranch, Calendar, User, Tag, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';
import { DocumentPreview } from '../previews/DocumentPreview';
import { cn } from '@/utils/cn';
import { felixService } from '@/services/felixService';
import type { TaskData, NoteData } from '@/types/api';
import type { ViewType } from '../views/shared/ViewSwitcher';

interface DocumentationSlideProps {
  slide: {
    task: TaskData;
    documentationNote?: NoteData;
    index: number;
    totalSlides: number;
  };
  view: ViewType;
  showTimeline?: boolean;
  className?: string;
}

export function DocumentationSlide({
  slide,
  view,
  showTimeline = false,
  className
}: DocumentationSlideProps) {
  const { task } = slide;
  const [linkedNotes, setLinkedNotes] = useState<NoteData[]>([]);

  // Load linked notes
  useEffect(() => {
    const loadLinkedNotes = async () => {
      if (!task.entity_links?.length) {
        setLinkedNotes([]);
        return;
      }

      try {
        const noteLinks = task.entity_links.filter(link => 
          link.entity_type === 'note'
        );

        const notes = await Promise.all(
          noteLinks.map(async (link) => {
            try {
              const note = await felixService.getNote(link.entity_id);
              return note;
            } catch (err) {
              console.error(`Failed to load note ${link.entity_id}:`, err);
              return null;
            }
          })
        );

        setLinkedNotes(notes.filter(Boolean) as NoteData[]);
      } catch (err) {
        console.error('Failed to load linked notes:', err);
      } finally {
        // no-op
      }
    };

    loadLinkedNotes();
  }, [task]);

  // Find documentation and diagram notes
  const docNotes = linkedNotes.filter(note => note.note_type === 'documentation');
  const diagramNotes = linkedNotes.filter(note => 
    note.note_type === 'excalidraw' || 
    (note.content && (note.content.includes('```mermaid') || note.content.includes('```excalidraw')))
  );

  // Extract diagrams from content
  const extractDiagrams = (content: string) => {
    const diagrams: Array<{ type: 'mermaid' | 'excalidraw'; content: string; title?: string }> = [];
    
    // Extract Mermaid diagrams
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    let match;
    while ((match = mermaidRegex.exec(content)) !== null) {
      diagrams.push({
        type: 'mermaid',
        content: match[1].trim(),
        title: 'Mermaid Diagram'
      });
    }

    // Extract Excalidraw diagrams
    const excalidrawRegex = /```excalidraw\n([\s\S]*?)```/g;
    while ((match = excalidrawRegex.exec(content)) !== null) {
      try {
        JSON.parse(match[1]); // Validate JSON
        diagrams.push({
          type: 'excalidraw',
          content: match[1].trim(),
          title: 'Excalidraw Diagram'
        });
      } catch (e) {
        // Invalid JSON, skip
      }
    }

    return diagrams;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-primary" />;
      case 'blocked': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-destructive';
      case 'high': return 'text-warning';
      case 'medium': return 'text-warning';
      case 'low': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn('h-full flex gap-6', className)}>
      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Task header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">{task.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {getStatusIcon(task.task_status)}
                    <span className="capitalize">{task.task_status.replace('_', ' ')}</span>
                  </div>
                  <div className={cn('flex items-center gap-1', getPriorityColor(task.task_priority))}>
                    <span className="capitalize">{task.task_priority} Priority</span>
                  </div>
                  {task.task_type && (
                    <div className="flex items-center gap-1">
                      <Code className="h-4 w-4" />
                      <span className="capitalize">{task.task_type}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Task metadata */}
              <div className="text-right space-y-1 text-sm text-muted-foreground">
                {task.assigned_to && (
                  <div className="flex items-center gap-1 justify-end">
                    <User className="h-4 w-4" />
                    <span>{task.assigned_to}</span>
                  </div>
                )}
                {task.due_date && (
                  <div className="flex items-center gap-1 justify-end">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(task.due_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {task.stable_tags && task.stable_tags.length > 0 && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {task.stable_tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Task description */}
          {task.description && (
            <div className="prose prose-sm  max-w-none">
              <MarkdownRenderer content={task.description} />
            </div>
          )}

          {/* Documentation notes */}
          {docNotes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentation
              </h2>
              {docNotes.map((note) => (
                <div key={note.id} className="bg-muted/30 rounded-lg p-4">
                  {note.title && <h3 className="text-lg font-medium mb-2">{note.title}</h3>}
                  <MarkdownRenderer content={note.content} />
                </div>
              ))}
            </div>
          )}

          {/* Diagrams */}
          {diagramNotes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Image className="h-5 w-5" />
                Diagrams
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diagramNotes.map((note) => {
                  const diagrams = extractDiagrams(note.content);
                  return diagrams.map((diagram, index) => (
                    <DocumentPreview
                      key={`${note.id}-${index}`}
                      content={diagram.content}
                      type={diagram.type}
                      title={note.title || diagram.title}
                      size="lg"
                    />
                  ));
                })}
              </div>
            </div>
          )}

          {/* Inline task view (if timeline is shown) */}
          {showTimeline && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Task Timeline
              </h2>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-center text-sm text-muted-foreground p-8">
                  {/* Timeline view would show here with task: {task.title} */}
                  <p>Task timeline visualization for: <strong>{task.title}</strong></p>
                  <p className="mt-2">View mode: {view}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar with previews */}
      {(diagramNotes.length > 0 || linkedNotes.length > 0) && (
        <div className="w-80 flex-shrink-0 overflow-y-auto border-l pl-6">
          <div className="space-y-6">
            {/* Quick previews */}
            <div>
              <h3 className="text-sm font-medium mb-3">Quick Preview</h3>
              <div className="space-y-3">
                {diagramNotes.slice(0, 3).map((note) => {
                  const diagrams = extractDiagrams(note.content);
                  return diagrams.slice(0, 1).map((diagram, index) => (
                    <DocumentPreview
                      key={`${note.id}-preview-${index}`}
                      content={diagram.content}
                      type={diagram.type}
                      title={note.title}
                      size="sm"
                      showExpandButton={false}
                    />
                  ));
                })}
              </div>
            </div>

            {/* Related notes */}
            {linkedNotes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Related Notes</h3>
                <div className="space-y-2">
                  {linkedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {note.title || 'Untitled Note'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {note.note_type}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
