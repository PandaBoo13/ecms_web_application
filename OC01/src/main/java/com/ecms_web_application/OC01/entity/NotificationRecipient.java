package com.ecms_web_application.OC01.entity;

import com.ecms_web_application.OC01.entity.enums.EmailStatusEnum;
import com.ecms_web_application.OC01.entity.enums.PushStatusEnum;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Setter
@Getter
@Entity
@Table(name = "notification_recipient",
       uniqueConstraints = @UniqueConstraint(
           name = "uk_notif_recipient",
           columnNames = {"notification_id", "account_id"}))
public class NotificationRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "notification_id", nullable = false)
    private Long notificationId;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    /** NULL = chưa xóa. Set NOW() = đã xóa (soft delete cá nhân). */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "email_status", columnDefinition = "email_status_enum")
    private EmailStatusEnum emailStatus;

    @Column(name = "email_sent_at")
    private LocalDateTime emailSentAt;

    @Column(name = "email_error", length = 500)
    private String emailError;

    @Column(name = "email_attempts", nullable = false)
    private Integer emailAttempts = 0;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "push_status", columnDefinition = "push_status_enum")
    private PushStatusEnum pushStatus;

    @Column(name = "push_sent_at")
    private LocalDateTime pushSentAt;

    @Column(name = "push_attempts", nullable = false)
    private Integer pushAttempts = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Read-only relation để JOIN FETCH khi query inbox.
     * insertable/updatable = false → Hibernate KHÔNG ghi qua relation này,
     * chỉ dùng để navigate khi đọc.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notification_id", insertable = false, updatable = false)
    private Notification notification;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (isRead == null) isRead = false;
        if (emailAttempts == null) emailAttempts = 0;
        if (pushAttempts == null) pushAttempts = 0;
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }
}