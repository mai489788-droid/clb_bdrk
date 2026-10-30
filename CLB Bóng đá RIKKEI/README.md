# Rikkei FC — PTIT × Rikkei, cơ sở Hà Nội

Website tiếng Việt dùng HTML, CSS và JavaScript. Thư mục triển khai chính là `dist/`.

## Dữ liệu CLB

Nguồn: https://docs.google.com/spreadsheets/d/1kX0Buru0yjKmbEliCNz0RT0k3wWAjHJVkZEgqEw1fUs/edit?gid=0#gid=0

Bản chụp ngày 09/10/2026, đọc cả 9 tab. Có 50 thành viên, 10 người đã đóng quỹ, 12 người sẵn sàng, 20 đầu việc, 6 sân khảo sát và 4 khoản dự trù. Nội quy được giữ nguyên văn. Có 10 ảnh bill: 8 ảnh gắn theo đúng dòng thành viên, 2 ảnh nổi lệch dòng để riêng chờ xác minh.

Số liệu nguồn: mức đóng tháng đầu 230.000đ/người, cơ sở tính 48 người, tổng quỹ dự kiến 11.040.000đ, chi phí dự kiến 3.600.000đ, dư dự kiến 7.440.000đ, thực thu 2.300.000đ. Nguồn có chênh lệch 50 người trong danh sách so với 48 người trong bảng quỹ. Website hiển thị chênh lệch và giữ nguyên số liệu nguồn; không tự suy ra ngày thu, giao dịch từng người hay số dư tiền thực tế. Thực chi và số dư đầu kỳ chưa có.

Lịch Thứ 5, 19h30–21h là lịch dự kiến; chưa có sân được chốt hoặc ngày thi đấu cụ thể. Không tự tạo trận đấu từ danh sách sân.

## Chạy và dùng thử

Chạy `python3 -m http.server 4173 --directory dist`, mở http://localhost:4173. Đăng nhập quản trị bằng `mai489788@gmail.com`, mật khẩu khởi tạo `rikkei123`. Email này được chủ website cung cấp, gắn với hồ sơ Mai Đức Thuy có sẵn. Không tạo thêm thành viên hoặc email giả. Trong mục Thành viên → mở hồ sơ → Chỉnh sửa, quản trị viên cấp email và mật khẩu cho từng người. Thành viên chưa có email, bị khóa hoặc đã rời CLB không thể đăng nhập.

Có tìm kiếm và lọc theo tên/lớp/vị trí/tham gia/đóng quỹ, xuất CSV, hồ sơ thành viên, ảnh bill, công việc các ban, khảo sát sân, dự trù chi phí, ghi giao dịch mới, lịch đá, điểm danh, đơn xin vắng, thông báo và nội quy. Chỉ chức vụ do quản trị viên cấp mới có nút quản lý tương ứng. Các vị trí/vai trò ghi trong bảng nguồn được giữ để đối chiếu nhưng không tự cấp quyền truy cập. Ngoại trừ tài khoản quản trị hiện có, tài khoản chưa có lần cấp chức vụ rõ ràng dùng quyền Thành viên; quyền quản lý cũ cần được xác nhận lại bằng nút Cập nhật chức vụ.

Dữ liệu mới lưu vào `rikkei-sheet-v2` trong localStorage. Khóa dữ liệu mẫu cũ `rikkei-db-v1` được giữ nguyên. Tải lại trang giữ thay đổi; mục Dữ liệu nguồn cho quản trị viên tải bản sao lưu JSON, xem trước khi khôi phục và quay lại bản trước lần khôi phục. Chỉ khôi phục tệp từ cùng bản chụp Google Sheets; tệp không hợp lệ hoặc lỗi bộ nhớ không thay thế dữ liệu hiện tại. Đây là bản chụp nguồn, chưa tự đồng bộ và không ghi ngược Google Sheets.

Mỗi lần lưu được kiểm tra cấu trúc và liên kết dữ liệu. Nếu hết bộ nhớ, biểu mẫu giữ nội dung vừa nhập để thử lại và dữ liệu cũ được phục hồi. Khi một tab khác đã lưu thay đổi, biểu mẫu cũ sẽ yêu cầu đóng để tải bản mới trước khi sửa tiếp. Các tab cùng trình duyệt cập nhật qua sự kiện lưu trữ; đây chưa phải đồng bộ nhiều thiết bị. Nếu dữ liệu lưu bị hỏng, website mở màn hình khôi phục, cho tải nguyên bản lỗi và chỉ thay thế sau khi chọn bản sao lưu hợp lệ rồi xác nhận.

