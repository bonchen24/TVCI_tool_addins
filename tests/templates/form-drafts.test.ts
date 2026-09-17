import {
  saveTemplateFormDraft,
  loadTemplateFormDraft,
  deleteTemplateFormDraft,
  getLatestActiveDraft,
} from "../../src/templates/form-drafts";

describe("form-drafts service", () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    const storageMock = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
    };
    Object.defineProperty(global, "localStorage", {
      value: storageMock,
      writable: true,
    });
  });

  test("saves, loads, and deletes a draft", () => {
    saveTemplateFormDraft("tvci-cv-001", "TVCI", "Công văn", { TRICH_YEU: "V/v thử nghiệm" });
    const loaded = loadTemplateFormDraft("tvci-cv-001", "TVCI", "Công văn");
    expect(loaded?.values.TRICH_YEU).toBe("V/v thử nghiệm");

    deleteTemplateFormDraft("tvci-cv-001", "TVCI", "Công văn");
    expect(loadTemplateFormDraft("tvci-cv-001", "TVCI", "Công văn")).toBeNull();
  });

  test("retrieves the latest active draft across templates", () => {
    expect(getLatestActiveDraft()).toBeNull();

    saveTemplateFormDraft("tvci-cv-001", "TVCI", "Công văn", { TRICH_YEU: "Draft 1" });
    saveTemplateFormDraft("iemm-qd-001", "IEMM", "Quyết định", { TRICH_YEU: "Draft 2" });

    const latest = getLatestActiveDraft();
    expect(latest?.templateId).toBe("iemm-qd-001");
    expect(latest?.values.TRICH_YEU).toBe("Draft 2");
  });
});
