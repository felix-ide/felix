import React, { memo, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { php } from '@codemirror/lang-php';
import { java } from '@codemirror/lang-java';
import { markdown } from '@codemirror/lang-markdown';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { Excalidraw } from '@excalidraw/excalidraw';
import { useTheme } from '@felix/theme-system';
import { cn } from '@/utils/cn';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  prose?: boolean;
}

// Initialize mermaid once globally
let mermaidInitialized = false;
if (!mermaidInitialized && typeof window !== 'undefined') {
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
    },
    securityLevel: 'loose',
  });
  mermaidInitialized = true;
}

// Get the appropriate language extension for CodeMirror
const getLanguageExtension = (language: string) => {
  switch (language) {
    case 'javascript':
    case 'js':
    case 'jsx':
    case 'typescript':
    case 'ts':
    case 'tsx':
      return javascript({ jsx: true, typescript: true });
    case 'python':
    case 'py':
      return python();
    case 'php':
      return php();
    case 'java':
      return java();
    case 'markdown':
    case 'md':
      return markdown();
    case 'json':
      return json();
    default:
      // Default to javascript for unknown languages
      return javascript();
  }
};

// Mermaid diagram component
const MermaidDiagram = ({ code }: { code: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !code) return;

    const renderDiagram = async () => {
      try {
        setError(null);
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Clear previous content
        containerRef.current.innerHTML = '';

        // Render new diagram
        const { svg } = await mermaid.render(id, code);

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to render diagram';
        console.error('Mermaid error:', err);
        setError(message);
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      }
    };

    renderDiagram();
  }, [code]);

  if (error) {
    return (
      <div className="my-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-700 dark:text-red-400 font-medium">Mermaid Error</p>
        <p className="text-xs text-red-600 dark:text-red-500 mt-1">{error}</p>
        <details className="mt-2">
          <summary className="text-xs text-red-600 dark:text-red-500 cursor-pointer">Show code</summary>
          <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs overflow-x-auto">
            {code}
          </pre>
        </details>
      </div>
    );
  }

  return <div ref={containerRef} className="my-3 overflow-x-auto mermaid-diagram" />;
};

// CodeBlock component with CodeMirror
const CodeBlock = ({ code, language }: { code: string; language?: string }) => {
  const { theme } = useTheme();
  const extensions = language ? [getLanguageExtension(language), EditorView.lineWrapping] : [EditorView.lineWrapping];
  const isDark = theme?.type === 'dark';

  return (
    <div className="my-3 rounded-lg border border-border overflow-hidden">
      <CodeMirror
        value={code}
        height="auto"
        maxHeight="500px"
        extensions={extensions}
        theme={isDark ? oneDark : undefined}
        editable={false}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: false,
          searchKeymap: false,
          completionKeymap: false,
        }}
      />
    </div>
  );
};

// Excalidraw diagram component
const ExcalidrawDiagram = ({ content }: { content: string }) => {
  const { theme } = useTheme();
  const isDark = theme?.type === 'dark';
  const [error, setError] = useState<string | null>(null);

  try {
    const data = JSON.parse(content);

    // Excalidraw expects specific data format
    const initialData = {
      elements: data.elements || [],
      appState: {
        ...data.appState,
        theme: isDark ? 'dark' : 'light',
        viewModeEnabled: true,
        zenModeEnabled: false,
        gridModeEnabled: false,
      },
      scrollToContent: true,
      libraryItems: data.libraryItems || [],
    };

    return (
      <div className="my-3 border border-border rounded-lg overflow-hidden" style={{ height: '400px' }}>
        <Excalidraw
          initialData={initialData}
          viewModeEnabled={true}
          zenModeEnabled={false}
          gridModeEnabled={false}
          theme={isDark ? 'dark' : 'light'}
          UIOptions={{
            canvasActions: {
              export: false,
              loadScene: false,
              saveScene: false,
              saveAsImage: false,
              saveToActiveFile: false,
              toggleTheme: false,
              changeViewBackgroundColor: false,
            },
          }}
        />
      </div>
    );
  } catch (err) {
    return (
      <div className="my-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-700 dark:text-red-400 font-medium">Excalidraw Error</p>
        <p className="text-xs text-red-600 dark:text-red-500 mt-1">
          {err instanceof Error ? err.message : 'Invalid Excalidraw data format'}
        </p>
        <details className="mt-2">
          <summary className="text-xs text-red-600 dark:text-red-500 cursor-pointer">Show content</summary>
          <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs overflow-x-auto">
            {content}
          </pre>
        </details>
      </div>
    );
  }
};

