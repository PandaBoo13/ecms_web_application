package com.ecms_web_application.OC01.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NotificationResponse {

    /** ID của recipient (dùng để mark read/delete) */
    private Long id;

    /** ID của notification gốc */
    private Long notificationId;

    // ===== Sender =====
    private Long senderAccountId;
    private String senderName;

    // ===== Content =====
    private String notificationType;
    private String title;
    private String content;

    // ===== Reference =====
    private String referenceType;
    private Long referenceId;
    private Map<String, Object> extraData;

    // ===== Priority + TTL =====
    private String priority;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;

    // ===== Per-user state =====
    private Boolean isRead;
    private LocalDateTime readAt;
    private LocalDateTime receivedAt;

    // ===== Delivery tracking (chỉ admin thấy, có thể ẩn) =====
    private String emailStatus;
    private String pushStatus;
}