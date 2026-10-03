# M1 Explorer 1: Web Application Shell & Design System Specification

**Author:** M1 Explorer 1  
**Milestone:** M1 — `core-platform-editor`  
**Date:** 2026-09-29  
**Parent Task ID:** `c334c6db-8f15-4213-b7fc-7e7a2e6ba3a0`  
**Target Path:** `e:\CODING\TVCI_word_addins\web_app`

---

## 1. Executive Summary & Architectural Scope

This specification defines the Next.js 14 application shell, Tailwind CSS design system, and verification toolchain for the **TVCI Web Application**. 

The design conforms strictly to:
- **User Requirement R5**: Modern flat/minimalist aesthetic, Plus Jakarta Sans typography, cohesive Lucide SVG iconography, primary Indigo (`#6366F1`), and prominent Emerald (`#10B981`) action triggers.
- **Vietnamese Administrative Standard (Nghị định 30/2020/NĐ-CP)**: Exact A4 canvas geometry (210mm × 297mm), margin standards (Top 20mm, Bottom 20mm, Left 30mm, Right 15mm), and Times New Roman canvas rendering.
- **Performance & Developer Experience**: Next.js 14 App Router with React 18, Tailwind CSS 3.4, and Vitest test runner for sub-second test execution and ESM compatibility.

---

## 2. Package Configuration & Toolchain Specifications

### 2.1 `web_app/package.json`

```json
{
  "name": "tvci-web-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "next lint"
  },
  "dependencies": {
    "@tiptap/extension-font-family": "^2.8.0",
    "@tiptap/extension-table": "^2.8.0",
    "@tiptap/extension-table-cell": "^2.8.0",
    "@tiptap/extension-table-header": "^2.8.0",
    "@tiptap/extension-table-row": "^2.8.0",
    "@tiptap/extension-text-align": "^2.8.0",
    "@tiptap/extension-text-style": "^2.8.0",
    "@tiptap/extension-underline": "^2.8.0",
    "@tiptap/react": "^2.8.0",
    "@tiptap/starter-kit": "^2.8.0",
    "clsx": "^2.1.1",
    "diff": "^7.0.0",
    "docx": "^8.5.0",
    "jszip": "^3.10.2",
    "lucide-react": "^0.453.0",
    "mammoth": "^1.8.0",
    "next": "14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.2",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/diff": "^6.0.0",
    "@types/jszip": "^3.4.0",
    "@types/node": "^22.7.5",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vitest": "^2.1.3"
  }
}
```

### 2.2 `web_app/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@app/*": ["./app/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 2.3 `web_app/next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['lucide-react'],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
};

export default nextConfig;
```

### 2.4 `web_app/postcss.config.js`

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### 2.5 `web_app/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // TVCI Brand / Primary
        primary: {
          DEFAULT: '#6366F1',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        // Action Triggers (Export, Save, Safe Fix, Diff Accept)
        action: {
          DEFAULT: '#10B981',
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        // Semantic Palette
        error: {
          DEFAULT: '#EF4444',
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
        },
      },
      fontFamily: {
        sans: ['var(--font-plus-jakarta-sans)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        canvas: ['"Times New Roman"', 'Times', 'serif'],
      },
      boxShadow: {
        'a4': '0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        'a4-hover': '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 10px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.08)',
      },
      spacing: {
        'a4-w': '210mm',
        'a4-h': '297mm',
        'nd30-top': '20mm',
        'nd30-bottom': '20mm',
        'nd30-left': '30mm',
        'nd30-right': '15mm',
      },
    },
  },
  plugins: [],
};

