# Thiết kế và đánh giá kỹ thuật bước đầu hệ thống “Văn bản và thể chế” hỗ trợ soạn thảo văn bản hành chính

**Tác giả:** [Bổ sung họ tên tác giả chính thức]  
**Đơn vị công tác:** [Bổ sung tên cơ quan/đơn vị chính thức]  
**Tác giả liên hệ:** [Bổ sung thông tin liên hệ được phép công bố]

## TÓM TẮT

Soạn thảo văn bản hành chính trong các tổ chức có quy trình và biểu mẫu riêng đòi hỏi người viết đồng thời quan tâm đến bố cục, thể thức, chính tả, trường thông tin và nội dung nghiệp vụ. Bài báo trình bày thiết kế và đánh giá kỹ thuật bước đầu của hệ thống “Văn bản và thể chế”, tập trung vào ứng dụng web hiện có trong thư mục `web_app`. Hệ thống kết hợp trình soạn thảo trang A4 và trao đổi DOCX, bộ kiểm tra thể thức dựa trên quy tắc, kiểm tra tiếng Việt dựa trên nhiều lớp từ điển và quy tắc ngữ cảnh, thư viện biểu mẫu có schema, cùng các luồng AI có xem trước sai khác trước khi áp dụng. Phương pháp nghiên cứu là khảo sát tài liệu thiết kế, truy vết mã nguồn, rà soát inventory bằng chứng, chạy bộ kiểm thử và kiểm tra một số điểm cuối production; hai ảnh production được dùng để mô tả các màn hình tài khoản đã quan sát trực tiếp. Kết quả kỹ thuật ghi nhận 376/376 kiểm thử web app, 31/31 kiểm thử chính tả, 305/305 kiểm thử ở gói Word Add-in, typecheck và build hoàn tất, cùng phản hồi HTTP 200 tại `/login`. Các kết quả này xác nhận một số thuộc tính triển khai và hợp đồng chức năng, nhưng không đo độ chính xác phát hiện lỗi, chất lượng DOCX sau vòng nhập-xuất, hiệu quả công việc hay mức độ chấp nhận của người dùng. Đóng góp chính của bài là mô tả một kiến trúc hỗ trợ có phân lớp và chỉ rõ ranh giới giữa bằng chứng mã nguồn, kiểm tra kỹ thuật và bằng chứng thực nghiệm còn thiếu.

**Từ khóa:** văn bản hành chính; kiểm tra thể thức; chính tả tiếng Việt; từ điển Hunspell; trí tuệ nhân tạo; DOCX; đánh giá kỹ thuật.

## 1. ĐẶT VẤN ĐỀ

Văn bản hành chính là phương tiện ghi nhận, truyền đạt và tổ chức thực hiện công việc trong cơ quan, doanh nghiệp. Chất lượng của văn bản không chỉ nằm ở câu chữ: người soạn còn phải bảo đảm các thành phần thể thức, cách trình bày, trường thông tin, căn cứ và thẩm quyền phù hợp với loại văn bản và quy chế áp dụng. Nghị định số 30/2020/NĐ-CP tạo cơ sở pháp lý về công tác văn thư trong phạm vi điều chỉnh của nghị định; bên cạnh đó, các đơn vị trong cùng một hệ thống tổ chức có thể sử dụng biểu mẫu, ký hiệu và quy trình nội bộ khác nhau [1, 2].

Trong thực tế thiết kế hệ thống, các yêu cầu trên thường xuất hiện đồng thời nhưng được giải quyết bởi những công cụ khác nhau: trình soạn thảo văn bản quản lý nội dung và bố cục; bộ kiểm tra chính tả xử lý từ ngữ; quy trình thủ công duy trì biểu mẫu; còn công cụ AI có thể hỗ trợ diễn đạt hoặc điền trường. Sự phân tán này đặt ra một vấn đề kỹ thuật cụ thể: làm thế nào kết hợp kiểm tra có thể giải thích với hỗ trợ ngôn ngữ linh hoạt, đồng thời giữ quyền quyết định cuối cùng ở người soạn và không biến kết quả kiểm tra thành chứng nhận tuân thủ.

Khoảng trống mà bài báo xem xét là khoảng trống triển khai trong một hệ thống chuyên biệt, không phải kết luận rằng lĩnh vực chưa có nghiên cứu hay sản phẩm tương tự. Trong phạm vi tài liệu thiết kế và mã nguồn hiện có, các chức năng soạn thảo, audit, chính tả, biểu mẫu, AI, tài khoản và lưu trữ cá nhân cùng tồn tại nhưng khác nhau về mức bằng chứng: một số được kiểm tra bằng test hoặc quan sát production, còn nhiều màn hình và luồng chỉ được xác nhận qua source [2, 3]. Vì vậy, câu hỏi nghiên cứu được đặt ra theo hướng kỹ thuật và phương pháp luận:

