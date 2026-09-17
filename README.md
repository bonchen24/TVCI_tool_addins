# TVCI Word Tools

MVP Word add-in for document-format checks, approved DOCX templates, tagged Content Controls, and preview-first AI rewriting.

## Current MVP

- Ribbon entry and React task pane.
- Ribbon có nút truy cập nhanh theo từng khu vực; task pane mặc định chỉ mở `Chuẩn hóa`, các nhóm còn lại thu gọn để giảm chiều dài thanh dọc.
- Read/replace/insert-below current Word selection.
- TVCI-default checks for font, font size, paragraph alignment, and before/after spacing.
- Per-issue safe fixes; no default blanket `Fix all`.
- Insert an approved `.docx` template.
- Fill tagged Word Content Controls.
- Three-tab AI Workspace for document-context drafting, template fill, and proofreading with preview before document mutation.
- Direct OpenAI or Gemini API calls from the Word task pane; no local AI gateway process.
- Production packaging for client deployment: `docs/deployment/client-package.md`.

## Prerequisites

- Windows desktop Microsoft Word for final acceptance.
- Recent Node.js LTS and npm.
- Network access for the initial `npm install` and AI API calls.

Office Add-ins use HTTPS during local development. The development server uses `office-addin-dev-certs` for a trusted localhost certificate.

## Install

```bash
npm install
npm test -- --runInBand
npm run build
npm run validate-manifest
```

## Setup / Uninstall trên máy khách

Để cài đặt local đầy đủ trên Windows, có thể bấm đúp `setup.cmd` hoặc chạy:

```powershell
npm run setup:local
```

Setup sẽ cài dependency theo `package-lock.json`, cài certificate HTTPS
localhost, đăng ký host tự chạy cùng Windows và đăng ký manifest add-in vào
thiết lập Office của user hiện tại. Setup không mở tài liệu Word tạm kiểu
debug. Sau đó không cần giữ terminal mở; host tự chạy nền qua launcher Windows ẩn tại
`https://localhost:38473`. Nếu chính sách Word không cho phép sideload tự động,
setup vẫn có thể chạy phần server bằng `-SkipSideload`, rồi dùng **Upload My
Add-in** trong Word để chọn `manifest/manifest.xml`.
Host được giữ bằng launcher watchdog ẩn và tự khởi động lại nếu tiến trình local
đột ngột dừng.

Nếu Word hoặc đăng ký add-in cũ còn báo `ADD-IN ERROR`, bấm đúp `repair.cmd` hoặc
chạy `npm run repair:local`. Repair chỉ chạy lại certificate, autostart và đăng ký
manifest; không mở tài liệu debug, không xóa mẫu DOCX hay API key. Sau đó đóng và
mở lại Word.

Gỡ cài đặt bằng cách bấm đúp `uninstall.cmd` hoặc chạy:

```powershell
npm run uninstall:local
```

Lệnh này dừng/gỡ đăng ký add-in, xóa autostart và giữ certificate dùng chung
của Office Add-ins. Chỉ khi chắc chắn máy không còn add-in local nào khác mới
chạy thêm `npm run uninstall:local:purge-cert` để gỡ certificate.

### Tạo gói local để chép tới máy khách

Nếu không muốn chép cả thư mục test và artifact phát triển, tạo một thư mục
client tối giản:

```powershell
npm run package:local-client -- --out-dir=C:\TVCI\tvci-word-tools-local
```

Chép thư mục kết quả tới máy khách rồi bấm `setup.cmd`. Gói này không chứa
`node_modules`; setup sẽ chạy `npm ci` theo lockfile. Không cần tạo bộ cài
`.exe` hoặc duy trì server trung tâm.

## Run in Word — local độc lập trên từng máy

Nếu mỗi máy khách tự chạy riêng, sau khi chép source hoặc gói local, chạy một lệnh:

```powershell
npm run setup:local
```

Lệnh này khởi động HTTPS task pane tại `https://localhost:38473`, đăng ký manifest
vào Word và tạo autostart. Lệnh không mở tài liệu debug tạm. Nếu Word đang mở,
hãy đóng và mở lại Word để nạp Ribbon. Mỗi máy cần cài Node.js
LTS và chấp nhận chứng chỉ localhost ở lần chạy đầu. Chi tiết cài/gỡ nằm trong
[`docs/deployment/local-client.md`](docs/deployment/local-client.md).

Nếu muốn chạy thủ công theo chế độ máy khách an toàn, dùng:

```powershell
npm run start:local
```

Lệnh này chỉ khởi động host nền và đăng ký manifest, không mở tài liệu Word
tạm. Nếu muốn chạy luồng sideload dành cho phát triển, dùng hai terminal:

Nếu Word vẫn hiển thị “ADD-IN ERROR” trong một tài liệu đã mở từ lần debug
trước, đóng toàn bộ Word, chạy lại `setup.cmd` rồi mở lại Word. Với tài liệu
cụ thể vẫn còn task-pane add-in cũ, dùng **File → Info → Check for Issues →
Inspect Document → Task Pane Add-ins → Remove All** trên một bản sao tài liệu,
sau đó lưu và mở lại.

For the first run, allow the Microsoft Office development certificate when prompted.

Terminal 1 — HTTPS development server:

```bash
npm run dev-server
```

Terminal 2 — sideload into desktop Word:

```bash
npm start
```

`npm start` là luồng sideload dành cho phát triển/thử thủ công và có thể mở tài
liệu tạm để chèn add-in. Khi triển khai cho máy khách, dùng `setup.cmd` như
phần trên để host chạy nền và chỉ đăng ký manifest, không tạo tài liệu debug.
`npm start` runs without the WebView debugger prompt. When you need to attach
VS Code to the WebView, use:

```bash
npm run start:debug
```

Hoặc dùng alias tương thích:

```bash
npm run start:full
```

## Đóng gói production cho máy khách (tùy chọn)

Nếu sau này chuyển sang host HTTPS tập trung, có thể tạo bộ phân phối gồm nội
dung web tĩnh và manifest production bằng:

```bash
npm run package:client -- --base-url=https://ten-may-chu-noi-bo/tvci-word-tools
```

Chi tiết cách publish web root, cài chứng chỉ tin cậy và phát manifest nằm trong
[`docs/deployment/client-package.md`](docs/deployment/client-package.md). File
`manifest/manifest.xml` vẫn giữ URL localhost và chỉ dùng cho development.

Stop Office debugging with:

```bash
npm stop
```

## Configure AI in the task pane

Open **AI Workspace → Cài đặt AI** and choose:

- **OpenAI** — default model `gpt-5.6-luna`; calls `https://api.openai.com/v1/responses`.
- **Gemini** — default model `gemini-3.5-flash`; calls the Gemini `generateContent` REST endpoint.

Enter the API key and model, then press **Lưu cấu hình**. The configuration is stored in browser-local storage for this add-in profile. **Xóa key** removes the saved credentials.

### Security note

Direct client-side API keys are convenient for a personal/internal prototype but are not a secure multi-user deployment model. OpenAI explicitly recommends not deploying API keys in client-side environments. Do not hard-code or commit keys, do not use a shared organization-wide key, and rotate/revoke a key if the workstation or profile is compromised.

## Manual acceptance

Use `docs/acceptance/mvp-word-checklist.md`. Real Word is the acceptance environment because Office.js/OOXML layout behavior cannot be completely verified by unit tests.

## AI safety behavior

- AI drafting receives the current Word document context (profile, template, document type, selection, tagged Content Controls, and document text); proofreading can also work on pasted text.
- AI output is only a proposal until the user presses `Chấp nhận bản này`; the accepted draft can then be applied with `Chấp nhận & thay đoạn chọn` or `Chấp nhận & chèn bên dưới`.
- Nếu bản nháp được tạo từ vùng chọn Word, add-in kiểm tra lại vùng chọn trước khi ghi; nếu người dùng đã đổi vùng chọn thì thao tác bị từ chối để tránh ghi nhầm.
- Chat chỉ gửi context tài liệu Word sau khi người dùng chủ động bấm `Đọc tài liệu hiện tại`; nếu không, AI chỉ nhận nội dung người dùng nhập.
- Template narrative output also requires explicit acceptance before insertion; preview điền biểu mẫu liệt kê đủ Content Control thật sự có trong Word, còn field bị AI bỏ sót được để `Chưa xác định`; giá trị dưới 80% confidence stay blocked until the user reviews or edits them.
- API keys are never hard-coded into the repository.
- Template layouts remain `.docx` artifacts; the add-in does not reconstruct them with HTML.

## Tự dò model khả dụng

Trong **AI Workspace → Cài đặt AI**, nhập API key rồi bấm **Kiểm tra API & lấy model** hoặc **Lưu cấu hình**. Add-in sẽ:

- OpenAI: gọi `GET /v1/models`, lọc các model text tổng quát và loại image/audio/realtime/embedding/Codex.
- Gemini: gọi `GET /v1beta/models`, chỉ giữ model hỗ trợ `generateContent` và loại image/live/TTS/embedding.
- Tự chọn một model ưu tiên nếu model nhập vào không có trong danh sách; người dùng có thể chọn model khác từ danh sách tải được và giữ lựa chọn đó khi lưu.

OpenAI Models API chỉ trả metadata cơ bản, không khai báo trực tiếp endpoint nào từng model hỗ trợ; vì vậy việc lọc OpenAI dựa trên nhóm/tên model. Việc gọi Responses API thật vẫn là kiểm tra cuối khi người dùng chạy tác vụ AI.

## Kho biểu mẫu và Template Builder

