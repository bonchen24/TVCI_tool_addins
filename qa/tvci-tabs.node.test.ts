import test from "node:test";
import assert from "node:assert/strict";
import { TVCI_TEMPLATE_TABS, activeTvciTemplateTabs } from "../src/templates/tvci-tabs.ts";

test("TVCI exposes eight template tabs with six active departments and two reserved slots", () => {
  assert.equal(TVCI_TEMPLATE_TABS.length, 8);
  assert.deepEqual(
    TVCI_TEMPLATE_TABS.slice(0, 6).map((tab) => tab.label),
    [
      "Văn bản chung",
      "PTN Vật liệu",
      "Hiệu suất năng lượng",
      "Điện - điện tử",
      "Giám định - Chứng nhận, Phát triển thị trường",
      "PTN Môi trường",
    ],
  );
  assert.equal(TVCI_TEMPLATE_TABS[6].enabled, false);
  assert.equal(TVCI_TEMPLATE_TABS[7].enabled, false);
  assert.equal(activeTvciTemplateTabs().length, 6);
});

test("TVCI tab ids are stable ASCII keys suitable for UI state", () => {
  assert.deepEqual(
    TVCI_TEMPLATE_TABS.map((tab) => tab.id),
    ["common", "materials", "energy-efficiency", "electrical-electronics", "inspection-certification-market", "environment", "reserved-7", "reserved-8"],
  );
});
