package com.ecms_web_application.OC01.entity.request;

import com.ecms_web_application.OC01.entity.enums.RequestStatus;
import com.ecms_web_application.OC01.entity.enums.RequestType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Bảng: request — bảng DUY NHẤT cho mọi loại yêu cầu.
 *
 * Phân loại bằng request_type (enum), trỏ tới entity đích bằng
 * target_entity_type + target_entity_id, chứa field riêng của từng
 * loại trong payload JSONB.
 */
@Setter
@Getter
@Entity
@Table(name = "request", indexes = {
        @Index(name = "idx_req_type",      columnList = "request_type"),
        @Index(name = "idx_req_requester", columnList = "requester_id, created_at"),
        @Index(name = "idx_req_status",    columnList = "status, created_at"),
        @Index(name = "idx_req_target",    columnList = "target_entity_type, target_entity_id"),
        @Index(name = "idx_req_resolver",  columnList = "resolved_by, resolved_at")
})
public class Request {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_code", nullable = false, unique = true, length = 50)
    private String requestCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 50)
    private RequestType requestType;

    @Column(name = "requester_id", nullable = false)
    private Long requesterId;

    @Column(name = "target_entity_type", nullable = false, length = 50)
    private String targetEntityType = "NONE";

    @Column(name = "target_entity_id")
    private Long targetEntityId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> payload = new HashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_data", columnDefinition = "jsonb")
    private Map<String, Object> responseData;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RequestStatus status = RequestStatus.PENDING;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (status == null) status = RequestStatus.PENDING;
        if (targetEntityType == null || targetEntityType.isBlank()) targetEntityType = "NONE";
        if (payload == null) payload = new HashMap<>();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}