export default config;
```

### 2.6 `web_app/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './app'),
    },
  },
});
```

### 2.7 `web_app/tests/setup.ts`

```typescript
import '@testing-library/jest-dom';
```

---

## 3. Design System & Tokens Specification

### 3.1 Typography Tokens
- **Application Shell (UI)**:
  - Font: `Plus Jakarta Sans`, weights 400 (regular), 500 (medium), 600 (semibold), 700 (bold).
  - Loaded via `next/font/google` in `app/layout.tsx` with CSS variable `--font-plus-jakarta-sans`.
  - Body UI size: `text-sm` (14px) / `leading-5`, headers `text-base` / `text-lg`.
- **Administrative Canvas (Document)**:
  - Font: `Times New Roman` (strict NĐ 30/2020 legal standard).
  - Sizes:
    - 14pt (`text-[14pt]` / ~18.66px): Document Type, Body text (standard), Signer Full Name.
    - 13pt (`text-[13pt]` / ~17.33px): Body text (compact), Motto, Agency name.
    - 12pt (`text-[12pt]` / ~16px): Document number/symbol, Place & Date.
    - 11pt (`text-[11pt]` / ~14.66px): Recipients list items, Sub-agency.

### 3.2 Iconography Guidelines (Lucide React)
- **Zero Emojis in UI**: Following `ui-ux-pro-max` protocol, all icons are strict SVG via `lucide-react`.
- **Standardized Sizing**:
  - Buttons & Toolbar controls: `w-4 h-4` (16px).
  - Panel headers & Brand marks: `w-5 h-5` (20px).
  - Feature badges: `w-3.5 h-3.5` (14px).
- **Core Icon Mapping**:
  - Brand: `Scroll` or `FileText`
  - Format Audit: `ShieldCheck` (pass), `AlertTriangle` (warning), `AlertCircle` (error), `Wrench` (fix)
  - Templates: `LayoutTemplate`, `FolderPlus`, `BookOpen`
  - AI Assistant: `Sparkles`, `Wand2`, `GitCompare` (diff), `Check`, `X`
  - File Operations: `Upload` (import), `Download` (export), `Plus` (new), `Save` (save)
  - Navigation: `PanelRightClose`, `PanelRightOpen`, `ChevronDown`, `Search`, `SlidersHorizontal`

### 3.3 Color & Semantic Token Classes

| Role | Token Class | Hex Value | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Brand** | `bg-primary-500` / `text-primary-600` | `#6366F1` | Brand accents, active tab highlights, selected toolbar controls |
| **Action Trigger** | `bg-action-500` / `hover:bg-action-600` | `#10B981` | Export DOCX, Apply Auto-Fix, Accept AI Diff, Insert Template |
| **Error / Defect** | `bg-rose-50 text-rose-700 border-rose-200` | `#EF4444` | Audit violations, AI Diff deleted text (`bg-rose-100 line-through`) |
| **Warning / Notice** | `bg-amber-50 text-amber-800 border-amber-200` | `#F59E0B` | Non-blocking format warnings, unsaved status badge |
| **Success** | `bg-emerald-50 text-emerald-700 border-emerald-200` | `#10B981` | 100% Health Score badge, successful export notification |
| **Canvas Desk** | `bg-slate-100` | `#F1F5F9` | Neutral, high-contrast backdrop that makes white A4 paper pop |
| **A4 Sheet** | `bg-white shadow-a4` | `#FFFFFF` | Crisp white paper representation with subtle OpenXML margin boundaries |

### 3.4 Utility Class: `src/lib/utils.ts`

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

---

## 4. UI Core Primitives (`src/components/ui/`)

### 4.1 `src/components/ui/Button.tsx`

```tsx
import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'action' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 disabled:pointer-events-none cursor-pointer rounded-md select-none';

    const variants = {
      primary: 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm active:bg-primary-700',
      action: 'bg-action-500 text-white hover:bg-action-600 shadow-sm active:bg-action-700',
      secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200/80 active:bg-slate-300',
      outline: 'bg-transparent text-slate-700 hover:bg-slate-100 border border-slate-300 active:bg-slate-200',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200',
      danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm active:bg-rose-700',
    };

    const sizes = {
      sm: 'h-8 px-2.5 text-xs gap-1.5',
      md: 'h-9 px-3.5 text-sm gap-2',
      lg: 'h-10 px-4 text-base gap-2.5',
      icon: 'h-8 w-8 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
```

### 4.2 `src/components/ui/Badge.tsx`

```tsx
import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'primary' | 'neutral';
}

export function Badge({ className, variant = 'neutral', children, ...props }: BadgeProps) {
  const variants = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
    error: 'bg-rose-50 text-rose-700 border-rose-200/80',
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
```

---

