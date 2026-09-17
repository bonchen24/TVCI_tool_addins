# Chuẩn hóa nội dung IEMM, Đảng và TVCI

## Phạm vi

Chuẩn hóa luồng soạn thảo và các biểu mẫu đang sử dụng cho IEMM, Trung tâm TVCI, Văn bản Đảng và Đảng ủy Viện. Các mẫu TKV và nhóm mẫu NĐ30 độc lập không còn là lựa chọn mặc định trong catalog hoặc giao diện. Các file cũ có thể vẫn nằm trên đĩa để tương thích dữ liệu cũ, nhưng không được dùng làm nguồn cho luồng mới.

## Thứ tự áp dụng

Mọi thao tác chèn template hoặc cấu trúc mới phải áp dụng khổ A4, hướng dọc và lề trên 20mm, dưới 20mm, trái 30mm, phải 15mm trước khi chèn hoặc định dạng nội dung. Bộ kiểm tra cũng phải kiểm tra các thông số này ở cấp tài liệu.

## Quy cách phần nội dung

- IEMM/TVCI: Times New Roman 13pt, chữ thường đứng, căn đều hai lề, thụt dòng đầu 10mm, cách đoạn sau tối thiểu 6pt và giãn dòng trong giới hạn đơn đến 1,5; bộ chèn mới dùng 18pt để dễ căn chỉnh.
- Đảng/Đảng ủy Viện: Times New Roman 13pt, chữ thường đứng, căn đều, thụt dòng đầu 10mm, cách đoạn sau 6pt, giãn dòng Exactly 18pt. Nội dung kết thúc bằng dấu chấm.
- Căn cứ: chữ nghiêng 13pt, mỗi căn cứ một đoạn riêng; văn bản hành chính kết thúc dòng cuối bằng dấu chấm, văn bản Đảng kết thúc dòng cuối bằng dấu phẩy; các dòng trước kết thúc bằng dấu chấm phẩy.
- Phần/Chương/Mục/Tiểu mục có nhãn và tiêu đề ở hai dòng riêng; nhãn và tiêu đề căn giữa, đậm, 13pt, tiêu đề viết hoa. Điều thụt đầu dòng 10mm, đậm, 13pt. Khoản dùng số Ả Rập kèm dấu chấm; điểm dùng chữ cái tiếng Việt kèm dấu đóng ngoặc đơn.
- Dòng V/v dùng dạng `V/v [trích yếu]`, không có dấu hai chấm và không tự viết hoa chữ đầu trích yếu.

## Quy cách Nơi nhận

`Nơi nhận:` đứng riêng một dòng, căn trái, cỡ 12, nghiêng đậm. Mỗi nơi nhận là một dòng cỡ 11, đứng, có `-` ở đầu và dấu `;` ở cuối. Dòng cuối bắt đầu bằng `Lưu:`, dùng `VT` và tên đầy đủ của đơn vị/bộ phận, kết thúc bằng dấu chấm. Văn bản đã có Kính gửi/Kính trình dùng dòng `- Như trên;`.

Giao diện cung cấp các preset chọn nhanh cho Như trên, Viện trưởng, các phòng/ban/đơn vị thuộc Viện, Đảng ủy Viện, Trung tâm Thử nghiệm - Kiểm định Công nghiệp và dòng lưu Văn thư; người dùng vẫn có thể sửa danh sách trước khi chèn.

## Đường kẻ tiêu đề

Chỉ tạo đường kẻ nét liền bên dưới Tên loại/Trích yếu. Chiều dài nằm trong khoảng 1/3 đến 1/2 chiều dài dòng dài nhất của tiêu đề, mặc định khoảng 40%, căn giữa; tiêu đề nhiều dòng dùng dòng dài nhất. Không tạo đường kẻ ở khu vực ngày tháng, quốc hiệu, cơ quan hoặc header khác.

## Catalog

Giao diện chỉ hiển thị IEMM, TVCI và Văn bản Đảng; TVCI dùng bộ quy tắc hành chính IEMM. Văn bản Đảng bao gồm ngữ cảnh Đảng ủy Viện. Các symbol bắt buộc của số/ký hiệu vẫn được giữ, nhưng nội dung mô tả, preset nơi nhận và văn bản hướng dẫn dùng tên đơn vị đầy đủ, trừ viết tắt bắt buộc như VT.

## Kiểm chứng

Kiểm thử cấu trúc rule, formatter, outline, căn cứ, Nơi nhận, catalog và template DOCX; kiểm tra XML page setup; render đại diện IEMM, TVCI và Đảng để kiểm tra khoảng cách, căn lề, đường kẻ và không tràn chữ.
