package com.ecms_web_application.OC01.dto.response.tuition;

/**
 * Kết quả tạo hóa đơn từ lead.
 * paymentLink chỉ có khi chọn chuyển khoản (đã tạo link + gửi email nếu được).
 */
public record CreateInvoiceFromLeadResponse(
        InvoiceResponse invoice,
        PaymentLinkResponse paymentLink
) {
}
