"use client";

// Inner Tiptap editor — only imported client-side via dynamic() in rich-text-editor.tsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditorInner({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    immediatelyRender: false, // Required to avoid SSR/hydration mismatch in Next.js
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "Mô tả sự kiện..." }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (edit mode pre-population)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className="border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
      {/* Toolbar */}
      <div className="flex gap-1 p-2 border-b bg-stone-50 flex-wrap">
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} label="B" title="Bold" className="font-bold" />
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} label="I" title="Italic" className="italic" />
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} label="H2" title="Heading 2" />
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} label="H3" title="Heading 3" />
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} label="•—" title="Bullet List" />
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} label="1." title="Ordered List" />
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-3 min-h-[120px] focus:outline-none [&_.tiptap]:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:text-stone-400 [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none"
      />
    </div>
  );
}

function ToolbarBtn({
  onClick, active, label, title, className = "",
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  title: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`px-2 py-0.5 text-sm rounded transition-colors ${className} ${active ? "bg-amber-100 text-amber-800" : "hover:bg-stone-200 text-stone-700"}`}
    >
      {label}
    </button>
  );
}
