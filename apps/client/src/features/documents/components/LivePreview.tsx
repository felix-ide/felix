import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import mermaid from 'mermaid';
import { cn } from '@/utils/cn';

interface LivePreviewProps {
  content: string;
  language?: string;
  className?: string;
}

// Mermaid component to render diagrams
function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const renderMermaid = async () => {
      try {
        setError(null);
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Clear previous content
        ref.current!.innerHTML = '';
        
        // Render mermaid diagram
        const { svg } = await mermaid.render(id, code);
        ref.current!.innerHTML = svg;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        ref.current!.innerHTML = `<div class="text-red-500 p-4 border border-red-200 rounded">
          <strong>Mermaid Error:</strong> ${error}
        </div>`;
      }
    };

    renderMermaid();
  }, [code, error]);

  return <div ref={ref} className="my-4" />;
}

// Custom code block component that detects mermaid
function CodeBlock({ children, className, ...props }: any) {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  if (language === 'mermaid') {
    return <MermaidDiagram code={String(children).replace(/\n$/, '')} />;
  }

  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
}

export function LivePreview({ content, language, className }: LivePreviewProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Mermaid
  useEffect(() => {
    if (!isInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
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
        },
        maxEdges: 2000,
      });
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // If not markdown, show raw content with syntax highlighting
  if (language !== 'markdown') {
    return (
      <div className={cn('h-full overflow-auto bg-muted/20 p-4', className)}>
        <pre className="text-sm">
          <code className={`language-${language}`}>{content}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className={cn('h-full overflow-auto bg-background p-6', className)}>
      <div className="prose prose-slate  max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            code: CodeBlock,
            // Custom styling for other elements
            h1: ({ children }) => (
              <h1 className="text-3xl font-bold mb-4 text-foreground border-b border-border pb-2">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl font-semibold mb-3 text-foreground border-b border-border pb-1">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mb-4 text-foreground leading-relaxed">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="mb-4 pl-6 space-y-1 text-foreground">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-4 pl-6 space-y-1 text-foreground list-decimal">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-foreground">
                {children}
              </li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground">
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border border-border">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-border px-3 py-2 bg-muted font-semibold text-left">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-border px-3 py-2">
                {children}
              </td>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-primary hover:text-primary/80 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            img: ({ src, alt }) => (
              <img
                src={src}
                alt={alt}
                className="max-w-full h-auto rounded-md border border-border my-4"
              />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}