1. Có thể phân công vai trò như thế nào giữa quy tắc xác định, từ điển/ngữ cảnh tiếng Việt và AI để hỗ trợ soạn thảo mà vẫn giữ khả năng rà soát của con người?
2. Bằng chứng hiện có xác nhận được những thuộc tính kỹ thuật và chức năng nào, và đâu là giới hạn của các kết quả đó khi chưa có nghiên cứu người dùng hoặc kiểm chứng nghiệp vụ độc lập?

Bài viết trả lời hai câu hỏi bằng cách mô tả ứng dụng web trong `web_app`, đối chiếu với `design.md` là nguồn chuẩn thiết kế (SSOT), rồi phân tích kết quả kiểm thử, build và quan sát production. Các kết luận về tính năng được giới hạn theo inventory; bài không suy diễn từ cấu trúc mã nguồn sang mức độ chính xác, hiệu quả hay tuân thủ pháp lý [2, 3].

## 2. NỘI DUNG NGHIÊN CỨU

### 2.1. Phương pháp và phạm vi khảo sát

Đây là nghiên cứu thiết kế-kỹ thuật theo trường hợp, không phải thử nghiệm đối chứng. Quy trình gồm bốn bước: (i) đọc tài liệu thiết kế để xác định mục tiêu, ranh giới dữ liệu và các nguyên tắc bảo vệ quyền riêng tư; (ii) truy vết các thành phần mã nguồn tương ứng với editor, quy tắc, từ điển, catalog biểu mẫu, AI, tài khoản và Drive; (iii) chạy các lệnh kiểm thử, typecheck, build và xác thực manifest có sẵn trong workspace; (iv) kiểm tra endpoint production và đối chiếu trực quan các ảnh đã ghi trong inventory. Inventory được dùng để phân biệt “có trong source” với “đã quan sát trên production”; hai trạng thái này không được gộp làm một [2, 3].

Phạm vi chức năng chính của bài là `web_app`, ứng dụng Next.js/React có editor A4 và dịch vụ web triển khai bằng Docker. Workspace còn có gói Word Add-in ở thư mục gốc; kết quả test, build và kiểm tra manifest của gói đó được nêu riêng như bằng chứng QA ở cấp repository, không được xem là bằng chứng cho các luồng web app. Tại thời điểm inventory, production chỉ được chụp ở các trang tài khoản công khai; chưa có session QA để quan sát các màn hình protected [3].

### 2.2. Kiến trúc đề xuất và lý do chọn mô hình lai

Kiến trúc kết hợp ba cơ chế vì mỗi cơ chế giải quyết một loại bất định khác nhau. Quy tắc xác định phù hợp với thuộc tính có cấu trúc rõ, chẳng hạn kích thước trang, lề, thành phần bắt buộc hoặc định dạng đoạn. Từ điển và quy tắc ngữ cảnh phù hợp với phát hiện nghi vấn ở mức từ/cụm, nhất là khi từ chuyên ngành và danh từ riêng không thể được suy ra chỉ từ một danh sách từ phổ thông. AI phù hợp hơn với những tác vụ phụ thuộc ngữ cảnh như diễn đạt lại, hiệu đính hoặc ánh xạ nội dung vào trường biểu mẫu. Không lớp nào trong ba lớp tự nó đủ để phán định toàn bộ chất lượng văn bản.

| Lớp | Vai trò trong hệ thống | Cơ chế kiểm soát và giới hạn |
|---|---|---|
| Quy tắc audit | Đánh giá các điều kiện thể thức theo profile và trả về `PASS`, `FAIL`, `MISSING` hoặc `NOT_APPLICABLE`. | Chỉ những issue được đánh dấu có thể sửa mới đi qua auto-fixer; quy tắc không xác nhận tính đúng của nội dung hay thẩm quyền ban hành. |
| Từ điển và quy tắc ngữ cảnh | Đánh dấu từ/cụm nghi vấn, đưa ra gợi ý và lọc một số URL, mã, ngày, chữ viết tắt hoặc thuật ngữ miền. | Từ điển không phải chuẩn đúng tuyệt đối; người dùng chọn sửa, bỏ qua hoặc thêm thuật ngữ. Quy tắc ngữ cảnh không bao quát mọi cấu trúc tiếng Việt. |
| AI | Hỗ trợ soạn thảo, hiệu đính và điền trường biểu mẫu trong yêu cầu cụ thể. | Có provider giả lập và provider từ xa; nội dung có thể được gửi đến OpenAI hoặc Gemini. Diff Preview cho phép xem và quyết định áp dụng thay đổi. |
| Người dùng | Xem xét cảnh báo, xác nhận nội dung và quyết định việc sửa/xuất/lưu. | Quy trình human-in-the-loop giảm tự động hóa không kiểm soát, nhưng vẫn phụ thuộc vào năng lực rà soát và trách nhiệm của người dùng. |

