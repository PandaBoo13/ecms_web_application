package com.ecms_web_application.OC01.dto.response.tuition;

import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.CourseType;

import java.math.BigDecimal;

/** Kết quả hiển thị trên trang return sau khi thanh toán VNPAY. */
public record VnpayReturnResponse(
        boolean success,
        String invoiceCode,
        BigDecimal amount,
        InvoiceStatus invoiceStatus,
        CourseType courseType,
        String responseCode,
        String message
) {
}
