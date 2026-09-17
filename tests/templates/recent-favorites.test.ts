import {
  addRecentTemplate,
  getRecentTemplateIds,
  toggleFavoriteTemplate,
  isFavoriteTemplate,
  getFavoriteTemplateIds,
} from "../../src/templates/recent-favorites";

describe("recent-favorites service", () => {
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

  test("manages recent templates with max limit and recency order", () => {
    expect(getRecentTemplateIds()).toEqual([]);

    addRecentTemplate("tvci-cv-001");
    expect(getRecentTemplateIds()).toEqual(["tvci-cv-001"]);

    addRecentTemplate("iemm-qd-001");
    expect(getRecentTemplateIds()).toEqual(["iemm-qd-001", "tvci-cv-001"]);

    // Re-adding existing template moves it to the front without duplication
    addRecentTemplate("tvci-cv-001");
    expect(getRecentTemplateIds()).toEqual(["tvci-cv-001", "iemm-qd-001"]);

    // Adding up to max 10
    for (let i = 1; i <= 15; i++) {
      addRecentTemplate(`template-${i}`);
    }
    const recents = getRecentTemplateIds();
    expect(recents.length).toBe(10);
    expect(recents[0]).toBe("template-15");
  });

  test("manages favorite templates with toggle", () => {
    expect(getFavoriteTemplateIds()).toEqual([]);
    expect(isFavoriteTemplate("tvci-cv-001")).toBe(false);

    toggleFavoriteTemplate("tvci-cv-001");
    expect(isFavoriteTemplate("tvci-cv-001")).toBe(true);
    expect(getFavoriteTemplateIds()).toContain("tvci-cv-001");

    // Toggle off
    toggleFavoriteTemplate("tvci-cv-001");
    expect(isFavoriteTemplate("tvci-cv-001")).toBe(false);
    expect(getFavoriteTemplateIds()).not.toContain("tvci-cv-001");
  });
});
