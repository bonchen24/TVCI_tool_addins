# THIẾT KẾ VÀ ĐÁNH GIÁ KỸ THUẬT BƯỚC ĐẦU PHẦN MỀM “VĂN BẢN VÀ THỂ CHẾ” HỖ TRỢ SOẠN THẢO VĂN BẢN HÀNH CHÍNH

**Lương Xuân Hùng**

*Trung tâm Thử nghiệm Kiểm định Công nghiệp (TVCI), Viện Cơ khí Năng lượng và Mỏ - Vinacomin*

**Tóm tắt:** Bài viết trình bày thiết kế và đánh giá kỹ thuật bước đầu của phần mềm “Văn bản và thể chế”, tập trung vào bản ứng dụng web. Hệ thống kết hợp trình soạn thảo theo trang A4 và trao đổi DOCX, kiểm tra thể thức theo bộ quy tắc, hỗ trợ rà soát chính tả tiếng Việt, thư viện biểu mẫu và chức năng AI đề xuất nội dung với bước xem trước thay đổi trước khi áp dụng. Nghiên cứu theo hướng khảo sát kỹ thuật tình huống: đối chiếu tài liệu thiết kế, mã nguồn, nhật ký kiểm thử, phản hồi HTTP của bản vận hành và ảnh chụp giao diện. Nhật ký ngày 02-10-2026 ghi nhận 353 kiểm thử web, 305 kiểm thử của gói Word Add-in riêng và 31 kiểm thử tập trung cho chính tả; các bộ có phạm vi khác nhau, không cộng thành một tổng duy nhất. Các kiểm tra này hỗ trợ nhận định về một số hợp đồng kỹ thuật và khả năng phản hồi của dịch vụ, nhưng chưa đo độ chính xác phát hiện lỗi, độ trung thực khi trao đổi DOCX hay hiệu quả sử dụng. Ảnh vận hành xác nhận sự hiện diện của các màn hình được chụp, không chứng minh mọi luồng nghiệp vụ, kết nối Google Drive đầu cuối hoặc hiệu quả người dùng. Bài viết nhấn mạnh vai trò xác nhận của con người và giới hạn của bằng chứng hiện có.

**Từ khóa:** văn bản hành chính; thể thức văn bản; chính tả tiếng Việt; biểu mẫu; trí tuệ nhân tạo; DOCX.

## 1. ĐẶT VẤN ĐỀ

Soạn thảo văn bản hành chính đòi hỏi người viết đồng thời xử lý nội dung, thành phần thể thức, quy tắc trình bày, chính tả và biểu mẫu riêng của từng đơn vị. Một văn bản có thể được hình thành từ tài liệu cũ, ghi chú rời hoặc biểu mẫu, rồi cần rà soát lại trước khi trình ký và phát hành. Công cụ soạn thảo phổ thông hỗ trợ định dạng và sửa lỗi ở mức chung, nhưng người dùng vẫn phải tự đối chiếu nhiều yêu cầu và kiểm soát phần thay đổi được đề xuất.

Khoảng trống thực hành mà phần mềm “Văn bản và thể chế” hướng tới là kết nối các thao tác đó trong một quy trình có thể quan sát: soạn trên trang A4, rà soát quy tắc trình bày, nhận gợi ý chính tả, khởi tạo từ biểu mẫu và cân nhắc đề xuất do AI tạo. Đây là một bài toán thiết kế kỹ thuật trong bối cảnh công việc hành chính, không phải kết quả của khảo sát rộng về các phần mềm hiện có. Căn cứ trình bày thể thức gồm Nghị định số 30/2020/NĐ-CP và các hồ sơ quy tắc TVCI, TKV, IEMM, văn bản Đảng được khai báo trong hệ thống; phạm vi áp dụng từng hồ sơ vẫn cần đơn vị nghiệp vụ xác nhận [1, 4–6].

Mục tiêu bài viết là mô tả cách phần mềm phân công công việc giữa quy tắc xác định, dữ liệu từ điển, biểu mẫu có cấu trúc và đề xuất AI; tổng hợp bằng chứng kiểm tra kỹ thuật và quan sát bản vận hành; đồng thời chỉ rõ điều mà các bằng chứng đó chưa xác lập. Đối tượng khảo sát là ứng dụng web trong thư mục web_app. Kết quả kiểm thử của gói Word Add-in được báo cáo riêng, không dùng thay cho đánh giá ứng dụng web.

