# Inventory chức năng và ảnh evidence — Văn bản và thể chế

**Ngày thu thập:** 2026-10-02  
**Production:** `http://127.0.0.1:2350`  
**Phạm vi:** chỉ kiểm kê `web_app` theo `design.md`, mở production bằng Chrome có sẵn qua CDP và lưu ảnh PNG. Không sửa logic sản phẩm.

## Ảnh production đã chụp

| Tệp | Nội dung có thể quan sát | Gợi ý dùng trong bài báo |
|---|---|---|
| [account-login.png](account-login.png) | Màn hình đăng nhập TVCI, đăng nhập độc lập với Google Drive, liên kết tạo/khôi phục tài khoản. | Hình bối cảnh kiểm soát truy cập và tách tài khoản ứng dụng khỏi tài khoản Drive. |
| [account-register-consent.png](account-register-consent.png) | Form chỉ có username/mật khẩu/xác nhận, khuyến nghị không dùng định danh cá nhân, nội dung cam kết quyền riêng tư và checkbox chấp nhận. | Hình mô tả cơ chế đồng thuận và nguyên tắc giảm thu thập dữ liệu. |

Ảnh được chụp trực tiếp từ production ở viewport 1600×1200, không chèn/ghép hoặc sửa ảnh. Trang `/` trong profile browser mới chuyển tới `/login`; vì chưa có session QA, các route bảo vệ không cho mở editor.

## Inventory theo mã nguồn và mức bằng chứng

“Có trong mã” nghĩa là thành phần/luồng hiện diện trong source `web_app`; chỉ hai ảnh phía trên được xác nhận trực quan trên production trong lượt này. Không coi source-only là bằng chứng rằng mọi thao tác đã chạy thành công trên deployment.

