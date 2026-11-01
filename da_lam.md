# Tổng kết phần đã thực hiện

## Phạm vi

Đã bổ sung phần API nền cho hai module **Tuition** (học phí, hóa đơn) và **Enrollment** (ghi danh, điểm danh, điều phối) trong backend Spring Boot `OC01`. Không chủ động chỉnh sửa các module khác. Thay đổi có sẵn của người dùng trong `RoleServiceImpl.java` được giữ nguyên.

## Tuition

- Thêm entity, enum, repository và DTO cho hóa đơn; biểu diễn các loại và trạng thái hóa đơn theo DDL được cung cấp.
- Thêm API tạo hóa đơn offline, tạo hóa đơn checkout online, tìm kiếm và xem chi tiết hóa đơn.
- Thêm API xác nhận thanh toán tiền mặt, gia hạn hạn thanh toán, hủy hóa đơn và tạo hóa đơn/chứng từ hoàn tiền liên kết với hóa đơn gốc.
- Phát sự kiện khi hóa đơn được xác nhận đã thanh toán để hỗ trợ luồng ghi danh online.

Controller: `OC01/src/main/java/com/ecms_web_application/OC01/controller/TuitionController.java`
Nghiệp vụ: `OC01/src/main/java/com/ecms_web_application/OC01/service/impl/tuition/`

## Enrollment

- Thêm entity, enum, repository và DTO cho ghi danh, trạng thái ghi danh và bản ghi vắng mặt.
- Thêm API tạo ghi danh offline từ hóa đơn học phí đã thanh toán; tra cứu danh sách/chi tiết; bảo lưu, khôi phục, kết thúc ghi danh; lưu điểm cuối khóa và xét hoàn thành.
- Thêm API xem lịch sử vắng mặt/trạng thái và xem điểm danh theo buổi học, ghi nhận các học viên vắng. Theo cấu trúc DDL hiện tại, API điểm danh chỉ thêm bản ghi vắng mới và giữ lại bản ghi cũ.
- Thêm listener để tạo ghi danh online khi nhận sự kiện thanh toán thành công cho hóa đơn của khóa online.

Controller: `OC01/src/main/java/com/ecms_web_application/OC01/controller/EnrollmentController.java` và `EnrollmentAttendanceController.java`
Nghiệp vụ: `OC01/src/main/java/com/ecms_web_application/OC01/service/impl/enrollment/`

## Kiểm tra và phần chưa triển khai

- Đã bỏ phụ thuộc và cấu hình cho giới hạn vắng/ngưỡng điểm theo quyết định hiện tại. Khi xét hoàn thành khóa OFFLINE, hệ thống hiện yêu cầu có `final_score` nhưng tạm chưa kiểm tra ngưỡng điểm hoặc số buổi vắng. ONLINE vẫn kiểm tra tiến độ 100% và các bài quiz bắt buộc.
- Đã thêm job định kỳ: hóa đơn PENDING quá hạn của khóa OFFLINE chuyển OVERDUE lúc 01:00; ghi danh OFFLINE PENDING chuyển ACTIVE lúc 01:05 khi đến ngày khai giảng. Tự động kích hoạt có ghi status log; thông báo chưa tích hợp.
- Đã đăng ký các API mới trong `permissions-seed.json` và quyền STUDENT/INSTRUCTOR tương ứng trong `role-permission-seed.json`; ADMIN dùng quyền `*`. Hai file JSON đã parse hợp lệ. Không chạy `PermissionSyncer` trên Neon.
- Đã thêm API client và TypeScript types cho admin FE và student FE tại `ecms_web_admin/src/services/api/tuition-enrollment.ts`, `ecms_web_admin/src/services/types/tuition-enrollment.ts`, `ecms_web_studying/src/services/api/tuition-enrollment.ts`, `ecms_web_studying/src/services/types/tuition-enrollment.ts`, cùng các endpoint constants tương ứng. Bổ sung alias `@/*` trong `ecms_web_studying/tsconfig.app.json` để TypeScript hiểu cách import mà Vite đã cấu hình.
- Đã tách riêng trang quản trị Admin thành 2 mục độc lập trên Sidebar và Router:
  - **Học phí** (`/admin/tuition`): Quản lý danh sách hóa đơn, tạo hóa đơn offline, thu tiền mặt, gia hạn, hủy và hoàn tiền.
  - **Ghi danh** (`/admin/enrollments`): Quản lý danh sách ghi danh (bảo lưu, tiếp tục học, ghi điểm, hoàn thành, kết thúc, xem lịch sử trạng thái) và tab Điểm danh buổi học.
  - Giữ route `/admin/tuition-enrollment` tự động chuyển hướng về `/admin/tuition`.
