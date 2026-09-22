import type { TemplateOrganization, TemplateRecord } from "./library";

export interface UserTemplateInput {
  name: string;
  organization: TemplateOrganization;
  /** Legacy storage field; new workflows do not ask users for it. */
  department?: string;
  documentType: string;
  keywords: string;
}

export function makeUserTemplateRecord(
  input: UserTemplateInput,
  id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  updatedAt = new Date().toISOString(),
): TemplateRecord {
  const name = input.name.trim();
  if (!name) throw new Error("Tên biểu mẫu không được để trống.");
  const keywords = input.keywords.split(",").map((item) => item.trim()).filter(Boolean);
  return {
    id,
    name,
    organization: input.organization,
    department: input.department?.trim() || "Dùng chung",
    documentType: input.documentType.trim() || "Biểu mẫu",
    keywords,
    version: "1.0",
    status: "active",
    updatedAt,
    source: { kind: "user", storageId: id },
  };
}

export interface UserTemplateUpdateInput {
  name: string;
  /** Omit to preserve a legacy department value unchanged. */
  department?: string;
  documentType: string;
  version: string;
  keywords: string;
  description?: string;
}

export function updateUserTemplateRecord(
  record: TemplateRecord,
  input: UserTemplateUpdateInput,
  updatedAt = new Date().toISOString(),
): TemplateRecord {
  if (record.source.kind !== "user") throw new Error("Chỉ có thể sửa metadata của biểu mẫu cá nhân.");
  const name = input.name.trim();
  if (!name) throw new Error("Tên biểu mẫu không được để trống.");
  const version = input.version.trim();
  if (!version) throw new Error("Version biểu mẫu không được để trống.");
  return {
    ...record,
    name,
    department: input.department === undefined ? record.department : input.department.trim() || "Dùng chung",
    documentType: input.documentType.trim() || "Biểu mẫu",
    version,
    keywords: input.keywords.split(",").map((item) => item.trim()).filter(Boolean),
    description: input.description?.trim() || undefined,
    updatedAt,
  };
}
