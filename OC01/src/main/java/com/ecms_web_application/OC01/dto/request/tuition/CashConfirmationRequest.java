package com.ecms_web_application.OC01.dto.request.tuition;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CashConfirmationRequest {
    /** Ảnh chứng từ thu tiền mặt (tuỳ chọn — bắt buộc ở luồng tạo hóa đơn từ lead). */
    private String proofUrl;
}
