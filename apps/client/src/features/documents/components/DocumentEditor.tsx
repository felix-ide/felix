import { useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import type { DocumentTab } from '@/types/components';
import { cn } from '@/utils/cn';
import { useTheme } from '@felix/theme-system';

interface DocumentEditorProps {
  tab?: DocumentTab;
  onContentChange: (content: string) => void;
  className?: string;
}

const getLanguageExtension = (language?: string) => {
  switch (language) {
    case 'markdown':
      return [markdown()];
    case 'javascript':
      return [javascript({ jsx: true })];
    case 'typescript':
      return [javascript({ jsx: true, typescript: true })];
    case 'json':
      return [json()];
    default:
      return [];
  }
};

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
  },
  '.cm-editor': {
    height: '100%',
  },
  '.cm-scroller': {
    fontFamily: '"JetBrains Mono", "Fira Code", "Monaco", "Cascadia Code", "Roboto Mono", monospace',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  '.cm-content': {
    padding: '16px',
    minHeight: '100%',
  },
  '.cm-focused': {
    outline: 'none',
  },
  '.cm-gutters': {
    backgroundColor: 'hsl(var(--muted))',
    borderRight: '1px solid hsl(var(--border))',
  },
  '.cm-lineNumbers': {
    color: 'hsl(var(--muted-foreground))',
  },
  '.cm-activeLine': {
    backgroundColor: 'hsl(var(--accent) / 0.1)',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'hsl(var(--accent) / 0.2)',
  },
});

export function DocumentEditor({ tab, onContentChange, className }: DocumentEditorProps) {
  const editorRef = useRef<any>(null);
  const { theme } = useTheme();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Integration stub: hook into document persistence when editor is re-enabled
        console.log('Save triggered');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!tab) {
    return (
      <div className={cn('flex items-center justify-center h-full bg-muted/20', className)}>
        <div className="text-center text-muted-foreground">
          <div className="text-lg mb-2">No document open</div>
          <div className="text-sm">Select a file from the file browser or create a new document</div>
        </div>
      </div>
    );
  }

  const extensions = [
    ...getLanguageExtension(tab.language),
    editorTheme,
    EditorView.lineWrapping,
    EditorState.tabSize.of(2),
  ];

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">{tab.title}</div>
          {tab.isDirty && (
            <div className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {tab.language?.toUpperCase() || 'TEXT'}
        </div>
      </div>

      {/* CodeMirror Editor */}
      <div className="flex-1 min-w-0">
        <CodeMirror
          ref={editorRef}
          value={tab.content}
          onChange={onContentChange}
          extensions={extensions}
          theme={theme?.type === 'dark' ? oneDark : undefined}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            highlightSelectionMatches: true,
            searchKeymap: true,
            tabSize: 2,
          }}
          height="100%"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