export const MarkdownRenderer = memo(({ content, className, prose = true }: MarkdownRendererProps) => {
  return (
    <ReactMarkdown
      className={cn(
        prose && 'prose prose-sm dark:prose-invert max-w-none',
        className
      )}
      remarkPlugins={[remarkGfm]}
      components={{
        // Headers - smaller for card context
        h1: ({ children }) => <h3 className="text-lg font-semibold mt-3 mb-2">{children}</h3>,
        h2: ({ children }) => <h4 className="text-base font-semibold mt-3 mb-2">{children}</h4>,
        h3: ({ children }) => <h5 className="text-sm font-medium mt-2 mb-1">{children}</h5>,
        h4: ({ children }) => <h6 className="text-sm font-medium mt-2 mb-1">{children}</h6>,

        // Paragraph
        p: ({ children }) => <p className="mb-2">{children}</p>,

        // Lists - use list-outside so numbers/bullets stay with text
        ul: ({ children }) => <ul className="list-disc list-outside mb-2 ml-4 pl-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside mb-2 ml-4 pl-2">{children}</ol>,
        li: ({ children }) => <li className="mb-0.5">{children}</li>,

        // Blockquote - use theme border color
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-border pl-4 italic my-3">
            {children}
          </blockquote>
        ),

        // Code blocks - handle both inline and block
        code: ({ inline, className, children, ...props }) => {
          const code = String(children).replace(/\n$/, '');
          const isMultiline = code.includes('\n');

          // Inline code - single backticks, use theme colors
          if (inline || !isMultiline) {
            return (
              <code className="px-1 py-0.5 bg-muted text-foreground rounded text-xs font-mono">
                {children}
              </code>
            );
          }

          // Check if this is a code block with a language
          if (className) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            // Handle special diagram types
            if (language === 'mermaid') {
              // Clean up any JSON comments that might have leaked through
              const cleanCode = code.replace(/\/\/\s*JSON string/g, '');
              return <MermaidDiagram code={cleanCode} />;
            }

            if (language === 'excalidraw') {
              return <ExcalidrawDiagram content={code} />;
            }

            // Use CodeMirror for regular code blocks
            return <CodeBlock code={code} language={language} />;
          }

          // Block code without language - use CodeBlock without highlighting
          return <CodeBlock code={code} />;
        },

        // Pre tag wrapper - skip it since CodeMirror handles its own wrapper
        pre: ({ children }) => {
          // Check if the child is our custom code component (CodeBlock/MermaidDiagram/etc)
          // If so, return it directly without wrapping in pre
          if (React.isValidElement(children) && (
            children.type === CodeBlock ||
            children.type === MermaidDiagram ||
            children.type === ExcalidrawDiagram
          )) {
            return children;
          }
          // For anything else, just return the children (the code component will handle it)
          return <>{children}</>;
        },

        // Tables - use theme colors
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full divide-y divide-border">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="bg-background divide-y divide-border">
            {children}
          </tbody>
        ),
        tr: ({ children }) => <tr>{children}</tr>,
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-sm text-foreground">
            {children}
          </td>
        ),

        // Bold text - let prose handle colors via theme
        strong: ({ children }) => (
          <strong className="font-semibold">
            {children}
          </strong>
        ),

        // Italic text - let prose handle colors via theme
        em: ({ children }) => (
          <em className="italic">
            {children}
          </em>
        ),

        // Links - use theme primary color
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),

        // Horizontal rule - use theme border color
        hr: () => <hr className="my-4 border-border" />,

        // Images
        img: ({ src, alt }) => (
          <img
            src={src}
            alt={alt}
            className="max-w-full h-auto rounded-lg my-3"
            loading="lazy"
          />
        ),

        // Task lists (GitHub Flavored Markdown)
        input: ({ type, checked, ...props }) => {
          if (type === 'checkbox') {
            return (
              <input
                type="checkbox"
                checked={checked}
                disabled
                className="mr-2"
                {...props}
              />
            );
          }
          return <input type={type} {...props} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';