'use client';

import React from 'react';
import { EditorContent, Editor } from '@tiptap/react';

export interface A4CanvasProps {
  editor: Editor | null;
  className?: string;
  showMarginGuides?: boolean;
}

export const A4Canvas: React.FC<A4CanvasProps> = ({
  editor,
  className = '',
  showMarginGuides = false,
}) => {
  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Đang khởi tạo trình soạn thảo...
      </div>
    );
  }

  return (
    <div
      className={`a4-canvas-scroll-container bg-slate-200/70 overflow-auto py-8 px-4 flex justify-center min-h-full ${className}`}
      data-testid="a4-canvas-container"
    >
      <div className="relative m-auto">
        {/* A4 Paper Sheet */}
        <div
          data-testid="a4-sheet"
          className={`a4-sheet bg-white text-slate-900 shadow-xl transition-shadow relative box-border ${
            showMarginGuides ? 'margin-guides-active' : ''
          }`}
          style={{
            width: '210mm',
            minHeight: '297mm',
            paddingTop: '20mm',
            paddingBottom: '20mm',
            paddingLeft: '30mm',
            paddingRight: '15mm',
            fontFamily: '"Times New Roman", Times, serif',
          }}
        >
          {/* Visual Margin Guides (optional) */}
          {showMarginGuides && (
            <div
              className="absolute pointer-events-none border border-dashed border-indigo-300/60"
              style={{
                top: '20mm',
                bottom: '20mm',
                left: '30mm',
                right: '15mm',
              }}
            />
          )}

          {/* Tiptap Editor Content */}
          <EditorContent
            editor={editor}
            className="tiptap-a4-editor-content focus:outline-none min-h-[257mm]"
          />
        </div>
      </div>
    </div>
  );
};
