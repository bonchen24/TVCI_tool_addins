# Chạy độc lập trên từng máy khách

Có thể dùng TVCI Word Tools theo mô hình mỗi máy tự chạy local, không cần bộ
cài `.exe` và không cần web server dùng chung. Đây là mô hình phù hợp cho pilot
hoặc môi trường nội bộ có thể chép project tới từng máy.

## Điều kiện bắt buộc

- Windows desktop Microsoft Word.
- Node.js LTS và npm trên từng máy.
- Quyền cho phép cài chứng chỉ development của Office Add-ins ở lần chạy đầu.
- Kết nối Internet nếu dùng OpenAI/Gemini hoặc cài dependency lần đầu.

Office Add-in không thể tải trực tiếp từ `file://`. Vì vậy, mỗi máy vẫn phải
chạy một HTTPS web server local tại `https://localhost:38473`; đây là server
development của project, không phải một dịch vụ trung tâm.

## Setup và chạy

Chép toàn bộ project lên máy khách, mở PowerShell tại thư mục project và chạy:

```powershell
npm run setup:local
```

Hoặc bấm đúp file `setup.cmd` để người dùng không phải gõ lệnh. Setup thực hiện
đầy đủ các bước: cài dependency theo lockfile, cài/chấp nhận certificate HTTPS,
đăng ký shortcut host vào Startup của user hiện tại, khởi động host nền ẩn và
đăng ký manifest vào thiết lập Office của user hiện tại. Setup không mở tài liệu
Word tạm kiểu debug. Nếu Word hỏi cài/chấp nhận
chứng chỉ localhost, chọn cho phép theo chính sách IT của đơn vị.

Sau setup, host tự chạy nền qua launcher Windows ẩn sau mỗi lần đăng nhập
Windows tại `https://localhost:38473`; không cần giữ terminal mở và không tự mở
Word.
Launcher có watchdog: nếu tiến trình host bị dừng bất ngờ, nó tự khởi động lại;
uninstall tạo tín hiệu dừng trước khi dọn process nên không tự bật lại.
Nếu Word hoặc đăng ký add-in cũ còn báo `ADD-IN ERROR`, bấm đúp `repair.cmd` hoặc
chạy `npm run repair:local`. Repair bỏ qua `npm ci`, chỉ khôi phục certificate,
autostart và đăng ký manifest, không mở tài liệu debug và không xóa dữ liệu dự án.
Nếu Word đang mở trong lúc setup, hãy đóng và mở lại Word để nạp Ribbon TVCI
Tools. Manifest chỉ cần đăng ký lại khi Word hoặc chính sách máy khách yêu cầu.

Nếu cần khởi động lại host hoặc đăng ký lại manifest mà không chạy lại toàn bộ
setup, dùng:

```powershell
npm run start:local
```

Lệnh này không mở tài liệu Word tạm. `npm start` vẫn được giữ riêng cho luồng
phát triển/sideload thủ công.

Nếu chính sách máy khách không cho phép công cụ sideload ghi thiết lập Word,
hãy chạy setup với tùy chọn bỏ qua sideload:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-client.ps1 -SkipSideload
```

Sau đó dùng chức năng **Upload My Add-in** của Word để chọn
`manifest/manifest.xml`. Server local đã được đăng ký autostart.

## Xử lý lỗi “ADD-IN ERROR” trong tài liệu cũ

Nếu Word vẫn hiện thông báo add-in chỉ khả dụng khi debugging, tài liệu đang
mở có thể còn giữ một task-pane add-in tạm được chèn từ lần chạy Visual Studio
trước đó. Hãy làm theo thứ tự sau:

1. Đóng hộp thoại lỗi và đóng toàn bộ cửa sổ Word.
2. Chạy lại `setup.cmd` để đăng ký manifest mới; setup không mở tài liệu debug
   tạm và host vẫn chạy nền tại `https://localhost:38473`.
3. Mở lại Word. Nếu lỗi chỉ còn trong một tài liệu cụ thể, mở bản sao của tài
   liệu đó rồi vào **File → Info → Check for Issues → Inspect Document → Task
   Pane Add-ins → Remove All**, sau đó lưu và mở lại tài liệu.

Thao tác **Remove All** chỉ dùng cho tài liệu còn lưu tham chiếu add-in cũ;
không cần thực hiện trên mọi tài liệu mới.

## Tạo gói client local để phân phối

Để chép sang máy khách gọn hơn, tại máy phát triển chạy:

```powershell
npm run package:local-client -- --out-dir=C:\TVCI\tvci-word-tools-local
```

Script tạo một thư mục độc lập gồm manifest localhost, source cần cho webpack,
asset, mẫu DOCX và đầy đủ `setup.cmd`/`uninstall.cmd`. Gói cố ý không chứa
`node_modules`, `dist`, test hoặc metadata Git; vì vậy vẫn cần Node.js LTS trên
máy khách và setup sẽ cài dependency bằng `npm ci`. Có thể nén cả thư mục này
thành ZIP để chép tới từng máy. Trong package client, `npm start` cũng được
đóng gói thành lệnh host nền an toàn; luồng `start:debug` không được phát hành
để tránh hiện lại hộp thoại WebView debug trên máy khách.

Khi cần dừng host local thủ công:

```powershell
npm stop
```

## Uninstall

Bấm đúp `uninstall.cmd` hoặc chạy:

```powershell
npm run uninstall:local
```

Uninstall sẽ cố gắng dừng/gỡ đăng ký add-in khỏi Word và gỡ đúng shortcut
`TVCI Word Tools Local.lnk` khỏi Startup. Lệnh không xóa source project,
`node_modules`, template cá nhân hoặc API key.

Certificate development được giữ lại vì có thể đang được Office Add-in khác sử
dụng. Nếu chắc chắn không còn add-in local nào dùng certificate này, chạy:

```powershell
npm run uninstall:local:purge-cert
```

Khi cần debug WebView bằng VS Code, dùng hai lệnh riêng như trong README:
`npm run dev-server` và `npm run start:debug`.

## Đặc điểm dữ liệu trên từng máy

- Template cá nhân, lịch sử chat và API key nằm trong profile Office/WebView
  của từng máy; không tự đồng bộ sang máy khác.
- Mỗi máy dùng `manifest/manifest.xml` với URL localhost, không dùng manifest
  production trong `release/`.
- Khi có bản cập nhật, chép source mới hoặc cập nhật project rồi chạy lại
  `npm ci` nếu dependency thay đổi.

## Giới hạn cần biết

Mỗi máy vẫn cần Node.js LTS và npm để setup cài dependency lần đầu, nhưng sau
đó không cần giữ terminal mở: shortcut Startup gọi launcher Windows ẩn để chạy
host local. Nếu muốn người dùng chỉ bấm một biểu tượng mà không cài Node/npm,
cần chuyển sang bộ cài có runtime đi kèm hoặc host HTTPS tập trung; đó là các mô
hình triển khai khác với local không-installer.