Sự phân lớp này là một lựa chọn kiến trúc nhằm tăng khả năng truy nguyên: cảnh báo audit có thể gắn với một điều kiện; đề xuất từ điển có thể được xem như ứng viên; kết quả AI được trình bày như một bản đề xuất. Đây là lập luận thiết kế, chưa phải kết quả so sánh thực nghiệm cho thấy kiến trúc lai chính xác hoặc hiệu quả hơn một phương án đơn lớp.

### 2.3. Chức năng và triển khai hệ thống

#### 2.3.1. Soạn thảo, trao đổi DOCX và kiểm tra thể thức

Editor của web app được tổ chức trên canvas khổ A4, hỗ trợ thao tác nội dung theo cấu trúc trang. Mã nguồn có importer để nạp DOCX và exporter để xuất DOCX; vì thế hệ thống hướng tới một chu trình từ tài liệu hiện có đến biên tập và xuất bản nháp. Tuy nhiên, việc có importer/exporter trong source không chứng minh rằng định dạng của mọi tài liệu Word được bảo toàn. Inventory không ghi nhận phép thử round-trip DOCX trên deployment hay phép đo độ trung thực với tập tài liệu chuẩn [3, 4].

Bộ audit thể thức có các profile hành chính gắn với NĐ30/TVCI, TKV và IEMM, cùng profile cho văn bản Đảng. Các điều kiện được kiểm tra bao gồm khổ và hướng trang, lề, thành phần văn bản và định dạng đoạn. Bốn trạng thái kết quả tách biệt việc đạt điều kiện, vi phạm, thiếu thành phần và trường hợp không áp dụng. Auto-fixer chỉ tiếp nhận lỗi được đánh dấu `autoFixable`, còn các lỗi nội dung hoặc trường hợp cần phán đoán nghiệp vụ vẫn thuộc trách nhiệm người soạn [3, 4].

Điểm quan trọng về diễn giải là audit tạo ra danh sách vấn đề có thể xử lý, không cấp chứng nhận pháp lý. Một văn bản có thể vượt qua các quy tắc hình thức mà vẫn sai căn cứ, sai dữ kiện hoặc chưa đủ thẩm quyền. Ngược lại, một quy tắc nội bộ có thể chưa phản ánh đầy đủ yêu cầu của một đơn vị cụ thể. Vì thế, profile cần được xem là cấu hình hỗ trợ rà soát, không phải thay thế thẩm định nghiệp vụ.

#### 2.3.2. Chính tả tiếng Việt và kiểm tra trước khi xuất

Lớp chính tả kết hợp `Vietnamese.dic`, dữ liệu Hunspell tiếng Việt, ngoại lệ thuật ngữ TVCI và từ/cụm người dùng chủ động thêm. Tệp `Vietnamese.dic` có kích thước 72.776 byte, mã hóa UTF-16LE; hash SHA-256 được đối chiếu là `1417975f8479f3a4009cf6af120e16ccea190f89b392fb16889d67ed66b6e769`. Sau bước chuẩn bị, báo cáo dữ liệu ghi nhận 6.635 entry được chấp nhận và 0 entry bị loại trong phiên bản đang khảo sát [5]. Số liệu này mô tả quá trình nạp dữ liệu, không phải số từ đúng trong tiếng Việt hay độ bao phủ từ vựng.

Khi chạy, bộ kiểm tra tạo các vị trí nghi vấn và gợi ý thay thế; các cụm dễ nhầm như “sử lý/xử lý” và “xát nhận/xác nhận” được xử lý bằng quy tắc ngữ cảnh riêng. Người dùng có thể chấp nhận gợi ý, bỏ qua một lần, hoặc chủ động thêm/xóa term trong từ điển cá nhân. Nội dung tài liệu không bị tự sửa. Trước khi xuất DOCX hoặc lưu lên Drive, preflight có thể báo còn mục nghi vấn và cho phép quay lại hoặc tiếp tục; cảnh báo không tự sửa và không chặn cứng [2, 3, 5].

Thiết kế này cân bằng giữa giảm báo nhầm và khả năng mở rộng từ vựng miền, nhưng danh sách từ cùng quy tắc chưa thay thế được bộ dữ liệu gán nhãn để đo precision, recall hoặc tỷ lệ false positive. Thuật ngữ mới, tên riêng và cách viết theo chuyên ngành vẫn có thể cần người dùng xác nhận. Các term được thêm chủ động được lưu tách khỏi nội dung tài liệu; inventory và schema cho biết endpoint từ điển chỉ nhận term/cụm được chọn, không nhận toàn văn bản [2, 3, 5].

#### 2.3.3. Catalog biểu mẫu và schema

