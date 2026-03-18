"use client";

// Tiptap rich text editor wrapper — dynamically imported to avoid SSR issues
import dynamic from "next/dynamic";
import type { Editor } from "@tiptap/react";

export type { Editor };

// Lazy-load the actual editor to prevent Next.js SSR hydration errors
const RichTextEditorInner = dynamic(
  () => import("./rich-text-editor-inner").then((m) => m.RichTextEditorInner),
  { ssr: false, loading: () => <div className="h-40 border rounded-md bg-stone-50 animate-pulse" /> }
);

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  return <RichTextEditorInner value={value} onChange={onChange} placeholder={placeholder} />;
}