## 2. NỘI DUNG VÀ PHƯƠNG PHÁP NGHIÊN CỨU

### 2.1. Bài toán và yêu cầu thiết kế

Từ các tài liệu thiết kế và kiểm kê chức năng, yêu cầu được chia thành sáu nhóm. Thứ nhất, người dùng cần tạo văn bản trên vùng trang A4 và nhập, xuất DOCX để làm việc với tài liệu hiện hữu. Thứ hai, công cụ cần chỉ ra các vấn đề thể thức theo hồ sơ lựa chọn, đồng thời chỉ tự áp dụng sửa đổi đối với lỗi được đánh dấu có thể sửa an toàn. Thứ ba, kiểm tra chính tả phải hỗ trợ từ vựng tiếng Việt, thuật ngữ đơn vị và quyết định cuối cùng của người soạn. Thứ tư, biểu mẫu cần có danh mục và cấu trúc trường dữ liệu để người dùng điền thông tin phù hợp. Thứ năm, AI chỉ đóng vai trò trợ giúp soạn thảo, hiệu đính hoặc điền biểu mẫu; người dùng phải xem trước thay đổi. Thứ sáu, tài khoản, lưu trữ tùy chọn và quyền riêng tư phải được trình bày tách bạch, đặc biệt khi chọn dịch vụ AI từ xa [4–7].

Các yêu cầu này ưu tiên khả năng rà soát và kiểm soát hơn việc tự động thay người dùng quyết định nội dung. Một cảnh báo thể thức không phải kết luận pháp lý; một gợi ý chính tả không đồng nghĩa từ/cụm đó chắc chắn sai; một đoạn AI đề xuất không mặc nhiên phù hợp hồ sơ vụ việc. Bởi vậy, thao tác xác nhận của người dùng là một phần của thiết kế chứ không chỉ là bước phụ.

### 2.2. Mô hình giải pháp và quy trình xử lý

Giải pháp tổ chức các chức năng quanh một tài liệu đang soạn. Quy tắc thể thức đánh giá những thuộc tính có thể mô tả bằng tiêu chí; lớp chính tả dùng dữ liệu từ điển và quy tắc ngữ cảnh để đưa ra mục nghi vấn; thư viện cung cấp khung văn bản; còn AI tạo phương án nội dung theo yêu cầu. Hai nhóm đầu có thể cho kết quả kiểm tra lặp lại trên cùng đầu vào, trong khi AI tạo nội dung cần được coi là đề xuất phụ thuộc yêu cầu và nhà cung cấp. Trước khi thay đổi văn bản, giao diện so sánh trước–sau cho phép người dùng duyệt, chấp nhận hoặc bỏ đề xuất [5].

Quy trình sử dụng được khái quát ở Hình 1. Việc kiểm tra thể thức và chính tả có thể dẫn tới người dùng tự sửa hoặc chấp nhận sửa an toàn; AI là nhánh tùy chọn. Trước khi áp dụng kết quả AI hoặc xuất tệp, người dùng có cơ hội xem lại. Tài liệu có thể xuất thành DOCX hoặc được lưu theo lựa chọn của người dùng; Google Drive là phương án tùy chọn, không phải điều kiện để đăng nhập ứng dụng.

<!-- FIGURE: workflow -->

*Hình 1. Quy trình làm việc có người dùng xác nhận: tạo hoặc nhập văn bản → soạn thảo trên A4 → kiểm tra thể thức và chính tả → dùng AI khi cần → xem trước, xác nhận → xuất DOCX hoặc lưu theo lựa chọn.*

### 2.3. Các nhóm chức năng của phần mềm

#### 2.3.1. Soạn thảo trên A4 và trao đổi DOCX

