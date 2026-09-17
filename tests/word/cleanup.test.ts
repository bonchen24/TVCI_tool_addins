import { cleanExtraSpaces, normalizePunctuation, fixManualLineBreaks } from "../../src/word/cleanup.service";

describe("Cleanup Service", () => {
  it("removes extra spaces", () => {
    expect(cleanExtraSpaces("Trung tâm   kiểm định    TVCI")).toBe("Trung tâm kiểm định TVCI");
    expect(cleanExtraSpaces("Khoảng trắng   đầu và cuối  ")).toBe("Khoảng trắng đầu và cuối");
  });

  it("normalizes punctuation spacing", () => {
    // Space before punctuation
    expect(normalizePunctuation("Xin chào ,tôi là Nguyễn Văn A .")).toBe("Xin chào, tôi là Nguyễn Văn A.");
    // No space after punctuation
    expect(normalizePunctuation("Xin chào,tôi là A.Hôm nay")).toBe("Xin chào, tôi là A. Hôm nay");
  });

  it("fixes manual line breaks", () => {
    const input = "Đây là một câu\v bị ngắt dòng thủ công.";
    const expected = "Đây là một câu bị ngắt dòng thủ công.";
    expect(fixManualLineBreaks(input)).toBe(expected);
  });
});
