'use client';

import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Indent,
  FoldVertical,
  CheckCircle2,
} from 'lucide-react';

export interface EditorToolbarProps {
  editor: Editor | null;
  onSpellcheck?: () => void;
  spellcheckIssueCount?: number;
  spellcheckLoading?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  onSpellcheck,
  spellcheckIssueCount = 0,
  spellcheckLoading = false,
}) => {
  if (!editor) return null;

  const currentAttrs = editor.getAttributes('paragraph') || {};
  const currentFontSize = currentAttrs.fontSize || 13;
  const currentLineSpacing = currentAttrs.lineSpacing || 1.2;
  const currentIndent = currentAttrs.firstLineIndentMm ?? 10;
  const currentFontFamily = currentAttrs.fontFamily || 'Times New Roman';

  const preventBlur = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div
      data-testid="editor-toolbar"
      className="editor-toolbar flex flex-wrap items-center gap-1 px-3 py-2 bg-white border-b border-slate-200 sticky top-0 z-30 select-none shadow-sm"
    >
      {/* Group: History */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200">
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Hoàn tác (Ctrl+Z)"
          aria-label="Hoàn tác"
          className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Làm lại (Ctrl+Y)"
          aria-label="Làm lại"
          className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Group: Font Family & Size */}
      <div className="flex items-center gap-1 px-2 border-r border-slate-200">
        <select
          value={currentFontFamily}
          onChange={(e) => {
            editor.chain().focus().setParagraphFormatting({ fontFamily: e.target.value }).run();
          }}
          aria-label="Phông chữ"
          className="text-xs font-medium bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="Times New Roman">Times New Roman</option>
          <option value="Arial">Arial</option>
        </select>

        <select
          value={currentFontSize}
          onChange={(e) => {
            const size = parseInt(e.target.value, 10);
            editor.chain().focus().setFontSize(size).run();
          }}
          aria-label="Cỡ chữ"
          className="text-xs font-medium bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="11">11 pt</option>
          <option value="12">12 pt</option>
          <option value="13">13 pt (Chuẩn)</option>
          <option value="14">14 pt</option>
          <option value="16">16 pt</option>
          <option value="18">18 pt</option>
        </select>
      </div>

      {/* Group: Text Marks */}
      <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="In đậm (Ctrl+B)"
          aria-label="In đậm"
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('bold')
              ? 'bg-indigo-100 text-indigo-700 font-semibold'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="In nghiêng (Ctrl+I)"
          aria-label="In nghiêng"
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('italic')
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Gạch chân (Ctrl+U)"
          aria-label="Gạch chân"
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('underline')
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Underline className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Gạch ngang chữ"
          aria-label="Gạch ngang chữ"
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive('strike')
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Strikethrough className="w-4 h-4" />
        </button>
      </div>

      {/* Group: Alignments */}
      <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Căn trái"
          aria-label="Căn trái"
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive({ textAlign: 'left' })
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Căn giữa"
          aria-label="Căn giữa"
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive({ textAlign: 'center' })
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Căn phải"
          aria-label="Căn phải"
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive({ textAlign: 'right' })
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          title="Căn đều 2 bên (Chuẩn NĐ 30)"
          aria-label="Căn đều 2 bên"
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            editor.isActive({ textAlign: 'justify' })
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <AlignJustify className="w-4 h-4" />
        </button>
      </div>

      {/* Group: NĐ 30 Spacing & Indentation */}
      <div className="flex items-center gap-1 px-2 border-r border-slate-200">
        {/* Line Spacing */}
        <div className="flex items-center gap-1 text-slate-700" title="Giãn dòng">
          <FoldVertical className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={currentLineSpacing}
            onChange={(e) => {
              const spacing = parseFloat(e.target.value);
              editor.chain().focus().setLineSpacing(spacing).run();
            }}
            aria-label="Giãn dòng"
            className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="1.0">1.0</option>
            <option value="1.15">1.15</option>
            <option value="1.2">1.2 (Chuẩn)</option>
            <option value="1.25">1.25</option>
            <option value="1.3">1.3</option>
            <option value="1.5">1.5</option>
          </select>
        </div>

        {/* First Line Indent */}
        <div className="flex items-center gap-1 text-slate-700" title="Thụt đầu dòng">
          <Indent className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={currentIndent}
            onChange={(e) => {
              const indent = parseFloat(e.target.value);
              editor.chain().focus().setFirstLineIndent(indent).run();
            }}
            aria-label="Thụt đầu dòng"
            className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="0">0 mm</option>
            <option value="10">10 mm (NĐ30)</option>
            <option value="12.7">12.7 mm (1/2&quot;)</option>
          </select>
        </div>
      </div>

      {/* Group: Quick Administrative Presets */}
      <div className="flex items-center gap-1 pl-2">
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => {
            editor
              .chain()
              .focus()
              .setParagraph()
              .unsetBold()
              .unsetItalic()
              .unsetUnderline()
              .unsetStrike()
              .setTextAlign('justify')
              .resetToAdministrativeStandard()
              .run();
          }}
          title="Áp dụng chuẩn thân bài NĐ 30: Times New Roman 13pt, căn đều, thụt dòng 10mm, giãn dòng 1.2"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium border border-indigo-200 transition-colors cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>Chuẩn Thân bài NĐ30</span>
        </button>
      </div>

      {onSpellcheck && <button
        type="button"
        onMouseDown={preventBlur}
        onClick={onSpellcheck}
        aria-label="Kiểm tra chính tả"
        title="Quét toàn bộ văn bản và xem các gợi ý chính tả"
        aria-busy={spellcheckLoading}
        className="ml-1 inline-flex min-h-8 items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800 transition-colors hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Kiểm tra chính tả</span>
        {spellcheckIssueCount > 0 && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-700">{spellcheckIssueCount}</span>}
      </button>}
    </div>
  );
};