Trình soạn thảo hiển thị nội dung trong vùng trang A4, hướng tới thao tác gần với trang văn bản sẽ được in hoặc lưu. Mã nguồn có bộ nhập và xuất DOCX; người dùng có thể bắt đầu từ tệp hiện hữu rồi tiếp tục chỉnh sửa, hoặc xuất kết quả thành DOCX [5]. Ảnh trên bản vận hành ở Hình 3 minh họa giao diện trang A4. Tuy nhiên, ảnh giao diện và sự hiện diện của bộ nhập/xuất chưa đo được độ trung thực của bố cục, bảng, phông chữ hay trường hợp DOCX phức tạp sau một vòng nhập–xuất.

#### 2.3.2. Kiểm tra thể thức văn bản

Bộ kiểm tra có các hồ sơ NĐ30/TVCI, TKV, IEMM và văn bản Đảng theo phần triển khai hiện có. Các quy tắc xét khổ, hướng và lề trang, thành phần văn bản cùng một số định dạng đoạn; kết quả được phân loại theo trạng thái để người dùng xem từng phát hiện. Chức năng sửa chỉ áp dụng với mục được đánh dấu có thể sửa an toàn; nội dung cần phán đoán, chẳng hạn tính đầy đủ hoặc phù hợp của căn cứ, vẫn do người dùng xử lý [5].

Vì thế, kết quả kiểm tra là công cụ hỗ trợ rà soát theo hồ sơ đã chọn, không phải chứng thư tuân thủ Nghị định 30 hoặc xác nhận rằng văn bản đủ điều kiện ban hành. Một số yêu cầu thể thức phụ thuộc nội dung, loại văn bản và quy chế của cơ quan; phần mềm không thể xác lập các điều kiện đó chỉ từ định dạng hiển thị.

#### 2.3.3. Hỗ trợ chính tả tiếng Việt

Lớp chính tả sử dụng dữ liệu Vietnamese.dic cùng tệp quy tắc Hunspell, dữ liệu tiếng Việt đã chuẩn bị cho ứng dụng, các quy tắc ngữ cảnh và thuật ngữ người dùng chủ động thêm [2, 5]. Mục nghi vấn được đánh dấu và có thể kèm gợi ý. Người dùng chọn thay thế, bỏ qua hoặc bổ sung thuật ngữ; phần mềm không tự sửa toàn văn. Trước khi xuất DOCX hoặc lưu theo luồng hỗ trợ, hệ thống có bước kiểm tra lại và cảnh báo nếu còn mục nghi vấn, nhưng việc tiếp tục vẫn do người dùng quyết định.

Từ điển tạo cơ sở tìm kiếm và gợi ý, song không bao quát mọi tên riêng, thuật ngữ chuyên ngành, biến thể vùng miền hay lỗi phụ thuộc ngữ cảnh. Danh mục ngoại lệ giúp giảm cảnh báo nhầm nhưng cũng có thể bỏ sót trường hợp mới. Do đó, số lượng kiểm thử chính tả không thể thay thế phép đo độ chính xác trên tập văn bản có nhãn và được chuyên gia thẩm định.

#### 2.3.4. Thư viện biểu mẫu

Danh mục trong mã nguồn khai báo 22 biểu mẫu, chia theo TVCI, IEMM, TKV và DANG. Các cấu trúc trường dữ liệu gồm 8 dạng hành chính chính và 2 dạng nội bộ khi được hỗ trợ; người dùng chọn mẫu rồi điền hoặc chỉnh các trường phù hợp [5]. Thư viện giúp khởi tạo văn bản theo một khung có sẵn và giảm thao tác dựng lại thành phần quen thuộc.

Số lượng trên là số liệu kiểm kê từ danh mục triển khai, không xác nhận mọi mẫu đã được cơ quan phê duyệt, còn hiệu lực hoặc phù hợp mọi nghiệp vụ. Ảnh giao diện ở Hình 4 cho thấy màn hình thư viện và bộ lọc, nhưng không thay cho nghiệm thu nội dung từng biểu mẫu.

#### 2.3.5. AI hỗ trợ soạn thảo, hiệu đính và điền biểu mẫu

Không gian AI có các luồng soạn thảo, hiệu đính và điền biểu mẫu. Theo mã nguồn, các lựa chọn nhà cung cấp gồm chế độ mô phỏng, OpenAI và Gemini; chế độ mô phỏng được đặt mặc định trong giao diện. Khi có đề xuất, màn hình xem trước làm rõ phần bị bỏ và phần được thêm trước khi người dùng chọn áp dụng [5]. Cách tổ chức này giữ quyền quyết định ở người soạn và cho phép loại bỏ đề xuất không phù hợp.

