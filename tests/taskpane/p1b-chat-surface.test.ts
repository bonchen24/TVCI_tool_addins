import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(__dirname, "../../src/taskpane/components/AiTaskpaneView.tsx"), "utf8");

describe("P1-B normal Task Pane chat surface", () => {
  test("keeps chat/context/composer UI and removes the command dashboard", () => {
    expect(source).toContain("TVCI AI");
    expect(source).toContain('className="aiContextSubtitleRow"');
    expect(source).toContain('className="aiChatThread"');
    expect(source).toContain("messages.map");
    expect(source).toContain('className="aiInputFooter"');
    expect(source).toContain('className="aiChatTextarea"');
    expect(source).toContain("aiAttachment");
    expect(source).toContain("onRefineMessage");
    expect(source).toContain("onApplyFieldsToForm");
    expect(source).toContain("Áp dụng vào biểu mẫu");
    expect(source).toContain("Thay đoạn chọn");
    expect(source).toContain("Chèn vào Word");

    expect(source).not.toContain("XỬ LÝ ĐOẠN BÔI ĐEN");
    expect(source).not.toContain("CÁC TRƯỜNG DỮ LIỆU BIỂU MẪU");
    expect(source).not.toContain("Lưu &amp; Cập nhật vào Word");
    expect(source).not.toContain("Kho mẫu");
    expect(source).not.toContain("onOpenTemplateLibrary");
    expect(source).not.toContain("onStandardizeQuick");
    expect(source).not.toContain("onApplyA4Quick");
    expect(source).not.toContain("onCheckQuick");
    expect(source).not.toContain("Chuẩn A4");
    expect(source).not.toContain("Kiểm tra văn bản");
    expect(source).not.toContain("Chuẩn hóa 1 chạm");
    expect(source).not.toContain("Bảng điều khiển");
    expect(source).not.toContain("department");
  });
});