| Nhóm | Chức năng có trong `web_app` và evidence | Ảnh phù hợp / giới hạn bằng chứng |
|---|---|---|
| Editor, A4, DOCX | Trang được bảo vệ dựng `EditorWorkspace`; canvas Tiptap theo khổ A4; nhập DOCX qua importer và xuất DOCX qua exporter. [`page.tsx`](../../web_app/app/%28protected%29/page.tsx#L5), [`EditorWorkspace.tsx`](../../web_app/src/components/editor/EditorWorkspace.tsx#L192), [`A4Canvas.tsx`](../../web_app/src/components/editor/A4Canvas.tsx#L27), [`importer.ts`](../../web_app/src/docx/importer.ts#L1066), [`exporter.ts`](../../web_app/src/docx/exporter.ts#L376) | Chưa có ảnh editor production trong lượt này do cần đăng nhập. Không tuyên bố đã kiểm chứng fidelity/round-trip bằng một DOCX trên deployment. |
| Audit thể thức và auto-fix | Bộ đánh giá có các trạng thái `PASS/FAIL/MISSING/NOT_APPLICABLE`, profile hành chính (NĐ30/TVCI, TKV, IEMM) và văn bản Đảng; kiểm tra khổ/hướng/lề, thành phần văn bản và định dạng đoạn. Sidebar có sửa an toàn và sửa từng lỗi khi `autoFixable`; `auto-fixer` chỉ áp dụng các issue được đánh dấu có thể sửa. [`profiles.ts`](../../web_app/src/rules/profiles.ts#L34), [`document-evaluator.ts`](../../web_app/src/rules/document-evaluator.ts#L167), [`auto-fixer.ts`](../../web_app/src/rules/auto-fixer.ts#L194), [`Sidebar.tsx`](../../web_app/src/components/layout/Sidebar.tsx#L472), [`design.md`](../../design.md#L148) | Chưa chụp panel audit trên production. Không diễn giải điểm kiểm tra thành chứng nhận tuân thủ pháp luật; một số lỗi nội dung yêu cầu người dùng xử lý và không auto-fix. |
| Chính tả tiếng Việt | Có nguồn `web_app/data/spellcheck/Vietnamese.dic`; bước build chuẩn bị `vi-base.txt`; browser nạp `vi.aff`, `vi.dic`, `vi-base.txt`; panel tách nhóm chính tả với trình bày/ngữ pháp cơ bản, cho gợi ý/bỏ qua/thêm hoặc xóa từ trong từ điển cá nhân. Tài khoản lưu term/cụm đã chủ động thêm trong bảng riêng. [`prepare-vietnamese-dictionary.mjs`](../../web_app/scripts/prepare-vietnamese-dictionary.mjs#L8), [`dictionary.ts`](../../web_app/src/spellcheck/dictionary.ts#L30), [`SpellcheckPanel.tsx`](../../web_app/src/components/editor/SpellcheckPanel.tsx#L93), [`dictionary-storage.ts`](../../web_app/src/spellcheck/dictionary-storage.ts#L17), [`design.md`](../../design.md#L59) | Asset production `/spellcheck/vi-base.txt` trả HTTP 200; chưa có ảnh panel vì cần session. Nguồn từ điển là tín hiệu nhận diện/gợi ý, không phải chuẩn đúng tuyệt đối; thiết kế nói rõ không tự sửa văn bản. |
| Thư viện biểu mẫu và schema | Catalog khai báo 22 mẫu, tổ chức TVCI/IEMM/TKV/DANG. Nhóm nhãn gồm Công văn, Thông báo, Quyết định, Công văn Đảng, Tờ trình, Biên bản, Báo cáo, Kế hoạch, Chương trình, Giấy mời, Giấy giới thiệu, Nghỉ phép, Cam kết, Thư mời, Mẫu chuẩn TVCI. Có 8 schema hành chính chính và 2 schema nội bộ (`thu_moi`, `don_nghi_phep`); form được dựng từ schema và áp vào editor. [`catalog.ts`](../../web_app/src/templates/catalog.ts#L23), [`form-schema.ts`](../../web_app/src/templates/form-schema.ts#L95), [`Sidebar.tsx`](../../web_app/src/components/layout/Sidebar.tsx#L636) | Chưa có ảnh thư viện production. Danh mục/schema là bằng chứng source; không khẳng định đây là toàn bộ biểu mẫu được cơ quan phê duyệt hoặc đã được nghiệp vụ nghiệm thu. |
| AI drafting, proofreading, template-fill, diff | Workspace có ba tab Soạn thảo/Hiệu đính/Điền biểu mẫu; có preview khác biệt và lựa chọn áp dụng thay đổi. Provider trong UI/source hiện là `mock`, OpenAI, Gemini; mặc định UI là `mock`. Cấu hình provider và API key được lưu bằng `localStorage`. [`AiWorkspacePanel.tsx`](../../web_app/src/components/ai/AiWorkspacePanel.tsx#L49), [`types.ts`](../../web_app/src/ai/types.ts#L6), [`DiffPreviewModal.tsx`](../../web_app/src/components/ai/DiffPreviewModal.tsx#L61), [`direct-client.ts`](../../web_app/src/ai/direct-client.ts#L197) | Chưa có ảnh AI workspace/diff production. Không tuyên bố Claude/local LLM từ source hiện tại. Khi chọn provider từ xa, văn bản của yêu cầu được gửi trong luồng AI; chưa kiểm chứng cài đặt provider hoặc chính sách lưu log của production. |
| Account, login/register, consent, admin | Login, register, recovery-code flow và form chấp nhận điều khoản. Register yêu cầu username/password và ghi nhận chấp nhận; recovery code chỉ hiện một lần. Admin page chỉ cho superadmin; source có danh sách metadata điều khoản, trạng thái bật/tắt tài khoản, xoay recovery code. Không tìm thấy route tự xóa account. [`RegisterForm.tsx`](../../web_app/src/components/auth/RegisterForm.tsx#L7), [`terms.ts`](../../web_app/src/privacy/terms.ts#L1), [`admin/page.tsx`](../../web_app/app/%28protected%29/admin/page.tsx#L12), [`AdminUsersPanel.tsx`](../../web_app/src/components/auth/AdminUsersPanel.tsx#L12), [`service.ts`](../../web_app/src/auth/service.ts#L279) | Hai ảnh account là production evidence. Chưa chụp trang account/admin; admin cần role superadmin. Không có QA fixture tìm thấy trong source/docs đã rà soát. |
| Google Drive / Documents, Templates, Knowledge, References | Drive là kết nối OAuth tùy chọn; source yêu cầu scope `drive.file`, phân nhóm Documents/Templates/Knowledge/References và thao tác CRUD tài nguyên do người dùng chọn; Knowledge/References chỉ được thêm vào ngữ cảnh AI khi chọn cho yêu cầu tiếp theo. Có AppData cho manifest/index. [`oauth.ts`](../../web_app/src/drive/oauth.ts#L35), [`folders.ts`](../../web_app/src/drive/folders.ts#L6), [`resources.ts`](../../web_app/src/drive/resources.ts#L86), [`PersonalStoragePanel.tsx`](../../web_app/src/components/drive/PersonalStoragePanel.tsx#L164) | Chưa chụp Personal Storage hoặc trạng thái kết nối. Không thấy tích hợp chỉnh sửa tài liệu Google Docs native; tên Documents là nhóm file quản lý trong Drive. Không kết nối Google trong lượt này. |
| Quyền riêng tư và dữ liệu | Thiết kế/terms nói tài khoản không yêu cầu PII; nội dung tài liệu không lưu lâu dài trên server TVCI nếu không opt-in Drive; Drive do người dùng chủ động kết nối; admin không xem nội dung cá nhân. Schema DB hiện có users/sessions/recovery/terms/Drive-connection metadata/từ điển term, không thấy bảng lưu body tài liệu. [`design.md`](../../design.md#L244), [`design.md`](../../design.md#L306), [`schema.ts`](../../web_app/src/db/schema.ts#L44), [`terms.ts`](../../web_app/src/privacy/terms.ts#L8) | Ảnh register minh họa nội dung cam kết; ảnh không chứng minh cấu hình hạ tầng, logging hay việc xóa dữ liệu. Chú ý AI provider từ xa có thể nhận prompt; không viết rằng mọi xử lý AI đều cục bộ hoặc không rời máy người dùng. |

## Không nên tuyên bố từ bằng chứng hiện có

- Không nói hệ thống bảo đảm văn bản “đạt chuẩn 100%”, có giá trị chứng nhận pháp lý, hoặc mọi lỗi đều tự sửa được.
- Không nói kiểm tra chính tả phát hiện đúng mọi lỗi; từ điển và quy tắc giảm false-positive chỉ hỗ trợ rà soát.
- Không nói mọi xử lý AI đều cục bộ/riêng tư: source hỗ trợ OpenAI và Gemini, lưu API key/provider trong `localStorage`, và gửi nội dung qua request AI.
- Không nói đã xác nhận production kết nối được Google Drive, native Google Docs, hoặc đã đọc/ghi Google Drive. Chưa thực hiện OAuth.
- Không nói đã kiểm chứng editor, audit, catalog, AI, chính tả hoặc admin tương tác được trên deployment trong lượt này; các mục đó hiện là bằng chứng source-only.
- Không đưa ảnh/code thành bằng chứng đánh giá hiệu quả, độ chính xác, mức độ chấp nhận người dùng hay tác động nghiên cứu; các kết luận đó cần dữ liệu/phương pháp riêng.

## Giới hạn phiên thu thập

Ở lượt chụp account ban đầu, browser profile sạch chuyển từ `/` sang `/login`, nên các route protected chưa được chụp. Source không có cơ chế account tự xóa, còn route vô hiệu hóa chỉ dành cho admin; vì vậy không tạo account tạm hoặc phát sinh user/session production. Có thể bổ sung ảnh editor/A4, biểu mẫu, AI/diff, chính tả và Personal Storage/admin khi có session đã đăng nhập.

## Xác minh lượt tiếp nối — 2026-10-02

- Đã rebuild và recreate service production bằng `docker compose up -d --build --force-recreate tvci-web-app` từ cấu hình hiện có. Container đang chạy với image `sha256:3fac4d507f5b16f5050b56835f682c68950fc1a81a30b308a0fd86e7e11d41bb`; named volume `web_app_tvci_sqlite_data` vẫn gắn tại `/app/data` và port `2350` được giữ nguyên.
- Route production `/login` trả HTTP 200 sau deploy.
- Lượt này chưa có session đăng nhập và chưa chụp màn hình protected: credential không được đưa qua terminal/tool vì không có kênh nhập bí mật an toàn. Các mục protected trong inventory vẫn là source-only; hai ảnh account ở trên là evidence production hiện có.
- Các browser profile tạm được đóng và xóa; không có ảnh hoặc dữ liệu demo mới được lưu trong production.

Các đường dẫn source ở trên là phiên bản hiện có trong workspace. Production được chụp trực tiếp; lượt này chưa đối chiếu hash bundle/deployment với toàn bộ source workspace.