Hình 5 ghi lại giao diện với chế độ mô phỏng, vì vậy chỉ minh họa bố cục làm việc và thao tác xem trước. Ảnh không chứng minh một nhà cung cấp từ xa đã được cấu hình hoặc chất lượng nội dung AI. Nếu người dùng chọn dịch vụ từ xa, nội dung của yêu cầu có thể được gửi tới nhà cung cấp tương ứng; vì vậy không thể mô tả toàn bộ xử lý AI là cục bộ. Nội dung tạo ra cần được rà soát về sự kiện, thẩm quyền, căn cứ và sắc thái hành chính trước khi đưa vào văn bản.

#### 2.3.6. Tài khoản, Google Drive và quyền riêng tư

Tài khoản TVCI có luồng đăng nhập, đăng ký và đồng thuận điều khoản; chức năng khôi phục dùng mã khôi phục được hiển thị một lần. Mã nguồn còn có trang dành cho quản trị viên cấp cao, với thao tác xem thông tin tài khoản, bật/tắt tài khoản và cấp lại mã khôi phục [5]. Ảnh trên bản vận hành ở Hình 2 cho thấy màn hình đăng nhập và trang tài khoản; bằng chứng giao diện không bao gồm ảnh khu vực quản trị.

Google Drive là kết nối tùy chọn và tách khỏi tài khoản đăng nhập TVCI. Mã nguồn tổ chức tài nguyên thành Documents, Templates, Knowledge, References cùng dữ liệu kỹ thuật của ứng dụng; luồng OAuth khai báo phạm vi drive.file [3, 5]. Hồ sơ tài khoản trong ảnh Hình 2 đang thể hiện Drive chưa kết nối. Vì vậy, chưa có bằng chứng trên bản vận hành cho luồng OAuth, đọc/ghi tài liệu hoặc đồng bộ đầu cuối.

Tài liệu thiết kế và điều khoản mô tả chủ trương không lưu lâu dài nội dung văn bản trên máy chủ TVCI nếu người dùng không chọn Drive, đồng thời giới hạn quyền quản trị đối với nội dung cá nhân [4, 5]. Đây là mô tả về thiết kế/chính sách; ảnh chụp và kiểm tra HTTP không xác minh nhật ký hạ tầng, cấu hình sao lưu hoặc vòng đời dữ liệu thực tế. Ngoài ra, lựa chọn AI từ xa tạo một luồng xử lý dữ liệu riêng cần được cân nhắc theo chính sách của đơn vị và nhà cung cấp.

### 2.4. Phương pháp kiểm tra và đánh giá kỹ thuật

Nghiên cứu sử dụng phương pháp khảo sát kỹ thuật tình huống, không tuyển người tham gia và không đo thời gian hay chất lượng soạn thảo của cán bộ. Bằng chứng được phân thành ba lớp: (i) tài liệu thiết kế và mã nguồn để xác định chức năng được triển khai; (ii) nhật ký kiểm thử tự động, kiểm tra kiểu dữ liệu, đóng gói và xác thực manifest để đánh giá một phần hành vi kỹ thuật; (iii) kiểm tra HTTP và ảnh chụp trực tiếp từ bản vận hành để xác nhận một số tuyến phản hồi và màn hình được hiển thị [4–7].

Các số liệu kiểm thử được giữ theo đúng gói và ngữ cảnh trong nhật ký ngày 02-10-2026. Bộ 31 kiểm thử chính tả là phạm vi tập trung, có thể nằm trong phạm vi rộng hơn của ứng dụng web; các số kiểm thử không cộng để tạo một chỉ số tổng. Kiểm tra HTTP ngày 03-10-2026 được hiểu là bằng chứng về khả năng phản hồi của dịch vụ và tài nguyên tĩnh, không phải xác nhận tính đúng đắn nghiệp vụ. Ảnh giao diện được chụp trực tiếp ở kích thước 1600 × 1200; ảnh xác nhận màn hình tại thời điểm chụp, không thay cho một phép thử đầu-cuối có tiêu chí và dữ liệu chuẩn.