## Các thao tác mới

- Nút chức năng dùng biểu tượng thống nhất, nút duyệt màu xanh, thao tác xóa/từ chối màu đỏ nhạt; có trạng thái chọn, bàn phím và đang xử lý. Biểu mẫu ghi rõ thao tác lưu, giữ nút đóng/lưu khi cuộn và khóa thao tác trong lúc lưu để tránh gửi trùng. Nút sao chép hỗ trợ chọn nội dung thủ công khi trình duyệt không cấp quyền. Các nút thao tác chính có vùng chạm tối thiểu 44px trên điện thoại.
- Thành viên có tổng quan riêng gồm lịch đá, đơn cá nhân, tình trạng nộp quỹ và thông báo; mục Quỹ của tôi chỉ hiển thị lịch sử của người đăng nhập. Không hiển thị Truy cập chức vụ, Dữ liệu nguồn, công cụ sao lưu hoặc liên kết Google Sheets trong giao diện thành viên.
- Quản trị viên cấp/thu hồi quyền tại **Thành viên → Hồ sơ đồng đội → Cập nhật chức vụ**. Chọn chức vụ rồi bấm **Cập nhật chức vụ** mới áp dụng; hủy giữ nguyên quyền. Chọn **Thành viên** để thu hồi chức năng quản lý. Thành viên nhận thông báo sau khi quyền thay đổi; các tab cùng trình duyệt cập nhật qua cơ chế lưu trữ hiện có. Chỉnh hồ sơ cá nhân hoặc vị trí thi đấu không đổi chức vụ.
- Quản trị viên có mục **Truy cập chức vụ** gồm 6 không gian: Quản trị viên, Quản lý đội, Trưởng ban Truyền thông, Trưởng ban Hậu cần, Thủ quỹ và Thành viên. Thanh chọn hiển thị trong các không gian quản lý; nút **Về quản trị** khôi phục toàn quyền. Khi xem trước vai trò Thành viên, thanh chọn và mục Truy cập chức vụ được ẩn; dùng **Kết thúc xem trước** để quay lại quản trị. Tài khoản thành viên thật không có nút này. Chọn chức vụ thay đổi chức năng đang dùng, không sửa vai trò trong hồ sơ hoặc đăng nhập sang người khác. Thao tác vẫn lưu vào dữ liệu CLB. Lựa chọn giữ khi tải lại tab, xóa khi đăng xuất; thành viên thường không có chức năng này.
- Tìm kiếm toàn CLB bằng nút tìm kiếm hoặc `Ctrl/Cmd + K`; hỗ trợ tiếng Việt không dấu và chỉ hiện dữ liệu phù hợp với vai trò.
- Thành viên có hai chế độ danh sách/thẻ, lọc kết hợp, sắp xếp theo tên/lớp và xem hồ sơ trước khi sửa. Điện thoại mặc định dạng thẻ.
- Hồ sơ cá nhân cho sửa ảnh đại diện, thông tin liên hệ, vị trí, giới thiệu, email và mật khẩu. Email không được trùng; đổi mật khẩu cá nhân cần mật khẩu hiện tại. Ảnh đại diện được cắt vuông và nén trước khi lưu.
- Thông báo chưa hoàn thành dùng thẻ sáng; hoàn thành chuyển sang màu tối dịu. Trạng thái riêng cho từng người, có bộ lọc và có thể đánh dấu chưa xong trở lại. Tổng quan và biểu tượng chuông đếm thông báo chưa hoàn thành.
- Thông báo yêu cầu duyệt đơn/bill mới được gắn với hồ sơ tương ứng và tự hoàn thành khi hồ sơ được xử lý hoặc rút lại.
- Nộp quỹ → Cấu hình thu quỹ: quản trị viên tự nhập ngân hàng, số tài khoản, chủ tài khoản, tải QR, đặt mức đóng/hạn nộp và mở kỳ thu. Tạo kỳ mới để giữ lịch sử tháng trước. Chỉ mở nhận xác nhận khi có đủ thông tin và QR.
- Thành viên chuyển khoản bằng ứng dụng ngân hàng, sau đó bấm “Tôi đã chuyển khoản”, gửi ảnh bill. Quản trị viên/thủ quỹ đối chiếu rồi duyệt hoặc yêu cầu kiểm tra lại. Chỉ khi duyệt mới ghi một khoản thu; thao tác duyệt lặp không ghi trùng. Số liệu quỹ nguồn giữ nguyên, giao dịch mới được ghi riêng. Người đã đóng theo nguồn không phải gửi lại cho kỳ tháng đầu.
- Bill đang chờ có thể rút để gửi lại; bản đã rút vẫn giữ lịch sử và không tạo khoản thu. Kỳ đã có xác nhận yêu cầu tạo kỳ mới khi đổi tên kỳ hoặc mức đóng, tránh thay đổi nghĩa vụ trên các bill đã gửi.
- Tổng quan có mục “Cần bạn xử lý” dẫn đến đơn chờ duyệt, việc của ban và thông báo chưa hoàn thành.
- Bảng công việc có lọc ban của tôi/quá hạn/sắp đến hạn (trong 3 ngày), sắp xếp theo hạn và nút hoàn thành nhanh.
- Hoạt động có thời lượng và xuất `.ics` để thêm vào lịch cá nhân; giờ Việt Nam được chuyển đúng sang UTC trong tệp lịch. Đây là tệp tải về, không tự gửi lời mời.
- Lịch mới được kiểm tra trùng khung giờ. Xác nhận tham gia và xử lý đơn xin vắng đóng khi hoạt động bắt đầu. Thành viên có thể sửa đơn đang chờ hoặc rút đơn đang chờ/đã duyệt trước giờ bắt đầu; lịch sử duyệt và rút được giữ. Muốn xác nhận tham gia lại cần rút đơn vắng còn hiệu lực.
- Kiểm tra ảnh có đọc được trước khi dùng cho hồ sơ, QR hoặc chứng từ; bản xem trước không bị ảnh chọn trước đó ghi đè khi đổi tệp liên tục. Quản lý đội không được sửa tài khoản quản trị; cấp quyền quản trị cần email hợp lệ.
- Điện thoại có thanh điều hướng phía dưới, menu kèm lớp phủ, thao tác đóng bằng Esc và hỗ trợ điều hướng bàn phím.
- Sao lưu JSON và khôi phục có xem trước, xác nhận, kiểm tra nguồn, và giữ bản trước lần khôi phục. Thao tác chỉ diễn ra trên trình duyệt.

