import type { TemplateOrganization } from "../templates/library";

export type KnowledgeCategory = "mandatory" | "guideline" | "experience" | "phrase";

export type KnowledgeScope = TemplateOrganization | "COMMON";

export interface KnowledgeRecord {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  scope: KnowledgeScope;
  department?: string;
  tags: string[];
  referenceSource?: string;
  exampleSnippet?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const KNOWLEDGE_CATEGORY_META: Record<KnowledgeCategory, { label: string; icon: string; color: string; bg: string; border: string }> = {
  mandatory: {
    label: "Quy tắc bắt buộc",
    icon: "🔴",
    color: "#991b1b",
    bg: "#fef2f2",
    border: "#ef4444",
  },
  guideline: {
    label: "Hướng dẫn trình bày",
    icon: "🔵",
    color: "#1e40af",
    bg: "#eff6ff",
    border: "#3b82f6",
  },
  experience: {
    label: "Kinh nghiệm thực tế",
    icon: "🟡",
    color: "#92400e",
    bg: "#fffbeb",
    border: "#f59e0b",
  },
  phrase: {
    label: "Mẫu câu chuẩn",
    icon: "🟢",
    color: "#065f46",
    bg: "#f0fdf4",
    border: "#10b981",
  },
};
