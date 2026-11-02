package com.ecms_web_application.OC01.entity.enums;

/**
 * Loại yêu cầu. Mỗi loại tự khai báo:
 *  - code              : giá trị lưu DB
 *  - displayName       : tên hiển thị cho UI
 *  - targetEntityType  : 'COURSE','SESSION','INVOICE','ENROLLMENT','STUDENT','LEAD','ACCOUNT','NONE'
 *  - approverRoleCode  : role phải có để duyệt (null = any, ADMIN luôn bypass)
 *
 * Thêm loại mới:
 *   1. Thêm 1 dòng vào enum này
 *   2. Viết 1 Handler class (implements RequestHandler)
 *   → KHÔNG cần migration DB.
 */
public enum RequestType {

    // ===== COURSE =====
    COURSE_REVIEW          ("COURSE_REVIEW",           "Kiểm duyệt khóa học",        "COURSE",     "ACADEMIC_ADMIN"),
    COURSE_UNPUBLISH       ("COURSE_UNPUBLISH",        "Gỡ xuất bản khóa học",       "COURSE",     "ACADEMIC_ADMIN"),
    COURSE_CLONE           ("COURSE_CLONE",            "Nhân bản khóa học",          "COURSE",     "ACADEMIC_ADMIN"),
    COURSE_DELETE          ("COURSE_DELETE",           "Xóa khóa học",               "COURSE",     "ADMIN"),
    COURSE_PRICE_CHANGE    ("COURSE_PRICE_CHANGE",     "Đổi học phí",                "COURSE",     "ACADEMIC_ADMIN"),
    COURSE_TEACHER_CHANGE  ("COURSE_TEACHER_CHANGE",   "Đổi giảng viên chính",       "COURSE",     "ACADEMIC_ADMIN"),

    // ===== SESSION =====
    SCHEDULE_CHANGE        ("SCHEDULE_CHANGE",         "Đổi lịch dạy",               "SESSION",    "ACADEMIC_ADMIN"),
    SCHEDULE_CANCEL        ("SCHEDULE_CANCEL",         "Hủy buổi học",               "SESSION",    "ACADEMIC_ADMIN"),
    ROOM_CHANGE            ("ROOM_CHANGE",             "Đổi phòng học",              "SESSION",    "ACADEMIC_ADMIN"),
    SESSION_SUBSTITUTE     ("SESSION_SUBSTITUTE",      "Gán GV dạy thay",            "SESSION",    "ACADEMIC_ADMIN"),
    SESSION_EXTEND         ("SESSION_EXTEND",          "Kéo dài buổi học",           "SESSION",    "ACADEMIC_ADMIN"),
    SESSION_ADD            ("SESSION_ADD",             "Thêm buổi học",              "COURSE",     "ACADEMIC_ADMIN"),

    // ===== FINANCE =====
    INVOICE_REFUND         ("INVOICE_REFUND",          "Hoàn tiền",                  "INVOICE",    "ACADEMIC_ADMIN"),
    INVOICE_ADJUSTMENT     ("INVOICE_ADJUSTMENT",      "Điều chỉnh hóa đơn",         "INVOICE",    "ADMIN"),
    INVOICE_CANCEL         ("INVOICE_CANCEL",          "Hủy hóa đơn",                "INVOICE",    "ADMIN"),
    INVOICE_EXTEND_DUE     ("INVOICE_EXTEND_DUE",      "Gia hạn hạn thanh toán",     "INVOICE",    "ADMIN"),
    PAYMENT_CONFIRM        ("PAYMENT_CONFIRM",         "Xác nhận thanh toán",        "INVOICE",    "ACADEMIC_ADMIN"),

    // ===== ENROLLMENT =====
    ENROLLMENT_TERMINATE   ("ENROLLMENT_TERMINATE",    "Chấm dứt ghi danh",          "ENROLLMENT", "ACADEMIC_ADMIN"),
    ENROLLMENT_RESERVE     ("ENROLLMENT_RESERVE",      "Bảo lưu ghi danh",           "ENROLLMENT", "ACADEMIC_ADMIN"),
    ENROLLMENT_RESUME      ("ENROLLMENT_RESUME",       "Quay lại sau bảo lưu",       "ENROLLMENT", "ACADEMIC_ADMIN"),
    ENROLLMENT_TRANSFER    ("ENROLLMENT_TRANSFER",     "Chuyển khóa học",            "ENROLLMENT", "ADMIN"),

    // ===== STUDENT =====
    STUDENT_STATUS_CHANGE  ("STUDENT_STATUS_CHANGE",   "Đổi trạng thái học viên",    "STUDENT",    "ACADEMIC_ADMIN"),
    STUDENT_LOCK_ACCOUNT   ("STUDENT_LOCK_ACCOUNT",    "Khóa tài khoản học viên",    "STUDENT",    "ADMIN"),
    STUDENT_PROFILE_UPDATE ("STUDENT_PROFILE_UPDATE",  "Cập nhật hồ sơ học viên",    "STUDENT",    "ACADEMIC_ADMIN"),

