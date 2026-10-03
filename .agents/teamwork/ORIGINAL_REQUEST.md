# Original User Request

## 2026-09-29T02:15:00Z

Xây dựng Web Application độc lập cấp production cho bộ công cụ xử lý văn bản TVCI: tích hợp trình soạn thảo tài liệu hỗ trợ nhập/xuất DOCX, bộ máy kiểm tra & chuẩn hóa thể thức văn bản hành chính Việt Nam, thư viện mẫu biểu và không gian làm việc AI soạn thảo/soát lỗi.

Working directory: e:\CODING\TVCI_web_app
Integrity mode: development

Reference material:
- Word Add-in source & rules: e:\CODING\TVCI_word_addins\src
- Sample documents & templates: e:\CODING\TVCI_word_addins\templates, e:\CODING\TVCI_word_addins\test-documents

## Requirements

### R1. Document Editor & DOCX Interoperability
Xây dựng giao diện soạn thảo văn bản phong phú trên nền Web (Next.js 14, Tailwind CSS). Hỗ trợ tải lên (import) tệp `.docx` giữ cấu trúc định dạng cơ bản (đoạn văn, bảng biểu, căn lề, tiêu đề) và xuất (export) thành tệp `.docx` hợp lệ mở được chuẩn xác trên Microsoft Word.

### R2. TVCI Administrative Format Audit & Auto-Correction
Tích hợp bộ máy phân tích & chuẩn hóa thể thức văn bản hành chính theo tiêu chuẩn TVCI / Nghị định 30/2020/NĐ-CP (font chữ Times New Roman, cỡ chữ, căn lề đoạn, khoảng cách dòng/đoạn, tiêu ngữ, số hiệu, địa danh/ngày tháng, nơi nhận, chức vụ người ký). Cung cấp bảng kiểm tra phát hiện lỗi kèm khả năng sửa lỗi theo từng mục hoặc sửa an toàn.

### R3. Template Management & Dynamic Fill
Cung cấp thư viện mẫu biểu chuẩn TVCI (Công văn, Thông báo, Quyết định, Tờ trình...). Cho phép người dùng chọn mẫu, điền các trường thông tin tự động và chèn trực tiếp vào tài liệu đang soạn.

### R4. AI Workspace with Preview-First Workflow
Tích hợp 3 phân hệ trợ lý AI: Soạn thảo theo ngữ cảnh (Drafting), Điền nhanh mẫu biểu (Template Fill) và Soát lỗi/trau chuốt câu từ (Proofreading). Hỗ trợ cả 2 nhà cung cấp API: OpenAI và Google Gemini. Bắt buộc hiển thị bản xem trước khác biệt (Diff preview) để người dùng phê duyệt trước khi áp dụng thay đổi vào văn bản.

### R5. Professional UI/UX & Design System
Giao diện đạt tiêu chuẩn UI/UX hiện đại (Flat/Minimal, font chữ Plus Jakarta Sans, icon SVG Lucide đồng bộ, màu chủ đạo Indigo `#6366F1` và nút thao tác Emerald `#10B981`). Bố cục gồm thanh công cụ soạn thảo, khung văn bản trung tâm, và thanh bên có thể thu gọn chuyển đổi giữa Bộ chuẩn hóa, Thư viện mẫu và AI Workspace. Đảm bảo độ tương phản cao, thao tác bàn phím và phản hồi tương tác mượt mà.

## Acceptance Criteria

### Build & Code Quality
- [ ] `npm run build` chạy thành công không có lỗi TypeScript, ESLint hay lỗi biên dịch Next.js.
- [ ] Bộ kiểm thử tự động (Unit / Integration tests) chạy qua 100% với `npm test`.

### Interoperability & Format Engine
- [ ] Tải lên được ít nhất 2 tệp `.docx` mẫu từ kho mẫu hiện có, chỉnh sửa và xuất ra tệp `.docx` mở được trên Microsoft Word không bị lỗi cấu trúc file.
- [ ] Công cụ Audit thể thức phát hiện chính xác các sai lệch về font chữ, cỡ chữ hoặc căn lề theo quy định và tính năng Fix khắc phục được các lỗi đó.

### AI & Template Operations
- [ ] Khởi tạo được tài liệu mới từ một mẫu biểu TVCI chuẩn.
- [ ] AI Workspace kết nối thành công với OpenAI / Gemini API (khi cấu hình API key), tạo nội dung và hiển thị so sánh (diff) trước khi chèn vào văn bản.

## Follow-up — 2026-09-29T06:48:42Z

Resume immediately from Milestone 5 (`ai-workspace-diff`):
- 3 AI subsystems: Contextual Drafting, Template Fill, Proofreading.
- Dual provider: OpenAI & Google Gemini API.
- Prompt guards: STRICT Vietnamese administrative style (no hallucinations, no extra markdown, no emojis).
- Visual Diff Preview: Word-level diff with Accept / Reject before applying to Tiptap editor.
- Connect AI tab in Sidebar (`web_app/src/components/layout/Sidebar.tsx`) and API routes.
- Unit tests & verification.

Following M5, execute Milestone 6 (`final-e2e-verification-hardening`):
- Run full E2E test runner (`node web_app/e2e-tests/runner.js`) across all 4 tiers (188 tests).
- Adversarial hardening & final build check.
- When 100% verified, report completion back to Sentinel.

## 2026-09-29T08:18:22Z

Tiếp tục thực hiện Milestone 6 (chạy bộ kiểm thử E2E 38 test suites / 188 ca kiểm thử 4 tầng, rà soát hardening và hoàn tất dự án TVCI Web App).