Catalog hiện khai báo 22 mẫu thuộc nhóm tổ chức TVCI, IEMM, TKV và DANG; có tám schema hành chính chính và hai schema nội bộ. Danh mục source không đồng nhất với danh sách biểu mẫu đã được cơ quan phê duyệt: nó xác nhận sự hiện diện và cấu trúc của mẫu trong ứng dụng, không xác nhận nghiệm thu nghiệp vụ [3, 4]. Các loại được nhóm theo nội dung như sau:

- **Công văn và mẫu văn bản:** Công văn TVCI chuẩn, Văn bản mẫu Ban Đảng/Công văn Đảng, Công văn hành chính IEMM, Công văn đính chính và Tài liệu mẫu chuẩn TVCI.
- **Quyết định:** Quyết định Tập đoàn TKV, Quyết định cá biệt và Quyết định quy định.
- **Thông báo và tờ trình:** Thông báo TVCI chuẩn, Thông báo kết luận, Tờ trình phê duyệt và Tờ trình nội bộ.
- **Biểu mẫu công tác nội bộ IEMM:** Biên bản cuộc họp, Báo cáo công tác, Kế hoạch hoạt động, Chương trình công tác, Giấy mời dự họp, Giấy giới thiệu, Giấy nghỉ phép, Bản cam kết, Đơn xin nghỉ phép và Thư mời đối tác.

Form được dựng từ schema để ánh xạ các trường như số/ký hiệu, trích yếu, đơn vị, người ký hoặc nội dung vào cấu trúc tài liệu. Việc tách schema khỏi từng lượt nhập liệu cho phép mô tả trường và kiểm tra dữ liệu có cấu trúc, trong khi catalog phân loại mẫu theo tổ chức và mục đích. Bằng chứng hiện có là catalog/schema và các kiểm thử liên quan; chưa có ảnh thư viện trên production hoặc đánh giá của văn thư/nghiệp vụ về tính phù hợp của từng mẫu [3, 4].

#### 2.3.4. Hỗ trợ AI có xem trước sai khác

Workspace AI cung cấp ba luồng: soạn thảo, hiệu đính và điền biểu mẫu. Tùy theo yêu cầu, người dùng đưa ghi chú hoặc văn bản vào để tạo đề xuất, nhận bản hiệu đính hoặc phân tích/điền trường. Diff Preview hiển thị khác biệt và đặt thao tác áp dụng trong tay người dùng. Đây là ranh giới có ý nghĩa: mô hình sinh đề xuất, còn thay đổi trong editor cần được người dùng chấp thuận [3, 6].

Source hiện hỗ trợ provider `mock`, OpenAI và Gemini; mặc định giao diện chọn `mock`. Cấu hình provider và API key được lưu bằng `localStorage`. Khi cấu hình provider từ xa, nội dung yêu cầu được chuyển trong request AI; do đó không thể mô tả toàn bộ xử lý AI là cục bộ. Inventory chưa xác nhận provider production đang được cấu hình thế nào hoặc chính sách log/lưu trữ của nhà cung cấp. Cần phân biệt điều này với kiểm tra chính tả: spell-check chạy phía trình duyệt và không gửi nội dung tài liệu tới dịch vụ chính tả bên ngoài theo thiết kế [2, 3, 5, 6].

#### 2.3.5. Tài khoản, đồng thuận, phục hồi và quản trị

Đăng nhập TVCI tách khỏi đăng nhập Google Drive. Luồng đăng ký yêu cầu username và mật khẩu, hiển thị cam kết quyền riêng tư/điều kiện sử dụng và yêu cầu checkbox chấp nhận trước khi tạo tài khoản. Recovery code là một đường phục hồi thay cho việc bắt buộc thu thập email hoặc số điện thoại; tài liệu thiết kế và source quy định mã chỉ hiển thị một lần. Khu vực admin dành cho superadmin, với các thao tác quản lý trạng thái tài khoản, xem metadata đồng thuận và xoay recovery code. Quyền admin không bao gồm đọc nội dung tài liệu Drive cá nhân [2, 3, 7].

Hai ảnh production dưới đây ghi nhận trực tiếp giao diện đăng nhập và đăng ký/đồng thuận. Ảnh thứ nhất thể hiện thông điệp tài khoản ứng dụng độc lập với Google Drive và các liên kết tạo/khôi phục tài khoản. Ảnh thứ hai cho thấy biểu mẫu đăng ký tối giản, khuyến nghị không dùng định danh cá nhân làm username và bước chấp nhận điều kiện. Ảnh xác nhận giao diện tại thời điểm chụp; chúng không chứng minh cấu hình backend, an toàn lưu trữ, hay các thao tác protected sau đăng nhập [3].

![Màn hình đăng nhập production với tài khoản TVCI độc lập Google Drive và liên kết tạo/khôi phục tài khoản.](account-login.png)

*Hình 1. Màn hình đăng nhập được chụp trực tiếp từ production. Hình chỉ minh họa giao diện xác thực công khai; các luồng sau đăng nhập không được quan sát trong lượt thu thập này.*

