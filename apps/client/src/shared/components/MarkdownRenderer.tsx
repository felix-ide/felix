import { memo, useMemo } from 'react';
import { ExtendedMarkdownRenderer, MermaidRenderer } from '@felix/extended-markdown';
import { MockupViewer } from '@client/features/notes/components/MockupViewer';
import { cn } from '@/utils/cn';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  prose?: boolean;
}

const normalizeDiagramSource = (input: string) => {
  const normalized = input.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const meaningful = lines.filter(line => line.trim().length > 0);
  if (meaningful.length === 0) {
    return normalized.trim();
  }
  const indent = meaningful.reduce((min, line) => {
    const match = line.match(/^\s*/);
    const current = match ? match[0].length : 0;
    return min === null ? current : Math.min(min, current);
  }, null as number | null);
  if (indent && indent > 0) {
    return lines.map(line => line.slice(Math.min(indent, line.length))).join('\n').trim();
  }
  return normalized.trim();
};

// Keep the original ExcalidrawBlock that uses MockupViewer for consistency
const ExcalidrawBlock = memo(({ content }: { content: string }) => {
  return (
    <div className="my-2 excalidraw-embed">
      <style>{`
        .excalidraw-embed .App-menu__left {
          display: none !important;
        }
      `}</style>
      <MockupViewer 
        content={content}
        minHeight={300}
        maxHeight={500}
      />
    </div>
  );
});

export const MarkdownRenderer = memo(({ content, className, prose = true }: MarkdownRendererProps) => {
  const mermaidConfig = useMemo(() => ({
    theme: 'dark' as const,
    themeVariables: {
      primaryColor: '#3b82f6',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#1e40af',
      lineColor: '#6b7280',
      sectionBkgColor: '#1f2937',
      altSectionBkgColor: '#374151',
      gridColor: '#4b5563',
      secondaryColor: '#f59e0b',
      tertiaryColor: '#8b5cf6',
      fontFamily: 'Inter, sans-serif',
    },
    securityLevel: 'loose' as const,
  }) as const, []);

  return (
    <ExtendedMarkdownRenderer
      content={content}
      className={cn(
        prose && 'prose prose-sm  max-w-none text-sm text-muted-foreground',
        className
      )}
      prose={prose}
      options={{
        mermaid: mermaidConfig,
        excalidraw: {
          theme: 'light',
          viewModeEnabled: true,
          minHeight: 300,
          maxHeight: 500,
        },
      }}
      components={{
        // Customize markdown components to fit in cards  
        h1: ({ children }: any) => <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>,
        h2: ({ children }: any) => <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>,
        h3: ({ children }: any) => <h5 className="text-sm font-medium mt-1 mb-1">{children}</h5>,
        p: ({ children }: any) => <p className="mb-2">{children}</p>,
        ul: ({ children }: any) => <ul className="list-disc list-inside mb-2">{children}</ul>,
        ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
        li: ({ children }: any) => <li className="ml-2">{children}</li>,
        code: ({ inline, className, children }: any) => {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          
          // Handle mermaid with ExtendedMarkdownRenderer's MermaidRenderer
          if (!inline && language === 'mermaid') {
            return (
              <MermaidRenderer
                code={normalizeDiagramSource(String(children))}
                options={mermaidConfig}
              />
            );
          }
          
          // Use custom ExcalidrawBlock for excalidraw to maintain existing behavior
          if (!inline && language === 'excalidraw') {
            const content = normalizeDiagramSource(String(children));
            try {
              JSON.parse(content);
              return <ExcalidrawBlock content={content} />;
            } catch (e) {
              return (
                <div className="text-red-500 p-2 border border-red-200 rounded text-xs my-2">
                  <strong>Excalidraw Error:</strong> Invalid JSON content
                </div>
              );
            }
          }
          
          // Default code rendering with syntax highlighting
          if (inline) {
            return (
              <code className="px-1 py-0.5 bg-card rounded text-xs">
                {children}
              </code>
            );
          }

          // For code blocks, use SyntaxHighlighter
          return (
            <SyntaxHighlighter
              language={language || 'typescript'}
              style={vscDarkPlus}
              showLineNumbers
              PreTag="div"
              className="text-xs rounded-md !max-w-full"
              customStyle={{
                margin: 0,
                padding: '0.75rem',
                fontSize: '0.75rem',
                backgroundColor: 'hsl(var(--card))',
                maxWidth: '100%',
                overflowX: 'auto',
              }}
              codeTagProps={{
                style: {
                  maxWidth: '100%',
                }
              }}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          );
        },
        blockquote: ({ children }: any) => (
          <blockquote className="border-l-2 border-primary/50 pl-2 italic my-2">
            {children}
          </blockquote>
        ),
        // Tables
        table: ({ children }: any) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full border border-border text-xs">
              {children}
            </table>
          </div>
        ),
        th: ({ children }: any) => (
          <th className="border border-border px-2 py-1 bg-muted font-semibold text-left">
            {children}
          </th>
        ),
        td: ({ children }: any) => (
          <td className="border border-border px-2 py-1">
            {children}
          </td>
        ),
        // Links
        a: ({ href, children }: any) => (
          <a
            href={href}
            className="text-primary hover:text-primary/80 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
      }}
    />
  );
});
