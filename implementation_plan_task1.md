# Task nhỏ 1 — UX Tạo biểu mẫu và Ghi nhớ kinh nghiệm

## Phạm vi

- Giữ nguyên các callback thao tác Word, lưu nháp, điền AI và storage hiện có.
- Cải tiến `FormDraftingView`, `LearnExperienceModal`, `styles.css` và helper/test trực tiếp.
- Không tự lưu kinh nghiệm; chỉ tạo điểm chạm rõ ràng sau khi xử lý form thành công.

## Kế hoạch thực hiện

1. **Red — helper workflow**
   - Thêm test cho thống kê trường bắt buộc, trạng thái luồng và khả năng áp dụng.
   - Chạy test riêng để xác nhận test đỏ.
2. **Green — Tạo biểu mẫu**
   - Hiển thị luồng 6 bước, chú thích phần cố định của mẫu và phần được phép nhập.
   - Giữ trường hiện có; đưa AI và CTA phụ vào progressive disclosure.
   - Bổ sung trạng thái loading/success và CTA mở Ghi nhớ kinh nghiệm.
3. **Green — Ghi nhớ kinh nghiệm**
   - Rút gọn văn phong, tách nguồn và rà soát, hiển thị phạm vi áp dụng.
   - Hiển thị bản ghi tương tự; cho phép cập nhật/gộp, tạo mới hoặc xóa bản ghi tùy chọn.
   - Giữ duplicate guard và fallback heuristic/AI hiện tại.
4. **Refactor/responsive**
   - Chuyển phần trình bày sang class CSS, giới hạn chiều cao modal, tránh tràn ngang ở taskpane hẹp.
5. **Verification**
   - Chạy test liên quan, `npm run typecheck`, `npm test`, `npm run build`, `npm run validate-manifest`.

## Tiêu chí hoàn thành

- Người dùng thấy rõ mẫu cố định không cần nhập lại và trường cần nhập.
- Có đúng một CTA chính ở vùng thao tác; tùy chọn phụ nằm trong phần mở rộng.
- Sau khi áp dụng/chèn thành công có nút mở luồng ghi nhớ, không tự lưu.
- Không có bản ghi gần trùng được lưu im lặng.
- Modal dùng được trong taskpane hẹp và không làm thay đổi logic Word hiện tại.
