# Đóng gói triển khai TVCI Word Tools

TVCI Word Tools là Office Web Add-in. Khi triển khai production, máy khách không
cần cài Node.js: Word tải `taskpane.html`, `commands.html`, biểu tượng và mẫu
DOCX từ một web server HTTPS được máy khách tin cậy.

## Tạo bộ phân phối

Chạy tại thư mục project:

```bash
npm install
npm run package:client -- --base-url=https://ten-may-chu-noi-bo/tvci-word-tools
```

Có thể dùng biến môi trường thay cho tham số:

```powershell
$env:TVCI_ADDIN_BASE_URL = "https://ten-may-chu-noi-bo/tvci-word-tools"
npm run package:client
```

Bộ phân phối được tạo tại `release/tvci-word-addin-<version>/`:

- `server/`: nội dung tĩnh cần đưa lên web server tại đúng Base URL.
- `client/manifest.xml`: manifest production để phát cho Word.
- `README.txt` và `deployment.json`: thông tin triển khai.

Script không ghi đè một bộ phân phối cũ. Nếu thư mục đích đã tồn tại, dùng
`--out-dir` với một đường dẫn mới.

## Triển khai cho máy khách

1. Publish toàn bộ nội dung `server/` lên IIS, Nginx, SharePoint hoặc web server
   nội bộ có HTTPS. Nếu Base URL có path, ví dụ `/tvci-word-tools`, phải giữ
   nguyên path đó khi publish.
2. Cài chứng chỉ TLS trên máy khách hoặc dùng chứng chỉ được hệ thống quản lý
   tập trung để Word tin cậy địa chỉ HTTPS.
3. Mở thử `https://ten-may-chu-noi-bo/tvci-word-tools/taskpane.html` trên máy
   khách và kiểm tra có thể tải trang, `assets/logo-tvci.png` và thư mục
   `templates/`.
4. Phát `client/manifest.xml` qua Microsoft 365 Admin Center, catalog add-in
   nội bộ hoặc sideload có kiểm soát. Không dùng lại `manifest/manifest.xml` vì
   file đó dành riêng cho localhost development.

## Cập nhật phiên bản

Tăng `<Version>` trong `manifest/manifest.xml` theo dạng `x.y.z.w` (và cập nhật
`version` trong `package.json` nếu muốn đồng bộ version của project), chạy lại
`npm run package:client`, publish `server/` mới rồi cập nhật manifest production.
Bộ đóng gói dùng version của Office manifest làm tên thư mục release và ghi cả
hai version vào `deployment.json`. Giữ cùng Base URL để máy khách không phải
cài lại cấu hình địa chỉ.

## AI và thông tin nhạy cảm

Bộ phân phối không chứa API key. Phiên bản hiện tại cho phép người dùng nhập
key cá nhân trong task pane và lưu cục bộ theo profile Office; cách này phù hợp
cho pilot nội bộ, nhưng không phù hợp để dùng một key chung cho nhiều máy.
Khi triển khai rộng, nên bổ sung AI gateway nội bộ để giữ secret ở phía máy chủ
và áp dụng xác thực/phân quyền tập trung.
