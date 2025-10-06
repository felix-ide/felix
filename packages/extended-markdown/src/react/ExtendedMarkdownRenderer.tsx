import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExtendedMarkdownParser } from '../core/parser';
import { MermaidRenderer } from './renderers/MermaidRenderer';
import { ExcalidrawRenderer } from './renderers/ExcalidrawRenderer';

export interface ExtendedMarkdownRendererProps {
  content: string;
  className?: string;
  prose?: boolean;
  options?: {
    mermaid?: {
      theme?: 'default' | 'dark' | 'forest' | 'neutral';
      themeVariables?: Record<string, string>;
    };
    excalidraw?: {
      theme?: 'light' | 'dark';
      viewModeEnabled?: boolean;
      minHeight?: number;
      maxHeight?: number;
    };
  };
  components?: Record<string, React.ComponentType<any>>;
}

export const ExtendedMarkdownRenderer: React.FC<ExtendedMarkdownRendererProps> = ({
  content,
  className,
  prose = true,
  options = {},
  components: customComponents = {},
}) => {
  const parser = useMemo(() => new ExtendedMarkdownParser(), []);

  const components = useMemo(() => ({
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      // Handle extended markdown types
      if (!inline && language === 'mermaid') {
        return (
          <MermaidRenderer
            code={String(children).replace(/\n$/, '')}
            options={options.mermaid}
          />
        );
      }

      if (!inline && language === 'excalidraw') {
        return (
          <ExcalidrawRenderer
            content={String(children).replace(/\n$/, '')}
            options={options.excalidraw}
          />
        );
      }

      // Default code rendering: prefer className to detect blocks; fallback to inline styling
      if (!className) {
        return (
          <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
            {children}
          </code>
        );
      }
      return (
        <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto mb-2">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    ...customComponents,
  }), [customComponents, options]);

  return (
    <div className={`${prose ? 'prose prose-sm dark:prose-invert max-w-none' : ''} ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
