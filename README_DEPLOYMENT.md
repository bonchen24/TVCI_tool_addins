# Hướng dẫn Đóng gói & Triển khai TVCI Word Tools

## A. BUILD INSTALLER

Trên máy lập trình viên (có cài Node.js, npm và Inno Setup 6):

1. Cài đặt các gói npm:
   ```bash
   npm ci
   ```
2. Chạy lệnh build tự động:
   ```bash
   npm run installer
   ```

## B. OUTPUT

Sau khi chạy thành công, trình biên dịch sẽ tạo bộ cài tại:
`release/TVCI-Word-Tools-Setup-<version>-x64.exe`

## C. INSTALL ON NEW PC

1. Copy file `.exe` sang máy đích.
2. Double-click file `.exe` để cài đặt.
3. Không cần quyền Administrator. Hệ thống sẽ tự cài vào `%LOCALAPPDATA%\TVCIWordTools`.

## D. REQUIREMENTS

- Windows 10/11
- Microsoft Word Desktop
- Máy đích **KHÔNG CẦN** cài đặt Node.js hay bất kỳ môi trường lập trình nào.

## E. VERIFY

Để kiểm tra bộ cài có hoạt động đúng không:
1. Nhấn Start Menu -> Tìm "TVCI Word Tools Repair"
2. Hoặc chạy trực tiếp script: `%LOCALAPPDATA%\TVCIWordTools\scripts\verify-installation.ps1`
Script sẽ báo xanh (PASS) nếu host localhost đang chạy đúng port và có certificate hợp lệ.

## F. REPAIR

Nếu lỗi phát sinh (ví dụ: mất chứng chỉ), có thể vào Start Menu chọn "TVCI Word Tools Repair". Quá trình sẽ kiểm tra và đăng ký lại add-in vào Word.

## G. UNINSTALL

- Vào Control Panel -> Uninstall a program -> Chọn "TVCI Word Tools"
- Hoặc chạy từ Start Menu "Uninstall TVCI Word Tools".
- Quá trình Uninstall sẽ tự động ngắt server, xóa chứng chỉ, thu hồi manifest từ Word và gỡ bỏ startup entry.

## H. TROUBLESHOOTING

- **Word không thấy add-in**: Có thể do policy của cơ quan chặn "Developer WEF" addin.
- **Certificate lỗi**: Khởi động lại Word hoặc chạy lại Repair.
- **Port conflict**: Nếu port `38473` bị trùng, bộ cài có thể không start được server. Mở `%LOCALAPPDATA%\TVCIWordTools\logs\server.log` để xem chi tiết.
- **Antivirus/SmartScreen warning**: Bản build nội bộ chưa có chữ ký số (Code Signing), do đó Windows SmartScreen có thể cảnh báo "Windows protected your PC". Chọn "More info" -> "Run anyway".