## 5. Application Shell Architecture (`app/` & `src/components/layout/`)

### 5.1 `web_app/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #f1f5f9;
  --foreground: #0f172a;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: var(--font-plus-jakarta-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
}

/* Custom scrollbars for clean desktop experience */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* A4 Document Print simulator rules */
@media print {
  body {
    background: #ffffff;
    overflow: visible;
  }
  .no-print {
    display: none !important;
  }
}
```

### 5.2 `web_app/app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TVCI Document Platform — Quản trị & Chuẩn hóa Thể thức Văn bản',
  description: 'Hệ thống soạn thảo, kiểm tra thể thức Nghị định 30/2020/NĐ-CP, biểu mẫu hành chính và AI trợ lý văn phòng TVCI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={plusJakarta.variable}>
      <body className="h-screen w-screen overflow-hidden flex flex-col antialiased select-none">
        {children}
      </body>
    </html>
  );
}
```

### 5.3 `web_app/src/components/layout/Header.tsx`

```tsx
'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Plus, 
  PanelRightClose, 
  PanelRightOpen, 
  CheckCircle2, 
  AlertCircle,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export interface HeaderProps {
  documentTitle: string;
  isSaved: boolean;
  sidebarOpen: boolean;
  onTitleChange: (newTitle: string) => void;
  onToggleSidebar: () => void;
  onNewDocument: () => void;
  onImportDocx: () => void;
  onExportDocx: () => void;
  onOpenSettings: () => void;
}

export function Header({
  documentTitle,
  isSaved,
  sidebarOpen,
  onTitleChange,
  onToggleSidebar,
  onNewDocument,
  onImportDocx,
  onExportDocx,
  onOpenSettings,
}: HeaderProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(documentTitle);

  const handleTitleSubmit = () => {
    setEditingTitle(false);
    if (tempTitle.trim()) {
      onTitleChange(tempTitle.trim());
    } else {
      setTempTitle(documentTitle);
    }
  };

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0 shadow-sm z-20">
      {/* Brand & Document Meta */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2.5 pr-3 border-r border-slate-200 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            TV
          </div>
          <div className="hidden md:flex flex-col">
            <span className="font-semibold text-slate-800 text-xs tracking-tight uppercase leading-none">
              TVCI Document
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Nghị định 30/2020</span>
          </div>
        </div>

        {/* Editable Title */}
        <div className="flex items-center gap-2 min-w-0">
          {editingTitle ? (
            <input
              type="text"
              value={tempTitle}
              autoFocus
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTempTitle(documentTitle);
                  setEditingTitle(false);
                }
              }}
              className="px-2 py-0.5 text-sm font-medium border border-primary-400 rounded outline-none ring-1 ring-primary-400 text-slate-900 bg-white"
            />
          ) : (
            <button
              onClick={() => {
                setTempTitle(documentTitle);
                setEditingTitle(true);
              }}
              title="Nhấn để đổi tên tài liệu"
              className="text-sm font-semibold text-slate-800 hover:text-primary-600 hover:bg-slate-50 px-2 py-1 rounded truncate transition-colors text-left"
            >
              {documentTitle}
            </button>
          )}

          {/* Saved State Indicator */}
          {isSaved ? (
            <Badge variant="success" className="hidden sm:inline-flex">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Đã lưu
            </Badge>
          ) : (
            <Badge variant="warning" className="hidden sm:inline-flex">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              Chưa lưu
            </Badge>
          )}
        </div>
      </div>

      {/* Action Triggers */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewDocument}
          title="Tạo văn bản mới"
          className="hidden md:inline-flex"
        >
          <Plus className="w-4 h-4 text-slate-600" />
          <span>Văn bản mới</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onImportDocx}
          title="Tải lên tệp .docx có sẵn"
        >
          <Upload className="w-4 h-4 text-slate-700" />
          <span className="hidden sm:inline">Nhập DOCX</span>
        </Button>

        {/* Emerald Action Button for DOCX Export */}
        <Button
          variant="action"
          size="sm"
          onClick={onExportDocx}
          title="Xuất văn bản ra tệp .docx chuẩn Microsoft Word"
          className="font-semibold shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>Xuất DOCX</span>
        </Button>

        <div className="h-5 w-[1px] bg-slate-200 mx-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          title="Cài đặt hệ thống & API Key"
        >
          <Settings className="w-4 h-4 text-slate-600" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Thu gọn thanh bên" : "Mở thanh bên"}
        >
          {sidebarOpen ? (
            <PanelRightClose className="w-4 h-4 text-slate-700" />
          ) : (
            <PanelRightOpen className="w-4 h-4 text-slate-700" />
          )}
        </Button>
      </div>
    </header>
  );
}
```

### 5.4 `web_app/src/components/layout/Sidebar.tsx`

```tsx
'use client';