![Màn hình đăng ký production hiển thị username, mật khẩu, cam kết quyền riêng tư và checkbox đồng thuận.](account-register-consent.png)

*Hình 2. Màn hình đăng ký và đồng thuận được chụp trực tiếp từ production. Giao diện thể hiện chính sách giảm thu thập thông tin định danh; ảnh không thay thế kiểm toán triển khai hoặc xử lý dữ liệu.*

#### 2.3.6. Google Drive và các ràng buộc dữ liệu

Theo thiết kế và source, kết nối Drive là opt-in, tách biệt với đăng nhập TVCI và hướng tới scope hẹp `drive.file`. Các nhóm chức năng được phân định theo mục đích: **Documents** cho văn bản người dùng chọn lưu; **Templates** cho mẫu cá nhân; **Knowledge** cho tri thức người dùng chủ động ghi nhớ; **References** cho tài liệu tham khảo do người dùng chọn; và **AppData** cho metadata/index kỹ thuật. Knowledge hoặc References chỉ được dùng làm ngữ cảnh AI khi người dùng chọn cho yêu cầu hiện tại. Scope `drive.file` của Google giới hạn ứng dụng vào file do ứng dụng tạo hoặc file người dùng chia sẻ/mở cho ứng dụng, phù hợp với định hướng quyền tối thiểu [2, 3, 7, 9].

Các ràng buộc dữ liệu trong `design.md` nêu rằng server TVCI không lưu lâu dài body tài liệu; khi Drive chưa kết nối, tài liệu chỉ ở trong phiên làm việc và người dùng tự xuất tệp. Cơ sở dữ liệu tập trung vào tài khoản, phiên, đồng thuận, recovery, metadata kết nối Drive và term từ điển do người dùng thêm. Admin chỉ xem metadata quản trị, không đọc Documents, Templates, Knowledge hoặc References. Đây là các yêu cầu thiết kế và hợp đồng source; inventory chưa xác nhận OAuth end-to-end, chưa chụp trạng thái kết nối, và không có phép thử production đọc/ghi Drive trong lượt khảo sát. Vì thế, bài báo không khẳng định kết nối Drive đã được nghiệm chứng ngoài thực tế [2, 3, 7].

### 2.4. Triển khai và đánh giá kỹ thuật

Ứng dụng web được đóng gói bằng Docker theo cấu hình nhiều stage, chạy trên Node.js và phục vụ cổng production 2350 thông qua service/container `tvci-web-app`. SQLite được gắn volume riêng tại `/app/data`. Inventory ngày 02-10-2026 ghi nhận lệnh triển khai Docker Compose và route `/login` trả HTTP 200 sau deploy. Trong lượt kiểm tra bài báo, yêu cầu HTTP trực tiếp tới `/login` tiếp tục trả 200; shell hiện tại không có quyền truy vấn Docker daemon, vì vậy lượt kiểm tra trực tiếp này xác nhận endpoint nhưng không xác nhận lại image/container đang chạy [3, 8].

Kết quả kiểm tra được tách thành ba nhóm để tránh suy rộng từ một loại evidence sang loại khác.

#### 2.4.1. Bằng chứng kỹ thuật

| Hạng mục | Kết quả kiểm tra | Cách diễn giải |
|---|---|---|
| Web app — toàn bộ Vitest | 376/376 test đạt trong 65 tệp. | Bằng chứng regression cho các hợp đồng được test; không đại diện cho độ đúng trên mọi văn bản thực. |
| Chính tả — tập test `src/spellcheck` | 31/31 test đạt trong 8 tệp. | Xác nhận các trường hợp parser, gợi ý, ngoại lệ, API, lưu term và preflight được bao phủ bởi bộ test này. |
| Word Add-in ở thư mục gốc — Jest | 305/305 test đạt trong 56 suite. | Kết quả của gói Add-in; không cộng vào số test web app. |
| Typecheck | `npm run typecheck` đạt ở root và `web_app`. | Kiểm tra kiểu tĩnh; không chứng minh đúng nghiệp vụ. Web app được chạy lại sau build để tránh đọc thư mục `.next/types` trong lúc Next.js đang sinh lại file. |
| Build và manifest | Webpack build root, Next.js production build và `npm run validate-manifest` hoàn tất thành công. | Cho thấy source có thể được đóng gói và manifest Add-in hợp lệ theo validator; chưa phải benchmark hiệu năng. |
| Production endpoint | `/login` trả HTTP 200; inventory ghi nhận triển khai Docker Compose trước đó. | Chứng minh endpoint phản hồi tại thời điểm kiểm tra; không chứng minh mọi route protected hoặc tích hợp Drive hoạt động. |