## 3. KẾT QUẢ VÀ THẢO LUẬN

### 3.1. Kết quả triển khai và kiểm thử

Nhật ký xác minh ghi nhận các bộ kiểm thử và bước kiểm tra như Bảng 1. Gói Word Add-in là thành phần riêng của kho mã; con số của gói này được báo cáo để minh bạch phạm vi kỹ thuật chung, không phải số kiểm thử của ứng dụng web “Văn bản và thể chế”.

*Bảng 1. Các kết quả kiểm tra kỹ thuật được ghi nhận ngày 02-10-2026; các dòng khác phạm vi và không cộng thành tổng.*

| Phạm vi | Kết quả ghi nhận | Diễn giải và giới hạn |
|---|---|---|
| Ứng dụng web | 63 tệp kiểm thử; 353 kiểm thử đạt | Nhật ký kế hoạch xác minh web-app ngày 02-10-2026; kiểm tra hành vi trong bộ thử, không đo hiệu quả người dùng. |
| Gói gốc Word Add-in | 56 bộ kiểm thử; 305 kiểm thử đạt | Thành phần riêng trong kho mã gốc, khác ứng dụng web; kiểm tra kiểu dữ liệu, tạo gói và xác thực manifest cũng đạt. |
| Chính tả tiếng Việt | 31 kiểm thử tập trung đạt | Phạm vi chuyên biệt; có thể chồng lặp với kiểm thử ứng dụng web, không cộng vào 353 hoặc 305. |
| Kiểm tra ứng dụng web | Kiểm tra kiểu dữ liệu và tạo gói đạt | Theo nhật ký cùng thời điểm; đây là kết quả kỹ thuật, không phải đánh giá nghiệp vụ. |

Các kết quả đạt cho thấy mã nguồn vượt qua các ca thử và bước đóng gói đã ghi lại; chúng không xác lập tỷ lệ phát hiện chính tả, độ bao phủ mọi trường hợp thể thức, độ tương thích DOCX hay mức độ chấp nhận của người dùng. Tương tự, việc xác thực manifest của Add-in không phải phép kiểm tra manifest của ứng dụng web. Việc tách phạm vi này tránh suy rộng từ một gói sang gói còn lại.

Trong lượt kiểm tra dịch vụ vận hành ngày 03-10-2026, yêu cầu không đăng nhập tới / và /admin nhận phản hồi HTTP 307 chuyển tới /login; /login và /register trả HTTP 200. Các tài nguyên /spellcheck/vi-base.txt, /spellcheck/vi.aff và /spellcheck/vi.dic cũng trả HTTP 200. Những đáp ứng này xác nhận tuyến và tài nguyên được phục vụ tại thời điểm kiểm tra, không chứng minh đăng nhập thành công, chất lượng nội dung, quyền hạn quản trị hoặc hành vi nghiệp vụ sau xác thực [7].

### 3.2. Minh họa giao diện trên bản vận hành

Các Hình 2–5 sử dụng đủ tám ảnh chụp trực tiếp từ giao diện bản vận hành. Mỗi hình ghép hai màn hình để trình bày cùng một nhóm chức năng; nội dung bên trong ảnh không được sửa. Ảnh hỗ trợ quan sát cách bố trí và trạng thái hiển thị, còn các nhận định về số biểu mẫu, cấu trúc xử lý hoặc chức năng chưa thể hiện trực tiếp được đối chiếu với mã nguồn và tài liệu kiểm kê.

<!-- PAGEBREAK -->
<!-- FIGURE: accounts -->

*Hình 2. (a) Màn hình đăng nhập TVCI, với lối vào đăng ký và khôi phục tài khoản riêng với Google Drive. (b) Trang tài khoản hiển thị trạng thái Drive chưa kết nối và thông tin quyền riêng tư. Hai ảnh không chứng minh OAuth đọc/ghi Drive đầu cuối, cấu hình nhật ký hay việc xóa dữ liệu ở hạ tầng.*

<!-- PAGEBREAK -->
<!-- FIGURE: editor_audit -->