import React from 'react';
import { 
  ShieldCheck, 
  LayoutTemplate, 
  Sparkles, 
  ChevronRight,
  AlertTriangle,
  Wrench,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export type SidebarTab = 'audit' | 'templates' | 'ai';

export interface SidebarProps {
  isOpen: boolean;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onClose: () => void;
  // Audit badge counters
  issueCount?: number;
  healthScore?: number;
}

export function Sidebar({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  issueCount = 0,
  healthScore = 100,
}: SidebarProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <aside className="w-96 border-l border-slate-200 bg-white flex flex-col shrink-0 h-full z-10 transition-all duration-200 shadow-lg">
      {/* 3-Tab Header Bar */}
      <div className="h-12 border-b border-slate-200 flex items-center justify-between px-2 bg-slate-50/70 shrink-0">
        <div className="flex items-center gap-1">
          {/* Tab 1: Audit */}
          <button
            onClick={() => onTabChange('audit')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer',
              activeTab === 'audit'
                ? 'bg-white text-primary-600 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-primary-500" />
            <span>Chuẩn hóa</span>
            {issueCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                {issueCount}
              </span>
            )}
          </button>

          {/* Tab 2: Templates */}
          <button
            onClick={() => onTabChange('templates')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer',
              activeTab === 'templates'
                ? 'bg-white text-primary-600 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-primary-500" />
            <span>Biểu mẫu</span>
          </button>

          {/* Tab 3: AI Workspace */}
          <button
            onClick={() => onTabChange('ai')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer',
              activeTab === 'ai'
                ? 'bg-white text-primary-600 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary-500" />
            <span>AI Trợ lý</span>
          </button>
        </div>

        {/* Close Button */}
        <Button variant="ghost" size="icon" onClick={onClose} title="Đóng thanh bên">
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </Button>
      </div>

      {/* Tab Panel Content Container */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <div className="text-xs text-slate-500 font-medium">Điểm chuẩn thể thức</div>
                <div className="text-2xl font-bold text-slate-900">{healthScore}%</div>
              </div>
              <Button variant="action" size="sm" className="gap-1.5">
                <Wrench className="w-3.5 h-3.5" />
                Sửa an toàn
              </Button>
            </div>

            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Danh sách phát hiện ({issueCount})
            </div>

            {issueCount === 0 ? (
              <div className="text-center py-10 px-4 text-slate-400 space-y-2">
                <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500 opacity-80" />
                <p className="text-xs font-medium text-slate-600">
                  Tài liệu đạt chuẩn 100% Nghị định 30/2020!
                </p>
                <p className="text-[11px] text-slate-400">
                  Không phát hiện lỗi định dạng font, cỡ chữ hoặc căn lề.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {/* Placeholder issue card for M3 format engine integration */}
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-md space-y-1">
                  <div className="flex items-center justify-between font-semibold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Cỡ chữ chưa đúng quy định
                    </span>
                    <span className="text-[10px] bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-900">
                      Tiêu ngữ
                    </span>
                  </div>
                  <p className="text-amber-800 text-[11px]">
                    Tiêu ngữ hiện tại là 14pt, quy định Nghị định 30 yêu cầu 13pt đứng đậm.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Kho biểu mẫu TVCI (22 mẫu)
            </div>
            <div className="p-3 border border-slate-200 rounded-lg hover:border-primary-400 cursor-pointer transition-colors bg-white shadow-xs">
              <div className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary-500" />
                Công văn hành chính
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Mẫu chuẩn TVCI gửi đối tác, cơ quan chủ quản kèm bảng số hiệu.
              </p>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg hover:border-primary-400 cursor-pointer transition-colors bg-white shadow-xs">
              <div className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary-500" />
                Quyết định ban hành
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Quyết định bổ nhiệm, khen thưởng, thành lập đoàn công tác.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Không gian AI trợ lý văn phòng
            </div>
            <div className="bg-primary-50 p-3 rounded-lg border border-primary-200/80 text-xs text-primary-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                Preview-First Visual Diff
              </div>
              <p className="text-[11px] text-primary-800">
                Mọi gợi ý từ AI luôn hiển thị bản so sánh chi tiết (thêm xanh / bớt đỏ) để bạn phê duyệt trước khi áp dụng.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
```

### 5.5 `web_app/src/components/layout/StatusBar.tsx`

```tsx
import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export interface StatusBarProps {
  wordCount: number;
  paragraphCount: number;
  healthScore: number;
  profileName: string;
}

export function StatusBar({
  wordCount,
  paragraphCount,
  healthScore,
  profileName,
}: StatusBarProps) {
  return (
    <footer className="h-6 border-t border-slate-200 bg-white px-4 flex items-center justify-between text-xs text-slate-500 shrink-0 select-none z-10">
      <div className="flex items-center gap-4">
        <span>Từ: <strong className="text-slate-700">{wordCount}</strong></span>
        <span>Đoạn: <strong className="text-slate-700">{paragraphCount}</strong></span>
        <span className="hidden sm:inline">Khổ giấy: <strong className="text-slate-700">A4 (210×297mm)</strong></span>
      </div>

      <div className="flex items-center gap-3">
        <span>Tiêu chuẩn: <strong className="text-slate-700">{profileName}</strong></span>
        <div className="flex items-center gap-1 text-emerald-600 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Điểm chuẩn: {healthScore}%</span>
        </div>
      </div>
    </footer>
  );
}
```

### 5.6 `web_app/app/page.tsx`

```tsx
'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar, type SidebarTab } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';

export default function AppPage() {
  const [documentTitle, setDocumentTitle] = useState('Văn_bản_TVCI_mới.docx');
  const [isSaved, setIsSaved] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>('audit');
  const [healthScore, setHealthScore] = useState(100);
  const [issueCount, setIssueCount] = useState(0);

  // Document canvas stats
  const [wordCount, setWordCount] = useState(0);
  const [paragraphCount, setParagraphCount] = useState(1);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100">
      {/* Top Application Header */}
      <Header
        documentTitle={documentTitle}
        isSaved={isSaved}
        sidebarOpen={sidebarOpen}
        onTitleChange={(title) => {
          setDocumentTitle(title);
          setIsSaved(false);
        }}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onNewDocument={() => {
          if (window.confirm('Khởi tạo tài liệu mới? Các thay đổi chưa lưu sẽ bị xóa.')) {
            setDocumentTitle('Văn_bản_TVCI_mới.docx');
            setIsSaved(true);
          }
        }}
        onImportDocx={() => {
          console.log('[App] Import DOCX triggered');
        }}
        onExportDocx={() => {
          console.log('[App] Export DOCX triggered');
        }}
        onOpenSettings={() => {
          console.log('[App] Open Settings triggered');
        }}
      />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Editor Central Desk */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-100">
          {/* Placeholder for Editor Toolbar (Designed by M1 Explorer 2) */}
          <div id="editor-toolbar-slot" className="h-10 border-b border-slate-200 bg-white shrink-0 px-4 flex items-center justify-between text-xs text-slate-500">
            <span>[Thanh công cụ định dạng Tiptap Rich Text sẽ được mount tại đây]</span>
          </div>

          {/* Scrollable Document Canvas Viewport */}
          <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start">
            {/* A4 Paper Simulator (Designed by M1 Explorer 2 & 3) */}
            <div
              id="a4-editor-canvas-slot"
              className="bg-white shadow-a4 border border-slate-200/80 transition-shadow hover:shadow-a4-hover"
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
              {/* Slot for 2-column header, body paragraphs, and 2-column footer */}
              <div className="text-slate-400 text-center py-20 font-sans text-sm">
                [Khung soạn thảo A4 Tiptap Canvas & Bảng biểu 2 cột hành chính]
              </div>
            </div>
          </div>
        </main>

        {/* Collapsible 3-Tab Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={() => setSidebarOpen(false)}
          healthScore={healthScore}
          issueCount={issueCount}
        />
      </div>

      {/* Footer Status Bar */}
      <StatusBar
        wordCount={wordCount}
        paragraphCount={paragraphCount}
        healthScore={healthScore}
        profileName="NĐ 30/2020 TVCI"
      />
    </div>
  );
}
```

---

## 6. Verification & Test Plan

### 6.1 Unit Test: Design System Tokens & Presets (`tests/unit/design-system.test.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import tailwindConfig from '../../tailwind.config';

describe('Design System Tokens Specification', () => {
  it('defines the exact TVCI primary Indigo color (#6366F1)', () => {
    const primary = (tailwindConfig.theme?.extend?.colors as any)?.primary;
    expect(primary.DEFAULT).toBe('#6366F1');
    expect(primary[500]).toBe('#6366F1');
  });

  it('defines the exact Emerald action trigger color (#10B981)', () => {
    const action = (tailwindConfig.theme?.extend?.colors as any)?.action;
    expect(action.DEFAULT).toBe('#10B981');
    expect(action[500]).toBe('#10B981');
  });

  it('defines legal NĐ 30/2020 page margin presets', () => {
    const spacing = (tailwindConfig.theme?.extend?.spacing as any);
    expect(spacing['a4-w']).toBe('210mm');
    expect(spacing['a4-h']).toBe('297mm');
    expect(spacing['nd30-top']).toBe('20mm');
    expect(spacing['nd30-bottom']).toBe('20mm');
    expect(spacing['nd30-left']).toBe('30mm');
    expect(spacing['nd30-right']).toBe('15mm');
  });

  it('configures Plus Jakarta Sans as primary font and Times New Roman as canvas font', () => {
    const fontFamily = (tailwindConfig.theme?.extend?.fontFamily as any);
    expect(fontFamily.sans[0]).toBe('var(--font-plus-jakarta-sans)');
    expect(fontFamily.canvas[0]).toBe('"Times New Roman"');
  });
});
```

### 6.2 Component Unit Test: Application Header (`tests/unit/Header.test.tsx`)

```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '@/components/layout/Header';

describe('Header Component', () => {
  it('renders document title and brand marker', () => {
    render(
      <Header
        documentTitle="CV_Gui_Tap_Doan.docx"
        isSaved={true}
        sidebarOpen={true}
        onTitleChange={vi.fn()}
        onToggleSidebar={vi.fn()}
        onNewDocument={vi.fn()}
        onImportDocx={vi.fn()}
        onExportDocx={vi.fn()}
        onOpenSettings={vi.fn()}
      />
    );

    expect(screen.getByText('TVCI Document')).toBeInTheDocument();
    expect(screen.getByText('CV_Gui_Tap_Doan.docx')).toBeInTheDocument();
    expect(screen.getByText('Đã lưu')).toBeInTheDocument();
  });

  it('triggers onExportDocx when Export button is clicked', () => {
    const handleExport = vi.fn();
    render(
      <Header
        documentTitle="Test.docx"
        isSaved={true}
        sidebarOpen={true}
        onTitleChange={vi.fn()}
        onToggleSidebar={vi.fn()}
        onNewDocument={vi.fn()}
        onImportDocx={vi.fn()}
        onExportDocx={handleExport}
        onOpenSettings={vi.fn()}
      />
    );

    const exportBtn = screen.getByRole('button', { name: /Xuất DOCX/i });
    fireEvent.click(exportBtn);
    expect(handleExport).toHaveBeenCalledTimes(1);
  });
});
```

---

## 7. Build & Verification Commands

Once files are scaffolded in `web_app`, verification is executed with standard npm commands:

```bash
# 1. Type checking (strict TypeScript without emit)
npm run typecheck

# 2. Automated test suite via Vitest (zero ESM issues)
npm test

# 3. Next.js production build (verifies App Router, SSR, assets)
npm run build
```
