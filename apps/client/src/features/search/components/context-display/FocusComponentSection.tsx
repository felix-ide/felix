import { useState } from 'react';
import { ChevronDown, ChevronRight, Code, Target } from 'lucide-react';
import { useTheme, getComponentStyles } from '@felix/theme-system';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { formatTypeLabel } from '@/utils/relationship-format';

interface FocusComponentSectionProps {
  component: any;
  visible?: boolean;
}

export function FocusComponentSection({ component, visible = true }: FocusComponentSectionProps) {
  const { theme } = useTheme();
  const [showSource, setShowSource] = useState(true);

  if (!component || !visible) return null;

  const componentType = String(component.type || '').toLowerCase();
  const componentStyle = theme ? getComponentStyles(theme, componentType) : {};

  const signature = component.metadata?.signature || component.signature || '';
  const rawSource = component.code || component.source || component.metadata?.skeleton || '';
  const language = component.language || 'typescript';
  const codeToRender = String(rawSource ?? '').trimEnd();

  // Get CodeMirror language extension
  const getLanguageExtension = () => {
    const lang = language.toLowerCase();
    if (lang === 'python') return python();
    if (lang.includes('javascript') || lang.includes('typescript') || lang === 'jsx' || lang === 'tsx') return javascript({ jsx: true, typescript: true });
    return javascript();
  };

  return (
    <div className="border-2 border-primary/40 rounded-md overflow-hidden bg-card/50 backdrop-blur mb-4 min-w-0">
      {/* Compact Header */}
      <div className="bg-primary/10 border-b border-primary/30 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <Target className="h-4 w-4 text-primary flex-shrink-0" />
          <span
            className="px-2 py-0.5 rounded border font-semibold text-xs uppercase tracking-wide flex-shrink-0"
            style={componentStyle}
          >
            {formatTypeLabel(componentType)}
          </span>
          <span className="text-lg font-bold text-foreground truncate">{component.name}</span>
          <span className="text-xs text-muted-foreground font-mono ml-auto truncate" title={`${component.filePath}:${component.location?.startLine || 0}-${component.location?.endLine || 0}`}>
            {component.filePath}:{component.location?.startLine || 0}-{component.location?.endLine || 0}
          </span>
        </div>

        {/* Signature inline if available */}
        {signature && (
          <div className="mt-1 min-w-0">
            <code className="text-xs font-mono text-muted-foreground break-all">{signature}</code>
          </div>
        )}
      </div>

      {/* Compact Source Toggle */}
      {codeToRender && (
        <div className="border-t border-border/20">
          <button
            onClick={() => setShowSource(!showSource)}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-background/40 transition-colors text-xs"
          >
            <div className="flex items-center gap-1.5">
              {showSource ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Code className="h-3 w-3" />
              <span>Source</span>
            </div>
          </button>

          {showSource && (
            <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
              <CodeMirror
                value={codeToRender}
                extensions={[
                  getLanguageExtension(),
                  EditorView.lineWrapping,
                ]}
                theme={theme?.type === 'dark' ? oneDark : undefined}
                editable={false}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: false,
                  highlightActiveLine: false,
                  foldGutter: false,
                }}
                style={{
                  fontSize: '0.75rem',
                  width: '100%',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