*Hình 3. (a) Trình soạn thảo trên bản vận hành hiển thị văn bản mẫu trong vùng trang A4. (b) Bảng kiểm tra thể thức liệt kê các phát hiện và thao tác theo từng mục. Ảnh cho thấy giao diện đã hiển thị, nhưng không chứng minh độ trung thực DOCX, độ chính xác của mọi quy tắc hoặc tuân thủ pháp luật tuyệt đối.*

<!-- PAGEBREAK -->
<!-- FIGURE: spelling_templates -->

*Hình 4. (a) Bảng chính tả đánh dấu một lỗi gõ thử và đưa ra gợi ý; thay đổi cần người dùng chọn. (b) Thư viện biểu mẫu trên bản vận hành có tìm kiếm và bộ lọc. Ảnh minh họa màn hình, không chứng minh độ chính xác chính tả hoặc việc toàn bộ biểu mẫu đã được phê duyệt nghiệp vụ.*

<!-- PAGEBREAK -->
<!-- FIGURE: ai_diff -->

*Hình 5. (a) Không gian AI với nhà cung cấp mô phỏng được chọn. (b) Màn hình so sánh trước–sau thể hiện phần đề xuất thêm/bỏ và lựa chọn áp dụng. Ảnh chứng minh luồng giao diện và bước duyệt, không chứng minh chất lượng đề xuất hoặc một kết nối AI từ xa đang hoạt động.*

### 3.3. Giá trị sử dụng và giới hạn

Các chức năng ghép lại có thể giảm việc chuyển qua lại giữa trang soạn thảo, danh mục mẫu, bảng kiểm tra và công cụ rà soát. Tác dụng tiềm năng nằm ở việc đưa điểm cần xem xét về gần tài liệu, cung cấp khung khởi đầu và làm rõ phần AI muốn thay đổi trước khi áp dụng. Đây là suy luận từ khả năng đã triển khai và cách giao diện vận hành; nghiên cứu chưa đo được số phút tiết kiệm, tỷ lệ lỗi giảm hoặc chất lượng văn bản tăng.

Giới hạn đầu tiên là chưa có tập văn bản hành chính chuẩn được gán nhãn để đo độ nhạy, độ chính xác và tỷ lệ cảnh báo nhầm của kiểm tra thể thức lẫn chính tả. Thứ hai, chưa thực hiện kiểm tra tương thích nhập–xuất trên tập DOCX đại diện cho nhiều phiên bản Word, bảng biểu, phông chữ và bố cục phức tạp. Thứ ba, danh mục biểu mẫu cần quy trình duyệt nghiệp vụ và quản lý phiên bản. Thứ tư, ảnh AI hiện dùng chế độ mô phỏng, còn việc cấu hình nhà cung cấp thật và đánh giá nội dung đầu ra chưa được xác minh. Thứ năm, kết nối Google Drive mới được kiểm tra ở mức thiết kế/mã nguồn và trạng thái chưa kết nối; chưa chạy OAuth hay kiểm tra trao đổi tệp thực tế.

Cuối cùng, chưa có nghiên cứu người dùng với nhiệm vụ, mẫu, thước đo và so sánh xác định. Vì vậy, không thể từ các bộ kiểm thử phần mềm suy ra người dùng làm việc nhanh hơn, ít sai hơn hoặc chấp nhận hệ thống. Bước tiếp theo phù hợp là xây dựng tập văn bản đã ẩn danh, mời chuyên gia nghiệp vụ đánh giá quy tắc và mẫu, kiểm thử nhập–xuất DOCX theo ma trận tài liệu, rồi tiến hành nghiên cứu người dùng có thiết kế được công bố.

## 4. KẾT LUẬN

“Văn bản và thể chế” kết hợp soạn thảo A4, trao đổi DOCX, kiểm tra thể thức theo hồ sơ, hỗ trợ chính tả tiếng Việt, thư viện biểu mẫu và AI có bước xem trước thay đổi. Tài khoản TVCI, khôi phục bằng mã, chức năng quản trị và lưu trữ Google Drive tùy chọn được mô tả ở mức triển khai theo bằng chứng hiện có; kết nối Drive đầu cuối chưa được kiểm chứng. Các ảnh bản vận hành xác nhận sự hiện diện của những màn hình được chụp. Nhật ký kỹ thuật ghi nhận 353 kiểm thử web, 305 kiểm thử của gói Word Add-in riêng, 31 kiểm thử chính tả tập trung cùng các bước kiểm tra kiểu dữ liệu, tạo gói và manifest tương ứng.

