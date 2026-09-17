export const CONTENT_CONTROL_FIELDS = [
  "SO_VAN_BAN", "SO_HO_SO", "TEN_KHACH_HANG", "DIA_CHI", "SAN_PHAM", "MODEL", "TIEU_CHUAN", "NGAY_BAN_HANH", "NGUOI_KY",
] as const;

export function normalizeControlTag(tag: string): string {
  return tag.trim().toUpperCase();
}