## Cấu trúc

- `dist/club-data.js`: dữ liệu nguồn được chuẩn hóa, có tab và dòng gốc.
- `dist/app.js`: phiên truy cập, điều hướng, lịch, đơn, giao dịch, thông báo.
- `dist/source-ui.js`: màn hình theo dữ liệu thực tế, danh sách thành viên, quỹ, sân, công việc, nội quy.
- `dist/member-ui.js`: tìm kiếm, lọc, thẻ và hồ sơ thành viên.
- `dist/backup-ui.js`: kiểm tra bản sao lưu, xem trước và khôi phục.
- `dist/experience.js`: điều hướng, tìm kiếm chung, việc cần xử lý, nhắc hạn và xuất lịch.
- `dist/account-fund.js`: đăng nhập email, hồ sơ/ảnh, trạng thái thông báo, cấu hình QR và xác nhận nộp quỹ.
- `dist/member-space.js`: tổng quan/quỹ cá nhân riêng và biểu mẫu cấp chức vụ chỉ dành cho quản trị viên.
- `dist/role-access.js`: khu vực truy cập mọi chức vụ và chuyển không gian làm việc của quản trị viên.
- `dist/controls-ui.js`, `dist/controls.css`: biểu tượng, nhãn, trạng thái và bố cục chung cho nút chức năng.
- `dist/data-store.js`: kiểm tra dữ liệu khi lưu, phục hồi khi lưu lỗi, phát hiện thay đổi từ tab khác và khôi phục dữ liệu hỏng.
- `dist/workflow-quality.js`: vòng đời đơn xin vắng/bill, kiểm tra lịch trùng và giờ bắt đầu, thông báo liên kết, kiểm tra ảnh; khởi tạo giao diện sau khi tải đủ các mô-đun.
- `dist/style.css`: giao diện máy tính và điện thoại.
- `data/source-snapshot.json`: giá trị, công thức và định dạng ô nguồn để đối chiếu.
- `scripts/import-source.py`: nhập lại tệp XLSX đã tải từ cùng bảng tính; chạy `python3 scripts/import-source.py --help` để xem tham số.

