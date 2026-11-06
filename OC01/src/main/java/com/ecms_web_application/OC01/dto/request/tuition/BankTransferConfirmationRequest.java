package com.ecms_web_application.OC01.dto.request.tuition;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BankTransferConfirmationRequest {
    @NotBlank(message = "Vui lòng nhập mã giao dịch ngân hàng")
    private String transactionReference;

    /** Ảnh chụp giao dịch (tuỳ chọn). */
    private String proofUrl;
}
