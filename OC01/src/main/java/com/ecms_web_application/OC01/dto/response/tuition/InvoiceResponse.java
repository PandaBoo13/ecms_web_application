package com.ecms_web_application.OC01.dto.response.tuition;

import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.entity.enums.PaymentMethod;
import com.ecms_web_application.OC01.entity.enums.CourseType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InvoiceResponse(
        Long invoiceId,
        String invoiceCode,
        InvoiceType type,
        Long originalInvoiceId,
        String originalInvoiceCode,
        Long studentId,
        Long leadId,
        Long courseId,
        BigDecimal amount,
        InvoiceStatus status,
        LocalDateTime createdAt,
        LocalDateTime dueAt,
        PaymentMethod paymentMethod,
        String transactionReference,
        LocalDateTime paidAt,
        Long confirmedBy,
        String reason,
        String paymentProofUrl,
        Long createdBy,
        String ownerName,
        String ownerEmail,
        String ownerPhone,
        String courseTitle,
        CourseType courseType
) {
    public static InvoiceResponse from(Invoice invoice) {
        return new InvoiceResponse(
                invoice.getId(), invoice.getInvoiceCode(), invoice.getType(),
                invoice.getOriginalInvoiceId(), null, invoice.getStudentId(), invoice.getLeadId(), invoice.getCourseId(),
                invoice.getAmount(), effectiveStatus(invoice), invoice.getCreatedAt(),
                invoice.getDueAt(), invoice.getPaymentMethod(),
                invoice.getTransactionReference(), invoice.getPaidAt(),
                invoice.getConfirmedBy(), invoice.getReason(), invoice.getPaymentProofUrl(),
                invoice.getCreatedBy(), null, null, null, null, null);
    }

    /**
     * Trạng thái hiển thị theo hiệu lực thanh toán: hóa đơn PENDING đã qua hạn thanh toán
     * hiển thị là OVERDUE ngay cả khi job định kỳ chưa kịp cập nhật cột status trong DB
     * (job chỉ chạy định kỳ, còn hạn thanh toán tính đến thời điểm hiện tại).
     */
    public static InvoiceStatus effectiveStatus(Invoice invoice) {
        if (invoice.getStatus() == InvoiceStatus.PENDING && invoice.getDueAt() != null
                && !invoice.getDueAt().isAfter(LocalDateTime.now())) {
            return InvoiceStatus.OVERDUE;
        }
        return invoice.getStatus();
    }

    public static InvoiceResponse from(Invoice invoice, String ownerName, String ownerEmail,
                                       String ownerPhone, String courseTitle, CourseType courseType) {
        return from(invoice, ownerName, ownerEmail, ownerPhone, courseTitle, courseType, null);
    }

    public static InvoiceResponse from(Invoice invoice, String ownerName, String ownerEmail,
                                       String ownerPhone, String courseTitle, CourseType courseType,
                                       String originalInvoiceCode) {
        return new InvoiceResponse(
                invoice.getId(), invoice.getInvoiceCode(), invoice.getType(),
                invoice.getOriginalInvoiceId(), originalInvoiceCode, invoice.getStudentId(), invoice.getLeadId(), invoice.getCourseId(),
                invoice.getAmount(), effectiveStatus(invoice), invoice.getCreatedAt(),
                invoice.getDueAt(), invoice.getPaymentMethod(),
                invoice.getTransactionReference(), invoice.getPaidAt(),
                invoice.getConfirmedBy(), invoice.getReason(), invoice.getPaymentProofUrl(),
                invoice.getCreatedBy(), ownerName, ownerEmail, ownerPhone, courseTitle, courseType);
    }
}
