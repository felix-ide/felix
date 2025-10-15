import { useEffect } from 'react';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function MilkdownEditorInner({ value, onChange, placeholder }: MarkdownEditorProps) {
  const { get, loading } = useEditor((root) => {
    const crepe = new Crepe({
      root,
      defaultValue: value,
      features: {
        [Crepe.Feature.CodeMirror]: true,
        [Crepe.Feature.ListItem]: true,
        [Crepe.Feature.BlockEdit]: true,
        [Crepe.Feature.Placeholder]: {
          text: placeholder || 'Type / for commands...',
        },
        [Crepe.Feature.Cursor]: true,
        [Crepe.Feature.Tooltip]: true,
      },
    });

    crepe.editor.config((ctx) => {
      crepe.editor.onStatusChange((status) => {
        if (status === 'Created' || status === 'Updated') {
          const markdown = crepe.getMarkdown();
          onChange(markdown);
        }
      });
    });

    return crepe.editor;
  }, []);

  return <Milkdown />;
}

export function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  return (
    <div className="w-full max-w-full min-h-[200px]">
      <MilkdownProvider>
        <MilkdownEditorInner
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      </MilkdownProvider>
    </div>
  );
}