    // ===== LEAD =====
    LEAD_ASSIGNMENT        ("LEAD_ASSIGNMENT",         "Phân công tư vấn viên",      "LEAD",       "ADMIN"),
    LEAD_CLOSE             ("LEAD_CLOSE",              "Đóng Lead",                  "LEAD",       "ADMIN"),
    LEAD_CONVERT           ("LEAD_CONVERT",            "Chuyển Lead sang Student",   "LEAD",       "ACADEMIC_ADMIN"),

    // ===== ACCOUNT =====
    ACCOUNT_ROLE_CHANGE    ("ACCOUNT_ROLE_CHANGE",     "Đổi role tài khoản",         "ACCOUNT",    "ADMIN"),
    ACCOUNT_RESET_PASSWORD ("ACCOUNT_RESET_PASSWORD",  "Reset mật khẩu",             "ACCOUNT",    "ADMIN"),
    ACCOUNT_UNLOCK         ("ACCOUNT_UNLOCK",          "Mở khóa tài khoản",          "ACCOUNT",    "ADMIN"),
    INSTRUCTOR_SPEC_ADD    ("INSTRUCTOR_SPEC_ADD",     "Thêm chuyên môn GV",         "ACCOUNT",    "ACADEMIC_ADMIN"),

    // ===== NOTIFICATION =====
    NOTIFICATION_BROADCAST ("NOTIFICATION_BROADCAST",  "Gửi thông báo diện rộng",    "NONE",       "ADMIN"),
    NOTIFICATION_BLAST     ("NOTIFICATION_BLAST",      "Gửi thông báo cho lớp",      "COURSE",     "ACADEMIC_ADMIN"),

    // ===== SUPPORT / FEEDBACK =====
    SUPPORT_TICKET         ("SUPPORT_TICKET",          "Yêu cầu hỗ trợ",             "NONE",       "ACADEMIC_ADMIN"),
    FEEDBACK               ("FEEDBACK",                "Phản hồi / Góp ý",           "NONE",       "ADMIN"),
    BUG_REPORT             ("BUG_REPORT",              "Báo cáo lỗi",                "NONE",       "ADMIN"),
    FEATURE_REQUEST        ("FEATURE_REQUEST",         "Đề xuất tính năng",          "NONE",       "ADMIN"),
    COMPLAINT              ("COMPLAINT",               "Khiếu nại",                  "NONE",       "ADMIN"),
    SUGGESTION             ("SUGGESTION",              "Đề xuất cải tiến",           "NONE",       "ADMIN"),
    DOCUMENT_REQUEST       ("DOCUMENT_REQUEST",        "Yêu cầu cấp giấy tờ",        "STUDENT",    "ACADEMIC_ADMIN"),
    CERTIFICATE_REQUEST    ("CERTIFICATE_REQUEST",     "Yêu cầu cấp chứng chỉ",      "ENROLLMENT", "ACADEMIC_ADMIN"),
    LEAVE_FEEDBACK         ("LEAVE_FEEDBACK",          "Xin nghỉ có phản hồi",       "SESSION",    "INSTRUCTOR"),
    DATA_EXPORT            ("DATA_EXPORT",             "Yêu cầu xuất dữ liệu",       "ACCOUNT",    "ADMIN"),

    // ===== HR / INTERNAL =====
    LEAVE_REQUEST          ("LEAVE_REQUEST",           "Xin nghỉ phép",              "NONE",       "ADMIN"),
    OVERTIME_REQUEST       ("OVERTIME_REQUEST",        "Xin tăng ca",                "NONE",       "ADMIN"),
    EXPENSE_CLAIM          ("EXPENSE_CLAIM",           "Đề nghị thanh toán công tác", "NONE",      "ADMIN"),
    EQUIPMENT_REQUEST      ("EQUIPMENT_REQUEST",       "Yêu cầu cấp thiết bị",       "NONE",       "ADMIN");

    private final String code;
    private final String displayName;
    private final String targetEntityType;
    private final String approverRoleCode;

    RequestType(String code, String displayName, String targetEntityType, String approverRoleCode) {
        this.code = code;
        this.displayName = displayName;
        this.targetEntityType = targetEntityType;
        this.approverRoleCode = approverRoleCode;
    }

    public String getCode() { return code; }
    public String getDisplayName() { return displayName; }
    public String getTargetEntityType() { return targetEntityType; }
    public String getApproverRoleCode() { return approverRoleCode; }

    public static RequestType fromCode(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("RequestType không được rỗng");
        }
        try {
            return RequestType.valueOf(code.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("RequestType không hợp lệ: " + code);
        }
    }
}