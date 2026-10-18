package com.ecms_web_application.OC01.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {

    // ===== Sender (null = SYSTEM) =====
    private Long senderAccountId;

    // ===== Content =====
    @NotBlank(message = "Loại thông báo không được để trống")
    @Size(max = 50, message = "Loại thông báo không được vượt quá 50 ký tự")
    private String notificationType;   // ORDER, COURSE, CHAT, SYSTEM, PROMOTION...

    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 255, message = "Tiêu đề không được vượt quá 255 ký tự")
    private String title;

    @Size(max = 5000, message = "Nội dung không được vượt quá 5000 ký tự")
    private String content;

    // ===== Reference (deep link) =====
    private String referenceType;      // course, order, chat, session...
    private Long referenceId;

    // ===== Extra data JSON =====
    private Map<String, Object> extraData;

    // ===== Priority + TTL =====
    @Builder.Default
    private String priority = "NORMAL";   // LOW | NORMAL | HIGH | URGENT

    private LocalDateTime expiresAt;

    // ===== RECEIVER TARGETS (chọn 1 hoặc kết hợp) =====
    /** Gửi trực tiếp cho 1 hoặc nhiều account */
    private List<Long> receiverAccountIds;

    /** Gửi theo role: ALL_STUDENTS | ALL_TEACHERS | ALL_USERS */
    private String receiverRole;

    /** Gửi cho tất cả học viên của 1 khóa học */
    private Long courseId;

    // ===== KÊNH GỬI SONG SONG =====
    @Builder.Default
    private Boolean sendEmail = false;

    @Builder.Default
    private Boolean sendPush = false;
}