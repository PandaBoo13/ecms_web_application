package com.ecms_web_application.OC01.entity.certificate;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@Entity
@Table(name = "certificate_type")
public class CertificateType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "family", nullable = false, length = 50)
    private String family;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "score_schema", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> scoreSchema;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "cefr_mapping", columnDefinition = "jsonb")
    private Map<String, Object> cefrMapping;

    @Column(name = "validity_months")
    private Integer validityMonths;

    @Column(name = "issuer_name", length = 255)
    private String issuerName;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (isActive == null) isActive = true;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
