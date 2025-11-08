import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, height = 280, placeholder }: MarkdownEditorProps) {
  return (
    <div className="markdown-editor" data-color-mode="dark">
      <MDEditor
        value={value}
        height={height}
        onChange={(val) => onChange(val ?? '')}
        preview="live"
        visibleDragbar={false}
        previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
        textareaProps={{ placeholder }}
      />
    </div>
  );
}