Build có cảnh báo cần được giữ lại trong báo cáo kỹ thuật. Next.js báo `canvas` không được cài như dependency tùy chọn của `jsdom`, theo import trace đi qua fallback phân tích DOCX; build vẫn hoàn tất. Ở gói Word Add-in, Webpack đánh dấu `taskpane.js` và `dialog.js` mỗi file 792 KiB, vượt ngưỡng khuyến nghị 244 KiB. Next.js cũng báo trang editor `/` có First Load JS khoảng 1,29 MB. Các số này là kích thước bundle do công cụ build in ra, không phải thời gian tải đo trên mạng thật; chúng gợi ý cần tiếp tục phân tích bundle và xác nhận vai trò của dependency tùy chọn `canvas` [8].

Trong lượt kiểm tra đầu, typecheck `web_app` chạy đồng thời với build và báo thiếu một số file sinh tự động trong `.next/types`. Sau khi build kết thúc, typecheck được chạy lại độc lập và đạt. Kết quả cuối cùng được báo theo lần chạy tuần tự sau build; hiện tượng đầu tiên được ghi nhận như ảnh hưởng thứ tự kiểm tra, không được tính là lỗi typecheck cuối cùng.

#### 2.4.2. Bằng chứng chức năng và mã nguồn

Inventory đối chiếu từng nhóm chức năng với module thực thi trong source: editor/A4 và DOCX, evaluator/auto-fixer, từ điển và panel chính tả, catalog/schema, workspace AI/diff, luồng tài khoản và Drive [3–7]. Một số phần có test đơn vị hoặc tích hợp; tuy vậy, inventory chỉ xác nhận trực quan trên production hai màn hình tài khoản và một số route/asset. Các màn hình editor, audit, thư viện biểu mẫu, AI/diff, spell-check, Personal Storage và admin chưa được chụp trên production trong lượt này. Việc nêu chúng trong mục chức năng vì vậy có nghĩa “được tìm thấy trong source và được kiểm tra theo test tương ứng”, không có nghĩa toàn bộ luồng đã được người kiểm thử thao tác end-to-end trên deployment [3].

#### 2.4.3. Những nội dung chưa được đánh giá bằng nghiên cứu người dùng

Chưa có khảo sát người dùng, quan sát tác vụ, phỏng vấn, so sánh trước-sau hoặc đánh giá khả năng sử dụng. Chưa có bộ văn bản chuẩn được chuyên gia gán nhãn để đo độ chính xác của audit/chính tả; chưa có phép đo thời gian hoàn thành, lỗi còn lại, mức hài lòng hay tác động năng suất. Chưa có benchmark độ trung thực khi nhập-xuất DOCX, đánh giá chất lượng đầu ra AI, hay kiểm thử nghiệp vụ độc lập cho từng biểu mẫu. Những đại lượng này không thể suy ra từ số lượng test tự động, ảnh chụp giao diện hoặc phản hồi HTTP 200.

### 2.5. Thảo luận

Kiến trúc lai phản ánh sự khác nhau giữa lỗi thể thức có quy tắc rõ, nghi vấn từ vựng và biến đổi ngôn ngữ phụ thuộc ngữ cảnh. Quy tắc xác định giúp giải thích vì sao một điều kiện bị đánh dấu, từ điển giúp mở rộng nhận diện theo vốn từ có sẵn, còn AI có thể đề xuất cách diễn đạt hoặc cấu trúc trường linh hoạt hơn. Diff Preview và thao tác xác nhận của người dùng giữ việc thay đổi văn bản trong một vòng kiểm soát có thể quan sát. Mặt khác, giao diện xác nhận không loại bỏ nguy cơ người dùng bỏ sót lỗi hoặc chấp nhận nội dung AI chưa được kiểm chứng.

Tách lớp cũng giúp định hình trách nhiệm dữ liệu. Spell-check được xử lý ở browser và chỉ đồng bộ term riêng do người dùng chọn; Drive tách lưu trữ cá nhân theo nhóm; AI từ xa có thể nhận nội dung được đưa vào request. Ba cơ chế này có luồng dữ liệu khác nhau và không nên được gộp dưới một tuyên bố chung rằng “dữ liệu luôn ở máy người dùng”. Chính vì provider remote được hỗ trợ, người dùng và quản trị viên cần biết rõ provider nào được cấu hình, loại nội dung nào gửi đi và điều kiện lưu trữ của dịch vụ tương ứng; inventory hiện chưa có bằng chứng runtime về cấu hình đó [2, 3, 5–7].

Một điểm mạnh ở mức thiết kế là auto-fix có giới hạn theo cờ `autoFixable`, còn nội dung không chắc chắn tiếp tục cần phán đoán của người dùng. Nhưng hạn chế này cũng cho thấy audit chưa thể thay thế kiểm tra nghiệp vụ. Profile NĐ30/TVCI, TKV, IEMM và DANG cần được duy trì theo quy định và quy chế áp dụng; mỗi lần thay đổi cần có nguồn chuẩn và người chịu trách nhiệm xác nhận. Sự hiện diện của profile trong code chưa đủ để kết luận profile đã bao quát mọi tình huống hoặc được cơ quan có thẩm quyền phê duyệt.

