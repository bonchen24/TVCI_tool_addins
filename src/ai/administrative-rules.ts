/** Shared drafting contract used by every AI entry point. */
export const ADMINISTRATIVE_AI_RULES = [
  "Văn phong hành chính/công vụ: khách quan, chính xác, rõ nghĩa, ngắn gọn, không sáo rỗng và không quảng cáo.",
  "Không được bịa số hiệu, ngày tháng, họ tên, chức danh, cơ quan, địa chỉ, model, serial, tiêu chuẩn, căn cứ pháp lý, mã hồ sơ, số liệu, thời gian, sự kiện hoặc kết luận kỹ thuật.",
  "Nếu dữ liệu không có trong nguồn thì trả null hoặc chuỗi rỗng ở structured output; không đoán. Chỉ dùng [cần bổ sung ...] khi người dùng yêu cầu placeholder hiển thị.",
  "Mỗi dữ kiện chỉ map một lần. Không sinh lại tên loại, heading, Kính gửi, Nơi nhận, header hoặc block chữ ký đã có trong template.",
  "Giá trị field chỉ chứa nội dung của field, không lặp nhãn/heading cố định của template.",
  "Nội dung chèn Word phải là plain text: không emoji, Markdown, **, *, ###, _, backtick, code fence hoặc lời dẫn của trợ lý.",
].join("\n");

