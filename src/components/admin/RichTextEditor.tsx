"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { TextAlignExtension, type TextAlignment } from "./TextAlignExtension";
import { createLowlight, common } from "lowlight";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Undo,
  Redo,
  Minus,
  Eraser,
  Maximize2,
  Minimize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";

const lowlight = createLowlight(common);

export default function RichTextEditor({
  name,
  defaultValue,
  placeholder,
  minHeight = 360,
}: {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  minHeight?: number;
}) {
  const [html, setHtml] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false, underline: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      ImageExtension.configure({ HTMLAttributes: { class: "rounded-lg" } }),
      Placeholder.configure({ placeholder: placeholder ?? "Escreva o conteúdo aqui..." }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({ lowlight }),
      TextAlignExtension,
    ],
    content: defaultValue ?? "",
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "rich-text-surface min-h-[var(--editor-min-h)] px-4 py-3 text-sm leading-relaxed text-slate-700 outline-none [&_p]:my-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:max-w-full [&_img]:rounded-lg [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-brand-200 [&_th]:border [&_th]:border-brand-200 [&_th]:bg-brand-50 [&_td]:px-2 [&_th]:px-2 [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:text-slate-100 [&_pre]:overflow-x-auto [&_code]:text-[13px] [&_blockquote]:border-l-2 [&_blockquote]:border-brand-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-500",
      },
    },
  });

  useEffect(() => {
    return () => editor?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [fullscreen]);

  const insertImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/editor-upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error ?? "Falha ao enviar imagem.");
          return;
        }
        editor.chain().focus().setImage({ src: data.url }).run();
      } catch {
        alert("Falha ao enviar imagem.");
      } finally {
        setUploading(false);
      }
    },
    [editor]
  );

  if (!editor) {
    return (
      <div
        className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-slate-400"
        style={{ minHeight }}
      >
        Carregando editor...
      </div>
    );
  }

  const plainText = editor.getText().trim();
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;

  return (
    <div
      className={`overflow-hidden border border-brand-200 bg-white shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 ${
        fullscreen ? "fixed inset-3 z-[80] flex flex-col rounded-xl shadow-2xl sm:inset-6" : "rounded-xl"
      }`}
      style={{ "--editor-min-h": fullscreen ? "calc(100vh - 10rem)" : `${minHeight}px` } as React.CSSProperties}
    >
      <Toolbar
        editor={editor}
        onPickImage={() => fileInputRef.current?.click()}
        uploading={uploading}
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((value) => !value)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void insertImage(file);
          e.target.value = "";
        }}
      />
      <div className={fullscreen ? "min-h-0 flex-1 overflow-y-auto" : ""}>
        <EditorContent editor={editor} />
      </div>
      <div className="flex items-center justify-between border-t border-brand-100 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-400">
        <span>{wordCount} {wordCount === 1 ? "palavra" : "palavras"}</span>
        <span>{fullscreen ? "Esc para sair da tela cheia" : "Editor visual"}</span>
      </div>
      <input type="hidden" name={name} value={html} />
    </div>
  );
}

function Toolbar({
  editor,
  onPickImage,
  uploading,
  fullscreen,
  onToggleFullscreen,
}: {
  editor: Editor;
  onPickImage: () => void;
  uploading: boolean;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const blockType = editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
      ? "h3"
      : "p";

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-brand-100 bg-brand-50/80 p-2 backdrop-blur-sm" role="toolbar" aria-label="Formatação do texto">
      <select
        value={blockType}
        onChange={(event) => {
          const value = event.target.value;
          if (value === "h2") editor.chain().focus().setHeading({ level: 2 }).run();
          else if (value === "h3") editor.chain().focus().setHeading({ level: 3 }).run();
          else editor.chain().focus().setParagraph().run();
        }}
        className="h-8 rounded-md border border-brand-200 bg-white px-2 text-xs font-medium text-slate-600 outline-none focus:border-brand-400"
        aria-label="Formato do parágrafo"
      >
        <option value="p">Parágrafo</option>
        <option value="h2">Título 2</option>
        <option value="h3">Título 3</option>
      </select>

      <Divider />

      <ToolbarButton title="Negrito" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={14} />
      </ToolbarButton>
      <ToolbarButton title="Itálico" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={14} />
      </ToolbarButton>
      <ToolbarButton title="Sublinhado" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon size={14} />
      </ToolbarButton>
      <ToolbarButton title="Tachado" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={14} />
      </ToolbarButton>

      <Divider />

      {([
        ["left", "Alinhar à esquerda", AlignLeft],
        ["center", "Centralizar", AlignCenter],
        ["right", "Alinhar à direita", AlignRight],
        ["justify", "Justificar", AlignJustify],
      ] as const).map(([alignment, title, Icon]) => (
        <ToolbarButton
          key={alignment}
          title={title}
          active={editor.isActive({ textAlign: alignment })}
          onClick={() => editor.chain().focus().setTextAlign(alignment as TextAlignment).run()}
        >
          <Icon size={15} />
        </ToolbarButton>
      ))}

      <Divider />

      <ToolbarButton
        title="Título 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Título 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={14} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Lista" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Lista numerada"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={14} />
      </ToolbarButton>
      <ToolbarButton title="Citação" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={14} />
      </ToolbarButton>
      <ToolbarButton title="Bloco de código" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code size={14} />
      </ToolbarButton>
      <ToolbarButton title="Linha horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus size={14} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        title="Link"
        active={editor.isActive("link")}
        onClick={() => {
          const previousUrl = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("URL do link:", previousUrl ?? "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
      >
        <LinkIcon size={14} />
      </ToolbarButton>
      <ToolbarButton title="Inserir imagem" onClick={onPickImage} disabled={uploading}>
        <ImageIcon size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Inserir tabela"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <TableIcon size={14} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Desfazer" onClick={() => editor.chain().focus().undo().run()}>
        <Undo size={14} />
      </ToolbarButton>
      <ToolbarButton title="Refazer" onClick={() => editor.chain().focus().redo().run()}>
        <Redo size={14} />
      </ToolbarButton>

      <ToolbarButton title="Limpar formatação" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
        <Eraser size={14} />
      </ToolbarButton>

      <span className="flex-1" />

      <ToolbarButton title={fullscreen ? "Sair da tela cheia" : "Editar em tela cheia"} active={fullscreen} onClick={onToggleFullscreen}>
        {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </ToolbarButton>

      {uploading && <span className="ml-2 text-xs text-slate-400">Enviando imagem...</span>}
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-brand-100" />;
}

function ToolbarButton({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      aria-label={title}
      aria-pressed={active ?? undefined}
      className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40 ${
        active ? "border-brand-200 bg-white text-brand-800 shadow-sm" : "border-transparent text-slate-500 hover:border-brand-100 hover:bg-white hover:text-brand-700"
      }`}
    >
      {children}
    </button>
  );
}