Các giới hạn đánh giá cũng ảnh hưởng cách hiểu kết quả số. 376 test web app và 305 test Add-in là số ca tự động vượt qua trong hai gói khác nhau, không phải số mẫu văn bản đã đánh giá. 31 test chính tả là tập con có phạm vi xác định, không phải 31 lỗi tiếng Việt đã được phát hiện đúng. Số entry của từ điển mô tả dữ liệu đầu vào sau lọc, không đo chất lượng ngôn ngữ. Cách diễn giải hẹp này cần thiết để không biến kiểm thử kỹ thuật thành tuyên bố hiệu quả sử dụng.

### 2.6. Giới hạn nghiên cứu

Thứ nhất, inventory ghi nhận chỉ hai ảnh production cho trang login và register; chưa có ảnh protected do chưa có session QA. Thứ hai, lượt khảo sát chưa đối chiếu hash bundle đang chạy với toàn bộ source workspace. Thứ ba, OAuth Drive chưa được thực hiện end-to-end; không có bằng chứng production đọc/ghi file. Thứ tư, các biểu mẫu được liệt kê từ catalog, chưa có hồ sơ phê duyệt nghiệp vụ độc lập. Thứ năm, các test/build hiện hữu là kiểm tra kỹ thuật do dự án tổ chức, không phải đánh giá độc lập hoặc chứng nhận tuân thủ [3].

Về phạm vi kết luận, bài không đánh giá hiệu năng ở điều kiện tải đồng thời, an toàn hệ thống qua kiểm thử xâm nhập, chính sách retention của provider AI từ xa, khả năng tương thích của mọi biến thể DOCX hoặc mức phù hợp của từng quy tắc với mọi đơn vị. Cảnh báo `canvas` tùy chọn và kích thước bundle lớn cũng cần được xem là hạn chế triển khai đã quan sát, không nên lược bỏ chỉ vì build kết thúc thành công [3, 8].

## 3. KẾT LUẬN

Bài báo mô tả hệ thống “Văn bản và thể chế” trong phạm vi ứng dụng web `web_app`, gồm editor A4 và trao đổi DOCX, kiểm tra thể thức theo profile, chính tả tiếng Việt nhiều lớp, 22 biểu mẫu có schema, các luồng AI có Diff Preview, tài khoản và đồng thuận, quản trị, cùng lưu trữ Google Drive tùy chọn theo các nhóm dữ liệu riêng. Thiết kế lai phân vai giữa quy tắc, từ điển/ngữ cảnh và AI; người dùng vẫn quyết định việc sửa và áp dụng đề xuất.

Bằng chứng kỹ thuật hiện xác nhận test, typecheck, build, manifest và phản hồi HTTP của endpoint trong các phạm vi đã nêu. Bằng chứng source xác nhận nhiều chức năng nhưng không thay thế kiểm chứng production cho các màn hình protected. Chưa có dữ liệu nghiên cứu người dùng để kết luận hệ thống tăng năng suất, giảm lỗi hay được chấp nhận; cũng chưa có dữ liệu chuẩn để khẳng định độ chính xác hoặc chứng nhận tuân thủ. Bước tiếp theo phù hợp là thu thập bộ văn bản đánh giá có gán nhãn, thực hiện kiểm thử nghiệp vụ cùng cán bộ văn thư, kiểm tra DOCX round-trip và OAuth Drive trong môi trường QA, rồi tiến hành nghiên cứu khả dụng với người dùng có đồng thuận. Các bước đó sẽ cung cấp cơ sở cho kết luận vượt ra ngoài mức đánh giá kỹ thuật hiện tại.

## TÀI LIỆU THAM KHẢO

