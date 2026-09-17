export interface TvciTemplateTab {
  id: string;
  label: string;
  enabled: boolean;
}

export const TVCI_TEMPLATE_TABS: TvciTemplateTab[] = [
  { id: "common", label: "Văn bản chung", enabled: true },
  { id: "materials", label: "PTN Vật liệu", enabled: true },
  { id: "energy-efficiency", label: "Hiệu suất năng lượng", enabled: true },
  { id: "electrical-electronics", label: "Điện - điện tử", enabled: true },
  { id: "inspection-certification-market", label: "Giám định - Chứng nhận, Phát triển thị trường", enabled: true },
  { id: "environment", label: "PTN Môi trường", enabled: true },
  { id: "reserved-7", label: "Chờ bổ sung 1", enabled: false },
  { id: "reserved-8", label: "Chờ bổ sung 2", enabled: false },
];

export function activeTvciTemplateTabs(): TvciTemplateTab[] {
  return TVCI_TEMPLATE_TABS.filter((tab) => tab.enabled);
}
