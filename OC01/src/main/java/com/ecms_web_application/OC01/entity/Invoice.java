package com.ecms_web_application.OC01.entity;

import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.entity.enums.PaymentMethod;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "invoices", uniqueConstraints = {
        @UniqueConstraint(name = "uk_invoices_code", columnNames = "invoice_code"),
        @UniqueConstraint(name = "uk_invoices_original", columnNames = "original_invoice_id")
})
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "invoice_id")
    private Long id;

    @Column(name = "invoice_code", nullable = false, length = 50)
    private String invoiceCode;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "type", nullable = false, columnDefinition = "invoice_type")
    private InvoiceType type;

    @Column(name = "original_invoice_id", unique = true)
    private Long originalInvoiceId;

    @Column(name = "account_id")
    private Long accountId;

    @Column(name = "student_id")
    private Long studentId;

    @Column(name = "lead_id")
    private Long leadId;

    /** Checkout contact snapshot; separate from the owning account's login/profile details. */
    @Column(name = "payer_name", length = 150)
    private String payerName;

    @Column(name = "payer_email", length = 255)
    private String payerEmail;

    @Column(name = "payer_phone", length = 20)
    private String payerPhone;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "invoice_status")
    private InvoiceStatus status = InvoiceStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "due_at")
    private LocalDateTime dueAt;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "payment_method", columnDefinition = "payment_method")
    private PaymentMethod paymentMethod;

    @Column(name = "transaction_reference", length = 255)
    private String transactionReference;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "confirmed_by")
    private Long confirmedBy;

    @Column(columnDefinition = "text")
    private String reason;

    /** Ảnh chứng từ thu tiền mặt (đường dẫn tương đối do FileStorageService trả về). */
    @Column(name = "payment_proof_url", columnDefinition = "text")
    private String paymentProofUrl;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = InvoiceStatus.PENDING;
    }
}
