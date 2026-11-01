package com.ecms_web_application.OC01.dto.response.tuition;

import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.entity.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InvoiceResponse(
        Long invoiceId,
        String invoiceCode,
        InvoiceType type,
        Long originalInvoiceId,
        Long accountId,
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
        Long createdBy
) {
    public static InvoiceResponse from(Invoice invoice) {
        return new InvoiceResponse(
                invoice.getId(), invoice.getInvoiceCode(), invoice.getType(),
                invoice.getOriginalInvoiceId(), invoice.getAccountId(),
                invoice.getStudentId(), invoice.getLeadId(), invoice.getCourseId(),
                invoice.getAmount(), invoice.getStatus(), invoice.getCreatedAt(),
                invoice.getDueAt(), invoice.getPaymentMethod(),
                invoice.getTransactionReference(), invoice.getPaidAt(),
                invoice.getConfirmedBy(), invoice.getReason(), invoice.getCreatedBy());
    }
}
