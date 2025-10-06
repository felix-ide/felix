import { DocumentPreview } from '../../previews/DocumentPreview';

interface TaskDocumentsSectionProps {
  notes: any[];
  expandedDocId: string | null;
  onToggleDocument: (noteId: string | null) => void;
}

export function TaskDocumentsSection({ notes, expandedDocId, onToggleDocument }: TaskDocumentsSectionProps) {
  if (!notes.length) return null;

  const mapNoteType = (note: any): 'document' | 'excalidraw' | 'mermaid' => {
    if (note.note_type === 'excalidraw') return 'excalidraw';
    if (note.note_type === 'mermaid') return 'mermaid';
    return 'document';
  };

  return (
    <div className="bg-muted/30 rounded-lg p-3 mb-4">
      <h4 className="text-xs font-medium text-muted-foreground mb-2">📎 Attached Documents</h4>
      <div className="space-y-2">
        {notes.map((note) => {
          const isExpanded = expandedDocId === note.id;
          return (
            <div key={note.id} className="relative">
              <DocumentPreview
                content={note.content}
                type={mapNoteType(note)}
                title={note.title || 'Untitled'}
                size={isExpanded ? 'lg' : 'sm'}
                onExpand={() => onToggleDocument(isExpanded ? null : note.id)}
                metadata={{
                  fileName: `${note.note_type}: ${note.id}`,
                  createdAt: note.created_at,
                  updatedAt: note.updated_at,
                }}
                className={isExpanded ? 'w-full aspect-[4/3]' : 'w-full aspect-square h-32'}
                showExpandButton
                showOverlayButton
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