Các bản trong `rikkei-fc/dist/` và `style.css` ở gốc là bản cũ, không dùng khi triển khai. Chỉnh sửa website ở `dist/`.

## Kiểm tra

Đã kiểm tra cú pháp JavaScript, đối chiếu số lượng và tổng dự trù. Kiểm tra Chrome thực tế bằng `tests/browser-check.cjs` bao gồm mọi màn hình ở desktop và 390px, tìm kiếm/lọc, cập nhật sân, quyền thành viên, tạo hoạt động và luồng gửi đơn → duyệt → thông báo. `tests/experience-check.cjs` kiểm tra tìm kiếm theo quyền, thẻ thành viên, hoàn thành công việc, múi giờ của tệp lịch, khôi phục/hủy/quay lại bản sao lưu, menu điện thoại và bố cục 360/768/1280px. Script sử dụng Playwright và Chrome sẵn có trong môi trường phát triển; cần điều chỉnh đường dẫn khi chuyển máy.

`tests/account-fund-check.cjs` kiểm tra cấp email, chặn email trùng, đổi mật khẩu/ảnh hồ sơ, QR chỉ quản trị viên chỉnh, gửi bill trước khi ghi thu, duyệt không trùng, thông báo hoàn thành theo từng tài khoản, sao lưu dữ liệu mới và bố cục nộp quỹ trên điện thoại. Email phụ, ngân hàng và ảnh trong test chỉ nằm trong phiên kiểm thử.

`tests/role-access-check.cjs` kiểm tra đủ 6 vai trò, quyền tương ứng, quay về quản trị, giữ danh tính khi lưu dữ liệu, tải lại/đăng xuất, chặn chức năng chuyển vai trò với thành viên và bố cục điện thoại.

`tests/controls-check.cjs` kiểm tra lưu lại sau lỗi ảnh, trạng thái chờ và ngăn gửi trùng/đóng giữa lúc lưu, lựa chọn tham gia, sao chép và phương án thay thế, trạng thái bộ lọc, vùng chạm và nút đóng trên biểu mẫu dài ở điện thoại.

`tests/workflow-quality-check.cjs` kiểm tra hết bộ nhớ và thử lưu lại cùng biểu mẫu, xung đột hai tab, bảo vệ tài khoản quản trị, ảnh hỏng, lịch trùng/kề nhau, thời hạn xác nhận tham gia, rút đơn đã duyệt, tự hoàn thành thông báo, rút/gửi lại bill, giữ mức quỹ của kỳ đã có xác nhận, tải nguyên dữ liệu hỏng và khôi phục bằng tệp hợp lệ, bố cục khôi phục trên điện thoại và trình duyệt chặn lưu trữ.

`tests/member-space-check.cjs` kiểm tra trang thành viên không có công cụ quản trị/Sheets, vai trò nhập không tự cấp quyền, cấp/hủy/thu hồi chức vụ, quyền cập nhật giữa hai tab, công cụ đúng chức vụ, lưu quyền vào bản sao lưu, chế độ xem trước và bố cục điện thoại.

## Kết nối backend trước khi vận hành thật

Đăng nhập/kiểm tra quyền hiện là mô phỏng phía trình duyệt. Email, mật khẩu đã đổi, QR, bill và các xác nhận chỉ lưu trong trình duyệt đang dùng, chưa chia sẻ giữa thiết bị/thành viên. Mật khẩu mới được băm có salt bằng PBKDF2, nhưng không thay thế xác thực phía máy chủ. Cần backend có xác thực/phân quyền, cơ sở dữ liệu chung, lưu trữ tệp và đồng bộ có đối chiếu nếu dùng cùng Google Sheets. Nộp quỹ hiện hỗ trợ QR và đối chiếu thủ công, chưa có kết nối ngân hàng hay tự xác nhận giao dịch. Lịch đăng bài hiện là kế hoạch, không có tác vụ tự đăng bài.