Những kết quả này phù hợp với một đánh giá kỹ thuật bước đầu, không phải xác nhận tuân thủ pháp luật, độ chính xác tuyệt đối, hiệu quả người dùng hoặc chất lượng nội dung AI. Mọi sửa đổi cần phán đoán và mọi đề xuất AI vẫn cần người soạn xem xét. Đánh giá tiếp theo nên đo trên tài liệu được thẩm định và nhiệm vụ sử dụng thực tế, đồng thời công bố rõ tập dữ liệu, tiêu chí và giới hạn tái lập.

## TÀI LIỆU THAM KHẢO

[1] Chính phủ Việt Nam (2020), *Nghị định số 30/2020/NĐ-CP về công tác văn thư*, ban hành ngày 05-03-2020. Cơ sở dữ liệu văn bản Chính phủ: https://vanban.chinhphu.vn/default.aspx?docid=199378&pageid=27160.

[2] wooorm/dictionaries, *Vietnamese dictionary data for Hunspell*, kho dữ liệu mở dictionaries/vi, https://github.com/wooorm/dictionaries/tree/main/dictionaries/vi (truy cập ngày 03-10-2026).

[3] Google for Developers, *Choose Google Drive API scopes*, https://developers.google.com/workspace/drive/api/guides/api-specific-auth (truy cập ngày 03-10-2026).

[4] Dự án TVCI Word Add-ins, *design.md: Tài liệu thiết kế hệ thống và các ràng buộc dữ liệu*, bản trong workspace, truy cập ngày 03-10-2026.

[5] Dự án “Văn bản và thể chế”, mã nguồn ứng dụng web: trình soạn thảo và trang A4; nhập/xuất DOCX; bộ quy tắc và sửa an toàn; từ điển và bảng chính tả; danh mục biểu mẫu; không gian AI và màn hình so sánh; tài khoản, điều khoản và kết nối Drive. Các đường dẫn tương ứng nằm trong web_app/src/ và web_app/data/spellcheck/ của kho mã.

[6] Dự án “Văn bản và thể chế” (2026), *ARTICLE_FEATURE_INVENTORY.md* và docs/article-assets/final/manifest.json: kiểm kê chức năng, giới hạn bằng chứng và thông tin tám ảnh chụp trực tiếp.

[7] Dự án “Văn bản và thể chế” (2026), *FINAL_PRODUCTION_EVIDENCE.md* và các nhật ký kế hoạch xác minh ngày 02–03-10-2026: kết quả kiểm thử, kiểm tra tạo gói/kiểu dữ liệu/manifest và phản hồi HTTP trên bản vận hành.

## English title

**Design and Preliminary Technical Evaluation of “Văn bản và thể chế,” a Software System for Vietnamese Administrative Document Authoring**

**Lương Xuân Hùng**

*Industrial Testing and Certification Center (TVCI), Institute of Energy and Mining Mechanical Engineering – Vinacomin*

## ABSTRACT

Administrative document work coordinates content, presentation, spelling, forms, and review. This paper describes the design and preliminary technical evaluation of “Văn bản và thể chế,” focusing on its web application. It combines an A4 editor and DOCX exchange, rule-based format checks, Vietnamese spelling support, templates, and AI-assisted drafting, proofreading, and form filling with a preview before changes. The case study draws on design records, source inspection, tests, production HTTP checks, and screenshots. Records from 2 October 2026 report 353 web-app tests, 305 tests for a separate Word Add-in package, and 31 focused spelling tests. These sets differ and are not additive; spelling tests may overlap with the web-app set. Results support selected technical checks and service responsiveness, but do not establish accuracy, DOCX fidelity, or user effectiveness. Screenshots show captured screens only. End-to-end Drive access and remote AI performance were not verified. Users retain responsibility for corrections and AI proposals. Future work should evaluate annotated documents, interoperability, domain review, and administrative tasks with users.

**KEYWORDS:** administrative documents; Vietnamese spelling; format checking; templates; artificial intelligence; DOCX.