- Thêm trang giảng viên `/instructor/attendance` để ghi nhận vắng.
- Nhánh `trong` hiện ở commit `f3554c0`, trùng với `origin/main` (PR #30). Các phần Tuition/Enrollment bên dưới là thay đổi làm việc hiện tại trên nhánh này.
- Đã thêm trang học viên `/student/tuition-enrollment` để xem hóa đơn, ghi danh và lịch sử vắng/trạng thái; nút đăng ký khóa ONLINE có phí trong danh mục tạo hóa đơn checkout và chuyển sang trang này.
- Backend compile với JDK 17: **BUILD SUCCESS** (`mvnw -DskipTests compile`). Không chạy test và không khởi động ứng dụng.
- Vite bundler của cả hai FE build thành công sau khi thêm trang. `npx tsc -b` vẫn báo lỗi hiện hữu ngoài các file Tuition/Enrollment: Admin có lỗi type/unused-symbol ở nhiều file; Studying còn unused import trong `PricingPage.tsx`. Không sửa các lỗi ngoài phạm vi. Phần file mới không xuất hiện lỗi TypeScript trong lần kiểm tra.
- Đã bổ sung API tạo liên kết thanh toán VNPAY tại `POST /api/tuition/invoices/{invoiceId}/vnpay` và IPN `GET /api/tuition/payments/vnpay/ipn`; xác minh chữ ký HMAC-SHA512/checksum, mã merchant, mã hóa đơn và số tiền; cập nhật PAID đúng khi callback thành công; lưu payload/trạng thái xử lý vào `payment_webhook_logs`; có khóa hóa đơn/idempotency khi xử lý callback. Checkout online trả lại hóa đơn PENDING hiện có thay vì tạo trùng. Quy trình checksum và IPN GET đối chiếu theo [tài liệu VNPAY](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).
- FE checkout khóa ONLINE có phí tạo hóa đơn, xin URL VNPAY và chuyển hướng sang cổng thanh toán. Cần khai báo `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL` trong cấu hình môi trường backend; `VNPAY_PAY_URL` có mặc định sandbox. Merchant cần cấu hình IPN URL trỏ tới `/api/tuition/payments/vnpay/ipn` trên backend HTTPS. Chưa chạy giao dịch sandbox do không có thông tin merchant/IPN công khai.
- Đã tích hợp gửi Notification (thông báo nội bộ/WebSocket) cho học viên khi thanh toán học phí thành công (qua tiền mặt hoặc VNPAY) thông qua `OnlineEnrollmentOnPaymentListener` và `NotificationService`. Tự động resolve `accountId` từ hóa đơn hoặc `studentId`. Enrollment online được tạo ở BEFORE_COMMIT; notification được chuyển sang AFTER_COMMIT để lỗi gửi tin không làm rollback giao dịch thanh toán.
- Kiểm chứng hiện tại: `mvnw -DskipTests clean compile` với JDK 17 **BUILD SUCCESS**; Vite build của hai FE **thành công**. `npm run build` của hai FE hiện vẫn thất bại tại lỗi TypeScript ngoài phạm vi (Admin: các lỗi ref Ant Design, Course và trang dùng chung; Studying: import/API/type của Course). Các file Tuition/Enrollment mới không có lỗi được TypeScript báo trong lần build này.
- Chưa chạy test và chưa khởi động ứng dụng; không kết nối Neon và không chạy `PermissionSyncer`.

## Bước tiếp theo còn chờ cấu hình môi trường

- Chưa có merchant sandbox, `TMN_CODE`, `HASH_SECRET` hoặc IPN URL công khai; vì vậy hiện chưa thể chạy giao dịch VNPAY đầu-cuối. Không dùng thông tin merchant chia sẻ trên mạng hoặc production credentials.
- Lộ trình được đề xuất:
  1. Đăng ký merchant thử nghiệm tại [cổng đăng ký VNPAY Sandbox](https://sandbox.vnpayment.vn/devreg). VNPAY cung cấp `TmnCode` và `HashSecret` cùng thông tin tích hợp sau khi đăng ký.
  2. Tạo một URL HTTPS công khai trỏ tới backend đang chạy để VNPAY gọi IPN. Endpoint của dự án là `GET /api/tuition/payments/vnpay/ipn`; địa chỉ `localhost` không thể nhận callback từ máy chủ VNPAY.
  3. Trong IntelliJ Run Configuration cho `OC01`, khai báo environment variables `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL`. Không commit các giá trị này vào YAML/Git và không gửi `HASH_SECRET` trong chat. `VNPAY_PAY_URL` có thể để mặc định sandbox hiện có trong code.
  4. Cấu hình merchant sandbox với URL IPN HTTPS ở bước 2 và Return URL theo hướng dẫn merchant. Dùng Return URL để đưa trình duyệt người học trở lại ứng dụng; IPN mới là callback server-to-server dùng xác nhận thanh toán.
  5. Tạo hóa đơn khóa ONLINE trên hệ thống, thanh toán bằng dữ liệu thẻ thử nghiệm được VNPAY cấp trong tài liệu Sandbox, rồi kiểm tra hóa đơn PENDING → IPN hợp lệ → PAID → enrollment ONLINE ACTIVE và notification.
- VNPAY hướng dẫn cần đăng ký/nhận thông tin merchant, cấu hình Payment URL, Return URL, IPN URL và kiểm tra checksum trong [hướng dẫn tích hợp PAY](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html). Môi trường sandbox và yêu cầu máy chủ có thể nhận IPN được mô tả trong [giới thiệu VNPAY](https://sandbox.vnpayment.vn/apis/docs/gioi-thieu/).
- Người dùng hiện chưa có thông tin merchant và đồng ý theo đề xuất này. Bước tiếp theo cần người dùng đăng ký sandbox, giữ bí mật `HASH_SECRET`, rồi báo khi đã khai báo biến trong IntelliJ và có URL IPN HTTPS; không cần dán bí mật vào cuộc trò chuyện.

## Cập nhật kiểm chứng mới nhất

- Đã kiểm tra biến môi trường Process/User/Machine của Windows: chưa có `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL` hoặc `VNPAY_PAY_URL`; repo cũng không có cấu hình merchant. Vì vậy chưa thể chạy giao dịch sandbox thật.
- Sau khi tách Notification sang AFTER_COMMIT, backend đã `clean compile` thành công với JDK 17. Vite production bundle của admin và student FE đều build thành công.
- `npm run build` đầy đủ vẫn dừng ở lỗi TypeScript thuộc các phần khác ngoài Tuition/Enrollment (Admin: ref Ant Design/Course/UI dùng chung; Studying: API/type Course). Chưa sửa các module này.
- Không khởi động ứng dụng, không kết nối Neon và không chạy `PermissionSyncer` trong lần kiểm chứng này.
