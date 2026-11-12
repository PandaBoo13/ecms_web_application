package com.ecms_web_application.OC01.dto.response.tuition;

/**
 * Kết quả tạo hóa đơn từ lead.
 * paymentLink chỉ có khi chọn chuyển khoản; link được tạo ngay, email gửi nền sau khi commit
 * để API không phải chờ SMTP.
 */
public record CreateInvoiceFromLeadResponse(
        InvoiceResponse invoice,
        PaymentLinkResponse paymentLink
) {
}