- Biểu mẫu được chia theo 4 tab: **TKV / IEMM / TVCI / Văn bản Đảng**.
- Có thể lọc theo phòng ban và loại văn bản.
- Tìm kiếm hỗ trợ tiếng Việt **không dấu**, từ khóa metadata và lỗi gõ nhỏ.
- Người dùng có thể **Import DOCX** vào kho cá nhân; file được lưu cục bộ trong IndexedDB của add-in.
- Trong **Tạo biểu mẫu**, chọn một vùng trong Word rồi bấm **Đặt trường tại vùng chọn** để biến vùng đó thành Content Control có tag chuẩn như `TEN_KHACH_HANG`, `SO_HO_SO`, `SAN_PHAM`.
- Có thể **Xuất tài liệu hiện tại thành DOCX mẫu**, sau đó import file đó vào kho biểu mẫu.
- Mẫu đóng gói sẵn và mẫu cá nhân cùng xuất hiện trong một kho nhưng được đánh dấu riêng.

Lưu ý: IndexedDB là kho cục bộ theo profile/webview của Office; xóa dữ liệu add-in hoặc profile có thể làm mất các template cá nhân chưa được sao lưu ra file DOCX.

## Rule profiles

Add-in includes separate formatting profiles for NĐ30/TVCI, TKV, IEMM and Party documents. The Party profile follows Hướng dẫn 05-HD/VPTW dated 27/05/2026 for the general body/page baseline (Times New Roman, A4, front-page margins 20/20/30/15 mm). TKV and IEMM are intentionally separate configuration profiles so internal rules can be updated without changing the validator/fixer logic.

For `Nơi nhận`, the validator keeps the label rule separate from the recipient-line rule so it can follow the typography used in the supplied IEMM examples.

Page-size and margin automation uses WordApiDesktop 1.3 when available. On unsupported Word hosts, paragraph checks still run and the task pane reports that page checks are unavailable.


## Nhận diện thành phần thể thức

Khi bấm **Kiểm tra**, add-in quét toàn bộ tài liệu và nhận diện các thành phần chính như Quốc hiệu, Tiêu ngữ, tên cơ quan, số/ký hiệu, địa danh-ngày tháng, tên loại văn bản, trích yếu, nơi nhận và quyền hạn/chức vụ người ký. Với profile Văn bản Đảng, bộ nhận diện dùng riêng tiêu đề **ĐẢNG CỘNG SẢN VIỆT NAM** và các quy tắc thành phần của 05-HD/VPTW.

Mỗi thành phần được kiểm tra bằng rule riêng về Times New Roman, cỡ chữ hoặc khoảng cỡ chữ, đậm/nghiêng và căn đoạn. Lỗi thành phần dùng chỉ số đoạn của toàn tài liệu (`doc:p:n`) nên nút **Sửa** có thể áp dụng đúng đoạn ngay cả khi con trỏ đang ở vị trí khác. Nhận diện cấu trúc chạy cục bộ, không tiêu thụ API AI.

## Soạn thảo chuẩn

Task pane có nhóm **Soạn thảo chuẩn** để chèn cấu trúc theo rule profile đang chọn:

- Tạo bảng theo font/cỡ chữ thân văn bản; hàng tiêu đề đậm, căn giữa, đường viền mảnh. Tài liệu nguồn không quy định một cỡ chữ riêng áp dụng cho mọi bảng, nên add-in không tự đặt thêm quy tắc ngoài profile.
- Tạo danh sách gạch đầu dòng và đánh số bằng native Word list formatting, có chọn cấp lồng nhau; add-in không chèn ký tự giả làm số/bullet.
- Chèn các cấp **Phần / Chương / Mục / Điều / Khoản / Điểm / Ý** theo cấu trúc và cỡ chữ của profile.
- Chèn **Kính gửi** một nơi hoặc nhiều nơi với dấu câu và căn chỉnh theo profile hành chính/IEMM/Văn bản Đảng.
- Chèn **Nơi nhận** với nhãn và cỡ chữ riêng theo profile; nội dung mỗi nơi nhận nhập trên một dòng.
- Chèn các đường kẻ chuẩn dưới Tiêu ngữ, tên cơ quan, tên loại/trích yếu hoặc đường phân cách toàn chiều ngang.
- Bật/tắt số trang. Profile NĐ30/TVCI mặc định số trang ở giữa lề trên và ẩn trang đầu; profile IEMM mặc định bên phải footer và ẩn trang đầu theo tài liệu Viện.
- Header và Footer là tùy chọn độc lập, mặc định tắt. Add-in chỉ xóa/thay phần Header/Footer do chính add-in tạo bằng Content Control tag, không xóa nội dung Header/Footer khác của tài liệu.

Ẩn số trang ở trang đầu cần **WordApiDesktop 1.3**. Nếu host Word không hỗ trợ API này, add-in báo lỗi thay vì tạo số trang sai quy cách.
