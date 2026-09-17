# Thiết kế: Phụ lục và bảng đánh số từ Ribbon

## Mục tiêu

Mở rộng Ribbon TVCI Tools để người dùng có thể tạo phụ lục ở cuối tài liệu, tạo bảng cho phụ lục và đánh số thứ tự tự động trong cột đầu bảng. Các thao tác phải dùng được từ Word desktop, không làm thay đổi nội dung văn bản chính ngoài vị trí chèn được xác định.

## Phạm vi

- Thêm nút Ribbon `Thêm phụ lục`.
- Thêm nút Ribbon `Tạo bảng phụ lục`.
- Thêm nút Ribbon `Đánh số bảng`.
- Bổ sung khu vực `Phụ lục & bảng` trong task pane để nhập tiêu đề phụ lục, số hàng/cột và lựa chọn hàng tiêu đề.
- Tạo bảng Word native/OXML theo profile đang chọn.
- Đánh số cột đầu bảng từ 1, bỏ qua hàng tiêu đề nếu có.
- Cho phép chạy lại thao tác đánh số để cập nhật số sau khi người dùng sửa bảng.

Không tự động đánh số mọi bảng trong tài liệu và không suy đoán bảng nào là bảng phụ lục nếu người dùng chưa chọn bảng hoặc chưa tạo từ khu vực này.

## Luồng người dùng

1. Người dùng bấm `Thêm phụ lục` trên Ribbon.
2. Task pane mở khu vực `Phụ lục & bảng`; nếu có tiêu đề đã nhập thì dùng tiêu đề đó, nếu chưa có dùng `PHỤ LỤC`.
3. Add-in chèn một ngắt đoạn ở cuối tài liệu, tiêu đề phụ lục và đánh dấu vùng quản lý bằng content control `TVCI_APPENDIX`.
4. Người dùng nhập số hàng/cột, chọn có hàng tiêu đề, rồi bấm `Tạo bảng phụ lục`.
5. Add-in chèn bảng tại cuối phụ lục hoặc vị trí chọn hợp lệ gần vùng phụ lục gần nhất.
6. Người dùng chọn bảng cần xử lý và bấm `Đánh số bảng`; add-in đánh số cột đầu của bảng từ 1, giữ nguyên hàng tiêu đề nếu có.

Các nút Ribbon đều mở đúng khu vực task pane; không thực hiện thao tác Word âm thầm khi người dùng chưa nhìn thấy cấu hình cần thiết.

## Thành phần kỹ thuật

- `src/word/drafting.service.ts`: thêm các hàm chèn phụ lục, tạo bảng phụ lục và đánh số bảng bằng Word API/OXML.
- `src/drafting/presets.ts`: thêm preset typography cho tiêu đề phụ lục và bảng theo profile hiện tại.
- `src/taskpane/App.tsx`: thêm state và khu vực điều khiển; dùng `run` để chuyển lỗi Word thành thông báo an toàn.
- `src/taskpane/styles.css`: bố cục compact, tái sử dụng grid/actions hiện có.
- `manifest/manifest.xml`: thêm nhóm Ribbon `Phụ lục & bảng`, resource label/tooltip/url và các control mới.
- `qa/drafting-tools.node.test.ts`, `qa/ribbon-manifest.node.test.ts`, và test UI: kiểm tra preset, OXML, guard dữ liệu và route.

## Quy tắc an toàn

- Giới hạn hàng/cột theo mức hiện có của task pane; từ chối giá trị không hợp lệ trước khi gọi Word.
- Không xóa hoặc ghi đè bảng hiện tại khi đánh số; chỉ cập nhật ô ở cột đầu của bảng đang được chọn.
- Nếu vùng chọn không phải bảng, báo rõ `Hãy đặt con trỏ trong bảng cần đánh số` và không thay đổi tài liệu.
- Nếu Word API không hỗ trợ thao tác cần thiết, báo rõ yêu cầu phiên bản và giữ nguyên tài liệu.
- Chèn phụ lục ở cuối tài liệu theo lựa chọn đã thống nhất; không tự động di chuyển nội dung hiện hữu.

## Kiểm thử và xác nhận

- Test đỏ trước khi sửa: manifest có control mới, route mở đúng section, preset/OXML có marker và format cần thiết.
- Test xanh: QA toàn bộ, Jest, typecheck và production build.
- Kiểm tra live task pane: nút Ribbon mở đúng khu vực compact.
- Đóng gói lại `release/tvci-word-tools-local-1.0.0.2` sau khi build thành công.

