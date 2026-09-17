import { convertTCVN3ToUnicode, convertVNIToUnicode, detectEncoding } from "../../src/word/unicode-converter.service";

describe("Unicode Converter", () => {
  it("detects TCVN3 encoding", () => {
    // TCVN3 often has consecutive special chars or matches specific signatures
    expect(detectEncoding("Céng hoµ x· héi chñ nghÜa ViÖt Nam")).toBe("TCVN3");
  });

  it("detects VNI encoding", () => {
    expect(detectEncoding("Coäng hoøa xaõ hoäi chuû nghóa Vieät Nam")).toBe("VNI");
  });

  it("detects Unicode (or unknown) encoding", () => {
    expect(detectEncoding("Cộng hòa xã hội chủ nghĩa Việt Nam")).toBe("UNICODE");
  });

  it("converts TCVN3 to Unicode", () => {
    const input = "Céng hoµ x· héi chñ nghÜa ViÖt Nam";
    const expected = "Cộng hòa xã hội chủ nghĩa Việt Nam";
    expect(convertTCVN3ToUnicode(input)).toBe(expected);
  });

  it("converts VNI to Unicode", () => {
    const input = "Coäng hoøa xaõ hoäi chuû nghóa Vieät Nam";
    const expected = "Cộng hòa xã hội chủ nghĩa Việt Nam";
    expect(convertVNIToUnicode(input)).toBe(expected);
  });
});
