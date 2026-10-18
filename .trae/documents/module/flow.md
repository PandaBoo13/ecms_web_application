# Luồng Nghiệp Vụ Liên Module (Lead -> Student)

## 1. Sơ đồ Mermaid luồng chuyển đổi (Lead to Student Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Khach as Khách hàng / Phụ huynh
    actor TVV as Tư vấn viên
    participant LeadMod as Lead Module
    participant TuitionMod as Tuition Module
    participant StudentMod as Student Module
    participant DB as PostgreSQL

    Khach->>LeadMod: Đăng ký quan tâm (Web Form / Hotline)
    LeadMod->>DB: Tạo Lead (status=NEW)
    TVV->>LeadMod: Ghi nhận tương tác tư vấn / Đánh giá đầu vào
    LeadMod->>DB: Cập nhật status=CONSULTED, ghi LeadInteraction
    Khach->>TuitionMod: Xác nhận & Đóng cọc thành công
    TuitionMod->>StudentMod: Yêu cầu chuyển đổi Lead sang Student (LeadConvertedEvent / API)
    StudentMod->>DB: Kiểm tra idempotent (đã có Student gắn lead_id chưa?)
    alt Đã tồn tại Student với lead_id này
        StudentMod-->>TuitionMod: Trả về Student hiện tại (Idempotent OK)
    else Chưa tồn tại Student (Khách mới)
        StudentMod->>DB: Sinh mã STD + yyyyMM + 4 số ngẫu nhiên
        StudentMod->>DB: Tạo Students (status=ACTIVE, lead_id)
        StudentMod->>DB: Cập nhật Leads (student_id, converted_at)
        StudentMod->>DB: Thêm bản ghi AcademicHistories ban đầu
        StudentMod->>DB: Ghi log StudentStatusLogs
        StudentMod-->>TuitionMod: Trả về Student mới
    end
```

## 2. Ghi chú quy chuẩn bắt buộc
### Bất biến (Invariants)
* Mỗi `Lead` chỉ được chuyển đổi thành tối đa **1** `Student` (ràng buộc duy nhất `uk_students_lead`).
* Xử lý chuyển đổi phải đảm bảo tính `Idempotent`: Gọi nhiều lần cùng một yêu cầu chuyển đổi không được sinh trùng học viên.
* `Lead.status` không được lùi từ `CONSULTED` về `NEW`.

### Giả định (Assumptions)
* Khi chuyển đổi thành công, thông tin họ tên, email, số điện thoại được kế thừa từ `Lead` sang `Student`.
* Khách hàng thanh toán cọc thành công trước khi hệ thống thực hiện chuyển đổi thành `Student`.

### Tác dụng phụ (Side-effects)
* `Lead` được gán `student_id` và cập nhật mốc thời gian `converted_at`.
* Tự động tạo bản ghi `AcademicHistory` ban đầu nếu có `course_id`.
* Ghi nhận dòng nhật ký `StudentStatusLog` ghi rõ nguồn gốc tạo từ Lead.

### Luồng lỗi (Failure/Edge cases)
* Trùng mã học viên ngẫu nhiên: Thực hiện cơ chế retry sinh mã tối đa 10 lần trước khi báo lỗi.
* Lead không tồn tại trong hệ thống: Trả về lỗi `404 Not Found`.

