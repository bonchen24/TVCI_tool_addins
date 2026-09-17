export const PARTY_DOCUMENT_TYPES = [
  "Nghị quyết",
  "Quyết định",
  "Kế hoạch",
  "Báo cáo",
  "Thông báo",
  "Công văn",
  "Tờ trình",
  "Biên bản",
] as const;

export type PartyDocumentType = (typeof PARTY_DOCUMENT_TYPES)[number];