[1] Chính phủ Việt Nam. (2020). *Nghị định số 30/2020/NĐ-CP về công tác văn thư*. [Cơ sở dữ liệu văn bản Chính phủ](https://vanban.chinhphu.vn/?docid=199378&pageid=27160).

[2] Dự án TVCI Word Add-ins. *design.md: Tài liệu thiết kế hệ thống và các ràng buộc dữ liệu* (bản trong workspace, truy cập ngày 02-10-2026). [Tài liệu SSOT](../../design.md).

[3] Dự án Văn bản và thể chế. *ARTICLE_FEATURE_INVENTORY.md: Inventory chức năng và ảnh evidence* (2026-10-02). [Inventory](ARTICLE_FEATURE_INVENTORY.md).

[4] Dự án Văn bản và thể chế. Mã nguồn editor, DOCX, audit và biểu mẫu: [EditorWorkspace](../../web_app/src/components/editor/EditorWorkspace.tsx), [A4Canvas](../../web_app/src/components/editor/A4Canvas.tsx), [DOCX importer](../../web_app/src/docx/importer.ts), [DOCX exporter](../../web_app/src/docx/exporter.ts), [document evaluator](../../web_app/src/rules/document-evaluator.ts), [auto-fixer](../../web_app/src/rules/auto-fixer.ts), [template catalog](../../web_app/src/templates/catalog.ts), [form schema](../../web_app/src/templates/form-schema.ts).

[5] Dự án Văn bản và thể chế. Tài liệu và dữ liệu spell-check: [README chính tả](../../web_app/src/spellcheck/README.md), [báo cáo lọc từ điển](../../web_app/public/spellcheck/vi-base.review.json), [tệp Vietnamese.dic](../../web_app/data/spellcheck/Vietnamese.dic), cùng các kiểm thử trong `web_app/src/spellcheck/`.

[6] Dự án Văn bản và thể chế. Mã nguồn AI và xem trước thay đổi: [AI workspace](../../web_app/src/components/ai/AiWorkspacePanel.tsx), [Diff Preview](../../web_app/src/components/ai/DiffPreviewModal.tsx), [provider types](../../web_app/src/ai/types.ts), [direct client](../../web_app/src/ai/direct-client.ts).

[7] Dự án Văn bản và thể chế. Mã nguồn tài khoản, quyền riêng tư và Drive: [đăng ký](../../web_app/src/components/auth/RegisterForm.tsx), [terms](../../web_app/src/privacy/terms.ts), [admin page](../../web_app/app/%28protected%29/admin/page.tsx), [database schema](../../web_app/src/db/schema.ts), [Drive OAuth](../../web_app/src/drive/oauth.ts), [Drive resources](../../web_app/src/drive/resources.ts).

[8] Dự án TVCI Word Add-ins/Văn bản và thể chế. Cấu hình và kiểm tra triển khai: [web app package](../../web_app/package.json), [Dockerfile](../../web_app/Dockerfile), [Docker Compose](../../web_app/docker-compose.yml), [root package](../../package.json). Kết quả test/typecheck/build được ghi từ các lệnh xác minh chạy ngày 02-10-2026 trong workspace; inventory nêu bằng chứng production tương ứng.

[9] Google for Developers. *Choose Google Drive API scopes*. [Tài liệu xác thực và scope Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

[10] wooorm/dictionaries. *Vietnamese dictionary data for Hunspell*. [Kho dữ liệu dictionary-vi](https://github.com/wooorm/dictionaries/tree/main/dictionaries/vi).

**Nguồn cần bổ sung trước khi gửi tạp chí:** tổng quan có phương pháp về các hệ thống kiểm tra văn bản hành chính, bộ tiêu chí/chuẩn DOCX round-trip phù hợp với phạm vi triển khai, và nghiên cứu người dùng có thiết kế, mẫu và công cụ đo được công bố. Bản thảo hiện chỉ dựa vào văn bản pháp lý, tài liệu thiết kế, mã nguồn, inventory và kết quả kiểm tra kỹ thuật có thể truy vết; chưa tự nhận là tổng quan tài liệu khoa học đầy đủ.

## English title

**Design and Preliminary Technical Evaluation of “Văn bản và thể chế,” a Hybrid System for Vietnamese Administrative Document Authoring**

## ABSTRACT

Administrative document authoring requires writers to coordinate document structure, formatting rules, spelling, organization-specific forms, and substantive content. This paper describes the design and preliminary technical evaluation of “Văn bản và thể chế,” focusing on the existing web application in the project’s `web_app` directory. The system combines an A4-oriented editor and DOCX exchange, rule-based format auditing, Vietnamese spell-checking with dictionary and contextual layers, schema-backed templates, and AI drafting, proofreading, and template filling with a diff preview before changes are applied. The study follows an engineering case-study method: design-document analysis, source tracing, automated tests, type checking, production builds, and limited production endpoint and screenshot inspection. The current verification run recorded 376/376 web-app tests, 31/31 spell-check tests, 305/305 tests for the separate Word Add-in package, successful type checks and builds, and an HTTP 200 response from `/login`. These results support claims about selected technical contracts and deployment responsiveness; they do not measure detection accuracy, DOCX round-trip fidelity, user productivity, or acceptance. Production screenshots cover only the public login and registration-consent screens. Protected workflows, end-to-end Google Drive OAuth, and user research remain unverified. The paper argues that the hybrid architecture offers a traceable division of labor among deterministic rules, lexical resources, and AI proposals, while requiring human review and explicit boundaries around remote AI data flows. Further evaluation should use annotated documents, domain review, DOCX interoperability tests, and a user study.

**Keywords:** administrative documents; Vietnamese spell-checking; document auditing; Hunspell; artificial intelligence; DOCX; technical evaluation.
